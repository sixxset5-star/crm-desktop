# 🚀 Инструкция: Миграция на облачную версию (Supabase)

## Текущий статус

✅ **Готово:**
- Код загружен на GitHub
- Автоматический деплой на Vercel настроен
- Приложение работает в браузере (UI загружается)
- Исправлены пути для веб-версии

⚠️ **Нужно сделать:**
- Подключить базу данных (Supabase)
- Заменить IPC на HTTP API
- Настроить работу с файлами через Supabase Storage

---

## Этап 1: Настройка Supabase (5-10 минут)

### Шаг 1.1: Создать проект Supabase

1. Зайдите на https://supabase.com
2. Нажмите **Start your project** → **Sign in with GitHub**
3. Создайте новый проект:
   - **Name**: `crm-desktop` (или любое другое)
   - **Database Password**: придумайте надежный пароль (сохраните его!)
   - **Region**: выберите ближайший (например, `West EU (Ireland)`)
   - **Pricing Plan**: Free (бесплатный план)

4. Дождитесь создания проекта (2-3 минуты)

### Шаг 1.2: Получить ключи

1. В проекте Supabase откройте **Settings** (шестеренка слева)
2. Перейдите в **API**
3. Найдите секцию **Project API keys**
4. Скопируйте:
   - **Project URL** → это будет `VITE_SUPABASE_URL`
   - **anon public** key → это будет `VITE_SUPABASE_ANON_KEY`

**Сохраните эти ключи!** Они понадобятся дальше.

---

## Этап 2: Создание схемы базы данных (15-20 минут)

### Шаг 2.1: Подключиться к Supabase SQL Editor

1. В проекте Supabase откройте **SQL Editor** (слева в меню)
2. Создайте новую таблицу для задач (`tasks`)

### Шаг 2.2: Создать SQL миграцию

Создайте файл `supabase/migrations/001_initial_schema.sql` в вашем проекте.

Или выполните SQL в Supabase SQL Editor:

```sql
-- Таблица задач
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
    updated_at TEXT,
    user_id TEXT -- Для мультитенантности
);

-- Таблица клиентов
CREATE TABLE IF NOT EXISTS customers (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    contact TEXT,
    contacts TEXT, -- JSON array
    avatar TEXT,
    comment TEXT,
    accesses TEXT, -- JSON array
    user_id TEXT
);

-- Таблица подрядчиков
CREATE TABLE IF NOT EXISTS contractors (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    contact TEXT,
    contacts TEXT, -- JSON array
    avatar TEXT,
    comment TEXT,
    accesses TEXT, -- JSON array
    active INTEGER DEFAULT 1,
    user_id TEXT
);

-- Таблица целей
CREATE TABLE IF NOT EXISTS goals (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    deadline TEXT,
    progress INTEGER NOT NULL DEFAULT 0,
    completed INTEGER NOT NULL DEFAULT 0,
    user_id TEXT
);

-- Таблица месячных финансовых целей
CREATE TABLE IF NOT EXISTS monthly_financial_goals (
    month_key TEXT PRIMARY KEY,
    expenses TEXT NOT NULL, -- JSON array
    completed INTEGER DEFAULT 0,
    manual_profit REAL,
    user_id TEXT
);

-- Таблица кредитов
CREATE TABLE IF NOT EXISTS credits (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    amount REAL NOT NULL,
    interest_rate REAL NOT NULL,
    term_months INTEGER NOT NULL,
    start_date TEXT NOT NULL,
    schedule_type TEXT NOT NULL, -- 'annuity' | 'differentiated'
    status TEXT DEFAULT 'active', -- 'active' | 'archived'
    notes TEXT,
    user_id TEXT
);

-- Таблица графика платежей по кредитам
CREATE TABLE IF NOT EXISTS credit_schedule (
    id TEXT PRIMARY KEY,
    credit_id TEXT NOT NULL,
    payment_date TEXT NOT NULL,
    payment_amount REAL NOT NULL,
    principal_amount REAL NOT NULL,
    interest_amount REAL NOT NULL,
    remaining_balance REAL NOT NULL,
    paid INTEGER DEFAULT 0,
    paid_date TEXT,
    FOREIGN KEY (credit_id) REFERENCES credits(id) ON DELETE CASCADE,
    user_id TEXT
);

-- Таблица доходов
CREATE TABLE IF NOT EXISTS incomes (
    id TEXT PRIMARY KEY,
    amount REAL NOT NULL,
    date TEXT NOT NULL,
    source TEXT,
    notes TEXT,
    user_id TEXT
);

-- Таблица настроек
CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL, -- JSON
    user_id TEXT
);

-- Таблица расчетов
CREATE TABLE IF NOT EXISTS calculations (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    formula TEXT NOT NULL,
    result REAL,
    created_at TEXT,
    user_id TEXT
);

-- Таблица флагов оплаты налогов
CREATE TABLE IF NOT EXISTS tax_paid_flags (
    id TEXT PRIMARY KEY,
    tax_type TEXT NOT NULL,
    year INTEGER NOT NULL,
    month INTEGER,
    paid INTEGER DEFAULT 0,
    paid_date TEXT,
    amount REAL,
    user_id TEXT,
    UNIQUE(tax_type, year, month)
);

-- Таблица дополнительной работы
CREATE TABLE IF NOT EXISTS extra_work (
    id TEXT PRIMARY KEY,
    date TEXT NOT NULL,
    hours REAL,
    rate REAL,
    description TEXT,
    payment_mode TEXT,
    payment_amount REAL,
    payments TEXT, -- JSON array
    user_id TEXT
);

-- Индексы для производительности
CREATE INDEX IF NOT EXISTS idx_tasks_user_id ON tasks(user_id);
CREATE INDEX IF NOT EXISTS idx_tasks_customer_id ON tasks(customer_id);
CREATE INDEX IF NOT EXISTS idx_customers_user_id ON customers(user_id);
CREATE INDEX IF NOT EXISTS idx_credits_user_id ON credits(user_id);
CREATE INDEX IF NOT EXISTS idx_credit_schedule_credit_id ON credit_schedule(credit_id);
```

**Важно:** В примере выше добавлено поле `user_id` для мультитенантности. Если приложение будет только для одного пользователя, это поле можно не добавлять (но лучше оставить для будущего).

---

## Этап 3: Установка Supabase клиента (5 минут)

### Шаг 3.1: Установить зависимости

```bash
npm install @supabase/supabase-js
```

### Шаг 3.2: Создать Supabase клиент

Создайте файл `src/shared/lib/api/supabase-client.ts`:

```typescript
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
```

---

## Этап 4: Добавить переменные окружения в Vercel (2 минуты)

1. Откройте проект в Vercel Dashboard: https://vercel.com/dashboard
2. Перейдите в **Settings** → **Environment Variables**
3. Добавьте переменные:
   - **Key**: `VITE_SUPABASE_URL` → **Value**: ваш Project URL
   - **Key**: `VITE_SUPABASE_ANON_KEY` → **Value**: ваш anon public key
4. Выберите **Production, Preview, Development** для всех окружений
5. Нажмите **Save**
6. Перейдите в **Deployments** → выберите последний деплой → **Redeploy**

---

## Этап 5: Создать API клиент (замена IPC) (30-60 минут)

Это самый большой этап. Нужно создать HTTP клиент, который заменит IPC вызовы.

### Шаг 5.1: Создать базовый API клиент

Создайте `src/shared/lib/api/api-client.ts`:

```typescript
import { supabase } from './supabase-client';
import type { Task } from '@/types';
import type { Customer } from '@/types';
// ... другие типы

export const apiClient = {
  // Tasks
  async loadTasks(): Promise<Task[]> {
    const { data, error } = await supabase
      .from('tasks')
      .select('*');
    
    if (error) throw error;
    return data || [];
  },

  async saveTasks(tasks: Task[]): Promise<void> {
    // Реализация сохранения
    // Нужно будет обработать upsert для каждой задачи
  },

  // Customers
  async loadCustomers(): Promise<Customer[]> {
    const { data, error } = await supabase
      .from('customers')
      .select('*');
    
    if (error) throw error;
    return data || [];
  },

  async saveCustomers(customers: Customer[]): Promise<void> {
    // Реализация
  },

  // ... остальные методы
};
```

### Шаг 5.2: Создать абстракцию (data-source)

Создайте `src/shared/lib/data-source.ts`:

```typescript
import { loadTasksFromDisk, saveTasksToDisk } from './electron-bridge';
import * as apiClient from './api/api-client';

function isElectron(): boolean {
  return typeof window !== 'undefined' && !!window.crm;
}

export async function loadTasks() {
  if (isElectron()) {
    return await loadTasksFromDisk();
  } else {
    return await apiClient.loadTasks();
  }
}

export async function saveTasks(tasks: Task[]) {
  if (isElectron()) {
    return await saveTasksToDisk(tasks);
  } else {
    return await apiClient.saveTasks(tasks);
  }
}

// ... остальные методы для других сущностей
```

### Шаг 5.3: Обновить electron-bridge.ts

Замените прямые вызовы IPC на использование `data-source`:

```typescript
// Вместо:
export async function loadTasksFromDisk() {
  return await window.crm.loadTasks();
}

// Будет:
import { loadTasks } from './data-source';
export async function loadTasksFromDisk() {
  return await loadTasks(); // Автоматически выберет правильный источник
}
```

---

## Этап 6: Настройка Storage для файлов (10 минут)

### Шаг 6.1: Создать bucket в Supabase

1. В Supabase откройте **Storage**
2. Нажмите **New bucket**
3. Название: `task-files`
4. Выберите **Public bucket** (или Private, если нужна авторизация)
5. Создайте

### Шаг 6.2: Обновить работу с файлами

Создайте `src/shared/lib/api/files-api.ts`:

```typescript
import { supabase } from './supabase-client';

export async function uploadTaskFile(
  taskId: string,
  file: File
): Promise<string> {
  const fileName = `${Date.now()}-${file.name}`;
  const filePath = `${taskId}/${fileName}`;

  const { data, error } = await supabase.storage
    .from('task-files')
    .upload(filePath, file);

  if (error) throw error;

  // Получаем публичный URL
  const { data: { publicUrl } } = supabase.storage
    .from('task-files')
    .getPublicUrl(filePath);

  return publicUrl;
}
```

---

## Этап 7: Тестирование

1. Проверьте загрузку данных в браузере
2. Проверьте сохранение данных
3. Проверьте работу с файлами
4. Убедитесь, что все страницы работают

---

## Полезные ссылки

- Supabase Dashboard: https://app.supabase.com
- Vercel Dashboard: https://vercel.com/dashboard
- Supabase Docs: https://supabase.com/docs
- GitHub Repo: https://github.com/sixxset5-star/crm-desktop

---

## Порядок выполнения

1. ✅ Этап 1: Настроить Supabase (5-10 мин)
2. ✅ Этап 2: Создать схему БД (15-20 мин)
3. ✅ Этап 3: Установить клиент (5 мин)
4. ✅ Этап 4: Добавить env переменные (2 мин)
5. ⏳ Этап 5: Создать API клиент (30-60 мин) - **самый большой этап**
6. ⏳ Этап 6: Настроить Storage (10 мин)
7. ⏳ Этап 7: Тестирование

---

## Важные замечания

1. **Мультитенантность**: Если планируется несколько пользователей, нужно добавить Row Level Security (RLS) в Supabase
2. **Миграция данных**: Если есть существующие данные в SQLite, нужно написать скрипт миграции
3. **Безопасность**: Используйте RLS для защиты данных пользователей
4. **Производительность**: Добавьте индексы на часто используемые поля

---

## Нужна помощь?

Если что-то непонятно или нужна помощь с конкретным этапом - спрашивайте!

