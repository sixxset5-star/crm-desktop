/**
 * DTO схемы для доходов
 */
import { z } from 'zod';

export const IncomeSchema = z.object({
	id: z.string().min(1, 'Income ID is required'),
	title: z.string().min(1, 'Income title is required'),
	amount: z.number().min(0, 'Amount must be positive'),
	date: z.string().min(1, 'Date is required'),
	taxRate: z.number().min(0).max(100).optional(),
	notes: z.string().optional(),
	createdAt: z.string().optional(),
	updatedAt: z.string().optional(),
}).strict();

export const IncomesArraySchema = z.array(IncomeSchema);

export function validateIncome(data) {
	return IncomeSchema.parse(data);
}

export function validateIncomesArray(data) {
	return IncomesArraySchema.parse(data);
}

export function safeValidateIncome(data) {
	const result = IncomeSchema.safeParse(data);
	if (!result.success) {
		return {
			success: false,
			errors: result.error.errors,
			message: result.error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ')
		};
	}
	return {
		success: true,
		data: result.data
	};
}

 * DTO схемы для доходов
 */
import { z } from 'zod';

export const IncomeSchema = z.object({
	id: z.string().min(1, 'Income ID is required'),
	title: z.string().min(1, 'Income title is required'),
	amount: z.number().min(0, 'Amount must be positive'),
	date: z.string().min(1, 'Date is required'),
	taxRate: z.number().min(0).max(100).optional(),
	notes: z.string().optional(),
	createdAt: z.string().optional(),
	updatedAt: z.string().optional(),
}).strict();

export const IncomesArraySchema = z.array(IncomeSchema);

export function validateIncome(data) {
	return IncomeSchema.parse(data);
}

export function validateIncomesArray(data) {
	return IncomesArraySchema.parse(data);
}

export function safeValidateIncome(data) {
	const result = IncomeSchema.safeParse(data);
	if (!result.success) {
		return {
			success: false,
			errors: result.error.errors,
			message: result.error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ')
		};
	}
	return {
		success: true,
		data: result.data
	};
}




