#!/usr/bin/env node
/**
 * Скрипт миграции данных из локальной SQLite базы в Supabase
 * 
 * Использование:
 *   1. Убедитесь, что приложение не запущено
 *   2. Получите Supabase keys из .env или передайте через переменные окружения
 *   3. Запустите: node scripts/migrate-to-supabase.mjs
 */

import Database from 'better-sqlite3';
import { createClient } from '@supabase/supabase-js';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

// Получаем путь к базе данных
function getDatabasePath() {
  // Для macOS (стандартное расположение для Electron приложений)
  const homeDir = process.env.HOME || process.env.USERPROFILE;
  const dbPath = path.join(homeDir, 'Library', 'Application Support', 'CRM Desktop', 'crm.db');
  
  // Альтернативный путь (если используется другое имя)
  if (!fs.existsSync(dbPath)) {
    const altPath = path.join(homeDir, 'Library', 'Application Support', 'MansurovCRM', 'crm.db');
    if (fs.existsSync(altPath)) {
      return altPath;
    }
  }
  
  return dbPath;
}

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
const dbPath = getDatabasePath();

console.log('📁 Путь к базе данных:', dbPath);

if (!fs.existsSync(dbPath)) {
  console.error('❌ База данных не найдена по пути:', dbPath);
  console.error('Убедитесь, что приложение запускалось хотя бы раз');
  process.exit(1);
}

const db = new Database(dbPath);

console.log('🚀 Начинаем миграцию данных...\n');

// Функция для безопасного парсинга JSON
function parseJSON(value) {
  if (!value || value === 'null' || value === 'undefined') return null;
  try {
    return JSON.parse(value);
  } catch {
    return value; // Если не JSON, возвращаем как есть
  }
}

// Миграция задач
async function migrateTasks() {
  console.log('📋 Мигрируем задачи...');
  const tasks = db.prepare('SELECT * FROM tasks').all();
  
  if (tasks.length === 0) {
    console.log('   Нет задач для миграции');
    return;
  }

  // Преобразуем JSON поля
  const tasksToMigrate = tasks.map(task => ({
    ...task,
    payments: parseJSON(task.payments),
    expenses_entries: parseJSON(task.expenses_entries),
    paused_ranges: parseJSON(task.paused_ranges),
    subtasks: parseJSON(task.subtasks),
    tags: parseJSON(task.tags),
    links: parseJSON(task.links),
    files: parseJSON(task.files),
    accesses: parseJSON(task.accesses),
  }));

  const { error } = await supabase.from('tasks').upsert(tasksToMigrate, { onConflict: 'id' });
  
  if (error) {
    console.error('   ❌ Ошибка:', error.message);
  } else {
    console.log(`   ✅ Мигрировано ${tasks.length} задач`);
  }
}

// Миграция клиентов
async function migrateCustomers() {
  console.log('👥 Мигрируем клиентов...');
  const customers = db.prepare('SELECT * FROM customers').all();
  
  if (customers.length === 0) {
    console.log('   Нет клиентов для миграции');
    return;
  }

  const customersToMigrate = customers.map(customer => ({
    ...customer,
    contacts: parseJSON(customer.contacts),
    accesses: parseJSON(customer.accesses),
  }));

  const { error } = await supabase.from('customers').upsert(customersToMigrate, { onConflict: 'id' });
  
  if (error) {
    console.error('   ❌ Ошибка:', error.message);
  } else {
    console.log(`   ✅ Мигрировано ${customers.length} клиентов`);
  }
}

// Миграция подрядчиков
async function migrateContractors() {
  console.log('👷 Мигрируем подрядчиков...');
  const contractors = db.prepare('SELECT * FROM contractors').all();
  
  if (contractors.length === 0) {
    console.log('   Нет подрядчиков для миграции');
    return;
  }

  const contractorsToMigrate = contractors.map(contractor => ({
    ...contractor,
    contacts: parseJSON(contractor.contacts),
    accesses: parseJSON(contractor.accesses),
    active: contractor.active ?? 1, // По умолчанию активен
  }));

  const { error } = await supabase.from('contractors').upsert(contractorsToMigrate, { onConflict: 'id' });
  
  if (error) {
    console.error('   ❌ Ошибка:', error.message);
  } else {
    console.log(`   ✅ Мигрировано ${contractors.length} подрядчиков`);
  }
}

// Миграция целей
async function migrateGoals() {
  console.log('🎯 Мигрируем цели...');
  const goals = db.prepare('SELECT * FROM goals').all();
  
  if (goals.length === 0) {
    console.log('   Нет целей для миграции');
    return;
  }

  const { error } = await supabase.from('goals').upsert(goals, { onConflict: 'id' });
  
  if (error) {
    console.error('   ❌ Ошибка:', error.message);
  } else {
    console.log(`   ✅ Мигрировано ${goals.length} целей`);
  }
}

// Миграция месячных финансовых целей
async function migrateMonthlyGoals() {
  console.log('📅 Мигрируем месячные финансовые цели...');
  const monthlyGoals = db.prepare('SELECT * FROM monthly_financial_goals').all();
  
  if (monthlyGoals.length === 0) {
    console.log('   Нет месячных целей для миграции');
    return;
  }

  const monthlyGoalsToMigrate = monthlyGoals.map(goal => ({
    ...goal,
    expenses: parseJSON(goal.expenses),
  }));

  const { error } = await supabase.from('monthly_financial_goals').upsert(monthlyGoalsToMigrate, { onConflict: 'month_key' });
  
  if (error) {
    console.error('   ❌ Ошибка:', error.message);
  } else {
    console.log(`   ✅ Мигрировано ${monthlyGoals.length} месячных целей`);
  }
}

// Миграция кредитов
async function migrateCredits() {
  console.log('💳 Мигрируем кредиты...');
  const credits = db.prepare('SELECT * FROM credits').all();
  
  if (credits.length === 0) {
    console.log('   Нет кредитов для миграции');
    return;
  }

  // Мигрируем кредиты
  const { error: creditsError } = await supabase.from('credits').upsert(credits, { onConflict: 'id' });
  
  if (creditsError) {
    console.error('   ❌ Ошибка при миграции кредитов:', creditsError.message);
    return;
  }

  console.log(`   ✅ Мигрировано ${credits.length} кредитов`);

  // Мигрируем графики платежей
  console.log('   📊 Мигрируем графики платежей...');
  const schedules = db.prepare('SELECT * FROM credit_schedule_items').all();
  
  if (schedules.length === 0) {
    console.log('      Нет графиков для миграции');
    return;
  }

  // Удаляем старые графики (на случай повторной миграции)
  for (const credit of credits) {
    await supabase.from('credit_schedule_items').delete().eq('credit_id', credit.id);
  }

  // Вставляем новые графики порциями (Supabase имеет лимит на размер запроса)
  const chunkSize = 100;
  for (let i = 0; i < schedules.length; i += chunkSize) {
    const chunk = schedules.slice(i, i + chunkSize);
    const { error: scheduleError } = await supabase.from('credit_schedule_items').insert(chunk);
    
    if (scheduleError) {
      console.error(`   ❌ Ошибка при миграции графиков (чанк ${i}-${i + chunkSize}):`, scheduleError.message);
    }
  }
  
  console.log(`   ✅ Мигрировано ${schedules.length} записей графиков`);
}

// Миграция доходов
async function migrateIncomes() {
  console.log('💰 Мигрируем доходы...');
  const incomes = db.prepare('SELECT * FROM incomes').all();
  
  if (incomes.length === 0) {
    console.log('   Нет доходов для миграции');
    return;
  }

  const { error } = await supabase.from('incomes').upsert(incomes, { onConflict: 'id' });
  
  if (error) {
    console.error('   ❌ Ошибка:', error.message);
  } else {
    console.log(`   ✅ Мигрировано ${incomes.length} доходов`);
  }
}

// Миграция настроек
async function migrateSettings() {
  console.log('⚙️  Мигрируем настройки...');
  const settings = db.prepare('SELECT * FROM settings').all();
  
  if (settings.length === 0) {
    console.log('   Нет настроек для миграции');
    return;
  }

  // Преобразуем в формат для Supabase (значения уже JSON строки)
  const settingsToMigrate = settings.map(s => ({
    key: s.key,
    value: parseJSON(s.value), // Парсим JSON чтобы сохранить как JSONB
  }));

  const { error } = await supabase.from('settings').upsert(settingsToMigrate, { onConflict: 'key' });
  
  if (error) {
    console.error('   ❌ Ошибка:', error.message);
  } else {
    console.log(`   ✅ Мигрировано ${settings.length} настроек`);
  }
}

// Миграция расчетов
async function migrateCalculations() {
  console.log('🔢 Мигрируем расчеты...');
  const calculations = db.prepare('SELECT * FROM calculations').all();
  
  if (calculations.length === 0) {
    console.log('   Нет расчетов для миграции');
    return;
  }

  const calculationsToMigrate = calculations.map(calc => ({
    ...calc,
    references_data: parseJSON(calc.references_data),
    new_project: parseJSON(calc.new_project),
    manual_coefficients: parseJSON(calc.manual_coefficients),
    results: parseJSON(calc.results),
  }));

  const { error } = await supabase.from('calculations').upsert(calculationsToMigrate, { onConflict: 'id' });
  
  if (error) {
    console.error('   ❌ Ошибка:', error.message);
  } else {
    console.log(`   ✅ Мигрировано ${calculations.length} расчетов`);
  }
}

// Миграция налогов
async function migrateTaxes() {
  console.log('📊 Мигрируем флаги оплаты налогов...');
  const taxes = db.prepare('SELECT * FROM tax_paid_flags').all();
  
  if (taxes.length === 0) {
    console.log('   Нет налогов для миграции');
    return;
  }

  const { error } = await supabase.from('tax_paid_flags').upsert(taxes, { onConflict: 'key' });
  
  if (error) {
    console.error('   ❌ Ошибка:', error.message);
  } else {
    console.log(`   ✅ Мигрировано ${taxes.length} записей налогов`);
  }
}

// Миграция дополнительной работы
async function migrateExtraWork() {
  console.log('📝 Мигрируем дополнительную работу...');
  const extraWorks = db.prepare('SELECT * FROM extra_work').all();
  
  if (extraWorks.length === 0) {
    console.log('   Нет записей для миграции');
    return;
  }

  const extraWorksToMigrate = extraWorks.map(work => ({
    ...work,
    work_dates: parseJSON(work.work_dates),
    payments: parseJSON(work.payments),
  }));

  const { error } = await supabase.from('extra_work').upsert(extraWorksToMigrate, { onConflict: 'id' });
  
  if (error) {
    console.error('   ❌ Ошибка:', error.message);
  } else {
    console.log(`   ✅ Мигрировано ${extraWorks.length} записей`);
  }
}

// Главная функция миграции
async function migrate() {
  try {
    await migrateTasks();
    await migrateCustomers();
    await migrateContractors();
    await migrateGoals();
    await migrateMonthlyGoals();
    await migrateCredits();
    await migrateIncomes();
    await migrateSettings();
    await migrateCalculations();
    await migrateTaxes();
    await migrateExtraWork();

    console.log('\n✅ Миграция завершена!');
    console.log('Теперь ваши данные доступны в Supabase.');
  } catch (error) {
    console.error('\n❌ Критическая ошибка при миграции:', error);
    process.exit(1);
  } finally {
    db.close();
  }
}

// Запускаем миграцию
migrate();
