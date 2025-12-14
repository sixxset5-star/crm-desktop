/**
 * DTO (Data Transfer Object) схемы для подрядчиков
 */
import { z } from 'zod';

// Схема для контакта (переиспользуем из customer.dto.js)
export const ContactSchema = z.object({
	type: z.string().min(1, 'Contact type is required'),
	value: z.string().min(1, 'Contact value is required'),
});

// Функция для нормализации null в undefined
const nullToUndefined = (val) => val === null ? undefined : val;

// Основная схема подрядчика
export const ContractorSchema = z.object({
	id: z.string().min(1, 'Contractor ID is required'),
	name: z.string().min(1, 'Contractor name is required'),
	contact: z.preprocess(nullToUndefined, z.string().optional()),
	contacts: z.array(ContactSchema).optional(),
	avatar: z.preprocess(nullToUndefined, z.string().optional()),
	comment: z.preprocess(nullToUndefined, z.string().optional()),
	specialization: z.preprocess(nullToUndefined, z.string().optional()),
	rate: z.preprocess(nullToUndefined, z.union([z.number(), z.string()]).optional()),
	rating: z.union([z.number().min(1).max(5), z.null()]).optional(),
	isActive: z.boolean(),
	createdAt: z.string().optional(),
	updatedAt: z.string().optional(),
});

// Схема для создания подрядчика
export const CreateContractorSchema = ContractorSchema.omit({
	createdAt: true,
	updatedAt: true,
}).partial({
	id: true, // ID может быть сгенерирован
});

// Схема для обновления подрядчика
export const UpdateContractorSchema = ContractorSchema.partial().required({
	id: true,
});

// Схема для массива подрядчиков
export const ContractorsArraySchema = z.array(ContractorSchema);

/**
 * Валидация подрядчика
 */
export function validateContractor(data) {
	return ContractorSchema.parse(data);
}

/**
 * Валидация данных для создания подрядчика
 */
export function validateCreateContractor(data) {
	return CreateContractorSchema.parse(data);
}

/**
 * Валидация данных для обновления подрядчика
 */
export function validateUpdateContractor(data) {
	return UpdateContractorSchema.parse(data);
}

/**
 * Валидация массива подрядчиков
 */
export function validateContractorsArray(data) {
	return ContractorsArraySchema.parse(data);
}

/**
 * Безопасная валидация с возвратом ошибок
 */
export function safeValidateContractor(data) {
	const result = ContractorSchema.safeParse(data);
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
