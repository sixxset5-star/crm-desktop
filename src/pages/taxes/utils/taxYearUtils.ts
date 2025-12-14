/**
 * Утилиты для работы с налоговыми годами
 * Налоговый год: с 3 декабря текущего года по 2 декабря следующего года
 */

/**
 * Получает ключ налогового года по дате
 * @param date - дата в формате строки (опционально)
 * @returns ключ года в формате 'YYYY-12-03'
 */
export function getTaxYearKeyByDate(date?: string): string {
	const now = date ? new Date(date) : new Date();
	const y = now.getFullYear();
	const dec3ThisYear = new Date(y, 11, 3); // 3 декабря текущего года
	return now >= dec3ThisYear ? `${y}-12-03` : `${y - 1}-12-03`;
}

/**
 * Получает текущий налоговый год
 * @returns ключ года в формате 'YYYY-12-03'
 */
export function getCurrentTaxYearKey(): string {
	const today = new Date();
	const y = today.getFullYear();
	const dec3 = new Date(y, 11, 3);
	return today >= dec3 ? `${y}-12-03` : `${y - 1}-12-03`;
}

/**
 * Форматирует метку налогового года для отображения
 * @param yearKey - ключ года в формате 'YYYY-12-03'
 * @returns строка вида '03.12.2024 — 02.12.2025'
 */
export function formatTaxYearLabel(yearKey: string): string {
	const start = new Date(yearKey);
	const end = new Date(start.getFullYear() + 1, 11, 2); // 2 декабря следующего года
	const fmt = (d: Date) => d.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' });
	return `${fmt(start)} — ${fmt(end)}`;
}

/**
 * Получает список доступных налоговых годов из производных данных
 * @param derived - массив производных налогов
 * @param currentYearKey - текущий налоговый год
 * @returns отсортированный массив ключей годов (от новых к старым)
 */
export function getAvailableTaxYears(derived: Array<{ yearKey: string }>, currentYearKey: string): string[] {
	const set = new Set<string>([currentYearKey]);
	derived.forEach((r) => set.add(r.yearKey));
	return Array.from(set).sort((a, b) => new Date(b).getTime() - new Date(a).getTime());
}

