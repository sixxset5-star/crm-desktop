import type { Task } from '@/types';
import type { Income } from '@/store/income';
import type { MonthlyFinancialGoal } from '@/store/goals';
import type { MonthKey } from './monthUtils';

export type MonthlyDataItem = MonthKey & {
	income: number;
	expenses: number;
	profit: number;
	count: number;
};

export function calculateMonthlyData(
	months: MonthKey[],
	tasks: Task[],
	monthlyFinancialGoals: MonthlyFinancialGoal[],
	incomes: Income[]
): MonthlyDataItem[] {
	return months.map((m) => {
		const monthStart = new Date(m.year, m.month, 1);
		const monthEnd = new Date(m.year, m.month + 1, 0, 23, 59, 59);
		const monthKey = `${m.year}-${String(m.month + 1).padStart(2, '0')}`;
		const manual = monthlyFinancialGoals.find((g) => g.monthKey === monthKey)?.manualProfit;
		
		// Доход только из платежей (по всем задачам), налог считается от платежей
		let income = 0;
		let tax = 0;
		const paidTaskIds = new Set<string>();
		tasks.forEach((t) => {
			(t.payments || []).forEach((p) => {
				if (!p || !p.date) return;
				const d = new Date(p.date);
				d.setHours(0, 0, 0, 0);
				if (d >= monthStart && d <= monthEnd) {
					const amount = p.amount != null ? p.amount : ((p.qty || 0) * (p.price || 0));
					const amt = amount || 0;
					income += amt;
					// Налог по ставке задачи (если указана)
					if (t.taxRate && t.taxRate > 0) {
						tax += amt * (t.taxRate / 100);
					}
					paidTaskIds.add(t.id);
				}
			});
		});
		
		// Добавляем дополнительные доходы (не связанные с задачами)
		incomes.forEach((inc) => {
			if (!inc.date) return;
			const d = new Date(inc.date);
			d.setHours(0, 0, 0, 0);
			if (d >= monthStart && d <= monthEnd) {
				income += inc.amount || 0;
				// Налог от дополнительного дохода
				if (inc.taxRate && inc.taxRate > 0) {
					tax += (inc.amount || 0) * (inc.taxRate / 100);
				}
			}
		});
		
		// Расходы: по записям расходов с датами
		let expenses = 0;
		tasks.forEach((t) => {
			(t.expensesEntries || []).forEach((e) => {
				if (!e.date) return;
				const d = new Date(e.date);
				d.setHours(0, 0, 0, 0);
				if (d >= monthStart && d <= monthEnd) {
					expenses += e.amount || 0;
				}
			});
		});
		
		// Активные задачи месяца: любые, пересекающие период месяца (без учета полной паузы)
		const activeTaskIds = new Set<string>();
		tasks.forEach((t) => {
			let start: Date | null = null;
			let end: Date | null = null;
			if (t.startDate) {
				start = new Date(t.startDate);
				start.setHours(0, 0, 0, 0);
			}
			if (t.updatedAt) {
				end = new Date(t.updatedAt);
				end.setHours(23, 59, 59, 999);
			} else if (t.deadline) {
				end = new Date(t.deadline);
				end.setHours(23, 59, 59, 999);
			}
			if (!start && t.createdAt) {
				start = new Date(t.createdAt);
				start.setHours(0, 0, 0, 0);
			}
			if (!start && end) {
				start = new Date(end);
				start.setHours(0, 0, 0, 0);
			}
			if (!end && start) {
				end = new Date(start);
				end.setHours(23, 59, 59, 999);
			}
			if (!start || !end) return;
			const overlaps = !(end < monthStart || start > monthEnd);
			if (!overlaps) return;
			// Если паузы полностью покрывают весь период пересечения — не считаем активной
			const overlapFrom = start > monthStart ? start : monthStart;
			const overlapTo = end < monthEnd ? end : monthEnd;
			const pausedRanges = t.pausedRanges || [];
			let coveredMs = 0;
			pausedRanges.forEach((r) => {
				if (!r.from || !r.to) return;
				const pFrom = new Date(r.from);
				pFrom.setHours(0, 0, 0, 0);
				const pTo = new Date(r.to);
				pTo.setHours(23, 59, 59, 999);
				const from = pFrom > overlapFrom ? pFrom : overlapFrom;
				const to = pTo < overlapTo ? pTo : overlapTo;
				if (to >= from) {
					coveredMs += (to.getTime() - from.getTime());
				}
			});
			const totalMs = overlapTo.getTime() - overlapFrom.getTime();
			const fullyPaused = totalMs > 0 && coveredMs >= totalMs;
			if (!fullyPaused) {
				activeTaskIds.add(t.id);
			}
		});

		// При наличии ручной прибыли — игнорируем расчет по задачам
		const appliedProfit = typeof manual === 'number' ? manual : (income - expenses - tax);
		const count = activeTaskIds.size;
		return { ...m, income, expenses, profit: appliedProfit, count };
	});
}






