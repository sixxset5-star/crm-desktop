/**
 * Утилита для чтения CSS токенов (CSS custom properties)
 * Единый источник истины - tokens.css
 */

/**
 * Читает значение CSS токена и возвращает его как число
 * @param tokenName - имя CSS переменной (например, '--icon-size-md')
 * @param fallback - значение по умолчанию, если токен не найден
 * @returns числовое значение токена
 */
export function getToken(tokenName: string, fallback: number): number {
	if (typeof window === 'undefined') return fallback;
	const value = getComputedStyle(document.documentElement).getPropertyValue(tokenName).trim();
	if (!value) return fallback;
	// Убираем 'px' если есть, используем parseFloat для поддержки десятичных значений
	const numValue = parseFloat(value.replace('px', ''));
	return isNaN(numValue) ? fallback : numValue;
}

/**
 * Читает значение CSS токена и возвращает его как строку
 * @param tokenName - имя CSS переменной (например, '--accent')
 * @param fallback - значение по умолчанию, если токен не найден
 * @returns строковое значение токена
 */
export function getTokenString(tokenName: string, fallback: string): string {
	if (typeof window === 'undefined') return fallback;
	const value = getComputedStyle(document.documentElement).getPropertyValue(tokenName).trim();
	return value || fallback;
}



