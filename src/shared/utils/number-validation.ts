/**
 * Утилиты для валидации и парсинга числовых значений
 */

export type NumberValidationResult = {
	valid: boolean;
	value?: number;
	error?: string;
};

/**
 * Безопасный парсинг числа из строки
 * Поддерживает русскую локаль (запятая вместо точки)
 * 
 * @param input - Строка для парсинга
 * @returns Распарсенное число или null, если парсинг не удался
 * 
 * @example
 * parseNumberSafe('123.45') // 123.45
 * parseNumberSafe('123,45') // 123.45 (русская локаль)
 * parseNumberSafe('invalid') // null
 * parseNumberSafe('') // null
 */
export function parseNumberSafe(input: string): number | null {
	if (!input || typeof input !== 'string') {
		return null;
	}

	const trimmed = input.trim();
	if (!trimmed) {
		return null;
	}

	// Нормализуем запятую в точку
	const normalized = trimmed.replace(',', '.');

	// Парсим число
	const parsed = parseFloat(normalized);

	if (isNaN(parsed) || !isFinite(parsed)) {
		return null;
	}

	return parsed;
}

/**
 * Валидация числа с опциональными границами и правилами
 * Поддерживает русскую локаль (запятая вместо точки)
 * 
 * @param input - Строка для валидации
 * @param options - Опции валидации
 * @param options.min - Минимальное значение
 * @param options.max - Максимальное значение
 * @param options.allowZero - Разрешить ноль (по умолчанию true)
 * @param options.allowNegative - Разрешить отрицательные значения (по умолчанию false)
 * @param options.required - Обязательное поле (по умолчанию false)
 * @param options.fieldName - Имя поля для сообщений об ошибках (по умолчанию 'Значение')
 * @returns Результат валидации с флагом valid, значением и сообщением об ошибке
 * 
 * @example
 * validateNumber('100', { min: 0, max: 1000 }) // { valid: true, value: 100 }
 * validateNumber('-10', { allowNegative: false }) // { valid: false, error: '...' }
 * validateNumber('', { required: true }) // { valid: false, error: '...' }
 */
export function validateNumber(
	input: string,
	options: {
		min?: number;
		max?: number;
		allowZero?: boolean;
		allowNegative?: boolean;
		required?: boolean;
		fieldName?: string;
	} = {}
): NumberValidationResult {
	const {
		min,
		max,
		allowZero = true,
		allowNegative = false,
		required = false,
		fieldName = 'Значение',
	} = options;

	// Проверка на пустое значение
	if (!input || !input.trim()) {
		if (required) {
			return {
				valid: false,
				error: `${fieldName} обязательно для заполнения`,
			};
		}
		return { valid: true, value: undefined };
	}

	// Парсинг числа
	const value = parseNumberSafe(input);

	if (value === null) {
		return {
			valid: false,
			error: `${fieldName} должно быть числом`,
		};
	}

	// Проверка на ноль
	if (value === 0 && !allowZero) {
		return {
			valid: false,
			error: `${fieldName} не может быть равно нулю`,
		};
	}

	// Проверка на отрицательные значения
	if (value < 0 && !allowNegative) {
		return {
			valid: false,
			error: `${fieldName} не может быть отрицательным`,
		};
	}

	// Проверка минимального значения
	if (min !== undefined && value < min) {
		return {
			valid: false,
			error: `${fieldName} не может быть меньше ${min}`,
		};
	}

	// Проверка максимального значения
	if (max !== undefined && value > max) {
		return {
			valid: false,
			error: `${fieldName} не может быть больше ${max}`,
		};
	}

	return {
		valid: true,
		value,
	};
}

/**
 * Валидация процентов (0-100)
 * Специализированная функция для валидации процентных значений
 * 
 * @param input - Строка для валидации
 * @param options - Опции валидации
 * @param options.allowZero - Разрешить ноль процентов (по умолчанию true)
 * @param options.required - Обязательное поле (по умолчанию false)
 * @param options.fieldName - Имя поля для сообщений об ошибках (по умолчанию 'Процентная ставка')
 * @returns Результат валидации с флагом valid, значением и сообщением об ошибке
 * 
 * @example
 * validatePercentage('50') // { valid: true, value: 50 }
 * validatePercentage('150') // { valid: false, error: '...' }
 * validatePercentage('0', { allowZero: false }) // { valid: false, error: '...' }
 */
export function validatePercentage(
	input: string,
	options: {
		allowZero?: boolean;
		required?: boolean;
		fieldName?: string;
	} = {}
): NumberValidationResult {
	return validateNumber(input, {
		min: 0,
		max: 100,
		allowZero: options.allowZero ?? true,
		allowNegative: false,
		required: options.required ?? false,
		fieldName: options.fieldName || 'Процентная ставка',
	});
}

/**
 * Валидация положительного числа
 * Специализированная функция для валидации положительных значений (больше нуля)
 * 
 * @param input - Строка для валидации
 * @param options - Опции валидации
 * @param options.min - Минимальное значение (по умолчанию 0)
 * @param options.required - Обязательное поле (по умолчанию false)
 * @param options.fieldName - Имя поля для сообщений об ошибках (по умолчанию 'Значение')
 * @returns Результат валидации с флагом valid, значением и сообщением об ошибке
 * 
 * @example
 * validatePositiveNumber('100') // { valid: true, value: 100 }
 * validatePositiveNumber('0') // { valid: false, error: '...' }
 * validatePositiveNumber('-10') // { valid: false, error: '...' }
 */
export function validatePositiveNumber(
	input: string,
	options: {
		min?: number;
		required?: boolean;
		fieldName?: string;
	} = {}
): NumberValidationResult {
	return validateNumber(input, {
		min: options.min ?? 0,
		allowZero: false,
		allowNegative: false,
		required: options.required ?? false,
		fieldName: options.fieldName || 'Значение',
	});
}


