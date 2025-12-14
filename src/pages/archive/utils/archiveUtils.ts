/**
 * Утилиты для страницы Archive
 * Логика работы с архивными данными
 */

import { type Task } from '@/store/board';
import { type Income } from '@/store/income';
import { getTaskPaymentInfo } from '@/domain/task';
import { HOUR_END_OF_DAY, MINUTE_END_OF_HOUR, SECOND_END_OF_MINUTE } from '@/shared/constants/numeric-constants';

/**
 * Форматирует ключ месяца в читаемый формат
 * @param monthKey - ключ месяца в формате 'YYYY-MM'
 * @returns отформатированная строка (например, "январь 2024")
 */
export function getMonthLabel(monthKey: string): string {
	const [year, month] = monthKey.split('-').map(Number);
	const date = new Date(year, month - 1, 1);
	return date.toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' });
}

/**
 * Получает начало текущего месяца
 */
export function getCurrentMonthStart(): Date {
	const today = new Date();
	return new Date(today.getFullYear(), today.getMonth(), 1);
}

/**
 * Создает ключ месяца из даты
 * @param date - дата
 * @returns ключ месяца в формате 'YYYY-MM'
 */
export function getMonthKey(date: Date): string {
	return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

/**
 * Получает список месяцев с архивными задачами (по последнему платежу)
 */
export function getArchivedTaskMonths(tasks: Task[]): string[] {
	const currentMonthStart = getCurrentMonthStart();
	const months = new Set<string>();

	tasks.forEach((t) => {
		// Задачи на паузе никогда не попадают в архив
		if (t.columnId === 'paused') return;
		// Для задач на паузе используем исходный статус
		const effectiveColumnId = t.columnId === 'paused' && t.pausedFromColumnId ? t.pausedFromColumnId : t.columnId;
		// В архив попадают только задачи из колонки "закрыт"
		if (effectiveColumnId !== 'closed') return;
		const { isFullyPaid, lastPaymentDate } = getTaskPaymentInfo(t);
		if (!isFullyPaid || !lastPaymentDate) return;

		// В архив попадают только задачи, у которых последний платёж был до текущего месяца
		const lp = new Date(lastPaymentDate.getFullYear(), lastPaymentDate.getMonth(), 1);
		if (lp < currentMonthStart) {
			months.add(getMonthKey(lastPaymentDate));
		}
	});

	return Array.from(months).sort().reverse();
}

/**
 * Получает список месяцев с архивными доп. доходами
 */
export function getArchivedIncomeMonths(incomes: Income[]): string[] {
	const currentMonthStart = getCurrentMonthStart();
	const months = new Set<string>();

	incomes.forEach((inc) => {
		if (!inc.date) return;
		const d = new Date(inc.date);
		d.setHours(0, 0, 0, 0);
		if (d < currentMonthStart) {
			months.add(getMonthKey(d));
		}
	});

	return Array.from(months).sort().reverse();
}

/**
 * Получает задачи для выбранного месяца (по месяцу последнего платежа)
 * Сортирует по дате последнего платежа (новые сверху)
 */
export function getArchivedTasksForMonth(tasks: Task[], monthKey: string): Task[] {
	if (!monthKey) return [];

	const [year, month] = monthKey.split('-').map(Number);
	const monthStart = new Date(year, month - 1, 1);
	const monthEnd = new Date(year, month, 0, HOUR_END_OF_DAY, MINUTE_END_OF_HOUR, SECOND_END_OF_MINUTE);

	const filtered = tasks.filter((t) => {
		// Задачи на паузе никогда не попадают в архив
		if (t.columnId === 'paused') return false;
		// Для задач на паузе используем исходный статус
		const effectiveColumnId = t.columnId === 'paused' && t.pausedFromColumnId ? t.pausedFromColumnId : t.columnId;
		// В архив попадают только задачи из колонки "закрыт"
		if (effectiveColumnId !== 'closed') return false;
		const { isFullyPaid, lastPaymentDate } = getTaskPaymentInfo(t);
		if (!isFullyPaid || !lastPaymentDate) return false;

		return lastPaymentDate >= monthStart && lastPaymentDate <= monthEnd;
	});

	// Сортируем по дате последнего платежа (новые сверху)
	return filtered.sort((a, b) => {
		const aInfo = getTaskPaymentInfo(a);
		const bInfo = getTaskPaymentInfo(b);
		const aDate = aInfo.lastPaymentDate?.getTime() || 0;
		const bDate = bInfo.lastPaymentDate?.getTime() || 0;
		return bDate - aDate; // По убыванию (новые сверху)
	});
}

/**
 * Получает доп. доходы для выбранного месяца
 * Сортирует по дате (новые сверху)
 */
export function getArchivedIncomesForMonth(incomes: Income[], monthKey: string): Income[] {
	if (!monthKey) return [];

	const [year, month] = monthKey.split('-').map(Number);
	const monthStart = new Date(year, month - 1, 1);
	const monthEnd = new Date(year, month, 0, HOUR_END_OF_DAY, MINUTE_END_OF_HOUR, SECOND_END_OF_MINUTE);

	const filtered = incomes.filter((inc) => {
		if (!inc.date) return false;
		const d = new Date(inc.date);
		return d >= monthStart && d <= monthEnd;
	});

	// Сортируем по дате (новые сверху)
	return filtered.sort((a, b) => {
		const aDate = a.date ? new Date(a.date).getTime() : 0;
		const bDate = b.date ? new Date(b.date).getTime() : 0;
		return bDate - aDate; // По убыванию (новые сверху)
	});
}

