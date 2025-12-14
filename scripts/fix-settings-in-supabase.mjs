#!/usr/bin/env node
/**
 * Скрипт для исправления структуры настроек в Supabase
 * Удаляет старые записи и создает правильную структуру
 */

import { createClient } from '@supabase/supabase-js';
import Database from 'better-sqlite3';
import path from 'node:path';
import fs from 'node:fs';

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Ошибка: Не указаны ключи Supabase');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

function getDatabasePath() {
  const homeDir = process.env.HOME || process.env.USERPROFILE;
  return path.join(homeDir, 'Library', 'Application Support', 'CRM Desktop', 'crm.db');
}

const dbPath = getDatabasePath();

if (!fs.existsSync(dbPath)) {
  console.error('❌ База данных не найдена:', dbPath);
  process.exit(1);
}

const db = new Database(dbPath);

function parseJSON(value) {
  if (!value || value === 'null' || value === 'undefined') return null;
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
}

async function fixSettings() {
  try {
    console.log('🔧 Исправляем структуру настроек в Supabase...\n');

    // 1. Загружаем правильные настройки из локальной БД
    const row = db.prepare('SELECT * FROM settings WHERE key = ?').get('main');
    
    if (!row) {
      console.log('⚠️  Настройки не найдены в локальной БД');
      return;
    }

    const settingsValue = parseJSON(row.value);
    
    if (!settingsValue) {
      console.log('⚠️  Настройки пустые или невалидные');
      return;
    }

    console.log('📋 Найдены настройки:');
    if (settingsValue.holidays && settingsValue.holidays.length > 0) {
      console.log(`   Праздников: ${settingsValue.holidays.length}`);
    }
    if (settingsValue.customWeekends && settingsValue.customWeekends.length > 0) {
      console.log(`   Кастомных выходных: ${settingsValue.customWeekends.length}`);
    }
    if (settingsValue.excludedWeekends && settingsValue.excludedWeekends.length > 0) {
      console.log(`   Исключенных выходных: ${settingsValue.excludedWeekends.length}`);
    }

    // 2. Удаляем все старые записи в Supabase (если есть)
    console.log('\n🗑️  Удаляем старые записи настроек из Supabase...');
    const { error: deleteError } = await supabase
      .from('settings')
      .delete()
      .neq('key', 'non-existent-key'); // Удаляем все записи
    
    if (deleteError && !deleteError.message.includes('0 rows')) {
      console.error('   ⚠️  Ошибка при удалении:', deleteError.message);
    } else {
      console.log('   ✅ Старые записи удалены');
    }

    // 3. Сохраняем правильную структуру
    console.log('\n💾 Сохраняем настройки в правильном формате...');
    const { error } = await supabase
      .from('settings')
      .upsert({
        key: 'main',
        value: settingsValue,
      }, { onConflict: 'key' });

    if (error) {
      console.error('   ❌ Ошибка:', error.message);
      process.exit(1);
    }

    console.log('   ✅ Настройки сохранены');

    // 4. Проверяем, что данные загружаются правильно
    console.log('\n🔍 Проверяем загрузку...');
    const { data: loadedData, error: loadError } = await supabase
      .from('settings')
      .select('*')
      .eq('key', 'main')
      .single();

    if (loadError) {
      console.error('   ❌ Ошибка при проверке:', loadError.message);
      process.exit(1);
    }

    if (loadedData && loadedData.value) {
      const loadedSettings = typeof loadedData.value === 'string' 
        ? JSON.parse(loadedData.value) 
        : loadedData.value;
      
      console.log('   ✅ Настройки загружены:');
      if (loadedSettings.holidays && loadedSettings.holidays.length > 0) {
        console.log(`      Праздников: ${loadedSettings.holidays.length}`);
      }
      if (loadedSettings.customWeekends && loadedSettings.customWeekends.length > 0) {
        console.log(`      Кастомных выходных: ${loadedSettings.customWeekends.length}`);
      }
      if (loadedSettings.excludedWeekends && loadedSettings.excludedWeekends.length > 0) {
        console.log(`      Исключенных выходных: ${loadedSettings.excludedWeekends.length}`);
      }
    }

    console.log('\n✅ Исправление завершено!');
    console.log('Обновите страницу в браузере - праздники и выходные должны появиться.');
  } catch (error) {
    console.error('\n❌ Критическая ошибка:', error);
    process.exit(1);
  } finally {
    db.close();
  }
}

fixSettings();
