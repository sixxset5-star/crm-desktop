#!/bin/bash
# Простой скрипт для push на GitHub
# Запустите: ./push.sh

cd "$(dirname "$0")"
echo "📁 Директория: $(pwd)"
echo "🔗 Remote: $(git remote get-url origin 2>/dev/null || echo 'не настроен')"
echo ""
echo "📤 Загружаем код на GitHub..."
git push -u origin main

