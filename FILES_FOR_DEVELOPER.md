# Файлы для показа разработчику

## Проблема
Ошибки валидации при сохранении задач и клиентов:
- "Tasks validation failed: 1.expensesEntries.0.title - Expense title is required"
- "Customers validation failed: 0.contact - Invalid input: expected string, received null"

## Ключевые файлы

### 1. DTO (Data Transfer Objects) - схемы валидации
- `electron/domain/dto/task.dto.js` - схемы валидации задач
- `electron/domain/dto/customer.dto.js` - схемы валидации клиентов

### 2. Domain Services - бизнес-логика и нормализация
- `electron/domain/tasks-service.js` - сервис задач (метод `saveAllTasks` с нормализацией)
- `electron/domain/customers-service.js` - сервис клиентов (метод `saveAllCustomers` с нормализацией)

### 3. IPC Handlers - обработчики IPC запросов
- `electron/ipc/tasks-ipc.js` - IPC обработчик для задач
- `electron/ipc/customers-ipc.js` - IPC обработчик для клиентов
- `electron/ipc/ipc-validator.js` - валидатор IPC запросов

### 4. Error Handling
- `electron/domain/errors.js` - обработка ошибок и создание DomainError

### 5. Renderer → Main Bridge
- `src/shared/lib/electron-bridge.ts` - мост между renderer и main процессами
- `electron/preload.cjs` - preload скрипт с типизированными вызовами

### 6. Store (Zustand)
- `src/store/board.ts` - стор задач (метод `loadFromDisk` и автосохранение)
- `src/store/customers.ts` - стор клиентов (метод `loadFromDisk` и автосохранение)

## Логи для показа

Показать логи из терминала, где запущен `npm run dev`:
- Особенно строки с `[WARN] [IpcValidator]` и `[ERROR] [IpcValidator]`
- Строки с `[DEBUG] [TasksService]` и `[DEBUG] [CustomersService]`

## Контекст проблемы

1. При загрузке задач/клиентов из БД они автоматически сохраняются обратно (через debounce в store)
2. Данные из БД могут содержать:
   - `expensesEntries` с элементами без `title` или с пустым `title`
   - `contact: null` вместо `contact: undefined`
3. Нормализация добавлена в сервисах, но валидация все равно падает
4. Нужно понять, почему нормализация не работает или валидация происходит до нормализации
