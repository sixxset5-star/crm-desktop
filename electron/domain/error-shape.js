/**
 * Строгий формальный формат ошибок
 * Единая структура для всех слоёв: Domain → IPC → UI
 */

// Импортируем DomainError для совместимости
import { DomainError } from './errors.js';

/**
 * Коды ошибок домена (строго типизированные)
 */
export const DOMAIN_ERROR_CODES_STRICT = {
	// Валидация
	VALIDATION_FAILED: 'VALIDATION_FAILED',
	TASK_VALIDATION_FAILED: 'TASK_VALIDATION_FAILED',
	CUSTOMER_VALIDATION_FAILED: 'CUSTOMER_VALIDATION_FAILED',
	GOAL_VALIDATION_FAILED: 'GOAL_VALIDATION_FAILED',
	INCOME_VALIDATION_FAILED: 'INCOME_VALIDATION_FAILED',
	
	// Не найдено
	NOT_FOUND: 'NOT_FOUND',
	TASK_NOT_FOUND: 'TASK_NOT_FOUND',
	CUSTOMER_NOT_FOUND: 'CUSTOMER_NOT_FOUND',
	GOAL_NOT_FOUND: 'GOAL_NOT_FOUND',
	
	// БД
	DB_ERROR: 'DB_ERROR',
	DB_CONSTRAINT_VIOLATION: 'DB_CONSTRAINT_VIOLATION',
	DB_TRANSACTION_FAILED: 'DB_TRANSACTION_FAILED',
	DB_CONNECTION_ERROR: 'DB_CONNECTION_ERROR',
	
	// Бизнес-правила
	BUSINESS_RULE_VIOLATION: 'BUSINESS_RULE_VIOLATION',
	INVALID_STATE_TRANSITION: 'INVALID_STATE_TRANSITION',
	
	// IPC
	IPC_INVALID_CHANNEL: 'IPC_INVALID_CHANNEL',
	IPC_INVALID_PAYLOAD: 'IPC_INVALID_PAYLOAD',
	IPC_CONTRACT_VERSION_MISMATCH: 'IPC_CONTRACT_VERSION_MISMATCH',
	
	// Неизвестная ошибка
	UNKNOWN: 'UNKNOWN',
};

/**
 * Категории ошибок для группировки
 */
export const ERROR_CATEGORIES = {
	VALIDATION: 'VALIDATION',
	DATABASE: 'DATABASE',
	BUSINESS_RULE: 'BUSINESS_RULE',
	NOT_FOUND: 'NOT_FOUND',
	IPC: 'IPC',
	UNEXPECTED: 'UNEXPECTED',
};

/**
 * Строгая структура ошибки с типизацией details
 * @template TDetails - Тип деталей ошибки
 */
export class ErrorShape {
	/**
	 * @param {string} code - Код ошибки
	 * @param {string} message - Сообщение ошибки
	 * @param {TDetails} details - Детали ошибки (типизированы)
	 * @param {string} category - Категория ошибки
	 */
	constructor(code, message, details = null, category = null) {
		this.code = code;
		this.message = message;
		this.details = details;
		this.category = category || this._inferCategory(code);
		this.timestamp = new Date().toISOString();
	}

	_inferCategory(code) {
		if (code.includes('VALIDATION')) return ERROR_CATEGORIES.VALIDATION;
		if (code.includes('DB_') || code.includes('DATABASE')) return ERROR_CATEGORIES.DATABASE;
		if (code.includes('BUSINESS') || code.includes('RULE')) return ERROR_CATEGORIES.BUSINESS_RULE;
		if (code.includes('NOT_FOUND')) return ERROR_CATEGORIES.NOT_FOUND;
		if (code.includes('IPC')) return ERROR_CATEGORIES.IPC;
		return ERROR_CATEGORIES.UNEXPECTED;
	}

	toJSON() {
		return {
			code: this.code,
			message: this.message,
			category: this.category,
			timestamp: this.timestamp,
			...(this.details && { details: this.details }),
		};
	}
}

/**
 * Маппинг DomainError → ErrorShape
 */
export function domainErrorToShape(domainError) {
	if (domainError instanceof ErrorShape) {
		return domainError;
	}
	
	if (domainError instanceof DomainError) {
		return new ErrorShape(
			domainError.code,
			domainError.message,
			domainError.details
		);
	}
	
	// Fallback для обычных Error
	return new ErrorShape(
		DOMAIN_ERROR_CODES_STRICT.UNKNOWN,
		domainError.message || String(domainError),
		{ originalError: domainError.name }
	);
}

/**
 * Маппинг ErrorShape → UI сообщение
 */
export const ERROR_UI_MESSAGES = {
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
export function getErrorMessage(errorShape) {
	if (errorShape instanceof ErrorShape) {
		return ERROR_UI_MESSAGES[errorShape.code] || errorShape.message;
	}
	
	if (errorShape.code && ERROR_UI_MESSAGES[errorShape.code]) {
		return ERROR_UI_MESSAGES[errorShape.code];
	}
	
	return errorShape.message || ERROR_UI_MESSAGES.UNKNOWN;
}

// Экспортируем DomainError для совместимости
export { DomainError };

