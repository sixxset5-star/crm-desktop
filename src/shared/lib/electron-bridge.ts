import type { Task, TaskAssigneeHistory } from '@/types';
import type { Customer, Contractor } from '@/types';
import type { Income } from '@/types';
import type { Goal, MonthlyFinancialGoal, Credit, CreditScheduleItem } from '@/store/goals';
import type { Settings } from '@/store/settings';
import type { Calculation } from '@/store/calculator';
import type { TaxPaidFlag } from '@/store/taxes';
import type { ExtraWork } from '@/pages/workload/types/extra-work.types';
import type { IpcApi, IpcResult, AllowedEventChannel, EventPayloadMap } from './ipc-contract';
import { createLogger } from './logger';

const log = createLogger('electron-bridge');

/**
 * Класс ошибки IPC с кодом для более детальной обработки
 */
export class IpcError extends Error {
	code: string;
	
	constructor(code: string, message?: string) {
		super(message || code);
		this.name = 'IpcError';
		this.code = code;
	}
}

// Хелпер для безопасного вызова IPC методов с обработкой ошибок
async function unwrap<T>(promise: Promise<IpcResult<T>>): Promise<T> {
	const res = await promise;
	if (!res.ok) {
		throw new IpcError(res.code, res.message);
	}
	return res.data;
}

// Хелпер для безопасного вызова методов, которые могут вернуть null
async function safeCall<T>(promise: Promise<T | null>, fallback: T): Promise<T> {
	try {
		const result = await promise;
		return result ?? fallback;
	} catch (error) {
		log.error('IPC call failed', error);
		return fallback;
	}
}

export function subscribeToEvent<T extends AllowedEventChannel>(
	channel: T,
	callback: (payload: EventPayloadMap[T]) => void
): () => void {
	if (!window.crm?.onEvent) {
		return () => {};
	}
	return window.crm.onEvent(channel, callback) || (() => {});
}

export async function requestInstallUpdate(): Promise<void> {
	if (!window.crm?.installUpdate) return;
	try {
		await unwrap(window.crm.installUpdate());
	} catch (error) {
		log.error('installUpdate error', error);
	}
}

export async function requestUpdateCheck(): Promise<void> {
	if (!window.crm?.checkForUpdates) return;
	try {
		await unwrap(window.crm.checkForUpdates());
	} catch (error) {
		log.error('checkForUpdates error', error);
	}
}

export async function loadTasksFromDisk(): Promise<Task[]> {
	if (!window.crm) {
		log.error('window.crm is not available');
		return [];
	}
	try {
		const result = await window.crm.loadTasks();
		if (!result.ok) {
			log.warn('Tasks load returned error response', { 
				message: result.message, 
				code: result.code 
			});
			// Возвращаем пустой массив, не бросая исключение
			// Ошибка будет обработана в UI через существующий механизм
			return [];
		}
		return result.data || [];
	} catch (error) {
		log.error('IPC call failed', error);
		return [];
	}
}

export async function saveTasksToDisk(tasks: Task[]): Promise<void> {
	if (!window.crm) return;
	try {
		// window.crm.saveTasks уже оборачивает tasks в { tasks }, поэтому передаем массив напрямую
		const result = await window.crm.saveTasks(tasks);
		if (!result.ok) {
			// НЕ бросаем исключение! Просто логируем предупреждение
			// Domain-сервис должен был нормализовать данные, но если ошибка всё равно вернулась,
			// значит данные действительно невалидны - просто пропускаем сохранение
			log.warn('Save tasks returned error response (data not saved)', { 
				message: result.message, 
				code: result.code 
			});
			return; // Ничего не сохраняем, но не падаем
		}
	} catch (error) {
		// Только реальные исключения (network, IPC channel errors) логируем как ошибки
		log.error('IPC call failed (unexpected error)', error);
	}
}

export async function loadCustomersFromDisk(): Promise<Customer[]> {
	if (!window.crm) return [];
	try {
		const result = await window.crm.loadCustomers();
		if (!result.ok) {
			log.error('Failed to load customers', result.message);
			return [];
		}
		return result.data;
	} catch (error) {
		log.error('IPC call failed', error);
		return [];
	}
}

export async function loadContractorsFromDisk(): Promise<Contractor[]> {
	if (!window.crm) {
		log.warn('loadContractorsFromDisk: window.crm not available');
		return [];
	}
	try {
		const result = await window.crm.loadContractors();
		if (!result.ok) {
			log.error('Failed to load contractors', { message: result.message, code: result.code });
			return [];
		}
		return result.data || [];
	} catch (error) {
		log.error('IPC call failed', error);
		return [];
	}
}

export async function saveContractorsToDisk(contractors: Contractor[]): Promise<void> {
	if (!window.crm) {
		log.warn('saveContractorsToDisk: window.crm not available');
		return;
	}
	try {
		if (!Array.isArray(contractors)) {
			log.error('saveContractorsToDisk: contractors is not an array', typeof contractors);
			return;
		}
		
		// Нормализуем данные: преобразуем null в undefined для опциональных полей
		const normalizedContractors = contractors.map(c => ({
			...c,
			contact: c.contact === null ? undefined : c.contact,
			avatar: c.avatar === null ? undefined : c.avatar,
			comment: c.comment === null ? undefined : c.comment,
			specialization: c.specialization === null ? undefined : c.specialization,
			rate: c.rate === null ? undefined : c.rate,
		}));
		
		const result = await window.crm.saveContractors(normalizedContractors);
		if (!result.ok) {
			log.error('Save contractors returned error response (data not saved)', { 
				message: result.message, 
				code: result.code,
				contractorsCount: contractors.length
			});
			throw new Error(result.message || 'Failed to save contractors');
		}
	} catch (error) {
		log.error('IPC call failed (unexpected error)', error);
		throw error; // Пробрасываем ошибку, чтобы можно было обработать
	}
}

export async function deactivateContractorOnDisk(id: string): Promise<number> {
	if (!window.crm) return 0;
	try {
		const result = await window.crm.deactivateContractor(id);
		if (!result.ok) {
			log.warn('Deactivate contractor returned error response', { 
				message: result.message, 
				code: result.code 
			});
			return 0;
		}
		return result.data?.tasksReturned || 0;
	} catch (error) {
		log.error('IPC call failed (unexpected error)', error);
		return 0;
	}
}

export async function deleteContractorOnDisk(id: string): Promise<void> {
	if (!window.crm) return;
	try {
		const result = await window.crm.deleteContractor(id);
		if (!result.ok) {
			log.warn('Delete contractor returned error response', { 
				message: result.message, 
				code: result.code 
			});
			throw new Error(result.message || 'Failed to delete contractor');
		}
	} catch (error) {
		log.error('IPC call failed (unexpected error)', error);
		throw error;
	}
}

export async function getTaskAssigneeHistory(taskId: string): Promise<TaskAssigneeHistory[]> {
	if (!window.crm) return [];
	try {
		const result = await window.crm.getTaskAssigneeHistory(taskId);
		if (!result.ok) {
			log.error('Failed to get task assignee history', result.message);
			return [];
		}
		return result.data || [];
	} catch (error) {
		log.error('IPC call failed', error);
		return [];
	}
}

export async function getContractorAssigneeHistory(contractorId: string): Promise<TaskAssigneeHistory[]> {
	if (!window.crm) return [];
	try {
		const result = await window.crm.getContractorAssigneeHistory(contractorId);
		if (!result.ok) {
			log.error('Failed to get contractor assignee history', result.message);
			return [];
		}
		return result.data || [];
	} catch (error) {
		log.error('IPC call failed', error);
		return [];
	}
}

export async function saveCustomersToDisk(customers: Customer[]): Promise<void> {
	if (!window.crm) return;
	try {
		if (!Array.isArray(customers)) {
			log.error('saveCustomersToDisk: customers is not an array', typeof customers);
			return;
		}
		// window.crm.saveCustomers уже оборачивает customers в { customers }, поэтому передаем массив напрямую
		const result = await window.crm.saveCustomers(customers);
		if (!result.ok) {
			// НЕ бросаем исключение! Просто логируем предупреждение
			// Domain-сервис должен был нормализовать данные, но если ошибка всё равно вернулась,
			// значит данные действительно невалидны - просто пропускаем сохранение
			const resultUnknown = result as unknown as { error?: unknown };
			log.warn('Save customers returned error response (data not saved)', { 
				code: result.code, 
				message: result.message,
				...(resultUnknown.error ? { error: resultUnknown.error } : {})
			});
			return; // Ничего не сохраняем, но не падаем
		}
		// Успешное сохранение - ничего не делаем (void)
	} catch (error) {
		// Только реальные исключения (network, IPC channel errors) логируем как ошибки
		log.error('IPC call failed (unexpected error)', error);
	}
}

export async function loadGoalsFromDisk(): Promise<{ goals: Goal[]; monthlyFinancialGoals: MonthlyFinancialGoal[]; credits: Credit[] }> {
	const fallback = { goals: [], monthlyFinancialGoals: [], credits: [] };
	if (!window.crm) return fallback;
	try {
		const result = await window.crm.loadGoals();
		if (!result.ok) {
			log.error('Failed to load goals', result.message);
			return fallback;
		}
		return result.data;
	} catch (error) {
		log.error('IPC call failed', error);
		return fallback;
	}
}

export async function saveGoalsToDisk(data: { goals: Goal[]; monthlyFinancialGoals: MonthlyFinancialGoal[]; credits?: Credit[] }): Promise<void> {
	if (!window.crm) return;
	try {
		await unwrap(window.crm.saveGoals(data));
	} catch (error) {
		log.error('Failed to save goals', error);
	}
}

// Credits bridge functions
export async function loadCreditsFromDisk(): Promise<{
	credits: Array<Credit & { schedule: CreditScheduleItem[] }>;
	needsMigration?: boolean;
	migrationCount?: number;
	_skipUpdate?: boolean; // Флаг для store: пропустить обновление, если данные не готовы
}> {
	if (!window.crm) {
		log.warn('window.crm not available, skipping credits load');
		return { credits: [], _skipUpdate: true };
	}
	try {
		const result = await window.crm.loadCredits();
		if (!result.ok) {
			log.error('Failed to load credits', result.message);
			return { credits: [], _skipUpdate: true };
		}

		// 🔥 ВОТ ЭТО ВАЖНО: проверяем, что result.data - это массив
		// Если data внезапно undefined или не массив, не затираем стор
		if (!Array.isArray(result.data)) {
			log.error('loadCredits returned invalid data shape', { data: result.data });
			return { credits: [], _skipUpdate: true };
		}

		return {
			credits: result.data,
			needsMigration: result.needsMigration || false,
			migrationCount: result.migrationCount || 0,
		};
	} catch (error) {
		log.error('IPC call failed', error);
		return { credits: [], _skipUpdate: true };
	}
}

export async function findCreditsNeedingMigration(): Promise<Credit[]> {
	if (!window.crm) return [];
	try {
		const result = await window.crm.findCreditsNeedingMigration();
		if (!result.ok) {
			log.error('Failed to find credits needing migration', result.message);
			return [];
		}
		return result.data || [];
	} catch (error) {
		log.error('IPC call failed', error);
		return [];
	}
}

export async function migrateCredit(creditId: string): Promise<Credit & { schedule: CreditScheduleItem[] }> {
	if (!window.crm) throw new Error('window.crm not available');
	try {
		const result = await window.crm.migrateCredit({ creditId });
		if (!result.ok) {
			throw new Error(result.message || 'Failed to migrate credit');
		}
		return result.data;
	} catch (error) {
		log.error('Failed to migrate credit', error);
		throw error;
	}
}

export async function migrateAllCredits(): Promise<{
	success: Array<Credit & { schedule: CreditScheduleItem[] }>;
	failed: Array<{ credit: Credit; error: string }>;
}> {
	if (!window.crm) throw new Error('window.crm not available');
	try {
		const result = await window.crm.migrateAllCredits();
		if (!result.ok) {
			throw new Error(result.message || 'Failed to migrate credits');
		}
		return result.data;
	} catch (error) {
		log.error('Failed to migrate all credits', error);
		throw error;
	}
}

export async function saveCreditToDisk(credit: Credit): Promise<Credit & { schedule: CreditScheduleItem[] }> {
	if (!window.crm) throw new Error('window.crm not available');
	try {
		const result = await window.crm.saveCredit(credit);
		if (!result.ok) {
			throw new Error(result.message || 'Failed to save credit');
		}
		return result.data;
	} catch (error) {
		log.error('Failed to save credit', error);
		throw error;
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
	if (!window.crm) {
		log.error('buildCreditSchedule: window.crm not available');
		return [];
	}
	try {
		const result = await window.crm.buildCreditSchedule(params);
		if (!result.ok) {
			log.error('buildCreditSchedule: Failed to build schedule', result.message);
			return [];
		}
		return result.data || [];
	} catch (error) {
		log.error('buildCreditSchedule: IPC call failed', error);
		return [];
	}
}

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
	if (!window.crm) throw new Error('window.crm not available');
	try {
		const result = await window.crm.rebuildCreditSchedule(params);
		if (!result.ok) {
			throw new Error(result.message || 'Failed to rebuild schedule');
		}
		return result.data;
	} catch (error) {
		log.error('Failed to rebuild schedule', error);
		throw error;
	}
}

export async function applyCreditPayment(params: {
	creditId: string;
	itemId: string;
	paidAmount?: number;
}): Promise<Credit & { schedule: CreditScheduleItem[] }> {
	if (!window.crm) throw new Error('window.crm not available');
	try {
		const result = await window.crm.applyCreditPayment(params);
		if (!result.ok) {
			throw new Error(result.message || 'Failed to apply payment');
		}
		return result.data;
	} catch (error) {
		log.error('Failed to apply payment', error);
		throw error;
	}
}

export async function deleteCreditOnDisk(id: string): Promise<void> {
	if (!window.crm) return;
	try {
		const result = await window.crm.deleteCredit({ id });
		if (!result.ok) {
			throw new Error(result.message || 'Failed to delete credit');
		}
	} catch (error) {
		log.error('Failed to delete credit', error);
		throw error;
	}
}

export async function calculateCreditPayment(params: {
	amount: number;
	annualRate: number;
	termMonths: number;
}): Promise<number | null> {
	if (!window.crm) return null;
	try {
		const result = await window.crm.calculateCreditPayment(params);
		if (!result.ok) {
			log.error('Failed to calculate payment', result.message);
			return null;
		}
		return result.data?.payment || null;
	} catch (error) {
		log.error('IPC call failed', error);
		return null;
	}
}

export async function calculateCreditTerm(params: {
	amount: number;
	annualRate: number;
	monthlyPayment: number;
}): Promise<number | null> {
	if (!window.crm) return null;
	try {
		const result = await window.crm.calculateCreditTerm(params);
		if (!result.ok) {
			log.error('Failed to calculate term', result.message);
			return null;
		}
		return result.data?.termMonths || null;
	} catch (error) {
		log.error('IPC call failed', error);
		return null;
	}
}

export async function calculateCreditAmount(params: {
	annualRate: number;
	termMonths: number;
	monthlyPayment: number;
}): Promise<number | null> {
	if (!window.crm) return null;
	try {
		const result = await window.crm.calculateCreditAmount(params);
		if (!result.ok) {
			log.error('Failed to calculate amount', result.message);
			return null;
		}
		return result.data?.amount || null;
	} catch (error) {
		log.error('IPC call failed', error);
		return null;
	}
}

export async function getUpcomingCreditPayments(daysAhead: number = 7): Promise<Array<{
	creditId: string;
	creditName: string;
	paymentDate: string;
	amount: number;
	monthNumber: number;
}>> {
	if (!window.crm) return [];
	try {
		const result = await window.crm.getUpcomingCreditPayments({ daysAhead });
		if (!result.ok) {
			log.error('Failed to get upcoming payments', result.message);
			return [];
		}
		return result.data || [];
	} catch (error) {
		log.error('IPC call failed', error);
		return [];
	}
}

export async function loadSettingsFromDisk(): Promise<Settings | null> {
	if (!window.crm) return null;
	try {
		const result = await window.crm.loadSettings();
		if (!result.ok) {
			log.error('Failed to load settings', result.message);
			return null;
		}
		let data = result.data;
		
		// КРИТИЧНО: Извлекаем данные из обернутой структуры, если они обернуты
		// Это может произойти, если IPC обработчик не извлек данные правильно
		if (data && typeof data === 'object' && 'settings' in data) {
			const dataUnknown = data as unknown as { settings?: unknown };
			const nestedSettings = dataUnknown.settings;
			// Проверяем, что это действительно настройки (есть характерные поля)
			const hasNestedData = nestedSettings && typeof nestedSettings === 'object' && 
			    ('currency' in nestedSettings || 'holidays' in nestedSettings || 'customWeekends' in nestedSettings);
			const hasRootData = 'currency' in data || 'holidays' in data || 'customWeekends' in data;
			
			if (hasNestedData && !hasRootData && nestedSettings) {
				const nestedUnknown = nestedSettings as unknown as { holidays?: unknown[]; customWeekends?: unknown[] };
				log.warn('Found wrapped settings structure, unwrapping');
				data = nestedSettings as Settings;
			}
		}
		
		return data;
	} catch (error) {
		log.error('Failed to load settings', error);
		return null;
	}
}

export async function saveSettingsToDisk(settings: Settings): Promise<void> {
	if (!window.crm) return;
	try {
		// КРИТИЧНО: Проверяем наличие критичных данных перед сохранением
		const hasCriticalData = (settings.holidays && settings.holidays.length > 0) ||
		                        (settings.customWeekends && settings.customWeekends.length > 0) ||
		                        (settings.excludedWeekends && settings.excludedWeekends.length > 0) ||
		                        (settings.weekendTasks && Object.keys(settings.weekendTasks).length > 0);
		
		// Если критичные данные отсутствуют, но мы пытаемся сохранить - это подозрительно
		// Но не блокируем сохранение, так как пользователь мог их очистить намеренно
		if (!hasCriticalData) {
			log.warn('Saving settings without critical data');
		}
		
		const result = await window.crm.saveSettings(settings);
		if (!result.ok) {
			// НЕ бросаем исключение! Просто логируем предупреждение
			log.warn('Save settings returned error response (data not saved)', { 
				message: result.message, 
				code: result.code 
			});
			return; // Ничего не сохраняем, но не падаем
		}
	} catch (error) {
		// Только реальные исключения (network, IPC channel errors) логируем как ошибки
		log.error('IPC call failed (unexpected error)', error);
	}
}

export async function loadCalculationsFromDisk(): Promise<Calculation[]> {
	if (!window.crm) return [];
	try {
		const result = await window.crm.loadCalculations();
		if (!result.ok) {
			log.error('Failed to load calculations', result.message);
			return [];
		}
		return result.data;
	} catch (error) {
		log.error('IPC call failed', error);
		return [];
	}
}

export async function saveCalculationsToDisk(calculations: Calculation[]): Promise<void> {
	if (!window.crm) return;
	try {
		await unwrap(window.crm.saveCalculations(calculations));
	} catch (error) {
		log.error('Failed to save calculations', error);
	}
}

export async function loadTaxesFromDisk(): Promise<TaxPaidFlag[]> {
	if (!window.crm) return [];
	try {
		const result = await window.crm.loadTaxes();
		if (!result.ok) {
			log.error('Failed to load taxes', result.message);
			return [];
		}
		return result.data;
	} catch (error) {
		log.error('IPC call failed', error);
		return [];
	}
}

export async function saveTaxesToDisk(taxes: TaxPaidFlag[]): Promise<void> {
	if (!window.crm) return;
	try {
		await unwrap(window.crm.saveTaxes(taxes));
	} catch (error) {
		log.error('Failed to save taxes', error);
	}
}

export async function loadIncomesFromDisk(): Promise<Income[]> {
	if (!window.crm) return [];
	try {
		const result = await window.crm.loadIncomes();
		if (!result.ok) {
			log.error('Failed to load incomes', result.message);
			return [];
		}
		return result.data;
	} catch (error) {
		log.error('IPC call failed', error);
		return [];
	}
}

export async function saveIncomesToDisk(incomes: Income[]): Promise<void> {
	if (!window.crm) return;
	try {
		await unwrap(window.crm.saveIncomes(incomes));
	} catch (error) {
		log.error('Failed to save incomes', error);
	}
}

export async function loadExtraWorkFromDisk(): Promise<ExtraWork[]> {
	if (!window.crm) return [];
	try {
		const result = await window.crm.loadExtraWork();
		if (!result.ok) {
			log.error('Failed to load extra work', result.message);
			return [];
		}
		return result.data;
	} catch (error) {
		log.error('IPC call failed', error);
		return [];
	}
}

export async function saveExtraWorkToDisk(extraWorks: ExtraWork[]): Promise<void> {
	if (!window.crm) return;
	try {
		await unwrap(window.crm.saveExtraWork(extraWorks));
	} catch (error) {
		log.error('Failed to save extra work', error);
	}
}

export async function selectAvatarFile(): Promise<string | null> {
	if (!window.crm) return null;
	try {
		return await window.crm.selectAvatar();
	} catch {
		return null;
	}
}

export async function selectCsvFile(): Promise<string | null> {
	if (!window.crm) {
		log.error('window.crm is not available');
		return null;
	}
	try {
		return await window.crm.selectCsvFile();
	} catch (error) {
		log.error('Error in selectCsvFile', error);
		return null;
	}
}

export async function readCsvFile(filePath: string): Promise<string | null> {
	if (!window.crm) return null;
	try {
		return await window.crm.readCsvFile(filePath);
	} catch {
		return null;
	}
}

export async function saveCsvFile(content: string, defaultFileName?: string): Promise<string | null> {
	if (!window.crm) {
		log.error('saveCsvFile: window.crm not available');
		return null;
	}
	try {
		return await window.crm.saveCsvFile(content, defaultFileName);
	} catch (error) {
		log.error('saveCsvFile: error', error);
		return null;
	}
}

export async function selectFiles(): Promise<string[] | null> {
	if (!window.crm) return null;
	try {
		return await window.crm.selectFiles();
	} catch {
		return null;
	}
}

export async function getTaskFilesDir(taskId: string): Promise<string | null> {
	if (!window.crm) return null;
	try {
		return await window.crm.getTaskFilesDir(taskId);
	} catch {
		return null;
	}
}

export async function copyFileToTaskDir(sourcePath: string, destPath: string): Promise<boolean> {
	if (!window.crm) return false;
	try {
		return await window.crm.copyFile(sourcePath, destPath);
	} catch {
		return false;
	}
}

export async function getFileSize(filePath: string): Promise<number | null> {
	if (!window.crm) return null;
	try {
		return await window.crm.getFileSize(filePath);
	} catch {
		return null;
	}
}

export async function openFile(filePath: string): Promise<IpcResult<void>> {
	if (!window.crm) {
		return { ok: false, code: 'NO_API', message: 'window.crm not available' };
	}
	try {
		return await window.crm.openFile(filePath);
	} catch (error) {
		return { ok: false, code: 'ERROR', message: error instanceof Error ? error.message : String(error) };
	}
}

export async function downloadFile(sourcePath: string, defaultFileName?: string): Promise<IpcResult<{ path: string }>> {
	if (!window.crm) {
		return { ok: false, code: 'NO_API', message: 'window.crm not available' };
	}
	try {
		return await window.crm.downloadFile(sourcePath, defaultFileName);
	} catch (error) {
		return { ok: false, code: 'ERROR', message: error instanceof Error ? error.message : String(error) };
	}
}

export async function renameFile(filePath: string, newFileName: string): Promise<IpcResult<{ path: string }>> {
	if (!window.crm) {
		return { ok: false, code: 'NO_API', message: 'window.crm not available' };
	}
	try {
		return await window.crm.renameFile(filePath, newFileName);
	} catch (error) {
		return { ok: false, code: 'ERROR', message: error instanceof Error ? error.message : String(error) };
	}
}

export async function showNotification(title: string, body: string): Promise<void> {
	if (!window.crm) return;
	try {
		await window.crm.showNotification(title, body);
	} catch {
		// ignore
	}
}

export async function openExternalUrl(url: string): Promise<IpcResult<void>> {
	if (!window.crm) {
		return { ok: false, code: 'NO_API', message: 'window.crm not available' };
	}
	try {
		return await window.crm.openExternalUrl(url);
	} catch (error) {
		return { ok: false, code: 'ERROR', message: error instanceof Error ? error.message : String(error) };
	}
}

export async function openDatabase(): Promise<IpcResult<void>> {
	if (!window.crm) {
		return { ok: false, code: 'NO_API', message: 'window.crm not available' };
	}
	try {
		return await window.crm.openDatabase();
	} catch (error) {
		return { ok: false, code: 'ERROR', message: error instanceof Error ? error.message : String(error) };
	}
}

export async function getDatabasePath(): Promise<string | null> {
	if (!window.crm) return null;
	try {
		return await window.crm.getDatabasePath();
	} catch {
		return null;
	}
}




