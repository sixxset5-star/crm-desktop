#!/bin/bash
# Скрипт для автоматической настройки GitHub репозитория

set -e

echo "🚀 Настройка GitHub репозитория для CRM Desktop"

# Проверяем наличие gh CLI
if ! command -v gh &> /dev/null; then
    echo "❌ GitHub CLI не установлен"
    echo "📦 Установите через: brew install gh"
    echo "   Или воспользуйтесь ручным методом (см. README)"
    exit 1
fi

# Проверяем авторизацию
if ! gh auth status &> /dev/null; then
    echo "🔐 Авторизуемся в GitHub..."
    gh auth login
fi

# Получаем название репозитория
REPO_NAME=${1:-"crm-desktop"}
REPO_DESCRIPTION="CRM Desktop - Облачная версия"

echo "📦 Создаем репозиторий: $REPO_NAME"

# Создаем приватный репозиторий
gh repo create "$REPO_NAME" \
    --private \
    --description "$REPO_DESCRIPTION" \
    --source=. \
    --remote=origin \
    --push

echo "✅ Репозиторий создан и код загружен!"
echo "🌐 Откройте: https://github.com/$(gh api user --jq .login)/$REPO_NAME"
echo ""
echo "📝 Следующий шаг: настроить деплой на Vercel"
echo "   https://vercel.com/new → Import Git Repository"

