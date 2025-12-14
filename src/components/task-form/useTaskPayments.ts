/**
 * useTaskPayments - Полноценный core-модуль для работы с платежами
 * 
 * Вся бизнес-логика платежей: добавление, удаление, обновление,
 * автоматическое переименование, сортировка, валидация, нормализация,
 * конвертация старых форматов, определение paymentMode.
 */
import { useCallback, useMemo } from 'react';
import { generateShortId } from '@/shared/utils/id';
import type { Payment } from './useTaskFormCore';
import type { SubTask } from '@/types';

export type { Payment };

export type PaymentMode = 'payments' | 'subtasks';

/**
 * Старый формат платежа (без id, используется для конвертации из старых данных)
 */
type OldPaymentFormat = {
	title?: string;
	date?: string;
	amount?: number;
	qty?: number;
	price?: number;
	paid?: boolean;
	taxRate?: number;
	calcEnabled?: boolean;
};

export type PaymentActions = {
	addPayment: () => void;
	removePayment: (id: string) => void;
	updatePayment: (id: string, updates: Partial<Payment>) => void;
	applyTemplate: (subtasks: Array<{ title?: string; amount?: number; date?: string }>, templateName?: string) => void;
	setPaymentMode: (mode: PaymentMode) => void;
};

export type PaymentCore = {
	actions: PaymentActions;
	errors: Record<string, string>;
	getTotal: () => number;
	normalize: (payments: Payment[]) => Array<{ title: string; date: string; amount: number; qty?: number; price?: number }>;
	convertOldFormats: (initialPayments: OldPaymentFormat[]) => Payment[];
	determineMode: (payments: Payment[], subtasks?: SubTask[]) => PaymentMode;
};

/**
 * Автоматическое переименование платежей при изменении количества
 */
function autoRenamePayments(payments: Payment[]): Payment[] {
	if (payments.length === 1) {
		return payments.map(p => ({ ...p, title: 'Платеж' }));
	} else if (payments.length === 2) {
		return payments.map((p, idx) => ({
			...p,
			title: idx === 0 ? 'Предоплата' : 'Постоплата',
		}));
	}
	return payments;
}

/**
 * Автоматическая сортировка платежей по датам и переименование
 */
function autoSortPayments(payments: Payment[]): Payment[] {
	if (payments.length !== 2) {
		return payments;
	}

	const sorted = [...payments].sort((a, b) => {
		if (!a.date) return 1;
		if (!b.date) return -1;
		return new Date(a.date).getTime() - new Date(b.date).getTime();
	});

	if (sorted.length >= 2 && sorted[0]?.date && sorted[1]?.date) {
		sorted[0].title = 'Предоплата';
		sorted[1].title = 'Постоплата';
	}

	return sorted;
}

/**
 * Нормализация платежей для сравнения (игнорирует ID и пустые плейсхолдеры)
 * Возвращает упрощённую структуру для сравнения
 * Экспортируется для использования в других модулях (например, hasChanges)
 */
export function normalizePayments(payments: Payment[]): Array<{ title: string; date: string; amount: number; qty?: number; price?: number }> {
	const nonEmpty = payments.filter(pp => {
		const hasAmount = (pp.amount ?? 0) > 0;
		const hasCalc = (pp.qty ?? 0) > 0 && (pp.price ?? 0) > 0;
		const hasDate = !!pp.date;
		return hasAmount || hasCalc || hasDate;
	});
	
	return [...nonEmpty].sort((a, b) => {
		if ((a.date || '') !== (b.date || '')) return (a.date || '').localeCompare(b.date || '');
		if ((a.amount || 0) !== (b.amount || 0)) return (a.amount || 0) - (b.amount || 0);
		return (a.title || '').localeCompare(b.title || '');
	}).map(p => ({
		title: p.title || '',
		date: p.date || '',
		amount: p.amount || 0,
		qty: p.qty,
		price: p.price,
	}));
}

/**
 * Конвертация старых форматов платежей
 */
function convertOldFormats(initialPayments: OldPaymentFormat[]): Payment[] {
	if (!initialPayments || initialPayments.length === 0) {
		return [];
	}
	
	return initialPayments.map((p, idx) => ({
		id: `initial_${idx}`, // Стабильный ID для сравнения
		title: p.title || (idx === 0 ? 'Предоплата' : idx === 1 ? 'Постоплата' : `Платеж ${idx + 1}`),
		date: p.date || '',
		amount: p.amount,
		qty: p.qty,
		price: p.price,
		paid: p.paid,
		taxRate: p.taxRate ?? 0,
		calcEnabled: p.calcEnabled,
	}));
}

/**
 * Определение paymentMode на основе данных
 */
function determineMode(payments: Payment[], subtasks?: SubTask[]): PaymentMode {
	if (payments && payments.length >= 3) {
		return 'subtasks';
	}
	if (subtasks && subtasks.length >= 3) {
		const subtasksWithDates = subtasks.filter(s => s.date);
		if (subtasksWithDates.length >= 3) {
			return 'subtasks';
		}
	}
	return 'payments';
}

/**
 * Вычисление общей суммы платежей
 */
function computeTotal(payments: Payment[]): number {
	return payments.reduce((sum, p) => {
		if (p.calcEnabled && p.qty != null && p.price != null) {
			return sum + (p.qty * p.price);
		}
		return sum + (p.amount || 0);
	}, 0);
}

/**
 * Хук для работы с платежами (полноценный core-модуль)
 */
export function useTaskPayments(
	payments: Payment[],
	setPayments: React.Dispatch<React.SetStateAction<Payment[]>>,
	paymentMode: PaymentMode,
	setPaymentMode: React.Dispatch<React.SetStateAction<PaymentMode>>,
	setSubtasks?: React.Dispatch<React.SetStateAction<SubTask[]>>,
	setAppliedTemplateName?: (name: string | null) => void
): PaymentCore {
	const addPayment = useCallback(() => {
		const newPayment: Payment = {
			id: generateShortId(),
			title: 'Платеж',
			date: '',
			amount: undefined,
			taxRate: 0,
		};
		const updatedPayments = autoRenamePayments([...payments, newPayment]);
		setPayments(updatedPayments);
	}, [payments, setPayments]);

	const removePayment = useCallback((id: string) => {
		const updatedPayments = payments.filter(p => p.id !== id);
		const renamed = autoRenamePayments(updatedPayments);
		setPayments(renamed);
	}, [payments, setPayments]);

	const updatePayment = useCallback((id: string, updates: Partial<Payment>) => {
		if (payments.length === 2 && updates.date) {
			// Автоматическая сортировка по датам при изменении для 2 платежей
			const updatedPayments = payments.map(p => {
				if (p.id === id) {
					return { ...p, ...updates };
				}
				return p;
			});
			const sorted = autoSortPayments(updatedPayments);
			setPayments(sorted);
		} else {
			// Обычное обновление
			setPayments(payments.map(p => {
				if (p.id === id) {
					return { ...p, ...updates };
				}
				return p;
			}));
		}
	}, [payments, setPayments]);

	const applyTemplate = useCallback((
		subtasks: Array<{ title?: string; amount?: number; date?: string }>,
		templateName?: string
	) => {
		const mapped = subtasks.map((s) => ({
			id: generateShortId(),
			title: s.title || 'Платеж',
			amount: s.amount,
			date: s.date,
			paid: !!s.date,
		} as Payment));
		setPayments(mapped);
		setPaymentMode('payments');
		if (setSubtasks) {
			setSubtasks([]);
		}
		if (setAppliedTemplateName && templateName) {
			setAppliedTemplateName(templateName);
		}
	}, [setPayments, setPaymentMode, setSubtasks, setAppliedTemplateName]);

	const actions: PaymentActions = {
		addPayment,
		removePayment,
		updatePayment,
		applyTemplate,
		setPaymentMode,
	};

	// Вычисление ошибок валидации платежей
	const errors = useMemo(() => {
		const paymentErrors: Record<string, string> = {};
		
		payments.forEach((p) => {
			if (p.paid && !p.date) {
				paymentErrors[`${p.id}_date`] = 'Дата обязательна';
			}
			if (p.calcEnabled) {
				const qty = p.qty ?? 0;
				const price = p.price ?? 0;
				if (qty <= 0 || price <= 0) {
					paymentErrors[`${p.id}_calc`] = 'Количество и цена должны быть больше 0';
				}
			} else {
				const amount = p.amount ?? 0;
				if (amount < 0.01) {
					paymentErrors[`${p.id}_amount`] = 'Сумма должна быть не менее 0.01';
				}
			}
		});

		// Валидация dateOrder (бизнес-правило платежей)
		if (payments.length === 2 && payments[0].date && payments[1].date) {
			const date1 = new Date(payments[0].date);
			const date2 = new Date(payments[1].date);
			if (date1 > date2 && payments[0].title === 'Предоплата' && payments[1].title === 'Постоплата') {
				paymentErrors.dateOrder = 'Дата предоплаты должна быть раньше даты постоплаты';
			}
		}

		return paymentErrors;
	}, [payments]);

	// Вычисление общей суммы
	const getTotal = useCallback(() => computeTotal(payments), [payments]);

	return {
		actions,
		errors,
		getTotal,
		normalize: normalizePayments,
		convertOldFormats,
		determineMode,
	};
}
