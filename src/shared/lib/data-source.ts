/**
 * Абстракция источника данных
 * Автоматически выбирает между IPC (Electron) и HTTP API (браузер)
 */
import type { Task } from '@/types';
import type { Customer, Contractor } from '@/types';
import type { Income } from '@/types';
import type { Goal, MonthlyFinancialGoal, Credit, CreditScheduleItem } from '@/store/goals';
import type { Settings } from '@/store/settings';
import type { Calculation } from '@/store/calculator';
import type { TaxPaidFlag } from '@/store/taxes';
import type { ExtraWork } from '@/pages/workload/types/extra-work.types';

// Импорты для Electron (IPC)
import {
  loadTasksFromDisk,
  saveTasksToDisk,
  loadCustomersFromDisk,
  saveCustomersToDisk,
  loadContractorsFromDisk,
  saveContractorsToDisk,
  loadGoalsFromDisk,
  saveGoalsToDisk,
  loadCreditsFromDisk,
  saveCreditToDisk,
  deleteCreditOnDisk,
  loadIncomesFromDisk,
  saveIncomesToDisk,
  loadSettingsFromDisk,
  saveSettingsToDisk,
  loadCalculationsFromDisk,
  saveCalculationsToDisk,
  loadTaxesFromDisk,
  saveTaxesToDisk,
  loadExtraWorkFromDisk,
  saveExtraWorkToDisk,
} from './electron-bridge';

// Импорты для браузера (API)
import * as apiClient from './api/api-client';

/**
 * Проверяет, запущено ли приложение в Electron
 */
function isElectron(): boolean {
  return typeof window !== 'undefined' && !!window.crm;
}

// ==================== Tasks ====================

export async function loadTasks(): Promise<Task[]> {
  if (isElectron()) {
    return await loadTasksFromDisk();
  } else {
    return await apiClient.loadTasks();
  }
}

export async function saveTasks(tasks: Task[]): Promise<void> {
  if (isElectron()) {
    return await saveTasksToDisk(tasks);
  } else {
    return await apiClient.saveTasks(tasks);
  }
}

// ==================== Customers ====================

export async function loadCustomers(): Promise<Customer[]> {
  if (isElectron()) {
    return await loadCustomersFromDisk();
  } else {
    return await apiClient.loadCustomers();
  }
}

export async function saveCustomers(customers: Customer[]): Promise<void> {
  if (isElectron()) {
    return await saveCustomersToDisk(customers);
  } else {
    return await apiClient.saveCustomers(customers);
  }
}

// ==================== Contractors ====================

export async function loadContractors(): Promise<Contractor[]> {
  if (isElectron()) {
    return await loadContractorsFromDisk();
  } else {
    return await apiClient.loadContractors();
  }
}

export async function saveContractors(contractors: Contractor[]): Promise<void> {
  if (isElectron()) {
    return await saveContractorsToDisk(contractors);
  } else {
    return await apiClient.saveContractors(contractors);
  }
}

// ==================== Goals ====================

export async function loadGoals(): Promise<{
  goals: Goal[];
  monthlyFinancialGoals: MonthlyFinancialGoal[];
  credits: Credit[];
}> {
  if (isElectron()) {
    return await loadGoalsFromDisk();
  } else {
    return await apiClient.loadGoals();
  }
}

export async function saveGoals(data: {
  goals: Goal[];
  monthlyFinancialGoals: MonthlyFinancialGoal[];
  credits?: Credit[];
}): Promise<void> {
  if (isElectron()) {
    return await saveGoalsToDisk(data);
  } else {
    return await apiClient.saveGoals(data);
  }
}

// ==================== Credits ====================

export async function loadCredits(): Promise<Array<Credit & { schedule: CreditScheduleItem[] }>> {
  if (isElectron()) {
    // В Electron loadCreditsFromDisk возвращает объект с credits, needsMigration и т.д.
    const result = await loadCreditsFromDisk();
    return result.credits || [];
  } else {
    // В браузере просто возвращаем массив
    return await apiClient.loadCredits();
  }
}

export async function saveCredit(credit: Credit & { schedule?: CreditScheduleItem[] }): Promise<void> {
  if (isElectron()) {
    return await saveCreditToDisk(credit);
  } else {
    return await apiClient.saveCredit(credit);
  }
}

export async function deleteCredit(id: string): Promise<void> {
  if (isElectron()) {
    return await deleteCreditOnDisk(id);
  } else {
    return await apiClient.deleteCredit(id);
  }
}

// Вспомогательные функции для кредитов (пока только для Electron)
// В будущем можно добавить реализацию для браузера, если нужно
export async function rebuildCreditSchedule(params: {
  creditId: string;
  newParams: {
    scheduleType?: 'annuity' | 'differentiated';
    amount?: number;
    annualRate?: number;
    termMonths?: number;
    startDate?: string;
    paymentDay?: number;
  };
}): Promise<Credit & { schedule: CreditScheduleItem[] }> {
  if (isElectron()) {
    const { rebuildCreditSchedule: rebuild } = await import('./electron-bridge');
    return await rebuild(params);
  } else {
    // В браузере пока не поддерживается - нужно пересчитать на клиенте
    throw new Error('rebuildCreditSchedule not yet supported in browser. Please use Electron app.');
  }
}

export async function applyCreditPayment(params: {
  creditId: string;
  itemId: string;
  paidAmount?: number;
}): Promise<Credit & { schedule: CreditScheduleItem[] }> {
  if (isElectron()) {
    const { applyCreditPayment: applyPayment } = await import('./electron-bridge');
    return await applyPayment(params);
  } else {
    // В браузере нужно обновить график через API
    throw new Error('applyCreditPayment not yet supported in browser. Please use Electron app.');
  }
}

export async function buildCreditSchedule(params: {
  scheduleType: 'annuity' | 'differentiated';
  amount: number;
  annualRate: number;
  termMonths: number;
  startDate: string;
  paymentDay?: number;
}): Promise<CreditScheduleItem[]> {
  if (isElectron()) {
    const { buildCreditSchedule: buildSchedule } = await import('./electron-bridge');
    return await buildSchedule(params);
  } else {
    // В браузере пока не поддерживается - нужно пересчитать на клиенте
    throw new Error('buildCreditSchedule not yet supported in browser. Please use Electron app.');
  }
}

// ==================== Incomes ====================

export async function loadIncomes(): Promise<Income[]> {
  if (isElectron()) {
    return await loadIncomesFromDisk();
  } else {
    return await apiClient.loadIncomes();
  }
}

export async function saveIncomes(incomes: Income[]): Promise<void> {
  if (isElectron()) {
    return await saveIncomesToDisk(incomes);
  } else {
    return await apiClient.saveIncomes(incomes);
  }
}

// ==================== Settings ====================

export async function loadSettings(): Promise<Settings | null> {
  if (isElectron()) {
    return await loadSettingsFromDisk();
  } else {
    return await apiClient.loadSettings();
  }
}

export async function saveSettings(settings: Settings): Promise<void> {
  if (isElectron()) {
    return await saveSettingsToDisk(settings);
  } else {
    return await apiClient.saveSettings(settings);
  }
}

// ==================== Calculations ====================

export async function loadCalculations(): Promise<Calculation[]> {
  if (isElectron()) {
    return await loadCalculationsFromDisk();
  } else {
    return await apiClient.loadCalculations();
  }
}

export async function saveCalculations(calculations: Calculation[]): Promise<void> {
  if (isElectron()) {
    return await saveCalculationsToDisk(calculations);
  } else {
    return await apiClient.saveCalculations(calculations);
  }
}

// ==================== Taxes ====================

export async function loadTaxes(): Promise<TaxPaidFlag[]> {
  if (isElectron()) {
    return await loadTaxesFromDisk();
  } else {
    return await apiClient.loadTaxes();
  }
}

export async function saveTaxes(taxes: TaxPaidFlag[]): Promise<void> {
  if (isElectron()) {
    return await saveTaxesToDisk(taxes);
  } else {
    return await apiClient.saveTaxes(taxes);
  }
}

// ==================== Extra Work ====================

export async function loadExtraWork(): Promise<ExtraWork[]> {
  if (isElectron()) {
    return await loadExtraWorkFromDisk();
  } else {
    return await apiClient.loadExtraWork();
  }
}

export async function saveExtraWork(extraWork: ExtraWork[]): Promise<void> {
  if (isElectron()) {
    return await saveExtraWorkToDisk(extraWork);
  } else {
    return await apiClient.saveExtraWork(extraWork);
  }
}

// ==================== Contractors (helpers) ====================

export async function deactivateContractor(id: string): Promise<number> {
  if (isElectron()) {
    const { deactivateContractorOnDisk } = await import('./electron-bridge');
    return await deactivateContractorOnDisk(id);
  } else {
    // В браузере обновляем через API
    const { loadContractors, saveContractors } = await import('./api/api-client');
    const contractors = await loadContractors();
    const contractor = contractors.find(c => c.id === id);
    if (contractor) {
      const updated = contractors.map(c => 
        c.id === id ? { ...c, active: 0 } : c
      );
      await saveContractors(updated);
      return 1;
    }
    return 0;
  }
}

export async function deleteContractor(id: string): Promise<void> {
  if (isElectron()) {
    const { deleteContractorOnDisk } = await import('./electron-bridge');
    return await deleteContractorOnDisk(id);
  } else {
    // В браузере удаляем через API
    const { loadContractors, saveContractors } = await import('./api/api-client');
    const contractors = await loadContractors();
    const updated = contractors.filter(c => c.id !== id);
    await saveContractors(updated);
  }
}

