/**
 * Утилиты для валидации текстовых значений
 */

export type TextValidationResult = {
	valid: boolean;
	error?: string;
};

/**
 * Валидирует текстовое поле с опциональными ограничениями по длине
 * 
 * @param input - Строка для валидации
 * @param options - Опции валидации
 * @param options.required - Обязательное поле (по умолчанию false)
 * @param options.minLength - Минимальная длина
 * @param options.maxLength - Максимальная длина
 * @param options.fieldName - Имя поля для сообщений об ошибках (по умолчанию 'Поле')
 * @param options.trim - Обрезать пробелы (по умолчанию true)
 * @returns Результат валидации с флагом valid и сообщением об ошибке
 * 
 * @example
 * validateText('', { required: true }) // { valid: false, error: '...' }
 * validateText('abc', { minLength: 5 }) // { valid: false, error: '...' }
 * validateText('valid text') // { valid: true }
 */
export function validateText(
	input: string,
	options: {
		required?: boolean;
		minLength?: number;
		maxLength?: number;
		fieldName?: string;
		trim?: boolean;
	} = {}
): TextValidationResult {
	const {
		required = false,
		minLength,
		maxLength,
		fieldName = 'Поле',
		trim = true,
	} = options;

	const value = trim ? input.trim() : input;

	// Проверка на пустое значение
	if (!value) {
		if (required) {
			return {
				valid: false,
				error: `${fieldName} обязательно для заполнения`,
			};
		}
		return { valid: true };
	}

	// Проверка минимальной длины
	if (minLength !== undefined && value.length < minLength) {
		return {
			valid: false,
			error: `${fieldName} должно содержать не менее ${minLength} символов`,
		};
	}

	// Проверка максимальной длины
	if (maxLength !== undefined && value.length > maxLength) {
		return {
			valid: false,
			error: `${fieldName} должно содержать не более ${maxLength} символов`,
		};
	}

	return { valid: true };
}

/**
 * Валидирует email адрес (базовая проверка формата)
 * 
 * @param input - Строка email для валидации
 * @param options - Опции валидации
 * @param options.required - Обязательное поле (по умолчанию false)
 * @param options.fieldName - Имя поля для сообщений об ошибках (по умолчанию 'Email')
 * @returns Результат валидации с флагом valid и сообщением об ошибке
 * 
 * @example
 * validateEmail('test@example.com') // { valid: true }
 * validateEmail('invalid') // { valid: false, error: '...' }
 * validateEmail('', { required: true }) // { valid: false, error: '...' }
 */
export function validateEmail(
	input: string,
	options: {
		required?: boolean;
		fieldName?: string;
	} = {}
): TextValidationResult {
	const { required = false, fieldName = 'Email' } = options;

	const trimmed = input.trim();

	if (!trimmed) {
		if (required) {
			return {
				valid: false,
				error: `${fieldName} обязательно для заполнения`,
			};
		}
		return { valid: true };
	}

	// Базовая проверка формата email
	const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
	if (!emailRegex.test(trimmed)) {
		return {
			valid: false,
			error: `${fieldName} имеет некорректный формат`,
		};
	}

	return { valid: true };
}

/**
 * Валидирует дату (проверка формата и диапазона)
 * 
 * @param input - Строка даты для валидации
 * @param options - Опции валидации
 * @param options.required - Обязательное поле (по умолчанию false)
 * @param options.min - Минимальная дата (ISO строка)
 * @param options.max - Максимальная дата (ISO строка)
 * @param options.fieldName - Имя поля для сообщений об ошибках (по умолчанию 'Дата')
 * @returns Результат валидации с флагом valid и сообщением об ошибке
 * 
 * @example
 * validateDate('2024-01-15') // { valid: true }
 * validateDate('invalid') // { valid: false, error: '...' }
 * validateDate('2024-01-15', { min: '2024-01-20' }) // { valid: false, error: '...' }
 */
export function validateDate(
	input: string,
	options: {
		required?: boolean;
		min?: string; // ISO date string
		max?: string; // ISO date string
		fieldName?: string;
	} = {}
): TextValidationResult {
	const {
		required = false,
		min,
		max,
		fieldName = 'Дата',
	} = options;

	const trimmed = input.trim();

	if (!trimmed) {
		if (required) {
			return {
				valid: false,
				error: `${fieldName} обязательно для заполнения`,
			};
		}
		return { valid: true };
	}

	// Проверка формата даты
	const date = new Date(trimmed);
	if (isNaN(date.getTime())) {
		return {
			valid: false,
			error: `${fieldName} имеет некорректный формат`,
		};
	}

	// Проверка минимальной даты
	if (min) {
		const minDate = new Date(min);
		if (date < minDate) {
			return {
				valid: false,
				error: `${fieldName} не может быть раньше ${new Date(min).toLocaleDateString('ru-RU')}`,
			};
		}
	}

	// Проверка максимальной даты
	if (max) {
		const maxDate = new Date(max);
		if (date > maxDate) {
			return {
				valid: false,
				error: `${fieldName} не может быть позже ${new Date(max).toLocaleDateString('ru-RU')}`,
			};
		}
	}

	return { valid: true };
}
