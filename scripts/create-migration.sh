#!/bin/bash
# Скрипт для создания нового файла миграции

cd "$(dirname "$0")/.."

if [ -z "$1" ]; then
  echo "❌ Укажите описание миграции"
  echo "Использование: ./scripts/create-migration.sh <описание>"
  echo "Пример: ./scripts/create-migration.sh add_contractor_id_to_tasks"
  exit 1
fi

MIGRATION_NAME=$(echo "$1" | tr ' ' '_' | tr '[:upper:]' '[:lower:]')
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
MIGRATION_FILE="supabase/migrations/$(printf "%03d" $(ls -1 supabase/migrations/*.sql 2>/dev/null | wc -l | tr -d ' '))_${MIGRATION_NAME}.sql"

cat > "$MIGRATION_FILE" << EOF
-- Migration: $1
-- Created: $(date +"%Y-%m-%d %H:%M:%S")
-- Description: Add your migration SQL here

-- Example:
-- ALTER TABLE tasks ADD COLUMN IF NOT EXISTS new_column TEXT;

EOF

echo "✅ Создан файл миграции: $MIGRATION_FILE"
echo "📝 Отредактируйте его и выполните в Supabase SQL Editor"
