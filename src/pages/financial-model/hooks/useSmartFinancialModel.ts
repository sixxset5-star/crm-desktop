/**
 * Хук для финансовой модели с поддержкой умных кредитов
 */
import { useState, useMemo, useEffect } from 'react';
import { useCreditsStore, type CreditWithSchedule } from '@/store/credits';
import { useGoalsStore, type MonthlyExpense, type Credit, type CreditScheduleItem } from '@/store/goals';
import { useUIStore } from '@/store/ui';
import { UI_TEXTS } from '@/shared/constants/ui-texts';
import { useShallowSelector } from '@/shared/hooks/useStoreSelectors';
import { getCurrentMonthKey, getAvailableMonths } from '../utils';
import { getUpcomingCreditPayments, findCreditsNeedingMigration } from '@/shared/lib/electron-bridge';
import { createLogger } from '@/shared/lib/logger';
import { validatePositiveNumber } from '@/shared/utils/number-validation';
import { DELAY_MS, DELAY_MS_LONG, DAYS_IN_WEEK, MONTHS_IN_YEAR, UPDATE_INTERVAL_MS } from '@/shared/constants/numeric-constants';

const log = createLogger('SmartFinancialModel');

export function useSmartFinancialModel() {
	// Credits store
	const credits = useShallowSelector(useCreditsStore, (s) => s.credits);
	const saveCredit = useCreditsStore((s) => s.saveCredit);
	const applyCreditPayment = useCreditsStore((s) => s.applyCreditPayment);
	const deleteCredit = useCreditsStore((s) => s.deleteCredit);
	// Селекторы не используются напрямую - вычисляем в useMemo для реактивности

	// Goals store (для расходов и старых кредитов)
	const monthlyFinancialGoals = useShallowSelector(useGoalsStore, (s) => s.monthlyFinancialGoals);
	const oldCredits = useShallowSelector(useGoalsStore, (s) => s.credits); // Старые кредиты из goals store
	const addMonthlyExpense = useGoalsStore((s) => s.addMonthlyExpense);
	const updateMonthlyExpense = useGoalsStore((s) => s.updateMonthlyExpense);
	const removeMonthlyExpense = useGoalsStore((s) => s.removeMonthlyExpense);

	const showResultToast = useUIStore((s) => s.showResultToast);

	// UI state
	const [showForm, setShowForm] = useState(false);
	const [editing, setEditing] = useState<CreditWithSchedule | null>(null);
	const [selectedMonth, setSelectedMonth] = useState<string>('');
	const [editingExpense, setEditingExpense] = useState<{ monthKey: string; expenseId: string } | null>(null);
	const [newExpenseName, setNewExpenseName] = useState('');
	const [newExpenseAmount, setNewExpenseAmount] = useState('');

	// Напоминания
	const [upcomingPayments, setUpcomingPayments] = useState<Array<{
		creditId: string;
		creditName: string;
		paymentDate: string;
		amount: number;
		monthNumber: number;
	}>>([]);

	// Состояние миграции
	const [needsMigration, setNeedsMigration] = useState(false);
	const [migrationCredits, setMigrationCredits] = useState<Credit[]>([]);
	const [showMigrationModal, setShowMigrationModal] = useState(false);

	// Проверка миграции кредитов
	// ФИКС: Кредиты загружаются в loadAllStores() (src/store/index.ts), а не здесь
	// Это предотвращает гонку при втором reload, когда useSmartFinancialModel
	// монтируется раньше, чем IPC готов
	useEffect(() => {
		const checkMigration = async () => {
			// Небольшая задержка, чтобы loadAllStores() успел выполниться
			// и IPC был готов
			await new Promise(resolve => setTimeout(resolve, DELAY_MS));
			
			// Получаем актуальное состояние из store (данные уже загружены в loadAllStores)
			const currentOldCredits = useGoalsStore.getState().credits;
			const currentNewCredits = useCreditsStore.getState().credits;
			
			log.debug('Credits migration check', {
				oldCreditsCount: currentOldCredits.length,
				newCreditsCount: currentNewCredits.length,
			});
			
			// Если есть старые кредиты в goals store, но нет в новом store - показываем миграцию
			if (currentOldCredits.length > 0 && currentNewCredits.length === 0) {
				log.debug('Showing migration modal for old credits from goals store', { count: currentOldCredits.length });
				// Конвертируем старые кредиты в формат для миграции
				const creditsToMigrate = currentOldCredits.map(c => ({
					...c,
					schedule: [],
					status: c.status || 'active',
				}));
				setMigrationCredits(creditsToMigrate);
				setNeedsMigration(true);
				setShowMigrationModal(true);
			} else {
				// Проверяем кредиты, требующие миграции (без графика)
				const creditsToMigrate = await findCreditsNeedingMigration();
				if (creditsToMigrate.length > 0) {
					log.debug('Showing migration modal for credits needing migration', { count: creditsToMigrate.length });
					setMigrationCredits(creditsToMigrate);
					setNeedsMigration(true);
					setShowMigrationModal(true);
				} else if (currentOldCredits.length > 0) {
					// Если есть старые кредиты, но они не были обнаружены - все равно показываем миграцию
					log.debug('Found old credits, showing migration modal', { count: currentOldCredits.length });
					const creditsToMigrate = currentOldCredits.map(c => ({
						...c,
						schedule: [],
						status: c.status || 'active',
					}));
					setMigrationCredits(creditsToMigrate);
					setNeedsMigration(true);
					setShowMigrationModal(true);
				}
			}
		};
		checkMigration();
	}, []); // Пустой массив - выполнится только при монтировании

	// Загрузка напоминаний
	useEffect(() => {
		const loadUpcoming = async () => {
			try {
				const upcoming = await getUpcomingCreditPayments(DAYS_IN_WEEK);
				setUpcomingPayments(upcoming);
			} catch (error) {
				log.error('Failed to load upcoming payments', error);
			}
		};
		loadUpcoming();
		const interval = setInterval(loadUpcoming, UPDATE_INTERVAL_MS); // Обновляем каждую минуту
		return () => clearInterval(interval);
	}, []);

	// Получаем текущий месяц по умолчанию
	useEffect(() => {
		if (!selectedMonth) {
			setSelectedMonth(getCurrentMonthKey());
		}
	}, [selectedMonth]);

	// Получаем список месяцев
	const availableMonths = useMemo(() => getAvailableMonths(MONTHS_IN_YEAR), []);

	// Получаем данные для выбранного месяца
	const currentMonthData = useMemo(() => {
		return monthlyFinancialGoals.find((m) => m.monthKey === selectedMonth) || { monthKey: selectedMonth, expenses: [], completed: false };
	}, [monthlyFinancialGoals, selectedMonth]);

	// Объединяем новые кредиты и старые (если новых нет)
	// ВАЖНО: показываем старые кредиты, даже если новых нет - чтобы пользователь их видел
	const allCredits = useMemo(() => {
		// Если есть новые кредиты - используем их
		if (credits.length > 0) {
			return credits;
		}
		// Если новых кредитов нет, показываем старые (для миграции)
		// Это позволяет пользователю видеть свои кредиты и мигрировать их
		if (oldCredits.length > 0) {
			return oldCredits.map(c => ({
				...c,
				schedule: [],
				status: c.status || 'active',
				currentBalance: c.currentBalance || c.amount || 0,
			}));
		}
		return [];
	}, [credits, oldCredits]);

	// Сортируем кредиты: активные первыми, затем по дате платежа
	const sortedCredits = useMemo(() => {
		return [...allCredits].sort((a, b) => {
			// Активные первыми
			if (a.status === 'active' && b.status !== 'active') return -1;
			if (a.status !== 'active' && b.status === 'active') return 1;
			
			// По дате начала (новые первыми)
			if (a.startDate && b.startDate) {
				return new Date(b.startDate).getTime() - new Date(a.startDate).getTime();
			}
			return 0;
		});
	}, [allCredits]);

	// Общая сумма долгов
	const totalDebt = useMemo(() => {
		return allCredits
			.filter((c) => c.status === 'active')
			.reduce((sum, c) => sum + (c.currentBalance || c.amount || 0), 0);
	}, [allCredits]);

	// Платежи по кредитам за месяц (определяем ПЕРЕД totalExpenses)
	const monthlyCreditPayments = useMemo(() => {
		const [year, month] = selectedMonth.split('-').map(Number);
		return allCredits
			.filter((c) => c.status === 'active')
			.reduce((sum, credit) => {
				// Если есть график - используем его
				if (credit.schedule && credit.schedule.length > 0) {
					const scheduleItem = credit.schedule.find((item) => {
						const itemDate = new Date(item.paymentDate);
						return itemDate.getFullYear() === year && itemDate.getMonth() + 1 === month;
					});
					return sum + (scheduleItem?.plannedPayment || 0);
				}
				// Иначе используем monthlyPayment (для старых кредитов)
				return sum + (credit.monthlyPayment || 0);
			}, 0);
	}, [selectedMonth, allCredits]);

	// Уменьшение долга за месяц
	const monthlyDebtDelta = useMemo(() => {
		const [year, month] = selectedMonth.split('-').map(Number);
		return allCredits
			.filter((c) => c.status === 'active')
			.reduce((sum, credit) => {
				const scheduleItem = credit.schedule?.find((item) => {
					const itemDate = new Date(item.paymentDate);
					return itemDate.getFullYear() === year && itemDate.getMonth() + 1 === month;
				});
				if (scheduleItem?.paid && scheduleItem.principalPart) {
					return sum + scheduleItem.principalPart;
				}
				return sum;
			}, 0);
	}, [selectedMonth, allCredits]);

	// Вычисляем сумму расходов для выбранного месяца (включая кредиты)
	const totalExpenses = useMemo(() => {
		const regularExpenses = currentMonthData.expenses.reduce((sum, e) => sum + (e.amount || 0), 0);
		// Платежи по кредитам уже вычислены в monthlyCreditPayments
		return regularExpenses + monthlyCreditPayments;
	}, [currentMonthData, monthlyCreditPayments]);

	// Handlers
	const handleSubmit = async (credit: Credit & { schedule?: CreditScheduleItem[] }) => {
		try {
			await saveCredit(credit);
			// Перезагружаем кредиты, чтобы получить актуальный график, построенный на бэкенде
			await useCreditsStore.getState().loadCredits(true);
			setShowForm(false);
			setEditing(null);
			showResultToast({
				type: 'success',
				title: '✅ Кредит сохранен',
				subtitle: credit.name,
			});
		} catch (error) {
			log.error('Failed to save credit', error);
			showResultToast({
				type: 'error',
				title: '❌ Ошибка сохранения',
				subtitle: error instanceof Error ? error.message : 'Не удалось сохранить кредит',
			});
		}
	};

	const handleEdit = (credit: CreditWithSchedule) => {
		setEditing(credit);
		setShowForm(true);
	};

	const handleDelete = async (id: string) => {
		const confirmed = await useUIStore.getState().showConfirm({
			message: UI_TEXTS.DELETE_CREDIT,
			variant: 'danger',
			confirmText: UI_TEXTS.DELETE,
			cancelText: UI_TEXTS.CANCEL,
		});
		if (confirmed) {
			try {
				await deleteCredit(id);
				showResultToast({
					type: 'success',
					title: '✅ Кредит удален',
				});
			} catch (error) {
				log.error('Failed to delete credit', error);
				showResultToast({
					type: 'error',
					title: '❌ Ошибка удаления',
					subtitle: error instanceof Error ? error.message : 'Не удалось удалить кредит',
				});
			}
		}
	};

	const handlePaymentToggle = async (creditId: string, itemId: string, paid: boolean, paidAmount?: number) => {
		try {
			// ВАЖНО: Если paid = false, передаем undefined для paidAmount, чтобы отменить оплату
			// Если paid = true, передаем paidAmount (или undefined, если не указан)
			await applyCreditPayment({
				creditId,
				scheduleItemId: itemId,
				paidAmount: paid ? paidAmount : undefined,
			});
			// Перезагружаем кредиты, чтобы получить актуальное состояние
			await useCreditsStore.getState().loadCredits(true);
			// Store обновится автоматически через applyCreditPayment
			showResultToast({
				type: 'success',
				title: paid ? '✅ Платеж отмечен' : '✅ Платеж отменен',
			});
		} catch (error) {
			log.error('Failed to apply payment', error);
			showResultToast({
				type: 'error',
				title: '❌ Ошибка',
				subtitle: error instanceof Error ? error.message : 'Не удалось применить платеж',
			});
			throw error; // Пробрасываем для обработки в UI
		}
	};

	const handleAddExpense = () => {
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
		const amountValidation = validatePositiveNumber(newExpenseAmount, {
			required: true,
			fieldName: 'Сумма',
		});
		if (!amountValidation.valid || amountValidation.value === undefined) {
			showResultToast({
				type: 'warning',
				title: '⚠️ Неверная сумма',
				subtitle: amountValidation.error || 'Сумма должна быть положительным числом',
			});
			return;
		}
		const amount = amountValidation.value;
		addMonthlyExpense(selectedMonth, newExpenseName.trim(), amount);
		setNewExpenseName('');
		setNewExpenseAmount('');
	};

	const handleEditExpense = (monthKey: string, expenseId: string) => {
		const expense = currentMonthData.expenses.find((e) => e.id === expenseId);
		if (expense) {
			setEditingExpense({ monthKey, expenseId });
			setNewExpenseName(expense.name);
			setNewExpenseAmount(String(expense.amount));
		}
	};

	const handleSaveExpense = () => {
		if (!editingExpense) return;
		if (!newExpenseName.trim() || !newExpenseAmount.trim()) {
			showResultToast({
				type: 'warning',
				title: '⚠️ Заполните все поля',
			});
			return;
		}
		const amount = parseFloat(newExpenseAmount);
		if (isNaN(amount) || amount <= 0) {
			showResultToast({
				type: 'warning',
				title: '⚠️ Неверная сумма',
			});
			return;
		}
		updateMonthlyExpense(editingExpense.monthKey, editingExpense.expenseId, { name: newExpenseName.trim(), amount });
		setEditingExpense(null);
		setNewExpenseName('');
		setNewExpenseAmount('');
	};

	const handleCancelEdit = () => {
		setEditingExpense(null);
		setNewExpenseName('');
		setNewExpenseAmount('');
	};

	return {
		// Credits
		credits: sortedCredits,
		totalDebt,
		monthlyDebtDelta,
		monthlyCreditPayments,
		upcomingPayments,
		
		// Migration
		showMigrationModal,
		setShowMigrationModal,
		migrationCredits,
		
		// Expenses
		availableMonths,
		selectedMonth,
		setSelectedMonth,
		currentMonthData,
		totalExpenses,
		editingExpense,
		newExpenseName,
		setNewExpenseName,
		newExpenseAmount,
		setNewExpenseAmount,
		
		// Form
		showForm,
		setShowForm,
		editing,
		setEditing,
		
		// Handlers
		handleSubmit,
		handleEdit,
		handleDelete,
		handlePaymentToggle,
		handleAddExpense,
		handleEditExpense,
		handleSaveExpense,
		handleCancelEdit,
	};
}

