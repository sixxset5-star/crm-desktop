import { create } from 'zustand';
import { saveGoals, loadGoals } from '@/shared/lib/data-source';
import { 
	triggerGoalCreated, 
	triggerGoalUpdated, 
	triggerGoalDeleted,
	triggerMonthlyExpenseCreated,
	triggerMonthlyExpenseUpdated,
	triggerMonthlyExpenseDeleted,
	triggerCreditCreated,
	triggerCreditUpdated,
	triggerCreditDeleted,
	triggerMonthlyFinancialGoalUpdated,
} from '@/shared/lib/toast-triggers';
import { createLogger } from '@/shared/lib/logger';
import { generateShortId } from '@/shared/utils/id';

const log = createLogger('Goals');

export type Goal = {
	id: string;
	title: string;
	description?: string;
	deadline?: string;
	progress: number; // 0-100
	completed: boolean;
};

export type MonthlyExpense = {
	id: string;
	name: string;
	amount: number;
	completed?: boolean; // Выполнен ли расход
};

export type MonthlyFinancialGoal = {
	monthKey: string; // "2024-11" (год-месяц)
	expenses: MonthlyExpense[];
	completed?: boolean; // Выполнена ли финансовая цель
	manualProfit?: number; // Ручная прибыль за месяц (игнорирует задачи в отчетах)
};

export type CreditScheduleItem = {
	id: string;
	creditId: string;
	monthNumber: number;
	paymentDate: string;
	plannedPayment: number;
	interestPart: number;
	principalPart: number;
	remainingBalance: number;
	paid: boolean;
	paidAmount?: number;
	paidAt?: string;
};

export type Credit = {
	id: string;
	name: string; // Название кредита/кредитной карты
	description?: string; // Описание
	startDate?: string; // Дата начала кредита (формат: "2024-12-15")
	scheduleType?: 'annuity' | 'differentiated'; // Тип графика погашения
	amount?: number; // Общая сумма кредита
	currentBalance?: number; // Текущий остаток долга
	interestRate?: number; // Годовая процентная ставка
	termMonths?: number; // Срок в месяцах
	monthlyPayment?: number; // Ежемесячный платеж
	status?: 'active' | 'archived'; // Статус кредита
	notes?: string; // Заметки
	paidThisMonth?: boolean; // Оплачен ли кредит в текущем месяце (legacy, для обратной совместимости)
	lastPaidMonth?: string; // Последний месяц оплаты (формат: "2024-11") (legacy)
	paymentDate?: string; // Дата платежа - число месяца (1-31) или полная дата (legacy)
	inputMode?: 'amount_rate_term' | 'amount_rate_payment' | 'rate_term_payment'; // Режим расчета кредита
	schedule?: CreditScheduleItem[]; // График платежей (опционально, загружается отдельно)
};

type GoalsState = {
	goals: Goal[];
	monthlyFinancialGoals: MonthlyFinancialGoal[];
	credits: Credit[];
	addGoal: (title: string, description?: string, deadline?: string) => void;
	updateGoal: (id: string, updates: Partial<Omit<Goal, 'id'>>) => void;
	removeGoal: (id: string) => void;
	addMonthlyExpense: (monthKey: string, name: string, amount: number) => void;
	updateMonthlyExpense: (monthKey: string, expenseId: string, updates: Partial<Omit<MonthlyExpense, 'id'>>) => void;
	removeMonthlyExpense: (monthKey: string, expenseId: string) => void;
	addCredit: (name: string, amount?: number, monthlyPayment?: number, interestRate?: number, notes?: string, paymentDate?: string) => void;
	updateCredit: (id: string, updates: Partial<Omit<Credit, 'id'>>) => void;
	removeCredit: (id: string) => void;
	updateMonthlyFinancialGoal: (monthKey: string, updates: Partial<Omit<MonthlyFinancialGoal, 'monthKey'>>) => void;
	loadFromDisk: () => Promise<void>;
};

export const useGoalsStore = create<GoalsState>((set, get) => ({
	goals: [],
	monthlyFinancialGoals: [],
	credits: [],
		addGoal: (title, description, deadline) => {
		const g: Goal = { id: generateShortId(), title, description, deadline, progress: 0, completed: false };
		set((s) => ({ goals: [...s.goals, g] }));
		void saveGoals({ goals: get().goals, monthlyFinancialGoals: get().monthlyFinancialGoals, credits: get().credits });
		setTimeout(() => triggerGoalCreated(g), 0);
	},
	updateGoal: (id, updates) => {
		const oldGoal = get().goals.find((g) => g.id === id);
		set((s) => ({ goals: s.goals.map((g) => (g.id === id ? { ...g, ...updates } : g)) }));
		const updatedGoal = get().goals.find((g) => g.id === id);
		void saveGoals({ goals: get().goals, monthlyFinancialGoals: get().monthlyFinancialGoals, credits: get().credits });
		
		if (oldGoal && updatedGoal) {
			setTimeout(() => triggerGoalUpdated(oldGoal, updatedGoal, updates), 0);
		}
	},
	removeGoal: (id) => {
		const goal = get().goals.find((g) => g.id === id);
		set((s) => ({ goals: s.goals.filter((g) => g.id !== id) }));
		void saveGoals({ goals: get().goals, monthlyFinancialGoals: get().monthlyFinancialGoals, credits: get().credits });
		if (goal) {
			setTimeout(() => triggerGoalDeleted(goal), 0);
		}
	},
	addMonthlyExpense: (monthKey, name, amount) => {
		const expense: MonthlyExpense = { id: generateShortId(), name, amount };
		set((s) => {
			const existing = s.monthlyFinancialGoals.find((m) => m.monthKey === monthKey);
			if (existing) {
				return {
					monthlyFinancialGoals: s.monthlyFinancialGoals.map((m) =>
						m.monthKey === monthKey
							? { ...m, expenses: [...m.expenses, expense] }
							: m
					),
				};
			} else {
				return {
					monthlyFinancialGoals: [...s.monthlyFinancialGoals, { monthKey, expenses: [expense] }],
				};
			}
		});
		void saveGoals({ goals: get().goals, monthlyFinancialGoals: get().monthlyFinancialGoals, credits: get().credits });
		setTimeout(() => triggerMonthlyExpenseCreated(expense, monthKey), 0);
	},
	updateMonthlyExpense: (monthKey, expenseId, updates) => {
		const monthGoal = get().monthlyFinancialGoals.find((m) => m.monthKey === monthKey);
		const oldExpense = monthGoal?.expenses.find((e) => e.id === expenseId);
		set((s) => ({
			monthlyFinancialGoals: s.monthlyFinancialGoals.map((m) =>
				m.monthKey === monthKey
					? { ...m, expenses: m.expenses.map((e) => (e.id === expenseId ? { ...e, ...updates } : e)) }
					: m
			),
		}));
		const updatedMonthGoal = get().monthlyFinancialGoals.find((m) => m.monthKey === monthKey);
		const newExpense = updatedMonthGoal?.expenses.find((e) => e.id === expenseId);
		void saveGoals({ goals: get().goals, monthlyFinancialGoals: get().monthlyFinancialGoals, credits: get().credits });
		
		if (oldExpense && newExpense) {
			setTimeout(() => triggerMonthlyExpenseUpdated(oldExpense, newExpense, updates, monthKey), 0);
		}
	},
	removeMonthlyExpense: (monthKey, expenseId) => {
		const monthGoal = get().monthlyFinancialGoals.find((m) => m.monthKey === monthKey);
		const expense = monthGoal?.expenses.find((e) => e.id === expenseId);
		set((s) => ({
			monthlyFinancialGoals: s.monthlyFinancialGoals.map((m) =>
				m.monthKey === monthKey ? { ...m, expenses: m.expenses.filter((e) => e.id !== expenseId) } : m
			),
		}));
		void saveGoals({ goals: get().goals, monthlyFinancialGoals: get().monthlyFinancialGoals, credits: get().credits });
		if (expense) {
			setTimeout(() => triggerMonthlyExpenseDeleted(expense, monthKey), 0);
		}
	},
	addCredit: (name, amount, monthlyPayment, interestRate, notes, paymentDate) => {
		const c: Credit = { id: generateShortId(), name, amount, monthlyPayment, interestRate, notes, paymentDate };
		set((s) => ({ credits: [...s.credits, c] }));
		void saveGoals({ goals: get().goals, monthlyFinancialGoals: get().monthlyFinancialGoals, credits: get().credits });
		setTimeout(() => triggerCreditCreated(c), 0);
	},
	updateCredit: (id, updates) => {
		const oldCredit = get().credits.find((c) => c.id === id);
		set((s) => ({ credits: s.credits.map((c) => (c.id === id ? { ...c, ...updates } : c)) }));
		const newCredit = get().credits.find((c) => c.id === id);
		void saveGoals({ goals: get().goals, monthlyFinancialGoals: get().monthlyFinancialGoals, credits: get().credits });
		if (oldCredit && newCredit) {
			setTimeout(() => triggerCreditUpdated(oldCredit, newCredit, updates), 0);
		}
	},
	removeCredit: (id) => {
		const credit = get().credits.find((c) => c.id === id);
		set((s) => ({ credits: s.credits.filter((c) => c.id !== id) }));
		void saveGoals({ goals: get().goals, monthlyFinancialGoals: get().monthlyFinancialGoals, credits: get().credits });
		if (credit) {
			setTimeout(() => triggerCreditDeleted(credit), 0);
		}
	},
	updateMonthlyFinancialGoal: (monthKey, updates) => {
		set((s) => {
			const existing = s.monthlyFinancialGoals.find((m) => m.monthKey === monthKey);
			if (existing) {
				return {
					monthlyFinancialGoals: s.monthlyFinancialGoals.map((m) =>
						m.monthKey === monthKey ? { ...m, ...updates } : m
					),
				};
			} else {
				// Если цели для месяца нет, создаем новую
				return {
					monthlyFinancialGoals: [...s.monthlyFinancialGoals, { monthKey, expenses: [], ...updates }],
				};
			}
		});
		void saveGoals({ goals: get().goals, monthlyFinancialGoals: get().monthlyFinancialGoals, credits: get().credits });
		if (updates.manualProfit !== undefined || updates.completed !== undefined) {
			setTimeout(() => triggerMonthlyFinancialGoalUpdated(monthKey, updates), 0);
		}
	},
	loadFromDisk: async () => {
		// Всегда загружаем, если еще не загружали (hasLoadedOnce еще false)
		if (hasLoadedOnce) {
			return;
		}
		try {
			isLoading = true;
			const data = await loadGoals();
			if (data && typeof data === 'object') {
				// Поддержка старого формата (массив целей) и нового формата (объект с goals и monthlyFinancialGoals)
				if (Array.isArray(data)) {
					const valid = data.filter((g) => g && typeof g === 'object' && g.id && (g.title || g.id));
					if (valid.length > 0) {
						set({ goals: valid, monthlyFinancialGoals: [], credits: [] });
					}
				} else if (data.goals !== undefined || data.monthlyFinancialGoals !== undefined || data.credits !== undefined) {
					// Загружаем даже если goals пустой массив, но есть monthlyFinancialGoals или credits
					const valid = Array.isArray(data.goals) ? data.goals.filter((g) => g && typeof g === 'object' && g.id && (g.title || g.id)) : [];
					let monthlyGoals = Array.isArray(data.monthlyFinancialGoals) ? data.monthlyFinancialGoals : [];
					let credits = Array.isArray(data.credits) ? data.credits : [];
					
					// Сбрасываем оплату кредитов при смене месяца и добавляем недостающие поля
					const now = new Date();
					const currentMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
					credits = credits.map((c) => {
						// Добавляем недостающие поля для старых кредитов
						const credit = {
							...c,
							paidThisMonth: c.paidThisMonth ?? false,
							lastPaidMonth: c.lastPaidMonth,
						};
						
						// Если последний месяц оплаты не совпадает с текущим месяцем, сбрасываем оплату
						if (credit.lastPaidMonth && credit.lastPaidMonth !== currentMonthKey) {
							return { ...credit, paidThisMonth: false, lastPaidMonth: undefined };
						}
						return credit;
					});

					// Однократное заполнение ручной прибыли для истории (если еще не задано)
					const defaults: Record<string, number> = {
						'2024-07': 70000.00,
						'2024-08': 91830.00,
						'2024-09': 121750.00,
						'2024-10': 156216.00,
						'2024-11': 192397.00,
						'2024-12': 185570.00,
						'2025-01': 37258.00,
						'2025-02': 120802.20,
						'2025-03': 89425.00,
						'2025-04': 229534.70,
						'2025-05': 178896.40,
						'2025-06': 101016.00,
						'2025-07': 221856.91,
						'2025-08': 105410.41,
						'2025-09': 154125.00,
						'2025-10': 193050.00,
					};
					// Преобразуем в Map для быстрого доступа
					const map = new Map<string, MonthlyFinancialGoal>();
					monthlyGoals.forEach((m) => map.set(m.monthKey, m));
					for (const [monthKey, value] of Object.entries(defaults)) {
						const existing = map.get(monthKey);
						if (!existing) {
							const created = { monthKey, expenses: [], manualProfit: value };
							map.set(monthKey, created as MonthlyFinancialGoal);
						} else if (existing.manualProfit == null) {
							existing.manualProfit = value;
							map.set(monthKey, existing);
						}
					}
					monthlyGoals = Array.from(map.values());
					
					set({ goals: valid, monthlyFinancialGoals: monthlyGoals, credits });
					hasLoadedOnce = true; // Отмечаем успешную загрузку
				} else {
					// Если нет goals, но есть credits или monthlyGoals, все равно устанавливаем
					set({ goals: [], monthlyFinancialGoals: [], credits: [] });
					hasLoadedOnce = true;
				}
			} else {
				set({ goals: [], monthlyFinancialGoals: [], credits: [] });
				hasLoadedOnce = true;
			}
			if (!hasLoadedOnce) {
				hasLoadedOnce = true; // Отмечаем загрузку даже если данных нет
				set({ goals: [], monthlyFinancialGoals: [], credits: [] });
			}
		} catch (error) {
			log.error('Failed to load goals', error);
			hasLoadedOnce = true; // Отмечаем загрузку даже при ошибке
		} finally {
			isLoading = false;
		}
	},
}));

// autosave
let saveTimer: ReturnType<typeof setTimeout> | null = null;
let isLoading = false;
let hasLoadedOnce = false;
// Сбрасываем флаг при перезагрузке модуля (для разработки)
if (typeof window !== 'undefined' && (window as any).__CRM_RELOAD__) {
	hasLoadedOnce = false;
}
useGoalsStore.subscribe((state) => {
	if (isLoading) return; // Не сохраняем во время загрузки
	// Не сохраняем пустые данные, если еще не загружали (защита от потери данных при первой загрузке)
	if (!hasLoadedOnce && state.goals.length === 0 && state.credits.length === 0) return;
	if (saveTimer) clearTimeout(saveTimer);
	saveTimer = setTimeout(() => {
		saveGoals({ goals: state.goals, monthlyFinancialGoals: state.monthlyFinancialGoals, credits: state.credits }).catch(() => {});
	}, 300);
});




