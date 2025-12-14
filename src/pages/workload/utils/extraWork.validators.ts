/**
 * Валидаторы для доп работы
 */
import type { ExtraWork, ExtraWorkPayment } from '../types/extra-work.types';
import { parseNumberSafe } from '@/shared/utils/number-validation';

export function validateWorkDates(dates: string[]): { valid: boolean; error?: string } {
	if (!Array.isArray(dates) || dates.length === 0) {
		return { valid: false, error: 'Выберите хотя бы один день работы' };
	}
	
	// Проверяем что все даты валидные
	for (const dateStr of dates) {
		const date = new Date(dateStr);
		if (isNaN(date.getTime())) {
			return { valid: false, error: `Неверная дата: ${dateStr}` };
		}
	}
	
	return { valid: true };
}

export function validateDailyRate(rate: number | string): { valid: boolean; error?: string } {
	const numRate = typeof rate === 'string' ? parseNumberSafe(rate) : rate;
	
	if (numRate === null || numRate === undefined || numRate <= 0) {
		return { valid: false, error: 'Укажите оклад за смену (положительное число)' };
	}
	
	return { valid: true };
}

export function validatePayments(payments: ExtraWorkPayment[]): { valid: boolean; error?: string } {
	if (!Array.isArray(payments)) {
		return { valid: false, error: 'Оплаты должны быть массивом' };
	}
	
	for (const payment of payments) {
		if (!payment.date || !payment.date.trim()) {
			return { valid: false, error: 'Укажите дату оплаты' };
		}
		
		if (!payment.amount || payment.amount <= 0) {
			return { valid: false, error: 'Укажите сумму оплаты' };
		}
		
		const date = new Date(payment.date);
		if (isNaN(date.getTime())) {
			return { valid: false, error: `Неверная дата оплаты: ${payment.date}` };
		}
	}
	
	return { valid: true };
}

export function validateTotalAmount(workDates: string[], dailyRate: number, totalAmount: number): { valid: boolean; error?: string } {
	const expected = workDates.length * dailyRate;
	if (Math.abs(totalAmount - expected) > 0.01) {
		return { valid: false, error: `Неверная итоговая сумма. Ожидается: ${expected}, получено: ${totalAmount}` };
	}
	return { valid: true };
}




