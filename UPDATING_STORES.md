# 🔄 Обновление Stores для использования data-source

API клиент создан! Теперь нужно обновить stores, чтобы они использовали новый data-source вместо прямых вызовов electron-bridge.

## Что нужно сделать:

Заменить импорты в каждом store файле:

**Было:**
```typescript
import { loadTasksFromDisk, saveTasksToDisk } from '@/shared/lib/electron-bridge';
```

**Стало:**
```typescript
import { loadTasks, saveTasks } from '@/shared/lib/data-source';
```

И заменить вызовы:
- `loadTasksFromDisk()` → `loadTasks()`
- `saveTasksToDisk()` → `saveTasks()`

## Файлы для обновления:

- ✅ `src/store/board.ts` - уже обновлен
- ⏳ `src/store/customers.ts`
- ⏳ `src/store/contractors.ts`
- ⏳ `src/store/goals.ts`
- ⏳ `src/store/credits.ts`
- ⏳ `src/store/income.ts`
- ⏳ `src/store/settings.ts`
- ⏳ `src/store/calculator.ts`
- ⏳ `src/store/taxes.ts`
- ⏳ `src/store/extra-work.ts`

## Замена для каждого store:

### Customers
- `loadCustomersFromDisk()` → `loadCustomers()`
- `saveCustomersToDisk()` → `saveCustomers()`

### Contractors
- `loadContractorsFromDisk()` → `loadContractors()`
- `saveContractorsToDisk()` → `saveContractors()`

### Goals
- `loadGoalsFromDisk()` → `loadGoals()`
- `saveGoalsToDisk()` → `saveGoals()`

### Credits
- `loadCreditsFromDisk()` → `loadCredits()`
- `saveCreditToDisk()` → `saveCredit()`
- `deleteCreditOnDisk()` → `deleteCredit()`

### Income
- `loadIncomesFromDisk()` → `loadIncomes()`
- `saveIncomesToDisk()` → `saveIncomes()`

### Settings
- `loadSettingsFromDisk()` → `loadSettings()`
- `saveSettingsToDisk()` → `saveSettings()`

### Calculations
- `loadCalculationsFromDisk()` → `loadCalculations()`
- `saveCalculationsToDisk()` → `saveCalculations()`

### Taxes
- `loadTaxesFromDisk()` → `loadTaxes()`
- `saveTaxesToDisk()` → `saveTaxes()`

### Extra Work
- `loadExtraWorkFromDisk()` → `loadExtraWork()`
- `saveExtraWorkToDisk()` → `saveExtraWork()`

---

Продолжаем обновлять stores? Это можно сделать автоматически.
