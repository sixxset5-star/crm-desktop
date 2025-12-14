import { create } from 'zustand';
import { loadCalculations, saveCalculations } from '@/shared/lib/data-source';
import { createLogger } from '@/shared/lib/logger';
import { generateShortId } from '@/shared/utils/id';

const log = createLogger('Calculator');

export type ReferenceProject = {
	id: string;
	name: string;
	totalAmount: number;
	blocks: number;
	note: string;
};

export type Calculation = {
	id: string;
	name?: string; // Название расчета (опционально)
	references: ReferenceProject[];
	newProject: {
		blocks: number;
		hasPhotos: boolean;
		needsLayout: boolean;
		isUrgent: boolean;
		hasStyle: boolean; // Стиль уже есть
		hasNonStandardFunctionality: boolean; // Нестандартный функционал (только если needsLayout)
	};
	rounding: 1000 | 5000 | 10000 | null;
	manualCoefficients: {
		photoMultiplier: number | null;
		urgentMultiplier: number | null;
		layoutMultiplier: number | null;
		styleMultiplier: number | null;
		nonStandardMultiplier: number | null;
		scaleMultiplier: number | null;
	};
	results: {
		averagePricePerBlock: number;
		basePrice: number;
		priceAfterModifiers: number;
		finalPrice: number;
		roundedPrice: number;
	};
	createdAt: string;
};

type CalculatorState = {
	calculations: Calculation[];
	addCalculation: (calculation: Omit<Calculation, 'id' | 'createdAt'>) => void;
	removeCalculation: (id: string) => void;
	loadFromDisk: () => Promise<void>;
};

export const useCalculatorStore = create<CalculatorState>((set, get) => ({
	calculations: [],
	addCalculation: (calculation) => {
		const newCalc: Calculation = {
			...calculation,
			id: `${Date.now()}-${generateShortId()}`,
			createdAt: new Date().toISOString(),
		};
		const updated = [newCalc, ...get().calculations];
		set({ calculations: updated });
		void saveCalculationsToDisk(updated);
	},
	removeCalculation: (id) => {
		const updated = get().calculations.filter((c) => c.id !== id);
		set({ calculations: updated });
		void saveCalculationsToDisk(updated);
	},
	loadFromDisk: async () => {
		try {
			const loaded = await loadCalculations();
			if (Array.isArray(loaded)) {
				set({ calculations: loaded });
			}
		} catch (error) {
			log.error('Failed to load calculations', error);
		}
	},
}));

// Автосохранение при изменении
let saveTimer: ReturnType<typeof setTimeout> | null = null;
useCalculatorStore.subscribe((state) => {
	if (saveTimer) clearTimeout(saveTimer);
	saveTimer = setTimeout(() => {
		saveCalculations(state.calculations).catch(() => {});
	}, 300);
});

