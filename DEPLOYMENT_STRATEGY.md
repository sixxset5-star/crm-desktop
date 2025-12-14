# Стратегия деплоя без ограничений

## Проблема
Vercel free план ограничивает 100 деплоями в день. При каждом `git push` в main происходит автоматический деплой, что быстро расходует лимит.

## Решение: Деплой только при merge в main

### Настройка в Vercel

1. Откройте https://vercel.com/dashboard
2. Выберите проект **crm-desktop**
3. Перейдите в **Settings** → **Git**
4. В разделе **Production Branch** убедитесь, что выбрана `main`
5. В разделе **Deploy Hooks** или **Build & Development Settings**:
   - Убедитесь, что деплой настроен только для `main` ветки
   - Preview деплои для PR можно оставить (они не считаются в лимит production деплоев)

### Рабочий процесс

**Вместо прямых коммитов в main:**
```bash
# 1. Создайте ветку для изменений
git checkout -b feature/my-changes

# 2. Делайте сколько угодно коммитов
git add .
git commit -m "First change"
git add .
git commit -m "Second change"
# ... сколько угодно коммитов

# 3. Запушьте ветку
git push origin feature/my-changes

# 4. Создайте Pull Request на GitHub (через веб-интерфейс)
# Это создаст preview деплой, но не production

# 5. Когда все готово - мерджте PR в main
# Только тогда произойдет production деплой (1 деплой вместо N коммитов)
```

**Или используйте локальные коммиты:**
```bash
# Делайте коммиты локально, не пушайте сразу
git add .
git commit -m "Change 1"
git add .
git commit -m "Change 2"
# ... собирайте изменения

# Когда все готово - один push
git push origin main
# Будет 1 деплой, даже если было 10 коммитов
```

## Альтернатива: GitHub Actions

Если нужно больше контроля, можно использовать GitHub Actions для ручного деплоя:

1. Создайте `.github/workflows/deploy.yml`:
```yaml
name: Deploy to Vercel

on:
  workflow_dispatch:  # Только ручной запуск
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Deploy to Vercel
        uses: amondnet/vercel-action@v25
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.ORG_ID }}
          vercel-project-id: ${{ secrets.PROJECT_ID }}
```

2. В Vercel отключите авто-деплой, оставьте только через GitHub Actions

## Альтернатива: Другой хостинг

### Netlify
- 100 GB bandwidth/месяц
- Неограниченные деплои
- Автоматический деплой из GitHub

### Cloudflare Pages
- Неограниченные деплои
- Неограниченный bandwidth
- Бесплатно

### GitHub Pages
- Бесплатно
- Статический хостинг
- Можно настроить через Actions

## Текущая рекомендация

Используйте **Вариант 1** (ветки + PR) - это самый простой способ без изменения инфраструктуры. Просто делайте коммиты в ветки, а не напрямую в main.

