import { create } from 'zustand';
import { saveContractors, loadContractors, deactivateContractor, deleteContractor } from '@/shared/lib/data-source';
import type { Contractor } from '@/types';
import { createLogger } from '@/shared/lib/logger';
import { generateShortId } from '@/shared/utils/id';

const log = createLogger('ContractorsStore');

type ContractorState = {
	contractors: Contractor[];
	loading: boolean;
	addContractor: (contractor: Omit<Contractor, 'id'>) => Contractor;
	updateContractor: (id: string, updates: Partial<Omit<Contractor, 'id'>>) => void;
	deactivateContractor: (id: string) => Promise<number>;
	deleteContractor: (id: string) => Promise<void>;
	loadFromDisk: () => Promise<void>;
};

export const useContractorsStore = create<ContractorState>((set, get) => ({
	contractors: [],
	loading: false,
	addContractor: (contractorData) => {
		const now = new Date().toISOString();
		const c: Contractor = { 
			id: generateShortId(), 
			...contractorData,
			isActive: contractorData.isActive !== false, // По умолчанию активен
			createdAt: now,
			updatedAt: now
		};
		let updatedContractors: Contractor[] = [];
		set((s) => {
			updatedContractors = [...s.contractors, c];
			return { contractors: updatedContractors };
		});
		// Сохраняем сразу с обновленным массивом
		log.debug('Adding contractor, saving to disk', { 
			contractorsCount: updatedContractors.length, 
			contractor: c 
		});
		saveContractors(updatedContractors).catch((error) => {
			log.error('Failed to save contractors after add', error);
		});
		return c;
	},
	updateContractor: (id, updates) => {
		log.debug('Updating contractor', { id, updates });
		const now = new Date().toISOString();
		let updatedContractors: Contractor[] = [];
		set((s) => {
			updatedContractors = s.contractors.map((c) => {
				if (c.id === id) {
					const updated = { ...c, ...updates, updatedAt: now };
					log.debug('Contractor updated', {
						id: updated.id,
						name: updated.name,
						isActive: updated.isActive,
						updates: updates
					});
					return updated;
				}
				return c;
			});
			log.debug('All contractors after update', updatedContractors.map(c => ({ id: c.id, name: c.name, isActive: c.isActive })));
			return { contractors: updatedContractors };
		});
		log.debug('Saving contractors to disk', { contractorsCount: updatedContractors.length });
		// Сохраняем сразу с обновленным массивом
		saveContractors(updatedContractors)
			.then(() => {
				log.debug('Contractors saved successfully after update');
			})
			.catch((error) => {
				log.error('Failed to save contractors after update', error);
			});
	},
	deactivateContractor: async (id) => {
		const contractor = get().contractors.find((c) => c.id === id);
		if (!contractor) {
			log.error('Contractor not found', { id });
			return 0;
		}
		
		// Вызываем функцию для деактивации (работает и в Electron, и в браузере)
		const tasksReturned = await deactivateContractor(id);
		
		// Обновляем локальное состояние
		set((s) => ({ 
			contractors: s.contractors.map((c) => 
				c.id === id ? { ...c, isActive: false } : c
			) 
		}));
		
		// Сохраняем обновленное состояние
		const updatedContractors = get().contractors;
		void saveContractors(updatedContractors);
		
		return tasksReturned;
	},
	deleteContractor: async (id) => {
		const contractor = get().contractors.find((c) => c.id === id);
		if (!contractor) {
			log.error('Contractor not found', { id });
			return;
		}
		
		// Вызываем IPC для удаления (проверка на задачи происходит на бэкенде)
		await deleteContractor(id);
		
		// Удаляем из локального состояния
		set((s) => ({ 
			contractors: s.contractors.filter((c) => c.id !== id)
		}));
		
		// Сохраняем обновленное состояние
		const updatedContractors = get().contractors;
		void saveContractors(updatedContractors);
	},
	loadFromDisk: async () => {
		// Всегда загружаем при вызове
		// Сбрасываем hasLoadedOnce чтобы гарантировать загрузку
		const wasLoaded = hasLoadedOnce;
		try {
			isLoading = true;
			set({ loading: true });
			const list = await loadContractors();
			
			log.debug('Loaded contractors from disk', { count: list.length });
			set({ contractors: list, loading: false }); // Устанавливаем даже если пустой массив
			hasLoadedOnce = true; // Отмечаем, что загрузка произошла
		} catch (error) {
			log.error('Failed to load contractors', error);
			hasLoadedOnce = true; // Отмечаем загрузку даже при ошибке
			set({ loading: false });
		} finally {
			isLoading = false;
		}
	},
}));

// autosave
let saveTimer: ReturnType<typeof setTimeout> | null = null;
let isLoading = false;
let hasLoadedOnce = false;
// Сбрасываем флаг при перезагрузке модуля (для разработки)
if (typeof window !== 'undefined' && (window as any).__CRM_RELOAD__) {
	hasLoadedOnce = false;
}
// Сбрасываем флаг при обновлении страницы (чтобы всегда загружалось)
if (typeof window !== 'undefined') {
	window.addEventListener('beforeunload', () => {
		hasLoadedOnce = false;
	});
}
useContractorsStore.subscribe((state) => {
	if (isLoading) return; // Не сохраняем во время загрузки
	// Не сохраняем пустые данные, если еще не загружали (защита от потери данных при первой загрузке)
	if (!hasLoadedOnce && state.contractors.length === 0) return;
	if (saveTimer) clearTimeout(saveTimer);
	// Увеличиваем задержку, чтобы дать время прямому сохранению через updateContractor/addContractor
	saveTimer = setTimeout(() => {
		log.debug('Autosave triggered', { contractorsCount: state.contractors.length });
		saveContractors(state.contractors).catch((error) => {
			log.error('Autosave failed', error);
		});
	}, 1000); // Увеличена задержка с 300ms до 1000ms
});
