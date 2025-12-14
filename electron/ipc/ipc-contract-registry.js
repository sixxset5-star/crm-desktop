/**
 * Реестр IPC контракта
 * Обеспечивает связку контракт → схема → handler
 * Проверяет целостность при загрузке
 */
import { z } from 'zod';
import { createLogger } from '../services/logger.js';

const log = createLogger('IpcContractRegistry');

// Реестр всех каналов контракта
// Должен совпадать с ipc-contract-v2.ts
export const IPC_CONTRACT_CHANNELS = [
	'tasks:load',
	'tasks:save',
	'tasks:getAssigneeHistory',
	'tasks:getContractorAssigneeHistory',
	'customers:load',
	'customers:save',
	'goals:load',
	'goals:save',
	'credits:load',
	'credits:save',
	'credits:buildSchedule',
	'credits:rebuildSchedule',
	'credits:applyPayment',
	'credits:delete',
	'credits:calculatePayment',
	'credits:calculateTerm',
	'credits:calculateAmount',
	'credits:getUpcomingPayments',
	'credits:findNeedingMigration',
	'credits:migrate',
	'credits:migrateAll',
	'settings:load',
	'settings:save',
	'calculations:load',
	'calculations:save',
	'taxes:load',
	'taxes:save',
	'incomes:load',
	'incomes:save',
	'extra-work:load',
	'extra-work:save',
	'avatar:select',
	'files:select',
	'files:getTaskDir',
	'files:copy',
	'files:getSize',
	'files:open',
	'files:download',
	'files:rename',
	'csv:select',
	'csv:read',
	'csv:save',
	'url:openExternal',
	'database:open',
	'database:getPath',
	'notification:show',
	'updates:check',
	'updates:install',
	'ipc:handshake',
];

// Реестр схем валидации (должен покрывать все каналы)
const SCHEMA_REGISTRY = new Map();

/**
 * Зарегистрировать схему для канала
 * @param {string} channel - IPC канал
 * @param {z.ZodType} requestSchema - Схема валидации запроса
 * @param {z.ZodType} responseSchema - Схема валидации ответа (опционально)
 */
export function registerIpcSchema(channel, requestSchema, responseSchema = null) {
	if (!IPC_CONTRACT_CHANNELS.includes(channel)) {
		log.warn('Registering schema for unknown channel', { channel });
	}
	
	SCHEMA_REGISTRY.set(channel, {
		request: requestSchema,
		response: responseSchema,
	});
	
	log.debug('IPC schema registered', { channel, hasResponse: !!responseSchema });
}

/**
 * Получить схему для канала
 */
export function getIpcSchema(channel) {
	return SCHEMA_REGISTRY.get(channel);
}

/**
 * Проверить, что все каналы контракта имеют схемы
 * Выбрасывает ошибку, если есть каналы без схем
 */
export function validateContractCompleteness() {
	const missingSchemas = [];
	
	for (const channel of IPC_CONTRACT_CHANNELS) {
		if (!SCHEMA_REGISTRY.has(channel)) {
			missingSchemas.push(channel);
		}
	}
	
	if (missingSchemas.length > 0) {
		const error = new Error(
			`IPC contract incomplete: missing schemas for ${missingSchemas.length} channels: ${missingSchemas.join(', ')}`
		);
		log.error('IPC contract validation failed', { missingSchemas });
		throw error;
	}
	
	log.info('IPC contract validation passed', { 
		totalChannels: IPC_CONTRACT_CHANNELS.length,
		registeredSchemas: SCHEMA_REGISTRY.size 
	});
}

/**
 * Валидировать response по схеме (если она зарегистрирована)
 */
export function validateIpcResponse(channel, response) {
	const schema = SCHEMA_REGISTRY.get(channel);
	
	if (!schema || !schema.response) {
		// Схема ответа не обязательна
		return response;
	}
	
	try {
		return schema.response.parse(response);
	} catch (error) {
		if (error instanceof z.ZodError) {
			log.error('IPC response validation failed', { 
				channel, 
				errors: error.errors 
			});
			// Не бросаем ошибку, только логируем (чтобы не ломать работу)
			return response;
		}
		throw error;
	}
}



