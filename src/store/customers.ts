import { create } from 'zustand';
import { saveCustomersToDisk, loadCustomersFromDisk } from '@/shared/lib/electron-bridge';
import { createLogger } from '@/shared/lib/logger';

const log = createLogger('Customers');
import { triggerCustomerCreated, triggerCustomerUpdated, triggerCustomerDeleted } from '@/shared/lib/toast-triggers';
import { migrateCustomers } from '@/shared/lib/customer-migration';
import type { Customer } from '@/types';
import { generateShortId } from '@/shared/utils/id';

type CustomerState = {
	customers: Customer[];
	loading: boolean;
	addCustomer: (name: string, contact?: string, avatar?: string) => Customer;
	updateCustomer: (id: string, updates: Partial<Omit<Customer, 'id'>>) => void;
	removeCustomer: (id: string) => void;
	loadFromDisk: () => Promise<void>;
};

export const useCustomersStore = create<CustomerState>((set, get) => ({
	customers: [],
	loading: false,
	addCustomer: (name, contact, avatar) => {
		const c: Customer = { id: generateShortId(), name, contact, avatar };
		set((s) => ({ customers: [...s.customers, c] }));
		void saveCustomersToDisk(get().customers);
		setTimeout(() => triggerCustomerCreated(c), 0);
		return c;
	},
	updateCustomer: (id, updates) => {
		log.debug('Updating customer', { id, updates });
		const oldCustomer = get().customers.find((c) => c.id === id);
		set((s) => {
			const updated = s.customers.map((c) => (c.id === id ? { ...c, ...updates } : c));
			log.debug('Updated customers', updated);
			return { customers: updated };
		});
		const updatedCustomers = get().customers;
		const newCustomer = updatedCustomers.find((c) => c.id === id);
		log.debug('Saving customers to disk', updatedCustomers);
		void saveCustomersToDisk(updatedCustomers);
		
		if (oldCustomer && newCustomer) {
			setTimeout(() => triggerCustomerUpdated(oldCustomer, newCustomer, updates), 0);
		}
	},
	removeCustomer: (id) => {
		const customer = get().customers.find((c) => c.id === id);
		set((s) => ({ customers: s.customers.filter((c) => c.id !== id) }));
		void saveCustomersToDisk(get().customers);
		if (customer) {
			setTimeout(() => triggerCustomerDeleted(customer), 0);
		}
	},
	loadFromDisk: async () => {
		// Всегда загружаем, если еще не загружали (hasLoadedOnce еще false)
		if (hasLoadedOnce) {
			return;
		}
		try {
			isLoading = true;
			set({ loading: true });
			const list = await loadCustomersFromDisk();
			
			// Миграция и валидация через утилиту
			const migrated = migrateCustomers(list);
			
			set({ customers: migrated, loading: false }); // Устанавливаем даже если пустой массив
			hasLoadedOnce = true; // Отмечаем, что загрузка произошла
		} catch (error) {
			log.error('Failed to load customers', error);
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
useCustomersStore.subscribe((state) => {
	if (isLoading) return; // Не сохраняем во время загрузки
	// Не сохраняем пустые данные, если еще не загружали (защита от потери данных при первой загрузке)
	if (!hasLoadedOnce && state.customers.length === 0) return;
	if (saveTimer) clearTimeout(saveTimer);
	saveTimer = setTimeout(() => {
		saveCustomersToDisk(state.customers).catch(() => {});
	}, 300);
});


