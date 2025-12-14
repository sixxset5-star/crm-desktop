/**
 * DataMapper для задач
 * Изолирует domain от структуры БД
 * Преобразует DB rows ↔ Domain models
 */
export class TaskMapper {
	/**
	 * Преобразовать DB row → Domain Task
	 */
	static toDomain(row) {
		if (!row) return null;

		const task = {
			id: row.id,
			title: row.title,
			amount: row.amount ?? undefined,
			expenses: row.expenses ?? undefined,
			paidAmount: row.paid_amount ?? undefined,
			payments: TaskMapper._parseJson(row.payments, []),
			expensesEntries: TaskMapper._parseJson(row.expenses_entries, []),
			pausedRanges: TaskMapper._parseJson(row.paused_ranges, []),
			taxRate: row.tax_rate ?? undefined,
			startDate: row.start_date ?? undefined,
			deadline: row.deadline ?? undefined,
			subtasks: TaskMapper._parseJson(row.subtasks, []),
			tags: TaskMapper._parseJson(row.tags, []),
			notes: row.notes ?? undefined,
			customerId: row.customer_id ?? undefined,
			contractorId: row.contractor_id ?? undefined,
			links: TaskMapper._parseJson(row.links, []),
			files: TaskMapper._parseJson(row.files, []),
			calculatorQuantity: row.calculator_quantity ?? undefined,
			calculatorPricePerUnit: row.calculator_price_per_unit ?? undefined,
			priority: row.priority ?? undefined,
			accesses: TaskMapper._parseJson(row.accesses, []),
			columnId: row.column_id,
			pausedFromColumnId: row.paused_from_column_id ?? undefined,
			createdAt: row.created_at ?? undefined,
			updatedAt: row.updated_at ?? undefined,
		};
		
		// Логирование для отладки
		if (!task.columnId) {
			console.warn('[TaskMapper] Task without columnId:', task.id, task.title, 'row.column_id:', row.column_id);
		}
		
		return task;
	}

	/**
	 * Преобразовать Domain Task → DB row
	 */
	static toDb(task) {
		return {
			id: task.id,
			title: task.title || '',
			amount: task.amount ?? null,
			expenses: task.expenses ?? null,
			paid_amount: task.paidAmount ?? null,
			payments: TaskMapper._stringifyJson(task.payments),
			expenses_entries: TaskMapper._stringifyJson(task.expensesEntries),
			paused_ranges: TaskMapper._stringifyJson(task.pausedRanges),
			tax_rate: task.taxRate ?? null,
			start_date: task.startDate ?? null,
			deadline: task.deadline ?? null,
			subtasks: TaskMapper._stringifyJson(task.subtasks),
			tags: TaskMapper._stringifyJson(task.tags),
			notes: task.notes ?? null,
			customer_id: task.customerId ?? null,
			contractor_id: task.contractorId ?? null,
			links: TaskMapper._stringifyJson(task.links),
			files: TaskMapper._stringifyJson(task.files),
			calculator_quantity: task.calculatorQuantity ?? null,
			calculator_price_per_unit: task.calculatorPricePerUnit ?? null,
			priority: task.priority ?? null,
			accesses: TaskMapper._stringifyJson(task.accesses),
			column_id: task.columnId ?? 'unprocessed',
			paused_from_column_id: task.pausedFromColumnId ?? null,
			created_at: task.createdAt ?? null,
			updated_at: task.updatedAt ?? null,
		};
	}

	/**
	 * Преобразовать массив DB rows → Domain Tasks
	 */
	static toDomainArray(rows) {
		return rows.map(row => TaskMapper.toDomain(row)).filter(Boolean);
	}

	/**
	 * Преобразовать массив Domain Tasks → DB rows
	 */
	static toDbArray(tasks) {
		if (!Array.isArray(tasks)) {
			console.error('[TaskMapper] toDbArray: tasks is not an array', { type: typeof tasks, tasks });
			return [];
		}
		// Фильтруем null/undefined и преобразуем в DB формат
		return tasks
			.filter(task => task != null) // Убираем null и undefined
			.map(task => {
				try {
					return TaskMapper.toDb(task);
				} catch (error) {
					console.error('[TaskMapper] toDbArray: Error converting task to DB format', { 
						taskId: task?.id, 
						error: error.message 
					});
					return null;
				}
			})
			.filter(row => row != null); // Убираем null результаты
	}

	/**
	 * Безопасный парсинг JSON
	 */
	static _parseJson(value, defaultValue = []) {
		if (value === null || value === undefined) {
			return defaultValue;
		}
		try {
			const parsed = JSON.parse(value);
			return Array.isArray(parsed) ? parsed : defaultValue;
		} catch {
			return defaultValue;
		}
	}

	/**
	 * Безопасная сериализация в JSON
	 */
	static _stringifyJson(value) {
		if (value === null || value === undefined || (Array.isArray(value) && value.length === 0)) {
			return null;
		}
		try {
			return JSON.stringify(value);
		} catch {
			return null;
		}
	}
}



