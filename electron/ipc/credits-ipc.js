/**
 * IPC обработчик для кредитов
 * Типизированные каналы для работы с кредитами и графиками платежей
 */
import { ipcMain } from 'electron';
import { CreditsRepository } from '../repositories/credits-repository.js';
import { getDatabase } from '../services/db-service.js';
import {
	buildSchedule,
	applyPayment,
	recalculateCurrentBalance,
	rebuildAfterChange,
	calculateCreditSummary,
	getUpcomingPayments,
	calculateAnnuityPayment,
	calculateTermFromPayment,
	calculateAmountFromPayment,
	SCHEDULE_TYPES,
	CREDIT_STATUS,
} from '../domain/credits-service.js';
import { createLogger } from '../services/logger.js';
import { autoBackup } from '../services/backup-service.js';
import { enqueueWrite } from '../services/db-queue.js';
import { findCreditsNeedingMigration, migrateCredit, migrateAllCredits } from '../services/credits-migration.js';

const log = createLogger('CreditsIpc');

export function initCreditsIpc() {
	/**
	 * Загрузить все кредиты с графиками
	 * ВАЖНО: schedule строго отсортирован по month_number
	 * Также проверяет наличие кредитов, требующих миграции
	 */
	ipcMain.handle('credits:load', async () => {
		try {
			const repository = new CreditsRepository();
			// Используем метод, который гарантирует сортировку
			const creditsWithSchedules = repository.getAllCreditsWithSchedule();
			
			// Проверяем наличие кредитов, требующих миграции
			const needsMigration = findCreditsNeedingMigration();
			
			return { 
				ok: true, 
				data: creditsWithSchedules,
				needsMigration: needsMigration.length > 0,
				migrationCount: needsMigration.length,
			};
		} catch (error) {
			log.error('Error loading credits:', error);
			return {
				ok: false,
				code: 'DB_ERROR',
				message: error instanceof Error ? error.message : String(error),
			};
		}
	});
	
	/**
	 * Создать или обновить кредит
	 * Автоматически строит график, если есть достаточно данных и график еще не построен
	 */
		ipcMain.handle('credits:save', async (_e, credit) => {
		return enqueueWrite(async () => {
			try {
				const repository = new CreditsRepository();
				
				// Отладочный лог для проверки всех полей при получении
				log.info(`[CreditsIpc] Received credit to save`, {
					creditId: credit.id,
					creditName: credit.name,
					startDate: credit.startDate,
					startDateType: typeof credit.startDate,
					termMonths: credit.termMonths,
					termMonthsType: typeof credit.termMonths,
					interestRate: credit.interestRate,
					interestRateType: typeof credit.interestRate,
					paymentDate: credit.paymentDate,
				});
				
				// ФИКС: НЕ мутируем объект credit, пришедший из renderer (Zustand store)
				// Используем деструктуризацию вместо delete, чтобы не трогать оригинальный объект
				const { schedule, ...creditToSave } = credit;
				
				// Сохраняем кредит (без schedule, он сохраняется отдельно)
				const savedCredit = repository.save(creditToSave);
				
				// Отладочный лог для проверки всех полей после сохранения
				log.info(`[CreditsIpc] Credit saved to repository`, {
					creditId: savedCredit.id,
					creditName: savedCredit.name,
					startDate: savedCredit.startDate,
					startDateType: typeof savedCredit.startDate,
					termMonths: savedCredit.termMonths,
					termMonthsType: typeof savedCredit.termMonths,
					interestRate: savedCredit.interestRate,
					interestRateType: typeof savedCredit.interestRate,
					paymentDate: savedCredit.paymentDate,
				});
				
				// Отладочный лог для проверки interestRate = 0 после сохранения
				if (savedCredit.interestRate === 0) {
					log.info(`[CreditsIpc] Saved credit with interestRate = 0`, {
						creditId: savedCredit.id,
						creditName: savedCredit.name,
						interestRate: savedCredit.interestRate,
						interestRateType: typeof savedCredit.interestRate,
					});
				}
				
				// Проверяем, есть ли уже график
				const existingSchedule = repository.findScheduleByCreditId(savedCredit.id);
				
				// Если график был передан, сохраняем его
				if (schedule && Array.isArray(schedule) && schedule.length > 0) {
					repository.saveSchedule(savedCredit.id, schedule);
				} else if (!existingSchedule || existingSchedule.length === 0) {
					// Если графика нет, но есть достаточно данных - строим автоматически
					// ВАЖНО: interestRate может быть 0 (беспроцентный кредит), поэтому проверяем != null
					log.info(`No schedule found for credit ${savedCredit.id}, attempting auto-build`, {
						hasAmount: !!savedCredit.amount,
						amount: savedCredit.amount,
						hasInterestRate: savedCredit.interestRate != null,
						interestRate: savedCredit.interestRate,
						hasTermMonths: !!savedCredit.termMonths,
						termMonths: savedCredit.termMonths,
						hasStartDate: !!savedCredit.startDate,
						startDate: savedCredit.startDate,
					});
					// ФИКС: Используем != null вместо truthy-проверок, чтобы не ломать нули
					if (savedCredit.amount != null && savedCredit.interestRate != null && savedCredit.termMonths != null && savedCredit.startDate) {
						try {
							const scheduleType = savedCredit.scheduleType || 'annuity';
							const paymentDay = savedCredit.paymentDate ? parseInt(savedCredit.paymentDate) : undefined;
							
							log.info(`Building schedule for credit ${savedCredit.id}`, {
								scheduleType,
								amount: savedCredit.amount,
								annualRate: savedCredit.interestRate,
								termMonths: savedCredit.termMonths,
								startDate: savedCredit.startDate,
								paymentDay,
							});
							
							const newSchedule = buildSchedule({
								scheduleType,
								amount: savedCredit.amount,
								annualRate: savedCredit.interestRate,
								termMonths: savedCredit.termMonths,
								startDate: savedCredit.startDate,
								paymentDay: paymentDay && paymentDay >= 1 && paymentDay <= 31 ? paymentDay : undefined,
							});
							
							log.info(`Schedule built for credit ${savedCredit.id}`, {
								itemsCount: newSchedule.length,
								firstItem: newSchedule[0],
								lastItem: newSchedule[newSchedule.length - 1],
							});
							
							if (newSchedule.length > 0) {
								repository.saveSchedule(savedCredit.id, newSchedule);
								schedule = newSchedule;
								log.info(`Auto-built schedule for credit ${savedCredit.id} with ${newSchedule.length} items`);
							} else {
								log.warn(`Schedule build returned 0 items for credit ${savedCredit.id}`, {
									amount: savedCredit.amount,
									annualRate: savedCredit.interestRate,
									termMonths: savedCredit.termMonths,
									startDate: savedCredit.startDate,
								});
							}
						} catch (error) {
							log.error(`Failed to auto-build schedule for credit ${savedCredit.id}:`, error);
							// Продолжаем без графика
						}
					} else {
						log.warn(`Insufficient data to auto-build schedule for credit ${savedCredit.id}`, {
							hasAmount: !!savedCredit.amount,
							hasInterestRate: savedCredit.interestRate != null,
							hasTermMonths: !!savedCredit.termMonths,
							hasStartDate: !!savedCredit.startDate,
						});
					}
				}
				
				// Если график был построен или передан, пересчитываем остаток
				if (schedule && Array.isArray(schedule) && schedule.length > 0) {
					const updatedSchedule = repository.findScheduleByCreditId(savedCredit.id);
					// ВАЖНО: Загружаем полный кредит из БД перед пересчетом, чтобы не потерять данные
					const currentCredit = repository.findById(savedCredit.id);
					if (currentCredit) {
						const newBalance = recalculateCurrentBalance(currentCredit, updatedSchedule);
						
						// Обновляем остаток в кредите только если он изменился
						// ВАЖНО: Используем UPDATE для обновления только current_balance, чтобы не потерять другие поля
						if (newBalance !== currentCredit.currentBalance) {
							const db = getDatabase();
							const updateStmt = db.prepare('UPDATE credits SET current_balance = ? WHERE id = ?');
							updateStmt.run(newBalance, currentCredit.id);
							log.info(`Updated balance for credit ${currentCredit.id}: ${newBalance}`);
						}
					}
				}
				
				// ВАЖНО: Загружаем полный кредит из БД с графиком (не используем savedCredit, так как он может быть устаревшим)
				const fullCreditFromDb = repository.findById(savedCredit.id);
				if (!fullCreditFromDb) {
					throw new Error(`Credit ${savedCredit.id} not found after save`);
				}
				
				// ВАЖНО: Проверяем, что все важные поля присутствуют
				if (!fullCreditFromDb.startDate && credit.startDate) {
					log.warn(`[CreditsIpc] WARNING: startDate lost for credit ${fullCreditFromDb.id}`, {
						original: credit.startDate,
						loaded: fullCreditFromDb.startDate,
					});
				}
				if (fullCreditFromDb.termMonths == null && credit.termMonths != null) {
					log.warn(`[CreditsIpc] WARNING: termMonths lost for credit ${fullCreditFromDb.id}`, {
						original: credit.termMonths,
						loaded: fullCreditFromDb.termMonths,
					});
				}
				// ВАЖНО: Проверяем interestRate, включая случай когда он равен 0
				if (credit.interestRate === 0 && fullCreditFromDb.interestRate !== 0) {
					log.warn(`[CreditsIpc] WARNING: interestRate = 0 lost for credit ${fullCreditFromDb.id}`, {
						original: credit.interestRate,
						loaded: fullCreditFromDb.interestRate,
						loadedType: typeof fullCreditFromDb.interestRate,
					});
				} else if (fullCreditFromDb.interestRate == null && credit.interestRate != null && credit.interestRate !== 0) {
					log.warn(`[CreditsIpc] WARNING: interestRate lost for credit ${fullCreditFromDb.id}`, {
						original: credit.interestRate,
						loaded: fullCreditFromDb.interestRate,
					});
				}
				
				const fullCredit = {
					...fullCreditFromDb,
					schedule: repository.findScheduleByCreditId(savedCredit.id),
				};
				
				// Отладочный лог для проверки всех полей перед возвратом
				log.info(`[CreditsIpc] Returning credit to frontend`, {
					creditId: fullCredit.id,
					creditName: fullCredit.name,
					startDate: fullCredit.startDate,
					startDateType: typeof fullCredit.startDate,
					termMonths: fullCredit.termMonths,
					termMonthsType: typeof fullCredit.termMonths,
					interestRate: fullCredit.interestRate,
					interestRateType: typeof fullCredit.interestRate,
					paymentDate: fullCredit.paymentDate,
					allFields: {
						id: fullCredit.id,
						name: fullCredit.name,
						startDate: fullCredit.startDate,
						termMonths: fullCredit.termMonths,
						interestRate: fullCredit.interestRate,
						paymentDate: fullCredit.paymentDate,
						amount: fullCredit.amount,
						currentBalance: fullCredit.currentBalance,
						monthlyPayment: fullCredit.monthlyPayment,
					},
				});
				
				// Создаем бекап
				autoBackup().catch(err => {
					log.error('Backup failed:', err);
				});
				
				return { ok: true, data: fullCredit };
			} catch (error) {
				log.error('Error saving credit:', error);
				return {
					ok: false,
					code: 'DB_ERROR',
					message: error instanceof Error ? error.message : String(error),
				};
			}
		});
	});
	
	/**
	 * Построить график платежей
	 */
	ipcMain.handle('credits:buildSchedule', async (_e, params) => {
		try {
			log.info('Building schedule with params', {
				scheduleType: params.scheduleType,
				amount: params.amount,
				annualRate: params.annualRate,
				annualRateType: typeof params.annualRate,
				termMonths: params.termMonths,
				startDate: params.startDate,
				paymentDay: params.paymentDay,
				paymentDayType: typeof params.paymentDay,
			});
			const schedule = buildSchedule(params);
			log.info('Schedule built', {
				itemsCount: schedule.length,
				firstItem: schedule[0],
				lastItem: schedule[schedule.length - 1],
			});
			return { ok: true, data: schedule };
		} catch (error) {
			log.error('Error building schedule:', error);
			return {
				ok: false,
				code: 'CALCULATION_ERROR',
				message: error instanceof Error ? error.message : String(error),
			};
		}
	});
	
	/**
	 * Перестроить график после изменения параметров кредита
	 * ВАЖНО: Все paid строки остаются paid
	 */
	ipcMain.handle('credits:rebuildSchedule', async (_e, { creditId, newParams }) => {
		return enqueueWrite(async () => {
			try {
				const repository = new CreditsRepository();
				const credit = repository.findById(creditId);
				
				if (!credit) {
					return {
						ok: false,
						code: 'NOT_FOUND',
						message: `Credit with id ${creditId} not found`,
					};
				}
				
				const schedule = repository.findScheduleByCreditId(creditId);
				
				// Перестраиваем график с сохранением paid статусов
				const newSchedule = rebuildAfterChange({
					credit,
					schedule,
					newParams,
				});
				
				// Сохраняем новый график
				repository.saveSchedule(creditId, newSchedule);
				
				// Пересчитываем остаток
				const newBalance = recalculateCurrentBalance(credit, newSchedule);
				credit.currentBalance = newBalance;
				repository.save(credit);
				
				// Загружаем обновленный кредит
				const updatedCredit = {
					...credit,
					schedule: repository.findScheduleByCreditId(creditId),
				};
				
				autoBackup().catch(err => {
					log.error('Backup failed:', err);
				});
				
				return { ok: true, data: updatedCredit };
			} catch (error) {
				log.error('Error rebuilding schedule:', error);
				return {
					ok: false,
					code: 'DB_ERROR',
					message: error instanceof Error ? error.message : String(error),
				};
			}
		});
	});
	
	/**
	 * Применить оплату по строке графика
	 */
	ipcMain.handle('credits:applyPayment', async (_e, { creditId, itemId, paidAmount }) => {
		return enqueueWrite(async () => {
			try {
				const repository = new CreditsRepository();
				const credit = repository.findById(creditId);
				
				if (!credit) {
					return {
						ok: false,
						code: 'NOT_FOUND',
						message: `Credit with id ${creditId} not found`,
					};
				}
				
				const schedule = repository.findScheduleByCreditId(creditId);
				const itemIndex = schedule.findIndex(item => item.id === itemId);
				
				if (itemIndex === -1) {
					return {
						ok: false,
						code: 'NOT_FOUND',
						message: `Schedule item with id ${itemId} not found`,
					};
				}
				
				// Применяем оплату
				const updatedSchedule = applyPayment(schedule, itemIndex, paidAmount);
				
				// Сохраняем обновленный график
				repository.saveSchedule(creditId, updatedSchedule);
				
				// Пересчитываем остаток
				const newBalance = recalculateCurrentBalance(credit, updatedSchedule);
				credit.currentBalance = newBalance;
				repository.save(credit);
				
				// Загружаем обновленный кредит
				const updatedCredit = {
					...credit,
					schedule: repository.findScheduleByCreditId(creditId),
				};
				
				autoBackup().catch(err => {
					log.error('Backup failed:', err);
				});
				
				return { ok: true, data: updatedCredit };
			} catch (error) {
				log.error('Error applying payment:', error);
				return {
					ok: false,
					code: 'DB_ERROR',
					message: error instanceof Error ? error.message : String(error),
				};
			}
		});
	});
	
	/**
	 * Удалить кредит
	 */
	ipcMain.handle('credits:delete', async (_e, { id }) => {
		return enqueueWrite(async () => {
			try {
				const repository = new CreditsRepository();
				repository.delete(id);
				
				autoBackup().catch(err => {
					log.error('Backup failed:', err);
				});
				
				return { ok: true };
			} catch (error) {
				log.error('Error deleting credit:', error);
				return {
					ok: false,
					code: 'DB_ERROR',
					message: error instanceof Error ? error.message : String(error),
				};
			}
		});
	});
	
	/**
	 * Вычислить платеж (умный ввод - режим 1)
	 */
	ipcMain.handle('credits:calculatePayment', async (_e, { amount, annualRate, termMonths }) => {
		try {
			const payment = calculateAnnuityPayment(amount, annualRate, termMonths);
			if (payment === null) {
				return {
					ok: false,
					code: 'CALCULATION_ERROR',
					message: 'Invalid parameters for payment calculation',
				};
			}
			return { ok: true, data: { payment } };
		} catch (error) {
			log.error('Error calculating payment:', error);
			return {
				ok: false,
				code: 'CALCULATION_ERROR',
				message: error instanceof Error ? error.message : String(error),
			};
		}
	});
	
	/**
	 * Вычислить срок (умный ввод - режим 2)
	 */
	ipcMain.handle('credits:calculateTerm', async (_e, { amount, annualRate, monthlyPayment }) => {
		try {
			const termMonths = calculateTermFromPayment(amount, annualRate, monthlyPayment);
			if (termMonths === null) {
				return {
					ok: false,
					code: 'CALCULATION_ERROR',
					message: 'Invalid parameters for term calculation',
				};
			}
			return { ok: true, data: { termMonths } };
		} catch (error) {
			log.error('Error calculating term:', error);
			return {
				ok: false,
				code: 'CALCULATION_ERROR',
				message: error instanceof Error ? error.message : String(error),
			};
		}
	});
	
	/**
	 * Вычислить сумму кредита (умный ввод - режим 3)
	 */
	ipcMain.handle('credits:calculateAmount', async (_e, { annualRate, termMonths, monthlyPayment }) => {
		try {
			const amount = calculateAmountFromPayment(annualRate, termMonths, monthlyPayment);
			if (amount === null) {
				return {
					ok: false,
					code: 'CALCULATION_ERROR',
					message: 'Invalid parameters for amount calculation',
				};
			}
			return { ok: true, data: { amount } };
		} catch (error) {
			log.error('Error calculating amount:', error);
			return {
				ok: false,
				code: 'CALCULATION_ERROR',
				message: error instanceof Error ? error.message : String(error),
			};
		}
	});
	
	/**
	 * Получить предстоящие платежи для напоминаний
	 */
	ipcMain.handle('credits:getUpcomingPayments', async (_e, { daysAhead = 7 }) => {
		try {
			const repository = new CreditsRepository();
			const credits = repository.findAll();
			
			// Строим map графиков
			const scheduleMap = {};
			for (const credit of credits) {
				scheduleMap[credit.id] = repository.findScheduleByCreditId(credit.id);
			}
			
			const upcoming = getUpcomingPayments(credits, scheduleMap, daysAhead);
			return { ok: true, data: upcoming };
		} catch (error) {
			log.error('Error getting upcoming payments:', error);
			return {
				ok: false,
				code: 'DB_ERROR',
				message: error instanceof Error ? error.message : String(error),
			};
		}
	});
	
	/**
	 * Найти кредиты, требующие миграции
	 */
	ipcMain.handle('credits:findNeedingMigration', async () => {
		try {
			const credits = findCreditsNeedingMigration();
			return { ok: true, data: credits };
		} catch (error) {
			log.error('Error finding credits needing migration:', error);
			return {
				ok: false,
				code: 'DB_ERROR',
				message: error instanceof Error ? error.message : String(error),
			};
		}
	});
	
	/**
	 * Мигрировать кредит в новый формат
	 */
	ipcMain.handle('credits:migrate', async (_e, { creditId }) => {
		return enqueueWrite(async () => {
			try {
				const migratedCredit = migrateCredit(creditId);
				const repository = new CreditsRepository();
				const schedule = repository.findScheduleByCreditId(creditId);
				
				autoBackup().catch(err => {
					log.error('Backup failed:', err);
				});
				
				return { 
					ok: true, 
					data: {
						...migratedCredit,
						schedule,
					}
				};
			} catch (error) {
				log.error('Error migrating credit:', error);
				return {
					ok: false,
					code: 'MIGRATION_ERROR',
					message: error instanceof Error ? error.message : String(error),
				};
			}
		});
	});
	
	/**
	 * Мигрировать все кредиты, требующие миграции
	 */
	ipcMain.handle('credits:migrateAll', async () => {
		return enqueueWrite(async () => {
			try {
				const results = migrateAllCredits();
				
				// Загружаем графики для успешно мигрированных кредитов
				const repository = new CreditsRepository();
				const successWithSchedules = results.success.map(credit => ({
					...credit,
					schedule: repository.findScheduleByCreditId(credit.id),
				}));
				
				autoBackup().catch(err => {
					log.error('Backup failed:', err);
				});
				
				return { 
					ok: true, 
					data: {
						success: successWithSchedules,
						failed: results.failed,
					}
				};
			} catch (error) {
				log.error('Error migrating all credits:', error);
				return {
					ok: false,
					code: 'MIGRATION_ERROR',
					message: error instanceof Error ? error.message : String(error),
				};
			}
		});
	});
	
	log.info('Credits IPC handlers initialized');
}

