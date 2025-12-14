/**
 * Утилиты для работы с месяцами
 */

export function getMonthLabel(monthKey: string): string {
	const [year, month] = monthKey.split('-').map(Number);
	const date = new Date(year, month - 1, 1);
	return date.toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' });
}

export function getCurrentMonthKey(): string {
	const now = new Date();
	return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

export function getAvailableMonths(count: number = 12): string[] {
	const months: string[] = [];
	const now = new Date();
	for (let i = 0; i < count; i++) {
		const date = new Date(now.getFullYear(), now.getMonth() + i, 1);
		const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
		months.push(monthKey);
	}
	return months;
}






