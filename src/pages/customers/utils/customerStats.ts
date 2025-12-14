/**
 * Утилиты для расчета статистики заказчиков
 */

import type { Customer } from '@/store/customers';
import type { Task } from '@/types';

export type CustomerStats = {
	tasks: number;
	totalAmount: number;
	paidAmount: number;
	remaining: number;
	expenses: number;
	profit: number;
};

/**
 * Вычисляет статистику по заказчикам на основе их задач
 * Собирает данные о количестве задач, суммах, оплатах, расходах и прибыли
 * 
 * @param customers - Список заказчиков
 * @param tasks - Список задач
 * @returns Map с ключом ID заказчика и значением CustomerStats
 * 
 * @example
 * const stats = calculateCustomerStats(customers, tasks);
 * const customerStats = stats.get(customerId);
 * console.log(customerStats.totalAmount); // Общая сумма задач
 * console.log(customerStats.profit); // Прибыль
 */
export function calculateCustomerStats(
	customers: Customer[],
	tasks: Task[]
): Map<string, CustomerStats> {
	const stats = new Map<string, CustomerStats>();
	
	// Инициализируем статистику для всех заказчиков
	customers.forEach((c) => {
		stats.set(c.id, { 
			tasks: 0, 
			totalAmount: 0, 
			paidAmount: 0, 
			remaining: 0, 
			expenses: 0, 
			profit: 0 
		});
	});
	
	// Собираем статистику из задач
	tasks.forEach((t) => {
		if (t.customerId) {
			const stat = stats.get(t.customerId);
			if (stat) {
				stat.tasks += 1;
				stat.totalAmount += t.amount || 0;
				stat.paidAmount += t.paidAmount || 0;
				stat.remaining += (t.amount || 0) - (t.paidAmount || 0);
				stat.expenses += t.expenses || 0;
				stat.profit += (t.amount || 0) - (t.expenses || 0);
			}
		}
	});
	
	return stats;
}






