/**
 * DTO (Data Transfer Object) схемы для задач
 * Используется для валидации данных перед обработкой в domain-сервисах
 */
import { z } from 'zod';

// Схема для подзадачи
export const SubTaskSchema = z.object({
	id: z.string(),
	title: z.string().min(1, 'Subtask title is required'),
	done: z.boolean().default(false),
	amount: z.number().optional(),
	date: z.string().optional(),
});

// Схема для ссылки задачи
export const TaskLinkSchema = z.object({
	url: z.string().url('Invalid URL'),
	name: z.string().optional(),
});

// Схема для платежа
export const TaskPaymentSchema = z.object({
	title: z.string().optional(),
	date: z.string().optional(),
	amount: z.number().optional(),
	qty: z.number().optional(),
	price: z.number().optional(),
	paid: z.boolean().optional(),
	taxRate: z.number().optional(),
	calcEnabled: z.boolean().optional(),
});

// Схема для расхода
// title может быть пустым или отсутствовать - нормализация должна это обработать
// Но для валидации после нормализации требуем непустую строку
export const TaskExpenseEntrySchema = z.object({
	id: z.string(),
	title: z.string().min(1, 'Expense title is required'), // После нормализации должно быть непустым
	amount: z.number().min(0, 'Amount must be positive'),
	date: z.string().optional(),
	contractorId: z.string().optional(), // Ссылка на подрядчика, которому относится этот расход
});

// Схема для диапазона паузы
export const TaskPausedRangeSchema = z.object({
	from: z.string(),
	to: z.string(),
});

// Схема для доступа
export const AccessSchema = z.object({
	label: z.string().min(1, 'Access label is required'),
	login: z.string(),
	password: z.string(),
});

// Валидные колонки
const ColumnIdSchema = z.enum([
	'clients',
	'unprocessed',
	'notstarted',
	'inwork',
	'completed',
	'closed',
	'cancelled',
	'paused'
]);

// Валидные приоритеты
const PrioritySchema = z.enum(['high', 'medium', 'low']).optional();

// Основная схема задачи
export const TaskSchema = z.object({
	id: z.string().min(1, 'Task ID is required'),
	title: z.string().min(1, 'Task title is required'),
	amount: z.number().optional(),
	expenses: z.number().optional(),
	paidAmount: z.number().optional(),
	payments: z.array(TaskPaymentSchema).optional(),
	expensesEntries: z.array(TaskExpenseEntrySchema).optional(),
	pausedRanges: z.array(TaskPausedRangeSchema).optional(),
	taxRate: z.number().min(0).max(100).optional(),
	startDate: z.string().optional(),
	deadline: z.string().optional(),
	subtasks: z.array(SubTaskSchema).optional(),
	tags: z.array(z.string()).optional(),
	notes: z.string().optional(),
	customerId: z.string().optional(),
	contractorId: z.string().optional(), // Ссылка на подрядчика-исполнителя задачи
	links: z.array(z.union([z.string().url(), TaskLinkSchema])).optional(),
	files: z.array(z.string()).optional(),
	calculatorQuantity: z.number().optional(),
	calculatorPricePerUnit: z.number().optional(),
	priority: PrioritySchema,
	accesses: z.array(AccessSchema).optional(),
	columnId: ColumnIdSchema,
	pausedFromColumnId: ColumnIdSchema.optional(),
	createdAt: z.string().optional(),
	updatedAt: z.string().optional(),
}); // Убрали strict() чтобы не ломать старые данные из БД

// Схема для создания задачи (без некоторых полей)
export const CreateTaskSchema = TaskSchema.omit({
	createdAt: true,
	updatedAt: true,
}).partial({
	id: true, // ID может быть сгенерирован
});

// Схема для обновления задачи (все поля опциональны, кроме id)
export const UpdateTaskSchema = TaskSchema.partial().required({
	id: true,
});

// Схема для массива задач
export const TasksArraySchema = z.array(TaskSchema);

/**
 * Валидация задачи
 * @param {any} data - Данные для валидации
 * @returns {object} Валидированные данные
 * @throws {z.ZodError} Если валидация не прошла
 */
export function validateTask(data) {
	return TaskSchema.parse(data);
}

/**
 * Валидация данных для создания задачи
 */
export function validateCreateTask(data) {
	return CreateTaskSchema.parse(data);
}

/**
 * Валидация данных для обновления задачи
 */
export function validateUpdateTask(data) {
	return UpdateTaskSchema.parse(data);
}

/**
 * Валидация массива задач
 */
export function validateTasksArray(data) {
	return TasksArraySchema.parse(data);
}

/**
 * Безопасная валидация с возвратом ошибок вместо исключений
 */
export function safeValidateTask(data) {
	const result = TaskSchema.safeParse(data);
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



