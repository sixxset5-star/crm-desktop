#!/bin/bash
# Скрипт для автоматической загрузки кода на GitHub
# Использование: ./scripts/push-to-github.sh YOUR_GITHUB_USERNAME REPO_NAME

set -e

if [ -z "$1" ] || [ -z "$2" ]; then
    echo "❌ Использование: ./scripts/push-to-github.sh YOUR_GITHUB_USERNAME REPO_NAME"
    echo "   Пример: ./scripts/push-to-github.sh rafael crm-desktop"
    exit 1
fi

GITHUB_USER=$1
REPO_NAME=$2
REMOTE_URL="https://github.com/${GITHUB_USER}/${REPO_NAME}.git"

echo "🚀 Загрузка кода на GitHub..."
echo "   Репозиторий: ${REMOTE_URL}"

# Проверяем, существует ли remote
if git remote get-url origin &>/dev/null; then
    echo "⚠️  Remote 'origin' уже существует"
    read -p "Заменить? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        git remote set-url origin "$REMOTE_URL"
    else
        echo "❌ Отменено"
        exit 1
    fi
else
    git remote add origin "$REMOTE_URL"
    echo "✅ Remote добавлен"
fi

# Проверяем изменения
if [ -z "$(git status --porcelain)" ]; then
    echo "✅ Нет изменений для коммита"
else
    echo "📝 Добавляем изменения..."
    git add .
    git commit -m "Add cloud deployment configuration"
    echo "✅ Изменения закоммичены"
fi

# Пушим
echo "📤 Загружаем код на GitHub..."
echo "⚠️  Если репозиторий еще не создан, создайте его на https://github.com/new"
echo "   Название: ${REPO_NAME}"
echo "   НЕ создавайте README, .gitignore или license"
read -p "Нажмите Enter для продолжения..."

git push -u origin main

echo ""
echo "✅ Код загружен на GitHub!"
echo "🌐 Репозиторий: https://github.com/${GITHUB_USER}/${REPO_NAME}"
echo ""
echo "📝 Следующий шаг: настроить деплой на Vercel"
echo "   https://vercel.com/new → Import Git Repository → ${REPO_NAME}"

