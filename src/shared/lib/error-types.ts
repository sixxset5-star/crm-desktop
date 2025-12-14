/**
 * Типы ошибок для UI
 * Экспорт типов из electron/domain для использования в renderer
 */

/**
 * Структура ошибки (совпадает с ErrorShape из main процесса)
 */
export interface ErrorShape {
	code: string;
	message: string;
	category: string;
	timestamp: string;
	details?: unknown;
}

/**
 * Категории ошибок
 */
export const ERROR_CATEGORIES = {
	VALIDATION: 'VALIDATION',
	DATABASE: 'DATABASE',
	BUSINESS_RULE: 'BUSINESS_RULE',
	NOT_FOUND: 'NOT_FOUND',
	IPC: 'IPC',
	UNEXPECTED: 'UNEXPECTED',
} as const;

/**
 * Маппинг кодов ошибок в UI-сообщения
 */
export const ERROR_UI_MESSAGES: Record<string, string> = {
	// Валидация
	VALIDATION_FAILED: 'Ошибка валидации данных',
	TASK_VALIDATION_FAILED: 'Некорректные данные задачи',
	CUSTOMER_VALIDATION_FAILED: 'Некорректные данные клиента',
	GOAL_VALIDATION_FAILED: 'Некорректные данные цели',
	INCOME_VALIDATION_FAILED: 'Некорректные данные дохода',
	
	// Не найдено
	NOT_FOUND: 'Запись не найдена',
	TASK_NOT_FOUND: 'Задача не найдена',
	CUSTOMER_NOT_FOUND: 'Клиент не найден',
	GOAL_NOT_FOUND: 'Цель не найдена',
	
	// БД
	DB_ERROR: 'Ошибка базы данных',
	DB_CONSTRAINT_VIOLATION: 'Нарушение ограничений базы данных',
	DB_TRANSACTION_FAILED: 'Ошибка транзакции',
	DB_CONNECTION_ERROR: 'Ошибка подключения к базе данных',
	
	// Бизнес-правила
	BUSINESS_RULE_VIOLATION: 'Нарушение бизнес-правил',
	INVALID_STATE_TRANSITION: 'Недопустимый переход состояния',
	
	// IPC
	IPC_INVALID_CHANNEL: 'Некорректный IPC канал',
	IPC_INVALID_PAYLOAD: 'Некорректные данные запроса',
	IPC_CONTRACT_VERSION_MISMATCH: 'Несовместимая версия контракта',
	
	// Общее
	UNKNOWN: 'Произошла неизвестная ошибка',
};

/**
 * Получить UI-сообщение для ошибки
 */
export function getErrorMessage(error: ErrorShape | { code?: string; message?: string }): string {
	if (error.code && ERROR_UI_MESSAGES[error.code]) {
		return ERROR_UI_MESSAGES[error.code];
	}
	
	return error.message || ERROR_UI_MESSAGES.UNKNOWN;
}

/**
 * Очистить технические детали из сообщения ошибки
 */
export function sanitizeErrorMessage(message: string): string {
	// Удаляем stack traces
	message = message.replace(/at .*?\(.*?\)/g, '');
	message = message.replace(/at .*?:\d+:\d+/g, '');
	
	// Удаляем пути к файлам
	message = message.replace(/\/[^\s]+/g, '');
	
	// Удаляем SQL ошибки (если просочились)
	message = message.replace(/SQLITE_ERROR:.*/g, '');
	
	return message.trim();
}





