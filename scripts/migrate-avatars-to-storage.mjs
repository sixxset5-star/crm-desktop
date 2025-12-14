#!/usr/bin/env node
/**
 * Скрипт миграции аватаров из локальной файловой системы в Supabase Storage
 * 
 * Использование:
 *   1. Убедитесь, что Storage bucket 'avatars' создан
 *   2. Убедитесь, что переменные окружения настроены
 *   3. Запустите: node scripts/migrate-avatars-to-storage.mjs
 */

import { createClient } from '@supabase/supabase-js';
import Database from 'better-sqlite3';
import path from 'node:path';
import fs from 'node:fs';

// Получаем ключи Supabase из переменных окружения
const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Ошибка: Не указаны ключи Supabase');
  console.error('Установите переменные окружения:');
  console.error('  VITE_SUPABASE_URL=https://your-project.supabase.co');
  console.error('  VITE_SUPABASE_ANON_KEY=your-anon-key');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Получаем путь к базе данных и папке с аватарами
function getDatabasePath() {
  const homeDir = process.env.HOME || process.env.USERPROFILE;
  return path.join(homeDir, 'Library', 'Application Support', 'CRM Desktop', 'crm.db');
}

function getAvatarsDirectory() {
  const homeDir = process.env.HOME || process.env.USERPROFILE;
  return path.join(homeDir, 'Library', 'Application Support', 'CRM Desktop', 'avatars');
}

const dbPath = getDatabasePath();
const avatarsDir = getAvatarsDirectory();

console.log('📁 База данных:', dbPath);
console.log('📁 Папка с аватарами:', avatarsDir);

if (!fs.existsSync(dbPath)) {
  console.error('❌ База данных не найдена:', dbPath);
  process.exit(1);
}

if (!fs.existsSync(avatarsDir)) {
  console.log('⚠️  Папка с аватарами не найдена:', avatarsDir);
  console.log('   Создаю папку...');
  fs.mkdirSync(avatarsDir, { recursive: true });
}

const db = new Database(dbPath);

console.log('🚀 Начинаем миграцию аватаров...\n');

/**
 * Загрузить файл в Supabase Storage
 */
async function uploadAvatarToStorage(filePath, fileName) {
  try {
    const fileBuffer = fs.readFileSync(filePath);
    
    // Определяем MIME тип по расширению
    const ext = path.extname(fileName).toLowerCase();
    const mimeTypes = {
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.gif': 'image/gif',
      '.webp': 'image/webp',
      '.bmp': 'image/bmp',
    };
    const contentType = mimeTypes[ext] || 'image/jpeg';

    const { data, error } = await supabase.storage
      .from('avatars')
      .upload(fileName, fileBuffer, {
        contentType,
        cacheControl: '3600',
        upsert: true, // Заменяем существующий файл
      });

    if (error) {
      // Если файл уже существует - это нормально (upsert должен был обработать)
      if (error.message?.includes('already exists') || error.message?.includes('duplicate')) {
        console.log(`   ℹ️  ${fileName} уже существует в Storage`);
        return true;
      }
      console.error(`   ❌ Ошибка загрузки ${fileName}:`, error.message);
      return false;
    }

    return true;
  } catch (error) {
    console.error(`   ❌ Ошибка при чтении файла ${fileName}:`, error.message);
    return false;
  }
}

/**
 * Извлечь имя файла из пути crm:// или file://
 */
function extractFileName(avatarPath) {
  if (!avatarPath) return null;
  
  // Если это crm:// протокол
  if (avatarPath.startsWith('crm://')) {
    try {
      return decodeURIComponent(avatarPath.replace('crm://', ''));
    } catch {
      return avatarPath.replace('crm://', '');
    }
  }
  
  // Если это file:// протокол
  if (avatarPath.startsWith('file://')) {
    const match = avatarPath.match(/[^/]+$/);
    if (match) {
      try {
        return decodeURIComponent(match[0]);
      } catch {
        return match[0];
      }
    }
  }
  
  // Если это просто имя файла или путь
  const fileName = avatarPath.replace(/^.*[\\\/]/, '');
  return fileName;
}

/**
 * Миграция аватаров клиентов
 */
async function migrateCustomerAvatars() {
  console.log('👥 Мигрируем аватары клиентов...');
  
  const customers = db.prepare('SELECT id, name, avatar FROM customers WHERE avatar IS NOT NULL AND avatar != ""').all();
  
  if (customers.length === 0) {
    console.log('   Нет клиентов с аватарами');
    return;
  }

  let migrated = 0;
  let skipped = 0;
  let errors = 0;

  for (const customer of customers) {
    const fileName = extractFileName(customer.avatar);
    if (!fileName) {
      console.log(`   ⚠️  Пропущен клиент ${customer.name}: не удалось извлечь имя файла из "${customer.avatar}"`);
      skipped++;
      continue;
    }

    const filePath = path.join(avatarsDir, fileName);
    
    if (!fs.existsSync(filePath)) {
      console.log(`   ⚠️  Файл не найден: ${fileName} (клиент: ${customer.name})`);
      skipped++;
      continue;
    }

    // Загружаем в Storage
    const success = await uploadAvatarToStorage(filePath, fileName);
    
    if (success) {
      migrated++;
      console.log(`   ✅ ${fileName} (${customer.name})`);
    } else {
      errors++;
    }
  }

  console.log(`   📊 Итого: ${migrated} загружено, ${skipped} пропущено, ${errors} ошибок\n`);
}

/**
 * Миграция аватаров подрядчиков
 */
async function migrateContractorAvatars() {
  console.log('👷 Мигрируем аватары подрядчиков...');
  
  const contractors = db.prepare('SELECT id, name, avatar FROM contractors WHERE avatar IS NOT NULL AND avatar != ""').all();
  
  if (contractors.length === 0) {
    console.log('   Нет подрядчиков с аватарами');
    return;
  }

  let migrated = 0;
  let skipped = 0;
  let errors = 0;

  for (const contractor of contractors) {
    const fileName = extractFileName(contractor.avatar);
    if (!fileName) {
      console.log(`   ⚠️  Пропущен подрядчик ${contractor.name}: не удалось извлечь имя файла из "${contractor.avatar}"`);
      skipped++;
      continue;
    }

    const filePath = path.join(avatarsDir, fileName);
    
    if (!fs.existsSync(filePath)) {
      console.log(`   ⚠️  Файл не найден: ${fileName} (подрядчик: ${contractor.name})`);
      skipped++;
      continue;
    }

    // Загружаем в Storage
    const success = await uploadAvatarToStorage(filePath, fileName);
    
    if (success) {
      migrated++;
      console.log(`   ✅ ${fileName} (${contractor.name})`);
    } else {
      errors++;
    }
  }

  console.log(`   📊 Итого: ${migrated} загружено, ${skipped} пропущено, ${errors} ошибок\n`);
}

/**
 * Главная функция
 */
async function migrate() {
  try {
    // Проверяем, что bucket существует, пытаясь получить список файлов
    // (более надежный способ проверки, чем listBuckets)
    const { data: files, error: testError } = await supabase.storage
      .from('avatars')
      .list('', { limit: 1 });
    
    if (testError) {
      if (testError.message?.includes('not found') || testError.message?.includes('does not exist')) {
        console.error('❌ Bucket "avatars" не найден в Supabase Storage!');
        console.error('   Сначала создайте bucket:');
        console.error('   1. Откройте Supabase Dashboard → Storage');
        console.error('   2. Нажмите "New bucket"');
        console.error('   3. Name: avatars, Public: ✅');
        console.error('   4. Или выполните SQL из SETUP_STORAGE.md');
        process.exit(1);
      }
      // Другие ошибки (например, нет прав) - пропускаем проверку, попробуем загрузить
      console.log('⚠️  Не удалось проверить bucket, попробуем загрузить файлы...\n');
    } else {
      console.log('✅ Bucket "avatars" доступен\n');
    }

    await migrateCustomerAvatars();
    await migrateContractorAvatars();

    console.log('✅ Миграция аватаров завершена!');
    console.log('\n📝 Примечание:');
    console.log('   - Аватары загружены в Supabase Storage');
    console.log('   - Пути в базе данных остались без изменений (crm://)');
    console.log('   - Приложение автоматически будет использовать Supabase URLs в браузере');
  } catch (error) {
    console.error('\n❌ Критическая ошибка при миграции:', error);
    process.exit(1);
  } finally {
    db.close();
  }
}

// Запускаем миграцию
migrate();
