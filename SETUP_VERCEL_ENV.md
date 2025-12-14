# 🔐 Настройка переменных окружения в Vercel

## Ваши Supabase ключи:

- **Project URL**: `https://bddgzxvhosxlyildlmya.supabase.co`
- **Anon Key (Publishable)**: `sb_publishable_y6GXqTFLQ9NvMoOpOeHm4A_osnntYOX`

---

## Шаги для добавления в Vercel:

1. Откройте https://vercel.com/dashboard
2. Выберите проект **crm-desktop**
3. Перейдите в **Settings** (вкладка сверху)
4. Выберите **Environment Variables** (в левом меню)
5. Добавьте две переменные:

   **Переменная 1:**
   - **Key**: `VITE_SUPABASE_URL`
   - **Value**: `https://bddgzxvhosxlyildlmya.supabase.co`
   - **Environments**: выберите все (Production, Preview, Development)
   - Нажмите **Save**

   **Переменная 2:**
   - **Key**: `VITE_SUPABASE_ANON_KEY`
   - **Value**: `sb_publishable_y6GXqTFLQ9NvMoOpOeHm4A_osnntYOX`
   - **Environments**: выберите все (Production, Preview, Development)
   - Нажмите **Save**

6. Перейдите в **Deployments** (вкладка сверху)
7. Найдите последний деплой
8. Нажмите на три точки (⋯) → **Redeploy**

---

## ✅ После этого:

Vercel пересоберет проект с новыми переменными окружения, и Supabase клиент сможет подключиться к вашей базе данных.

---

## ⚠️ Важно:

- **Secret key** (`sb_secret_...`) НЕ добавляйте в Vercel! Он только для backend серверов.
- Используйте только **Publishable key** для frontend (он уже в инструкции выше).
