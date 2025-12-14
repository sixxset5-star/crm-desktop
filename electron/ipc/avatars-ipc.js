import { ipcMain } from 'electron';
import { syncAvatarsForEntities } from '../services/telegram-avatar-service.js';
import { CustomersService } from '../domain/customers-service.js';
import { ContractorsService } from '../domain/contractors-service.js';
import { createSuccessResponse, handleError, IPC_ERROR_CODES } from './ipc-errors.js';
import { createLogger } from '../services/logger.js';
import { withIpcValidation } from './ipc-validator.js';

const log = createLogger('AvatarsIPC');

const customersService = new CustomersService();
const contractorsService = new ContractorsService();

/**
 * Синхронизировать аватары заказчиков из Telegram
 */
export function initAvatarsIpc() {
	console.log('[AvatarsIPC] Initializing avatars IPC handlers...');
	ipcMain.handle('avatars:syncCustomers', withIpcValidation('avatars:syncCustomers', async (event, validatedPayload) => {
		try {
			log.debug('Starting customer avatars sync');
			
			// Загружаем всех заказчиков
			const customers = await customersService.getAllCustomers();
			
			// Фильтруем только тех, у кого есть Telegram контакт
			const customersWithTelegram = customers.filter(c => 
				c.contacts?.some(contact => contact.type === 'Telegram')
			);
			
			log.info(`Found ${customers.length} total customers, ${customersWithTelegram.length} with Telegram contacts`);
			
			if (customersWithTelegram.length === 0) {
				log.info('No customers with Telegram contacts found');
				return createSuccessResponse({
					updated: 0,
					failed: 0,
					errors: [],
					message: 'Нет заказчиков с Telegram контактами. Добавьте контакт типа "Telegram" в профиль заказчика.'
				});
			}
			
			log.info(`Syncing avatars for ${customersWithTelegram.length} customers`);
			
			// Синхронизируем аватары (с уведомлениями в Telegram)
			const result = await syncAvatarsForEntities(customersWithTelegram, 'customer', true);
			
			// Сохраняем обновленных заказчиков
			if (result.updated > 0) {
				await customersService.saveAllCustomers(customers);
				log.info(`Saved ${result.updated} updated customers`);
			}
			
			if (result.failed > 0) {
				log.warn(`Failed to sync ${result.failed} customer avatars`, { errors: result.errors });
			}
			
			return createSuccessResponse({
				updated: result.updated,
				failed: result.failed,
				errors: result.errors
			});
		} catch (error) {
			log.error('Failed to sync customer avatars', { error: error.message });
			return handleError(error, IPC_ERROR_CODES.UNKNOWN_ERROR);
		}
	}));

	ipcMain.handle('avatars:syncContractors', withIpcValidation('avatars:syncContractors', async (event, validatedPayload) => {
		try {
			log.debug('Starting contractor avatars sync');
			
			// Загружаем всех подрядчиков
			const contractors = await contractorsService.getAllContractors();
			
			// Фильтруем только тех, у кого есть Telegram контакт
			const contractorsWithTelegram = contractors.filter(c => 
				c.contacts?.some(contact => contact.type === 'Telegram')
			);
			
			log.info(`Found ${contractors.length} total contractors, ${contractorsWithTelegram.length} with Telegram contacts`);
			
			if (contractorsWithTelegram.length === 0) {
				log.info('No contractors with Telegram contacts found');
				return createSuccessResponse({
					updated: 0,
					failed: 0,
					errors: [],
					message: 'Нет подрядчиков с Telegram контактами. Добавьте контакт типа "Telegram" в профиль подрядчика.'
				});
			}
			
			log.info(`Syncing avatars for ${contractorsWithTelegram.length} contractors`);
			
			// Синхронизируем аватары (с уведомлениями в Telegram)
			const result = await syncAvatarsForEntities(contractorsWithTelegram, 'contractor', true);
			
			// Сохраняем обновленных подрядчиков
			if (result.updated > 0) {
				await contractorsService.saveAllContractors(contractors);
				log.info(`Saved ${result.updated} updated contractors`);
			}
			
			if (result.failed > 0) {
				log.warn(`Failed to sync ${result.failed} contractor avatars`, { errors: result.errors });
			}
			
			return createSuccessResponse({
				updated: result.updated,
				failed: result.failed,
				errors: result.errors
			});
		} catch (error) {
			log.error('Failed to sync contractor avatars', { error: error.message });
			return handleError(error, IPC_ERROR_CODES.UNKNOWN_ERROR);
		}
	}));

	ipcMain.handle('avatars:syncAll', withIpcValidation('avatars:syncAll', async (event, validatedPayload) => {
		try {
			log.debug('Starting full avatars sync (customers + contractors)');
			
			// Синхронизируем заказчиков
			const customers = await customersService.getAllCustomers();
			const customersWithTelegram = customers.filter(c => 
				c.contacts?.some(contact => contact.type === 'Telegram')
			);
			let customersResult = { updated: 0, failed: 0, errors: [] };
			if (customersWithTelegram.length > 0) {
				customersResult = await syncAvatarsForEntities(customersWithTelegram, 'customer', true);
				if (customersResult.updated > 0) {
					await customersService.saveAllCustomers(customers);
				}
			}
			
			// Синхронизируем подрядчиков
			const contractors = await contractorsService.getAllContractors();
			const contractorsWithTelegram = contractors.filter(c => 
				c.contacts?.some(contact => contact.type === 'Telegram')
			);
			let contractorsResult = { updated: 0, failed: 0, errors: [] };
			if (contractorsWithTelegram.length > 0) {
				contractorsResult = await syncAvatarsForEntities(contractorsWithTelegram, 'contractor', true);
				if (contractorsResult.updated > 0) {
					await contractorsService.saveAllContractors(contractors);
				}
			}
			
			// Объединяем результаты
			const totalUpdated = customersResult.updated + contractorsResult.updated;
			const totalFailed = customersResult.failed + contractorsResult.failed;
			const allErrors = [...(customersResult.errors || []), ...(contractorsResult.errors || [])];
			
			const totalCustomers = customers.length;
			const totalContractors = contractors.length;
			const customersWithTelegramCount = customersWithTelegram.length;
			const contractorsWithTelegramCount = contractorsWithTelegram.length;
			
			log.info('Full avatars sync completed', {
				totalCustomers,
				customersWithTelegram: customersWithTelegramCount,
				customersUpdated: customersResult.updated,
				totalContractors,
				contractorsWithTelegram: contractorsWithTelegramCount,
				contractorsUpdated: contractorsResult.updated,
				totalUpdated,
				totalFailed
			});
			
			let message = '';
			if (totalUpdated === 0 && totalFailed === 0) {
				if (customersWithTelegramCount === 0 && contractorsWithTelegramCount === 0) {
					message = 'Нет заказчиков или подрядчиков с Telegram контактами. Добавьте контакт типа "Telegram" в профили.';
				} else {
					message = `Найдено ${customersWithTelegramCount} заказчиков и ${contractorsWithTelegramCount} подрядчиков с Telegram, но нет аватаров для обновления (возможно, аватары уже свежие или у пользователей нет фото профиля).`;
				}
			}
			
			return createSuccessResponse({
				customers: customersResult,
				contractors: contractorsResult,
				totalUpdated,
				totalFailed,
				errors: allErrors,
				message,
				stats: {
					totalCustomers,
					customersWithTelegram: customersWithTelegramCount,
					totalContractors,
					contractorsWithTelegram: contractorsWithTelegramCount
				}
			});
		} catch (error) {
			log.error('Failed to sync all avatars', { error: error.message });
			return handleError(error, IPC_ERROR_CODES.UNKNOWN_ERROR);
		}
	}));

	ipcMain.handle('avatars:getChatId', withIpcValidation('avatars:getChatId', async (event, validatedPayload) => {
		try {
			log.debug('Getting chat ID from Telegram bot');
			
			const { getLastChatId } = await import('../services/telegram-avatar-service.js');
			const chatId = await getLastChatId();
			
			log.info('Chat ID retrieved successfully', { chatId });
			return createSuccessResponse({ chatId });
		} catch (error) {
			log.error('Failed to get chat ID', { error: error.message });
			return handleError(error, IPC_ERROR_CODES.UNKNOWN_ERROR);
		}
	}));
	
	console.log('[AvatarsIPC] Avatars IPC handlers registered successfully');
}


