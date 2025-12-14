/**
 * API Client для работы с Supabase
 * Заменяет IPC каналы для веб-версии приложения
 */
import { supabase } from './supabase-client';
import type { Task } from '@/types';
import type { Customer, Contractor } from '@/types';
import type { Income } from '@/types';
import type { Goal, MonthlyFinancialGoal, Credit, CreditScheduleItem } from '@/store/goals';
import type { Settings } from '@/store/settings';
import type { Calculation } from '@/store/calculator';
import type { TaxPaidFlag } from '@/store/taxes';
import type { ExtraWork } from '@/pages/workload/types/extra-work.types';
import { createLogger } from '../logger';

const log = createLogger('api-client');

// ==================== Tasks ====================

export async function loadTasks(): Promise<Task[]> {
  try {
    const { data, error } = await supabase
      .from('tasks')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      log.error('Failed to load tasks', error);
      return [];
    }

    if (!data) return [];

    // Преобразуем snake_case в camelCase
    return data.map((row: any) => {
      const {
        paid_amount,
        expenses_entries,
        paused_ranges,
        tax_rate,
        start_date,
        customer_id,
        calculator_quantity,
        calculator_price_per_unit,
        paused_from_column_id,
        created_at,
        updated_at,
        column_id,
        ...rest
      } = row;

      // Вспомогательная функция для парсинга JSON полей
      const parseJsonField = (value: any) => {
        if (!value) return null;
        if (typeof value === 'string') {
          try {
            return JSON.parse(value);
          } catch {
            return value;
          }
        }
        return value; // Уже объект (JSONB)
      };

      return {
        ...rest,
        paidAmount: row.paid_amount,
        expensesEntries: parseJsonField(row.expenses_entries) ?? [],
        pausedRanges: parseJsonField(row.paused_ranges) ?? [],
        taxRate: row.tax_rate,
        startDate: row.start_date,
        subtasks: parseJsonField(row.subtasks) ?? [],
        tags: parseJsonField(row.tags) ?? [],
        customerId: row.customer_id,
        links: parseJsonField(row.links) ?? [],
        files: parseJsonField(row.files) ?? [],
        calculatorQuantity: row.calculator_quantity,
        calculatorPricePerUnit: row.calculator_price_per_unit,
        accesses: parseJsonField(row.accesses) ?? [],
        columnId: row.column_id ?? 'unprocessed', // Важно: дефолтное значение
        pausedFromColumnId: row.paused_from_column_id,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        payments: parseJsonField(row.payments) ?? [],
      };
    });
  } catch (error) {
    log.error('Error loading tasks', error);
    return [];
  }
}

export async function saveTasks(tasks: Task[]): Promise<void> {
  try {
    if (!Array.isArray(tasks)) {
      log.error('saveTasks: tasks is not an array', typeof tasks);
      return;
    }

    // Преобразуем camelCase в snake_case для Supabase
    // Исключаем поля, которых нет в схеме Supabase (paused_from_column_id, contractor_id)
    const dbTasks = tasks.map((task: any) => ({
      id: task.id,
      title: task.title,
      amount: task.amount ?? null,
      expenses: task.expenses ?? null,
      paid_amount: task.paidAmount ?? null,
      payments: task.payments ? (typeof task.payments === 'string' ? task.payments : JSON.stringify(task.payments)) : null,
      expenses_entries: task.expensesEntries ? (typeof task.expensesEntries === 'string' ? task.expensesEntries : JSON.stringify(task.expensesEntries)) : null,
      paused_ranges: task.pausedRanges ? (typeof task.pausedRanges === 'string' ? task.pausedRanges : JSON.stringify(task.pausedRanges)) : null,
      tax_rate: task.taxRate ?? null,
      start_date: task.startDate ?? null,
      deadline: task.deadline ?? null,
      subtasks: task.subtasks ? (typeof task.subtasks === 'string' ? task.subtasks : JSON.stringify(task.subtasks)) : null,
      tags: task.tags ? (typeof task.tags === 'string' ? task.tags : JSON.stringify(task.tags)) : null,
      notes: task.notes ?? null,
      customer_id: task.customerId ?? null,
      links: task.links ? (typeof task.links === 'string' ? task.links : JSON.stringify(task.links)) : null,
      files: task.files ? (typeof task.files === 'string' ? task.files : JSON.stringify(task.files)) : null,
      calculator_quantity: task.calculatorQuantity ?? null,
      calculator_price_per_unit: task.calculatorPricePerUnit ?? null,
      priority: task.priority ?? null,
      accesses: task.accesses ? (typeof task.accesses === 'string' ? task.accesses : JSON.stringify(task.accesses)) : null,
      column_id: task.columnId ?? 'unprocessed',
      // paused_from_column_id и contractor_id отсутствуют в схеме Supabase - не отправляем
      created_at: task.createdAt ?? null,
      updated_at: task.updatedAt ?? null,
    }));

    // Upsert все задачи (обновить существующие, создать новые)
    const { error } = await supabase
      .from('tasks')
      .upsert(dbTasks, { onConflict: 'id' });

    if (error) {
      log.error('Failed to save tasks', error);
      throw error;
    }
  } catch (error) {
    log.error('Error saving tasks', error);
    throw error;
  }
}

// ==================== Customers ====================

export async function loadCustomers(): Promise<Customer[]> {
  try {
    const { data, error } = await supabase
      .from('customers')
      .select('*')
      .order('name', { ascending: true });

    if (error) {
      log.error('Failed to load customers', error);
      return [];
    }

    return data || [];
  } catch (error) {
    log.error('Error loading customers', error);
    return [];
  }
}

export async function saveCustomers(customers: Customer[]): Promise<void> {
  try {
    if (!Array.isArray(customers)) {
      log.error('saveCustomers: customers is not an array', typeof customers);
      return;
    }

    const { error } = await supabase
      .from('customers')
      .upsert(customers, { onConflict: 'id' });

    if (error) {
      log.error('Failed to save customers', error);
      throw error;
    }
  } catch (error) {
    log.error('Error saving customers', error);
    throw error;
  }
}

// ==================== Contractors ====================

export async function loadContractors(): Promise<Contractor[]> {
  try {
    const { data, error } = await supabase
      .from('contractors')
      .select('*')
      .order('name', { ascending: true });

    if (error) {
      log.error('Failed to load contractors', error);
      return [];
    }

    return data || [];
  } catch (error) {
    log.error('Error loading contractors', error);
    return [];
  }
}

export async function saveContractors(contractors: Contractor[]): Promise<void> {
  try {
    if (!Array.isArray(contractors)) {
      log.error('saveContractors: contractors is not an array', typeof contractors);
      return;
    }

    const { error } = await supabase
      .from('contractors')
      .upsert(contractors, { onConflict: 'id' });

    if (error) {
      log.error('Failed to save contractors', error);
      throw error;
    }
  } catch (error) {
    log.error('Error saving contractors', error);
    throw error;
  }
}

// ==================== Goals ====================

export async function loadGoals(): Promise<{
  goals: Goal[];
  monthlyFinancialGoals: MonthlyFinancialGoal[];
  credits: Credit[];
}> {
  try {
    // Загружаем цели
    const { data: goals, error: goalsError } = await supabase
      .from('goals')
      .select('*')
      .order('deadline', { ascending: false });

    if (goalsError) throw goalsError;

    // Загружаем месячные финансовые цели
    const { data: monthlyGoals, error: monthlyError } = await supabase
      .from('monthly_financial_goals')
      .select('*')
      .order('month_key', { ascending: false });

    if (monthlyError) throw monthlyError;

    // Загружаем кредиты (будет загружено отдельно через loadCredits)
    const credits: Credit[] = [];

    return {
      goals: (goals || []) as Goal[],
      monthlyFinancialGoals: (monthlyGoals || []).map((g: any) => ({
        ...g,
        expenses: typeof g.expenses === 'string' ? JSON.parse(g.expenses) : g.expenses,
      })) as MonthlyFinancialGoal[],
      credits,
    };
  } catch (error) {
    log.error('Error loading goals', error);
    return { goals: [], monthlyFinancialGoals: [], credits: [] };
  }
}

export async function saveGoals(data: {
  goals: Goal[];
  monthlyFinancialGoals: MonthlyFinancialGoal[];
  credits?: Credit[];
}): Promise<void> {
  try {
    // Сохраняем цели
    if (data.goals.length > 0) {
      const { error: goalsError } = await supabase
        .from('goals')
        .upsert(data.goals, { onConflict: 'id' });
      if (goalsError) throw goalsError;
    }

    // Сохраняем месячные финансовые цели
    if (data.monthlyFinancialGoals.length > 0) {
      const { error: monthlyError } = await supabase
        .from('monthly_financial_goals')
        .upsert(data.monthlyFinancialGoals, { onConflict: 'month_key' });
      if (monthlyError) throw monthlyError;
    }

    // Сохраняем кредиты и их графики
    if (data.credits && data.credits.length > 0) {
      const credits = data.credits.map(({ schedule, ...credit }) => credit);
      const { error: creditsError } = await supabase
        .from('credits')
        .upsert(credits, { onConflict: 'id' });
      if (creditsError) throw creditsError;

      // Сохраняем графики платежей
      for (const credit of data.credits) {
        if (credit.schedule && credit.schedule.length > 0) {
          // Удаляем старые записи графика
          await supabase.from('credit_schedule_items').delete().eq('credit_id', credit.id);

          // Добавляем новые записи
          const { error: scheduleError } = await supabase
            .from('credit_schedule_items')
            .insert(credit.schedule);
          if (scheduleError) throw scheduleError;
        }
      }
    }
  } catch (error) {
    log.error('Error saving goals', error);
    throw error;
  }
}

// ==================== Credits ====================

export async function loadCredits(): Promise<Array<Credit & { schedule: CreditScheduleItem[] }>> {
  try {
    const { data: credits, error } = await supabase
      .from('credits')
      .select('*')
      .order('start_date', { ascending: false });

    if (error) {
      log.error('Failed to load credits', error);
      return [];
    }

    // Загружаем графики для каждого кредита
    const creditsWithSchedules = await Promise.all(
      (credits || []).map(async (credit) => {
        const { data: schedule } = await supabase
          .from('credit_schedule_items')
          .select('*')
          .eq('credit_id', credit.id)
          .order('payment_date', { ascending: true });

        return {
          ...credit,
          schedule: (schedule || []) as CreditScheduleItem[],
        };
      })
    );

    return creditsWithSchedules;
  } catch (error) {
    log.error('Error loading credits', error);
    return [];
  }
}

export async function saveCredit(credit: Credit & { schedule?: CreditScheduleItem[] }): Promise<void> {
  try {
    const { schedule, ...creditData } = credit;

    // Сохраняем кредит
    const { error: creditError } = await supabase
      .from('credits')
      .upsert(creditData, { onConflict: 'id' });

    if (creditError) throw creditError;

    // Сохраняем график платежей
    if (schedule && schedule.length > 0) {
      // Удаляем старые записи
      await supabase.from('credit_schedule_items').delete().eq('credit_id', credit.id);

      // Добавляем новые
      const { error: scheduleError } = await supabase
        .from('credit_schedule_items')
        .insert(schedule);

      if (scheduleError) throw scheduleError;
    }
  } catch (error) {
    log.error('Error saving credit', error);
    throw error;
  }
}

export async function deleteCredit(id: string): Promise<void> {
  try {
    // Удаление credit_schedule_items произойдет автоматически через CASCADE
    const { error } = await supabase.from('credits').delete().eq('id', id);

    if (error) throw error;
  } catch (error) {
    log.error('Error deleting credit', error);
    throw error;
  }
}

// ==================== Incomes ====================

export async function loadIncomes(): Promise<Income[]> {
  try {
    const { data, error } = await supabase
      .from('incomes')
      .select('*')
      .order('date', { ascending: false });

    if (error) {
      log.error('Failed to load incomes', error);
      return [];
    }

    return data || [];
  } catch (error) {
    log.error('Error loading incomes', error);
    return [];
  }
}

export async function saveIncomes(incomes: Income[]): Promise<void> {
  try {
    if (!Array.isArray(incomes)) {
      log.error('saveIncomes: incomes is not an array', typeof incomes);
      return;
    }

    const { error } = await supabase
      .from('incomes')
      .upsert(incomes, { onConflict: 'id' });

    if (error) {
      log.error('Failed to save incomes', error);
      throw error;
    }
  } catch (error) {
    log.error('Error saving incomes', error);
    throw error;
  }
}

// ==================== Settings ====================

export async function loadSettings(): Promise<Settings | null> {
  try {
    // В SQLite настройки хранятся как одна запись с key='main'
    // Проверяем, есть ли такая запись
    const { data, error } = await supabase
      .from('settings')
      .select('*')
      .eq('key', 'main')
      .single();

    if (error) {
      // Если записи нет - это нормально (первый запуск)
      if (error.code === 'PGRST116') {
        return null;
      }
      log.error('Failed to load settings', error);
      return null;
    }

    if (!data || !data.value) {
      return null;
    }

    // В Supabase JSONB уже парсится автоматически
    // Если это строка - парсим, если объект - используем как есть
    let settings: Settings;
    try {
      settings = typeof data.value === 'string' ? JSON.parse(data.value) : data.value;
    } catch (parseError) {
      log.error('Failed to parse settings value', parseError);
      return null;
    }

    return settings;
  } catch (error) {
    log.error('Error loading settings', error);
    return null;
  }
}

export async function saveSettings(settings: Settings): Promise<void> {
  try {
    // В SQLite настройки хранятся как одна запись с key='main'
    // Сохраняем весь объект Settings как одно значение
    const { error } = await supabase
      .from('settings')
      .upsert({
        key: 'main',
        value: settings, // JSONB автоматически сериализует объекты
      }, { onConflict: 'key' });

    if (error) {
      log.error('Failed to save settings', error);
      throw error;
    }
  } catch (error) {
    log.error('Error saving settings', error);
    throw error;
  }
}

// ==================== Calculations ====================

export async function loadCalculations(): Promise<Calculation[]> {
  try {
    const { data, error } = await supabase
      .from('calculations')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      log.error('Failed to load calculations', error);
      return [];
    }

    return data || [];
  } catch (error) {
    log.error('Error loading calculations', error);
    return [];
  }
}

export async function saveCalculations(calculations: Calculation[]): Promise<void> {
  try {
    if (!Array.isArray(calculations)) {
      log.error('saveCalculations: calculations is not an array', typeof calculations);
      return;
    }

    const { error } = await supabase
      .from('calculations')
      .upsert(calculations, { onConflict: 'id' });

    if (error) {
      log.error('Failed to save calculations', error);
      throw error;
    }
  } catch (error) {
    log.error('Error saving calculations', error);
    throw error;
  }
}

// ==================== Taxes ====================

export async function loadTaxes(): Promise<TaxPaidFlag[]> {
  try {
    const { data, error } = await supabase.from('tax_paid_flags').select('*');

    if (error) {
      log.error('Failed to load taxes', error);
      return [];
    }

    return (data || []) as TaxPaidFlag[];
  } catch (error) {
    log.error('Error loading taxes', error);
    return [];
  }
}

export async function saveTaxes(taxes: TaxPaidFlag[]): Promise<void> {
  try {
    if (!Array.isArray(taxes)) {
      log.error('saveTaxes: taxes is not an array', typeof taxes);
      return;
    }

    const { error } = await supabase
      .from('tax_paid_flags')
      .upsert(taxes, { onConflict: 'key' });

    if (error) {
      log.error('Failed to save taxes', error);
      throw error;
    }
  } catch (error) {
    log.error('Error saving taxes', error);
    throw error;
  }
}

// ==================== Extra Work ====================

export async function loadExtraWork(): Promise<ExtraWork[]> {
  try {
    const { data, error } = await supabase
      .from('extra_work')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      log.error('Failed to load extra work', error);
      return [];
    }

    if (!data) return [];

    // Преобразуем JSON поля
    return data.map((row: any) => ({
      ...row,
      workDates: typeof row.work_dates === 'string' ? JSON.parse(row.work_dates) : row.work_dates,
      payments: typeof row.payments === 'string' ? JSON.parse(row.payments) : row.payments,
      work_dates: undefined,
    }));
  } catch (error) {
    log.error('Error loading extra work', error);
    return [];
  }
}

export async function saveExtraWork(extraWork: ExtraWork[]): Promise<void> {
  try {
    if (!Array.isArray(extraWork)) {
      log.error('saveExtraWork: extraWork is not an array', typeof extraWork);
      return;
    }

    // Преобразуем camelCase в snake_case
    const dbExtraWork = extraWork.map((work: any) => ({
      ...work,
      work_dates: work.workDates ? (typeof work.workDates === 'string' ? work.workDates : JSON.stringify(work.workDates)) : null,
      payments: work.payments ? (typeof work.payments === 'string' ? work.payments : JSON.stringify(work.payments)) : null,
      workDates: undefined,
    }));

    const { error } = await supabase
      .from('extra_work')
      .upsert(dbExtraWork, { onConflict: 'id' });

    if (error) {
      log.error('Failed to save extra work', error);
      throw error;
    }
  } catch (error) {
    log.error('Error saving extra work', error);
    throw error;
  }
}
