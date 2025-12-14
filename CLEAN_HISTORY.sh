#!/bin/bash
# Скрипт для полной очистки истории от больших файлов
# ВНИМАНИЕ: Это переписывает историю Git!

set -e

echo "⚠️  ВНИМАНИЕ: Это удалит большие файлы из ВСЕЙ истории Git"
echo "   После этого нужно будет force push"
read -p "Продолжить? (yes/no): " confirm

if [ "$confirm" != "yes" ]; then
    echo "Отменено"
    exit 1
fi

echo "🧹 Очищаем историю от release файлов..."

# Удаляем release/ из всей истории
git filter-branch --force --index-filter \
  "git rm -rf --cached --ignore-unmatch release/" \
  --prune-empty --tag-name-filter cat -- --all

# Очищаем ссылки на удаленные объекты
git for-each-ref --format="delete %(refname)" refs/original | git update-ref --stdin
git reflog expire --expire=now --all
git gc --prune=now --aggressive

echo ""
echo "✅ История очищена!"
echo "📤 Теперь нужно force push:"
echo "   git push -u origin main --force"
echo ""
echo "⚠️  Force push перезапишет историю на GitHub!"

