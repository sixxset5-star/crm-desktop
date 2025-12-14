/**
 * DTO (Data Transfer Object) схемы для клиентов
 */
import { z } from 'zod';

// Схема для контакта
export const ContactSchema = z.object({
	type: z.string().min(1, 'Contact type is required'),
	value: z.string().min(1, 'Contact value is required'),
});

// Схема для доступа
export const AccessSchema = z.object({
	label: z.string().min(1, 'Access label is required'),
	login: z.string(),
	password: z.string(),
});

// Основная схема клиента
export const CustomerSchema = z.object({
	id: z.string().min(1, 'Customer ID is required'),
	name: z.string().min(1, 'Customer name is required'),
	contact: z.string().nullish().optional().transform((val) => val === null ? undefined : val), // Преобразуем null в undefined
	contacts: z.array(ContactSchema).optional(),
	avatar: z.union([z.string(), z.null()]).optional(), // Разрешаем string, null и undefined (нормализация происходит в сервисе)
	comment: z.union([z.string(), z.null()]).optional(), // Разрешаем string, null и undefined (нормализация происходит в сервисе)
	accesses: z.array(AccessSchema).optional(),
}); // Убрали strict() чтобы не ломать старые данные из БД

// Схема для создания клиента
export const CreateCustomerSchema = CustomerSchema.omit({
	// createdAt, updatedAt не нужны для клиентов
}).partial({
	id: true, // ID может быть сгенерирован
});

// Схема для обновления клиента
export const UpdateCustomerSchema = CustomerSchema.partial().required({
	id: true,
});

// Схема для массива клиентов
export const CustomersArraySchema = z.array(CustomerSchema);

/**
 * Валидация клиента
 */
export function validateCustomer(data) {
	return CustomerSchema.parse(data);
}

/**
 * Валидация данных для создания клиента
 */
export function validateCreateCustomer(data) {
	return CreateCustomerSchema.parse(data);
}

/**
 * Валидация данных для обновления клиента
 */
export function validateUpdateCustomer(data) {
	return UpdateCustomerSchema.parse(data);
}

/**
 * Валидация массива клиентов
 */
export function validateCustomersArray(data) {
	return CustomersArraySchema.parse(data);
}

/**
 * Безопасная валидация с возвратом ошибок
 */
export function safeValidateCustomer(data) {
	const result = CustomerSchema.safeParse(data);
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



