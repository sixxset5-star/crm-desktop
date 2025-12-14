/**
 * Финансовый движок - централизованный расчет всех финансовых показателей
 * Разгружает useDashboardCalculations от сложной бизнес-логики
 */
import type { Task } from '@/store/board';
import type { Income } from '@/store/income';
import type { MonthlyFinancialGoal, Credit } from '@/store/goals';
import type { ExtraWork } from '@/pages/workload/types/extra-work.types';
import { parseDateOnly, formatDateInput, toLocalDateKey } from '@/shared/lib/date';
import { getPaidAmount } from '@/pages/workload/utils/extraWorkUtils';

export type FinanceEngineInput = {
	tasks: Task[];
	incomes: Income[];
	extraWorks: ExtraWork[];
	credits: Credit[];
	monthlyFinancialGoals: MonthlyFinancialGoal[];
	now: Date;
};

export type FinanceDaySummary = {
	dateKey: string;
	income: number;
	extraWorkIncome: number;
	taxes: number;
	expenses: number;
	profit: number;
	hasAdditionalIncome: boolean;
};

export type FinanceMonthSummary = {
	totalIncome: number;
	incomeFromSites: number;
	additionalIncome: number;
	extraWorkIncome: number;
	totalExpenses: number;
	totalTaxes: number;
	profit: number;
	expected: number;
	averageCheck: number;
};

export type FinanceSummary = {
	byDay: FinanceDaySummary[];
	byDayMap: Map<string, FinanceDaySummary>;
	month: FinanceMonthSummary;
};

/**
 * Проверяет, принадлежит ли дата указанному месяцу
 * 
 * @param date - Дата для проверки
 * @param year - Год месяца
 * @param month - Месяц (0-11)
 * @returns true, если дата принадлежит указанному месяцу
 */
function isInCurrentMonth(date: Date | null, year: number, month: number): boolean {
	if (!date) return false;
	const dateYear = date.getFullYear();
	const dateMonth = date.getMonth();
	return dateYear === year && dateMonth === month;
}

/**
 * Нормализует строку даты в объект Date с учетом часовых поясов
 * Использует parseDateOnly для безопасного парсинга
 * 
 * @param value - Строка даты для нормализации
 * @returns Объект Date или null при невалидной дате
 */
function normalizeDate(value?: string | null): Date | null {
	if (!value) return null;
	return parseDateOnly(value);
}

/**
 * Рассчитывает финансовую сводку за месяц
 * Централизованный расчет всех финансовых показателей:
 * - Доходы от задач, дополнительных доходов и доп. работ
 * - Расходы из задач
 * - Налоги с учетом ставок
 * - Прибыль (доходы - расходы - налоги)
 * - Ожидаемый доход (неоплаченные платежи)
 * - Дневная и месячная статистика
 * 
 * @param input - Входные данные для расчета
 * @param input.tasks - Список задач
 * @param input.incomes - Список дополнительных доходов
 * @param input.extraWorks - Список дополнительных работ
 * @param input.credits - Список кредитов
 * @param input.monthlyFinancialGoals - Месячные финансовые цели
 * @param input.now - Текущая дата для определения месяца расчетов
 * @returns Финансовая сводка с дневной и месячной статистикой
 * 
 * @example
 * const summary = calculateFinanceSummary({
 *   tasks: [...],
 *   incomes: [...],
 *   extraWorks: [...],
 *   credits: [...],
 *   monthlyFinancialGoals: [...],
 *   now: new Date()
 * });
 * console.log(summary.month.profit); // Прибыль за месяц
 * console.log(summary.byDay[0].profit); // Прибыль за первый день
 */
export function calculateFinanceSummary(input: FinanceEngineInput): FinanceSummary {
	const { tasks, incomes, extraWorks, credits, monthlyFinancialGoals, now } = input;
	
	const year = now.getFullYear();
	const month = now.getMonth();
	const monthStart = new Date(year, month, 1, 0, 0, 0, 0);
	const monthEnd = new Date(year, month + 1, 0, 23, 59, 59, 999);
	const lastDay = new Date(year, month + 1, 0);
	const days = Array.from({ length: lastDay.getDate() }, (_, i) => 
		formatDateInput(new Date(year, month, i + 1))
	);

	// === Расчет месячной сводки ===
	
	let incomeFromSites = 0;
	const tasksWithPaidPaymentsThisMonth = new Set<string>();
	let totalPaidPaymentsAmount = 0;

	tasks.forEach((t) => {
		let hasPaymentThisMonth = false;
		let taskPaymentsAmount = 0;

		// Платежи задач
		if (t.payments) {
			t.payments.forEach((p) => {
				if (!p?.paid || !p.date || !p.date.trim()) return;
				const d = normalizeDate(p.date);
				if (d && isInCurrentMonth(d, year, month)) {
					hasPaymentThisMonth = true;
					const amount = p.amount != null ? p.amount : ((p.qty || 0) * (p.price || 0));
					incomeFromSites += amount || 0;
					taskPaymentsAmount += amount || 0;
				}
			});
		}

		// Подзадачи с датами
		if (t.subtasks) {
			t.subtasks.forEach((s) => {
				if (!s.amount || !s.date || !s.date.trim()) return;
				const d = normalizeDate(s.date);
				if (d && isInCurrentMonth(d, year, month)) {
					hasPaymentThisMonth = true;
					incomeFromSites += s.amount || 0;
					taskPaymentsAmount += s.amount || 0;
				}
			});
		}

		if (hasPaymentThisMonth) {
			tasksWithPaidPaymentsThisMonth.add(t.id);
			totalPaidPaymentsAmount += taskPaymentsAmount;
		}
	});

	const averageCheck = tasksWithPaidPaymentsThisMonth.size > 0
		? totalPaidPaymentsAmount / tasksWithPaidPaymentsThisMonth.size
		: 0;

	// Дополнительные доходы (Income store)
	let additionalIncome = 0;
	incomes.forEach((inc) => {
		if (!inc.date || !inc.date.trim()) return;
		const d = normalizeDate(inc.date);
		if (d && isInCurrentMonth(d, year, month)) {
			additionalIncome += inc.amount || 0;
		}
	});

	// Доход от доп работы (только оплаченные платежи)
	let extraWorkIncome = 0;
	extraWorks.forEach((work) => {
		const paidPayments = work.payments.filter((p) => p.paid && p.date);
		paidPayments.forEach((payment) => {
			const paymentDate = normalizeDate(payment.date);
			if (paymentDate && isInCurrentMonth(paymentDate, year, month)) {
				extraWorkIncome += payment.amount || 0;
			}
		});
	});

	const totalIncome = incomeFromSites + additionalIncome + extraWorkIncome;

	// Расходы
	let totalExpenses = 0;
	tasks.forEach((t) => {
		t.expensesEntries?.forEach((e) => {
			if (!e.date || !e.date.trim()) return;
			const d = normalizeDate(e.date);
			if (d && isInCurrentMonth(d, year, month)) {
				totalExpenses += e.amount || 0;
			}
		});
	});

	// Налоги
	let totalTaxes = 0;
	tasks.forEach((t) => {
		const taskTaxRate = t.taxRate;
		if (!taskTaxRate || taskTaxRate <= 0) return;
		t.payments?.forEach((p) => {
			if (!p?.paid || !p.date || !p.date.trim()) return;
			const d = normalizeDate(p.date);
			if (d && isInCurrentMonth(d, year, month)) {
				const amount = p.amount != null ? p.amount : ((p.qty || 0) * (p.price || 0));
				totalTaxes += (amount || 0) * (taskTaxRate / 100);
			}
		});
		t.subtasks?.forEach((s) => {
			if (!s.amount || !s.date || !s.date.trim()) return;
			const d = normalizeDate(s.date);
			if (d && isInCurrentMonth(d, year, month)) {
				totalTaxes += (s.amount || 0) * (taskTaxRate / 100);
			}
		});
	});

	incomes.forEach((inc) => {
		if (!inc.taxRate || inc.taxRate <= 0) return;
		if (!inc.date || !inc.date.trim()) return;
		const d = normalizeDate(inc.date);
		if (d && isInCurrentMonth(d, year, month)) {
			totalTaxes += (inc.amount || 0) * (inc.taxRate / 100);
		}
	});

	// Ожидаемый доход
	let expected = 0;
	const getTaskRelevantDate = (task: Task): Date | null => (
		normalizeDate(task.deadline) ??
		normalizeDate(task.updatedAt) ??
		normalizeDate(task.startDate) ??
		normalizeDate(task.createdAt) ??
		null
	);

	tasks.forEach((t) => {
		const taskDate = getTaskRelevantDate(t);
		const taskIsInMonth = isInCurrentMonth(taskDate, year, month);
		
		if (t.payments && t.payments.length > 0) {
			t.payments.forEach((p) => {
				if (!p || p.paid) return;
				if (p.date && p.date.trim()) {
					const paymentDate = normalizeDate(p.date);
					if (!paymentDate || !isInCurrentMonth(paymentDate, year, month)) return;
				} else if (!taskIsInMonth) {
					return;
				}
				const amount = p.amount != null ? p.amount : ((p.qty || 0) * (p.price || 0));
				expected += amount || 0;
			});
			return;
		}
		
		if (t.subtasks && t.subtasks.length > 0) {
			t.subtasks.forEach((s) => {
				if (s.done) return;
				if (s.date && s.date.trim()) {
					const subtaskDate = normalizeDate(s.date);
					if (!subtaskDate || !isInCurrentMonth(subtaskDate, year, month)) return;
				} else if (!taskIsInMonth) {
					return;
				}
				expected += s.amount || 0;
			});
			return;
		}
		
		if (!taskIsInMonth || !t.amount) return;
		const paid = t.paidAmount || 0;
		if (paid < t.amount) {
			expected += t.amount - paid;
		}
	});

	const profit = totalIncome - totalExpenses - totalTaxes;

	// === Расчет дневной сводки ===
	// Создаем Map как единственный источник правды
	const byDayMap = new Map<string, FinanceDaySummary>();
	
	days.forEach((dateKey) => {
		let dayIncome = 0;
		let dayExtraWorkIncome = 0;
		let dayExpenses = 0;
		let dayTaxes = 0;
		let hasAdditionalIncome = false;

		// Доходы от задач
		tasks.forEach((t) => {
			t.subtasks?.forEach((s) => {
				if (!s.amount || !s.date) return;
				const subtaskDateKey = toLocalDateKey(s.date);
				if (subtaskDateKey === dateKey) {
					dayIncome += s.amount || 0;
					if (t.taxRate && t.taxRate > 0) {
						dayTaxes += (s.amount || 0) * (t.taxRate / 100);
					}
				}
			});
			
			t.payments?.filter((p) => p.paid && p.date).forEach((p) => {
				const amount = p.amount != null ? p.amount : ((p.qty || 0) * (p.price || 0));
				const paymentDateKey = toLocalDateKey(p.date as string);
				if (paymentDateKey === dateKey) {
					dayIncome += amount || 0;
					const rate = p.taxRate ?? t.taxRate ?? 0;
					if (rate > 0) {
						dayTaxes += (amount || 0) * (rate / 100);
					}
				}
			});
			
			t.expensesEntries?.forEach((e) => {
				if (e.date && toLocalDateKey(e.date) === dateKey) {
					dayExpenses += e.amount || 0;
				}
			});
		});

		// Дополнительные доходы (Income store)
		incomes.forEach((inc) => {
			if (!inc.date) return;
			if (toLocalDateKey(inc.date) === dateKey) {
				dayIncome += inc.amount || 0;
				hasAdditionalIncome = true;
				if (inc.taxRate && inc.taxRate > 0) {
					dayTaxes += (inc.amount || 0) * (inc.taxRate / 100);
				}
			}
		});

		// Доход от доп работы (только оплаченные платежи)
		extraWorks.forEach((work) => {
			work.payments
				.filter((p) => p.paid && p.date)
				.forEach((payment) => {
					if (toLocalDateKey(payment.date) === dateKey) {
						dayExtraWorkIncome += payment.amount || 0;
						hasAdditionalIncome = true;
					}
				});
		});

			const dayProfit = dayIncome + dayExtraWorkIncome - dayTaxes - dayExpenses;

			byDayMap.set(dateKey, {
				dateKey,
				income: dayIncome,
				extraWorkIncome: dayExtraWorkIncome,
				taxes: dayTaxes,
				expenses: dayExpenses,
				profit: dayProfit,
				hasAdditionalIncome,
			});
		});

	// byDay генерируется из Map для обратной совместимости
	// ВАЖНО: byDayMap НЕ гарантирует порядок - это обычный Map
	// byDay - отсортированный массив по dateKey
	const byDay = Array.from(byDayMap.values()).sort((a, b) => 
		a.dateKey.localeCompare(b.dateKey)
	);

	return {
		byDay,
		byDayMap, // ВНИМАНИЕ: Map не гарантирует порядок, используйте byDay для итераций с порядком
		month: {
			totalIncome,
			incomeFromSites,
			additionalIncome,
			extraWorkIncome,
			totalExpenses,
			totalTaxes,
			profit,
			expected,
			averageCheck,
		},
	};
}

