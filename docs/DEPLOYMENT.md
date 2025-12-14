# Развертывание в облако

## Быстрый старт

### 1. Загрузка кода на GitHub

#### Вариант A: Через скрипт (автоматически)

```bash
# Установить GitHub CLI (если еще не установлен)
brew install gh

# Запустить скрипт настройки
chmod +x scripts/setup-github.sh
./scripts/setup-github.sh
```

#### Вариант B: Вручную

1. Создать репозиторий на GitHub:
   - Открыть https://github.com/new
   - Название: `crm-desktop`
   - Выбрать Private/Public
   - **НЕ** создавать README, .gitignore, license

2. Выполнить команды:
   ```bash
   git remote add origin https://github.com/YOUR_USERNAME/crm-desktop.git
   git add .
   git commit -m "Initial commit for cloud deployment"
   git push -u origin main
   ```

### 2. Настройка Vercel (автоматический деплой)

1. Зайти на https://vercel.com
2. Sign in через GitHub
3. New Project → Import Git Repository
4. Выбрать ваш репозиторий `crm-desktop`
5. Настройки:
   - Framework Preset: **Vite**
   - Root Directory: `./`
   - Build Command: `npm run build` (уже указан в vercel.json)
   - Output Directory: `dist` (уже указан в vercel.json)
   - Install Command: `npm install`

6. Environment Variables (после настройки Supabase):
   - `VITE_SUPABASE_URL` = ваш Supabase URL
   - `VITE_SUPABASE_ANON_KEY` = ваш Supabase Anon Key

7. Deploy

✅ Готово! После каждого `git push` приложение автоматически обновится.

### 3. Настройка Supabase

1. Создать проект на https://supabase.com
2. Получить ключи:
   - Settings → API
   - Project URL → `VITE_SUPABASE_URL`
   - anon/public key → `VITE_SUPABASE_ANON_KEY`
3. Добавить их в Vercel (см. шаг 2, пункт 6)

## Автоматический деплой

После настройки, каждое изменение будет автоматически деплоиться:

```bash
# 1. Внести изменения
git add .
git commit -m "Update feature"

# 2. Запушить
git push origin main

# 3. Vercel автоматически задеплоит ✨
```

## Preview деплои

Vercel автоматически создает preview-версии для каждого Pull Request:
- Каждый PR получает уникальный URL
- Можно тестировать перед мерджем в main
- Автоматически удаляются после закрытия PR

## Альтернативы Vercel

### Netlify
1. https://app.netlify.com → New site from Git
2. Подключить GitHub репозиторий
3. Build settings:
   - Build command: `npm run build`
   - Publish directory: `dist`

### GitHub Pages (статический хостинг)
```bash
# В package.json добавить:
"homepage": "https://YOUR_USERNAME.github.io/crm-desktop"

# В vite.config.ts:
export default defineConfig({
  base: '/crm-desktop/',
  // ...
})

# GitHub Actions для автоматического деплоя
```

## Полезные ссылки

- Vercel Dashboard: https://vercel.com/dashboard
- Supabase Dashboard: https://app.supabase.com
- GitHub Repository: https://github.com/YOUR_USERNAME/crm-desktop

