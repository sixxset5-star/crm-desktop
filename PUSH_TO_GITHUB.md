# 🚀 Инструкция: Загрузка кода на GitHub

## Быстрый способ (скрипт)

1. **Создайте репозиторий на GitHub:**
   - Откройте https://github.com/new
   - Название: `crm-desktop` (или любое другое)
   - **Важно:** НЕ создавайте README, .gitignore или license
   - Нажмите "Create repository"

2. **Запустите скрипт:**
   ```bash
   ./scripts/push-to-github.sh YOUR_GITHUB_USERNAME crm-desktop
   ```
   
   Замените `YOUR_GITHUB_USERNAME` на ваш GitHub username.

3. **Готово!** Код загружен.

---

## Ручной способ

Если скрипт не работает, выполните команды вручную:

```bash
# 1. Добавить remote (замените YOUR_USERNAME на ваш GitHub username)
git remote add origin https://github.com/YOUR_USERNAME/crm-desktop.git

# 2. Закоммитить все изменения
git add .
git commit -m "Add cloud deployment configuration"

# 3. Загрузить на GitHub
git push -u origin main
```

Если репозиторий уже существует и remote уже добавлен:
```bash
git add .
git commit -m "Add cloud deployment configuration"
git push origin main
```

---

## Что дальше?

После загрузки кода на GitHub:

1. **Настройте Vercel для автоматического деплоя:**
   - Откройте https://vercel.com/new
   - Sign in через GitHub
   - Import Git Repository → выберите `crm-desktop`
   - Нажмите Deploy

2. **Готово!** При каждом `git push` приложение будет автоматически обновляться.

Подробная инструкция в [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md)

