
/**
 * Отвечает только за CRUD операции с БД
 * Использует мапперы для изоляции от структуры БД
 */
import { BaseRepository } from './base-repository.js';
import { TaskMapper } from './mappers/task-mapper.js';

export class TasksRepository extends BaseRepository {
	/**
	 * Загрузить все задачи
	 * Использует маппер для преобразования DB → Domain
	 */
	findAll() {
		const db = this.getDb();
		const rows = db.prepare('SELECT * FROM tasks ORDER BY created_at DESC').all();
		return TaskMapper.toDomainArray(rows);
	}

	/**
	 * Найти задачу по ID
	 * Использует маппер для преобразования DB → Domain
	 */
	findById(id) {
		const db = this.getDb();
		const row = db.prepare('SELECT * FROM tasks WHERE id = ?').get(id);
		return TaskMapper.toDomain(row);
	}

	/**
	 * Сохранить все задачи (полная синхронизация)
	 * Удаляет задачи, которых нет в новом списке
	 * Использует маппер для преобразования Domain → DB
	 */
	saveAll(tasks) {
		if (!Array.isArray(tasks)) {
			console.error('[TasksRepository] saveAll: tasks is not an array', { type: typeof tasks, tasks });
			throw new Error('TasksRepository.saveAll expects an array of tasks');
		}
		const db = this.getDb();
		const dbRows = TaskMapper.toDbArray(tasks);
		
		// Проверяем, что маппер вернул валидный массив
		if (!Array.isArray(dbRows)) {
			console.error('[TasksRepository] saveAll: TaskMapper.toDbArray returned non-array', { type: typeof dbRows, dbRows });
			throw new Error('TaskMapper.toDbArray returned invalid result');
		}
		
		// Сохраняем dbRows в константу для гарантированного доступа в транзакции
		const rowsToSave = dbRows;
		
		const stmt = db.prepare(`
			INSERT OR REPLACE INTO tasks (
				id, title, amount, expenses, paid_amount, payments, expenses_entries,
				paused_ranges, tax_rate, start_date, deadline, subtasks, tags, notes,
				customer_id, contractor_id, links, files, calculator_quantity, calculator_price_per_unit,
				priority, accesses, column_id, paused_from_column_id, created_at, updated_at
			) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
		`);

		// Используем транзакцию; передаем rowsToSave явно через замыкание
		// Сохраняем ссылку на rowsToSave в локальной переменной для гарантированного доступа
		const dataToSave = rowsToSave;
		
		return this.transaction(() => {
			// Дополнительная проверка внутри транзакции для безопасности
			if (!Array.isArray(dataToSave)) {
				console.error('[TasksRepository] saveAll: dataToSave is invalid inside transaction', { 
					isArray: Array.isArray(dataToSave), 
					length: dataToSave?.length,
					type: typeof dataToSave,
					value: dataToSave
				});
				throw new Error('dataToSave is not a valid array inside transaction');
			}
			
			// Если массив пустой, просто удаляем все существующие задачи
			if (dataToSave.length === 0) {
				db.prepare('DELETE FROM tasks').run();
				return;
			}
			
			// Удаляем задачи, которых нет в новом списке
			const existingIds = new Set(dataToSave.map(r => {
				if (!r || !r.id) {
					console.error('[TasksRepository] saveAll: Invalid row in dataToSave', { row: r });
					return null;
				}
				return r.id;
			}).filter(id => id != null));
			const allRows = db.prepare('SELECT id FROM tasks').all();
			for (const row of allRows) {
				if (!existingIds.has(row.id)) {
					db.prepare('DELETE FROM tasks WHERE id = ?').run(row.id);
				}
			}

			// Вставляем/обновляем задачи
			for (const row of dataToSave) {
				if (!row || !row.id) {
					console.error('[TasksRepository] saveAll: Skipping invalid row', { row });
					continue;
				}
				stmt.run(
					row.id,
					row.title,
					row.amount,
					row.expenses,
					row.paid_amount,
					row.payments,
					row.expenses_entries,
					row.paused_ranges,
					row.tax_rate,
					row.start_date,
					row.deadline,
					row.subtasks,
					row.tags,
					row.notes,
					row.customer_id,
					row.contractor_id,
					row.links,
					row.files,
					row.calculator_quantity,
					row.calculator_price_per_unit,
					row.priority,
					row.accesses,
					row.column_id,
					row.paused_from_column_id,
					row.created_at,
					row.updated_at
				);
			}
		});
	}

	/**
	 * Создать новую задачу
	 * Использует маппер для преобразования Domain → DB
	 */
	create(task) {
		const db = this.getDb();
		const dbRow = TaskMapper.toDb(task);
		const stmt = db.prepare(`
			INSERT INTO tasks (
				id, title, amount, expenses, paid_amount, payments, expenses_entries,
				paused_ranges, tax_rate, start_date, deadline, subtasks, tags, notes,
				customer_id, contractor_id, links, files, calculator_quantity, calculator_price_per_unit,
				priority, accesses, column_id, paused_from_column_id, created_at, updated_at
			) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
		`);

		stmt.run(
			dbRow.id,
			dbRow.title,
			dbRow.amount,
			dbRow.expenses,
			dbRow.paid_amount,
			dbRow.payments,
			dbRow.expenses_entries,
			dbRow.paused_ranges,
			dbRow.tax_rate,
			dbRow.start_date,
			dbRow.deadline,
			dbRow.subtasks,
			dbRow.tags,
			dbRow.notes,
			dbRow.customer_id,
			dbRow.contractor_id,
			dbRow.links,
			dbRow.files,
			dbRow.calculator_quantity,
			dbRow.calculator_price_per_unit,
			dbRow.priority,
			dbRow.accesses,
			dbRow.column_id,
			dbRow.paused_from_column_id,
			dbRow.created_at,
			dbRow.updated_at
		);

		return this.findById(task.id);
	}

	/**
	 * Обновить задачу
	 * Использует маппер для преобразования Domain → DB
	 */
	update(id, updates) {
		const existing = this.findById(id);
		if (!existing) {
			throw new Error(`Task with id ${id} not found`);
		}

		const updated = { ...existing, ...updates, updatedAt: new Date().toISOString() };
		const dbRow = TaskMapper.toDb(updated);
		const db = this.getDb();
		const stmt = db.prepare(`
			UPDATE tasks SET
				title = ?, amount = ?, expenses = ?, paid_amount = ?, payments = ?,
				expenses_entries = ?, paused_ranges = ?, tax_rate = ?, start_date = ?,
				deadline = ?, subtasks = ?, tags = ?, notes = ?, customer_id = ?, contractor_id = ?,
				links = ?, files = ?, calculator_quantity = ?, calculator_price_per_unit = ?,
				priority = ?, accesses = ?, column_id = ?, paused_from_column_id = ?,
				updated_at = ?
			WHERE id = ?
		`);

		stmt.run(
			dbRow.title,
			dbRow.amount,
			dbRow.expenses,
			dbRow.paid_amount,
			dbRow.payments,
			dbRow.expenses_entries,
			dbRow.paused_ranges,
			dbRow.tax_rate,
			dbRow.start_date,
			dbRow.deadline,
			dbRow.subtasks,
			dbRow.tags,
			dbRow.notes,
			dbRow.customer_id,
			dbRow.contractor_id,
			dbRow.links,
			dbRow.files,
			dbRow.calculator_quantity,
			dbRow.calculator_price_per_unit,
			dbRow.priority,
			dbRow.accesses,
			dbRow.column_id,
			dbRow.paused_from_column_id,
			dbRow.updated_at,
			id
		);

		return this.findById(id);
	}

	/**
	 * Удалить задачу
	 */
	delete(id) {
		const db = this.getDb();
		const stmt = db.prepare('DELETE FROM tasks WHERE id = ?');
		stmt.run(id);
	}
}

