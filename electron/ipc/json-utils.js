/**
 * Утилиты для безопасного парсинга JSON в IPC handlers
 */

/**
 * Безопасно парсит JSON строку с валидацией типа результата
 * @param {string | null | undefined} value - JSON строка для парсинга
 * @param {any} fallback - значение по умолчанию при ошибке
 * @param {string} expectedType - ожидаемый тип ('array', 'object', 'any')
 * @returns {any} распарсенное значение или fallback
 */
export function safeJsonParse(value, fallback, expectedType = 'any') {
	if (!value) return fallback;
	
	// Обрабатываем специальные случаи
	if (value === 'null' || value === 'undefined') {
		return fallback;
	}
	
	try {
		const parsed = JSON.parse(value);
		
		// Валидация типа результата
		if (expectedType === 'array' && !Array.isArray(parsed)) {
			console.error('[JSON] Expected array, got:', typeof parsed, 'Value:', value?.substring(0, 100));
			return fallback;
		}
		
		if (expectedType === 'object' && (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed))) {
			console.error('[JSON] Expected object, got:', typeof parsed, 'Value:', value?.substring(0, 100));
			return fallback;
		}
		
		return parsed;
	} catch (e) {
		console.error('[JSON] Failed to parse field:', e.message, 'Value:', value?.substring(0, 100));
		return fallback;
	}
}

