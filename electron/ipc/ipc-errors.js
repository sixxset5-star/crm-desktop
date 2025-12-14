/**
 * Централизованные коды ошибок IPC
 */
import { ErrorShape, domainErrorToShape } from '../domain/error-shape.js';
import { mapDomainErrorToIpcCode } from '../domain/errors.js';

export const IPC_ERROR_CODES = {
	// Общие ошибки
	UNKNOWN_ERROR: 'UNKNOWN_ERROR',
	VALIDATION_ERROR: 'VALIDATION_ERROR',
	NOT_FOUND: 'NOT_FOUND',
	
	// Ошибки БД
	DB_ERROR: 'DB_ERROR',
	DB_CONNECTION_ERROR: 'DB_CONNECTION_ERROR',
	DB_QUERY_ERROR: 'DB_QUERY_ERROR',
	
	// Ошибки задач
	TASK_NOT_FOUND: 'TASK_NOT_FOUND',
	TASK_VALIDATION_ERROR: 'TASK_VALIDATION_ERROR',
	
	// Ошибки клиентов
	CUSTOMER_NOT_FOUND: 'CUSTOMER_NOT_FOUND',
	CUSTOMER_VALIDATION_ERROR: 'CUSTOMER_VALIDATION_ERROR',
	
	// Ошибки файлов
	FILE_NOT_FOUND: 'FILE_NOT_FOUND',
	FILE_ACCESS_ERROR: 'FILE_ACCESS_ERROR',
	
	// Ошибки IPC
	IPC_INVALID_CHANNEL: 'IPC_INVALID_CHANNEL',
	IPC_INVALID_PAYLOAD: 'IPC_INVALID_PAYLOAD',
};

/**
 * Создать стандартизированный ответ об ошибке
 * Всегда возвращает ErrorShape для консистентности
 */
export function createErrorResponse(code, message, details = null) {
	const errorShape = new ErrorShape(code, message, details);
	return {
		ok: false,
		code: errorShape.code,
		message: errorShape.message,
		category: errorShape.category,
		timestamp: errorShape.timestamp,
		...(errorShape.details && { details: errorShape.details })
	};
}

/**
 * Создать успешный ответ
 */
export function createSuccessResponse(data = null) {
	return {
		ok: true,
		...(data !== null && { data })
	};
}

/**
 * Обработать ошибку и вернуть стандартизированный ответ
 * Преобразует любую ошибку в ErrorShape
 */
export function handleError(error, defaultCode = IPC_ERROR_CODES.UNKNOWN_ERROR) {
	console.error('IPC Error:', error);
	
	// Преобразуем в ErrorShape
	const errorShape = domainErrorToShape(error);
	
	// Маппим код домена в IPC код
	const ipcCode = mapDomainErrorToIpcCode(errorShape);
	
	return createErrorResponse(
		ipcCode || defaultCode,
		errorShape.message,
		errorShape.details
	);
}

