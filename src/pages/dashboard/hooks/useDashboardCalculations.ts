import { useMemo } from 'react';
import type { Task } from '@/store/board';
import type { ColumnId } from '@/store/board';
import type { Income } from '@/store/income';
import { parseDateOnly, formatDateInput, toLocalDateKey } from '@/shared/lib/date';
import { formatCurrencyRub } from '@/shared/lib/format';
import { isTaskActiveInMonth } from '@/domain/task';
import type { MonthlyFinancialGoal, Credit } from '@/store/goals';
import { useSettingsStore } from '@/store/settings';
import { calculateFinanceSummary } from '@/domain/finance/financeEngine';
import { useShallowSelector } from '@/shared/hooks/useStoreSelectors';
import type { ExtraWork } from '@/pages/workload/types/extra-work.types';

/**
 * Хук для расчета финансовых показателей дашборда
 * Вычисляет доходы, расходы, прибыль, налоги и другую финансовую статистику
 * Использует financeEngine для централизованных расчетов
 * 
 * @param tasks - Список задач
 * @param incomes - Список дополнительных доходов
 * @param extraWorks - Список дополнительных работ
 * @param monthlyFinancialGoals - Месячные финансовые цели
 * @param credits - Список кредитов
 * @param now - Текущая дата для расчетов
 * @returns Объект с рассчитанными показателями: totals, sparkData, creditsSparkData и др.
 * 
 * @example
 * ```tsx
 * const {
 *   totals,
 *   sparkData,
 *   creditsSparkData,
 *   currentFinancialGoalData,
 * } = useDashboardCalculations(
 *   tasks,
 *   incomes,
 *   extraWorks,
 *   monthlyFinancialGoals,
 *   credits,
 *   new Date()
 * );
 * ```
 */
export function useDashboardCalculations(
	tasks: Task[],
	incomes: Income[],
	extraWorks: ExtraWork[],
	monthlyFinancialGoals: MonthlyFinancialGoal[],
	credits: Credit[],
	now: Date
) {
	const settings = useShallowSelector(useSettingsStore, (s) => s.settings);
	const currentMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

	// Вспомогательная функция для получения реального статуса задачи (для подсчетов)
	const getTaskColumnForCalculations = (task: Task): ColumnId => {
		return task.columnId === 'paused' && task.pausedFromColumnId ? task.pausedFromColumnId : task.columnId;
	};

	const tasksThisMonth = useMemo(() => {
		return tasks.filter((t) => isTaskActiveInMonth(t, now)).length;
	}, [tasks, now]);

	const currentFinancialGoalData = useMemo(() => {
		const currentMonthGoal = monthlyFinancialGoals.find((m) => m.monthKey === currentMonthKey);
		const expenses = currentMonthGoal && Array.isArray(currentMonthGoal.expenses) ? currentMonthGoal.expenses : [];
		
		const totalExpenses = expenses.reduce((sum, e) => sum + (e.amount || 0), 0);
		const unpaidCredits = credits.filter((c) => !(c.paidThisMonth ?? false) && c.monthlyPayment);
		const totalMonthlyPayments = unpaidCredits.reduce((sum, c) => sum + (c.monthlyPayment || 0), 0);
		const totalGoal = totalExpenses + totalMonthlyPayments;
		
		const completedExpenses = expenses.filter((e) => e.completed);
		const completedExpensesAmount = completedExpenses.reduce((sum, e) => sum + (e.amount || 0), 0);
		const paidCredits = credits.filter((c) => (c.paidThisMonth ?? false) && c.monthlyPayment);
		const paidCreditsAmount = paidCredits.reduce((sum, c) => sum + (c.monthlyPayment || 0), 0);
		const completedTotal = completedExpensesAmount + paidCreditsAmount;
		
		const remainingExpenses = expenses.filter((e) => !e.completed);
		const remainingExpensesAmount = remainingExpenses.reduce((sum, e) => sum + (e.amount || 0), 0);
		const unpaidCreditsAmount = unpaidCredits.reduce((sum, c) => sum + (c.monthlyPayment || 0), 0);
		const remainingTotal = remainingExpensesAmount + unpaidCreditsAmount;
		
		return {
			totalGoal,
			completedExpensesAmount,
			completedExpensesCount: completedExpenses.length,
			remainingExpensesAmount,
			remainingExpensesCount: remainingExpenses.length,
			totalExpensesCount: expenses.length,
			completedTotal,
			remainingTotal,
			paidCreditsAmount,
			unpaidCreditsAmount,
			totalCreditsCount: credits.filter((c) => c.monthlyPayment).length,
			paidCreditsCount: paidCredits.length,
		};
	}, [monthlyFinancialGoals, credits, currentMonthKey]);

	// Кешируем результат financeEngine для использования в totals и sparkData
	const financeSummary = useMemo(() => {
		return calculateFinanceSummary({
			tasks,
			incomes,
			extraWorks,
			credits,
			monthlyFinancialGoals,
			now,
		});
	}, [tasks, incomes, extraWorks, credits, monthlyFinancialGoals, now]);

	const totals = useMemo(() => {
		return {
			totalIncome: financeSummary.month.totalIncome,
			incomeFromSites: financeSummary.month.incomeFromSites,
			averageCheck: financeSummary.month.averageCheck,
			additionalIncome: financeSummary.month.additionalIncome + financeSummary.month.extraWorkIncome,
			profit: financeSummary.month.profit,
			expected: financeSummary.month.expected,
			tax: financeSummary.month.totalTaxes,
			expenses: financeSummary.month.totalExpenses,
		};
	}, [financeSummary]);

	const sparkData = useMemo(() => {
		// Используем financeEngine для получения всех данных по дням
		const year = now.getFullYear();
		const month = now.getMonth();
		const lastDay = new Date(year, month + 1, 0);
		const days = Array.from({ length: lastDay.getDate() }, (_, i) => formatDateInput(new Date(year, month, i + 1)));
		
		// Проверка, что дата принадлежит текущему месяцу
		const isDateInCurrentMonth = (dateKey: string | null): boolean => {
			if (!dateKey) return false;
			const dateMatch = dateKey.match(/^(\d{4})-(\d{2})-(\d{2})$/);
			if (!dateMatch) return false;
			const dateYear = parseInt(dateMatch[1], 10);
			const dateMonth = parseInt(dateMatch[2], 10) - 1; // месяцы 0-11
			return dateYear === year && dateMonth === month;
		};

		// Используем byDayMap из financeEngine
		const dayData = days.map((d) => {
			const daySummary = financeSummary.byDayMap.get(d);
			const profit = daySummary?.profit ?? 0;
			const hasAdditionalIncome = daySummary?.hasAdditionalIncome ?? false;
			
			// Собираем tasks только для UI (попапы, детализация)
			const dayTasks: Array<{ task: Task; amount: number; type: 'payment' | 'expense'; paymentTitle?: string; isAdditionalIncome?: boolean }> = [];
			
			tasks.forEach((t) => {
				t.subtasks?.forEach((s) => {
					if (!s.amount || !s.date) return;
					const subtaskDateKey = toLocalDateKey(s.date);
					if (subtaskDateKey && subtaskDateKey === d && isDateInCurrentMonth(subtaskDateKey)) {
						dayTasks.push({ task: t, amount: s.amount || 0, type: 'payment', paymentTitle: s.title });
					}
				});
				t.payments?.filter((p) => p.paid && p.date).forEach((p) => {
					const amount = p.amount != null ? p.amount : ((p.qty || 0) * (p.price || 0));
					const paymentDateKey = toLocalDateKey(p.date as string);
					if (paymentDateKey && paymentDateKey === d && isDateInCurrentMonth(paymentDateKey)) {
						dayTasks.push({ task: t, amount: amount || 0, type: 'payment', paymentTitle: p.title });
					}
				});
				t.expensesEntries?.forEach((e) => {
					if (e.date && toLocalDateKey(e.date) === d) {
						dayTasks.push({ task: t, amount: e.amount || 0, type: 'expense', paymentTitle: e.title });
					}
				});
			});
			
			const relevantTasks = settings.incomeLogic === 'done' 
				? tasks.filter((t) => {
					const effectiveColumnId = getTaskColumnForCalculations(t);
					return effectiveColumnId === 'completed' || effectiveColumnId === 'closed';
				}) 
				: tasks;
			
			relevantTasks.forEach((t) => {
				if (!t.amount || t.amount <= 0) return;
				const hasPaymentsWithDates = t.payments?.some(p => p && p.date && p.date.trim() !== '') || false;
				const hasSubtasksWithDates = t.subtasks?.some(s => s.amount && s.date && s.date.trim() !== '') || false;
				if (hasPaymentsWithDates || hasSubtasksWithDates) {
					return;
				}
				
				let taskEndDate: Date | null = null;
				if (t.updatedAt) {
					taskEndDate = parseDateOnly(t.updatedAt);
				} else if (t.deadline) {
					taskEndDate = parseDateOnly(t.deadline);
				}
				
				if (taskEndDate && formatDateInput(taskEndDate) === d) {
					const currentDayDate = parseDateOnly(d);
					if (!currentDayDate) return;
					
					let wasPaidBefore = false;
					t.subtasks?.forEach((s) => {
						if (s.amount && s.date) {
							const subtaskDate = parseDateOnly(s.date);
							if (subtaskDate && subtaskDate < currentDayDate) {
								wasPaidBefore = true;
							}
						}
					});
					t.payments?.forEach((p) => {
						if (p.paid && p.date) {
							const paymentDate = parseDateOnly(p.date);
							if (paymentDate && paymentDate < currentDayDate) {
								wasPaidBefore = true;
							}
						}
					});
					
					if (!wasPaidBefore) {
						dayTasks.push({ task: t, amount: t.amount, type: 'payment' });
					}
				}
			});
			
			incomes.forEach((inc) => {
				if (!inc.date) return;
				if (toLocalDateKey(inc.date) === d) {
					dayTasks.push({ 
						task: { id: inc.id, title: inc.title, columnId: 'closed' } as Task, 
						amount: inc.amount || 0, 
						type: 'payment',
						paymentTitle: inc.title,
						isAdditionalIncome: true,
					});
				}
			});

			extraWorks.forEach((work) => {
				work.payments
					.filter((p) => p.paid && p.date)
					.forEach((payment) => {
						if (toLocalDateKey(payment.date) === d) {
							dayTasks.push({
								task: { id: work.id, title: `Доп работа (${work.workDates.length} дней)`, columnId: 'closed' } as Task,
								amount: payment.amount || 0,
								type: 'payment',
								paymentTitle: `Доп работа - ${formatCurrencyRub(payment.amount)}`,
								isAdditionalIncome: true,
							});
						}
					});
			});
			
			return { profit, tasks: dayTasks, date: d, hasAdditionalIncome };
		});
		
		const dayProfit = dayData.map((d) => d.profit);
		// Для визуализации графика используем абсолютные значения для масштабирования
		const max = Math.max(1, ...dayProfit.map(Math.abs));
		const min = Math.min(0, ...dayProfit);
		// Для статистики используем реальные значения
		const maxProfit = dayProfit.length > 0 ? Math.max(...dayProfit) : 0;
		const minProfit = dayProfit.length > 0 ? Math.min(...dayProfit) : 0;
		const minPositive = dayProfit.filter((v) => v > 0).reduce((acc, v) => Math.min(acc, v), Number.POSITIVE_INFINITY);
		
		const coords = dayProfit.map((v, i) => {
			const x = (i / Math.max(1, days.length - 1)) * 300;
			const normalized = (v - min) / (max - min || 1);
			const y = 100 - (normalized * 90) - 5;
			return { x, y, value: v, hasData: dayData[i].tasks.length > 0 };
		});
		
		return {
			coords: coords.map((c) => `${c.x},${c.y}`).join(' '),
			coordsPoints: coords,
			dayProfit,
			dayData,
			max, // для визуализации (абсолютное значение)
			min,
			maxProfit, // реальный максимум для статистики
			minProfit, // реальный минимум для статистики
			minPositive: Number.isFinite(minPositive) ? minPositive : 0,
			days,
		};
	}, [financeSummary, tasks, settings.incomeLogic, now]);

	const creditsSparkData = useMemo(() => {
		const year = now.getFullYear();
		const month = now.getMonth();
		const lastDay = new Date(year, month + 1, 0);
		const days = Array.from({ length: lastDay.getDate() }, (_, i) => formatDateInput(new Date(year, month, i + 1)));
		
		const dayData = days.map((d) => {
			const date = new Date(d);
			const dayNumber = date.getDate();
			let dayCredits = 0;
			const dayCreditsList: Array<{ credit: Credit; amount: number }> = [];
			
			credits.forEach((credit) => {
				if (!credit.monthlyPayment || credit.monthlyPayment <= 0) return;
				
				// Проверяем, если paymentDate - это только число (1-31)
				let creditDay: number | null = null;
				if (credit.paymentDate) {
					if (/^\d{1,2}$/.test(credit.paymentDate)) {
						creditDay = parseInt(credit.paymentDate);
					} else {
						// Если это полная дата, извлекаем день
						const creditDate = parseDateOnly(credit.paymentDate);
						if (creditDate) {
							creditDay = creditDate.getDate();
						}
					}
				}
				
				// Если день кредита совпадает с текущим днем месяца
				if (creditDay === dayNumber) {
					dayCredits += credit.monthlyPayment;
					dayCreditsList.push({ credit, amount: credit.monthlyPayment });
				}
			});
			
			return { amount: dayCredits, credits: dayCreditsList, date: d, dayNumber };
		});
		
		const dayAmounts = dayData.map((d) => d.amount);
		const max = Math.max(1, ...dayAmounts);
		const min = 0;
		const maxAmount = dayAmounts.length > 0 ? Math.max(...dayAmounts) : 0;
		const minAmount = 0;
		const totalAmount = dayAmounts.reduce((a, b) => a + b, 0);
		const averageAmount = dayAmounts.length > 0 ? totalAmount / dayAmounts.length : 0;
		
		return {
			dayData,
			dayAmounts,
			max,
			min,
			maxAmount,
			minAmount,
			totalAmount,
			averageAmount,
			days,
		};
	}, [credits, now]);

	return {
		tasksThisMonth,
		currentFinancialGoalData,
		totals,
		sparkData,
		creditsSparkData,
		getTaskColumnForCalculations,
	};
}

