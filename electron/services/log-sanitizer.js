/**
 * Sanitizer для логов
 * Удаляет чувствительные данные перед записью в лог
 */

// Ключи, которые содержат чувствительные данные
const SENSITIVE_KEYS = [
	'password',
	'token',
	'secret',
	'apiKey',
	'api_key',
	'accessToken',
	'access_token',
	'refreshToken',
	'refresh_token',
	'auth',
	'authorization',
	'phone',
	'telephone',
	'email',
	'emailAddress',
	'creditCard',
	'credit_card',
	'cardNumber',
	'card_number',
	'ssn',
	'socialSecurityNumber',
];

// Значение для маскировки
const MASK = '******';

/**
 * Проверить, является ли ключ чувствительным
 */
function isSensitiveKey(key) {
	const lowerKey = key.toLowerCase();
	return SENSITIVE_KEYS.some(sensitive => lowerKey.includes(sensitive));
}

/**
 * Рекурсивно санитизировать объект
 */
function sanitizeValue(value, depth = 0) {
	// Ограничиваем глубину рекурсии
	if (depth > 10) {
		return '[Max depth reached]';
	}

	// null/undefined
	if (value === null || value === undefined) {
		return value;
	}

	// Примитивы
	if (typeof value !== 'object') {
		return value;
	}

	// Массивы
	if (Array.isArray(value)) {
		return value.map(item => sanitizeValue(item, depth + 1));
	}

	// Объекты
	const sanitized = {};
	for (const [key, val] of Object.entries(value)) {
		if (isSensitiveKey(key)) {
			sanitized[key] = MASK;
		} else if (typeof val === 'object' && val !== null) {
			sanitized[key] = sanitizeValue(val, depth + 1);
		} else {
			sanitized[key] = val;
		}
	}

	return sanitized;
}

/**
 * Санитизировать данные для логирования
 * @param {*} data - Данные для санитизации
 * @returns {*} Санитизированные данные
 */
export function sanitizeLogData(data) {
	if (data === null || data === undefined) {
		return data;
	}

	// Если это строка, проверяем на наличие чувствительных паттернов
	if (typeof data === 'string') {
		// Простая проверка на email/phone в строках
		if (data.includes('@') && data.includes('.')) {
			return MASK; // Возможно email
		}
		if (/\+?\d{10,}/.test(data)) {
			return MASK; // Возможно телефон
		}
		return data;
	}

	// Для объектов рекурсивно санитизируем
	return sanitizeValue(data);
}

/**
 * Санитизировать сообщение лога
 * Удаляет чувствительные данные из строки сообщения
 */
export function sanitizeLogMessage(message) {
	if (typeof message !== 'string') {
		return message;
	}

	// Маскируем email
	message = message.replace(/[\w.-]+@[\w.-]+\.\w+/g, MASK);
	
	// Маскируем телефоны (различные форматы)
	message = message.replace(/\+?\d[\d\s\-()]{8,}\d/g, MASK);
	
	// Маскируем токены (длинные строки из букв и цифр)
	message = message.replace(/[A-Za-z0-9]{32,}/g, (match) => {
		// Если это похоже на токен (длинная строка), маскируем
		if (match.length >= 32) {
			return MASK;
		}
		return match;
	});

	return message;
}





