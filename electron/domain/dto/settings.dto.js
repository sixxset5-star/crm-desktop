/**
 * DTO схемы для настроек
 */
import { z } from 'zod';

// Схема для праздника
const HolidaySchema = z.object({
	id: z.string(),
	date: z.string(),
	name: z.string(),
	recurring: z.boolean().optional(),
});

// Базовые настройки (можно расширять по мере необходимости)
export const SettingsSchema = z.object({
	// Общие настройки
	theme: z.enum(['light', 'dark', 'auto']).optional(),
	language: z.string().optional(),
	
	// Финансовые настройки
	defaultTaxRate: z.number().min(0).max(100).optional(),
	currency: z.string().optional(),
	dateFormat: z.string().optional(),
	incomeLogic: z.enum(['all', 'done']).optional(),
	
	// Уведомления
	notificationsEnabled: z.boolean().optional(),
	notificationSound: z.boolean().optional(),
	notificationDaysBefore: z.number().optional(),
	
	// Архивация
	autoArchiveEnabled: z.boolean().optional(),
	autoArchiveDays: z.number().optional(),
	
	// Отображение
	compactMode: z.boolean().optional(),
	showTaskProgress: z.boolean().optional(),
	
	// Фильтрация
	taskFilterMonths: z.number().optional(),
	
	// Приоритеты
	priorityColors: z.object({
		high: z.string().optional(),
		medium: z.string().optional(),
		low: z.string().optional(),
	}).optional(),
	
	// Автосохранение
	autosaveInterval: z.number().optional(),
	
	// Экспорт
	autoBackupEnabled: z.boolean().optional(),
	autoBackupInterval: z.number().optional(),
	
	// Калькулятор
	calculatorPhotoMultiplier: z.number().optional(),
	calculatorUrgentMultiplier: z.number().optional(),
	
	// Шаблоны подзадач
	subtaskTemplates: z.array(z.object({
		name: z.string(),
		subtasks: z.array(z.object({
			title: z.string(),
			amount: z.number().optional(),
		})),
	})).optional(),
	
	// Выходные дни и праздники
	customWeekends: z.array(z.string()).optional(), // даты в формате YYYY-MM-DD
	excludedWeekends: z.array(z.string()).optional(), // даты в формате YYYY-MM-DD
	weekendTasks: z.record(z.string(), z.array(z.string())).optional(), // { [date: string]: string[] }
	holidays: z.array(HolidaySchema).optional(), // массив праздников
	
	// Прочее - разрешаем любые дополнительные поля для обратной совместимости
}).passthrough(); // passthrough позволяет дополнительные поля

export function validateSettings(data) {
	return SettingsSchema.parse(data);
}

export function safeValidateSettings(data) {
	const result = SettingsSchema.safeParse(data);
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





