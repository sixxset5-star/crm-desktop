#!/bin/bash
# Скрипт для запуска миграции данных

# Переходим в директорию скрипта (корень проекта)
cd "$(dirname "$0")"

export VITE_SUPABASE_URL="https://bddgzxvhosxlyildlmya.supabase.co"
export VITE_SUPABASE_ANON_KEY="sb_publishable_y6GXqTFLQ9NvMoOpOeHm4A_osnntYOX"

echo "🚀 Запуск миграции данных из SQLite в Supabase..."
echo "📁 Текущая директория: $(pwd)"
echo ""

node scripts/migrate-to-supabase.mjs
