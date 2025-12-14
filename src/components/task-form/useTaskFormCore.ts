/**
 * useTaskFormCore - Чистая бизнес-логика формы задачи
 * 
 * Только данные, расчеты, валидация, нормализация.
 * НИ ОДНОГО UI-состояния.
 */
import { useMemo } from 'react';
import { prepareTaskForSave, validateTask } from '@/domain/task';
import { calculatePaymentsTotal, calculatePaidPaymentsTotal } from '@/domain/task';
import type { Task, TaskLink, TaskPayment } from '@/types';
import { normalizeLinks } from '@/store/board';
import { createLogger } from '@/shared/lib/logger';

const log = createLogger('TaskFormCore');

export type Payment = {
	id: string;
	title: string;
	date?: string;
	amount?: number;
	qty?: number;
	price?: number;
	calcEnabled?: boolean;
	paid?: boolean;
	taxRate?: number;
};

export type ExpenseItem = {
	id: string;
	title: string;
	amount: number;
	date?: string;
};

export type TaskFormData = {
	title: string;
	deadline: string;
	startDate: string;
	notes: string;
	customerId: string;
	contractorId?: string;
	payments: Payment[];
	expensesItems: ExpenseItem[];
	tags: string[];
	links: TaskLink[];
	files: string[];
	calculatorQuantity: string;
	calculatorPricePerUnit: string;
	useCalculator: boolean;
	priority: Task['priority'];
	pausedRanges: Array<{ from: string; to: string }>;
	accesses: Array<{ label: string; login: string; password: string }>;
};

export type ValidationErrors = {
	title?: string;
	amount?: string;
	deadline?: string;
	startDate?: string;
	dateOrder?: string;
	payments?: Record<string, string>;
	subtasks?: string;
};

/**
 * Валидация формы
 */
export function validateFormData(data: TaskFormData): ValidationErrors {
	const errors: ValidationErrors = {};

	if (!data.title.trim()) {
		errors.title = 'Название задачи обязательно';
	}

	if (data.deadline) {
		const deadlineDate = new Date(data.deadline);
		if (isNaN(deadlineDate.getTime())) {
			errors.deadline = 'Некорректная дата окончания';
		}
	}

	if (data.startDate) {
		const startDateObj = new Date(data.startDate);
		if (isNaN(startDateObj.getTime())) {
			errors.startDate = 'Некорректная дата начала';
		}
	}

	if (data.startDate && data.deadline) {
		const startDateObj = new Date(data.startDate);
		const deadlineDate = new Date(data.deadline);
		if (startDateObj > deadlineDate) {
			errors.dateOrder = 'Дата начала не может быть позже даты окончания';
		}
	}

	return errors;
}

// Валидация платежей теперь в useTaskPayments (включая dateOrder)

/**
 * Валидация подзадач
 */
export function validateSubtasks(
	subtasks: Array<{ id: string; title: string; done: boolean; amount?: number; date?: string }>,
	paymentMode: 'payments' | 'subtasks'
): string | undefined {
	if (paymentMode === 'subtasks') {
		const invalid = subtasks.find(s => s.done && !s.date);
		if (invalid) {
			return 'Укажите дату для оплаченной строки';
		}
	}
	return undefined;
}

/**
 * Валидация URL
 */
export function isValidUrl(url: string): { valid: boolean; error?: string } {
	const trimmed = url.trim();
	if (!trimmed) {
		return { valid: false, error: 'Введите ссылку' };
	}
	try {
		if (trimmed.startsWith('file://')) {
			if (!/^file:\/\/.+/.test(trimmed)) {
				return { valid: false, error: 'Некорректный формат file:// URL' };
			}
		} else if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
			new URL(trimmed);
		} else {
			return { valid: false, error: 'Ссылка должна начинаться с http://, https:// или file://' };
		}
		return { valid: true };
	} catch (error) {
		return { valid: false, error: 'Некорректный формат URL' };
	}
}

/**
 * Нормализация платежей для domain слоя
 * Сохраняет все платежи, включая те, у которых есть сумма или калькулятор
 */
function normalizePayments(payments: Payment[]): TaskPayment[] {
	return payments.map((p) => {
		const paymentAmount = (p.qty != null && p.price != null) ? (p.qty * p.price) : p.amount;
		return {
			title: p.title,
			date: p.date,
			paid: p.paid,
			taxRate: p.taxRate,
			calcEnabled: p.calcEnabled,
			...(p.qty != null && p.price != null
				? { qty: p.qty, price: p.price }
				: { amount: paymentAmount }
			),
		};
	});
}

/**
 * Хук с чистой бизнес-логикой
 */
export function useTaskFormCore(formData: TaskFormData) {
	// Расчет суммы платежей
	const paymentsTotal = useMemo(() => {
		return calculatePaymentsTotal(normalizePayments(formData.payments));
	}, [formData.payments]);

	// Расчет суммы оплаченных платежей
	const paidPaymentsTotal = useMemo(() => {
		return calculatePaidPaymentsTotal(normalizePayments(formData.payments));
	}, [formData.payments]);

	// Расчет суммы расходов
	const expensesTotal = useMemo(() => {
		return formData.expensesItems.reduce((sum, it) => sum + (it.amount || 0), 0);
	}, [formData.expensesItems]);

	// Валидация формы
	const formErrors = useMemo(() => validateFormData(formData), [formData]);

	// Валидация платежей теперь полностью в useTaskPayments

	// Валидация всех данных перед сохранением
	const validateAll = (
		paymentMode: 'payments' | 'subtasks',
		payments: Payment[],
		subtasks?: Array<{ id: string; title: string; done: boolean; amount?: number; date?: string }>,
		paymentErrors?: Record<string, string>
	): string | null => {
		// Валидация формы
		if (formErrors.title || formErrors.deadline || formErrors.startDate || formErrors.dateOrder) {
			return formErrors.title || formErrors.deadline || formErrors.startDate || formErrors.dateOrder || 'Ошибка валидации';
		}

		// Валидация платежей
		if (paymentMode === 'payments' && payments.length > 0) {
			if (paymentErrors && Object.keys(paymentErrors).length > 0) {
				return Object.values(paymentErrors)[0];
			}
		}

		// Валидация подзадач
		if (paymentMode === 'subtasks' && subtasks) {
			const subtasksError = validateSubtasks(subtasks, paymentMode);
			if (subtasksError) {
				return subtasksError;
			}
		}

		return null;
	};

	// Подготовка данных для сохранения через domain слой
	const prepareForSave = (options?: {
		files?: string[];
		customerId?: string;
		contractorId?: string;
		paymentMode?: 'payments' | 'subtasks';
		subtasks?: Array<{ id: string; title: string; done: boolean; amount?: number; date?: string }>;
	}) => {
		// Обработка paymentMode и subtasks
		// Отладочное логирование для проверки количества платежей
		log.debug('prepareForSave - Input payments', { 
			count: formData.payments.length, 
			payments: formData.payments 
		});
		let finalPayments = normalizePayments(formData.payments);
		log.debug('prepareForSave - After normalizePayments', { 
			count: finalPayments.length, 
			payments: finalPayments 
		});
		let finalAmount: number | undefined = undefined;
		let finalPaidAmount: number | undefined = undefined;
		let finalSubtasks = options?.subtasks;

		if (options?.paymentMode === 'subtasks' && options.subtasks) {
			const subtasksTotal = options.subtasks.reduce((sum, s) => sum + (s.amount || 0), 0);
			finalAmount = subtasksTotal > 0 ? subtasksTotal : undefined;
			finalPaidAmount = subtasksTotal > 0 ? subtasksTotal : undefined;
			finalPayments = undefined;
		} else if (options?.paymentMode === 'payments' && finalPayments.length > 0) {
			// Сумма из платежей уже считается в domain/task
		}

		const payload = prepareTaskForSave({
			title: formData.title,
			payments: finalPayments,
			expensesItems: formData.expensesItems,
			deadline: formData.deadline || undefined,
			startDate: formData.startDate || undefined,
			notes: formData.notes || undefined,
			customerId: options?.customerId || formData.customerId || undefined,
			contractorId: options?.contractorId || formData.contractorId || undefined,
			pausedRanges: formData.pausedRanges,
			tags: formData.tags,
			links: formData.links,
			files: options?.files || formData.files,
			useCalculator: formData.useCalculator,
			calculatorQuantity: formData.calculatorQuantity,
			calculatorPricePerUnit: formData.calculatorPricePerUnit,
			priority: formData.priority,
			accesses: formData.accesses,
		});

		// Переопределяем amount и paidAmount для режима subtasks
		if (finalAmount !== undefined) {
			payload.amount = finalAmount;
		}
		if (finalPaidAmount !== undefined) {
			payload.paidAmount = finalPaidAmount;
		}
		if (finalSubtasks !== undefined) {
			payload.subtasks = finalSubtasks.length > 0 ? finalSubtasks : undefined;
		}

		return payload;
	};

	return {
		paymentsTotal,
		paidPaymentsTotal,
		expensesTotal,
		formErrors,
		prepareForSave,
		validateAll,
		isValidUrl,
		validateSubtasks,
	};
}

