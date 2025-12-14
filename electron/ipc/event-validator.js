/**
 * Валидация IPC событий (push-уведомления)
 * Проверяет payload событий через Zod схемы
 */
import { z } from 'zod';
import { createLogger } from '../services/logger.js';

const log = createLogger('EventValidator');

// Схемы валидации для событий
const EVENT_SCHEMAS = {
	'updates:available': z.object({
		version: z.string().optional(),
		releaseDate: z.string().optional(),
	}),
	'updates:download-progress': z.object({
		percent: z.number().min(0).max(100),
		transferred: z.number(),
		total: z.number(),
	}),
	'updates:ready': z.object({
		version: z.string().optional(),
		releaseDate: z.string().optional(),
	}),
	'updates:none': z.object({
		version: z.string().nullable(),
	}),
	'ui:banner': z.object({
		type: z.enum(['info', 'success', 'error', 'warning']),
		message: z.string(),
	}),
};

/**
 * Валидировать payload события
 * @param {string} channel - Канал события
 * @param {*} payload - Данные события
 * @returns {*} Валидированные данные
 */
export function validateEventPayload(channel, payload) {
	const schema = EVENT_SCHEMAS[channel];
	
	if (!schema) {
		log.warn('No validation schema for event', { channel });
		return payload; // Если схемы нет, возвращаем как есть
	}

	try {
		return schema.parse(payload);
	} catch (error) {
		if (error instanceof z.ZodError) {
			log.error('Event payload validation failed', { 
				channel, 
				errors: error.errors,
				payload 
			});
			// Не бросаем ошибку, только логируем (чтобы не ломать работу)
			return payload;
		}
		throw error;
	}
}

/**
 * Обёртка для отправки события с валидацией
 * Используется в main процессе перед отправкой в renderer
 */
export function emitValidatedEvent(webContents, channel, payload) {
	try {
		const validatedPayload = validateEventPayload(channel, payload);
		webContents.send(channel, validatedPayload);
		log.debug('Event emitted', { channel });
	} catch (error) {
		log.error('Failed to emit event', { channel, error: error.message });
	}
}





