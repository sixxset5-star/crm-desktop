/**
 * DTO схемы для налогов
 */
import { z } from 'zod';

export const TaxPaidFlagSchema = z.object({
	key: z.string().min(1, 'Tax key is required'),
	paid: z.boolean().default(false),
}).strict();

export const TaxesArraySchema = z.array(TaxPaidFlagSchema);

export function validateTaxPaidFlag(data) {
	return TaxPaidFlagSchema.parse(data);
}

export function validateTaxesArray(data) {
	return TaxesArraySchema.parse(data);
}

export function safeValidateTaxPaidFlag(data) {
	const result = TaxPaidFlagSchema.safeParse(data);
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

 * DTO схемы для налогов
 */
import { z } from 'zod';

export const TaxPaidFlagSchema = z.object({
	key: z.string().min(1, 'Tax key is required'),
	paid: z.boolean().default(false),
}).strict();

export const TaxesArraySchema = z.array(TaxPaidFlagSchema);

export function validateTaxPaidFlag(data) {
	return TaxPaidFlagSchema.parse(data);
}

export function validateTaxesArray(data) {
	return TaxesArraySchema.parse(data);
}

export function safeValidateTaxPaidFlag(data) {
	const result = TaxPaidFlagSchema.safeParse(data);
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




