# 🔧 Решение проблем

## Ошибка "Failed to fetch (api.supabase.com)"

Эта ошибка обычно означает проблему с подключением к Supabase. Проверьте:

### 1. Переменные окружения в Vercel

Убедитесь, что в Vercel Dashboard → Settings → Environment Variables установлены:

- `VITE_SUPABASE_URL` = `https://bddgzxvhosxlyildlmya.supabase.co`
- `VITE_SUPABASE_ANON_KEY` = `sb_publishable_y6GXqTFLQ9NvMoOpOeHm4A_osnntYOX`

**Важно:**
- URL должен начинаться с `https://` и НЕ содержать `/api` в конце
- Переменные должны быть доступны для всех окружений (Production, Preview, Development)

### 2. Пересоберите проект

После изменения переменных окружения:
1. Откройте Vercel Dashboard → Deployments
2. Нажмите на последний deployment
3. Нажмите "Redeploy"

Или просто сделайте новый push в GitHub - Vercel автоматически пересоберет проект.

### 3. Проверьте консоль браузера

Откройте DevTools (F12) → Console и проверьте:
- Есть ли ошибки с URL Supabase
- Правильно ли загружаются переменные окружения

---

## Праздники и выходные не появляются

### Шаг 1: Удалите старые записи настроек

Выполните в **Supabase SQL Editor**:

```sql
DELETE FROM settings WHERE key != 'main';
```

Проверьте что осталась только одна запись:
```sql
SELECT key FROM settings;
```

### Шаг 2: Перемигрируйте настройки

```bash
cd /Users/rafael/crm-desktop
./run-migration.sh fix-settings
```

### Шаг 3: Обновите страницу с очисткой кэша

- `Ctrl+Shift+R` (Windows/Linux)
- `Cmd+Shift+R` (Mac)
- Или DevTools (F12) → Network → "Disable cache" → обновить

---

## Проверка что данные в Supabase

Выполните в **Supabase SQL Editor**:

```sql
SELECT 
  key,
  CASE 
    WHEN key = 'main' AND value ? 'holidays' THEN jsonb_array_length(value->'holidays')
    ELSE NULL
  END as holidays_count,
  CASE 
    WHEN key = 'main' AND value ? 'customWeekends' THEN jsonb_array_length(value->'customWeekends')
    ELSE NULL
  END as custom_weekends_count
FROM settings
WHERE key = 'main';
```

Должно показать количество праздников и выходных.
