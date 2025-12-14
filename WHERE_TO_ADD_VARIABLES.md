# Где добавить переменные для GitHub Pages

## Способ 1: Через Environment (рекомендуется, если нет Secrets)

1. В Settings → **Environments** (вы уже там были)
2. Найдите environment **`github-pages`** (он уже создан автоматически)
3. Кликните на него
4. Найдите раздел **"Environment variables"** или **"Variables"**
5. Нажмите **"Add variable"** и добавьте две переменные:

   **Variable 1:**
   - Name: `VITE_SUPABASE_URL`
   - Value: `https://bddgzxvhosxlyildlmya.supabase.co`
   
   **Variable 2:**
   - Name: `VITE_SUPABASE_ANON_KEY`
   - Value: `sb_publishable_y6GXqTFLQ9NvMoOpOeHm4A_osnntYOX`

6. Сохраните

## Способ 2: Через Secrets (если есть доступ)

1. Settings → **Security** → **Secrets and variables** → **Actions**
2. Нажмите **"New repository secret"**
3. Добавьте те же две переменные как secrets

## Проверка

После добавления переменных:
1. Закоммитьте изменения (workflow файл уже обновлен)
2. Перейдите в **Actions** вкладку
3. Убедитесь, что workflow запустился и использует переменные

