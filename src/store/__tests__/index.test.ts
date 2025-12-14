/**
 * Тесты для функции loadAllStores
 * 
 * Проверяет, что все store загружаются корректно и параллельно
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { loadAllStores } from '../index';

// Моки для всех store
const mockLoadFromDisk = vi.fn(() => Promise.resolve());

vi.mock('../board', () => ({
	useBoardStore: {
		getState: () => ({
			loadFromDisk: mockLoadFromDisk,
		}),
	},
}));

vi.mock('../goals', () => ({
	useGoalsStore: {
		getState: () => ({
			loadFromDisk: mockLoadFromDisk,
		}),
	},
}));

vi.mock('../settings', () => ({
	useSettingsStore: {
		getState: () => ({
			loadFromDisk: mockLoadFromDisk,
		}),
	},
}));

vi.mock('../calculator', () => ({
	useCalculatorStore: {
		getState: () => ({
			loadFromDisk: mockLoadFromDisk,
		}),
	},
}));

vi.mock('../taxes', () => ({
	useTaxesStore: {
		getState: () => ({
			loadFromDisk: mockLoadFromDisk,
		}),
	},
}));

vi.mock('../customers', () => ({
	useCustomersStore: {
		getState: () => ({
			loadFromDisk: mockLoadFromDisk,
		}),
	},
}));

vi.mock('../income', () => ({
	useIncomeStore: {
		getState: () => ({
			loadFromDisk: mockLoadFromDisk,
		}),
	},
}));

describe('loadAllStores', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		// Сбрасываем мок, чтобы он возвращал успешный промис
		mockLoadFromDisk.mockResolvedValue(undefined);
	});

	it('должен загружать все store', async () => {
		await loadAllStores();

		// Проверяем, что loadFromDisk был вызван 7 раз (для всех store)
		expect(mockLoadFromDisk).toHaveBeenCalledTimes(7);
	});

	it('должен загружать все store параллельно', async () => {
		// Создаем промисы, которые резолвятся с задержкой
		let resolveCount = 0;
		const resolves: Array<() => void> = [];

		mockLoadFromDisk.mockImplementation(() => {
			return new Promise<void>((resolve) => {
				resolves.push(() => {
					resolveCount++;
					resolve(undefined);
				});
			});
		});

		// Запускаем загрузку
		const loadPromise = loadAllStores();

		// Проверяем, что все промисы созданы (все store начали загрузку)
		expect(resolves.length).toBe(7);

		// Резолвим все промисы одновременно
		resolves.forEach((resolve) => resolve());

		await loadPromise;

		// Проверяем, что все загрузились
		expect(resolveCount).toBe(7);
		expect(mockLoadFromDisk).toHaveBeenCalledTimes(7);
	});

	it('должен обрабатывать ошибки при загрузке', async () => {
		const error = new Error('Failed to load store');
		mockLoadFromDisk.mockRejectedValueOnce(error);

		await expect(loadAllStores()).rejects.toThrow('Failed to load store');
	});

	it('должен логировать ошибки в консоль', async () => {
		const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
		const error = new Error('Test error');
		mockLoadFromDisk.mockRejectedValueOnce(error);

		try {
			await loadAllStores();
		} catch (e) {
			// Ожидаем ошибку
		}

		expect(consoleSpy).toHaveBeenCalledWith('Error loading stores:', error);
		consoleSpy.mockRestore();
	});

	it('должен загружать все необходимые store', async () => {
		await loadAllStores();

		// Проверяем, что загружаются все 7 store:
		// board, goals, settings, calculator, taxes, customers, income
		expect(mockLoadFromDisk).toHaveBeenCalledTimes(7);
	});

	it('должен корректно обрабатывать успешную загрузку всех store', async () => {
		// Убеждаемся, что все промисы резолвятся успешно
		mockLoadFromDisk.mockResolvedValue(undefined);

		await expect(loadAllStores()).resolves.toBeUndefined();
		expect(mockLoadFromDisk).toHaveBeenCalledTimes(7);
	});
});


