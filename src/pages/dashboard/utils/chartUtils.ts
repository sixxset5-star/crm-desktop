/**
 * Утилиты для работы с графиками
 * Содержит логику расчета меток, позиций и форматирования данных
 */

/**
 * Рассчитывает значения меток для оси Y на основе диапазона
 * @param max - максимальное значение
 * @param min - минимальное значение
 * @returns массив значений для меток
 */
export function calculateYAxisLabels(max: number, min: number): number[] {
	const labels: number[] = [];
	
	// Положительные значения
	if (max > 0) {
		labels.push(max);
		labels.push(max * 0.75);
		labels.push(max * 0.5);
		labels.push(max * 0.25);
	}
	
	// Ноль
	labels.push(0);
	
	// Отрицательные значения (если есть)
	if (min < 0) {
		labels.push(min * 0.25);
		labels.push(min * 0.5);
		labels.push(min * 0.75);
		labels.push(min);
	}
	
	return labels.sort((a, b) => b - a);
}

/**
 * Нормализует значение для позиционирования на графике
 * @param value - значение для нормализации
 * @param max - максимальное значение диапазона
 * @param min - минимальное значение диапазона
 * @returns нормализованное значение (0-100)
 */
export function normalizeValue(value: number, max: number, min: number): number {
	const range = max - min || 1;
	return ((value - min) / range) * 100;
}

/**
 * Рассчитывает позицию в процентах от верха контейнера
 * @param value - значение для позиционирования
 * @param max - максимальное значение диапазона
 * @param min - минимальное значение диапазона
 * @returns позиция в процентах от верха (0-100)
 */
export function calculateTopPosition(value: number, max: number, min: number): number {
	const normalized = normalizeValue(value, max, min);
	return 100 - normalized;
}

/**
 * Рассчитывает позицию нулевой линии
 * @param max - максимальное значение диапазона
 * @param min - минимальное значение диапазона
 * @returns позиция нулевой линии в процентах от верха
 */
export function calculateZeroLinePosition(max: number, min: number): number {
	if (min >= 0) return 100;
	const range = max - min || 1;
	return ((0 - min) / range) * 100;
}

/**
 * Рассчитывает высоту столбца от нулевой линии
 * @param value - значение столбца
 * @param max - максимальное значение диапазона
 * @param min - минимальное значение диапазона
 * @returns высота столбца в процентах
 */
export function calculateBarHeight(value: number, max: number, min: number): number {
	const range = max - min || 1;
	return Math.abs(value / range) * 100;
}




