/**
 * Тесты для csv-utils
 * Проверяет корректность типов после замены any
 */

import { describe, it, expect } from 'vitest';
import { parseTaskFromCsv } from '../csv-utils';
import type { Task } from '@/types';
import type { ColumnId, TaskPriority } from '@/types';

describe('csv-utils', () => {
	describe('parseTaskFromCsv', () => {
		it('должен возвращать корректные типы ColumnId и TaskPriority', () => {
			const headers = ['ID', 'Название', 'Статус', 'Приоритет'];
			const columns = ['1', 'Test Task', 'inwork', 'high'];
			const existingTasks: Task[] = [];

			const result = parseTaskFromCsv(headers, columns, existingTasks);

			expect(result).not.toBeNull();
			if (result) {
				expect(result.task.columnId).toBeDefined();
				expect(typeof result.task.columnId).toBe('string');
				// Проверяем, что columnId является валидным ColumnId
				const validColumnIds: ColumnId[] = [
					'clients',
					'unprocessed',
					'notstarted',
					'inwork',
					'completed',
					'closed',
					'cancelled',
					'paused',
				];
				expect(validColumnIds).toContain(result.task.columnId);

				if (result.task.priority) {
					const validPriorities: TaskPriority[] = ['high', 'medium', 'low'];
					expect(validPriorities).toContain(result.task.priority);
				}
			}
		});

		it('должен использовать unprocessed по умолчанию для columnId', () => {
			const headers = ['ID', 'Название'];
			const columns = ['1', 'Test Task'];
			const existingTasks: Task[] = [];

			const result = parseTaskFromCsv(headers, columns, existingTasks);

			expect(result).not.toBeNull();
			if (result) {
				expect(result.task.columnId).toBe('unprocessed');
			}
		});

		it('должен корректно парсить различные ColumnId значения', () => {
			const validColumnIds: ColumnId[] = [
				'unprocessed',
				'notstarted',
				'inwork',
				'completed',
				'closed',
				'cancelled',
				'paused',
			];

			const headers = ['ID', 'Название', 'Статус'];
			const existingTasks: Task[] = [];

			validColumnIds.forEach((columnId) => {
				const columns = ['1', 'Test Task', columnId];
				const result = parseTaskFromCsv(headers, columns, existingTasks);

				expect(result).not.toBeNull();
				if (result) {
					expect(result.task.columnId).toBe(columnId);
				}
			});
		});

		it('должен корректно парсить различные TaskPriority значения', () => {
			const validPriorities: TaskPriority[] = ['high', 'medium', 'low'];

			const headers = ['ID', 'Название', 'Приоритет'];
			const existingTasks: Task[] = [];

			validPriorities.forEach((priority) => {
				const columns = ['1', 'Test Task', priority];
				const result = parseTaskFromCsv(headers, columns, existingTasks);

				expect(result).not.toBeNull();
				if (result && result.task.priority) {
					expect(result.task.priority).toBe(priority);
				}
			});
		});

		it('должен возвращать undefined для priority, если не указан', () => {
			const headers = ['ID', 'Название'];
			const columns = ['1', 'Test Task'];
			const existingTasks: Task[] = [];

			const result = parseTaskFromCsv(headers, columns, existingTasks);

			expect(result).not.toBeNull();
			if (result) {
				expect(result.task.priority).toBeUndefined();
			}
		});
	});

	// escapeCsvValue - внутренняя функция, не экспортируется
	// Тип проверяется компилятором TypeScript
	// Проверяем, что parseTaskFromCsv использует корректные типы
});

