#!/usr/bin/env node
/**
 * Удаляет все записи настроек кроме 'main' через Supabase API
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Не указаны ключи Supabase');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function deleteOldSettings() {
  console.log('🗑️  Удаляем все старые записи настроек...\n');

  // Получаем все записи
  const { data: allSettings, error: loadError } = await supabase.from('settings').select('key');
  
  if (loadError) {
    console.error('❌ Ошибка при загрузке:', loadError.message);
    process.exit(1);
  }

  if (!allSettings || allSettings.length === 0) {
    console.log('✅ Нет записей для удаления');
    return;
  }

  console.log(`📋 Найдено записей: ${allSettings.length}\n`);

  // Удаляем каждую запись кроме 'main'
  let deleted = 0;
  let errors = 0;

  for (const setting of allSettings) {
    if (setting.key === 'main') {
      console.log(`⏭️  Пропускаем запись: "${setting.key}" (оставляем)`);
      continue;
    }

    console.log(`🗑️  Удаляем: "${setting.key}"...`);
    const { error: delError } = await supabase
      .from('settings')
      .delete()
      .eq('key', setting.key);

    if (delError) {
      console.error(`   ❌ Ошибка: ${delError.message}`);
      errors++;
    } else {
      console.log(`   ✅ Удалено`);
      deleted++;
    }
  }

  console.log(`\n📊 Итого: ${deleted} удалено, ${errors} ошибок`);

  // Проверяем результат
  const { data: remaining } = await supabase.from('settings').select('key');
  console.log(`\n✅ Осталось записей: ${remaining?.length || 0}`);
  if (remaining && remaining.length > 0) {
    console.log('   Записи:', remaining.map(s => s.key).join(', '));
  }
}

deleteOldSettings();
