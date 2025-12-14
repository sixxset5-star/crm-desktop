import { useState, useMemo, useEffect } from 'react';
import { useGoalsStore, type Credit, type MonthlyExpense } from '@/store/goals';
import { useUIStore } from '@/store/ui';
import { UI_TEXTS } from '@/shared/constants/ui-texts';
import { useShallowSelector } from '@/shared/hooks/useStoreSelectors';
import { getCurrentMonthKey, getAvailableMonths } from '../utils';
import { safeEval } from '@/shared/lib/mathParser';
import { parseNumberSafe } from '@/shared/utils/number-validation';
import { MONTHS_IN_YEAR } from '@/shared/constants/numeric-constants';

/**
 * Хук для работы с финансовой моделью
 * Управляет кредитами, расходами и финансовыми целями
 * Автоматически загружает данные при монтировании
 * 
 * @returns Объект с состоянием и методами для работы с финансовой моделью
 * 
 * @example
 * ```tsx
 * const {
 *   credits,
 *   addCredit,
 *   removeCredit,
 *   handleSubmit,
 *   handleDelete,
 *   handleTogglePaid,
 * } = useFinancialModel();
 * ```
 */
export function useFinancialModel() {
	const credits = useShallowSelector(useGoalsStore, (s) => s.credits);
	const monthlyFinancialGoals = useShallowSelector(useGoalsStore, (s) => s.monthlyFinancialGoals);
	const addCredit = useGoalsStore((s) => s.addCredit);
	const updateCredit = useGoalsStore((s) => s.updateCredit);
	const removeCredit = useGoalsStore((s) => s.removeCredit);
	const addMonthlyExpense = useGoalsStore((s) => s.addMonthlyExpense);
	const updateMonthlyExpense = useGoalsStore((s) => s.updateMonthlyExpense);
	const removeMonthlyExpense = useGoalsStore((s) => s.removeMonthlyExpense);
	const showResultToast = useUIStore((s) => s.showResultToast);

	const [showForm, setShowForm] = useState(false);
	const [editing, setEditing] = useState<Credit | null>(null);
	const [name, setName] = useState('');
	const [amount, setAmount] = useState('');
	const [monthlyPayment, setMonthlyPayment] = useState('');
	const [interestRate, setInterestRate] = useState('');
	const [notes, setNotes] = useState('');
	const [paymentDate, setPaymentDate] = useState('');
	const [selectedMonth, setSelectedMonth] = useState<string>('');
	const [editingExpense, setEditingExpense] = useState<{ monthKey: string; expenseId: string } | null>(null);
	const [newExpenseName, setNewExpenseName] = useState('');
	const [newExpenseAmount, setNewExpenseAmount] = useState('');

	// Загружаем данные при монтировании компонента
	// Используем getState() напрямую, так как функция из Zustand store стабильна
	useEffect(() => {
		useGoalsStore.getState().loadFromDisk().catch(() => {});
	}, []); // Пустой массив - выполнится только при монтировании

	// Получаем текущий месяц по умолчанию
	useEffect(() => {
		if (!selectedMonth) {
			setSelectedMonth(getCurrentMonthKey());
		}
	}, [selectedMonth]);

	// Получаем список месяцев (текущий и следующие 11)
	const availableMonths = useMemo(() => getAvailableMonths(MONTHS_IN_YEAR), []);

	// Получаем данные для выбранного месяца
	const currentMonthData = useMemo(() => {
		return monthlyFinancialGoals.find((m) => m.monthKey === selectedMonth) || { monthKey: selectedMonth, expenses: [], completed: false };
	}, [monthlyFinancialGoals, selectedMonth]);

	// Вычисляем сумму расходов для выбранного месяца
	const totalExpenses = useMemo(() => {
		return currentMonthData.expenses.reduce((sum, e) => sum + (e.amount || 0), 0);
	}, [currentMonthData]);

	// Сортируем кредиты: сначала неоплаченные по дате платежа (ближайшие первыми), потом оплаченные
	const sortedCredits = useMemo(() => {
		const now = new Date();
		now.setHours(0, 0, 0, 0);
		
		return [...credits].sort((a, b) => {
			// Сначала оплаченные идут в конец
			if (a.paidThisMonth && !b.paidThisMonth) return 1;
			if (!a.paidThisMonth && b.paidThisMonth) return -1;
			
			// Если оба оплачены или оба не оплачены, сортируем по дате
			// Если paymentDate - это только число (1-31), используем его напрямую
			// Иначе пытаемся парсить как дату
			let dayA: number | null = null;
			let dayB: number | null = null;
			
			if (a.paymentDate) {
				if (/^\d{1,2}$/.test(a.paymentDate)) {
					dayA = parseInt(a.paymentDate);
				} else {
					const dateA = new Date(a.paymentDate);
					if (!isNaN(dateA.getTime())) {
						dayA = dateA.getDate();
					}
				}
			}
			
			if (b.paymentDate) {
				if (/^\d{1,2}$/.test(b.paymentDate)) {
					dayB = parseInt(b.paymentDate);
				} else {
					const dateB = new Date(b.paymentDate);
					if (!isNaN(dateB.getTime())) {
						dayB = dateB.getDate();
					}
				}
			}
			
			// Кредиты без даты идут в конец
			if (dayA === null && dayB === null) return 0;
			if (dayA === null) return 1;
			if (dayB === null) return -1;
			
			// Сортируем по числу дня: меньшие первыми
			return dayA - dayB;
		});
	}, [credits]);

	const totalCredits = useMemo(() => credits.reduce((sum, c) => sum + (c.amount || 0), 0), [credits]);
	const totalMonthlyPayments = useMemo(() => credits.reduce((sum, c) => sum + (c.monthlyPayment || 0), 0), [credits]);

	function handleAddExpense() {
		if (!newExpenseName.trim()) {
			showResultToast({
				type: 'warning',
				title: '⚠️ Не заполнено название',
				subtitle: 'Введите название расхода',
			});
			return;
		}
		if (!newExpenseAmount.trim()) {
			showResultToast({
				type: 'warning',
				title: '⚠️ Не указана сумма',
				subtitle: 'Введите сумму расхода',
			});
			return;
		}
		const amount = resolveNumericValue(newExpenseAmount);
		if (amount === undefined || amount <= 0) {
			showResultToast({
				type: 'warning',
				title: '⚠️ Неверная сумма',
				subtitle: 'Сумма должна быть положительным числом',
			});
			return;
		}
		addMonthlyExpense(selectedMonth, newExpenseName.trim(), amount);
		setNewExpenseName('');
		setNewExpenseAmount('');
	}

	function handleEditExpense(monthKey: string, expenseId: string) {
		const expense = currentMonthData.expenses.find((e) => e.id === expenseId);
		if (expense) {
			setEditingExpense({ monthKey, expenseId });
			setNewExpenseName(expense.name);
			setNewExpenseAmount(String(expense.amount));
		}
	}

	function handleSaveExpense() {
		if (!editingExpense) return;
		if (!newExpenseName.trim()) {
			showResultToast({
				type: 'warning',
				title: '⚠️ Не заполнено название',
				subtitle: 'Введите название расхода',
			});
			return;
		}
		if (!newExpenseAmount.trim()) {
			showResultToast({
				type: 'warning',
				title: '⚠️ Не указана сумма',
				subtitle: 'Введите сумму расхода',
			});
			return;
		}
		const amount = resolveNumericValue(newExpenseAmount);
		if (amount === undefined || amount <= 0) {
			showResultToast({
				type: 'warning',
				title: '⚠️ Неверная сумма',
				subtitle: 'Сумма должна быть положительным числом',
			});
			return;
		}
		updateMonthlyExpense(editingExpense.monthKey, editingExpense.expenseId, { name: newExpenseName.trim(), amount });
		setEditingExpense(null);
		setNewExpenseName('');
		setNewExpenseAmount('');
	}

	function handleCancelEdit() {
		setEditingExpense(null);
		setNewExpenseName('');
		setNewExpenseAmount('');
	}

	useEffect(() => {
		if (showForm && editing) {
			setName(editing.name);
			setAmount(editing.amount != null ? String(editing.amount) : '');
			setMonthlyPayment(editing.monthlyPayment ? String(editing.monthlyPayment) : '');
			setInterestRate(editing.interestRate ? String(editing.interestRate) : '');
			setNotes(editing.notes || '');
			setPaymentDate(editing.paymentDate || '');
		} else if (showForm && !editing) {
			setName('');
			setAmount('');
			setMonthlyPayment('');
			setInterestRate('');
			setNotes('');
			setPaymentDate('');
		}
	}, [showForm, editing]);

	function resolveNumericValue(value: string): number | undefined {
		const trimmed = value.trim();
		if (!trimmed) return undefined;
		// Нормализуем запятую в точку для поддержки русской локали
		const normalized = trimmed.replace(',', '.');
		// Проверяем, содержит ли значение математическое выражение
		const containsExpression = /[+\-*/()]/.test(normalized);
		const evaluated = containsExpression ? safeEval(normalized) : null;
		const result = evaluated ?? parseNumberSafe(normalized);
		if (result === null) {
			return undefined;
		}
		return result;
	}

	function handleSubmit(e: React.FormEvent) {
		e.preventDefault();
		if (!name.trim()) return;

		const amountNum = resolveNumericValue(amount);
		if (amountNum !== undefined && amountNum < 0) return;

		const monthlyPaymentNum = resolveNumericValue(monthlyPayment);
		const interestRateNum = resolveNumericValue(interestRate);

		if (editing) {
			updateCredit(editing.id, {
				name: name.trim(),
				amount: amountNum,
				monthlyPayment: monthlyPaymentNum,
				interestRate: interestRateNum,
				notes: notes.trim() || undefined,
				paymentDate: paymentDate.trim() || undefined,
			});
		} else {
			addCredit(name.trim(), amountNum, monthlyPaymentNum, interestRateNum, notes.trim() || undefined, paymentDate.trim() || undefined);
		}

		setShowForm(false);
		setEditing(null);
	}

	function handleEdit(credit: Credit) {
		setEditing(credit);
		setShowForm(true);
	}

	async function handleDelete(id: string) {
		const confirmed = await useUIStore.getState().showConfirm({
			message: UI_TEXTS.DELETE_CREDIT,
			variant: 'danger',
			confirmText: UI_TEXTS.DELETE,
			cancelText: UI_TEXTS.CANCEL,
		});
		if (confirmed) {
			removeCredit(id);
		}
	}

	function handleTogglePaid(creditId: string, currentPaid: boolean) {
		const currentMonthKey = getCurrentMonthKey();
		updateCredit(creditId, {
			paidThisMonth: !currentPaid,
			lastPaidMonth: !currentPaid ? currentMonthKey : undefined,
		});
	}

	return {
		// State
		credits: sortedCredits,
		availableMonths,
		selectedMonth,
		setSelectedMonth,
		currentMonthData,
		totalExpenses,
		totalCredits,
		totalMonthlyPayments,
		showForm,
		setShowForm,
		editing,
		setEditing,
		editingExpense,
		// Form state
		name,
		setName,
		amount,
		setAmount,
		monthlyPayment,
		setMonthlyPayment,
		interestRate,
		setInterestRate,
		notes,
		setNotes,
		paymentDate,
		setPaymentDate,
		newExpenseName,
		setNewExpenseName,
		newExpenseAmount,
		setNewExpenseAmount,
		// Handlers
		handleSubmit,
		handleEdit,
		handleDelete,
		handleTogglePaid,
		handleAddExpense,
		handleEditExpense,
		handleSaveExpense,
		handleCancelEdit,
	};
}

