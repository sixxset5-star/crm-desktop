import Database from 'better-sqlite3';
import path from 'node:path';
import pkg from 'electron';
const { app } = pkg;
import fs from 'node:fs/promises';
import fsSync from 'node:fs';

let db = null;
let userDataPath = null;

async function ensureUserDataPath() {
	if (userDataPath) return userDataPath;
	
	// Ждем, пока app будет готов
	if (!app.isReady()) {
		await app.whenReady();
	}
	
	userDataPath = app.getPath('userData');
	return userDataPath;
}

export function getDatabasePath() {
	// Если app еще не готов, возвращаем временный путь
	// В реальности это не должно вызываться до app.whenReady()
	if (!app.isReady() && !userDataPath) {
		// Fallback для случаев, когда вызывается до инициализации
		return path.join(process.env.HOME || process.env.USERPROFILE || '.', 'crm.db');
	}
	return path.join(userDataPath || app.getPath('userData'), 'crm.db');
}

export function getDatabase() {
	if (db) {
		return db;
	}
	
	// Убеждаемся, что userDataPath инициализирован
	if (!userDataPath && app.isReady()) {
		userDataPath = app.getPath('userData');
	}
	
	const dbPath = getDatabasePath();
	console.log('[Database] Opening database at:', dbPath);
	
	// Создаем директорию если не существует
	const dbDir = path.dirname(dbPath);
	if (!fsSync.existsSync(dbDir)) {
		fsSync.mkdirSync(dbDir, { recursive: true });
	}
	
	db = new Database(dbPath);
	
	// Настройки для длительной работы и производительности
	db.pragma('journal_mode = WAL'); // Write-Ahead Logging для лучшей производительности
	db.pragma('synchronous = NORMAL'); // Баланс между производительностью и надежностью
	db.pragma('foreign_keys = ON'); // Включаем foreign keys
	
	// Инициализируем таблицу версий схемы
	initSchemaMeta(db);
	
	// Создаем базовую схему (версия 1)
	createSchema(db);
	
	// Применяем миграции
	applyMigrations(db);
	
	// Проверяем, нужно ли мигрировать данные из JSON (одноразовая миграция)
	migrateFromJsonIfNeeded(db);
	
	return db;
}

function createSchema(database) {
	console.log('[Database] Creating schema...');
	
	// Таблица задач
	database.exec(`
		CREATE TABLE IF NOT EXISTS tasks (
			id TEXT PRIMARY KEY,
			title TEXT NOT NULL,
			amount REAL,
			expenses REAL,
			paid_amount REAL,
			payments TEXT, -- JSON array
			expenses_entries TEXT, -- JSON array
			paused_ranges TEXT, -- JSON array
			tax_rate REAL,
			start_date TEXT,
			deadline TEXT,
			subtasks TEXT, -- JSON array
			tags TEXT, -- JSON array
			notes TEXT,
			customer_id TEXT,
			links TEXT, -- JSON array
			files TEXT, -- JSON array
			calculator_quantity REAL,
			calculator_price_per_unit REAL,
			priority TEXT,
			accesses TEXT, -- JSON array
			column_id TEXT NOT NULL,
			created_at TEXT,
			updated_at TEXT
		)
	`);
	
	// Таблица клиентов
	database.exec(`
		CREATE TABLE IF NOT EXISTS customers (
			id TEXT PRIMARY KEY,
			name TEXT NOT NULL,
			contact TEXT, -- для обратной совместимости
			contacts TEXT, -- JSON array
			avatar TEXT,
			comment TEXT,
			accesses TEXT -- JSON array
		)
	`);
	
	// Таблица целей
	database.exec(`
		CREATE TABLE IF NOT EXISTS goals (
			id TEXT PRIMARY KEY,
			title TEXT NOT NULL,
			description TEXT,
			deadline TEXT,
			progress INTEGER NOT NULL DEFAULT 0,
			completed INTEGER NOT NULL DEFAULT 0
		)
	`);
	
	// Таблица месячных финансовых целей
	database.exec(`
		CREATE TABLE IF NOT EXISTS monthly_financial_goals (
			month_key TEXT PRIMARY KEY,
			expenses TEXT NOT NULL, -- JSON array
			completed INTEGER DEFAULT 0,
			manual_profit REAL
		)
	`);
	
		// Таблица кредитов
		database.exec(`
			CREATE TABLE IF NOT EXISTS credits (
				id TEXT PRIMARY KEY,
				name TEXT NOT NULL,
				description TEXT,
				start_date TEXT,
				schedule_type TEXT DEFAULT 'annuity',
				amount REAL,
				current_balance REAL,
				interest_rate REAL,
				term_months INTEGER,
				monthly_payment REAL,
				status TEXT DEFAULT 'active',
				notes TEXT,
				paid_this_month INTEGER DEFAULT 0,
				last_paid_month TEXT,
				payment_date TEXT,
				input_mode TEXT DEFAULT 'amount_rate_term'
			)
		`);
		
		// Таблица графика платежей по кредитам
		database.exec(`
			CREATE TABLE IF NOT EXISTS credit_schedule_items (
				id TEXT PRIMARY KEY,
				credit_id TEXT NOT NULL,
				month_number INTEGER NOT NULL,
				payment_date TEXT NOT NULL,
				planned_payment REAL NOT NULL,
				interest_part REAL NOT NULL,
				principal_part REAL NOT NULL,
				remaining_balance REAL NOT NULL,
				paid INTEGER DEFAULT 0,
				paid_amount REAL,
				paid_at TEXT,
				FOREIGN KEY (credit_id) REFERENCES credits(id) ON DELETE CASCADE
			)
		`);
	
	// Таблица доходов
	database.exec(`
		CREATE TABLE IF NOT EXISTS incomes (
			id TEXT PRIMARY KEY,
			title TEXT NOT NULL,
			amount REAL NOT NULL,
			date TEXT NOT NULL,
			tax_rate REAL,
			notes TEXT,
			created_at TEXT,
			updated_at TEXT
		)
	`);
	
	// Таблица доп работы
	database.exec(`
		CREATE TABLE IF NOT EXISTS extra_work (
			id TEXT PRIMARY KEY,
			work_dates TEXT NOT NULL,
			daily_rate REAL NOT NULL,
			weekend_rate REAL,
			total_amount REAL NOT NULL,
			payments TEXT NOT NULL,
			notes TEXT,
			created_at TEXT,
			updated_at TEXT
		)
	`);
	
	// Таблица настроек (одна запись)
	database.exec(`
		CREATE TABLE IF NOT EXISTS settings (
			key TEXT PRIMARY KEY,
			value TEXT NOT NULL -- JSON
		)
	`);
	
	// Таблица расчетов
	database.exec(`
		CREATE TABLE IF NOT EXISTS calculations (
			id TEXT PRIMARY KEY,
			name TEXT,
			references_data TEXT NOT NULL, -- JSON array
			new_project TEXT NOT NULL, -- JSON object
			rounding INTEGER,
			manual_coefficients TEXT NOT NULL, -- JSON object
			results TEXT NOT NULL, -- JSON object
			created_at TEXT NOT NULL
		)
	`);
	
	// Таблица налогов (флаги оплаты)
	database.exec(`
		CREATE TABLE IF NOT EXISTS tax_paid_flags (
			key TEXT PRIMARY KEY,
			paid INTEGER NOT NULL DEFAULT 0
		)
	`);
	
	console.log('[Database] Schema created successfully');
}

function initSchemaMeta(database) {
	database.exec(`
		CREATE TABLE IF NOT EXISTS schema_meta (
			key TEXT PRIMARY KEY,
			value TEXT NOT NULL
		)
	`);
	
	// Устанавливаем начальную версию, если её нет
	const row = database.prepare('SELECT value FROM schema_meta WHERE key = ?').get('version');
	if (!row) {
		database.prepare('INSERT INTO schema_meta (key, value) VALUES (?, ?)').run('version', '1');
		console.log('[Database] Initialized schema version: 1');
	}
}

function getCurrentSchemaVersion(database) {
	try {
		const row = database.prepare('SELECT value FROM schema_meta WHERE key = ?').get('version');
		return row ? Number(row.value) : 1;
	} catch (error) {
		console.error('[Database] Error getting schema version:', error);
		return 1;
	}
}

function setSchemaVersion(database, version) {
	database.prepare('UPDATE schema_meta SET value = ? WHERE key = ?').run(String(version), 'version');
	console.log(`[Database] Schema version updated to: ${version}`);
}

// Определение миграций
const migrations = [
	{
		version: 2,
		up: (db) => {
			console.log('[Database] Applying migration 2: Add accesses column to tasks');
			try {
				const tableInfo = db.prepare("PRAGMA table_info(tasks)").all();
				const hasAccesses = tableInfo.some(col => col.name === 'accesses');
				if (!hasAccesses) {
					db.exec('ALTER TABLE tasks ADD COLUMN accesses TEXT');
					console.log('[Database] Migration 2 completed: accesses column added');
				} else {
					console.log('[Database] Migration 2 skipped: accesses column already exists');
				}
			} catch (error) {
				console.error('[Database] Migration 2 failed:', error);
				throw error;
			}
		}
	},
	{
		version: 3,
		up: (db) => {
			console.log('[Database] Applying migration 3: Add paused_from_column_id column to tasks');
			try {
				const tableInfo = db.prepare("PRAGMA table_info(tasks)").all();
				const hasPausedFromColumnId = tableInfo.some(col => col.name === 'paused_from_column_id');
				if (!hasPausedFromColumnId) {
					db.exec('ALTER TABLE tasks ADD COLUMN paused_from_column_id TEXT');
					console.log('[Database] Migration 3 completed: paused_from_column_id column added');
				} else {
					console.log('[Database] Migration 3 skipped: paused_from_column_id column already exists');
				}
			} catch (error) {
				console.error('[Database] Migration 3 failed:', error);
				throw error;
			}
		}
	},
	{
		version: 4,
		up: (db) => {
			console.log('[Database] Applying migration 4: Add payment_date column to credits');
			try {
				const tableInfo = db.prepare("PRAGMA table_info(credits)").all();
				const hasPaymentDate = tableInfo.some(col => col.name === 'payment_date');
				if (!hasPaymentDate) {
					db.exec('ALTER TABLE credits ADD COLUMN payment_date TEXT');
					console.log('[Database] Migration 4 completed: payment_date column added');
				} else {
					console.log('[Database] Migration 4 skipped: payment_date column already exists');
				}
			} catch (error) {
				console.error('[Database] Migration 4 failed:', error);
				throw error;
			}
		}
	},
	{
		version: 5,
		up: (db) => {
			console.log('[Database] Applying migration 5: Add contractors table, contractor_id to tasks, task_assignee_history table');
			try {
				// Создаем таблицу подрядчиков
				db.exec(`
					CREATE TABLE IF NOT EXISTS contractors (
						id TEXT PRIMARY KEY,
						name TEXT NOT NULL,
						contact TEXT NULL,
						contacts TEXT NULL,
						avatar TEXT NULL,
						comment TEXT NULL,
						specialization TEXT NULL,
						rate TEXT NULL,
						rating REAL NULL,
						is_active INTEGER NOT NULL DEFAULT 1,
						created_at TEXT NULL,
						updated_at TEXT NULL
					)
				`);
				
				// Добавляем поле contractor_id в таблицу tasks
				const tasksTableInfo = db.prepare("PRAGMA table_info(tasks)").all();
				const hasContractorId = tasksTableInfo.some(col => col.name === 'contractor_id');
				if (!hasContractorId) {
					db.exec('ALTER TABLE tasks ADD COLUMN contractor_id TEXT NULL');
					console.log('[Database] Migration 5: contractor_id column added to tasks');
				} else {
					console.log('[Database] Migration 5: contractor_id column already exists in tasks');
				}
				
				// Создаем таблицу истории изменений исполнителя
				db.exec(`
					CREATE TABLE IF NOT EXISTS task_assignee_history (
						id TEXT PRIMARY KEY,
						task_id TEXT NOT NULL,
						old_contractor_id TEXT NULL,
						new_contractor_id TEXT NULL,
						changed_at TEXT NOT NULL
					)
				`);
				
				console.log('[Database] Migration 5 completed: contractors table, contractor_id column, and task_assignee_history table created');
			} catch (error) {
				console.error('[Database] Migration 5 failed:', error);
				throw error;
			}
		}
	},
	{
		version: 6,
		up: (db) => {
			console.log('[Database] Applying migration 6: Extend credits table and add credit_schedule_items table');
			try {
				// Расширяем таблицу credits новыми полями
				const creditsTableInfo = db.prepare("PRAGMA table_info(credits)").all();
				const columnsToAdd = [
					{ name: 'description', type: 'TEXT' },
					{ name: 'start_date', type: 'TEXT' },
					{ name: 'schedule_type', type: 'TEXT DEFAULT \'annuity\'' },
					{ name: 'current_balance', type: 'REAL' },
					{ name: 'term_months', type: 'INTEGER' },
					{ name: 'status', type: 'TEXT DEFAULT \'active\'' }
				];
				
				for (const col of columnsToAdd) {
					const exists = creditsTableInfo.some(c => c.name === col.name);
					if (!exists) {
						db.exec(`ALTER TABLE credits ADD COLUMN ${col.name} ${col.type}`);
						console.log(`[Database] Migration 6: Added column ${col.name} to credits`);
					}
				}
				
				// Создаем таблицу credit_schedule_items
				db.exec(`
					CREATE TABLE IF NOT EXISTS credit_schedule_items (
						id TEXT PRIMARY KEY,
						credit_id TEXT NOT NULL,
						month_number INTEGER NOT NULL,
						payment_date TEXT NOT NULL,
						planned_payment REAL NOT NULL,
						interest_part REAL NOT NULL,
						principal_part REAL NOT NULL,
						remaining_balance REAL NOT NULL,
						paid INTEGER DEFAULT 0,
						paid_amount REAL,
						paid_at TEXT,
						FOREIGN KEY (credit_id) REFERENCES credits(id) ON DELETE CASCADE
					)
				`);
				
				// Создаем индекс для быстрого поиска по credit_id
				db.exec(`
					CREATE INDEX IF NOT EXISTS idx_credit_schedule_items_credit_id 
					ON credit_schedule_items(credit_id)
				`);
				
				// Инициализируем current_balance для существующих кредитов (если не задано)
				const existingCredits = db.prepare('SELECT id, amount FROM credits WHERE current_balance IS NULL').all();
				for (const credit of existingCredits) {
					if (credit.amount != null) {
						db.prepare('UPDATE credits SET current_balance = ? WHERE id = ?').run(credit.amount, credit.id);
					}
				}
				
				console.log('[Database] Migration 6 completed: credits table extended and credit_schedule_items table created');
			} catch (error) {
				console.error('[Database] Migration 6 failed:', error);
				throw error;
			}
		}
	},
	{
		version: 7,
		up: (db) => {
			console.log('[Database] Applying migration 7: Add weekend_rate column to extra_work');
			try {
				const tableInfo = db.prepare("PRAGMA table_info(extra_work)").all();
				const hasWeekendRate = tableInfo.some(col => col.name === 'weekend_rate');
				if (!hasWeekendRate) {
					db.exec('ALTER TABLE extra_work ADD COLUMN weekend_rate REAL');
					console.log('[Database] Migration 7 completed: weekend_rate column added to extra_work');
				} else {
					console.log('[Database] Migration 7 skipped: weekend_rate column already exists');
				}
			} catch (error) {
				console.error('[Database] Migration 7 failed:', error);
				throw error;
			}
		}
	},
	// Здесь можно добавлять новые миграции:
	// {
	//   version: 8,
	//   up: (db) => { ... }
	// }
];

function applyMigrations(database) {
	const currentVersion = getCurrentSchemaVersion(database);
	console.log(`[Database] Current schema version: ${currentVersion}`);
	
	for (const migration of migrations) {
		if (migration.version > currentVersion) {
			console.log(`[Database] Applying migration ${migration.version}...`);
			try {
				database.transaction(() => {
					migration.up(database);
					setSchemaVersion(database, migration.version);
				})();
				console.log(`[Database] Migration ${migration.version} completed successfully`);
			} catch (error) {
				console.error(`[Database] Migration ${migration.version} failed:`, error);
				throw error;
			}
		}
	}
	
	const finalVersion = getCurrentSchemaVersion(database);
	if (finalVersion > currentVersion) {
		console.log(`[Database] Schema migrated from version ${currentVersion} to ${finalVersion}`);
	} else {
		console.log(`[Database] Schema is up to date (version ${finalVersion})`);
	}
}

async function migrateFromJsonIfNeeded(database) {
	const migrationFlagPath = path.join(app.getPath('userData'), '.db_migrated');
	
	// Проверяем, была ли уже миграция
	if (fsSync.existsSync(migrationFlagPath)) {
		console.log('[Database] Migration already completed');
		return;
	}
	
	console.log('[Database] Starting migration from JSON files...');
	
	try {
		const userDataPath = app.getPath('userData');
		
		// Миграция задач
		const tasksPath = path.join(userDataPath, 'tasks.json');
		if (fsSync.existsSync(tasksPath)) {
			try {
				const tasksData = JSON.parse(await fs.readFile(tasksPath, 'utf-8'));
				if (Array.isArray(tasksData) && tasksData.length > 0) {
					const stmt = database.prepare(`
						INSERT OR REPLACE INTO tasks (
							id, title, amount, expenses, paid_amount, payments, expenses_entries,
							paused_ranges, tax_rate, start_date, deadline, subtasks, tags, notes,
							customer_id, links, files, calculator_quantity, calculator_price_per_unit,
							priority, accesses, column_id, created_at, updated_at
						) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
					`);
					
					const insertMany = database.transaction((tasks) => {
						for (const task of tasks) {
							stmt.run(
								task.id,
								task.title || '',
								task.amount || null,
								task.expenses || null,
								task.paidAmount || null,
								JSON.stringify(task.payments || []),
								JSON.stringify(task.expensesEntries || []),
								JSON.stringify(task.pausedRanges || []),
								task.taxRate || null,
								task.startDate || null,
								task.deadline || null,
								JSON.stringify(task.subtasks || []),
								JSON.stringify(task.tags || []),
								task.notes || null,
								task.customerId || null,
								JSON.stringify(task.links || []),
								JSON.stringify(task.files || []),
								task.calculatorQuantity || null,
								task.calculatorPricePerUnit || null,
								task.priority || null,
								JSON.stringify(task.accesses || []),
								task.columnId || 'unprocessed',
								task.createdAt || null,
								task.updatedAt || null
							);
						}
					});
					
					insertMany(tasksData);
					console.log(`[Database] Migrated ${tasksData.length} tasks`);
				}
			} catch (error) {
				console.error('[Database] Error migrating tasks:', error);
			}
		}
		
		// Миграция клиентов
		const customersPath = path.join(userDataPath, 'customers.json');
		if (fsSync.existsSync(customersPath)) {
			try {
				const customersData = JSON.parse(await fs.readFile(customersPath, 'utf-8'));
				if (Array.isArray(customersData) && customersData.length > 0) {
					const stmt = database.prepare(`
						INSERT OR REPLACE INTO customers (id, name, contact, contacts, avatar, comment, accesses)
						VALUES (?, ?, ?, ?, ?, ?, ?)
					`);
					
					const insertMany = database.transaction((customers) => {
						for (const customer of customers) {
							stmt.run(
								customer.id,
								customer.name || '',
								customer.contact || null,
								JSON.stringify(customer.contacts || []),
								customer.avatar || null,
								customer.comment || null,
								JSON.stringify(customer.accesses || [])
							);
						}
					});
					
					insertMany(customersData);
					console.log(`[Database] Migrated ${customersData.length} customers`);
				}
			} catch (error) {
				console.error('[Database] Error migrating customers:', error);
			}
		}
		
		// Миграция целей
		const goalsPath = path.join(userDataPath, 'goals.json');
		if (fsSync.existsSync(goalsPath)) {
			try {
				const goalsData = JSON.parse(await fs.readFile(goalsPath, 'utf-8'));
				let goals = [];
				let monthlyGoals = [];
				let credits = [];
				
				if (Array.isArray(goalsData)) {
					goals = goalsData;
				} else if (goalsData && typeof goalsData === 'object') {
					goals = goalsData.goals || [];
					monthlyGoals = goalsData.monthlyFinancialGoals || [];
					credits = goalsData.credits || [];
				}
				
				if (goals.length > 0) {
					const stmt = database.prepare(`
						INSERT OR REPLACE INTO goals (id, title, description, deadline, progress, completed)
						VALUES (?, ?, ?, ?, ?, ?)
					`);
					
					const insertMany = database.transaction((goalsList) => {
						for (const goal of goalsList) {
							stmt.run(
								goal.id,
								goal.title || '',
								goal.description || null,
								goal.deadline || null,
								goal.progress || 0,
								goal.completed ? 1 : 0
							);
						}
					});
					
					insertMany(goals);
					console.log(`[Database] Migrated ${goals.length} goals`);
				}
				
				if (monthlyGoals.length > 0) {
					const stmt = database.prepare(`
						INSERT OR REPLACE INTO monthly_financial_goals (month_key, expenses, completed, manual_profit)
						VALUES (?, ?, ?, ?)
					`);
					
					const insertMany = database.transaction((monthlyList) => {
						for (const monthly of monthlyList) {
							stmt.run(
								monthly.monthKey,
								JSON.stringify(monthly.expenses || []),
								monthly.completed ? 1 : 0,
								monthly.manualProfit || null
							);
						}
					});
					
					insertMany(monthlyGoals);
					console.log(`[Database] Migrated ${monthlyGoals.length} monthly financial goals`);
				}
				
				if (credits.length > 0) {
					const stmt = database.prepare(`
						INSERT OR REPLACE INTO credits (id, name, amount, monthly_payment, interest_rate, notes, paid_this_month, last_paid_month, payment_date)
						VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
					`);
					
					const insertMany = database.transaction((creditsList) => {
						for (const credit of creditsList) {
							stmt.run(
								credit.id,
								credit.name || '',
								credit.amount || null,
								credit.monthlyPayment || null,
								// ВАЖНО: interestRate может быть 0, поэтому проверяем != null, а не truthy
								credit.interestRate != null ? credit.interestRate : null,
								credit.notes || null,
								credit.paidThisMonth ? 1 : 0,
								credit.lastPaidMonth || null,
								credit.paymentDate || null
							);
						}
					});
					
					insertMany(credits);
					console.log(`[Database] Migrated ${credits.length} credits`);
				}
			} catch (error) {
				console.error('[Database] Error migrating goals:', error);
			}
		}
		
		// Миграция настроек
		const settingsPath = path.join(userDataPath, 'settings.json');
		if (fsSync.existsSync(settingsPath)) {
			try {
				const settingsData = JSON.parse(await fs.readFile(settingsPath, 'utf-8'));
				if (settingsData && typeof settingsData === 'object') {
					const stmt = database.prepare(`
						INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)
					`);
					stmt.run('main', JSON.stringify(settingsData));
					console.log('[Database] Migrated settings');
				}
			} catch (error) {
				console.error('[Database] Error migrating settings:', error);
			}
		}
		
		// Миграция расчетов
		const calculationsPath = path.join(userDataPath, 'calculations.json');
		if (fsSync.existsSync(calculationsPath)) {
			try {
				const calculationsData = JSON.parse(await fs.readFile(calculationsPath, 'utf-8'));
				if (Array.isArray(calculationsData) && calculationsData.length > 0) {
					const stmt = database.prepare(`
						INSERT OR REPLACE INTO calculations (id, name, references_data, new_project, rounding, manual_coefficients, results, created_at)
						VALUES (?, ?, ?, ?, ?, ?, ?, ?)
					`);
					
					const insertMany = database.transaction((calcs) => {
						for (const calc of calcs) {
							stmt.run(
								calc.id,
								calc.name || null,
								JSON.stringify(calc.references || []),
								JSON.stringify(calc.newProject || {}),
								calc.rounding || null,
								JSON.stringify(calc.manualCoefficients || {}),
								JSON.stringify(calc.results || {}),
								calc.createdAt || new Date().toISOString()
							);
						}
					});
					
					insertMany(calculationsData);
					console.log(`[Database] Migrated ${calculationsData.length} calculations`);
				}
			} catch (error) {
				console.error('[Database] Error migrating calculations:', error);
			}
		}
		
		// Миграция налогов
		const taxesPath = path.join(userDataPath, 'taxes.json');
		if (fsSync.existsSync(taxesPath)) {
			try {
				const taxesData = JSON.parse(await fs.readFile(taxesPath, 'utf-8'));
				if (Array.isArray(taxesData) && taxesData.length > 0) {
					const stmt = database.prepare(`
						INSERT OR REPLACE INTO tax_paid_flags (key, paid) VALUES (?, ?)
					`);
					
					const insertMany = database.transaction((flags) => {
						for (const flag of flags) {
							if (flag && flag.key) {
								stmt.run(flag.key, flag.paid ? 1 : 0);
							}
						}
					});
					
					insertMany(taxesData);
					console.log(`[Database] Migrated ${taxesData.length} tax flags`);
				}
			} catch (error) {
				console.error('[Database] Error migrating taxes:', error);
			}
		}
		
		// Миграция доходов
		const incomesPath = path.join(userDataPath, 'incomes.json');
		if (fsSync.existsSync(incomesPath)) {
			try {
				const incomesData = JSON.parse(await fs.readFile(incomesPath, 'utf-8'));
				if (Array.isArray(incomesData) && incomesData.length > 0) {
					const stmt = database.prepare(`
						INSERT OR REPLACE INTO incomes (id, title, amount, date, tax_rate, notes, created_at, updated_at)
						VALUES (?, ?, ?, ?, ?, ?, ?, ?)
					`);
					
					const insertMany = database.transaction((incomes) => {
						for (const income of incomes) {
							stmt.run(
								income.id,
								income.title || '',
								income.amount || 0,
								income.date || null,
								income.taxRate || null,
								income.notes || null,
								income.createdAt || null,
								income.updatedAt || null
							);
						}
					});
					
					insertMany(incomesData);
					console.log(`[Database] Migrated ${incomesData.length} incomes`);
				}
			} catch (error) {
				console.error('[Database] Error migrating incomes:', error);
			}
		}
		
		// Отмечаем миграцию как выполненную
		await fs.writeFile(migrationFlagPath, 'migrated', 'utf-8');
		console.log('[Database] Migration completed successfully');
	} catch (error) {
		console.error('[Database] Migration error:', error);
	}
}

export function closeDatabase() {
	if (db) {
		db.close();
		db = null;
		console.log('[Database] Database closed');
	}
}




