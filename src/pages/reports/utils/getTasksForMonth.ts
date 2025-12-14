import type { Task } from '@/types';
import type { Customer } from '@/types';
import type { MonthKey } from './monthUtils';

export type TaskForMonth = {
	id: string;
	title: string;
	customer?: string;
	customerAvatar?: string;
	income: number;
	deadline?: string;
	payments: { amount: number; date: string }[];
};

export function getTasksForMonth(
	month: MonthKey,
	tasks: Task[],
	customers: Customer[]
): TaskForMonth[] {
	const monthTasks = tasks.filter((t) => {
		// Используем deadline для определения месяца задачи (независимо от статуса)
		if (!t.deadline || !t.deadline.trim()) return false;
		
		const deadlineDate = new Date(t.deadline);
		// Проверяем валидность даты
		if (isNaN(deadlineDate.getTime())) return false;
		
		// Используем UTC методы для избежания проблем с таймзонами
		// Извлекаем только дату (без времени) из строки дедлайна
		const deadlineStr = t.deadline.trim();
		// Парсим дату: может быть "2024-12-30" или "2024-12-30T00:00:00.000Z"
		const dateMatch = deadlineStr.match(/^(\d{4})-(\d{2})-(\d{2})/);
		if (!dateMatch) return false;
		
		const deadlineYear = parseInt(dateMatch[1], 10);
		const deadlineMonth = parseInt(dateMatch[2], 10) - 1; // Месяцы в JS: 0-11
		const deadlineDay = parseInt(dateMatch[3], 10);
		
		// Проверяем, попадает ли дедлайн в выбранный месяц
		return deadlineYear === month.year && deadlineMonth === month.month;
	});

	// Фильтруем платежи по месяцу (используем ту же логику парсинга дат)
	const paymentsByTask: Record<string, { amount: number; date: string }[]> = {};
	tasks.forEach((t) => {
		if (t.subtasks && t.subtasks.length > 0) {
			t.subtasks.forEach((s) => {
				if (s.amount && s.date) {
					const dateStr = s.date.trim();
					const dateMatch = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})/);
					if (dateMatch) {
						const paymentYear = parseInt(dateMatch[1], 10);
						const paymentMonth = parseInt(dateMatch[2], 10) - 1;
						if (paymentYear === month.year && paymentMonth === month.month) {
							(paymentsByTask[t.id] ||= []).push({ amount: s.amount || 0, date: s.date! });
						}
					}
				}
			});
		} else if (t.payments && t.payments.length > 0) {
			t.payments.forEach((p) => {
				if (p.date) {
					const dateStr = p.date.trim();
					const dateMatch = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})/);
					if (dateMatch) {
						const paymentYear = parseInt(dateMatch[1], 10);
						const paymentMonth = parseInt(dateMatch[2], 10) - 1;
						if (paymentYear === month.year && paymentMonth === month.month) {
							(paymentsByTask[t.id] ||= []).push({ amount: p.amount || 0, date: p.date });
						}
					}
				}
			});
		}
	});

	return monthTasks.map((t) => {
		const customer = customers.find((c) => c.id === t.customerId);
		return {
			id: t.id,
			title: t.title || '(без названия)',
			customer: customer?.name,
			customerAvatar: customer?.avatar,
			income: (t.amount || 0),
			deadline: t.deadline,
			payments: paymentsByTask[t.id] || [],
		};
	});
}






