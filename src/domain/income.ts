// Domain слой для Income - бизнес-логика работы с доходами
import type { Income } from '@/types';

/**
 * Рассчитывает чистый доход (после вычета налога)
 */
export function calculateNetIncome(income: Income): number {
	const amount = income.amount || 0;
	const taxRate = income.taxRate || 0;
	const taxAmount = (amount * taxRate) / 100;
	return amount - taxAmount;
}

/**
 * Рассчитывает сумму налога
 */
export function calculateTaxAmount(income: Income): number {
	const amount = income.amount || 0;
	const taxRate = income.taxRate || 0;
	return (amount * taxRate) / 100;
}











