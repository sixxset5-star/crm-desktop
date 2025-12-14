import { safeEval } from '@/shared/lib/mathParser';

/**
 * Обрабатывает blur событие для числовых инпутов с поддержкой математических выражений
 * Если значение содержит математические операторы, вычисляет результат
 */
export function handleNumericInputBlur(
	value: string,
	onChange: (value: string) => void
): void {
	const trimmed = value.trim();
	if (trimmed && /[+\-*/]/.test(trimmed)) {
		// Нормализуем запятую в точку для поддержки русской локали
		const normalized = trimmed.replace(',', '.');
		const result = safeEval(normalized);
		if (result !== null && isFinite(result)) {
			// Сохраняем десятичные знаки, округляем до 2 знаков после запятой
			const rounded = Math.round(result * 100) / 100;
			// Форматируем с запятой для отображения в русской локали
			onChange(String(rounded).replace('.', ','));
		}
	}
}





