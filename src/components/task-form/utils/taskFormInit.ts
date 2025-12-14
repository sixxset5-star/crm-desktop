/**
 * Утилиты для инициализации формы задачи
 * 
 * Разделение логики инициализации на отдельные функции для читаемости
 */
import { generateShortId } from '@/shared/utils/id';
import { normalizeLinks } from '@/store/board';
import type { Task, SubTask } from '@/types';
import type { Payment } from '../useTaskFormCore';

/**
 * Инициализация платежей из различных форматов (legacy и новый)
 */
export function initializePayments(
	data: Partial<Task> | null,
	loadedSubtasks: SubTask[]
): { payments: Payment[]; mode: 'payments' | 'subtasks' } {
	let loadedPayments: Payment[] = [];
	let initialMode: 'payments' | 'subtasks' = 'payments';

	// Если есть подзадачи с датами, определяем режим
	if (loadedSubtasks.length > 0) {
		const subtasksWithDates = loadedSubtasks.filter((s: SubTask) => s.date);
		if (subtasksWithDates.length >= 3) {
			// 3+ подзадач с датами - режим подзадач
			initialMode = 'subtasks';
			// Возвращаем подзадачи как есть, платежи пустые
			return { payments: [], mode: initialMode };
		} else if (subtasksWithDates.length > 0) {
			// 1-2 подзадач с датами - конвертируем в платежи
			loadedPayments = subtasksWithDates.map((s: SubTask, idx: number) => ({
				id: s.id,
				title: s.title || (idx === 0 ? 'Предоплата' : 'Постоплата'),
				date: s.date || '',
				amount: s.amount,
			}));
		}
	}

	// Если платежей нет, проверяем старые форматы
	if (loadedPayments.length === 0) {
		if (data?.payments && data.payments.length > 0) {
			// Новый формат payments
			const paymentsArray = data.payments;
			loadedPayments = (paymentsArray as Array<Partial<Payment>>).map((p, idx: number) => {
				const hasTwo = paymentsArray.length === 2;
				const fallbackTitle = hasTwo ? (idx === 0 ? 'Предоплата' : 'Постоплата') : `Платеж ${idx + 1}`;
				return {
					id: generateShortId(),
					title: p.title ?? fallbackTitle,
					date: p.date || '',
					amount: p.amount,
					qty: p.qty,
					price: p.price,
					paid: p.paid ?? (!!p.date),
					taxRate: p.taxRate ?? 0,
					calcEnabled: p.calcEnabled ?? false,
				} as Payment;
			});
		} else {
			// Начальное состояние - один пустой платеж
			loadedPayments = [{
				id: generateShortId(),
				title: 'Платеж',
				date: '',
				amount: undefined,
				paid: false,
			}];
		}
	}

	return { payments: loadedPayments, mode: 'payments' };
}

/**
 * Инициализация подзадач (фильтруем те, что без дат, если они были конвертированы в платежи)
 */
export function initializeSubtasks(
	data: Partial<Task> | null,
	subtasksWithDates: SubTask[]
): SubTask[] {
	if (subtasksWithDates.length >= 3) {
		// Режим подзадач - возвращаем все
		return subtasksWithDates;
	}
	
	// Режим платежей - возвращаем только подзадачи без дат
	const allSubtasks = (data?.subtasks || []) as SubTask[];
	return allSubtasks.filter((s: SubTask) => !s.date);
}

/**
 * Инициализация калькулятора из сохранённых данных или локального состояния
 */
export function initializeCalculator(
	initial: Task | null | undefined,
	taskId: string,
	savedCalculatorState: { taskId: string | null; quantity: string; pricePerUnit: string; enabled: boolean }
): {
	quantity: string;
	pricePerUnit: string;
	enabled: boolean;
} {
	const hasSavedData = initial?.calculatorQuantity != null || initial?.calculatorPricePerUnit != null;
	const hasLocalState = savedCalculatorState.taskId === taskId && savedCalculatorState.enabled;

	if (hasSavedData) {
		return {
			quantity: initial?.calculatorQuantity != null ? String(initial.calculatorQuantity) : '',
			pricePerUnit: initial?.calculatorPricePerUnit != null ? String(initial.calculatorPricePerUnit) : '',
			enabled: true,
		};
	} else if (hasLocalState) {
		return {
			quantity: savedCalculatorState.quantity,
			pricePerUnit: savedCalculatorState.pricePerUnit,
			enabled: true,
		};
	}

	return {
		quantity: '',
		pricePerUnit: '',
		enabled: false,
	};
}

/**
 * Восстановление данных из localStorage
 */
export function restoreFromLocalStorage(taskId: string): Partial<Task> | null {
	if (taskId === 'new') return null;
	
	try {
		const saved = localStorage.getItem(`taskForm_${taskId}`);
		if (saved) {
			return JSON.parse(saved);
		}
	} catch (error) {
		// Игнорируем ошибки
	}
	return null;
}






