/**
 * Централизованная обработка ошибок
 * 
 * Предоставляет единый подход к:
 * - Нормализации ошибок в формат ErrorShape
 * - Логированию ошибок
 * - Отображению ошибок пользователю
 */

import type { ErrorShape } from './error-types';
import { getErrorMessage, sanitizeErrorMessage, ERROR_CATEGORIES } from './error-types';
import { logger } from './logger';
import { useUIStore } from '@/store/ui';

/**
 * Конфигурация обработчика ошибок
 */
export interface ErrorHandlerConfig {
	/**
	 * Показывать ли ошибку пользователю через UI store
	 * @default true
	 */
	showToUser?: boolean;
	/**
	 * Логировать ли ошибку
	 * @default true
	 */
	logError?: boolean;
	/**
	 * Категория для логирования
	 * @default 'ErrorHandler'
	 */
	logCategory?: string;
	/**
	 * Дополнительный контекст для логирования
	 */
	context?: Record<string, unknown>;
	/**
	 * Кастомное сообщение для пользователя (переопределяет автоматическое)
	 */
	userMessage?: string;
}

/**
 * Нормализует любую ошибку в формат ErrorShape
 */
export function normalizeError(error: unknown): ErrorShape {
	// Если уже ErrorShape
	if (error && typeof error === 'object' && 'code' in error && 'message' in error) {
		return error as ErrorShape;
	}

	// Если это Error с кодом (например, IpcError)
	if (error instanceof Error) {
		const errorWithCode = error as Error & { code?: string };
		const code = 'code' in errorWithCode && typeof errorWithCode.code === 'string' 
			? errorWithCode.code 
			: 'UNKNOWN';
		
		return {
			code,
			message: error.message || 'Произошла неизвестная ошибка',
			category: inferCategory(code),
			timestamp: new Date().toISOString(),
			details: {
				name: error.name,
				stack: error.stack,
			},
		};
	}

	// Если это строка
	if (typeof error === 'string') {
		return {
			code: 'UNKNOWN',
			message: error,
			category: ERROR_CATEGORIES.UNEXPECTED,
			timestamp: new Date().toISOString(),
		};
	}

	// Fallback для любых других типов
	return {
		code: 'UNKNOWN',
		message: 'Произошла неизвестная ошибка',
		category: ERROR_CATEGORIES.UNEXPECTED,
		timestamp: new Date().toISOString(),
		details: { originalError: String(error) },
	};
}

/**
 * Определяет категорию ошибки по коду
 */
function inferCategory(code: string): string {
	if (code.includes('VALIDATION')) return ERROR_CATEGORIES.VALIDATION;
	if (code.includes('DB_') || code.includes('DATABASE')) return ERROR_CATEGORIES.DATABASE;
	if (code.includes('BUSINESS') || code.includes('RULE')) return ERROR_CATEGORIES.BUSINESS_RULE;
	if (code.includes('NOT_FOUND')) return ERROR_CATEGORIES.NOT_FOUND;
	if (code.includes('IPC')) return ERROR_CATEGORIES.IPC;
	return ERROR_CATEGORIES.UNEXPECTED;
}

/**
 * Обрабатывает ошибку централизованно
 * 
 * @param error - Ошибка для обработки
 * @param config - Конфигурация обработки
 * @returns Нормализованная ошибка
 */
export function handleError(
	error: unknown,
	config: ErrorHandlerConfig = {}
): ErrorShape {
	const {
		showToUser = true,
		logError = true,
		logCategory = 'ErrorHandler',
		context = {},
		userMessage,
	} = config;

	// Нормализуем ошибку
	const normalizedError = normalizeError(error);

	// Логируем ошибку
	if (logError) {
		const logData: Record<string, unknown> = {
			code: normalizedError.code,
			category: normalizedError.category,
			timestamp: normalizedError.timestamp,
			...context,
		};
		
		// Добавляем details только если это объект
		if (normalizedError.details && typeof normalizedError.details === 'object' && normalizedError.details !== null) {
			Object.assign(logData, normalizedError.details);
		}
		
		logger.error(logCategory, normalizedError.message, logData);
	}

	// Показываем пользователю
	if (showToUser) {
		const message = userMessage || getErrorMessage(normalizedError);
		const sanitizedMessage = sanitizeErrorMessage(message);
		
		// Используем UI store для отображения
		// Внимание: это работает только в контексте React компонента
		// Для использования вне компонентов см. handleErrorSync
		try {
			const { showError } = useUIStore.getState();
			showError(sanitizedMessage);
		} catch (storeError) {
			// Если store недоступен (например, вне React контекста),
			// просто логируем
			logger.warn('ErrorHandler', 'UI store not available, error not shown to user', {
				error: sanitizedMessage,
			});
		}
	}

	return normalizedError;
}

/**
 * Синхронная версия handleError для использования вне React компонентов
 * Не показывает ошибку пользователю автоматически (только логирует)
 */
export function handleErrorSync(
	error: unknown,
	config: Omit<ErrorHandlerConfig, 'showToUser'> = {}
): ErrorShape {
	const {
		logError = true,
		logCategory = 'ErrorHandler',
		context = {},
	} = config;

	// Нормализуем ошибку
	const normalizedError = normalizeError(error);

	// Логируем ошибку
	if (logError) {
		const logData: Record<string, unknown> = {
			code: normalizedError.code,
			category: normalizedError.category,
			timestamp: normalizedError.timestamp,
			...context,
		};
		
		// Добавляем details только если это объект
		if (normalizedError.details && typeof normalizedError.details === 'object' && normalizedError.details !== null) {
			Object.assign(logData, normalizedError.details);
		}
		
		logger.error(logCategory, normalizedError.message, logData);
	}

	return normalizedError;
}

/**
 * Обрабатывает ошибку и показывает её пользователю через UI store
 * Используется в React компонентах
 */
export function showErrorToUser(
	error: unknown,
	config: Omit<ErrorHandlerConfig, 'showToUser'> = {}
): ErrorShape {
	const normalizedError = normalizeError(error);
	const message = config.userMessage || getErrorMessage(normalizedError);
	const sanitizedMessage = sanitizeErrorMessage(message);
	
	const { showError } = useUIStore.getState();
	showError(sanitizedMessage);
	
	if (config.logError !== false) {
		const logData: Record<string, unknown> = {
			code: normalizedError.code,
			category: normalizedError.category,
			...(config.context || {}),
		};
		
		// Добавляем details только если это объект
		if (normalizedError.details && typeof normalizedError.details === 'object' && normalizedError.details !== null) {
			Object.assign(logData, normalizedError.details);
		}
		
		logger.error(config.logCategory || 'ErrorHandler', normalizedError.message, logData);
	}
	
	return normalizedError;
}

