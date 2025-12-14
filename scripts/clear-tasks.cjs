#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const os = require('os');

// Путь к файлу задач
const tasksFilePath = path.join(
  os.homedir(),
  'Library',
  'Application Support',
  'crm-desktop',
  'tasks.json'
);

console.log('📂 Путь к файлу задач:', tasksFilePath);

if (!fs.existsSync(tasksFilePath)) {
  console.error('❌ Файл задач не найден!');
  process.exit(1);
}

// Читаем файл
const tasks = JSON.parse(fs.readFileSync(tasksFilePath, 'utf-8'));

console.log(`\n📊 Текущее состояние:`);
console.log(`   Всего задач: ${tasks.length}`);

const byStatus = {};
tasks.forEach(t => {
  const status = t.columnId || 'unknown';
  byStatus[status] = (byStatus[status] || 0) + 1;
});

console.log(`   По статусам:`);
Object.entries(byStatus).forEach(([status, count]) => {
  console.log(`      ${status}: ${count}`);
});

// Создаем резервную копию
const backupPath = tasksFilePath + '.backup.' + Date.now();
fs.writeFileSync(backupPath, JSON.stringify(tasks, null, 2));
console.log(`\n💾 Создана резервная копия: ${backupPath}`);

// Вопрос: что именно удалить?
const args = process.argv.slice(2);

if (args.includes('--remove-closed')) {
  // Удаляем только закрытые задачи
  const filtered = tasks.filter(t => t.columnId !== 'closed');
  const removed = tasks.length - filtered.length;
  
  fs.writeFileSync(tasksFilePath, JSON.stringify(filtered, null, 2));
  console.log(`\n✅ Удалено закрытых задач: ${removed}`);
  console.log(`   Осталось задач: ${filtered.length}`);
} else if (args.includes('--remove-completed')) {
  // Удаляем только завершенные задачи
  const filtered = tasks.filter(t => t.columnId !== 'completed');
  const removed = tasks.length - filtered.length;
  
  fs.writeFileSync(tasksFilePath, JSON.stringify(filtered, null, 2));
  console.log(`\n✅ Удалено завершенных задач: ${removed}`);
  console.log(`   Осталось задач: ${filtered.length}`);
} else if (args.includes('--remove-all-closed-completed')) {
  // Удаляем закрытые и завершенные
  const filtered = tasks.filter(t => !['closed', 'completed'].includes(t.columnId));
  const removed = tasks.length - filtered.length;
  
  fs.writeFileSync(tasksFilePath, JSON.stringify(filtered, null, 2));
  console.log(`\n✅ Удалено закрытых и завершенных задач: ${removed}`);
  console.log(`   Осталось задач: ${filtered.length}`);
} else if (args.includes('--clear-all')) {
  // Очищаем все задачи
  fs.writeFileSync(tasksFilePath, JSON.stringify([], null, 2));
  console.log(`\n✅ Все задачи удалены!`);
} else {
  console.log(`\n📝 Использование:`);
  console.log(`   node scripts/clear-tasks.js --remove-closed              # Удалить только закрытые задачи`);
  console.log(`   node scripts/clear-tasks.js --remove-completed           # Удалить только завершенные задачи`);
  console.log(`   node scripts/clear-tasks.js --remove-all-closed-completed # Удалить закрытые и завершенные`);
  console.log(`   node scripts/clear-tasks.js --clear-all                  # Удалить все задачи`);
  console.log(`\n⚠️  Резервная копия создана автоматически!`);
}

