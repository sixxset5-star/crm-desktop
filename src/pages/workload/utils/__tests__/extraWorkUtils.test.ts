import { describe, it, expect, beforeEach, vi } from 'vitest';
import { extractDateKey, serializeDate, serializeDates, getDateKeyFromDate } from '../extraWorkUtils';

describe('extraWorkUtils', () => {
	describe('extractDateKey', () => {
		it('должен извлекать ключ из формата YYYY-MM-DD', () => {
			expect(extractDateKey('2024-02-01')).toBe('2024-02-01');
		});

		it('должен извлекать ключ из ISO формата с временем', () => {
			expect(extractDateKey('2024-02-01T12:34:56.789Z')).toBe('2024-02-01');
			expect(extractDateKey('2024-02-01T00:00:00')).toBe('2024-02-01');
		});

		it('должен возвращать сегодняшнюю дату для невалидной строки', () => {
			const today = getDateKeyFromDate(new Date());
			const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
			
			const result = extractDateKey('invalid-date');
			
			expect(result).toBe(today);
			expect(consoleWarnSpy).toHaveBeenCalled();
			
			consoleWarnSpy.mockRestore();
		});

		it('должен возвращать сегодняшнюю дату для пустой строки', () => {
			const today = getDateKeyFromDate(new Date());
			const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
			
			const result = extractDateKey('');
			
			expect(result).toBe(today);
			expect(consoleWarnSpy).toHaveBeenCalled();
			
			consoleWarnSpy.mockRestore();
		});

		it('должен возвращать сегодняшнюю дату для null/undefined (через пустую строку)', () => {
			const today = getDateKeyFromDate(new Date());
			const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
			
			// @ts-expect-error - тестируем невалидные входные данные
			const result1 = extractDateKey(null);
			// @ts-expect-error - тестируем невалидные входные данные
			const result2 = extractDateKey(undefined);
			
			expect(result1).toBe(today);
			expect(result2).toBe(today);
			expect(consoleWarnSpy).toHaveBeenCalledTimes(2);
			
			consoleWarnSpy.mockRestore();
		});
	});

	describe('serializeDate', () => {
		it('должен сериализовать дату в валидный ISO формат с Z', () => {
			const result = serializeDate('2024-02-01');
			
			// Проверяем, что результат - валидный ISO string с Z
			expect(result).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
			expect(result).toContain('2024-02-01');
			expect(result).toContain('T00:00:00');
			expect(result.endsWith('Z')).toBe(true);
		});

		it('должен обрабатывать ISO формат с временем', () => {
			const result = serializeDate('2024-02-01T12:34:56.789Z');
			
			expect(result).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
			expect(result).toContain('2024-02-01');
			expect(result).toContain('T00:00:00');
		});

		it('должен создавать Date объект в UTC', () => {
			const result = serializeDate('2024-02-01');
			const date = new Date(result);
			
			// Проверяем, что дата корректна
			expect(date.getUTCFullYear()).toBe(2024);
			expect(date.getUTCMonth()).toBe(1); // февраль = 1
			expect(date.getUTCDate()).toBe(1);
			expect(date.getUTCHours()).toBe(0);
			expect(date.getUTCMinutes()).toBe(0);
			expect(date.getUTCSeconds()).toBe(0);
		});
	});

	describe('serializeDates', () => {
		it('должен сериализовать массив валидных дат', () => {
			const dates = ['2024-02-01', '2024-02-02', '2024-02-03'];
			const result = serializeDates(dates);
			
			expect(result).toHaveLength(3);
			result.forEach((date) => {
				expect(date).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
			});
		});

		it('должен выбрасывать ошибку для невалидных дат', () => {
			const dates = ['2024-02-01', 'invalid-date', '2024-02-03'];
			
			expect(() => serializeDates(dates)).toThrow('Invalid date in array');
		});

		it('должен выбрасывать ошибку для не-массива', () => {
			// @ts-expect-error - тестируем невалидные входные данные
			expect(() => serializeDates('not-an-array')).toThrow('serializeDates expects an array');
		});
	});

	describe('getDateKeyFromDate - edge cases', () => {
		it('должен корректно обрабатывать дату на границе месяца', () => {
			const date = new Date(2024, 0, 31); // 31 января 2024
			const result = getDateKeyFromDate(date);
			
			expect(result).toBe('2024-01-31');
		});

		it('должен корректно обрабатывать високосный год (29 февраля)', () => {
			const date = new Date(2024, 1, 29); // 29 февраля 2024
			const result = getDateKeyFromDate(date);
			
			expect(result).toBe('2024-02-29');
		});

		it('должен использовать локальную дату, а не UTC', () => {
			// Создаем дату в локальной зоне (например, 1 февраля 2024, 00:00:00)
			const date = new Date(2024, 1, 1, 0, 0, 0);
			const result = getDateKeyFromDate(date);
			
			// Должно быть 2024-02-01, а не 2024-01-31 (как было бы с UTC)
			expect(result).toBe('2024-02-01');
		});

		it('должен корректно обрабатывать дату в UTC+ зоне', () => {
			// Симулируем дату в зоне UTC+ (например, Москва UTC+3)
			const date = new Date(2024, 1, 1, 3, 0, 0); // 1 февраля 2024, 03:00:00
			const result = getDateKeyFromDate(date);
			
			// Должно быть 2024-02-01 (локальная дата)
			expect(result).toBe('2024-02-01');
		});
	});

	describe('extractDateKey - edge cases', () => {
		it('должен корректно обрабатывать дату на границе месяца', () => {
			expect(extractDateKey('2024-01-31')).toBe('2024-01-31');
			expect(extractDateKey('2024-02-01')).toBe('2024-02-01');
		});

		it('должен корректно обрабатывать високосный год', () => {
			expect(extractDateKey('2024-02-29')).toBe('2024-02-29');
			expect(extractDateKey('2024-02-29T12:00:00Z')).toBe('2024-02-29');
		});

		it('должен корректно обрабатывать невалидные timestamp-ы', () => {
			const today = getDateKeyFromDate(new Date());
			const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
			
			expect(extractDateKey('invalid-timestamp')).toBe(today);
			expect(extractDateKey('999999999999999999')).toBe(today);
			
			consoleWarnSpy.mockRestore();
		});

		it('должен обрабатывать даты с пробелами', () => {
			const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
			
			expect(extractDateKey(' 2024-03-01 ')).toBe('2024-03-01');
			expect(extractDateKey('2024-03-01 ')).toBe('2024-03-01');
			expect(extractDateKey(' 2024-03-01')).toBe('2024-03-01');
			
			consoleWarnSpy.mockRestore();
		});

		it('должен обрабатывать даты со слешами (fallback)', () => {
			const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
			
			// Слеши не проходят regex, идут в fallback через new Date()
			const result = extractDateKey('2024/03/01');
			expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
			
			consoleWarnSpy.mockRestore();
		});

		it('должен обрабатывать текстовые форматы дат (fallback)', () => {
			const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
			
			// Текстовые форматы идут в fallback
			const result = extractDateKey('March 1, 2024');
			expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
			
			consoleWarnSpy.mockRestore();
		});

		it('должен обрабатывать невалидные месяцы/дни', () => {
			const today = getDateKeyFromDate(new Date());
			const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
			
			// Невалидные месяцы/дни должны возвращать fallback
			expect(extractDateKey('2024-13-40')).toBe(today);
			expect(extractDateKey('2024-00-10')).toBe(today);
			expect(extractDateKey('2024-02-30')).toBe(today); // 30 февраля не существует
			
			consoleWarnSpy.mockRestore();
		});
	});

	describe('serializeDate - валидация и обработка ошибок', () => {
		it('должен выбрасывать ошибку для пустой строки', () => {
			expect(() => serializeDate('')).toThrow('date string is required');
			expect(() => serializeDate('   ')).toThrow('date string is required');
		});

		it('должен выбрасывать ошибку для null/undefined', () => {
			// @ts-expect-error - тестируем невалидные входные данные
			expect(() => serializeDate(null)).toThrow();
			// @ts-expect-error - тестируем невалидные входные данные
			expect(() => serializeDate(undefined)).toThrow();
		});

		it('должен игнорировать время в ISO строке', () => {
			// Даже если приходит ISO с временем, время обнуляется
			const result1 = serializeDate('2024-03-01T15:30:45.123Z');
			const result2 = serializeDate('2024-03-01T00:00:00.000Z');
			
			// Оба должны быть одинаковыми (T00:00:00.000Z)
			expect(result1).toBe(result2);
			expect(result1).toContain('2024-03-01T00:00:00.000Z');
		});
	});
});

