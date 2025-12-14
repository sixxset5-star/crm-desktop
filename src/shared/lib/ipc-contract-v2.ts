/**
 * Единый IPC-контракт - одна точка истины для всех IPC вызовов
 * Типизирует запросы и ответы для каждого канала
 */
import type { Task, TaskAssigneeHistory } from '@/types';
import type { Customer, Contractor } from '@/types';
import type { Income } from '@/types';
import type { Goal, MonthlyFinancialGoal, Credit, CreditScheduleItem } from '@/store/goals';
import type { Settings } from '@/store/settings';
import type { Calculation } from '@/store/calculator';
import type { TaxPaidFlag } from '@/store/taxes';
import type { ExtraWork } from '@/pages/workload/types/extra-work.types';

// Базовый тип результата IPC
export type IpcResult<T> = 
	| { ok: true; data: T }
	| { ok: false; code: string; message: string; details?: unknown };

// Определение контракта для каждого IPC канала
export interface IpcContract {
	// Tasks
	'tasks:load': {
		request: void; // Нет параметров
		response: Task[];
	};
	'tasks:save': {
		request: { tasks: Task[] };
		response: void;
	};

	// Customers
	'customers:load': {
		request: void;
		response: Customer[];
	};
	'customers:save': {
		request: { customers: Customer[] };
		response: void;
	};

	// Contractors
	'contractors:load': {
		request: void;
		response: Contractor[];
	};
	'contractors:save': {
		request: { contractors: Contractor[] };
		response: void;
	};
	'contractors:deactivate': {
		request: { id: string };
		response: { tasksReturned: number };
	};
	'contractors:delete': {
		request: { id: string };
		response: void;
	};

	// Goals
	'goals:load': {
		request: void;
		response: {
			goals: Goal[];
			monthlyFinancialGoals: MonthlyFinancialGoal[];
			credits: Credit[];
		};
	};
	'goals:save': {
		request: {
			goals: Goal[];
			monthlyFinancialGoals: MonthlyFinancialGoal[];
			credits?: Credit[];
		};
		response: void;
	};

	// Credits
	'credits:load': {
		request: void;
		response: {
			data: Array<Credit & { schedule: CreditScheduleItem[] }>;
			needsMigration?: boolean;
			migrationCount?: number;
		};
	};
	'credits:save': {
		request: Credit;
		response: Credit & { schedule: CreditScheduleItem[] };
	};
	'credits:buildSchedule': {
		request: {
			scheduleType: 'annuity' | 'differentiated';
			amount: number;
			annualRate: number;
			termMonths: number;
			startDate: string;
			paymentDay?: number;
		};
		response: CreditScheduleItem[];
	};
	'credits:rebuildSchedule': {
		request: {
			creditId: string;
			newParams: {
				scheduleType?: 'annuity' | 'differentiated';
				amount?: number;
				annualRate?: number;
				termMonths?: number;
				startDate?: string;
				paymentDay?: number;
			};
		};
		response: Credit & { schedule: CreditScheduleItem[] };
	};
	'credits:applyPayment': {
		request: {
			creditId: string;
			itemId: string;
			paidAmount?: number;
		};
		response: Credit & { schedule: CreditScheduleItem[] };
	};
	'credits:delete': {
		request: { id: string };
		response: void;
	};
	'credits:calculatePayment': {
		request: {
			amount: number;
			annualRate: number;
			termMonths: number;
		};
		response: { payment: number };
	};
	'credits:calculateTerm': {
		request: {
			amount: number;
			annualRate: number;
			monthlyPayment: number;
		};
		response: { termMonths: number };
	};
	'credits:calculateAmount': {
		request: {
			annualRate: number;
			termMonths: number;
			monthlyPayment: number;
		};
		response: { amount: number };
	};
	'credits:getUpcomingPayments': {
		request: { daysAhead?: number };
		response: Array<{
			creditId: string;
			creditName: string;
			paymentDate: string;
			amount: number;
			monthNumber: number;
		}>;
	};
	'credits:findNeedingMigration': {
		request: void;
		response: Array<Credit>;
	};
	'credits:migrate': {
		request: { creditId: string };
		response: Credit & { schedule: CreditScheduleItem[] };
	};
	'credits:migrateAll': {
		request: void;
		response: {
			success: Array<Credit & { schedule: CreditScheduleItem[] }>;
			failed: Array<{ credit: Credit; error: string }>;
		};
	};

	// Settings
	'settings:load': {
		request: void;
		response: Settings | null;
	};
	'settings:save': {
		request: { settings: Settings };
		response: void;
	};

	// Calculations
	'calculations:load': {
		request: void;
		response: Calculation[];
	};
	'calculations:save': {
		request: { calculations: Calculation[] };
		response: void;
	};

	// Taxes
	'taxes:load': {
		request: void;
		response: TaxPaidFlag[];
	};
	'taxes:save': {
		request: { taxes: TaxPaidFlag[] };
		response: void;
	};

	// Incomes
	'incomes:load': {
		request: void;
		response: Income[];
	};
	'incomes:save': {
		request: { incomes: Income[] };
		response: void;
	};

	// Extra Work
	'extra-work:load': {
		request: void;
		response: ExtraWork[];
	};
	'extra-work:save': {
		request: { extraWorks: ExtraWork[] };
		response: void;
	};

	// Files
	'avatar:select': {
		request: void;
		response: string | null;
	};
	'files:select': {
		request: void;
		response: string[] | null;
	};
	'files:getTaskDir': {
		request: { taskId: string };
		response: string | null;
	};
	'files:copy': {
		request: { sourcePath: string; destPath: string };
		response: boolean;
	};
	'files:getSize': {
		request: { filePath: string };
		response: number | null;
	};
	'files:open': {
		request: { filePath: string };
		response: void;
	};
	'files:download': {
		request: { sourcePath: string; defaultFileName?: string };
		response: { path: string };
	};
	'files:rename': {
		request: { filePath: string; newFileName: string };
		response: { path: string };
	};

	// Avatars
	'avatars:syncCustomers': {
		request: void;
		response: { updated: number; failed: number; errors: Array<{ entityId: string; entityName: string; username: string; error: string }> };
	};
	'avatars:syncContractors': {
		request: void;
		response: { updated: number; failed: number; errors: Array<{ entityId: string; entityName: string; username: string; error: string }> };
	};
	'avatars:syncAll': {
		request: void;
		response: {
			customers: { updated: number; failed: number; errors: Array<{ entityId: string; entityName: string; username: string; error: string }> };
			contractors: { updated: number; failed: number; errors: Array<{ entityId: string; entityName: string; username: string; error: string }> };
			totalUpdated: number;
			totalFailed: number;
			errors: Array<{ entityId: string; entityName: string; username: string; error: string }>;
			message?: string;
			stats?: {
				totalCustomers: number;
				customersWithTelegram: number;
				totalContractors: number;
				contractorsWithTelegram: number;
			};
		};
	};
	'avatars:getChatId': {
		request: void;
		response: { chatId: string };
	};

	// CSV
	'csv:select': {
		request: void;
		response: string | null;
	};
	'csv:read': {
		request: { filePath: string };
		response: string | null;
	};
	'csv:save': {
		request: { content: string; defaultFileName?: string };
		response: string | null;
	};

	// System
	'url:openExternal': {
		request: { url: string };
		response: void;
	};
	'database:open': {
		request: void;
		response: void;
	};
	'database:getPath': {
		request: void;
		response: string | null;
	};
	'notification:show': {
		request: { title: string; body: string };
		response: void;
	};

	// Updates
	'updates:check': {
		request: void;
		response: void;
	};
	'updates:install': {
		request: void;
		response: void;
	};
}

// Тип канала IPC
export type IpcChannel = keyof IpcContract;

// Тип запроса для канала
export type IpcRequest<K extends IpcChannel> = IpcContract[K]['request'];

// Тип ответа для канала
export type IpcResponse<K extends IpcChannel> = IpcContract[K]['response'];

// Типизированный результат IPC
export type IpcResultTyped<K extends IpcChannel> = IpcResult<IpcResponse<K>>;

// Типы для событий (не invoke, а on)
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

// Обновленный интерфейс IPC API с типизацией
export interface IpcApiTyped {
	// Типизированные вызовы
	invoke<K extends IpcChannel>(
		channel: K,
		payload: IpcRequest<K>
	): Promise<IpcResultTyped<K>>;

	// События
	onEvent<T extends AllowedEventChannel>(
		channel: T,
		callback: (payload: EventPayloadMap[T]) => void
	): () => void;
}

// Расширяем глобальный Window интерфейс
declare global {
	interface Window {
		crm?: IpcApiTyped;
	}
}
import type { Customer } from '@/types';
import type { Income } from '@/types';
import type { Goal, MonthlyFinancialGoal, Credit, CreditScheduleItem } from '@/store/goals';
import type { Settings } from '@/store/settings';
import type { Calculation } from '@/store/calculator';
import type { TaxPaidFlag } from '@/store/taxes';
import type { ExtraWork } from '@/pages/workload/types/extra-work.types';

// Базовый тип результата IPC
export type IpcResult<T> = 
	| { ok: true; data: T }
	| { ok: false; code: string; message: string; details?: unknown };

// Определение контракта для каждого IPC канала
export interface IpcContract {
	// Tasks
	'tasks:load': {
		request: void; // Нет параметров
		response: Task[];
	};
	'tasks:save': {
		request: { tasks: Task[] };
		response: void;
	};

	// Customers
	'customers:load': {
		request: void;
		response: Customer[];
	};
	'customers:save': {
		request: { customers: Customer[] };
		response: void;
	};

	// Contractors
	'contractors:load': {
		request: void;
		response: Contractor[];
	};
	'contractors:save': {
		request: { contractors: Contractor[] };
		response: void;
	};
	'contractors:deactivate': {
		request: { id: string };
		response: { tasksReturned: number };
	};
	'contractors:delete': {
		request: { id: string };
		response: void;
	};

	// Goals
	'goals:load': {
		request: void;
		response: {
			goals: Goal[];
			monthlyFinancialGoals: MonthlyFinancialGoal[];
			credits: Credit[];
		};
	};
	'goals:save': {
		request: {
			goals: Goal[];
			monthlyFinancialGoals: MonthlyFinancialGoal[];
			credits?: Credit[];
		};
		response: void;
	};

	// Settings
	'settings:load': {
		request: void;
		response: Settings | null;
	};
	'settings:save': {
		request: { settings: Settings };
		response: void;
	};

	// Calculations
	'calculations:load': {
		request: void;
		response: Calculation[];
	};
	'calculations:save': {
		request: { calculations: Calculation[] };
		response: void;
	};

	// Taxes
	'taxes:load': {
		request: void;
		response: TaxPaidFlag[];
	};
	'taxes:save': {
		request: { taxes: TaxPaidFlag[] };
		response: void;
	};

	// Incomes
	'incomes:load': {
		request: void;
		response: Income[];
	};
	'incomes:save': {
		request: { incomes: Income[] };
		response: void;
	};

	// Extra Work
	'extra-work:load': {
		request: void;
		response: ExtraWork[];
	};
	'extra-work:save': {
		request: { extraWorks: ExtraWork[] };
		response: void;
	};

	// Files
	'avatar:select': {
		request: void;
		response: string | null;
	};
	'files:select': {
		request: void;
		response: string[] | null;
	};
	'files:getTaskDir': {
		request: { taskId: string };
		response: string | null;
	};
	'files:copy': {
		request: { sourcePath: string; destPath: string };
		response: boolean;
	};
	'files:getSize': {
		request: { filePath: string };
		response: number | null;
	};
	'files:open': {
		request: { filePath: string };
		response: void;
	};
	'files:download': {
		request: { sourcePath: string; defaultFileName?: string };
		response: { path: string };
	};
	'files:rename': {
		request: { filePath: string; newFileName: string };
		response: { path: string };
	};

	// Avatars
	'avatars:syncCustomers': {
		request: void;
		response: { updated: number; failed: number; errors: Array<{ entityId: string; entityName: string; username: string; error: string }> };
	};
	'avatars:syncContractors': {
		request: void;
		response: { updated: number; failed: number; errors: Array<{ entityId: string; entityName: string; username: string; error: string }> };
	};
	'avatars:syncAll': {
		request: void;
		response: {
			customers: { updated: number; failed: number; errors: Array<{ entityId: string; entityName: string; username: string; error: string }> };
			contractors: { updated: number; failed: number; errors: Array<{ entityId: string; entityName: string; username: string; error: string }> };
			totalUpdated: number;
			totalFailed: number;
			errors: Array<{ entityId: string; entityName: string; username: string; error: string }>;
			message?: string;
			stats?: {
				totalCustomers: number;
				customersWithTelegram: number;
				totalContractors: number;
				contractorsWithTelegram: number;
			};
		};
	};
	'avatars:getChatId': {
		request: void;
		response: { chatId: string };
	};

	// CSV
	'csv:select': {
		request: void;
		response: string | null;
	};
	'csv:read': {
		request: { filePath: string };
		response: string | null;
	};
	'csv:save': {
		request: { content: string; defaultFileName?: string };
		response: string | null;
	};

	// System
	'url:openExternal': {
		request: { url: string };
		response: void;
	};
	'database:open': {
		request: void;
		response: void;
	};
	'database:getPath': {
		request: void;
		response: string | null;
	};
	'notification:show': {
		request: { title: string; body: string };
		response: void;
	};

	// Updates
	'updates:check': {
		request: void;
		response: void;
	};
	'updates:install': {
		request: void;
		response: void;
	};
}

// Тип канала IPC
export type IpcChannel = keyof IpcContract;

// Тип запроса для канала
export type IpcRequest<K extends IpcChannel> = IpcContract[K]['request'];

// Тип ответа для канала
export type IpcResponse<K extends IpcChannel> = IpcContract[K]['response'];

// Типизированный результат IPC
export type IpcResultTyped<K extends IpcChannel> = IpcResult<IpcResponse<K>>;

// Типы для событий (не invoke, а on)
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

// Обновленный интерфейс IPC API с типизацией
export interface IpcApiTyped {
	// Типизированные вызовы
	invoke<K extends IpcChannel>(
		channel: K,
		payload: IpcRequest<K>
	): Promise<IpcResultTyped<K>>;

	// События
	onEvent<T extends AllowedEventChannel>(
		channel: T,
		callback: (payload: EventPayloadMap[T]) => void
	): () => void;
}

// Расширяем глобальный Window интерфейс
declare global {
	interface Window {
		crm?: IpcApiTyped;
	}
}


