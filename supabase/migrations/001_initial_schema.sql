-- Initial schema migration for CRM Desktop
-- Based on SQLite schema, adapted for PostgreSQL (Supabase)

-- Таблица задач
CREATE TABLE IF NOT EXISTS tasks (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    amount REAL,
    expenses REAL,
    paid_amount REAL,
    payments JSONB, -- JSON array
    expenses_entries JSONB, -- JSON array
    paused_ranges JSONB, -- JSON array
    tax_rate REAL,
    start_date TEXT,
    deadline TEXT,
    subtasks JSONB, -- JSON array
    tags JSONB, -- JSON array
    notes TEXT,
    customer_id TEXT,
    links JSONB, -- JSON array
    files JSONB, -- JSON array
    calculator_quantity REAL,
    calculator_price_per_unit REAL,
    priority TEXT,
    accesses JSONB, -- JSON array
    column_id TEXT NOT NULL,
    created_at TEXT,
    updated_at TEXT
);

-- Таблица клиентов
CREATE TABLE IF NOT EXISTS customers (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    contact TEXT, -- для обратной совместимости
    contacts JSONB, -- JSON array
    avatar TEXT,
    comment TEXT,
    accesses JSONB -- JSON array
);

-- Таблица подрядчиков
CREATE TABLE IF NOT EXISTS contractors (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    contact TEXT,
    contacts JSONB, -- JSON array
    avatar TEXT,
    comment TEXT,
    accesses JSONB, -- JSON array
    active INTEGER DEFAULT 1
);

-- Таблица целей
CREATE TABLE IF NOT EXISTS goals (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    deadline TEXT,
    progress INTEGER NOT NULL DEFAULT 0,
    completed INTEGER NOT NULL DEFAULT 0
);

-- Таблица месячных финансовых целей
CREATE TABLE IF NOT EXISTS monthly_financial_goals (
    month_key TEXT PRIMARY KEY,
    expenses JSONB NOT NULL, -- JSON array
    completed INTEGER DEFAULT 0,
    manual_profit REAL
);

-- Таблица кредитов
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
);

-- Таблица графика платежей по кредитам
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
);

-- Таблица доходов
CREATE TABLE IF NOT EXISTS incomes (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    amount REAL NOT NULL,
    date TEXT NOT NULL,
    tax_rate REAL,
    notes TEXT,
    created_at TEXT,
    updated_at TEXT
);

-- Таблица доп работы
CREATE TABLE IF NOT EXISTS extra_work (
    id TEXT PRIMARY KEY,
    work_dates JSONB NOT NULL, -- JSON array of dates
    daily_rate REAL NOT NULL,
    weekend_rate REAL,
    total_amount REAL NOT NULL,
    payments JSONB NOT NULL, -- JSON array
    notes TEXT,
    created_at TEXT,
    updated_at TEXT
);

-- Таблица настроек
CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value JSONB NOT NULL -- JSON
);

-- Таблица расчетов
CREATE TABLE IF NOT EXISTS calculations (
    id TEXT PRIMARY KEY,
    name TEXT,
    references_data JSONB NOT NULL, -- JSON array
    new_project JSONB NOT NULL, -- JSON object
    rounding INTEGER,
    manual_coefficients JSONB NOT NULL, -- JSON object
    results JSONB NOT NULL, -- JSON object
    created_at TEXT NOT NULL
);

-- Таблица налогов (флаги оплаты)
CREATE TABLE IF NOT EXISTS tax_paid_flags (
    key TEXT PRIMARY KEY,
    paid INTEGER NOT NULL DEFAULT 0
);

-- Индексы для производительности
CREATE INDEX IF NOT EXISTS idx_tasks_customer_id ON tasks(customer_id);
CREATE INDEX IF NOT EXISTS idx_tasks_column_id ON tasks(column_id);
CREATE INDEX IF NOT EXISTS idx_credit_schedule_credit_id ON credit_schedule_items(credit_id);
CREATE INDEX IF NOT EXISTS idx_credit_schedule_payment_date ON credit_schedule_items(payment_date);
