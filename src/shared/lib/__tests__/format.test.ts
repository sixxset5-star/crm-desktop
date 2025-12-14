/**
 * Тесты для утилит форматирования
 */

import { describe, it, expect } from 'vitest';
import { formatCurrencyRub } from '../format';

describe('formatCurrencyRub', () => {
	it('должен форматировать число в рубли', () => {
		expect(formatCurrencyRub(1000)).toContain('1');
		expect(formatCurrencyRub(1000)).toContain('000');
	});

	it('должен обрабатывать нулевое значение', () => {
		expect(formatCurrencyRub(0)).toBeDefined();
	});

	it('должен обрабатывать большие числа', () => {
		const result = formatCurrencyRub(1000000);
		expect(result).toBeDefined();
		expect(typeof result).toBe('string');
	});
});















