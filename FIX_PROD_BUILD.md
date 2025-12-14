# Исправление: старый код в продакшене

## Проблема

Старая версия JS в браузере пытается парсить старую схему настроек (`currency="RUB"` как строка) и падает раньше, чем доходит до `holidays`.

## Решение (3 шага)

### 1. В Supabase: убедиться, что только одна запись `main`

```sql
SELECT key FROM settings;
-- Должна быть только: main

-- Если нет:
DELETE FROM settings WHERE key != 'main';
```

### 2. В Vercel: Redeploy с очисткой кеша (КЛЮЧЕВОЕ!)

1. Откройте [Vercel Dashboard](https://vercel.com/dashboard)
2. Найдите проект
3. Перейдите в **Deployments**
4. Найдите последний deployment
5. Нажмите **"..." (три точки)** → **"Redeploy"**
6. ⚠️ **ВАЖНО**: Включите галку **"Use existing Build Cache"** = **OFF** (или "Clear build cache")
7. Нажмите **"Redeploy"**

### 3. В браузере: полный сброс

1. DevTools (F12) → **Application** → **Clear site data**
2. Закрыть вкладку полностью
3. Открыть заново

## Проверка

После этого в консоли:

✅ **Должен появиться:**
```
[api-client] Settings loaded { holidaysCount: 11, customWeekendsCount: 6 }
```

❌ **НЕ должно быть:**
```
Failed to parse setting currency
```

После этого праздники появятся автоматически.
