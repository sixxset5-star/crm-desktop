#!/usr/bin/env node
/**
 * Скрипт для проверки настроек в Supabase
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Не указаны ключи Supabase');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkSettings() {
  console.log('🔍 Проверяем настройки в Supabase...\n');

  // Получаем все записи
  const { data: allSettings, error } = await supabase.from('settings').select('*');

  if (error) {
    console.error('❌ Ошибка:', error.message);
    return;
  }

  console.log(`📋 Найдено записей: ${allSettings?.length || 0}\n`);

  if (!allSettings || allSettings.length === 0) {
    console.log('⚠️  Нет записей в таблице settings');
    return;
  }

  for (const setting of allSettings) {
    console.log(`🔑 Key: "${setting.key}"`);
    console.log(`   Value type: ${typeof setting.value}`);
    
    if (setting.key === 'main') {
      console.log('   ✅ Это правильная запись с key="main"');
      if (typeof setting.value === 'object' && setting.value !== null) {
        console.log(`   📊 Поля в объекте: ${Object.keys(setting.value).join(', ')}`);
        if (setting.value.holidays) {
          console.log(`   🎉 Праздников: ${Array.isArray(setting.value.holidays) ? setting.value.holidays.length : 'N/A'}`);
        }
        if (setting.value.customWeekends) {
          console.log(`   📅 Кастомных выходных: ${Array.isArray(setting.value.customWeekends) ? setting.value.customWeekends.length : 'N/A'}`);
        }
      }
    } else {
      console.log('   ⚠️  Это старая запись (должна быть удалена)');
      console.log(`   Value: ${JSON.stringify(setting.value).substring(0, 50)}...`);
    }
    console.log('');
  }

  // Проверяем загрузку через правильный метод
  console.log('\n🔍 Проверяем загрузку через .eq("key", "main").single()...');
  const { data: mainSetting, error: loadError } = await supabase
    .from('settings')
    .select('*')
    .eq('key', 'main')
    .single();

  if (loadError) {
    if (loadError.code === 'PGRST116') {
      console.log('   ⚠️  Запись с key="main" не найдена');
    } else {
      console.error('   ❌ Ошибка:', loadError.message);
    }
  } else {
    console.log('   ✅ Запись найдена');
    if (mainSetting?.value) {
      const value = typeof mainSetting.value === 'string' ? JSON.parse(mainSetting.value) : mainSetting.value;
      console.log(`   📊 Тип value: ${typeof value}`);
      if (typeof value === 'object') {
        console.log(`   📋 Поля: ${Object.keys(value).join(', ')}`);
      }
    }
  }
}

checkSettings();

