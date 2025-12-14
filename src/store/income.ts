import { create } from 'zustand';
import { saveIncomesToDisk, loadIncomesFromDisk } from '@/shared/lib/electron-bridge';
import { createLogger } from '@/shared/lib/logger';

const log = createLogger('Income');
import { triggerIncomeCreated, triggerIncomeUpdated, triggerIncomeDeleted } from '@/shared/lib/toast-triggers';
import { generateShortId } from '@/shared/utils/id';

export type Income = {
	id: string;
	title: string; // Название дохода (например, "Подработка на стройке", "Деньги от жены", "Подарок")
	amount: number; // Сумма дохода
	date: string; // ISO date - дата получения дохода
	taxRate?: number; // Процент налога (опционально)
	notes?: string; // Заметки
	createdAt?: string;
	updatedAt?: string;
};

type IncomeState = {
	incomes: Income[];
	addIncome: (title: string, amount: number, date: string, taxRate?: number, notes?: string) => void;
	updateIncome: (id: string, updates: Partial<Omit<Income, 'id'>>) => void;
	removeIncome: (id: string) => void;
	loadFromDisk: () => Promise<void>;
};

// autosave
let saveTimer: ReturnType<typeof setTimeout> | null = null;
let isLoading = false;
let hasLoadedOnce = false;

export const useIncomeStore = create<IncomeState>((set, get) => ({
	incomes: [],
	addIncome: (title, amount, date, taxRate, notes) => {
		const income: Income = {
			id: generateShortId(),
			title,
			amount,
			date,
			taxRate,
			notes,
			createdAt: new Date().toISOString(),
			updatedAt: new Date().toISOString(),
		};
		set((s) => {
			const newIncomes = [...s.incomes, income];
			setTimeout(() => triggerIncomeCreated(income), 0);
			return { incomes: newIncomes };
		});
	},
	updateIncome: (id, updates) => {
		const oldIncome = get().incomes.find((i) => i.id === id);
		set((s) => {
			return {
				incomes: s.incomes.map((i) =>
					i.id === id ? { ...i, ...updates, updatedAt: new Date().toISOString() } : i
				),
			};
		});
		const newIncome = get().incomes.find((i) => i.id === id);
		if (oldIncome && newIncome) {
			setTimeout(() => triggerIncomeUpdated(oldIncome, newIncome, updates), 0);
		}
	},
	removeIncome: (id) => {
		const income = get().incomes.find((i) => i.id === id);
		set((s) => {
			return { incomes: s.incomes.filter((i) => i.id !== id) };
		});
		if (income) {
			setTimeout(() => triggerIncomeDeleted(income), 0);
		}
	},
	loadFromDisk: async () => {
		// Всегда загружаем, если еще не загружали (hasLoadedOnce еще false)
		if (hasLoadedOnce) {
			return;
		}
		try {
			isLoading = true;
			const data = await loadIncomesFromDisk();
			if (Array.isArray(data)) {
				const valid = data.filter((i) => i && typeof i === 'object' && i.id && i.title && i.amount != null && i.date);
				set({ incomes: valid });
				hasLoadedOnce = true; // Отмечаем, что загрузка произошла
			} else {
				set({ incomes: [] }); // Устанавливаем пустой массив
				hasLoadedOnce = true; // Отмечаем загрузку даже если данных нет
			}
		} catch (error) {
			log.error('Failed to load incomes', error);
			hasLoadedOnce = true; // Отмечаем загрузку даже при ошибке
		} finally {
			isLoading = false;
		}
	},
}));

// Сбрасываем флаг при перезагрузке модуля (для разработки)
if (typeof window !== 'undefined' && (window as any).__CRM_RELOAD__) {
	hasLoadedOnce = false;
}
useIncomeStore.subscribe((state) => {
	if (isLoading) return; // Не сохраняем во время загрузки
	// Не сохраняем пустые данные, если еще не загружали (защита от потери данных при первой загрузке)
	if (!hasLoadedOnce && state.incomes.length === 0) return;
	if (saveTimer) clearTimeout(saveTimer);
	saveTimer = setTimeout(() => {
		// Сохраняем всегда, даже если массив пустой (для корректного удаления)
		saveIncomesToDisk(state.incomes).catch(() => {});
	}, 300);
});

