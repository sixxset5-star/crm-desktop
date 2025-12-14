# Проверка целостности модуля "Умные кредиты"

## ✅ Проверено и исправлено

### 1. База данных

**Таблица `credits`:**
- ✅ `id` - PRIMARY KEY
- ✅ `name` - NOT NULL
- ✅ `description` - TEXT (опционально)
- ✅ `start_date` - TEXT
- ✅ `schedule_type` - TEXT DEFAULT 'annuity' ('annuity' | 'differentiated')
- ✅ `amount` - REAL (исходная сумма)
- ✅ `current_balance` - REAL (обновляется только через domain-service)
- ✅ `interest_rate` - REAL (годовая ставка, в domain называется `annualRate`)
- ✅ `term_months` - INTEGER
- ✅ `monthly_payment` - REAL
- ✅ `status` - TEXT DEFAULT 'active' ('active' | 'archived')
- ✅ `notes` - TEXT
- ✅ Legacy поля: `paid_this_month`, `last_paid_month`, `payment_date`

**Таблица `credit_schedule_items`:**
- ✅ `id` - PRIMARY KEY
- ✅ `credit_id` - FOREIGN KEY → credits(id) ON DELETE CASCADE
- ✅ `month_number` - INTEGER NOT NULL
- ✅ `payment_date` - TEXT NOT NULL
- ✅ `planned_payment` - REAL NOT NULL
- ✅ `interest_part` - REAL NOT NULL (проценты)
- ✅ `principal_part` - REAL NOT NULL (погашение тела)
- ✅ `remaining_balance` - REAL NOT NULL (остаток ПОСЛЕ применения строки)
- ✅ `paid` - INTEGER DEFAULT 0 (0/1)
- ✅ `paid_amount` - REAL (фактическая сумма оплаты)
- ✅ `paid_at` - TEXT (дата фактической оплаты)

**Индексы:**
- ✅ `idx_credit_schedule_items_credit_id` - для быстрого поиска по credit_id

### 2. Repository Layer

**Методы CreditsRepository:**
- ✅ `findAll()` - загрузить все кредиты
- ✅ `findById(id)` - найти кредит по ID
- ✅ `getAllCreditsWithSchedule()` - **НОВЫЙ** - загрузить все кредиты с графиками (schedule строго отсортирован по month_number)
- ✅ `findScheduleByCreditId(creditId)` - загрузить график (сортировка по month_number ASC)
- ✅ `save(credit)` - сохранить кредит
- ✅ `saveSchedule(creditId, scheduleItems)` - сохранить график (batch, транзакция)
- ✅ `updateScheduleItem(item)` - обновить строку графика
- ✅ `findScheduleItemById(id)` - найти строку по ID
- ✅ `delete(id)` - удалить кредит (каскадно)

**Маппинг:**
- ✅ `mapCreditToDb()` - Domain → DB (interestRate → interest_rate)
- ✅ `mapCreditFromDb()` - DB → Domain (interest_rate → interestRate)
- ✅ `mapScheduleItemToDb()` - Domain → DB
- ✅ `mapScheduleItemFromDb()` - DB → Domain

### 3. Domain Layer

**Функции credits-service.js:**
- ✅ `calculateAnnuityPayment(amount, annualRate, termMonths)` - режим 1
- ✅ `calculateTermFromPayment(amount, annualRate, monthlyPayment)` - режим 2
- ✅ `calculateAmountFromPayment(annualRate, termMonths, monthlyPayment)` - режим 3
- ✅ `buildAnnuitySchedule(params)` - аннуитетный график
- ✅ `buildDifferentiatedSchedule(params)` - дифференцированный график
- ✅ `buildSchedule(params)` - выбор типа графика
- ✅ `applyPayment(schedule, itemIndex, paidAmount)` - применить/откатить оплату
- ✅ `recalculateCurrentBalance(credit, schedule)` - **ВАЖНО**: current_balance обновляется только через эту функцию
- ✅ `rebuildAfterChange(params)` - **НОВЫЙ** - перестроить график с сохранением paid статусов
- ✅ `calculateCreditSummary(credit, schedule)` - итоговые показатели
- ✅ `getUpcomingPayments(credits, scheduleMap, daysAhead)` - напоминания

**Константы:**
- ✅ `SCHEDULE_TYPES` - 'annuity' | 'differentiated'
- ✅ `CREDIT_STATUS` - 'active' | 'archived'
- ✅ `INPUT_MODES` - режимы умного ввода

### 4. IPC Layer

**Каналы в credits-ipc.js:**
- ✅ `credits:load` - загрузить все кредиты с графиками
- ✅ `credits:save` - сохранить кредит (с графиком)
- ✅ `credits:buildSchedule` - построить график
- ✅ `credits:rebuildSchedule` - **НОВЫЙ** - перестроить график после изменения параметров
- ✅ `credits:applyPayment` - применить оплату
- ✅ `credits:delete` - удалить кредит
- ✅ `credits:calculatePayment` - режим 1 (умный ввод)
- ✅ `credits:calculateTerm` - режим 2 (умный ввод)
- ✅ `credits:calculateAmount` - режим 3 (умный ввод)
- ✅ `credits:getUpcomingPayments` - напоминания

**Белый список каналов:**
- ✅ Все каналы добавлены в `preload.cjs` (IPC_CONTRACT_CHANNELS)
- ✅ Все каналы добавлены в `ipc-contract-registry.js`
- ✅ Все каналы добавлены в `ipc-contract-v2.ts` (TypeScript контракты)

**Preload методы:**
- ✅ `loadCredits()` → `credits:load`
- ✅ `saveCredit(credit)` → `credits:save`
- ✅ `buildCreditSchedule(params)` → `credits:buildSchedule`
- ✅ `rebuildCreditSchedule(params)` → `credits:rebuildSchedule` **НОВЫЙ**
- ✅ `applyCreditPayment(params)` → `credits:applyPayment`
- ✅ `deleteCredit(params)` → `credits:delete`
- ✅ `calculateCreditPayment(params)` → `credits:calculatePayment`
- ✅ `calculateCreditTerm(params)` → `credits:calculateTerm`
- ✅ `calculateCreditAmount(params)` → `credits:calculateAmount`
- ✅ `getUpcomingCreditPayments(params)` → `credits:getUpcomingPayments`

**Bridge функции:**
- ✅ Все методы добавлены в `electron-bridge.ts`
- ✅ Типизация через `IpcResult<T>`
- ✅ Обработка ошибок

### 5. Types

**Credit:**
- ✅ Все поля соответствуют БД через маппинг
- ✅ `interestRate` в TypeScript = `interest_rate` в БД = `annualRate` в domain
- ✅ `schedule?: CreditScheduleItem[]` - опционально, загружается отдельно

**CreditScheduleItem:**
- ✅ Все поля соответствуют БД
- ✅ `creditId` - связь с кредитом
- ✅ `monthNumber` - порядковый номер месяца
- ✅ `remainingBalance` - остаток ПОСЛЕ применения строки

### 6. Критические моменты

**✅ current_balance:**
- Обновляется ТОЛЬКО через `recalculateCurrentBalance()` в domain-service
- Вызывается автоматически при сохранении кредита с графиком
- Вызывается при применении оплаты
- Вызывается при перестроении графика

**✅ Сортировка schedule:**
- В БД: `ORDER BY month_number ASC`
- В repository: `findScheduleByCreditId()` гарантирует сортировку
- В `getAllCreditsWithSchedule()` используется отсортированный schedule

**✅ rebuildAfterChange:**
- Сохраняет paid статусы по `monthNumber`
- Если месяц изменился, paid статус может не совпадать (это нормально)
- Пересчитывает остаток автоматически

**✅ Маппинг полей:**
- Domain: `annualRate` (годовая ставка)
- DB: `interest_rate` (годовая ставка)
- TypeScript: `interestRate` (годовая ставка)
- Все маппинги консистентны через repository

## ⚠️ Что нужно проверить при интеграции

### 7. Zustand Store (TODO)

Нужно создать/расширить store для кредитов:
- `credits: Credit[]` - список кредитов
- `loadCredits()` - загрузка через IPC
- `saveCredit(credit)` - сохранение через IPC
- `applyPayment(creditId, itemId, paidAmount)` - применение оплаты
- `buildSchedule(params)` - построение графика
- `rebuildSchedule(creditId, newParams)` - перестроение графика

**ВАЖНО:** Store НЕ должен содержать расчеты - все через domain ↔ IPC.

### 8. UI Components

**SmartCreditForm:**
- ✅ Режимы ввода работают через IPC
- ✅ Автоматические расчеты при изменении полей
- ⚠️ Нужно проверить привязку к дизайн-токенам
- ⚠️ Нужно проверить отсутствие инлайн-стилей

**CreditScheduleTable:**
- ✅ Отображение графика
- ✅ Чекбокс для оплаты → `applyPayment()`
- ✅ Редактирование `paidAmount`
- ⚠️ Нужно проверить обновление остатка в карточке кредита после оплаты
- ⚠️ Нужно проверить стилизацию через токены

### 9. Интеграция в финансовую модель

**TODO:**
- При загрузке месяца: брать `scheduleItems` с `planned_payment` за текущий месяц
- Добавлять в расходы категорию "кредиты"
- Если `paid` - считать как фактический расход
- Остаток долга считать из domain, не из БД напрямую

### 10. Напоминания

**TODO:**
- При загрузке приложения проверять `payment_date`
- Если `today <= payment_date && paid=false` → показывать уведомление
- Использовать `getUpcomingPayments()` из domain

## 🔥 Критические проверки перед запуском

1. ✅ Все каналы в белом списке preload.cjs
2. ✅ Все каналы в IPC контрактах (TypeScript)
3. ✅ Маппинг полей консистентен (interestRate ↔ interest_rate ↔ annualRate)
4. ✅ Schedule всегда отсортирован по month_number
5. ✅ current_balance обновляется только через domain-service
6. ✅ rebuildAfterChange сохраняет paid статусы
7. ⚠️ Store методы вызывают IPC, а не делают расчеты
8. ⚠️ UI компоненты используют токены, не инлайн-стили
9. ⚠️ Финансовая модель интегрирует кредиты правильно

## 📝 Заметки

- В БД используется `interest_rate` (snake_case), в domain `annualRate` (camelCase), в TypeScript `interestRate` (camelCase)
- Маппинг происходит в repository автоматически
- `current_balance` - единственный источник истины для остатка долга
- Schedule всегда должен быть отсортирован по `month_number` для корректной работы UI

