import fs from 'fs/promises';
import path from 'path';

const userDataPath = path.join(process.env.HOME, 'Library', 'Application Support', 'Mansurov CRM');
const oldDataPath = path.join(process.env.HOME, 'Library', 'Application Support', 'crm-desktop');

async function restorePaymentsAndExpenses() {
  try {
    // Загружаем текущие задачи
    const currentTasksPath = path.join(userDataPath, 'tasks.json');
    const currentTasks = JSON.parse(await fs.readFile(currentTasksPath, 'utf-8'));
    
    // Загружаем старые задачи с платежами и расходами
    const oldTasksPath = path.join(oldDataPath, 'tasks.json');
    const oldTasks = JSON.parse(await fs.readFile(oldTasksPath, 'utf-8'));
    
    // Создаем мапу старых задач по ID
    const oldTasksMap = new Map();
    oldTasks.forEach(task => {
      oldTasksMap.set(task.id, task);
    });
    
    // Объединяем данные
    let restored = 0;
    const restoredTasks = currentTasks.map(currentTask => {
      const oldTask = oldTasksMap.get(currentTask.id);
      
      if (oldTask) {
        // Восстанавливаем платежи
        if (oldTask.payments && oldTask.payments.length > 0) {
          currentTask.payments = oldTask.payments;
          restored++;
        }
        
        // Восстанавливаем расходы
        if (oldTask.expensesEntries && oldTask.expensesEntries.length > 0) {
          currentTask.expensesEntries = oldTask.expensesEntries;
          restored++;
        }
        
        // Восстанавливаем подзадачи, если есть
        if (oldTask.subtasks && oldTask.subtasks.length > 0) {
          currentTask.subtasks = oldTask.subtasks;
        }
        
        // Восстанавливаем паузы, если есть
        if (oldTask.pausedRanges && oldTask.pausedRanges.length > 0) {
          currentTask.pausedRanges = oldTask.pausedRanges;
        }
      }
      
      return currentTask;
    });
    
    // Сохраняем восстановленные задачи
    await fs.writeFile(currentTasksPath, JSON.stringify(restoredTasks, null, 2), 'utf-8');
    
    console.log(`✅ Восстановлено платежей и расходов для ${restored} задач`);
    console.log(`✅ Всего задач обработано: ${restoredTasks.length}`);
    
    // Показываем статистику
    const withPayments = restoredTasks.filter(t => t.payments && t.payments.length > 0).length;
    const withExpenses = restoredTasks.filter(t => t.expensesEntries && t.expensesEntries.length > 0).length;
    
    console.log(`\nСтатистика:`);
    console.log(`- Задач с платежами: ${withPayments}`);
    console.log(`- Задач с расходами: ${withExpenses}`);
    
  } catch (error) {
    console.error('❌ Ошибка при восстановлении:', error);
    throw error;
  }
}

restorePaymentsAndExpenses();








