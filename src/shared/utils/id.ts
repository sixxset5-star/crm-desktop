import { createLogger } from '@/shared/lib/logger';

const log = createLogger('ID');

/**
 * Генерирует короткий уникальный ID для UI-элементов
 * Использует crypto.getRandomValues для криптографически стойкой генерации
 * Генерирует ID длиной до 10 символов в base36
 * 
 * @returns Короткий уникальный ID (до 10 символов)
 * 
 * @example
 * const id = generateShortId(); // 'a3k9j2m1p'
 */
export function generateShortId(): string {
	if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
		// Генерируем 8 байт (16 hex символов)
		const array = new Uint8Array(8);
		crypto.getRandomValues(array);
		// Конвертируем в base36 для компактности (как Math.random().toString(36))
		return Array.from(array, byte => byte.toString(36)).join('').slice(0, 10);
	}
	// Fallback для окружений без crypto (не должно происходить в Electron)
	log.warn('crypto.getRandomValues not available, using fallback');
	return Math.random().toString(36).slice(2, 12);
}

/**
 * Генерирует полный UUID v4 для задач
 * Используется в store/board.ts для создания уникальных ID задач
 * Использует crypto.randomUUID или crypto.getRandomValues с fallback
 * 
 * @returns UUID v4 строка
 * 
 * @example
 * const taskId = generateTaskId(); // '550e8400-e29b-41d4-a716-446655440000'
 */
export function generateTaskId(): string {
	if (typeof crypto !== 'undefined' && crypto.randomUUID) {
		return crypto.randomUUID();
	}
	// Fallback с crypto.getRandomValues
	if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
		const array = new Uint8Array(16);
		crypto.getRandomValues(array);
		array[6] = (array[6] & 0x0f) | 0x40; // версия 4
		array[8] = (array[8] & 0x3f) | 0x80; // вариант
		const hex = Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
		return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20, 32)}`;
	}
	// Последний fallback
	log.error('Falling back to non-crypto ID generator');
	const timestamp = Date.now();
	const random = Math.random().toString(36).slice(2, 10);
	const counter = (Math.random() * 0xffffffff) >>> 0;
	return `${timestamp.toString(36)}-${random}-${counter.toString(36).padStart(8, '0')}`;
}







