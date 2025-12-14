/**
 * Типизированные детали ошибок для каждого домена
 * Обеспечивает строгую структуру details в ErrorShape
 */

/**
 * Детали ошибки валидации
 */
export interface ValidationErrorDetails {
	errors: Record<string, string[]>;
	formErrors?: string[];
	field?: string;
}

/**
 * Детали ошибки "не найдено"
 */
export interface NotFoundErrorDetails {
	entityType: string;
	id: string;
	field?: string;
}

/**
 * Детали ошибки БД
 */
export interface DatabaseErrorDetails {
	operation: string;
	table?: string;
	constraint?: string;
	code?: string;
}

/**
 * Детали ошибки бизнес-правил
 */
export interface BusinessRuleErrorDetails {
	rule: string;
	entityId?: string;
	currentState?: string;
	targetState?: string;
}

/**
 * Детали ошибки IPC
 */
export interface IpcErrorDetails {
	channel: string;
	requestId?: string;
	payload?: unknown;
}

/**
 * Создать детали ошибки валидации
 */
export function createValidationDetails(errors, formErrors = []) {
	return {
		errors,
		formErrors,
	};
}

/**
 * Создать детали ошибки "не найдено"
 */
export function createNotFoundDetails(entityType, id, field = null) {
	return {
		entityType,
		id,
		...(field && { field }),
	};
}

/**
 * Создать детали ошибки БД
 */
export function createDatabaseDetails(operation, table = null, constraint = null, code = null) {
	return {
		operation,
		...(table && { table }),
		...(constraint && { constraint }),
		...(code && { code }),
	};
}

 * Типизированные детали ошибок для каждого домена
 * Обеспечивает строгую структуру details в ErrorShape
 */

/**
 * Детали ошибки валидации
 */
export interface ValidationErrorDetails {
	errors: Record<string, string[]>;
	formErrors?: string[];
	field?: string;
}

/**
 * Детали ошибки "не найдено"
 */
export interface NotFoundErrorDetails {
	entityType: string;
	id: string;
	field?: string;
}

/**
 * Детали ошибки БД
 */
export interface DatabaseErrorDetails {
	operation: string;
	table?: string;
	constraint?: string;
	code?: string;
}

/**
 * Детали ошибки бизнес-правил
 */
export interface BusinessRuleErrorDetails {
	rule: string;
	entityId?: string;
	currentState?: string;
	targetState?: string;
}

/**
 * Детали ошибки IPC
 */
export interface IpcErrorDetails {
	channel: string;
	requestId?: string;
	payload?: unknown;
}

/**
 * Создать детали ошибки валидации
 */
export function createValidationDetails(errors, formErrors = []) {
	return {
		errors,
		formErrors,
	};
}

/**
 * Создать детали ошибки "не найдено"
 */
export function createNotFoundDetails(entityType, id, field = null) {
	return {
		entityType,
		id,
		...(field && { field }),
	};
}

/**
 * Создать детали ошибки БД
 */
export function createDatabaseDetails(operation, table = null, constraint = null, code = null) {
	return {
		operation,
		...(table && { table }),
		...(constraint && { constraint }),
		...(code && { code }),
	};
}




