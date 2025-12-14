/**
 * Утилиты для форматирования данных калькулятора
 */

/**
 * Форматирует число как валюту в рублях
 */
export function formatCurrency(amount: number): string {
	return new Intl.NumberFormat('ru-RU', {
		style: 'currency',
		currency: 'RUB',
		minimumFractionDigits: 0,
		maximumFractionDigits: 0,
	}).format(amount);
}

/**
 * Форматирует описание округления
 */
export function formatRoundingLabel(rounding: 1000 | 5000 | 10000 | null): string {
	if (rounding === null) return 'Без округления';
	if (rounding === 1000) return 'До 1 000 ₽';
	if (rounding === 5000) return 'До 5 000 ₽';
	if (rounding === 10000) return 'До 10 000 ₽';
	return 'Без округления';
}






