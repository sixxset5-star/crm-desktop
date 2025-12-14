import { create } from 'zustand';
import { saveExtraWorkToDisk, loadExtraWorkFromDisk } from '@/shared/lib/electron-bridge';
import type { ExtraWork, ExtraWorkPayment } from '@/pages/workload/types/extra-work.types';
import { calculateTotalAmount, normalizeAndValidateWorkDates, generateExtraWorkId } from '@/pages/workload/utils/extraWorkUtils';
import { useSettingsStore } from '@/store/settings';
import { createLogger } from '@/shared/lib/logger';

const log = createLogger('ExtraWork');

// Реэкспорт типов для обратной совместимости
export type { ExtraWork, ExtraWorkPayment } from '@/pages/workload/types/extra-work.types';

type ExtraWorkState = {
	extraWorks: ExtraWork[];
	addExtraWork: (workDates: string[], dailyRate: number, payments: ExtraWorkPayment[], notes?: string, weekendRate?: number) => ExtraWork;
	updateExtraWork: (id: string, updates: Partial<Omit<ExtraWork, 'id'>>) => void;
	removeExtraWork: (id: string) => void;
	loadFromDisk: () => Promise<void>;
};


// autosave
let saveTimer: ReturnType<typeof setTimeout> | null = null;
let isLoading = false;
let hasLoadedOnce = false;

export const useExtraWorkStore = create<ExtraWorkState>((set, get) => ({
	extraWorks: [],
	addExtraWork: (workDates, dailyRate, payments, notes, weekendRate) => {
		const normalizedDates = normalizeAndValidateWorkDates(workDates);
		const totalAmount = calculateTotalAmount(
			normalizedDates,
			dailyRate,
			weekendRate
		);
		const extraWork: ExtraWork = {
			id: generateExtraWorkId(),
			workDates: normalizedDates,
			dailyRate,
			// КРИТИЧНО: weekendRate всегда устанавливаем явно (даже если undefined)
			// Это гарантирует, что поле всегда присутствует в объекте для правильного сохранения в БД
			weekendRate,
			totalAmount,
			payments: payments || [],
			notes,
			createdAt: new Date().toISOString(),
			updatedAt: new Date().toISOString(),
		};
		set((s) => {
			return { extraWorks: [...s.extraWorks, extraWork] };
		});
		return extraWork;
	},
	updateExtraWork: (id, updates) => {
		set((s) => {
			const existing = s.extraWorks.find((w) => w.id === id);
			if (!existing) return s;

			// Пересчитываем totalAmount если изменились workDates, dailyRate или weekendRate
			const workDates = updates.workDates 
				? normalizeAndValidateWorkDates(updates.workDates)
				: existing.workDates;
			const dailyRate = updates.dailyRate ?? existing.dailyRate;
			const weekendRate = updates.weekendRate !== undefined ? updates.weekendRate : existing.weekendRate;
			const totalAmount = calculateTotalAmount(
				workDates,
				dailyRate,
				weekendRate
			);

			return {
				extraWorks: s.extraWorks.map((work) => {
					if (work.id !== id) return work;
					
					// Определяем weekendRate: если явно передан в updates, используем его, иначе сохраняем старое
					// КРИТИЧНО: Если weekendRate не передан в updates, сохраняем значение из existing
					// existing.weekendRate может быть undefined (если поле было удалено ранее), это нормально
					const finalWeekendRate = 'weekendRate' in updates 
						? updates.weekendRate 
						: existing.weekendRate;
					
					// Удаляем weekendRate из updates, чтобы не перезаписать наше явное значение
					const { weekendRate: _, ...updatesWithoutWeekendRate } = updates;
					
					// Формируем обновленный объект
					// КРИТИЧНО: Сначала копируем work, потом применяем updates, потом ЯВНО устанавливаем weekendRate
					// Это гарантирует, что weekendRate всегда присутствует в объекте и не перезаписывается
					const updatedWork: ExtraWork = {
						...work,
						...updatesWithoutWeekendRate,
						totalAmount,
						workDates,
						updatedAt: new Date().toISOString(),
					};
					
					// КРИТИЧНО: weekendRate ВСЕГДА устанавливаем явно ПОСЛЕ всех spread операций
					// Это гарантирует, что поле всегда присутствует в объекте, даже если undefined
					// При сохранении в БД undefined преобразуется в null
					updatedWork.weekendRate = finalWeekendRate;
					
					log.debug('updateExtraWork', {
						id,
						existingWeekendRate: existing.weekendRate,
						updatesWeekendRate: 'weekendRate' in updates ? updates.weekendRate : 'NOT_IN_UPDATES',
						finalWeekendRate,
						updatedWorkWeekendRate: updatedWork.weekendRate,
					});
					
					return updatedWork;
				}),
			};
		});
	},
	removeExtraWork: (id: string) => {
		set((s) => {
			return { extraWorks: s.extraWorks.filter((w) => w.id !== id) };
		});
	},
	loadFromDisk: async () => {
		if (hasLoadedOnce) {
			return;
		}
		try {
			isLoading = true;
			const data = await loadExtraWorkFromDisk();
			if (Array.isArray(data)) {
				const valid = data.filter(
					(w) =>
						w &&
						typeof w === 'object' &&
						w.id &&
						Array.isArray(w.workDates) &&
						w.dailyRate != null &&
						w.totalAmount != null
				);
				// Убеждаемся что даты отсортированы и weekendRate правильно инициализирован
				valid.forEach((w) => {
					if (w.workDates) {
						w.workDates.sort();
					}
					// КРИТИЧНО: Гарантируем, что weekendRate всегда присутствует в объекте
					// Если поле отсутствует в загруженных данных (старые данные без weekendRate),
					// явно устанавливаем undefined
					// Это нужно для правильной работы с типом ExtraWork и гарантирует сохранение поля
					const hadWeekendRate = 'weekendRate' in w;
					if (!hadWeekendRate) {
						w.weekendRate = undefined;
					}
					log.debug('loadFromDisk: work loaded', {
						id: w.id,
						weekendRate: w.weekendRate,
						hadWeekendRate,
					});
				});
				set({ extraWorks: valid });
				hasLoadedOnce = true;
			} else {
				set({ extraWorks: [] });
				hasLoadedOnce = true;
			}
		} catch (error) {
			log.error('Failed to load extra work', error);
			hasLoadedOnce = true;
		} finally {
			isLoading = false;
		}
	},
}));

// Сбрасываем флаг при перезагрузке модуля (для разработки)
if (typeof window !== 'undefined' && (window as any).__CRM_RELOAD__) {
	hasLoadedOnce = false;
}

useExtraWorkStore.subscribe((state) => {
	if (isLoading) return;
	if (!hasLoadedOnce && state.extraWorks.length === 0) return;
	if (saveTimer) clearTimeout(saveTimer);
	saveTimer = setTimeout(() => {
		// Логируем weekendRate перед сохранением для отладки
		state.extraWorks.forEach(work => {
			log.debug('Before save', {
				id: work.id,
				weekendRate: work.weekendRate,
				weekendRateType: typeof work.weekendRate,
				hasWeekendRate: 'weekendRate' in work,
			});
		});
		saveExtraWorkToDisk(state.extraWorks).catch(() => {});
	}, 300);
});

