// Централизованный контракт IPC API
// Этот файл определяет все методы, доступные через window.crm

import type { Task } from '@/types';
import type { Customer } from '@/types';
import type { Income } from '@/types';
import type { Goal, MonthlyFinancialGoal, Credit } from '@/store/goals';
import type { Settings } from '@/store/settings';
import type { Calculation } from '@/store/calculator';
import type { TaxPaidFlag } from '@/store/taxes';
import type { ExtraWork } from '@/pages/workload/types/extra-work.types';

// Тип результата IPC операций
export type IpcResult<T> = 
	| { ok: true; data: T }
	| { ok: false; code: string; message: string };

// Типы для событий
export type UpdateInfo = {
	version?: string;
	releaseDate?: string;
};

export type UpdateProgress = {
	percent: number;
	transferred: number;
	total: number;
};

export type BannerMessage = {
	type: 'info' | 'success' | 'error' | 'warning';
	message: string;
};

export type AllowedEventChannel = 
	| 'updates:available' 
	| 'updates:download-progress' 
	| 'updates:ready' 
	| 'updates:none' 
	| 'ui:banner';

export type EventPayloadMap = {
	'updates:available': UpdateInfo;
	'updates:download-progress': UpdateProgress;
	'updates:ready': UpdateInfo;
	'updates:none': { version: string | null };
	'ui:banner': BannerMessage;
};

// Основной контракт IPC API
export interface IpcApi {
	// Tasks
	loadTasks: () => Promise<IpcResult<Task[]>>;
	saveTasks: (tasks: Task[]) => Promise<IpcResult<void>>;

	// Customers
	loadCustomers: () => Promise<IpcResult<Customer[]>>;
	saveCustomers: (customers: Customer[]) => Promise<IpcResult<void>>;

	// Goals
	loadGoals: () => Promise<IpcResult<{
		goals: Goal[];
		monthlyFinancialGoals: MonthlyFinancialGoal[];
		credits: Credit[];
	}>>;
	saveGoals: (data: {
		goals: Goal[];
		monthlyFinancialGoals: MonthlyFinancialGoal[];
		credits?: Credit[];
	}) => Promise<IpcResult<void>>;

	// Settings
	loadSettings: () => Promise<IpcResult<Settings | null>>;
	saveSettings: (settings: Settings) => Promise<IpcResult<void>>;

	// Calculations
	loadCalculations: () => Promise<IpcResult<Calculation[]>>;
	saveCalculations: (calculations: Calculation[]) => Promise<IpcResult<void>>;

	// Taxes
	loadTaxes: () => Promise<IpcResult<TaxPaidFlag[]>>;
	saveTaxes: (taxes: TaxPaidFlag[]) => Promise<IpcResult<void>>;

	// Incomes
	loadIncomes: () => Promise<IpcResult<Income[]>>;
	saveIncomes: (incomes: Income[]) => Promise<IpcResult<void>>;

	// Extra Work
	loadExtraWork: () => Promise<IpcResult<ExtraWork[]>>;
	saveExtraWork: (extraWorks: ExtraWork[]) => Promise<IpcResult<void>>;

	// Files
	selectAvatar: () => Promise<string | null>;
	selectFiles: () => Promise<string[] | null>;
	getTaskFilesDir: (taskId: string) => Promise<string | null>;
	copyFile: (sourcePath: string, destPath: string) => Promise<boolean>;
	getFileSize: (filePath: string) => Promise<number | null>;
	openFile: (filePath: string) => Promise<IpcResult<void>>;
	downloadFile: (sourcePath: string, defaultFileName?: string) => Promise<IpcResult<{ path: string }>>;
	renameFile: (filePath: string, newFileName: string) => Promise<IpcResult<{ path: string }>>;

	// CSV
	selectCsvFile: () => Promise<string | null>;
	readCsvFile: (filePath: string) => Promise<string | null>;
	saveCsvFile: (content: string, defaultFileName?: string) => Promise<string | null>;

	// System
	openExternalUrl: (url: string) => Promise<IpcResult<void>>;
	openDatabase: () => Promise<IpcResult<void>>;
	getDatabasePath: () => Promise<string | null>;
	showNotification: (title: string, body: string) => Promise<void>;

	// Updates
	checkForUpdates?: () => Promise<IpcResult<void>>;
	installUpdate?: () => Promise<IpcResult<void>>;

	// Events
	onEvent?: <T extends AllowedEventChannel>(
		channel: T,
		callback: (payload: EventPayloadMap[T]) => void
	) => () => void;
}

// Расширяем глобальный Window интерфейс
declare global {
	interface Window {
		crm?: IpcApi;
	}
}


