import { create } from 'zustand';
import { loadTaxesFromDisk, saveTaxesToDisk } from '@/shared/lib/electron-bridge';
import { createLogger } from '@/shared/lib/logger';

const log = createLogger('Taxes');

// Мы сохраняем только флаги "оплачен" для вычисляемых налогов.
// Ключ формируем на основе задачи и платежа.
export type TaxPaidFlag = {
	key: string; // `${taskId}:${paymentIndex}`
	paid: boolean;
};

type TaxesState = {
	paidFlags: TaxPaidFlag[];
	isPaid: (key: string) => boolean;
	setPaid: (key: string, paid: boolean) => void;
	togglePaid: (key: string) => void;
	loadFromDisk: () => Promise<void>;
};

export const useTaxesStore = create<TaxesState>((set, get) => ({
	paidFlags: [],
	isPaid: (key) => get().paidFlags.some((f) => f.key === key && f.paid),
	setPaid: (key, paid) => {
		const flags = get().paidFlags;
		const idx = flags.findIndex((f) => f.key === key);
		let updated: TaxPaidFlag[];
		if (idx >= 0) {
			updated = [...flags];
			updated[idx] = { key, paid };
		} else {
			updated = [...flags, { key, paid }];
		}
		set({ paidFlags: updated });
		void saveTaxesToDisk(updated);
	},
	togglePaid: (key) => {
		const current = get().isPaid(key);
		get().setPaid(key, !current);
	},
	loadFromDisk: async () => {
		try {
			const loaded = await loadTaxesFromDisk();
			if (Array.isArray(loaded)) {
				// Ожидаем массив вида { key, paid }
				const normalized: TaxPaidFlag[] = loaded
					.filter((x): x is Record<string, unknown> => x && typeof x === 'object' && 'key' in x)
					.map((x) => ({ key: String(x.key), paid: Boolean(x.paid) }));
				set({ paidFlags: normalized });
			}
		} catch (error) {
			log.error('Failed to load taxes', error);
		}
	},
}));

// Автосохранение при изменении с небольшим троттлингом
let saveTimer: ReturnType<typeof setTimeout> | null = null;
useTaxesStore.subscribe((state) => {
	if (saveTimer) clearTimeout(saveTimer);
	saveTimer = setTimeout(() => {
		saveTaxesToDisk(state.paidFlags).catch(() => {});
	}, 300);
});


