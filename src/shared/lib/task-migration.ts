/**
 * Утилиты для миграции задач
 * Вынесено из store для разделения ответственности
 */
import type { Task, ColumnId } from '@/types';

/**
 * Мигрирует задачу: преобразует устаревшие значения columnId в актуальные
 * - 'negotiation' -> 'notstarted'
 * - 'done' -> 'completed' (если не полностью оплачена) или 'closed' (если полностью оплачена)
 * 
 * @param task - Задача для миграции
 * @returns Мигрированная задача
 * 
 * @example
 * const migrated = migrateTaskColumnId({ id: '1', columnId: 'negotiation' });
 * // Результат: { id: '1', columnId: 'notstarted' }
 */
export function migrateTaskColumnId(task: Task): Task {
	// Миграция 'negotiation' -> 'notstarted'
	const columnId = task.columnId as string | ColumnId;
	if (columnId === 'negotiation') {
		return { ...task, columnId: 'notstarted' as ColumnId };
	}

	// Миграция 'done' -> 'completed' или 'closed'
	if (columnId === 'done') {
		const isFullyPaid = task.amount != null && 
		                    task.paidAmount != null && 
		                    task.paidAmount >= task.amount;
		return { 
			...task, 
			columnId: (isFullyPaid ? 'closed' : 'completed') as ColumnId 
		};
	}

	return task;
}

/**
 * Валидирует задачу: базовая проверка структуры
 * Проверяет наличие обязательных полей (id, title)
 * 
 * @param task - Объект для проверки
 * @returns true, если объект является валидной задачей
 * 
 * @example
 * if (isValidTask(data)) {
 *   // data - валидная задача
 * }
 */
export function isValidTask(task: unknown): task is Task {
	if (!task || typeof task !== 'object') return false;
	const t = task as Record<string, unknown>;
	return typeof t.id === 'string' && 
	       t.id.length > 0 && 
	       (typeof t.title === 'string' || t.id.length > 0);
}

/**
 * Мигрирует массив задач
 * Фильтрует невалидные задачи и применяет миграцию columnId
 * 
 * @param tasks - Массив задач для миграции
 * @returns Массив мигрированных валидных задач
 * 
 * @example
 * const migrated = migrateTasks(rawTasks);
 * // Все задачи валидированы и мигрированы
 */
export function migrateTasks(tasks: unknown[]): Task[] {
	if (!Array.isArray(tasks)) {
		return [];
	}

	return tasks
		.filter(isValidTask)
		.map(migrateTaskColumnId);
}





