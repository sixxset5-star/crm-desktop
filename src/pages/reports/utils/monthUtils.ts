export type MonthKey = { year: number; month: number; label: string };

export function getMonths(count: number): MonthKey[] {
	const months: MonthKey[] = [];
	const now = new Date();
	for (let i = count - 1; i >= 0; i--) {
		const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
		months.push({
			year: d.getFullYear(),
			month: d.getMonth(),
			label: d.toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' }),
		});
	}
	return months;
}






