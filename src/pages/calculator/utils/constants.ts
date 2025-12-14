/**
 * Константы для страницы Calculator
 * Используются вместо хардкодных значений
 * Все значения основаны на дизайн-токенах из tokens.css
 */

// Фиксированные коэффициенты калькулятора
// Используются как fallback значения, если не заданы в настройках
export const CALCULATOR_DEFAULT_PHOTO_MULTIPLIER = 0.8;
export const CALCULATOR_DEFAULT_URGENT_MULTIPLIER = 1.5;
export const CALCULATOR_DEFAULT_LAYOUT_MULTIPLIER = 1.5;
export const CALCULATOR_DEFAULT_STYLE_MULTIPLIER = 0.7;
export const CALCULATOR_DEFAULT_NON_STANDARD_MULTIPLIER = 1.1;
export const CALCULATOR_DEFAULT_SCALE_MULTIPLIER = 0.9;
export const CALCULATOR_SCALE_THRESHOLD = 40; // Количество блоков для эффекта масштаба

// Варианты округления
export const ROUNDING_OPTIONS = {
	NONE: null as const,
	ONE_THOUSAND: 1000 as const,
	FIVE_THOUSAND: 5000 as const,
	TEN_THOUSAND: 10000 as const,
};

export type RoundingValue = typeof ROUNDING_OPTIONS[keyof typeof ROUNDING_OPTIONS];

// Размеры для компонентов Calculator (используем CSS токены)
export const CALCULATOR_INPUT_COEFFICIENT_WIDTH = 'var(--calculator-input-coefficient-width)';
export const CALCULATOR_PRICE_LARGE_FONT_SIZE = 'var(--font-size-2xl)';
export const CALCULATOR_PRICE_MEDIUM_FONT_SIZE = 'var(--font-size-xl)';






