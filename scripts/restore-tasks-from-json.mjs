// Восстановление задач из JSON (`tasks.json`) в SQLite-базу `crm.db`
// Источник: ~/Library/Application Support/Mansurov CRM
// Цель:     та же база (используется текущим приложением)

import fs from 'node:fs/promises';
import fsSync from 'node:fs';
import path from 'node:path';

async function main() {
	console.log('=== Prepare SQL to restore tasks from JSON → SQLite ===');

	const home = process.env.HOME || process.env.USERPROFILE;
	if (!home) {
		console.error('Cannot detect HOME directory');
		process.exit(1);
	}

	const userDataPath = path.join(home, 'Library', 'Application Support', 'Mansurov CRM');
	const jsonPath = path.join(userDataPath, 'tasks.json');
	const dbPath = path.join(userDataPath, 'crm.db');

	console.log('UserData path:', userDataPath);
	console.log('tasks.json:', jsonPath);
	console.log('crm.db:', dbPath);

	if (!fsSync.existsSync(jsonPath)) {
		console.error('tasks.json not found at', jsonPath);
		process.exit(1);
	}
	if (fsSync.existsSync(dbPath)) {
		// Делаем резервную копию базы (на всякий случай)
		const backupPath = `${dbPath}.backup-${Date.now()}`;
		await fs.copyFile(dbPath, backupPath);
		console.log('Backup of crm.db created:', backupPath);
	} else {
		console.warn('crm.db not found at', dbPath, '(будет нужно создать или выбрать файл вручную в SQLiteStudio)');
	}

	// Читаем JSON с задачами
	const raw = await fs.readFile(jsonPath, 'utf-8');
	let tasksData;
	try {
		tasksData = JSON.parse(raw);
	} catch (err) {
		console.error('Failed to parse tasks.json:', err);
		process.exit(1);
	}

	if (!Array.isArray(tasksData) || tasksData.length === 0) {
		console.error('tasks.json does not contain a non-empty array of tasks');
		process.exit(1);
	}

	console.log('Tasks in JSON:', tasksData.length);

	// Генерируем SQL-скрипт для ручного выполнения в SQLiteStudio / sqlite3
	const lines = [];
	lines.push('-- ВОССТАНОВЛЕНИЕ ЗАДАЧ ИЗ tasks.json');
	lines.push('-- ПЕРЕД ВЫПОЛНЕНИЕМ СДЕЛАЙТЕ РЕЗЕРВНУЮ КОПИЮ crm.db');
	lines.push('BEGIN TRANSACTION;');
	lines.push('DELETE FROM tasks;');
	lines.push('');

	const esc = (value) => {
		if (value === null || value === undefined) return 'NULL';
		if (typeof value === 'number') return String(value);
		// Строки экранируем для SQL
		return `'${String(value).replace(/'/g, "''")}'`;
	};

	for (const task of tasksData) {
		const cols = [
			esc(task.id),
			esc(task.title || ''),
			esc(task.amount ?? null),
			esc(task.expenses ?? null),
			esc(task.paidAmount ?? null),
			esc(JSON.stringify(task.payments || [])),
			esc(JSON.stringify(task.expensesEntries || [])),
			esc(JSON.stringify(task.pausedRanges || [])),
			esc(task.taxRate ?? null),
			esc(task.startDate || null),
			esc(task.deadline || null),
			esc(JSON.stringify(task.subtasks || [])),
			esc(JSON.stringify(task.tags || [])),
			esc(task.notes || null),
			esc(task.customerId || null),
			esc(JSON.stringify(task.links || [])),
			esc(JSON.stringify(task.files || [])),
			esc(task.calculatorQuantity ?? null),
			esc(task.calculatorPricePerUnit ?? null),
			esc(task.priority || null),
			esc(JSON.stringify(task.accesses || [])),
			esc(task.columnId || 'unprocessed'),
			esc(task.createdAt || null),
			esc(task.updatedAt || null),
		];

		lines.push(
			`INSERT OR REPLACE INTO tasks (` +
				[
					'id',
					'title',
					'amount',
					'expenses',
					'paid_amount',
					'payments',
					'expenses_entries',
					'paused_ranges',
					'tax_rate',
					'start_date',
					'deadline',
					'subtasks',
					'tags',
					'notes',
					'customer_id',
					'links',
					'files',
					'calculator_quantity',
					'calculator_price_per_unit',
					'priority',
					'accesses',
					'column_id',
					'created_at',
					'updated_at',
				].join(', ') +
				`) VALUES (${cols.join(', ')});`
		);
	}

	lines.push('COMMIT;');
	lines.push('');

	const outPath = path.join(process.cwd(), 'restore-tasks.sql');
	await fs.writeFile(outPath, lines.join('\n'), 'utf-8');
	console.log('SQL script generated:', outPath);
	console.log('Открой /Users/rafael/Library/Application Support/Mansurov CRM/crm.db в SQLiteStudio и выполните этот скрипт.');
}

main().catch((err) => {
	console.error('Unexpected error:', err);
	process.exit(1);
});


