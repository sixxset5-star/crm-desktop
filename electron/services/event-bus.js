/**
 * Централизованная система событий приложения
 * Позволяет компонентам общаться без прямых зависимостей
 */
import { EventEmitter } from 'events';
import { createLogger } from './logger.js';

const log = createLogger('EventBus');

class AppEventBus extends EventEmitter {
	constructor() {
		super();
		this.setMaxListeners(50); // Увеличиваем лимит для множественных подписок
	}

	/**
	 * Типизированная подписка на событие
	 * @param {string} event - Название события
	 * @param {Function} handler - Обработчик события
	 * @returns {Function} Функция для отписки
	 */
	subscribe(event, handler) {
		if (typeof handler !== 'function') {
			log.warn('Invalid event handler', { event, handlerType: typeof handler });
			return () => {};
		}

		this.on(event, handler);
		log.debug('Event subscribed', { event, listeners: this.listenerCount(event) });
		
		return () => {
			this.off(event, handler);
			log.debug('Event unsubscribed', { event, listeners: this.listenerCount(event) });
		};
	}

	/**
	 * Типизированная отправка события
	 * @param {string} event - Название события
	 * @param {*} payload - Данные события
	 */
	emit(event, payload) {
		log.debug('Event emitted', { event, hasListeners: this.listenerCount(event) > 0 });
		super.emit(event, payload);
	}

	/**
	 * Подписаться на событие один раз
	 */
	once(event, handler) {
		return super.once(event, handler);
	}

	/**
	 * Удалить все подписки на событие
	 */
	removeAllListeners(event) {
		if (event) {
			log.debug('Removed all listeners', { event });
		}
		return super.removeAllListeners(event);
	}
}

// Singleton экземпляр
export const eventBus = new AppEventBus();

/**
 * Типизированные события приложения
 * Разделены по категориям для лучшей организации
 */
export const APP_EVENTS = {
	// ===== Application Events (жизненный цикл) =====
	APP_READY: 'app:ready',
	APP_WILL_QUIT: 'app:will-quit',
	APP_WINDOW_ALL_CLOSED: 'app:window-all-closed',
	
	// ===== Window Events =====
	WINDOW_CREATED: 'window:created',
	WINDOW_CLOSED: 'window:closed',
	WINDOW_FOCUSED: 'window:focused',
	
	// ===== Database Events =====
	DB_CONNECTED: 'db:connected',
	DB_ERROR: 'db:error',
	DB_MIGRATION_COMPLETE: 'db:migration-complete',
	
	// ===== IPC Events (технические) =====
	IPC_ERROR: 'ipc:error',
	IPC_REQUEST: 'ipc:request',
	IPC_RESPONSE: 'ipc:response',
	
	// ===== Domain Events (бизнес-события) =====
	TASK_CREATED: 'domain:task:created',
	TASK_UPDATED: 'domain:task:updated',
	TASK_DELETED: 'domain:task:deleted',
	TASKS_SYNCED: 'domain:tasks:synced',
	
	CUSTOMER_CREATED: 'domain:customer:created',
	CUSTOMER_UPDATED: 'domain:customer:updated',
	CUSTOMER_DELETED: 'domain:customer:deleted',
	CUSTOMERS_SYNCED: 'domain:customers:synced',
	
	// ===== Update Events =====
	UPDATE_AVAILABLE: 'update:available',
	UPDATE_DOWNLOADED: 'update:downloaded',
	UPDATE_ERROR: 'update:error',
};

// Типы payload для событий (JSDoc для документации)
/**
 * @typedef {Object} AppEventPayloadMap
 * @property {void} [APP_READY]
 * @property {void} [APP_WILL_QUIT]
 * @property {void} [APP_WINDOW_ALL_CLOSED]
 * @property {{window: any}} [WINDOW_CREATED]
 * @property {void} [WINDOW_CLOSED]
 * @property {{window: any}} [WINDOW_FOCUSED]
 * @property {void} [DB_CONNECTED]
 * @property {{error: Error}} [DB_ERROR]
 * @property {{version: number}} [DB_MIGRATION_COMPLETE]
 * @property {{channel: string, error: Error}} [IPC_ERROR]
 * @property {{channel: string, requestId: string}} [IPC_REQUEST]
 * @property {{channel: string, requestId: string, duration: number}} [IPC_RESPONSE]
 * @property {{taskId: string}} [TASK_CREATED]
 * @property {{taskId: string, changes: string[]}} [TASK_UPDATED]
 * @property {{taskId: string}} [TASK_DELETED]
 * @property {{count: number}} [TASKS_SYNCED]
 * @property {{customerId: string}} [CUSTOMER_CREATED]
 * @property {{customerId: string, changes: string[]}} [CUSTOMER_UPDATED]
 * @property {{customerId: string}} [CUSTOMER_DELETED]
 * @property {{count: number}} [CUSTOMERS_SYNCED]
 * @property {{version: string}} [UPDATE_AVAILABLE]
 * @property {{version: string}} [UPDATE_DOWNLOADED]
 * @property {{error: Error}} [UPDATE_ERROR]
 */

