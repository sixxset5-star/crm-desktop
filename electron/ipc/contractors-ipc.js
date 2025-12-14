import { ipcMain } from 'electron';
import { autoBackup } from '../services/backup-service.js';
import { enqueueWrite } from '../services/db-queue.js';
import { ContractorsService } from '../domain/contractors-service.js';
import { createSuccessResponse, handleError, IPC_ERROR_CODES } from './ipc-errors.js';
import { createLogger } from '../services/logger.js';
import { withIpcValidation } from './ipc-validator.js';

const log = createLogger('ContractorsIPC');

// Создаем экземпляр сервиса (singleton)
let contractorsService;
try {
	contractorsService = new ContractorsService();
	console.log('[ContractorsIPC] ContractorsService created successfully');
} catch (error) {
	console.error('[ContractorsIPC] Failed to create ContractorsService:', error);
	throw error;
}

export function initContractorsIpc() {
	console.log('[ContractorsIPC] Initializing contractors IPC handlers...');
	console.log('[ContractorsIPC] ipcMain available:', !!ipcMain);
	console.log('[ContractorsIPC] ipcMain.handle available:', typeof ipcMain?.handle === 'function');
	console.log('[ContractorsIPC] contractorsService available:', !!contractorsService);
	
	if (!ipcMain) {
		console.error('[ContractorsIPC] ERROR: ipcMain is not available!');
		throw new Error('ipcMain is not available');
	}
	
	if (!contractorsService) {
		console.error('[ContractorsIPC] ERROR: contractorsService is not available!');
		throw new Error('contractorsService is not available');
	}
	
	ipcMain.handle('contractors:load', async () => {
		try {
			log.debug('Loading contractors');
			const contractors = await contractorsService.getAllContractors();
			log.info('Contractors loaded', { count: contractors.length });
			
			// Нормализация contacts для обратной совместимости
			const normalized = contractors.map(contractor => {
				let contacts = contractor.contacts || [];
				if (!Array.isArray(contacts)) {
					contacts = [];
				}
				
				// Нормализация contacts: гарантируем, что каждый элемент - объект с нужными полями
				contacts = contacts.map((contact) => {
					if (typeof contact === 'string') {
						return { type: 'Контакт', value: contact };
					}
					if (contact && typeof contact === 'object' && typeof contact.value === 'string') {
						return {
							type: typeof contact.type === 'string' ? contact.type : 'Контакт',
							value: contact.value || ''
						};
					}
					return { type: 'Контакт', value: '' };
				});
				
				return {
					...contractor,
					contacts
				};
			});
			
			return createSuccessResponse(normalized);
		} catch (error) {
			log.error('Failed to load contractors', { error: error.message });
			return handleError(error, IPC_ERROR_CODES.DB_ERROR);
		}
	});

	ipcMain.handle('contractors:save', withIpcValidation('contractors:save', async (event, validatedPayload) => {
		return enqueueWrite(async () => {
			const requestId = log.generateRequestId();
			const startTime = Date.now();
			
			try {
				log.debug('contractors:save received payload', { 
					hasPayload: !!validatedPayload, 
					payloadType: typeof validatedPayload,
					payloadKeys: validatedPayload ? Object.keys(validatedPayload) : [],
					requestId 
				});
				
				if (!validatedPayload) {
					throw new Error('validatedPayload is undefined');
				}
				
				// validatedPayload уже является объектом { contractors: Contractor[] } после валидации
				const contractors = validatedPayload.contractors;
				if (!Array.isArray(contractors)) {
					log.error('contractors is not an array', { 
						contractorsType: typeof contractors, 
						contractorsValue: contractors,
						requestId 
					});
					throw new Error('contractors must be an array');
				}
				
				log.debug('Saving contractors', { count: contractors?.length }, requestId);

				await contractorsService.saveAllContractors(contractors);
				
				const duration = Date.now() - startTime;
				log.info('Contractors saved successfully', { count: contractors.length, duration_ms: duration }, requestId);
				
				// Создаем бекап после успешного сохранения
				autoBackup().catch(err => {
					log.error('Backup failed', { error: err.message }, requestId);
				});
				
				return createSuccessResponse();
			} catch (error) {
				const duration = Date.now() - startTime;
				log.error('Failed to save contractors', { error: error.message, duration_ms: duration }, requestId);
				const response = handleError(error, IPC_ERROR_CODES.DB_ERROR);
				return response;
			}
		});
	}));

	ipcMain.handle('contractors:deactivate', withIpcValidation('contractors:deactivate', async (event, validatedPayload) => {
		return enqueueWrite(async () => {
			const requestId = log.generateRequestId();
			const startTime = Date.now();
			
			try {
				log.debug('contractors:deactivate received payload', { 
					hasPayload: !!validatedPayload, 
					payloadType: typeof validatedPayload,
					requestId 
				});
				
				if (!validatedPayload || !validatedPayload.id) {
					throw new Error('Contractor ID is required');
				}
				
				const { id } = validatedPayload;
				log.debug('Deactivating contractor', { id }, requestId);

				const result = await contractorsService.deactivateContractor(id);
				
				const duration = Date.now() - startTime;
				log.info('Contractor deactivated successfully', { 
					id, 
					tasksReturned: result.tasksReturned,
					duration_ms: duration 
				}, requestId);
				
				// Создаем бекап после успешного сохранения
				autoBackup().catch(err => {
					log.error('Backup failed', { error: err.message }, requestId);
				});
				
				return createSuccessResponse({ tasksReturned: result.tasksReturned });
			} catch (error) {
				const duration = Date.now() - startTime;
				log.error('Failed to deactivate contractor', { error: error.message, duration_ms: duration }, requestId);
				const response = handleError(error, IPC_ERROR_CODES.DB_ERROR);
				return response;
			}
		});
	}));

	ipcMain.handle('contractors:delete', withIpcValidation('contractors:delete', async (event, validatedPayload) => {
		return enqueueWrite(async () => {
			const requestId = log.generateRequestId();
			const startTime = Date.now();
			
			try {
				log.debug('contractors:delete received payload', { 
					hasPayload: !!validatedPayload, 
					payloadType: typeof validatedPayload,
					requestId 
				});
				
				if (!validatedPayload || !validatedPayload.id) {
					throw new Error('Contractor ID is required');
				}
				
				const { id } = validatedPayload;
				log.debug('Deleting contractor', { id }, requestId);

				await contractorsService.deleteContractor(id);
				
				const duration = Date.now() - startTime;
				log.info('Contractor deleted successfully', { id, duration_ms: duration }, requestId);
				
				// Создаем бекап после успешного удаления
				autoBackup().catch(err => {
					log.error('Backup failed', { error: err.message }, requestId);
				});
				
				return createSuccessResponse();
			} catch (error) {
				const duration = Date.now() - startTime;
				log.error('Failed to delete contractor', { error: error.message, duration_ms: duration }, requestId);
				const response = handleError(error, IPC_ERROR_CODES.DB_ERROR);
				return response;
			}
		});
	}));
	
	console.log('[ContractorsIPC] Contractors IPC handlers registered successfully');
	console.log('[ContractorsIPC] Registered handlers:', {
		'contractors:load': ipcMain.listenerCount('contractors:load') > 0,
		'contractors:save': ipcMain.listenerCount('contractors:save') > 0,
		'contractors:deactivate': ipcMain.listenerCount('contractors:deactivate') > 0,
		'contractors:delete': ipcMain.listenerCount('contractors:delete') > 0
	});
}
