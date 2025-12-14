import type { Task } from '@/domain/task';
import type { TaskPayment } from '@/types';
import type { TaxPaidFlag } from '@/store/taxes';
import { getTaxYearKeyByDate } from './taxYearUtils';

export type DerivedTax = {
	key: string;
	title: string; // За что
	paymentTitle: string;
	taxRate: number;
	paymentAmount: number;
	taxAmount: number;
	date?: string;
	paid: boolean;
	yearKey: string;
};

/**
 * Вычисляет сумму платежа из объекта платежа
 * Использует amount если есть, иначе qty * price
 * 
 * @param payment - Платеж для расчета
 * @returns Сумма платежа
 */
function calculatePaymentSum(payment: TaskPayment): number {
	if (payment.amount != null && Number.isFinite(Number(payment.amount))) {
		return Number(payment.amount);
	}
	return (Number(payment.qty) || 0) * (Number(payment.price) || 0);
}

/**
 * Получает ставку налога для платежа
 * Приоритет: payment.taxRate > task.taxRate > 0
 * 
 * @param payment - Платеж
 * @param task - Задача, к которой относится платеж
 * @returns Ставка налога в процентах
 */
function getPaymentTaxRate(payment: TaskPayment, task: Task): number {
	if (typeof payment.taxRate === 'number') {
		return payment.taxRate;
	}
	if (typeof task.taxRate === 'number') {
		return task.taxRate;
	}
	return 0;
}

/**
 * Вычисляет производные данные о налогах из задач
 * Создает записи о налогах для каждого платежа с ненулевой ставкой
 * Учитывает флаги оплаты налогов
 * 
 * @param tasks - Список задач
 * @param paidFlags - Флаги оплаты налогов
 * @returns Массив производных данных о налогах, отсортированный по дате и статусу оплаты
 * 
 * @example
 * const taxes = calculateDerivedTaxes(tasks, paidFlags);
 * taxes.forEach(tax => {
 *   console.log(tax.title, tax.taxAmount, tax.paid);
 * });
 */
export function calculateDerivedTaxes(tasks: Task[], paidFlags: TaxPaidFlag[]): DerivedTax[] {
	const paidMap = new Map(paidFlags.map((flag) => [flag.key, flag.paid]));
	const rows: DerivedTax[] = [];

	for (const task of tasks) {
		const payments = Array.isArray(task.payments) ? task.payments : [];
		payments.forEach((p, idx) => {
			if (!p) return;

			const paymentRate = getPaymentTaxRate(p, task);
			if (!paymentRate || paymentRate <= 0) return;

			const paymentSum = calculatePaymentSum(p);
			if (!paymentSum || paymentSum <= 0) return;

			const taxAmount = Math.round(paymentSum * paymentRate) / 100;
			const key = `${task.id}:${idx}`;
			const yearKey = getTaxYearKeyByDate(p.date);

			rows.push({
				key,
				title: task.title || 'Без названия',
				paymentTitle: p.title || 'Платеж',
				taxRate: paymentRate,
				paymentAmount: paymentSum,
				taxAmount,
				date: p.date,
				paid: paidMap.get(key) ?? false,
				yearKey,
			});
		});
	}

	// Сортировка: сначала не оплаченные, затем по дате платежа
	return rows.sort((a, b) => {
		if (a.paid !== b.paid) return a.paid ? 1 : -1;
		const ta = a.date ? new Date(a.date).getTime() : 0;
		const tb = b.date ? new Date(b.date).getTime() : 0;
		return ta - tb;
	});
}

/**
 * Вычисляет общую сумму налогов из массива производных данных
 * 
 * @param taxes - Массив производных данных о налогах
 * @returns Общая сумма всех налогов
 * 
 * @example
 * const total = calculateTotalTaxes(taxes); // Сумма всех налогов
 */
export function calculateTotalTaxes(taxes: DerivedTax[]): number {
	return taxes.reduce((sum, tax) => sum + tax.taxAmount, 0);
}

/**
 * Вычисляет сумму неоплаченных налогов из массива производных данных
 * 
 * @param taxes - Массив производных данных о налогах
 * @returns Сумма неоплаченных налогов
 * 
 * @example
 * const unpaid = calculateUnpaidTaxes(taxes); // Сумма неоплаченных налогов
 */
export function calculateUnpaidTaxes(taxes: DerivedTax[]): number {
	return taxes.filter((tax) => !tax.paid).reduce((sum, tax) => sum + tax.taxAmount, 0);
}






