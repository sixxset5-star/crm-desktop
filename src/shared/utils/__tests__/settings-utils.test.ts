/**
 * Тесты для утилит настроек
 */

import { describe, it, expect } from 'vitest';
import {
	isCriticalField,
	hasCriticalFields,
	getCriticalFields,
	mergeSettings,
	preserveCriticalFields,
	mergeWithDefaults,
} from '../settings-utils';
import type { Settings } from '@/store/settings';

describe('settings-utils', () => {
	describe('isCriticalField', () => {
		it('должен определять критические поля', () => {
			expect(isCriticalField('holidays')).toBe(true);
			expect(isCriticalField('customWeekends')).toBe(true);
			expect(isCriticalField('excludedWeekends')).toBe(true);
			expect(isCriticalField('weekendTasks')).toBe(true);
		});

		it('должен возвращать false для некритических полей', () => {
			expect(isCriticalField('currency')).toBe(false);
			expect(isCriticalField('dateFormat')).toBe(false);
			expect(isCriticalField('priorityColors')).toBe(false);
			expect(isCriticalField('unknownField')).toBe(false);
		});
	});

	describe('hasCriticalFields', () => {
		it('должен определять наличие критических полей в обновлениях', () => {
			expect(hasCriticalFields({ holidays: [] })).toBe(true);
			expect(hasCriticalFields({ customWeekends: [] })).toBe(true);
			expect(hasCriticalFields({ excludedWeekends: [] })).toBe(true);
			expect(hasCriticalFields({ weekendTasks: {} })).toBe(true);
		});

		it('должен возвращать false если критических полей нет', () => {
			expect(hasCriticalFields({ currency: 'USD' })).toBe(false);
			expect(hasCriticalFields({ dateFormat: 'en-US' })).toBe(false);
			expect(hasCriticalFields({})).toBe(false);
		});

		it('должен определять наличие критических полей в смешанных обновлениях', () => {
			expect(hasCriticalFields({ currency: 'USD', holidays: [] })).toBe(true);
			expect(hasCriticalFields({ holidays: [], customWeekends: [] })).toBe(true);
		});
	});

	describe('getCriticalFields', () => {
		it('должен извлекать критические поля из настроек', () => {
			const settings: Settings = {
				currency: 'RUB',
				dateFormat: 'ru-RU',
				incomeLogic: 'done',
				holidays: [{ id: '1', date: '2024-01-01', name: 'Новый год' }],
				customWeekends: ['2024-01-02'],
				excludedWeekends: ['2024-01-03'],
				weekendTasks: { '2024-01-04': ['task1'] },
			};

			const critical = getCriticalFields(settings);

			expect(critical.holidays).toEqual(settings.holidays);
			expect(critical.customWeekends).toEqual(settings.customWeekends);
			expect(critical.excludedWeekends).toEqual(settings.excludedWeekends);
			expect(critical.weekendTasks).toEqual(settings.weekendTasks);
		});

		it('должен возвращать undefined для отсутствующих критических полей', () => {
			const settings: Settings = {
				currency: 'RUB',
				dateFormat: 'ru-RU',
				incomeLogic: 'done',
			};

			const critical = getCriticalFields(settings);

			expect(critical.holidays).toBeUndefined();
			expect(critical.customWeekends).toBeUndefined();
			expect(critical.excludedWeekends).toBeUndefined();
			expect(critical.weekendTasks).toBeUndefined();
		});
	});

	describe('mergeSettings', () => {
		const baseSettings: Settings = {
			currency: 'RUB',
			dateFormat: 'ru-RU',
			incomeLogic: 'done',
			holidays: [{ id: '1', date: '2024-01-01', name: 'Новый год' }],
			priorityColors: {
				high: 'var(--red)',
				medium: 'var(--warning)',
				low: 'var(--muted)',
			},
		};

		it('должен обновлять обычные поля', () => {
			const updates = { currency: 'USD', dateFormat: 'en-US' };
			const merged = mergeSettings(baseSettings, updates);

			expect(merged.currency).toBe('USD');
			expect(merged.dateFormat).toBe('en-US');
			expect(merged.incomeLogic).toBe('done'); // Не изменилось
		});

		it('должен полностью заменять критические поля', () => {
			const updates = {
				holidays: [{ id: '2', date: '2024-05-01', name: 'День труда' }],
				customWeekends: ['2024-06-01'],
			};
			const merged = mergeSettings(baseSettings, updates);

			expect(merged.holidays).toEqual(updates.holidays);
			expect(merged.customWeekends).toEqual(updates.customWeekends);
		});

		it('должен позволять очищать критические поля', () => {
			const updates = { holidays: [] };
			const merged = mergeSettings(baseSettings, updates);

			expect(merged.holidays).toEqual([]);
		});

		it('должен делать глубокое слияние для priorityColors', () => {
			const updates: Partial<Settings> = { 
				priorityColors: { 
					high: 'var(--new-red)',
					medium: baseSettings.priorityColors?.medium || 'var(--warning)',
					low: baseSettings.priorityColors?.low || 'var(--muted)',
				} 
			};
			const merged = mergeSettings(baseSettings, updates);

			expect(merged.priorityColors?.high).toBe('var(--new-red)');
			expect(merged.priorityColors?.medium).toBe('var(--warning)'); // Сохранилось
			expect(merged.priorityColors?.low).toBe('var(--muted)'); // Сохранилось
		});

		it('должен пропускать undefined значения для обычных полей', () => {
			const updates: Partial<Settings> = { currency: undefined };
			const merged = mergeSettings(baseSettings, updates);

			expect(merged.currency).toBe('RUB'); // Не изменилось
		});

		it('должен обрабатывать пустые обновления', () => {
			const merged = mergeSettings(baseSettings, {});

			expect(merged).toEqual(baseSettings);
		});
	});

	describe('preserveCriticalFields', () => {
		const currentSettings: Settings = {
			currency: 'RUB',
			dateFormat: 'ru-RU',
			incomeLogic: 'done',
			holidays: [{ id: '1', date: '2024-01-01', name: 'Новый год' }],
			customWeekends: ['2024-01-02'],
			excludedWeekends: ['2024-01-03'],
			weekendTasks: { '2024-01-04': ['task1'] },
		};

		it('должен сохранять критические поля из текущего состояния, если они не обновляются', () => {
			const merged: Settings = {
				...currentSettings,
				currency: 'USD', // Обновлено
				holidays: undefined, // Потерялось при мердже
			};

			const updates = { currency: 'USD' };
			const preserved = preserveCriticalFields(currentSettings, updates, merged);

			// Критические поля должны быть восстановлены
			expect(preserved.holidays).toEqual(currentSettings.holidays);
			expect(preserved.customWeekends).toEqual(currentSettings.customWeekends);
			expect(preserved.excludedWeekends).toEqual(currentSettings.excludedWeekends);
			expect(preserved.weekendTasks).toEqual(currentSettings.weekendTasks);
		});

		it('должен сохранять обновленные критические поля', () => {
			const newHolidays = [{ id: '2', date: '2024-05-01', name: 'День труда' }];
			const merged: Settings = {
				...currentSettings,
				holidays: newHolidays,
			};

			const updates = { holidays: newHolidays };
			const preserved = preserveCriticalFields(currentSettings, updates, merged);

			// Обновленное поле должно остаться
			expect(preserved.holidays).toEqual(newHolidays);
			// Остальные критические поля сохраняются из current
			expect(preserved.customWeekends).toEqual(currentSettings.customWeekends);
		});

		it('должен сохранять все критические поля если ни одно не обновляется', () => {
			const merged: Settings = {
				...currentSettings,
				currency: 'USD',
				holidays: undefined, // Потерялось
			};

			const updates = { currency: 'USD' };
			const preserved = preserveCriticalFields(currentSettings, updates, merged);

			expect(preserved.holidays).toEqual(currentSettings.holidays);
			expect(preserved.customWeekends).toEqual(currentSettings.customWeekends);
			expect(preserved.excludedWeekends).toEqual(currentSettings.excludedWeekends);
			expect(preserved.weekendTasks).toEqual(currentSettings.weekendTasks);
		});
	});

	describe('mergeWithDefaults', () => {
		const defaults: Settings = {
			currency: 'RUB',
			dateFormat: 'ru-RU',
			incomeLogic: 'done',
			holidays: undefined,
			customWeekends: undefined,
		};

		it('должен объединять загруженные настройки с дефолтными', () => {
			const loaded = {
				currency: 'USD',
				holidays: [{ id: '1', date: '2024-01-01', name: 'Новый год' }],
			};

			const merged = mergeWithDefaults(defaults, loaded);

			expect(merged.currency).toBe('USD'); // Из loaded
			expect(merged.dateFormat).toBe('ru-RU'); // Из defaults
			expect(merged.holidays).toEqual(loaded.holidays); // Из loaded
		});

		it('должен сохранять критические поля из загруженных данных даже если они undefined', () => {
			const loaded = {
				currency: 'USD',
				holidays: undefined,
				customWeekends: [],
			};

			const merged = mergeWithDefaults(defaults, loaded);

			expect(merged.holidays).toBeUndefined(); // Явно undefined из loaded
			expect(merged.customWeekends).toEqual([]); // Пустой массив из loaded
		});

		it('должен использовать дефолты для полей отсутствующих в loaded', () => {
			const loaded = {
				currency: 'USD',
			};

			const merged = mergeWithDefaults(defaults, loaded);

			expect(merged.currency).toBe('USD');
			expect(merged.dateFormat).toBe('ru-RU'); // Из defaults
			expect(merged.incomeLogic).toBe('done'); // Из defaults
		});

		it('должен обрабатывать пустой loaded объект', () => {
			const merged = mergeWithDefaults(defaults, {});

			expect(merged).toEqual(defaults);
		});

		it('должен правильно обрабатывать критические поля в loaded', () => {
			const loaded = {
				weekendTasks: { '2024-01-04': ['task1', 'task2'] },
				excludedWeekends: ['2024-01-03'],
			};

			const merged = mergeWithDefaults(defaults, loaded);

			expect(merged.weekendTasks).toEqual(loaded.weekendTasks);
			expect(merged.excludedWeekends).toEqual(loaded.excludedWeekends);
		});
	});
});

