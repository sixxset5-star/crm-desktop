/**
 * Возвращает цвет для бара графика на основе значения прибыли
 * Использует CSS токены для цветов
 */
export function getBarColor(value: number, minProfit: number, maxProfit: number): string {
	// Один цвет, если нет разброса
	if (!isFinite(minProfit) || !isFinite(maxProfit) || maxProfit <= minProfit) {
		return 'var(--green)';
	}
	// Нормализуем 0..1 между минимумом (красный) и максимумом (зелёный)
	const tRaw = (value - minProfit) / (maxProfit - minProfit);
	const t = Math.max(0, Math.min(1, tRaw));
	
	// Используем CSS токены для цветов
	// Для плавного перехода между красным и зеленым используем смешение цветов
	if (t < 0.5) {
		// От красного к желтому (warning)
		const localT = t * 2;
		return `color-mix(in srgb, var(--red) ${(1 - localT) * 100}%, var(--warning) ${localT * 100}%)`;
	} else {
		// От желтого к зеленому
		const localT = (t - 0.5) * 2;
		return `color-mix(in srgb, var(--warning) ${(1 - localT) * 100}%, var(--green) ${localT * 100}%)`;
	}
}






