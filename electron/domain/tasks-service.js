import { TasksRepository } from '../repositories/tasks-repository.js';
import { ContractorsRepository } from '../repositories/contractors-repository.js';
import { validateCreateTask, validateUpdateTask, validateTasksArray, safeValidateTask } from './dto/task.dto.js';
import { createLogger } from '../services/logger.js';
import { DomainError, DOMAIN_ERROR_CODES, createDomainErrorFromZod, createNotFoundError, createDatabaseError } from './errors.js';
import { auditLogger } from '../services/audit-logger.js';
import { eventBus, APP_EVENTS } from '../services/event-bus.js';

const log = createLogger('TasksService');

export class TasksService {
	constructor(repository = null, contractorsRepository = null) {
		this.repository = repository || new TasksRepository();
		this.contractorsRepository = contractorsRepository || new ContractorsRepository();
		
		// Runtime-чек для диагностики
		console.log('[TasksService] Repository constructor:', this.repository?.constructor?.name);
		console.log('[TasksService] Has runInTransaction:', typeof this.repository.runInTransaction);
		console.log('[TasksService] Has transaction:', typeof this.repository.transaction);
		console.log('[TasksService] Repository prototype chain:', {
			hasRunInTransaction: 'runInTransaction' in this.repository,
			hasTransaction: 'transaction' in this.repository,
			hasGetDb: 'getDb' in this.repository,
		});
	}

	/**
	 * Загрузить все задачи
	 */
	async getAllTasks() {
		try {
			return this.repository.findAll();
		} catch (error) {
			throw new Error(`Failed to load tasks: ${error.message}`);
		}
	}

	/**
	 * Получить задачу по ID
	 */
	async getTaskById(id) {
		if (!id) {
			throw new Error('Task ID is required');
		}

		const task = this.repository.findById(id);
		if (!task) {
			throw new Error(`Task with id ${id} not found`);
		}

		return task;
	}

	/**
	 * Создать новую задачу
	 * @param {object} taskData - Данные задачи (валидируются через DTO)
	 */
	async createTask(taskData) {
		// Валидация через DTO
		let validatedData;
		try {
			validatedData = validateCreateTask(taskData);
		} catch (error) {
			log.error('Task validation failed', { error: error.message, data: taskData });
			// Преобразуем Zod ошибку в DomainError
			if (error.name === 'ZodError') {
				throw createDomainErrorFromZod(error, 'Task');
			}
			throw new DomainError(DOMAIN_ERROR_CODES.TASK_VALIDATION_FAILED, error.message);
		}

		// Бизнес-правила
		const task = {
			...validatedData,
			columnId: validatedData.columnId || 'unprocessed',
			createdAt: validatedData.createdAt || new Date().toISOString(),
			updatedAt: validatedData.updatedAt || new Date().toISOString()
		};

		try {
			const created = this.repository.create(task);
			log.info('Task created', { id: created.id, title: created.title });
			
			// Audit log
			auditLogger.logCreated('Task', created.id, created).catch(err => {
				log.error('Failed to log task creation', { error: err.message });
			});
			
			// Domain event
			eventBus.emit(APP_EVENTS.TASK_CREATED, { taskId: created.id });
			
			return created;
		} catch (error) {
			log.error('Failed to create task', { error: error.message, taskId: task.id });
			// Преобразуем в DomainError
			if (error instanceof DomainError) {
				throw error;
			}
			throw createDatabaseError(`Failed to create task: ${error.message}`, { taskId: task.id });
		}
	}

	/**
	 * Обновить задачу
	 * @param {string} id - ID задачи
	 * @param {object} updates - Обновления (валидируются через DTO)
	 */
	async updateTask(id, updates) {
		if (!id) {
			throw new Error('Task ID is required');
		}

		// Валидация через DTO
		let validatedUpdates;
		try {
			validatedUpdates = validateUpdateTask({ id, ...updates });
		} catch (error) {
			log.error('Task update validation failed', { error: error.message, id, updates });
			// Преобразуем Zod ошибку в DomainError
			if (error.name === 'ZodError') {
				throw createDomainErrorFromZod(error, 'Task');
			}
			throw new DomainError(DOMAIN_ERROR_CODES.TASK_VALIDATION_FAILED, error.message);
		}

		// Проверяем существование задачи
		const existing = this.repository.findById(id);
		if (!existing) {
			throw createNotFoundError('Task', id);
		}

		// Проверяем, что новый подрядчик активен (если указан)
		if (updates.contractorId !== undefined && updates.contractorId !== null) {
			const contractor = this.contractorsRepository.findById(updates.contractorId);
			if (!contractor) {
				throw new DomainError(DOMAIN_ERROR_CODES.TASK_VALIDATION_FAILED, `Contractor with id ${updates.contractorId} not found`);
			}
			if (!contractor.isActive) {
				throw new DomainError(DOMAIN_ERROR_CODES.TASK_VALIDATION_FAILED, `Cannot assign task to inactive contractor: ${contractor.name}`);
			}
		}

		// Бизнес-правила при обновлении
		const updatedData = {
			...validatedUpdates,
			updatedAt: new Date().toISOString()
		};

		// Если перемещаем задачу в паузу, сохраняем исходный статус
		if (updates.columnId === 'paused' && existing.columnId !== 'paused') {
			updatedData.pausedFromColumnId = existing.columnId;
		}

		// Если перемещаем из паузы, очищаем pausedFromColumnId
		if (existing.columnId === 'paused' && updates.columnId && updates.columnId !== 'paused') {
			updatedData.pausedFromColumnId = undefined;
		}

		// Если изменился contractorId, записываем историю
		if (updates.contractorId !== undefined && existing.contractorId !== updates.contractorId) {
			this._recordAssigneeHistory(id, existing.contractorId, updates.contractorId);
		}

		try {
			const oldTask = this.repository.findById(id);
			const updated = this.repository.update(id, updatedData);
			log.info('Task updated', { id, changes: Object.keys(updates) });
			
			// Audit log с diff
			auditLogger.logUpdated('Task', id, oldTask, updated).catch(err => {
				log.error('Failed to log task update', { error: err.message });
			});
			
			// Domain event
			eventBus.emit(APP_EVENTS.TASK_UPDATED, { 
				taskId: id, 
				changes: Object.keys(updates) 
			});
			
			return updated;
		} catch (error) {
			log.error('Failed to update task', { error: error.message, id });
			throw new Error(`Failed to update task: ${error.message}`);
		}
	}

	/**
	 * Удалить задачу
	 */
	async deleteTask(id) {
		if (!id) {
			throw new Error('Task ID is required');
		}

		const existing = this.repository.findById(id);
		if (!existing) {
			throw new Error(`Task with id ${id} not found`);
		}

		try {
			this.repository.delete(id);
		} catch (error) {
			throw new Error(`Failed to delete task: ${error.message}`);
		}
	}

	/**
	 * Сохранить все задачи (для синхронизации)
	 * Использует транзакцию для атомарности
	 * @param {Array} tasks - Массив задач
	 */
	async saveAllTasks(tasks) {
		log.debug('saveAllTasks called', { count: tasks?.length });
		
		// Проверяем, что tasks - это массив
		if (!Array.isArray(tasks)) {
			log.error('saveAllTasks: tasks is not an array', { type: typeof tasks, tasks });
			throw new DomainError(DOMAIN_ERROR_CODES.TASK_VALIDATION_FAILED, 'Tasks must be an array');
		}
		
		// Дополнительная проверка перед вызовом map
		if (tasks === null || tasks === undefined) {
			log.error('saveAllTasks: tasks is null or undefined', { tasks });
			throw new DomainError(DOMAIN_ERROR_CODES.TASK_VALIDATION_FAILED, 'Tasks cannot be null or undefined');
		}
		
		// Нормализация данных перед валидацией
		const normalizedTasks = tasks.map((task, index) => {
			// Создаем новый объект, чтобы не мутировать исходный
			const normalizedTask = { ...task };
			
			// Фильтруем expensesEntries без title или с пустым title
			// ВАЖНО: это должно происходить ДО валидации DTO
			if (normalizedTask.expensesEntries && Array.isArray(normalizedTask.expensesEntries)) {
				const originalLength = normalizedTask.expensesEntries.length;
				// Создаем новый массив через filter - убираем все entries без валидного title
				const filtered = normalizedTask.expensesEntries.filter(entry => {
					if (!entry || typeof entry !== 'object') {
						log.warn('Filtering invalid expense entry (not an object)', { 
							taskIndex: index, 
							taskId: task.id,
							entryType: typeof entry
						});
						return false;
					}
					// Проверяем, что title существует, это строка и не пустая после trim
					const hasTitle = entry.title && typeof entry.title === 'string' && entry.title.trim().length > 0;
					if (!hasTitle) {
						log.warn('Filtering expense entry without valid title', { 
							taskIndex: index, 
							taskId: task.id,
							entryId: entry.id,
							entryTitle: entry.title,
							entryTitleType: typeof entry.title
						});
						return false;
					}
					return true;
				});
				
				// Если массив стал пустым, удаляем поле полностью
				if (filtered.length === 0) {
					delete normalizedTask.expensesEntries;
					log.debug('Removed empty expensesEntries array', { taskIndex: index, taskId: task.id });
				} else {
					// Заменяем массив на отфильтрованный
					normalizedTask.expensesEntries = filtered;
					if (filtered.length !== originalLength) {
						log.debug('Filtered expensesEntries', { 
							taskIndex: index,
							taskId: task.id,
							originalLength,
							filteredLength: filtered.length
						});
					}
				}
			}
			return normalizedTask;
		});

		log.debug('Normalization completed', { 
			originalCount: tasks.length,
			normalizedCount: normalizedTasks.length 
		});

		// ВАЖНО: Валидация через DTO происходит ПОСЛЕ нормализации
		// К этому моменту все expensesEntries должны быть либо удалены, либо иметь валидный title
		let validatedTasks;
		try {
			log.debug('Starting DTO validation after normalization', { 
				tasksCount: normalizedTasks.length,
				sampleTask: normalizedTasks[0] ? {
					id: normalizedTasks[0].id,
					title: normalizedTasks[0].title,
					hasExpensesEntries: !!normalizedTasks[0].expensesEntries,
					expensesEntriesLength: normalizedTasks[0].expensesEntries?.length || 0
				} : null
			});
			validatedTasks = validateTasksArray(normalizedTasks);
			
			// Проверяем, что валидация вернула массив
			if (!Array.isArray(validatedTasks)) {
				log.error('validateTasksArray returned non-array', { 
					type: typeof validatedTasks, 
					validatedTasks,
					inputCount: normalizedTasks.length
				});
				throw new Error('validateTasksArray returned invalid result (not an array)');
			}
			
			log.debug('Validation successful', { count: validatedTasks.length });
		} catch (error) {
			log.error('Tasks array validation failed', { 
				error: error.message, 
				count: tasks?.length,
				errorName: error.name,
				errorDetails: error.details
			});
			// Преобразуем Zod ошибку в DomainError
			if (error.name === 'ZodError' || error.issues) {
				throw createDomainErrorFromZod(error, 'Tasks');
			}
			throw new DomainError(DOMAIN_ERROR_CODES.TASK_VALIDATION_FAILED, error.message);
		}

		try {
			// Дополнительная проверка перед сохранением
			if (!Array.isArray(validatedTasks)) {
				log.error('saveAllTasks: validatedTasks is not an array', { 
					type: typeof validatedTasks, 
					validatedTasks 
				});
				throw new Error('validatedTasks must be an array');
			}
			
			// Используем транзакцию для атомарности
			// Проверяем наличие метода runInTransaction
			if (typeof this.repository.runInTransaction === 'function') {
				this.repository.runInTransaction(() => {
					this.repository.saveAll(validatedTasks);
				});
			} else {
				// Fallback: если runInTransaction отсутствует, используем transaction напрямую
				log.warn('[TasksService] runInTransaction not found, using transaction directly');
				if (typeof this.repository.transaction === 'function') {
					this.repository.transaction(() => {
						this.repository.saveAll(validatedTasks);
					});
				} else {
					// Последний fallback: сохраняем без транзакции
					log.warn('[TasksService] transaction not found, saving without transaction');
					this.repository.saveAll(validatedTasks);
				}
			}
			
			log.info('Tasks saved', { count: validatedTasks.length });
			
			// Domain event для синхронизации
			eventBus.emit(APP_EVENTS.TASKS_SYNCED, { count: validatedTasks.length });
		} catch (error) {
			log.error('Failed to save tasks', { 
				error: error.message, 
				count: validatedTasks?.length ?? 'unknown',
				hasValidatedTasks: validatedTasks !== undefined
			});
			throw new Error(`Failed to save tasks: ${error.message}`);
		}
	}

	/**
	 * Переместить задачу в другую колонку
	 */
	async moveTask(id, toColumnId) {
		if (!id) {
			throw new Error('Task ID is required');
		}
		if (!toColumnId) {
			throw new Error('Target column ID is required');
		}

		const validColumns = ['unprocessed', 'notstarted', 'inwork', 'completed', 'closed', 'cancelled', 'paused'];
		if (!validColumns.includes(toColumnId)) {
			throw new Error(`Invalid column ID: ${toColumnId}`);
		}

		return this.updateTask(id, { columnId: toColumnId });
	}

	/**
	 * Получить историю изменения исполнителей задачи
	 * @param {string} taskId - ID задачи
	 * @returns {Array} Массив записей истории
	 */
	async getTaskAssigneeHistory(taskId) {
		if (!taskId) {
			throw new Error('Task ID is required');
		}

		try {
			const db = this.repository.getDb();
			const rows = db.prepare(`
				SELECT id, task_id, old_contractor_id, new_contractor_id, changed_at
				FROM task_assignee_history
				WHERE task_id = ?
				ORDER BY changed_at ASC
			`).all(taskId);

			return rows.map(row => ({
				id: row.id,
				taskId: row.task_id,
				oldContractorId: row.old_contractor_id || null,
				newContractorId: row.new_contractor_id || null,
				changedAt: row.changed_at
			}));
		} catch (error) {
			log.error('Failed to get assignee history', { error: error.message, taskId });
			throw new Error(`Failed to get assignee history: ${error.message}`);
		}
	}

	/**
	 * Получить историю всех задач подрядчика
	 * @param {string} contractorId - ID подрядчика
	 * @returns {Array} Массив записей истории
	 */
	async getContractorAssigneeHistory(contractorId) {
		if (!contractorId) {
			throw new Error('Contractor ID is required');
		}

		try {
			const db = this.repository.getDb();
			const rows = db.prepare(`
				SELECT id, task_id, old_contractor_id, new_contractor_id, changed_at
				FROM task_assignee_history
				WHERE old_contractor_id = ? OR new_contractor_id = ?
				ORDER BY changed_at DESC
			`).all(contractorId, contractorId);

			return rows.map(row => ({
				id: row.id,
				taskId: row.task_id,
				oldContractorId: row.old_contractor_id || null,
				newContractorId: row.new_contractor_id || null,
				changedAt: row.changed_at
			}));
		} catch (error) {
			log.error('Failed to get contractor assignee history', { error: error.message, contractorId });
			throw new Error(`Failed to get contractor assignee history: ${error.message}`);
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
			
			log.debug('Assignee history recorded', { taskId, oldContractorId, newContractorId });
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
}
