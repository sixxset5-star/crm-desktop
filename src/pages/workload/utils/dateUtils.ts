/**
 * Утилиты для работы с датами
 */

/**
 * Получает все дни месяца
 */
export function getDaysInMonth(year: number, month: number): Date[] {
	const first = new Date(year, month, 1);
	const last = new Date(year, month + 1, 0);
	return Array.from({ length: last.getDate() }, (_, i) => new Date(year, month, i + 1));
}

/**
 * Получает начало недели (понедельник) для указанной даты
 */
export function getWeekStart(date: Date): Date {
	const d = new Date(date);
	const day = d.getDay(); // 0=воскресенье, 1=понедельник, ..., 6=суббота
	// Преобразуем воскресенье (0) в 7, чтобы неделя начиналась с понедельника
	const dayOfWeek = day === 0 ? 7 : day;
	// Вычисляем разницу до понедельника (день 1)
	const diff = d.getDate() - dayOfWeek + 1;
	return new Date(d.setDate(diff));
}






