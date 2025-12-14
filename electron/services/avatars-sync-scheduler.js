/**
 * Сервис для периодической синхронизации аватаров из Telegram
 */
import { syncAvatarsForEntities } from './telegram-avatar-service.js';
import { CustomersService } from '../domain/customers-service.js';
import { ContractorsService } from '../domain/contractors-service.js';
import { getDatabase } from '../database.js';
import { createLogger } from './logger.js';

const log = createLogger('AvatarsSyncScheduler');

const customersService = new CustomersService();
const contractorsService = new ContractorsService();

let syncInterval = null;
let emitToRenderer = null;

// Интервал синхронизации: 24 часа (в миллисекундах)
const SYNC_INTERVAL_MS = 24 * 60 * 60 * 1000;

/**
 * Установить функцию для отправки уведомлений в UI
 */
export function setEmitToRenderer(emitFn) {
	emitToRenderer = emitFn;
}

/**
 * Отправить уведомление в UI
 */
function sendNotification(type, message) {
	if (emitToRenderer) {
		emitToRenderer('ui:banner', { type, message });
	}
}

/**
 * Выполнить синхронизацию аватаров
 */
async function performSync() {
	try {
		log.info('Starting scheduled avatars sync');
		
		// Проверяем наличие токена
		const db = getDatabase();
		const row = db.prepare('SELECT value FROM settings WHERE key = ?').get('main');
		if (!row) {
			log.debug('No settings found, skipping sync');
			return;
		}
		
		const settings = JSON.parse(row.value);
		if (!settings?.telegramBotToken) {
			log.debug('Telegram bot token not configured, skipping sync');
			return;
		}
		
		// Загружаем заказчиков
		const customers = await customersService.getAllCustomers();
		const customersWithTelegram = customers.filter(c => 
			c.contacts?.some(contact => contact.type === 'Telegram')
		);
		
		// Загружаем подрядчиков
		const contractors = await contractorsService.getAllContractors();
		const contractorsWithTelegram = contractors.filter(c => 
			c.contacts?.some(contact => contact.type === 'Telegram')
		);
		
		if (customersWithTelegram.length === 0 && contractorsWithTelegram.length === 0) {
			log.debug('No entities with Telegram contacts found, skipping sync');
			return;
		}
		
		log.info(`Syncing avatars for ${customersWithTelegram.length} customers and ${contractorsWithTelegram.length} contractors`);
		
		// Синхронизируем заказчиков (с уведомлениями в Telegram)
		let customersResult = { updated: 0, failed: 0, errors: [] };
		if (customersWithTelegram.length > 0) {
			customersResult = await syncAvatarsForEntities(customersWithTelegram, 'customer', true);
			if (customersResult.updated > 0) {
				await customersService.saveAllCustomers(customers);
			}
		}
		
		// Синхронизируем подрядчиков (с уведомлениями в Telegram)
		let contractorsResult = { updated: 0, failed: 0, errors: [] };
		if (contractorsWithTelegram.length > 0) {
			contractorsResult = await syncAvatarsForEntities(contractorsWithTelegram, 'contractor', true);
			if (contractorsResult.updated > 0) {
				await contractorsService.saveAllContractors(contractors);
			}
		}
		
		const totalUpdated = customersResult.updated + contractorsResult.updated;
		const totalFailed = customersResult.failed + contractorsResult.failed;
		
		log.info('Scheduled avatars sync completed', {
			customersUpdated: customersResult.updated,
			contractorsUpdated: contractorsResult.updated,
			totalUpdated,
			totalFailed
		});
		
		// Отправляем уведомления об ошибках
		if (totalFailed > 0) {
			const errorMessages = [
				...customersResult.errors.map(e => `${e.entityName} (@${e.username}): ${e.error}`),
				...contractorsResult.errors.map(e => `${e.entityName} (@${e.username}): ${e.error}`)
			];
			
			const errorMessage = `Не удалось обновить ${totalFailed} аватаров:\n${errorMessages.slice(0, 5).join('\n')}${errorMessages.length > 5 ? `\n...и еще ${errorMessages.length - 5}` : ''}`;
			sendNotification('error', errorMessage);
		} else if (totalUpdated > 0) {
			sendNotification('success', `Обновлено ${totalUpdated} аватаров из Telegram`);
		}
	} catch (error) {
		log.error('Failed to perform scheduled avatars sync', { error: error.message });
		sendNotification('error', `Ошибка синхронизации аватаров: ${error.message}`);
	}
}

/**
 * Запустить периодическую синхронизацию
 */
export function startScheduledSync() {
	if (syncInterval) {
		log.warn('Scheduled sync already running');
		return;
	}
	
	log.info('Starting scheduled avatars sync (every 24 hours)');
	
	// Выполняем первую синхронизацию через 1 минуту после запуска
	// (чтобы не блокировать запуск приложения)
	setTimeout(() => {
		performSync().catch(err => {
			log.error('Initial sync failed', { error: err.message });
		});
	}, 60 * 1000);
	
	// Затем синхронизируем каждые 24 часа
	syncInterval = setInterval(() => {
		performSync().catch(err => {
			log.error('Scheduled sync failed', { error: err.message });
		});
	}, SYNC_INTERVAL_MS);
	
	log.info('Scheduled avatars sync started');
}

/**
 * Остановить периодическую синхронизацию
 */
export function stopScheduledSync() {
	if (syncInterval) {
		clearInterval(syncInterval);
		syncInterval = null;
		log.info('Scheduled avatars sync stopped');
	}
}


