# Настройка GitHub Pages

## Автоматический деплой

GitHub Actions автоматически деплоит приложение при каждом push в `main` ветку.

URL приложения: `https://sixxset5-star.github.io/crm-desktop/`

## Настройка Secrets в GitHub

1. Откройте репозиторий на GitHub: https://github.com/sixxset5-star/crm-desktop
2. Перейдите в **Settings** → **Secrets and variables** → **Actions**
3. Нажмите **New repository secret** и добавьте:

   **Secret 1:**
   - **Name**: `VITE_SUPABASE_URL`
   - **Value**: `https://bddgzxvhosxlyildlmya.supabase.co`
   
   **Secret 2:**
   - **Name**: `VITE_SUPABASE_ANON_KEY`
   - **Value**: `sb_publishable_y6GXqTFLQ9NvMoOpOeHm4A_osnntYOX`

4. Нажмите **Add secret** для каждого

## Включение GitHub Pages

1. Перейдите в **Settings** → **Pages**
2. В разделе **Source** выберите:
   - **Source**: `GitHub Actions`
3. Сохраните

## Проверка деплоя

После первого push в `main`:
1. Перейдите в **Actions** вкладку репозитория
2. Убедитесь, что workflow `Deploy to GitHub Pages` запустился и успешно завершился
3. Подождите 1-2 минуты для первого деплоя
4. Откройте https://sixxset5-star.github.io/crm-desktop/

## Преимущества GitHub Pages

✅ **Неограниченные деплои** (в отличие от Vercel free плана)  
✅ **Бесплатно**  
✅ **Автоматический деплой** через GitHub Actions  
✅ **Интеграция с GitHub**  
✅ **HTTPS** включен по умолчанию  

## Отключение Vercel (опционально)

Если вы больше не используете Vercel:
1. Удалите `vercel.json` файл
2. Отключите интеграцию в Vercel Dashboard

## Workflow файл

Workflow находится в `.github/workflows/deploy.yml` и автоматически:
- Устанавливает зависимости
- Собирает проект с переменными окружения
- Деплоит в GitHub Pages

## Ручной запуск деплоя

Если нужно задеплоить вручную:
1. Перейдите в **Actions** вкладку
2. Выберите workflow `Deploy to GitHub Pages`
3. Нажмите **Run workflow** → **Run workflow**
