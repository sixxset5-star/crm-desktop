/**
 * Утилиты для расчета статистики подрядчиков
 */

import type { Contractor } from '@/types';
import type { Task } from '@/types';

export type ContractorStats = {
	tasksCount: number;
	completedTasksCount: number;
	totalExpenses: number;
	totalProfitOrLoss: number;
	totalEarned?: number; // Общая сумма от всех задач (amount)
	monthlyExpenses?: Map<string, number>;
	tasksByMonth?: Map<string, number>;
};

/**
 * Вычисляет статистику по подрядчикам на основе их задач
 * @param contractors - список подрядчиков
 * @param tasks - список задач
 * @returns Map с ID подрядчика в качестве ключа и статистикой в качестве значения
 */
export function calculateContractorStats(
	contractors: Contractor[],
	tasks: Task[]
): Map<string, ContractorStats> {
	const stats = new Map<string, ContractorStats>();
	
	// Инициализируем статистику для всех подрядчиков
	contractors.forEach((c) => {
		stats.set(c.id, { 
			tasksCount: 0, 
			completedTasksCount: 0, 
			totalExpenses: 0, 
			totalProfitOrLoss: 0,
			totalEarned: 0,
			monthlyExpenses: new Map(),
			tasksByMonth: new Map()
		});
	});
	
	// Собираем статистику из задач
	tasks.forEach((t) => {
		// Статистика по задачам, где подрядчик - исполнитель
		if (t.contractorId) {
			const stat = stats.get(t.contractorId);
			if (stat) {
				stat.tasksCount += 1;
				
				// Завершенные задачи
				if (['completed', 'closed'].includes(t.columnId)) {
					stat.completedTasksCount += 1;
				}
				
				// Сумма всех задач, где подрядчик исполнитель
				const amount = t.amount || 0;
				stat.totalEarned = (stat.totalEarned || 0) + amount;
				
				// Задачи по месяцам (по дате создания или deadline)
				if (t.createdAt) {
					const monthKey = t.createdAt.substring(0, 7); // YYYY-MM
					const current = stat.tasksByMonth?.get(monthKey) || 0;
					stat.tasksByMonth?.set(monthKey, current + 1);
				}
			}
		}
		
		// Статистика по расходам, где подрядчик указан в expense
		if (t.expensesEntries && Array.isArray(t.expensesEntries)) {
			t.expensesEntries.forEach(expense => {
				if (expense.contractorId) {
					const stat = stats.get(expense.contractorId);
					if (stat) {
						stat.totalExpenses += expense.amount || 0;
						
						// Месячные расходы
						if (expense.date) {
							const monthKey = expense.date.substring(0, 7); // YYYY-MM
							const current = stat.monthlyExpenses?.get(monthKey) || 0;
							stat.monthlyExpenses?.set(monthKey, current + (expense.amount || 0));
						} else if (t.createdAt) {
							// Если даты расхода нет, используем дату создания задачи
							const monthKey = t.createdAt.substring(0, 7);
							const current = stat.monthlyExpenses?.get(monthKey) || 0;
							stat.monthlyExpenses?.set(monthKey, current + (expense.amount || 0));
						}
					}
				}
			});
		}
	});
	
	// Вычисляем прибыль/убыток: сумма всех задач минус выплаты этому подрядчику
	stats.forEach((stat) => {
		stat.totalProfitOrLoss = (stat.totalEarned || 0) - stat.totalExpenses;
	});
	
	return stats;
}


