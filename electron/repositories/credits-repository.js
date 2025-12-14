/**
 * Repository для работы с кредитами и графиками платежей
 * Отвечает только за CRUD операции с БД
 */
import { BaseRepository } from './base-repository.js';
import { createLogger } from '../services/logger.js';

const log = createLogger('CreditsRepository');

export class CreditsRepository extends BaseRepository {
	/**
	 * Загрузить все кредиты
	 */
	findAll() {
		const db = this.getDb();
		const rows = db.prepare('SELECT * FROM credits ORDER BY start_date DESC, name ASC').all();
		return rows.map(row => this.mapCreditFromDb(row));
	}
	
	/**
	 * Загрузить все кредиты с графиками (для IPC)
	 * ВАЖНО: schedule строго отсортирован по month_number
	 */
	getAllCreditsWithSchedule() {
		const credits = this.findAll();
		return credits.map(credit => {
			const schedule = this.findScheduleByCreditId(credit.id);
			return {
				...credit,
				schedule, // Уже отсортирован по month_number в findScheduleByCreditId
			};
		});
	}
	
	/**
	 * Найти кредит по ID
	 */
	findById(id) {
		if (!id) return null;
		const db = this.getDb();
		const row = db.prepare('SELECT * FROM credits WHERE id = ?').get(id);
		return row ? this.mapCreditFromDb(row) : null;
	}
	
	/**
	 * Загрузить график платежей для кредита
	 */
	findScheduleByCreditId(creditId) {
		if (!creditId) return [];
		const db = this.getDb();
		const rows = db.prepare(`
			SELECT * FROM credit_schedule_items 
			WHERE credit_id = ? 
			ORDER BY month_number ASC
		`).all(creditId);
		return rows.map(row => this.mapScheduleItemFromDb(row));
	}
	
	/**
	 * Сохранить кредит
	 */
	save(credit) {
		if (!credit || !credit.id) {
			throw new Error('Credit ID is required');
		}
		
		const db = this.getDb();
		// Используем INSERT OR REPLACE (как в других репозиториях)
		const stmt = db.prepare(`
			INSERT OR REPLACE INTO credits (
				id, name, description, start_date, schedule_type, amount, current_balance,
				interest_rate, term_months, monthly_payment, status, notes,
				paid_this_month, last_paid_month, payment_date, input_mode
			) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
		`);
		
		const dbRow = this.mapCreditToDb(credit);
		
		// Отладочный лог для проверки сохранения всех полей
		log.info('Saving credit to DB (before stmt.run)', {
			creditId: credit.id,
			creditName: credit.name,
			start_date: dbRow.start_date,
			term_months: dbRow.term_months,
			interest_rate: dbRow.interest_rate,
		});
		
		// Отладочный лог перед выполнением SQL
		if (dbRow.interest_rate === 0) {
			log.info('About to save interest_rate = 0 to DB', {
				creditId: credit.id,
				creditName: credit.name,
				interest_rate: dbRow.interest_rate,
				interest_rateType: typeof dbRow.interest_rate,
				allParams: [
					dbRow.id,
					dbRow.name,
					dbRow.description,
					dbRow.start_date,
					dbRow.schedule_type,
					dbRow.amount,
					dbRow.current_balance,
					dbRow.interest_rate,
					dbRow.term_months,
					dbRow.monthly_payment,
					dbRow.status,
					dbRow.notes,
					dbRow.paid_this_month,
					dbRow.last_paid_month,
					dbRow.payment_date
				],
			});
		}
		
		// Проверяем, что все важные поля присутствуют перед сохранением
		if (!dbRow.start_date && credit.startDate) {
			log.error('ERROR: start_date is null but credit.startDate exists', {
				creditId: credit.id,
				creditName: credit.name,
				creditStartDate: credit.startDate,
				dbRowStartDate: dbRow.start_date,
			});
		}
		if (dbRow.term_months == null && credit.termMonths != null) {
			log.error('ERROR: term_months is null but credit.termMonths exists', {
				creditId: credit.id,
				creditName: credit.name,
				creditTermMonths: credit.termMonths,
				dbRowTermMonths: dbRow.term_months,
			});
		}
		if (dbRow.interest_rate == null && credit.interestRate != null) {
			log.error('ERROR: interest_rate is null but credit.interestRate exists', {
				creditId: credit.id,
				creditName: credit.name,
				creditInterestRate: credit.interestRate,
				dbRowInterestRate: dbRow.interest_rate,
			});
		}
		
		try {
			// ВАЖНО: Логируем параметры перед выполнением SQL, особенно interest_rate
			if (dbRow.interest_rate === 0) {
				log.info('Executing stmt.run with interest_rate = 0', {
					creditId: credit.id,
					creditName: credit.name,
					interest_rate: dbRow.interest_rate,
					interest_rateType: typeof dbRow.interest_rate,
					allParams: [
						dbRow.id,
						dbRow.name,
						dbRow.description,
						dbRow.start_date,
						dbRow.schedule_type,
						dbRow.amount,
						dbRow.current_balance,
						dbRow.interest_rate,
						dbRow.term_months,
						dbRow.monthly_payment,
						dbRow.status,
						dbRow.notes,
						dbRow.paid_this_month,
						dbRow.last_paid_month,
						dbRow.payment_date
					],
				});
			}
			
			// ВАЖНО: Явно преобразуем interest_rate в число, чтобы гарантировать, что 0 сохранится как 0
			// SQLite может интерпретировать 0 как NULL, если тип не явно указан
			const interestRateValue = dbRow.interest_rate === 0 
				? 0 
				: (dbRow.interest_rate != null ? Number(dbRow.interest_rate) : null);
			
			// ВАЖНО: Явно преобразуем term_months в число, чтобы гарантировать правильное сохранение
			const termMonthsValue = dbRow.term_months != null && dbRow.term_months !== undefined
				? Math.round(Number(dbRow.term_months))
				: null;
			
			stmt.run(
				dbRow.id,
				dbRow.name,
				dbRow.description,
				dbRow.start_date,
				dbRow.schedule_type,
				dbRow.amount,
				dbRow.current_balance,
				interestRateValue, // Используем явно преобразованное значение
				termMonthsValue, // Используем явно преобразованное значение
				dbRow.monthly_payment,
				dbRow.status,
				dbRow.notes,
				dbRow.paid_this_month,
				dbRow.last_paid_month,
				dbRow.payment_date,
				dbRow.input_mode
			);
		} catch (error) {
			log.error('ERROR saving credit to DB', {
				creditId: credit.id,
				creditName: credit.name,
				error: error instanceof Error ? error.message : String(error),
				dbRow,
			});
			throw error;
		}
		
		// Проверяем, что значения действительно сохранились
		const verifyStmt = db.prepare('SELECT start_date, term_months, interest_rate, payment_date FROM credits WHERE id = ?');
		const verifyRow = verifyStmt.get(credit.id);
		log.info('Verified values after save', {
			creditId: credit.id,
			creditName: credit.name,
			saved: {
				start_date: dbRow.start_date,
				term_months: dbRow.term_months,
				interest_rate: dbRow.interest_rate,
				interest_rateType: typeof dbRow.interest_rate,
				payment_date: dbRow.payment_date,
			},
			loaded: {
				start_date: verifyRow?.start_date,
				term_months: verifyRow?.term_months,
				interest_rate: verifyRow?.interest_rate,
				interest_rateType: typeof verifyRow?.interest_rate,
				interest_rateIsNull: verifyRow?.interest_rate === null,
				interest_rateIsUndefined: verifyRow?.interest_rate === undefined,
				interest_rateIsZero: verifyRow?.interest_rate === 0,
				payment_date: verifyRow?.payment_date,
			},
			matches: {
				start_date: dbRow.start_date === verifyRow?.start_date,
				term_months: dbRow.term_months === verifyRow?.term_months,
				interest_rate: dbRow.interest_rate === verifyRow?.interest_rate,
				payment_date: dbRow.payment_date === verifyRow?.payment_date,
			},
		});
		
		// ВАЖНО: Проверяем, что interest_rate = 0 правильно сохранился
		if (dbRow.interest_rate === 0 && verifyRow?.interest_rate !== 0) {
			log.error('CRITICAL: interest_rate = 0 was NOT saved correctly!', {
				creditId: credit.id,
				creditName: credit.name,
				expected: 0,
				actual: verifyRow?.interest_rate,
				actualType: typeof verifyRow?.interest_rate,
			});
		}
		
		const loadedCredit = this.findById(credit.id);
		
		// Отладочный лог для проверки загрузки всех полей после сохранения
		log.info('Loaded credit from DB (after save)', {
			creditId: loadedCredit?.id,
			creditName: loadedCredit?.name,
			startDate: { original: credit.startDate, loaded: loadedCredit?.startDate },
			termMonths: { original: credit.termMonths, loaded: loadedCredit?.termMonths },
			interestRate: { original: credit.interestRate, loaded: loadedCredit?.interestRate },
			paymentDate: { original: credit.paymentDate, loaded: loadedCredit?.paymentDate },
		});
		
		// Проверка на потерю данных
		if (loadedCredit) {
			const errors = [];
			if (credit.startDate && !loadedCredit.startDate) {
				errors.push(`startDate lost: ${credit.startDate} -> ${loadedCredit.startDate}`);
			}
			if (credit.termMonths != null && loadedCredit.termMonths == null) {
				errors.push(`termMonths lost: ${credit.termMonths} -> ${loadedCredit.termMonths}`);
			}
			if (credit.interestRate === 0 && loadedCredit.interestRate !== 0) {
				errors.push(`interestRate = 0 lost: ${credit.interestRate} -> ${loadedCredit.interestRate}`);
			}
			if (credit.paymentDate && !loadedCredit.paymentDate) {
				errors.push(`paymentDate lost: ${credit.paymentDate} -> ${loadedCredit.paymentDate}`);
			}
			
			if (errors.length > 0) {
				log.error('ERROR: Data was lost after save!', {
					creditId: credit.id,
					creditName: credit.name,
					errors,
				});
			}
		}
		
		return loadedCredit;
	}
	
	/**
	 * Сохранить график платежей (полная замена для кредита)
	 */
	saveSchedule(creditId, scheduleItems) {
		if (!creditId) {
			throw new Error('Credit ID is required');
		}
		
		const db = this.getDb();
		
		// Удаляем старый график
		db.prepare('DELETE FROM credit_schedule_items WHERE credit_id = ?').run(creditId);
		
		// Сохраняем новый график в транзакции
		const stmt = db.prepare(`
			INSERT INTO credit_schedule_items (
				id, credit_id, month_number, payment_date, planned_payment,
				interest_part, principal_part, remaining_balance,
				paid, paid_amount, paid_at
			) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
		`);
		
		const insertMany = db.transaction((items) => {
			for (const item of items) {
				const dbRow = this.mapScheduleItemToDb(item, creditId);
				stmt.run(
					dbRow.id,
					dbRow.credit_id,
					dbRow.month_number,
					dbRow.payment_date,
					dbRow.planned_payment,
					dbRow.interest_part,
					dbRow.principal_part,
					dbRow.remaining_balance,
					dbRow.paid,
					dbRow.paid_amount,
					dbRow.paid_at
				);
			}
		});
		
		insertMany(scheduleItems || []);
	}
	
	/**
	 * Обновить строку графика (например, при оплате)
	 */
	updateScheduleItem(item) {
		if (!item || !item.id) {
			throw new Error('Schedule item ID is required');
		}
		
		const db = this.getDb();
		const stmt = db.prepare(`
			UPDATE credit_schedule_items SET
				paid = ?,
				paid_amount = ?,
				paid_at = ?
			WHERE id = ?
		`);
		
		stmt.run(
			item.paid ? 1 : 0,
			item.paidAmount || null,
			item.paidAt || null,
			item.id
		);
		
		return this.findScheduleItemById(item.id);
	}
	
	/**
	 * Найти строку графика по ID
	 */
	findScheduleItemById(id) {
		if (!id) return null;
		const db = this.getDb();
		const row = db.prepare('SELECT * FROM credit_schedule_items WHERE id = ?').get(id);
		return row ? this.mapScheduleItemFromDb(row) : null;
	}
	
	/**
	 * Удалить кредит (каскадно удалит график)
	 */
	delete(id) {
		if (!id) return;
		const db = this.getDb();
		db.prepare('DELETE FROM credits WHERE id = ?').run(id);
	}
	
	/**
	 * Маппинг Credit Domain → DB
	 */
	mapCreditToDb(credit) {
		// Отладочный лог для проверки сохранения 0
		if (credit.interestRate === 0) {
			log.info('Saving interestRate = 0 to DB', {
				creditId: credit.id,
				creditName: credit.name,
				interestRate: credit.interestRate,
				mappedInterestRate: credit.interestRate != null ? credit.interestRate : null,
			});
		}
		
		// Отладочный лог для проверки сохранения всех полей
		log.info('mapCreditToDb - input credit', {
			creditId: credit.id,
			creditName: credit.name,
			startDate: { value: credit.startDate, type: typeof credit.startDate, isUndefined: credit.startDate === undefined, isNull: credit.startDate === null, isEmpty: !credit.startDate || credit.startDate === '' },
			termMonths: { value: credit.termMonths, type: typeof credit.termMonths, isUndefined: credit.termMonths === undefined, isNull: credit.termMonths === null, isZero: credit.termMonths === 0 },
			interestRate: { value: credit.interestRate, type: typeof credit.interestRate, isUndefined: credit.interestRate === undefined, isNull: credit.interestRate === null, isZero: credit.interestRate === 0 },
		});
		
		const dbRow = {
			id: credit.id,
			name: credit.name || '',
			description: credit.description || null,
			// ВАЖНО: startDate может быть пустой строкой, поэтому проверяем != null и != '', а не truthy
			// Сохраняем start_date только если startDate не пустой
			start_date: credit.startDate && credit.startDate !== '' ? String(credit.startDate).trim() : null,
			schedule_type: credit.scheduleType || 'annuity',
			amount: credit.amount || null,
			current_balance: credit.currentBalance != null ? credit.currentBalance : credit.amount,
			// ВАЖНО: interestRate может быть 0 (беспроцентный кредит), поэтому проверяем строгое равенство 0 ПЕРВЫМ
			// Если interestRate === 0, сохраняем 0 как число, иначе проверяем != null
			// Используем явное преобразование в Number, чтобы гарантировать, что 0 сохранится как 0, а не как null
			interest_rate: credit.interestRate === 0 
				? 0 
				: (credit.interestRate != null && credit.interestRate !== undefined 
					? Number(credit.interestRate) 
					: null),
			// ВАЖНО: termMonths может быть 0 (хотя это не имеет смысла), но нужно проверять != null, а не truthy
			// Явно преобразуем в число и округляем, чтобы гарантировать целое число месяцев
			term_months: credit.termMonths != null && credit.termMonths !== undefined 
				? Math.round(Number(credit.termMonths)) 
				: null,
			monthly_payment: credit.monthlyPayment || null,
			status: credit.status || 'active',
			notes: credit.notes || null,
			paid_this_month: credit.paidThisMonth ? 1 : 0,
			last_paid_month: credit.lastPaidMonth || null,
			// ВАЖНО: paymentDate может быть пустой строкой или числом (1-31), поэтому проверяем != null и != '', а не truthy
			payment_date: credit.paymentDate != null && credit.paymentDate !== '' ? String(credit.paymentDate) : null,
			// Режим расчета кредита (по умолчанию 'amount_rate_term')
			input_mode: credit.inputMode || 'amount_rate_term',
		};
		
		// Отладочный лог для проверки маппинга
		log.info('mapCreditToDb - output dbRow', {
			creditId: dbRow.id,
			creditName: dbRow.name,
			start_date: { value: dbRow.start_date, type: typeof dbRow.start_date, isNull: dbRow.start_date === null, isEmpty: !dbRow.start_date || dbRow.start_date === '' },
			term_months: { value: dbRow.term_months, type: typeof dbRow.term_months, isNull: dbRow.term_months === null, isZero: dbRow.term_months === 0 },
			interest_rate: { value: dbRow.interest_rate, type: typeof dbRow.interest_rate, isNull: dbRow.interest_rate === null, isZero: dbRow.interest_rate === 0 },
		});
		
		return dbRow;
	}
	
	/**
	 * Маппинг Credit DB → Domain
	 */
	mapCreditFromDb(row) {
		// ВАЖНО: SQLite может возвращать 0 как число или как строку '0', поэтому проверяем оба случая
		const rawInterestRate = row.interest_rate;
		
		// ВАЖНО: Логируем ВСЕ значения interest_rate для отладки
		log.info('mapCreditFromDb - raw interest_rate from DB', {
			creditId: row.id,
			creditName: row.name,
			rawInterestRate: rawInterestRate,
			rawType: typeof rawInterestRate,
			isNull: rawInterestRate === null,
			isUndefined: rawInterestRate === undefined,
			isZero: rawInterestRate === 0,
			isStringZero: rawInterestRate === '0',
		});
		
		const isZero = rawInterestRate === 0 || rawInterestRate === '0' || (rawInterestRate != null && Number(rawInterestRate) === 0);
		
		// Отладочный лог для проверки загрузки 0
		if (isZero) {
			log.info('Loading interestRate = 0 from DB', {
				creditId: row.id,
				creditName: row.name,
				rawInterestRate: rawInterestRate,
				rawType: typeof rawInterestRate,
				isZero: isZero,
			});
		}
		
		// ВАЖНО: interest_rate может быть 0, поэтому проверяем != null и != undefined, а не truthy
		// Также обрабатываем случай, когда SQLite возвращает 0 как строку '0' или число 0
		let interestRate = undefined;
		// ВАЖНО: Проверяем строгое равенство 0 ПЕРВЫМ, до проверки на null/undefined
		// Это нужно, потому что Number(null) === 0, но мы хотим сохранить 0 как 0
		if (rawInterestRate === 0 || rawInterestRate === '0') {
			interestRate = 0;
		} else if (rawInterestRate !== null && rawInterestRate !== undefined) {
			// Если это пустая строка, устанавливаем 0 (беспроцентный кредит)
			if (rawInterestRate === '') {
				interestRate = 0;
			} else {
				// Пытаемся преобразовать в число
				const numValue = Number(rawInterestRate);
				// Проверяем, что это валидное число (не NaN) и >= 0
				if (!isNaN(numValue) && numValue >= 0) {
					interestRate = numValue;
				}
			}
		} else if (rawInterestRate === null) {
			// ВАЖНО: Если interest_rate = NULL в БД, это может указывать на проблему целостности данных
			// Логируем предупреждение, но оставляем interestRate = undefined
			log.warn('interest_rate is NULL in database (data integrity issue?)', {
				creditId: row.id,
				creditName: row.name,
				rawInterestRate: rawInterestRate,
			});
		}
		
		// Отладочный лог для проверки обработки 0
		if (rawInterestRate === 0 || rawInterestRate === '0') {
			log.info('Processed interestRate = 0', {
				creditId: row.id,
				creditName: row.name,
				rawInterestRate: rawInterestRate,
				rawType: typeof rawInterestRate,
				mappedInterestRate: interestRate,
				mappedType: typeof interestRate,
			});
		}
		
		// ВАЖНО: term_months может быть 0 (хотя это не имеет смысла), но нужно проверять != null, а не truthy
		let termMonths = undefined;
		if (row.term_months != null && row.term_months !== undefined) {
			const numValue = Number(row.term_months);
			// Проверяем, что это валидное число и > 0
			if (!isNaN(numValue) && numValue > 0) {
				// Округляем до целого числа месяцев
				termMonths = Math.round(numValue);
			}
		}
		
		// Отладочный лог для проверки загрузки всех полей
		log.info('mapCreditFromDb - loaded from DB', {
			creditId: row.id,
			creditName: row.name,
			rawStartDate: { value: row.start_date, type: typeof row.start_date, isNull: row.start_date === null, isEmpty: !row.start_date || row.start_date === '' },
			rawTermMonths: { value: row.term_months, type: typeof row.term_months, isNull: row.term_months === null, isZero: row.term_months === 0 },
			rawInterestRate: { value: rawInterestRate, type: typeof rawInterestRate, isNull: rawInterestRate === null, isZero: rawInterestRate === 0 },
			mappedStartDate: { value: (row.start_date && row.start_date !== '' ? String(row.start_date).trim() : undefined), isUndefined: (row.start_date && row.start_date !== '' ? String(row.start_date).trim() : undefined) === undefined },
			mappedTermMonths: { value: termMonths, isUndefined: termMonths === undefined, isNull: termMonths === null },
			mappedInterestRate: { value: interestRate, type: typeof interestRate, isUndefined: interestRate === undefined, isNull: interestRate === null, isZero: interestRate === 0 },
		});
		
		return {
			id: row.id,
			name: row.name,
			description: row.description || undefined,
			// ВАЖНО: start_date может быть пустой строкой, поэтому проверяем != null и != '', а не truthy
			// Загружаем startDate только если start_date не пустой
			startDate: row.start_date && row.start_date !== '' ? String(row.start_date).trim() : undefined,
			scheduleType: row.schedule_type || 'annuity',
			amount: row.amount || undefined,
			currentBalance: row.current_balance != null ? row.current_balance : row.amount,
			interestRate: interestRate,
			termMonths: termMonths,
			monthlyPayment: row.monthly_payment || undefined,
			status: row.status || 'active',
			notes: row.notes || undefined,
			paidThisMonth: row.paid_this_month === 1,
			lastPaidMonth: row.last_paid_month || undefined,
			// ВАЖНО: payment_date может быть пустой строкой или числом (1-31), поэтому проверяем != null и != '', а не truthy
			paymentDate: row.payment_date != null && row.payment_date !== '' ? String(row.payment_date) : undefined,
			// Режим расчета кредита (по умолчанию 'amount_rate_term')
			inputMode: (row.input_mode && ['amount_rate_term', 'amount_rate_payment', 'rate_term_payment'].includes(row.input_mode))
				? row.input_mode
				: 'amount_rate_term',
		};
	}
	
	/**
	 * Маппинг ScheduleItem Domain → DB
	 */
	mapScheduleItemToDb(item, creditId) {
		return {
			id: item.id || `${creditId}-${item.monthNumber}`,
			credit_id: creditId,
			month_number: item.monthNumber,
			payment_date: item.paymentDate,
			planned_payment: item.plannedPayment,
			interest_part: item.interestPart,
			principal_part: item.principalPart,
			remaining_balance: item.remainingBalance,
			paid: item.paid ? 1 : 0,
			paid_amount: item.paidAmount || null,
			paid_at: item.paidAt || null,
		};
	}
	
	/**
	 * Маппинг ScheduleItem DB → Domain
	 */
	mapScheduleItemFromDb(row) {
		return {
			id: row.id,
			creditId: row.credit_id,
			monthNumber: row.month_number,
			paymentDate: row.payment_date,
			plannedPayment: row.planned_payment,
			interestPart: row.interest_part,
			principalPart: row.principal_part,
			remainingBalance: row.remaining_balance,
			paid: row.paid === 1,
			paidAmount: row.paid_amount || undefined,
			paidAt: row.paid_at || undefined,
		};
	}
}

