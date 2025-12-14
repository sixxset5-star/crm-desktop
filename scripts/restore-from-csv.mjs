import fs from 'fs/promises';
import path from 'path';
// import { app } from 'electron'; // Не нужен для скрипта
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Путь к userData (для Electron приложения)
const userDataPath = process.env.ELECTRON_USER_DATA || 
  path.join(process.env.HOME || process.env.USERPROFILE, 'Library', 'Application Support', 'Mansurov CRM');

function parseCSVLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    const nextChar = line[i + 1];
    
    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        // Экранированная кавычка
        current += '"';
        i++; // Пропускаем следующую кавычку
      } else {
        // Начало/конец кавычек
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      // Разделитель вне кавычек
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  
  // Добавляем последнее значение
  result.push(current.trim());
  
  return result;
}

async function parseCSV(filePath) {
  const content = await fs.readFile(filePath, 'utf-8');
  const lines = content.split('\n').filter(line => line.trim());
  if (lines.length < 2) return [];
  
  const headers = parseCSVLine(lines[0]);
  const data = [];
  
  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]);
    const obj = {};
    headers.forEach((header, index) => {
      let value = values[index] || '';
      // Убираем кавычки если есть
      if (value.startsWith('"') && value.endsWith('"')) {
        value = value.slice(1, -1);
      }
      obj[header] = value;
    });
    data.push(obj);
  }
  
  return data;
}

async function restoreCredits() {
  const csvPath = path.join(process.env.HOME, 'Downloads', 'crm-credits-2025-11-17.csv');
  const creditsData = await parseCSV(csvPath);
  
  const credits = creditsData.map(row => {
    const credit = {
      id: row.ID || row['ID'],
      name: row['Название'] || row.Название || '',
      amount: row['Сумма'] && row['Сумма'].trim() ? parseFloat(row['Сумма']) : undefined,
      monthlyPayment: row['Ежемесячный платеж'] && row['Ежемесячный платеж'].trim() ? parseFloat(row['Ежемесячный платеж']) : undefined,
      interestRate: row['Процентная ставка'] && row['Процентная ставка'].trim() ? parseFloat(row['Процентная ставка']) : undefined,
      notes: row['Заметки'] && row['Заметки'].trim() ? row['Заметки'] : undefined,
      paidThisMonth: row['Оплачен в этом месяце'] === 'TRUE' || row['Оплачен в этом месяце'] === 'true',
      lastPaidMonth: row['Последний месяц оплаты'] && row['Последний месяц оплаты'].trim() ? row['Последний месяц оплаты'] : undefined,
    };
    
    // Удаляем undefined поля
    Object.keys(credit).forEach(key => {
      if (credit[key] === undefined) delete credit[key];
    });
    
    return credit;
  });
  
  // Загружаем существующие goals.json
  const goalsPath = path.join(userDataPath, 'goals.json');
  let goalsData = { goals: [], monthlyFinancialGoals: [], credits: [] };
  
  try {
    const existing = await fs.readFile(goalsPath, 'utf-8');
    goalsData = JSON.parse(existing);
  } catch (e) {
    console.log('Creating new goals.json');
  }
  
  // Обновляем кредиты
  goalsData.credits = credits;
  
  // Сохраняем
  await fs.mkdir(userDataPath, { recursive: true });
  await fs.writeFile(goalsPath, JSON.stringify(goalsData, null, 2), 'utf-8');
  
  console.log(`✅ Восстановлено ${credits.length} кредитов`);
  return credits;
}

async function restoreTasks() {
  const csvPath = path.join(process.env.HOME, 'Downloads', 'crm-tasks-2025-11-17.csv');
  const tasksData = await parseCSV(csvPath);
  
  const tasks = tasksData.map(row => {
    const task = {
      id: row.ID || row['ID'],
      title: row['Название'] || row.Название || '',
      columnId: row['Статус'] || row.Статус || 'unprocessed',
      amount: row['Сумма'] && row['Сумма'].trim() ? parseFloat(row['Сумма']) : undefined,
      expenses: row['Расходы'] && row['Расходы'].trim() ? parseFloat(row['Расходы']) : undefined,
      paidAmount: row['Оплачено'] && row['Оплачено'].trim() ? parseFloat(row['Оплачено']) : undefined,
      taxRate: row['Налог %'] && row['Налог %'].trim() ? parseFloat(row['Налог %']) : undefined,
      startDate: row['Дата начала'] && row['Дата начала'].trim() ? row['Дата начала'] : undefined,
      deadline: row['Дедлайн'] && row['Дедлайн'].trim() ? row['Дедлайн'] : undefined,
      customerId: row['Заказчик ID'] && row['Заказчик ID'].trim() ? row['Заказчик ID'] : undefined,
      priority: row['Приоритет'] && row['Приоритет'].trim() ? row['Приоритет'] : undefined,
      tags: row['Теги'] && row['Теги'].trim() ? row['Теги'].split(',').map(t => t.trim()).filter(t => t) : undefined,
      notes: row['Заметки'] && row['Заметки'].trim() ? row['Заметки'] : undefined,
      links: row['Ссылки'] && row['Ссылки'].trim() ? row['Ссылки'].split(',').map(l => l.trim()).filter(l => l) : undefined,
      createdAt: row['Создано'] && row['Создано'].trim() ? row['Создано'] : undefined,
      updatedAt: row['Обновлено'] && row['Обновлено'].trim() ? row['Обновлено'] : undefined,
    };
    
    // Удаляем undefined поля
    Object.keys(task).forEach(key => {
      if (task[key] === undefined) delete task[key];
    });
    
    return task;
  });
  
  // Сохраняем tasks.json
  const tasksPath = path.join(userDataPath, 'tasks.json');
  await fs.mkdir(userDataPath, { recursive: true });
  await fs.writeFile(tasksPath, JSON.stringify(tasks, null, 2), 'utf-8');
  
  console.log(`✅ Восстановлено ${tasks.length} задач`);
  return tasks;
}

async function main() {
  try {
    console.log('Начинаю восстановление данных...');
    console.log(`Путь к данным: ${userDataPath}`);
    
    await restoreCredits();
    await restoreTasks();
    
    console.log('\n✅ Все данные успешно восстановлены!');
    console.log('Перезапустите приложение, чтобы увидеть восстановленные данные.');
  } catch (error) {
    console.error('❌ Ошибка при восстановлении:', error);
    process.exit(1);
  }
}

main();

