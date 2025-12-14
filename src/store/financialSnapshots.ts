import { create } from 'zustand';

export type MonthlyGoalSnapshot = {
	monthKey: string;
	totalGoal: number;
	completedTotal: number;
	remainingTotal: number;
	createdAt: string;
};

type FinancialSnapshotsState = {
	snapshots: Record<string, MonthlyGoalSnapshot>;
	upsertSnapshot: (monthKey: string, payload: Omit<MonthlyGoalSnapshot, 'monthKey' | 'createdAt'> & { createdAt?: string }) => void;
	clearSnapshot: (monthKey: string) => void;
};

const STORAGE_KEY = 'crm.financialSnapshots';

const readInitialState = (): Record<string, MonthlyGoalSnapshot> => {
	if (typeof window === 'undefined') {
		return {};
	}
	try {
		const raw = window.localStorage.getItem(STORAGE_KEY);
		if (!raw) {
			return {};
		}
		const parsed = JSON.parse(raw);
		if (!parsed || typeof parsed !== 'object') {
			return {};
		}
		return parsed;
	} catch {
		return {};
	}
};

const persist = (value: Record<string, MonthlyGoalSnapshot>): void => {
	if (typeof window === 'undefined') {
		return;
	}
	try {
		window.localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
	} catch {
		// ignore persistence errors
	}
};

export const useFinancialSnapshotsStore = create<FinancialSnapshotsState>((set, get) => ({
	snapshots: readInitialState(),
	upsertSnapshot: (monthKey, payload) => {
		const next = {
			...get().snapshots,
			[monthKey]: {
				monthKey,
				totalGoal: payload.totalGoal,
				completedTotal: payload.completedTotal,
				remainingTotal: payload.remainingTotal,
				createdAt: payload.createdAt ?? new Date().toISOString(),
			},
		};
		persist(next);
		set({ snapshots: next });
	},
	clearSnapshot: (monthKey) => {
		const current = { ...get().snapshots };
		delete current[monthKey];
		persist(current);
		set({ snapshots: current });
	},
}));




















