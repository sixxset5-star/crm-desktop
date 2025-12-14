import { ipcMain } from 'electron';
import { autoBackup } from '../services/backup-service.js';
import { enqueueWrite } from '../services/db-queue.js';
import { CustomersService } from '../domain/customers-service.js';
import { createSuccessResponse, handleError, IPC_ERROR_CODES } from './ipc-errors.js';
import { createLogger } from '../services/logger.js';
import { withIpcValidation } from './ipc-validator.js';

const log = createLogger('CustomersIPC');

// Создаем экземпляр сервиса (singleton)
const customersService = new CustomersService();

export function initCustomersIpc() {
	ipcMain.handle('customers:load', async () => {
		try {
			log.debug('Loading customers');
			const customers = await customersService.getAllCustomers();
			log.info('Customers loaded', { count: customers.length });
			
			// Нормализация accesses для обратной совместимости
			const normalized = customers.map(customer => {
				let accesses = customer.accesses || [];
				if (!Array.isArray(accesses)) {
					accesses = [];
				}
				
				// Нормализация accesses: гарантируем, что каждый элемент - объект с нужными полями
				accesses = accesses.map((acc) => {
					if (typeof acc === 'string') {
						return { label: 'Доступ', login: acc, password: '' };
					}
					if (acc && typeof acc === 'object' && typeof acc.login === 'string') {
						return {
							label: typeof acc.label === 'string' ? acc.label : 'Доступ',
							login: acc.login || '',
							password: typeof acc.password === 'string' ? acc.password : ''
						};
					}
					return { label: 'Доступ', login: '', password: '' };
				});
				
				return {
					...customer,
					accesses
				};
			});
			
			return createSuccessResponse(normalized);
		} catch (error) {
			log.error('Failed to load customers', { error: error.message });
			return handleError(error, IPC_ERROR_CODES.DB_ERROR);
		}
	});

	ipcMain.handle('customers:save', withIpcValidation('customers:save', async (event, validatedPayload) => {
		return enqueueWrite(async () => {
			const requestId = log.generateRequestId();
			const startTime = Date.now();
			
			try {
				log.debug('customers:save received payload', { 
					hasPayload: !!validatedPayload, 
					payloadType: typeof validatedPayload,
					payloadKeys: validatedPayload ? Object.keys(validatedPayload) : [],
					requestId 
				});
				
				if (!validatedPayload) {
					throw new Error('validatedPayload is undefined');
				}
				
				// validatedPayload уже является объектом { customers: Customer[] } после валидации
				const customers = validatedPayload.customers;
				if (!Array.isArray(customers)) {
					log.error('customers is not an array', { 
						customersType: typeof customers, 
						customersValue: customers,
						requestId 
					});
					throw new Error('customers must be an array');
				}
				
				log.debug('Saving customers', { count: customers?.length }, requestId);

				await customersService.saveAllCustomers(customers);
				
				const duration = Date.now() - startTime;
				log.info('Customers saved successfully', { count: customers.length, duration_ms: duration }, requestId);
				
				// Создаем бекап после успешного сохранения
				autoBackup().catch(err => {
					log.error('Backup failed', { error: err.message }, requestId);
				});
				
				return createSuccessResponse();
			} catch (error) {
				const duration = Date.now() - startTime;
				log.error('Failed to save customers', { error: error.message, duration_ms: duration }, requestId);
				const response = handleError(error, IPC_ERROR_CODES.DB_ERROR);
				return response;
			}
		});
	}));
}

