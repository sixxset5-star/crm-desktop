import { ipcMain } from 'electron';
import { autoBackup } from '../services/backup-service.js';
import { enqueueWrite } from '../services/db-queue.js';
import { TasksService } from '../domain/tasks-service.js';
import { createSuccessResponse, handleError, IPC_ERROR_CODES } from './ipc-errors.js';
import { createLogger } from '../services/logger.js';
import { withIpcValidation } from './ipc-validator.js';

const log = createLogger('TasksIPC');

let emitToRenderer = null;

export function setEmitToRenderer(emitFn) {
	emitToRenderer = emitFn;
}

function sendErrorToUI(message, code = IPC_ERROR_CODES.DB_ERROR) {
	if (emitToRenderer) {
		emitToRenderer('ui:banner', {
			type: 'error',
			message: `Ошибка: ${message}`
		});
	}
}

// Создаем экземпляр сервиса (singleton)
const tasksService = new TasksService();

export function initTasksIpc() {
	// Используем withIpcValidation для автоматической валидации
	ipcMain.handle('tasks:load', withIpcValidation('tasks:load', async (event, payload) => {
		const requestId = log.generateRequestId();
		try {
			log.debug('Loading tasks', null, requestId);
			const tasks = await tasksService.getAllTasks();
			log.info('Tasks loaded', { count: tasks.length }, requestId);
			return createSuccessResponse(tasks);
		} catch (error) {
			log.error('Failed to load tasks', { error: error.message }, requestId);
			const response = handleError(error, IPC_ERROR_CODES.DB_ERROR);
			sendErrorToUI(response.message, response.code);
			return response;
		}
	}));

	ipcMain.handle('tasks:save', withIpcValidation('tasks:save', async (event, validatedPayload) => {
		return enqueueWrite(async () => {
			const requestId = log.generateRequestId();
			const startTime = Date.now();
			
			try {
				log.debug('tasks:save received payload', { 
					hasPayload: !!validatedPayload, 
					payloadType: typeof validatedPayload,
					payloadKeys: validatedPayload ? Object.keys(validatedPayload) : [],
					requestId 
				});
				
				if (!validatedPayload) {
					throw new Error('validatedPayload is undefined');
				}
				
				const tasks = validatedPayload.tasks;
				if (!Array.isArray(tasks)) {
					log.error('tasks is not an array', { 
						tasksType: typeof tasks, 
						tasksValue: tasks,
						requestId 
					});
					throw new Error('tasks must be an array');
				}
				
				log.debug('Saving tasks', { count: tasks?.length }, requestId);

				await tasksService.saveAllTasks(tasks);
				
				const duration = Date.now() - startTime;
				log.info('Tasks saved successfully', { count: tasks.length, duration_ms: duration }, requestId);
				
				// Создаем бекап после успешного сохранения
				autoBackup().catch(err => {
					log.error('Backup failed', { error: err.message }, requestId);
				});
				
				return createSuccessResponse();
			} catch (error) {
				const duration = Date.now() - startTime;
				log.error('Failed to save tasks', { error: error.message, duration_ms: duration }, requestId);
				const response = handleError(error, IPC_ERROR_CODES.DB_ERROR);
				sendErrorToUI(response.message, response.code);
				return response;
			}
		});
	}));

	ipcMain.handle('tasks:getAssigneeHistory', withIpcValidation('tasks:getAssigneeHistory', async (event, payload) => {
		const requestId = log.generateRequestId();
		try {
			const { taskId } = payload;
			if (!taskId) {
				throw new Error('Task ID is required');
			}
			
			log.debug('Getting assignee history', { taskId }, requestId);
			const history = await tasksService.getTaskAssigneeHistory(taskId);
			log.info('Assignee history loaded', { taskId, count: history.length }, requestId);
			return createSuccessResponse(history);
		} catch (error) {
			log.error('Failed to get assignee history', { error: error.message }, requestId);
			const response = handleError(error, IPC_ERROR_CODES.DB_ERROR);
			sendErrorToUI(response.message, response.code);
			return response;
		}
	}));

	ipcMain.handle('tasks:getContractorAssigneeHistory', withIpcValidation('tasks:getContractorAssigneeHistory', async (event, payload) => {
		const requestId = log.generateRequestId();
		try {
			const { contractorId } = payload;
			if (!contractorId) {
				throw new Error('Contractor ID is required');
			}
			
			log.debug('Getting contractor assignee history', { contractorId }, requestId);
			const history = await tasksService.getContractorAssigneeHistory(contractorId);
			log.info('Contractor assignee history loaded', { contractorId, count: history.length }, requestId);
			return createSuccessResponse(history);
		} catch (error) {
			log.error('Failed to get contractor assignee history', { error: error.message }, requestId);
			const response = handleError(error, IPC_ERROR_CODES.DB_ERROR);
			sendErrorToUI(response.message, response.code);
			return response;
		}
	}));
}


