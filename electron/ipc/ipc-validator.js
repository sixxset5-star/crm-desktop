/**
 * Runtime-валидация IPC payload'ов
 * Проверяет соответствие запросов контракту на стороне main
 * Использует реестр схем из ipc-contract-registry
 */
import { z } from 'zod';
import { createLogger } from '../services/logger.js';
import { DomainError, DOMAIN_ERROR_CODES, createDomainErrorFromZod } from '../domain/errors.js';
import { registerIpcSchema, getIpcSchema, validateIpcResponse } from './ipc-contract-registry.js';

const log = createLogger('IpcValidator');

// Схемы валидации для каждого IPC канала
// Регистрируются в реестр при загрузке модуля
const IPC_SCHEMAS = {
	'tasks:load': {
		request: z.void(),
	},
	'tasks:save': {
		request: z.object({
			tasks: z.array(z.unknown()), // Мягкая транспортная схема - не валидируем вложенные данные
		}),
	},
	'tasks:getAssigneeHistory': {
		request: z.object({
			taskId: z.string().min(1),
		}),
	},
	'tasks:getContractorAssigneeHistory': {
		request: z.object({
			contractorId: z.string().min(1),
		}),
	},
	'customers:load': {
		request: z.void(),
	},
	'customers:save': {
		request: z.object({
			customers: z.array(z.unknown()), // Мягкая транспортная схема - не валидируем вложенные данные
		}),
	},
	'contractors:load': {
		request: z.void(),
	},
	'contractors:save': {
		request: z.object({
			contractors: z.array(z.unknown()), // Мягкая транспортная схема - не валидируем вложенные данные
		}),
	},
	'contractors:deactivate': {
		request: z.object({
			id: z.string().min(1),
		}),
	},
	'contractors:delete': {
		request: z.object({
			id: z.string().min(1),
		}),
	},
	'goals:load': {
		request: z.void(),
	},
	'goals:save': {
		request: z.object({
			goals: z.array(z.any()),
			monthlyFinancialGoals: z.array(z.any()),
			credits: z.array(z.any()).optional(),
		}),
	},
	'settings:load': {
		request: z.void(),
	},
	'settings:save': {
		request: z.object({
			settings: z.any(),
		}),
	},
	'calculations:load': {
		request: z.void(),
	},
	'calculations:save': {
		request: z.object({
			calculations: z.array(z.any()),
		}),
	},
	'taxes:load': {
		request: z.void(),
	},
	'taxes:save': {
		request: z.object({
			taxes: z.array(z.any()),
		}),
	},
	'incomes:load': {
		request: z.void(),
	},
	'incomes:save': {
		request: z.object({
			incomes: z.array(z.any()),
		}),
	},
	'extra-work:load': {
		request: z.void(),
	},
	'extra-work:save': {
		request: z.object({
			extraWorks: z.array(z.any()),
		}),
	},
	'avatar:select': {
		request: z.void(),
	},
	'files:select': {
		request: z.void(),
	},
	'files:getTaskDir': {
		request: z.object({
			taskId: z.string().min(1),
		}),
	},
	'files:copy': {
		request: z.object({
			sourcePath: z.string().min(1),
			destPath: z.string().min(1),
		}),
	},
	'files:getSize': {
		request: z.object({
			filePath: z.string().min(1),
		}),
	},
	'files:open': {
		request: z.object({
			filePath: z.string().min(1),
		}),
	},
	'files:download': {
		request: z.object({
			sourcePath: z.string().min(1),
			defaultFileName: z.string().optional(),
		}),
	},
	'files:rename': {
		request: z.object({
			filePath: z.string().min(1),
			newFileName: z.string().min(1),
		}),
	},
	'avatars:syncCustomers': {
		request: z.void(),
	},
	'avatars:syncContractors': {
		request: z.void(),
	},
	'avatars:syncAll': {
		request: z.void(),
	},
	'avatars:getChatId': {
		request: z.void(),
	},
	'csv:select': {
		request: z.void(),
	},
	'csv:read': {
		request: z.object({
			filePath: z.string().min(1),
		}),
	},
	'csv:save': {
		request: z.object({
			content: z.string(),
			defaultFileName: z.string().optional(),
		}),
	},
	'url:openExternal': {
		request: z.object({
			url: z.string().url(),
		}),
	},
	'database:open': {
		request: z.void(),
	},
	'database:getPath': {
		request: z.void(),
	},
	'notification:show': {
		request: z.object({
			title: z.string().min(1),
			body: z.string(),
		}),
	},
	'updates:check': {
		request: z.void(),
	},
	'updates:install': {
		request: z.void(),
	},
};

/**
 * Инициализировать схемы в реестре
 * Вызывается при загрузке IPC модулей
 */
export function initIpcSchemas() {
	for (const [channel, schema] of Object.entries(IPC_SCHEMAS)) {
		registerIpcSchema(channel, schema.request, schema.response);
	}
	log.info('IPC schemas initialized', { count: Object.keys(IPC_SCHEMAS).length });
}

/**
 * Валидировать IPC запрос
 * @param {string} channel - IPC канал
 * @param {*} payload - Данные запроса
 * @returns {object} Валидированные данные
 * @throws {DomainError} Если валидация не прошла
 */
export function validateIpcRequest(channel, payload) {
	// Сначала пытаемся получить из реестра
	let schema = getIpcSchema(channel);
	
	// Если в реестре нет, используем IPC_SCHEMAS (fallback)
	if (!schema) {
		const fallbackSchema = IPC_SCHEMAS[channel];
		if (fallbackSchema) {
			schema = fallbackSchema;
		}
	}
	
	if (!schema) {
		log.error('Unknown IPC channel or missing schema', { channel });
		throw new DomainError(
			DOMAIN_ERROR_CODES.UNKNOWN,
			`Unknown IPC channel or missing schema: ${channel}`
		);
	}

	try {
		// Определяем, откуда пришла схема (реестр или fallback)
		const requestSchema = schema.request || schema;
		
		// Для void запросов проверяем, что payload пустой
		if (requestSchema === z.void()) {
			if (payload !== undefined && payload !== null) {
				throw new DomainError(
					DOMAIN_ERROR_CODES.VALIDATION_FAILED,
					`Channel ${channel} expects no payload`
				);
			}
			return undefined;
		}

		// Валидируем через Zod
		const result = requestSchema.parse(payload);
		return result;
	} catch (error) {
		// Ловим ТОЛЬКО ZodError от транспортной схемы (request schema)
		// НЕ ловим ZodError от domain-схем (они должны обрабатываться в domain-сервисах)
		const isTransportZodError = error instanceof z.ZodError;
		
		log.debug('validateIpcRequest caught error', { 
			channel, 
			errorType: error?.constructor?.name,
			errorName: error?.name,
			isTransportZodError: isTransportZodError,
			hasIssues: !!error?.issues,
			errorMessage: error?.message
		});
		
		if (isTransportZodError) {
			// Это ошибка транспортной схемы (request payload structure)
			const issues = error.issues || [];
			log.warn('IPC request transport validation failed', { channel, issues });
			throw createDomainErrorFromZod(error, `IPC ${channel} transport`);
		}
		// Если это уже DomainError, пробрасываем как есть
		if (error && error.name === 'DomainError') {
			throw error;
		}
		// Для остальных ошибок создаем DomainError
		throw new DomainError(
			DOMAIN_ERROR_CODES.VALIDATION_FAILED,
			`IPC ${channel} validation failed: ${error?.message || 'Unknown error'}`,
			{ originalError: error?.message }
		);
	}
}

/**
 * Обёртка для IPC handler с автоматической валидацией
 * Валидирует request и response
 * @param {string} channel - IPC канал
 * @param {Function} handler - Обработчик
 * @returns {Function} Обёрнутый обработчик
 */
export function withIpcValidation(channel, handler) {
	return async (event, payload) => {
		const requestId = log.generateRequestId();
		const startTime = Date.now();
		
		try {
			// Валидируем запрос
			const validatedPayload = validateIpcRequest(channel, payload);
			
			log.debug('IPC request validated', { channel, requestId });
			
			// Вызываем handler с валидированными данными
			const result = await handler(event, validatedPayload);
			
			// Валидируем response (если схема зарегистрирована)
			const validatedResponse = validateIpcResponse(channel, result);
			
			const duration = Date.now() - startTime;
			log.info('IPC request completed', { 
				channel, 
				duration_ms: duration,
				requestId 
			});
			
			return validatedResponse;
		} catch (error) {
			const duration = Date.now() - startTime;
			log.error('IPC request failed', { 
				channel, 
				error: error.message,
				duration_ms: duration,
				requestId 
			});
			throw error;
		}
	};
}

