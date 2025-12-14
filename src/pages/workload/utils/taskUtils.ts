/**
 * Утилиты для работы с задачами
 */

import type { Task } from '@/store/board';
import type { Customer } from '@/store/customers';
import { PRIORITY_ORDER, AVATAR_WIDTH, CHIP_GAP, CHIP_PADDING_LEFT, CHIP_PADDING_RIGHT, CHAR_WIDTH } from './constants';

/**
 * Проверяет, попадает ли задача на указанный день
 */
export function isTaskOnDay(task: Task, day: Date): boolean {
	if (!task.startDate && !task.deadline) return false;
	const dayStart = new Date(day.getFullYear(), day.getMonth(), day.getDate());
	let taskStart: Date;
	let taskEnd: Date;
	
	if (task.startDate && task.deadline) {
		taskStart = new Date(task.startDate);
		taskEnd = new Date(task.deadline);
	} else if (task.startDate) {
		taskStart = new Date(task.startDate);
		taskEnd = new Date(task.startDate);
	} else if (task.deadline) {
		taskStart = new Date(task.deadline);
		taskEnd = new Date(task.deadline);
	} else {
		return false;
	}
	
	const taskStartDay = new Date(taskStart.getFullYear(), taskStart.getMonth(), taskStart.getDate());
	const taskEndDay = new Date(taskEnd.getFullYear(), taskEnd.getMonth(), taskEnd.getDate());
	const inRange = dayStart >= taskStartDay && dayStart <= taskEndDay;
	if (!inRange) return false;
	
	// Учитываем паузы
	const pauses = task.pausedRanges || [];
	for (const p of pauses) {
		if (!p?.from || !p?.to) continue;
		const ps = new Date(p.from);
		const pe = new Date(p.to);
		const psDay = new Date(ps.getFullYear(), ps.getMonth(), ps.getDate());
		const peDay = new Date(pe.getFullYear(), pe.getMonth(), pe.getDate());
		if (dayStart >= psDay && dayStart <= peDay) {
			return false;
		}
	}
	return true;
}

/**
 * Оценивает примерную ширину чипа заказчика на основе имени
 */
export function estimateChipWidth(customerName: string): number {
	const textWidth = customerName.length * CHAR_WIDTH;
	return AVATAR_WIDTH + CHIP_GAP + CHIP_PADDING_LEFT + CHIP_PADDING_RIGHT + textWidth;
}

/**
 * Оптимизирует порядок задач для минимизации количества строк при отображении заказчиков
 */
export function optimizeTaskOrder(
	tasks: Task[],
	customers: Customer[],
	containerWidth: number,
	gap: number = CHIP_GAP
): Task[] {
	if (tasks.length === 0 || containerWidth <= 0) return tasks;
	
	// Создаем массив с информацией о задаче и ширине её чипа
	const taskItems = tasks.map(task => {
		const customer = customers.find(c => c.id === task.customerId);
		const name = customer?.name || task.title;
		const width = estimateChipWidth(name);
		return { task, width };
	});
	
	// Сортируем по убыванию ширины (First Fit Decreasing алгоритм)
	taskItems.sort((a, b) => b.width - a.width);
	
	// Распределяем по строкам
	const rows: Array<Array<{ task: Task; width: number }>> = [];
	
	for (const item of taskItems) {
		let placed = false;
		
		// Пытаемся разместить в существующей строке
		for (const row of rows) {
			const rowWidth = row.reduce((sum, i) => sum + i.width + gap, -gap); // -gap чтобы не считать последний gap
			if (rowWidth + gap + item.width <= containerWidth) {
				row.push(item);
				placed = true;
				break;
			}
		}
		
		// Если не поместился, создаем новую строку
		if (!placed) {
			rows.push([item]);
		}
	}
	
	// Собираем результат в порядке строк
	const optimized: Task[] = [];
	for (const row of rows) {
		for (const item of row) {
			optimized.push(item.task);
		}
	}
	
	return optimized;
}

/**
 * Сортирует задачи по приоритету
 */
export function sortTasksByPriority(tasks: Task[]): Task[] {
	return [...tasks].sort((a, b) => {
		const aPriority = PRIORITY_ORDER[a.priority || 'medium'] || 2;
		const bPriority = PRIORITY_ORDER[b.priority || 'medium'] || 2;
		return bPriority - aPriority;
	});
}

/**
 * Получает задачи для выходного дня
 */
export function getTasksForWeekend(day: Date, tasks: Task[]): Task[] {
	const dayStart = new Date(day.getFullYear(), day.getMonth(), day.getDate());
	
	return tasks.filter((t) => {
		if (!t.startDate && !t.deadline) return false;
		
		let taskStart: Date;
		let taskEnd: Date;
		
		if (t.startDate && t.deadline) {
			taskStart = new Date(t.startDate);
			taskEnd = new Date(t.deadline);
		} else if (t.startDate) {
			taskStart = new Date(t.startDate);
			taskEnd = new Date(t.startDate);
		} else if (t.deadline) {
			taskStart = new Date(t.deadline);
			taskEnd = new Date(t.deadline);
		} else {
			return false;
		}
		
		const taskStartDay = new Date(taskStart.getFullYear(), taskStart.getMonth(), taskStart.getDate());
		const taskEndDay = new Date(taskEnd.getFullYear(), taskEnd.getMonth(), taskEnd.getDate());
		const inRange = dayStart >= taskStartDay && dayStart <= taskEndDay;
		if (!inRange) return false;
		
		// Учитываем паузы
		const pauses = t.pausedRanges || [];
		for (const p of pauses) {
			if (!p?.from || !p?.to) continue;
			const ps = new Date(p.from);
			const pe = new Date(p.to);
			const psDay = new Date(ps.getFullYear(), ps.getMonth(), ps.getDate());
			const peDay = new Date(pe.getFullYear(), pe.getMonth(), pe.getDate());
			if (dayStart >= psDay && dayStart <= peDay) {
				return false;
			}
		}
		
		return true;
	});
}






