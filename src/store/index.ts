export * from './board';
export * from './calculator';
export * from './credits';
export * from './customers';
export * from './goals';
export * from './history';
export * from './income';
export * from './settings';
export * from './taxes';
export * from './ui';

import { useBoardStore } from './board';
import { useGoalsStore } from './goals';
import { useSettingsStore } from './settings';
import { useCalculatorStore } from './calculator';
import { useTaxesStore } from './taxes';
import { useCustomersStore } from './customers';
import { useIncomeStore } from './income';
import { useCreditsStore } from './credits';
import { createLogger } from '@/shared/lib/logger';

const log = createLogger('Store');

// ФИКС: Дедупликация загрузки для защиты от React.StrictMode двойного mount
let loadAllStoresInFlight: Promise<void> | null = null;

/**
 * Загружает все store из диска последовательно.
 * Используется для инициализации приложения.
 * 
 * ФИКС: 
 * - Убран Promise.all для избежания гонки IPC-запросов
 * - Добавлена дедупликация для защиты от React.StrictMode двойного mount
 * - Кредиты загружаются последними с force=true для гарантированной загрузки
 */
export async function loadAllStores(): Promise<void> {
	// Если уже идет загрузка - возвращаем тот же промис
	if (loadAllStoresInFlight) {
		return loadAllStoresInFlight;
	}

	loadAllStoresInFlight = (async () => {
		try {
			// Последовательная загрузка вместо Promise.all
			// Это предотвращает гонку IPC-запросов при StrictMode двойном mount
			await useBoardStore.getState().loadFromDisk();
			await useGoalsStore.getState().loadFromDisk();
			await useSettingsStore.getState().loadFromDisk();
			await useCalculatorStore.getState().loadFromDisk();
			await useTaxesStore.getState().loadFromDisk();
			await useCustomersStore.getState().loadFromDisk();
			await useIncomeStore.getState().loadFromDisk();

			// КРЕДИТЫ — последними (и можно force)
			// Это гарантирует, что IPC полностью готов к моменту загрузки кредитов
			await useCreditsStore.getState().loadCredits(true);
		} catch (error) {
			log.error('Error loading stores', error);
			throw error;
		}
	})().finally(() => {
		// Очищаем флаг после завершения (успешного или с ошибкой)
		loadAllStoresInFlight = null;
	});

	return loadAllStoresInFlight;
}











