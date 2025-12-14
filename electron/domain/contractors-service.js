/**
 * Domain-сервис для работы с подрядчиками
 * Содержит бизнес-логику и валидацию
 * Stateless - не хранит состояние
 */
import { ContractorsRepository } from '../repositories/contractors-repository.js';
import { TasksRepository } from '../repositories/tasks-repository.js';
import { validateCreateContractor, validateUpdateContractor, validateContractorsArray } from './dto/contractor.dto.js';
import { createLogger } from '../services/logger.js';
import { DomainError, DOMAIN_ERROR_CODES, createDomainErrorFromZod, createNotFoundError, createDatabaseError } from './errors.js';

const log = createLogger('ContractorsService');

export class ContractorsService {
	constructor(contractorsRepository = null, tasksRepository = null) {
		this.repository = contractorsRepository || new ContractorsRepository();
		this.tasksRepository = tasksRepository || new TasksRepository();
	}

	/**
	 * Удалить подрядчика (только если у него нет задач)
	 * Если есть задачи - выбрасывает ошибку
	 * @param {string} id - ID подрядчика
	 * @throws {Error} Если у подрядчика есть задачи
	 */
	deleteContractor(id) {
		if (!id) {
			throw new Error('Contractor ID is required');
		}

		const existing = this.repository.findById(id);
		if (!existing) {
			throw createNotFoundError('Contractor', id);
		}

		// Проверяем, есть ли задачи у этого подрядчика
		const allTasks = this.tasksRepository.findAll();
		const contractorTasks = allTasks.filter(task => task.contractorId === id);
		
		if (contractorTasks.length > 0) {
			const error = new Error(`Нельзя удалить подрядчика "${existing.name}": у него есть ${contractorTasks.length} ${contractorTasks.length === 1 ? 'задача' : contractorTasks.length < 5 ? 'задачи' : 'задач'}. Используйте deactivateContractor() для деактивации.`);
			log.error('Attempted to delete contractor with tasks', { id, tasksCount: contractorTasks.length, error: error.message });
			throw error;
		}

		// Если задач нет - удаляем физически
		try {
			this.repository.delete(id);
			log.info('Contractor deleted (no tasks)', { id, name: existing.name });
			return true;
		} catch (error) {
			log.error('Failed to delete contractor', { error: error.message, id });
			throw error;
		}
	}

	/**
	 * Удаление подрядчиков запрещено, если есть задачи.
	 * Используйте deactivateContractor() для деактивации.
	 */
	removeContractor(id) {
		return this.deleteContractor(id);
	}

	/**
	 * Загрузить всех подрядчиков
	 */
	async getAllContractors() {
		try {
			return this.repository.findAll();
		} catch (error) {
			throw new Error(`Failed to load contractors: ${error.message}`);
		}
	}

	/**
	 * Получить активных подрядчиков
	 */
	async getActiveContractors() {
		try {
			return this.repository.findActive();
		} catch (error) {
			throw new Error(`Failed to load active contractors: ${error.message}`);
		}
	}

	/**
	 * Получить подрядчика по ID
	 */
	async getContractorById(id) {
		if (!id) {
			throw new Error('Contractor ID is required');
		}

		const contractor = this.repository.findById(id);
		if (!contractor) {
			throw new Error(`Contractor with id ${id} not found`);
		}

		return contractor;
	}

	/**
	 * Создать нового подрядчика
	 * @param {object} contractorData - Данные подрядчика (валидируются через DTO)
	 */
	async createContractor(contractorData) {
		// Валидация через DTO
		let validatedData;
		try {
			validatedData = validateCreateContractor(contractorData);
		} catch (error) {
			log.error('Contractor validation failed', { error: error.message, data: contractorData });
			// Преобразуем Zod ошибку в DomainError
			if (error.name === 'ZodError') {
				throw createDomainErrorFromZod(error, 'Contractor');
			}
			throw new DomainError(DOMAIN_ERROR_CODES.CUSTOMER_VALIDATION_FAILED, error.message);
		}

		// Бизнес-правила
		const contractor = {
			...validatedData,
			isActive: validatedData.isActive !== false, // По умолчанию активен
			createdAt: validatedData.createdAt || new Date().toISOString(),
			updatedAt: validatedData.updatedAt || new Date().toISOString()
		};

		try {
			const created = this.repository.create(contractor);
			log.info('Contractor created', { id: created.id, name: created.name });
			return created;
		} catch (error) {
			log.error('Failed to create contractor', { error: error.message, contractorId: validatedData.id });
			// Преобразуем в DomainError
			if (error instanceof DomainError) {
				throw error;
			}
			throw createDatabaseError(`Failed to create contractor: ${error.message}`, { contractorId: validatedData.id });
		}
	}

	/**
	 * Обновить подрядчика
	 * @param {string} id - ID подрядчика
	 * @param {object} updates - Обновления (валидируются через DTO)
	 */
	async updateContractor(id, updates) {
		if (!id) {
			throw new Error('Contractor ID is required');
		}

		// Валидация через DTO
		let validatedUpdates;
		try {
			validatedUpdates = validateUpdateContractor({ id, ...updates });
		} catch (error) {
			log.error('Contractor update validation failed', { error: error.message, id, updates });
			// Преобразуем Zod ошибку в DomainError
			if (error.name === 'ZodError' || error.issues) {
				throw createDomainErrorFromZod(error, 'Contractor');
			}
			throw new DomainError(DOMAIN_ERROR_CODES.CUSTOMER_VALIDATION_FAILED, error.message);
		}

		// Проверяем существование подрядчика
		const existing = this.repository.findById(id);
		if (!existing) {
			throw new Error(`Contractor with id ${id} not found`);
		}

		try {
			const updated = this.repository.update(id, validatedUpdates);
			log.info('Contractor updated', { id, changes: Object.keys(updates) });
			return updated;
		} catch (error) {
			log.error('Failed to update contractor', { error: error.message, id });
			throw new Error(`Failed to update contractor: ${error.message}`);
		}
	}

	/**
	 * Деактивировать подрядчика
	 * При деактивации:
	 * - Устанавливает isActive = false
	 * - Находит все незавершенные задачи с этим подрядчиком
	 * - Сбрасывает contractorId у этих задач (задача возвращается ко мне)
	 * - Завершенные задачи не трогает (история сохраняется)
	 * - Расходы не трогает (история сохраняется)
	 */
	async deactivateContractor(id) {
		if (!id) {
			throw new Error('Contractor ID is required');
		}

		const existing = this.repository.findById(id);
		if (!existing) {
			throw createNotFoundError('Contractor', id);
		}

		if (!existing.isActive) {
			log.info('Contractor already deactivated', { id });
			return { contractor: existing, tasksReturned: 0 };
		}

		try {
			// Деактивируем подрядчика
			const deactivated = this.repository.deactivate(id);
			
			// Находим все задачи с этим подрядчиком
			const allTasks = this.tasksRepository.findAll();
			
			// Незавершенные колонки
			const unfinishedColumns = ['clients', 'unprocessed', 'notstarted', 'inwork', 'paused'];
			
			// Находим незавершенные задачи с этим подрядчиком
			const unfinishedTasks = allTasks.filter(task => 
				task.contractorId === id && 
				unfinishedColumns.includes(task.columnId)
			);
			
			// Сбрасываем contractorId у незавершенных задач
			if (unfinishedTasks.length > 0) {
				log.info('Resetting contractorId for unfinished tasks', { 
					contractorId: id, 
					taskCount: unfinishedTasks.length 
				});
				
				// Обновляем задачи в транзакции
				this.repository.runInTransaction(() => {
					for (const task of unfinishedTasks) {
						// Записываем историю изменения исполнителя
						this._recordAssigneeHistory(task.id, task.contractorId, undefined);
						
						// Обновляем задачу
						this.tasksRepository.update(task.id, { 
							contractorId: undefined,
							updatedAt: new Date().toISOString()
						});
					}
				});
			}
			
			const tasksReturned = unfinishedTasks.length;
			log.info('Contractor deactivated', { id, unfinishedTasksReset: tasksReturned });
			return { contractor: deactivated, tasksReturned };
		} catch (error) {
			log.error('Failed to deactivate contractor', { error: error.message, id });
			throw new Error(`Failed to deactivate contractor: ${error.message}`);
		}
	}

	/**
	 * Записать историю изменения исполнителя задачи
	 * @private
	 */
	_recordAssigneeHistory(taskId, oldContractorId, newContractorId) {
		try {
			const db = this.repository.getDb();
			const historyId = `${taskId}_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
			
			const stmt = db.prepare(`
				INSERT INTO task_assignee_history (id, task_id, old_contractor_id, new_contractor_id, changed_at)
				VALUES (?, ?, ?, ?, ?)
			`);
			
			stmt.run(
				historyId,
				taskId,
				oldContractorId || null,
				newContractorId || null,
				new Date().toISOString()
			);
		} catch (error) {
			log.error('Failed to record assignee history', { 
				error: error.message, 
				taskId, 
				oldContractorId, 
				newContractorId 
			});
			// Не прерываем выполнение, если история не записалась
		}
	}

	/**
	 * Сохранить всех подрядчиков (для синхронизации)
	 * Использует транзакцию для атомарности
	 * @param {Array} contractors - Массив подрядчиков
	 */
	async saveAllContractors(contractors) {
		if (!Array.isArray(contractors)) {
			log.error('saveAllContractors: contractors is not an array', { type: typeof contractors, contractors });
			throw new DomainError(DOMAIN_ERROR_CODES.CUSTOMER_VALIDATION_FAILED, 'Contractors must be an array');
		}
		
		// Дополнительная проверка перед вызовом map
		if (contractors === null || contractors === undefined) {
			log.error('saveAllContractors: contractors is null or undefined', { contractors });
			throw new DomainError(DOMAIN_ERROR_CODES.CUSTOMER_VALIDATION_FAILED, 'Contractors cannot be null or undefined');
		}
		
		// Нормализация данных перед валидацией
		const normalizedContractors = contractors.map((contractor, index) => {
			// Создаем новый объект, чтобы не мутировать исходный
			const normalizedContractor = { ...contractor };
			
			// Преобразуем null в undefined для опциональных полей
			// Это нужно, так как схема валидации ожидает undefined, а не null
			if (normalizedContractor.contact === null) {
				normalizedContractor.contact = undefined;
			}
			if (normalizedContractor.comment === null) {
				normalizedContractor.comment = undefined;
			}
			if (normalizedContractor.avatar === null) {
				normalizedContractor.avatar = undefined;
			}
			if (normalizedContractor.specialization === null) {
				log.debug(`[ContractorsService] Normalizing specialization from null to undefined for contractor ${normalizedContractor.id}`);
				normalizedContractor.specialization = undefined;
			}
			if (normalizedContractor.rate === null) {
				normalizedContractor.rate = undefined;
			}
			
			// Дополнительная проверка: убеждаемся, что все null значения преобразованы
			if (normalizedContractor.specialization === null) {
				log.error(`[ContractorsService] ERROR: specialization is still null after normalization for contractor ${normalizedContractor.id}`);
				normalizedContractor.specialization = undefined;
			}
			
			return normalizedContractor;
		});

		// ВАЖНО: Валидация через DTO происходит ПОСЛЕ нормализации
		let validatedContractors;
		try {
			log.debug('Starting DTO validation after normalization', { 
				contractorsCount: normalizedContractors.length
			});
			validatedContractors = validateContractorsArray(normalizedContractors);
			
			// Проверяем, что валидация вернула массив
			if (!Array.isArray(validatedContractors)) {
				log.error('validateContractorsArray returned non-array', { 
					type: typeof validatedContractors, 
					validatedContractors,
					inputCount: normalizedContractors.length
				});
				throw new Error('validateContractorsArray returned invalid result (not an array)');
			}
			
			log.debug('Validation successful', { count: validatedContractors.length });
		} catch (error) {
			log.error('Contractors array validation failed', { 
				error: error.message, 
				count: contractors?.length,
				errorName: error.name,
				errorDetails: error.details
			});
			// Преобразуем Zod ошибку в DomainError
			if (error.name === 'ZodError' || error.issues) {
				throw createDomainErrorFromZod(error, 'Contractors');
			}
			throw new DomainError(DOMAIN_ERROR_CODES.CUSTOMER_VALIDATION_FAILED, error.message);
		}

		try {
			// Дополнительная проверка перед сохранением
			if (!Array.isArray(validatedContractors)) {
				log.error('saveAllContractors: validatedContractors is not an array', { 
					type: typeof validatedContractors, 
					validatedContractors 
				});
				throw new Error('validatedContractors must be an array');
			}
			
			// Используем транзакцию для атомарности
			if (typeof this.repository.runInTransaction === 'function') {
				this.repository.runInTransaction(() => {
					this.repository.saveAll(validatedContractors);
				});
			} else {
				// Fallback: если runInTransaction отсутствует, используем transaction напрямую
				log.warn('[ContractorsService] runInTransaction not found, using transaction directly');
				if (typeof this.repository.transaction === 'function') {
					this.repository.transaction(() => {
						this.repository.saveAll(validatedContractors);
					});
				} else {
					// Последний fallback: сохраняем без транзакции
					log.warn('[ContractorsService] transaction not found, saving without transaction');
					this.repository.saveAll(validatedContractors);
				}
			}
			
			log.info('Contractors saved', { count: validatedContractors.length });
		} catch (error) {
			log.error('Failed to save contractors', { 
				error: error.message, 
				count: validatedContractors?.length ?? 'unknown',
				hasValidatedContractors: validatedContractors !== undefined
			});
			throw new Error(`Failed to save contractors: ${error.message}`);
		}
	}

	/**
	 * Рассчитать статистику подрядчика
	 * @param {string} contractorId - ID подрядчика
	 * @param {Array} tasks - Все задачи (для расчета статистики)
	 */
	calculateContractorStats(contractorId, tasks) {
		const contractorTasks = tasks.filter(t => t.contractorId === contractorId);
		const completedTasks = contractorTasks.filter(t => 
			['completed', 'closed'].includes(t.columnId)
		);
		
		// Сумма всех расходов, где contractorId = этому подрядчику
		let totalExpenses = 0;
		tasks.forEach(task => {
			if (task.expensesEntries && Array.isArray(task.expensesEntries)) {
				task.expensesEntries.forEach(expense => {
					if (expense.contractorId === contractorId) {
						totalExpenses += expense.amount || 0;
					}
				});
			}
		});
		
		// Общая прибыль/убыток по задачам с этим подрядчиком
		let totalProfitOrLoss = 0;
		contractorTasks.forEach(task => {
			const amount = task.amount || 0;
			const expenses = task.expenses || 0;
			totalProfitOrLoss += (amount - expenses);
		});
		
		return {
			tasksCount: contractorTasks.length,
			completedTasksCount: completedTasks.length,
			totalExpenses,
			totalProfitOrLoss
		};
	}
}
