

# Архитектура CRM Desktop

## Обзор проекта

**CRM Desktop** — это кроссплатформенное приложение для управления задачами, клиентами и финансами. Приложение поддерживает два режима работы:

1. **Desktop режим** (Electron) — десктопное приложение с локальной SQLite базой данных
2. **Web режим** (браузер) — веб-версия с облачной базой данных Supabase

Приложение использует React + TypeScript для UI и автоматически переключается между локальным (SQLite) и облачным (Supabase) хранилищем в зависимости от окружения.

## Технологический стек

- **Frontend**: React 18 + TypeScript
- **Desktop Backend**: Electron 30
- **Cloud Backend**: Supabase (PostgreSQL + Storage)
- **State Management**: Zustand 4.x
- **Database**: 
  - SQLite (better-sqlite3) для Electron
  - Supabase (PostgreSQL) для веб-версии
- **Build Tool**: Vite 5.x
- **Routing**: React Router 6.x (HashRouter)
- **Testing**: Vitest + React Testing Library
- **Validation**: Zod (для DTO валидации)
- **Virtualization**: react-window (для больших списков)
- **Updates**: electron-updater
- **Deployment**: Vercel (для веб-версии)

## Архитектурные слои

Приложение следует многослойной архитектуре с поддержкой двух режимов работы:

```
┌──────────────────────────────────────┐
│         UI Layer (React)             │
│  - Pages (оркестрация)               │
│  - Components (UI компоненты)        │
│  - Error Boundaries                  │
└──────────────┬───────────────────────┘
               │
┌──────────────▼───────────────────────┐
│      State Layer (Zustand)           │
│  - Store модули (только состояние)   │
│  - Использует data-source абстракцию  │
└──────────────┬───────────────────────┘
               │
┌──────────────▼───────────────────────┐
│   Data Source Layer (Абстракция)     │
│  - data-source.ts                    │
│  - Автоматическое переключение:      │
│    • Electron → IPC bridge            │
│    • Browser → API client             │
└──────────────┬───────────────────────┘
               │
        ┌──────┴──────┐
        │             │
┌───────▼──────┐ ┌───▼──────────────┐
│ IPC Layer    │ │ HTTP API Layer    │
│ (Electron)   │ │ (Browser/Supabase)│
│              │ │                   │
│ - Типизир.   │ │ - api-client.ts   │
│   контракты  │ │ - storage-client  │
│ - Валидация  │ │ - supabase-client │
│ - IPC bridge │ │                   │
└───────┬──────┘ └───────────────────┘
        │             │
        └──────┬──────┘
               │
┌──────────────▼───────────────────────┐
│      Domain Layer (Business Logic)   │
│  - Domain Services (бизнес-логика)   │
│  - Валидация (Zod DTO)               │
│  - Бизнес-правила                    │
└──────────────┬───────────────────────┘
               │
        ┌──────┴──────┐
        │             │
┌───────▼──────┐ ┌───▼──────────────┐
│ Repository    │ │ Supabase Tables  │
│ Layer         │ │ (PostgreSQL)     │
│ (Electron)    │ │                   │
│               │ │ - RLS policies    │
│ - Репозитории │ │ - Storage buckets  │
│ - Маппинг     │ │                   │
└───────┬───────┘ └───────────────────┘
        │             │
┌───────▼─────────────▼──────────────┐
│      Database Layer                 │
│  - SQLite (Electron)                │
│  - Supabase (Browser)               │
└──────────────────────────────────────┘
```

## Структура проекта

```
crm-desktop/
├── src/                           # Исходный код приложения
│   ├── pages/                     # Страницы приложения (роутинг)
│   │   ├── Dashboard.tsx          # Главная страница (Kanban доска)
│   │   ├── Reports.tsx            # Отчеты
│   │   ├── Workload.tsx           # Нагрузка и планирование
│   │   ├── Customers.tsx          # Управление клиентами
│   │   ├── Contractors.tsx       # Управление подрядчиками
│   │   ├── Settings.tsx           # Настройки приложения
│   │   ├── Archive.tsx            # Архив задач и доходов
│   │   ├── FinancialModel.tsx     # Финансовая модель
│   │   ├── Calculator.tsx        # Калькулятор
│   │   ├── Taxes.tsx             # Налоги
│   │   ├── Goals.tsx             # Финансовые цели
│   │   └── [page-name]/          # Подпапки с компонентами страниц
│   │       ├── components/       # Компоненты страницы
│   │       ├── hooks/            # Хуки страницы
│   │       └── utils/            # Утилиты страницы
│   ├── components/                # Компоненты уровня приложения
│   │   └── task-form/            # Форма задачи (сложный компонент)
│   │       ├── components/       # Подкомпоненты формы
│   │       ├── hooks/            # Хуки формы
│   │       ├── sections/         # Секции формы
│   │       └── utils/            # Утилиты формы
│   ├── shared/                    # Переиспользуемые компоненты и утилиты
│   │   ├── components/           # Общие компоненты
│   │   │   ├── ErrorBoundary.tsx  # Границы ошибок
│   │   │   ├── DialogManager.tsx # Менеджер диалогов
│   │   │   ├── Layout.tsx         # Основной layout
│   │   │   ├── Sidebar.tsx       # Боковая панель
│   │   │   └── ...
│   │   ├── lib/                   # Утилиты
│   │   │   ├── ipc-contract-v2.ts # Типизированный IPC контракт
│   │   │   ├── electron-bridge.ts # IPC bridge
│   │   │   ├── logger.ts          # Логирование
│   │   │   ├── error-handler.ts   # Обработка ошибок
│   │   │   └── ...
│   │   ├── ui/                    # UI компоненты (кнопки, инпуты и т.д.)
│   │   ├── hooks/                 # Переиспользуемые хуки
│   │   ├── utils/                 # Переиспользуемые утилиты
│   │   ├── constants/             # Константы
│   │   ├── store/                 # Базовые store утилиты
│   │   └── styles/                # Глобальные стили и токены
│   ├── domain/                    # Domain модели (frontend)
│   │   ├── task.ts                # Модель задачи
│   │   ├── customer.ts            # Модель клиента
│   │   ├── income.ts              # Модель дохода
│   │   └── finance/               # Финансовые расчеты
│   ├── store/                     # Управление состоянием (Zustand)
│   │   ├── board.ts               # Задачи и Kanban доска
│   │   ├── customers.ts           # Клиенты
│   │   ├── contractors.ts         # Подрядчики
│   │   ├── goals.ts               # Финансовые цели и кредиты
│   │   ├── credits.ts             # Кредиты (отдельный store)
│   │   ├── income.ts              # Доходы
│   │   ├── taxes.ts               # Налоги
│   │   ├── calculator.ts          # Калькулятор
│   │   ├── settings.ts            # Настройки
│   │   ├── ui.ts                  # UI состояние
│   │   ├── extra-work.ts          # Дополнительная работа
│   │   ├── financialSnapshots.ts  # Финансовые снимки
│   │   └── history.ts              # История изменений
│   ├── types/                     # TypeScript типы
│   ├── hooks/                      # Хуки уровня приложения
│   ├── test/                       # Тестовые утилиты
│   ├── App.tsx                     # Корневой компонент (роутинг)
│   └── main.tsx                    # Точка входа (инициализация store)
│
├── electron/                       # Electron backend
│   ├── main.js                     # Главный процесс (инициализация)
│   ├── preload.cjs                 # Preload скрипт (безопасный мост)
│   ├── database.js                 # Работа с SQLite БД и миграции
│   ├── domain/                     # Domain-сервисы (бизнес-логика)
│   │   ├── tasks-service.js        # Бизнес-логика задач
│   │   ├── customers-service.js    # Бизнес-логика клиентов
│   │   ├── contractors-service.js  # Бизнес-логика подрядчиков
│   │   ├── credits-service.js      # Бизнес-логика кредитов
│   │   ├── dto/                    # Data Transfer Objects (валидация)
│   │   │   ├── task.dto.js
│   │   │   ├── customer.dto.js
│   │   │   ├── contractor.dto.js
│   │   │   └── ...
│   │   ├── errors.js               # Доменные ошибки
│   │   ├── error-shape.js          # Форма ошибок
│   │   └── error-details.js        # Детали ошибок
│   ├── repositories/               # Репозитории (доступ к данным)
│   │   ├── base-repository.js      # Базовый репозиторий
│   │   ├── tasks-repository.js     # Репозиторий задач
│   │   ├── customers-repository.js # Репозиторий клиентов
│   │   ├── contractors-repository.js
│   │   ├── credits-repository.js
│   │   └── mappers/                # Мапперы БД ↔ Domain
│   │       └── task-mapper.js
│   ├── ipc/                        # IPC обработчики
│   │   ├── tasks-ipc.js            # IPC для задач
│   │   ├── customers-ipc.js        # IPC для клиентов
│   │   ├── contractors-ipc.js     # IPC для подрядчиков
│   │   ├── credits-ipc.js          # IPC для кредитов
│   │   ├── goals-ipc.js            # IPC для целей
│   │   ├── incomes-ipc.js          # IPC для доходов
│   │   ├── taxes-ipc.js            # IPC для налогов
│   │   ├── calculations-ipc.js    # IPC для расчетов
│   │   ├── extra-work-ipc.js       # IPC для дополнительной работы
│   │   ├── settings-ipc.js         # IPC для настроек
│   │   ├── files-ipc.js            # IPC для файлов
│   │   ├── avatars-ipc.js          # IPC для аватаров
│   │   ├── csv-ipc.js              # IPC для CSV
│   │   ├── notifications-ipc.js    # IPC для уведомлений
│   │   ├── updates-ipc.js          # IPC для обновлений
│   │   ├── ipc-errors.js           # Централизованные ошибки
│   │   ├── ipc-contract-registry.js # Реестр контрактов
│   │   ├── ipc-validator.js        # Валидатор IPC
│   │   └── event-validator.js      # Валидатор событий
│   └── services/                   # Сервисы Electron
│       ├── window-service.js       # Управление окнами
│       ├── protocol-service.js     # Кастомные протоколы
│       ├── app-service.js           # Сервис приложения
│       ├── backup-service.js        # Резервное копирование
│       ├── db-service.js            # Сервис БД
│       ├── db-queue.js              # Очередь операций БД
│       ├── files-service.js        # Работа с файлами
│       ├── csv-service.js           # Работа с CSV
│       ├── logger.js                # Логирование
│       ├── audit-logger.js          # Аудит-лог
│       ├── notifications-service.js # Уведомления
│       ├── updates-service.js       # Обновления
│       ├── avatars-sync-scheduler.js # Синхронизация аватаров
│       ├── telegram-avatar-service.js
│       ├── event-bus.js             # Шина событий
│       └── ...
│
├── assets/                         # Иконки и ресурсы
├── scripts/                        # Вспомогательные скрипты
│   ├── bump-version.mjs            # Увеличение версии
│   ├── clean-release.mjs           # Очистка релиза
│   ├── serve-updates.mjs            # Сервер обновлений
│   └── restore-*.mjs               # Скрипты восстановления данных
├── devtools/                       # Скрипты для разработки
├── docs/                           # Документация
├── dist/                           # Собранное приложение (после build)
└── release/                        # Готовые релизы (.dmg, .app)
```

## Архитектурные принципы

### 1. Разделение ответственности

**UI Layer** — только отображение и взаимодействие с пользователем
- Страницы оркеструют данные и роутинг
- Компоненты — чистые UI элементы
- Error Boundaries изолируют ошибки

**State Layer** — управление состоянием
- Zustand stores содержат только состояние
- Бизнес-логика вынесена в domain-сервисы
- Автосохранение через подписки

**IPC Layer** — коммуникация между процессами
- Типизированные контракты (`ipc-contract-v2.ts`)
- Валидация каналов в preload и через `ipc-validator.js`
- Единый формат ответов (`IpcResult<T>`)
- Реестр контрактов (`ipc-contract-registry.js`)
- Поддержка событий (updates, banner)

**Domain Layer** — бизнес-логика
- Domain-сервисы содержат валидацию и правила
- DTO слой для валидации входных данных (Zod схемы)
- Domain модели в `src/domain/` для frontend
- Независимы от UI и БД
- Могут быть переиспользованы
- Централизованная обработка ошибок (`errors.js`, `error-shape.js`)

**Repository Layer** — доступ к данным
- Репозитории отвечают только за CRUD
- Маппинг между БД и domain моделями
- Транзакции и оптимизация запросов

### 2. Управление состоянием (Zustand)

Каждый store модуль отвечает за свою доменную область:
- **board.ts** — задачи и Kanban доска
- **customers.ts** — клиенты и контакты
- **contractors.ts** — подрядчики
- **goals.ts** — финансовые цели и кредиты
- **credits.ts** — кредиты (расширенный функционал)
- **income.ts** — доходы
- **taxes.ts** — налоги и платежи
- **calculator.ts** — расчеты калькулятора
- **settings.ts** — настройки приложения
- **ui.ts** — UI состояние (модалки, диалоги и т.д.)
- **extra-work.ts** — дополнительная работа
- **financialSnapshots.ts** — финансовые снимки
- **history.ts** — история изменений

Все store модули имеют методы `loadFromDisk()` и используют IPC bridge для синхронизации с БД. Инициализация всех stores происходит параллельно в `loadAllStores()`.

### 3. Работа с данными

**Хранение**: SQLite база данных
- Путь: `~/Library/Application Support/CRM Desktop/crm.db` (macOS)
- Все операции с БД выполняются в Electron main процессе
- Renderer процесс общается с БД через IPC каналы

**IPC каналы** (определены в `src/shared/lib/ipc-contract-v2.ts`):
- `tasks:*` — операции с задачами (load, save)
- `customers:*` — операции с клиентами (load, save)
- `contractors:*` — операции с подрядчиками (load, save, deactivate, delete)
- `goals:*` — операции с целями (load, save)
- `credits:*` — операции с кредитами (load, save, buildSchedule, rebuildSchedule, applyPayment, delete, calculate*, getUpcomingPayments, migrate*)
- `incomes:*` — операции с доходами (load, save)
- `taxes:*` — операции с налогами (load, save)
- `calculations:*` — операции с расчетами (load, save)
- `extra-work:*` — операции с дополнительной работой (load, save)
- `settings:*` — операции с настройками (load, save)
- `files:*` — работа с файлами (select, getTaskDir, copy, getSize, open, download, rename)
- `avatar:*` — выбор аватара
- `avatars:*` — синхронизация аватаров (syncCustomers, syncContractors, syncAll, getChatId)
- `csv:*` — работа с CSV (select, read, save)
- `url:openExternal` — открытие внешних URL
- `database:*` — работа с БД (open, getPath)
- `notification:show` — показ уведомлений
- `updates:*` — обновления приложения (check, install)

**Формат ответов IPC**:
```typescript
type IpcResult<T> = 
  | { ok: true; data: T }
  | { ok: false; code: string; message: string; details?: unknown };
```

**Типизация IPC**:
- Все каналы типизированы через `IpcContract` в `ipc-contract-v2.ts`
- Типизированный API через `IpcApiTyped` интерфейс
- Валидация каналов в preload скрипте
- Поддержка событий (updates, banner) через `onEvent`

### 4. Компонентная архитектура

**Принципы**:
- `src/pages` — только оркестрация данных и роутинг
- Каждая страница может иметь подпапку `[page-name]/` с компонентами, хуками и утилитами
- UI компоненты выносятся в `src/components` или `src/shared/components`
- Переиспользуемые UI элементы в `src/shared/ui`
- Композиция вместо prop drilling
- Error Boundaries на уровне страниц
- Lazy loading страниц для оптимизации начальной загрузки
- Preloading критичных страниц после загрузки приложения

**Структура компонентов**:
- `src/shared/components/` — общие компоненты приложения (Layout, Sidebar, ErrorBoundary, DialogManager)
- `src/shared/ui/` — базовые UI компоненты (Button, Input, Modal, Card и т.д.)
- `src/components/` — компоненты уровня приложения (например, TaskFormModal)
- `src/pages/[page-name]/components/` — компоненты конкретной страницы
- `src/pages/[page-name]/hooks/` — хуки конкретной страницы
- `src/pages/[page-name]/utils/` — утилиты конкретной страницы

### 5. Стилизация

- Используются CSS модули для компонентов (`.module.css`)
- Глобальные токены дизайна в `src/shared/styles/tokens.css`
- Переменные CSS для цветов, отступов, типографики
- Запрещены ad-hoc hex значения (используются токены)

### 6. Обработка ошибок

**Error Boundaries**:
- Глобальный Error Boundary в `main.tsx`
- Error Boundaries на уровне каждой страницы (через `PageWrapper`)
- Fallback UI с возможностью восстановления
- Компонент `ErrorBoundary` в `src/shared/components/ErrorBoundary.tsx`

**IPC ошибки**:
- Централизованные коды ошибок (`ipc-errors.js`)
- Стандартизированный формат ответов (`IpcResult<T>`)
- Автоматическая отправка ошибок в UI
- Доменные ошибки в `electron/domain/errors.js`
- Форма ошибок через `error-shape.js` и `error-details.js`

**Обработка ошибок на frontend**:
- Централизованный обработчик через `error-handler.ts`
- Хук `useErrorHandler` для компонентов
- Типы ошибок в `error-types.ts`
- Обертка `withErrorHandling` для функций

### 7. Безопасность

**Preload скрипт**:
- Белый список разрешенных IPC каналов
- Валидация всех вызовов
- Защита от инъекций

**Context Isolation**:
- `contextIsolation: true` в webPreferences
- `nodeIntegration: false`
- Все взаимодействие через contextBridge

## Точки входа

### 1. Electron Main Process
`electron/main.js` — создает сервисы, обрабатывает IPC, управляет жизненным циклом

### 2. React Application
`src/main.tsx` — инициализирует React приложение, загружает данные из store

### 3. Routing
`src/App.tsx` — настраивает роутинг (HashRouter для Electron)

**Страницы приложения**:
- `/` — Dashboard (Kanban доска)
- `/reports` — Reports (Отчеты)
- `/workload` — Workload (Нагрузка)
- `/customers` — Customers (Клиенты)
- `/contractors` — Contractors (Подрядчики)
- `/financial-model` — FinancialModel (Финансовая модель)
- `/calculator` — Calculator (Калькулятор)
- `/taxes` — Taxes (Налоги)
- `/settings` — Settings (Настройки)
- `/archive` — Archive (Архив)

Все страницы загружаются через lazy loading для оптимизации.

## Основные функции

1. **Kanban доска** — управление задачами (board.ts, Dashboard)
2. **Клиенты** — CRM функционал (customers.ts, Customers page)
3. **Подрядчики** — управление подрядчиками (contractors.ts, Contractors page)
4. **Финансы** — доходы, расходы, кредиты (income.ts, financialSnapshots.ts)
5. **Кредиты** — управление кредитами с графиками платежей (credits.ts)
6. **Цели** — финансовые цели и отслеживание (goals.ts)
7. **Налоги** — учет налоговых платежей (taxes.ts, Taxes page)
8. **Калькулятор** — расчеты стоимости (calculator.ts, Calculator page)
9. **Финансовая модель** — прогнозирование и планирование (FinancialModel page)
10. **Отчеты** — аналитика и отчеты (Reports page)
11. **Нагрузка** — планирование и распределение нагрузки (Workload page, extra-work.ts)
12. **Архив** — архив задач и доходов (Archive page)
13. **Telegram интеграция** — синхронизация аватаров через Telegram
14. **Автообновления** — через electron-updater

## Запуск и разработка

```bash
# Установка зависимостей
npm install

# Режим разработки (hot-reload)
npm run dev

# Production сборка
npm run build

# Запуск production версии
npm start

# Сборка для macOS (.dmg)
npm run dist:mac
```

## База данных

**Схема** (основные таблицы):
- `tasks` — задачи
- `customers` — клиенты
- `contractors` — подрядчики
- `goals` — цели
- `monthly_financial_goals` — месячные финансовые цели
- `credits` — кредиты
- `credit_schedule` — график платежей по кредитам
- `incomes` — доходы
- `settings` — настройки
- `calculations` — расчеты
- `tax_paid_flags` — флаги оплаты налогов
- `extra_work` — дополнительная работа
- `schema_meta` — метаданные схемы БД

Все операции с БД выполняются через репозитории с использованием better-sqlite3. Очередь операций БД через `db-queue.js` для оптимизации.

**Миграции**:
- Версионирование схемы через `schema_meta` таблицу
- Миграции определяются в `database.js`
- Автоматическое применение при запуске
- Поддержка миграций данных (например, `credits-migration.js`)

## Тестирование

- Тесты: Vitest + React Testing Library
- Запуск: `npm test`
- UI тесты: `npm run test:ui`
- Coverage: `npm run test:coverage`

## Важные замечания для разработчика

1. **Пути импорта**: Используются алиасы `@/` для `src/` (настроено в `tsconfig.json` и `vite.config.ts`)

2. **Electron IPC**: Все взаимодействие с БД и системой происходит через IPC каналы, определенные в `src/shared/lib/ipc-contract-v2.ts`. Используйте типизированный API через `window.crm.invoke()`.

3. **State persistence**: Каждый store модуль сам отвечает за сохранение/загрузку данных через IPC. Все stores загружаются параллельно при старте приложения.

4. **Стили**: Используются CSS модули и CSS переменные (токены), избегать inline стилей. Токены определены в `src/shared/styles/tokens.css`.

5. **Компоненты**: Новые компоненты должны быть параметризованы через props, дублирование разметки недопустимо. Страницы (`src/pages`) должны быть тонкими и только оркестрировать данные.

6. **Domain модели**: Используйте domain модели из `src/domain/` для бизнес-логики на frontend. Валидация входных данных через DTO в `electron/domain/dto/`.

7. **Обработка ошибок**: Используйте централизованную обработку ошибок через `error-handler.ts` и доменные ошибки из `electron/domain/errors.js`.

8. **Логирование**: Используйте `createLogger()` из `src/shared/lib/logger.ts` для логирования на frontend.

9. **Архитектура**: При добавлении новой функциональности следовать слоистой архитектуре:
   - Создать DTO для валидации в `electron/domain/dto/`
   - Создать domain-сервис для бизнес-логики в `electron/domain/`
   - Создать репозиторий для доступа к данным в `electron/repositories/`
   - Создать IPC обработчик в `electron/ipc/`
   - Обновить типы в `ipc-contract-v2.ts`
   - Обновить store модуль в `src/store/` (только состояние)
   - При необходимости создать domain модель в `src/domain/`

10. **Тестирование**: Компоненты и хуки должны иметь тесты в `__tests__/` папках. Используйте Vitest и React Testing Library.
