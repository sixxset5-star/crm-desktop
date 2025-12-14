/**
 * Утилиты для форматирования масок инпутов
 */

/**
 * Извлекает только цифры из строки
 */
function extractDigits(value: string): string {
	return value.replace(/\D/g, '');
}

/**
 * Форматирует телефон в формат +7 (953) 837-14-29
 * Принимает сырой ввод (например, "79538371429") и возвращает отформатированную строку
 * Автоматически добавляет +7, если номер начинается с 8 или не начинается с 7
 * 
 * @param value - Сырой ввод номера телефона
 * @returns Отформатированный номер телефона
 * 
 * @example
 * formatPhoneInput('79538371429') // '+7 (953) 837-14-29'
 * formatPhoneInput('89538371429') // '+7 (953) 837-14-29'
 * formatPhoneInput('9538371429') // '+7 (953) 837-14-29'
 */
export function formatPhoneInput(value: string): string {
	const digits = extractDigits(value);
	
	// Если пусто, возвращаем пустую строку
	if (!digits) return '';
	
	// Если начинается с 8, заменяем на 7
	let phoneDigits = digits.startsWith('8') ? '7' + digits.slice(1) : digits;
	
	// Если не начинается с 7, добавляем 7
	if (!phoneDigits.startsWith('7')) {
		phoneDigits = '7' + phoneDigits;
	}
	
	// Ограничиваем до 11 цифр (7 + 10)
	phoneDigits = phoneDigits.slice(0, 11);
	
	// Если меньше 11 цифр, возвращаем частично отформатированную строку
	if (phoneDigits.length <= 1) {
		return phoneDigits ? `+${phoneDigits}` : '';
	}
	
	if (phoneDigits.length <= 4) {
		return `+${phoneDigits.slice(0, 1)} (${phoneDigits.slice(1)}`;
	}
	
	if (phoneDigits.length <= 7) {
		return `+${phoneDigits.slice(0, 1)} (${phoneDigits.slice(1, 4)}) ${phoneDigits.slice(4)}`;
	}
	
	if (phoneDigits.length <= 9) {
		return `+${phoneDigits.slice(0, 1)} (${phoneDigits.slice(1, 4)}) ${phoneDigits.slice(4, 7)}-${phoneDigits.slice(7)}`;
	}
	
	// Полный формат: +7 (953) 837-14-29
	return `+${phoneDigits.slice(0, 1)} (${phoneDigits.slice(1, 4)}) ${phoneDigits.slice(4, 7)}-${phoneDigits.slice(7, 9)}-${phoneDigits.slice(9)}`;
}

/**
 * Извлекает чистый номер телефона из отформатированной строки
 * Удаляет все форматирование и возвращает только цифры с префиксом 7
 * 
 * @param value - Отформатированная строка номера телефона
 * @returns Чистый номер телефона (начинается с 7, максимум 11 цифр)
 * 
 * @example
 * parsePhoneInput('+7 (953) 837-14-29') // '79538371429'
 * parsePhoneInput('8 (953) 837-14-29') // '79538371429'
 */
export function parsePhoneInput(value: string): string {
	const digits = extractDigits(value);
	if (!digits) return '';
	
	// Если начинается с 8, заменяем на 7
	if (digits.startsWith('8')) {
		return '7' + digits.slice(1);
	}
	
	// Если не начинается с 7, добавляем 7
	if (!digits.startsWith('7')) {
		return '7' + digits;
	}
	
	return digits.slice(0, 11);
}

/**
 * Форматирует денежную сумму в формат "4 300 ₽"
 * Принимает сырой ввод (например, "4300") и возвращает отформатированную строку
 * Если есть математические символы, НЕ форматирует вообще (возвращает как есть)
 * 
 * @param value - Сырой ввод денежной суммы
 * @returns Отформатированная строка с пробелами и символом валюты
 * 
 * @example
 * formatCurrencyInput('4300') // '4 300 ₽'
 * formatCurrencyInput('4300.50') // '4 300.50 ₽'
 * formatCurrencyInput('1000+500') // '1000+500' (не форматируется)
 */
export function formatCurrencyInput(value: string): string {
	// Если есть математические символы, НЕ форматируем вообще - возвращаем как есть
	// Это нужно, чтобы не терять часть после оператора при вводе
	if (/[+\-*/()]/.test(value)) {
		return value;
	}
	
	// Если нет математических символов, форматируем как обычно
	// Убираем все нецифровые символы кроме точки и запятой
	const cleaned = value.replace(/[^\d.,]/g, '').replace(',', '.');
	
	if (!cleaned) return '';
	
	// Разделяем на целую и дробную части
	const parts = cleaned.split('.');
	const integerPart = parts[0] || '';
	const decimalPart = parts[1] || '';
	
	// Форматируем целую часть с пробелами
	const formattedInteger = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
	
	// Если есть дробная часть, добавляем её
	if (decimalPart) {
		return `${formattedInteger}.${decimalPart.slice(0, 2)} ₽`;
	}
	
	return `${formattedInteger} ₽`;
}

/**
 * Извлекает числовое значение из отформатированной денежной строки
 * Если есть математические символы, очищает форматирование из числовой части, но сохраняет операторы
 * 
 * @param value - Отформатированная денежная строка
 * @returns Чистое числовое значение (с точкой вместо запятой)
 * 
 * @example
 * parseCurrencyInput('4 300 ₽') // '4300'
 * parseCurrencyInput('4 300.50 ₽') // '4300.50'
 * parseCurrencyInput('1 000+500 ₽') // '1000+500'
 */
export function parseCurrencyInput(value: string): string {
	// Если есть математические символы, очищаем форматирование, но сохраняем операторы
	if (/[+\-*/()]/.test(value)) {
		// Разделяем на части: числа и операторы
		// Заменяем пробелы и символы валюты только в числовых частях
		return value
			.replace(/\s/g, '') // Убираем все пробелы
			.replace(/₽/g, '') // Убираем символ валюты
			.replace(/,/g, '.'); // Заменяем запятую на точку
	}
	// Убираем все кроме цифр, точки и запятой
	return value.replace(/[^\d.,]/g, '').replace(',', '.');
}

/**
 * Форматирует ставку подрядчика в формат "2 300 ₽ / час"
 * Принимает сырой ввод (например, "2300") и возвращает отформатированную строку
 * 
 * @param value - Сырой ввод ставки подрядчика
 * @returns Отформатированная строка с пробелами и единицей измерения
 * 
 * @example
 * formatContractorRateInput('2300') // '2 300 ₽ / час'
 * formatContractorRateInput('2300.50') // '2 300.50 ₽ / час'
 */
export function formatContractorRateInput(value: string): string {
	// Убираем все нецифровые символы кроме точки и запятой
	const cleaned = value.replace(/[^\d.,]/g, '').replace(',', '.');
	
	if (!cleaned) return '';
	
	// Разделяем на целую и дробную части
	const parts = cleaned.split('.');
	const integerPart = parts[0] || '';
	const decimalPart = parts[1] || '';
	
	// Форматируем целую часть с пробелами
	const formattedInteger = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
	
	// Если есть дробная часть, добавляем её
	if (decimalPart) {
		return `${formattedInteger}.${decimalPart.slice(0, 2)} ₽ / час`;
	}
	
	return `${formattedInteger} ₽ / час`;
}

/**
 * Извлекает числовое значение из отформатированной ставки подрядчика
 * 
 * @param value - Отформатированная строка ставки
 * @returns Чистое числовое значение
 * 
 * @example
 * parseContractorRateInput('2 300 ₽ / час') // '2300'
 */
export function parseContractorRateInput(value: string): string {
	// Убираем все кроме цифр, точки и запятой
	return value.replace(/[^\d.,]/g, '').replace(',', '.');
}

/**
 * Форматирует количество в формат "23 шт."
 * Принимает сырой ввод (например, "23") и возвращает отформатированную строку
 * Если есть математические символы, возвращает как есть
 * Количество - только целые числа, дробные части игнорируются
 * 
 * @param value - Сырой ввод количества
 * @returns Отформатированная строка с единицей измерения
 * 
 * @example
 * formatQuantityInput('23') // '23 шт.'
 * formatQuantityInput('1000') // '1 000 шт.'
 * formatQuantityInput('10+5') // '10+5' (не форматируется)
 * formatQuantityInput('23.5') // '23 шт.' (дробная часть игнорируется)
 */
export function formatQuantityInput(value: string): string {
	// Если есть математические символы, не форматируем
	if (/[+\-*/()]/.test(value)) {
		return value;
	}
	
	// Убираем все нецифровые символы (включая точки и запятые - только целые числа)
	const cleaned = value.replace(/\D/g, '');
	
	if (!cleaned) return '';
	
	// Форматируем целую часть с пробелами (только целые числа)
	const formattedInteger = cleaned.replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
	
	return `${formattedInteger} шт.`;
}

/**
 * Извлекает числовое значение из отформатированного количества
 * Если есть математические символы, возвращает как есть
 * Количество - только целые числа, дробные части игнорируются
 * 
 * @param value - Отформатированная строка количества
 * @returns Чистое числовое значение (только целые числа)
 * 
 * @example
 * parseQuantityInput('23 шт.') // '23'
 * parseQuantityInput('1 000 шт.') // '1000'
 * parseQuantityInput('23.5 шт.') // '23' (дробная часть игнорируется)
 */
export function parseQuantityInput(value: string): string {
	// Если есть математические символы, возвращаем как есть
	if (/[+\-*/()]/.test(value)) {
		return value;
	}
	// Убираем все кроме цифр (только целые числа, без точек и запятых)
	return value.replace(/\D/g, '');
}

/**
 * Форматирует процент в формат "13.5 %"
 * Принимает сырой ввод (например, "13.5") и возвращает отформатированную строку
 * Если есть математические символы, возвращает как есть
 * 
 * @param value - Сырой ввод процента
 * @returns Отформатированная строка с символом процента
 * 
 * @example
 * formatPercentageInput('13.5') // '13.5 %'
 * formatPercentageInput('100') // '100 %'
 * formatPercentageInput('10+5') // '10+5' (не форматируется)
 */
export function formatPercentageInput(value: string): string {
	// Если есть математические символы, не форматируем
	if (/[+\-*/()]/.test(value)) {
		return value;
	}
	
	// Убираем все нецифровые символы кроме точки и запятой
	const cleaned = value.replace(/[^\d.,]/g, '').replace(',', '.');
	
	if (!cleaned) return '';
	
	// Разделяем на целую и дробную части
	const parts = cleaned.split('.');
	const integerPart = parts[0] || '';
	const decimalPart = parts[1] || '';
	
	// Если есть дробная часть, добавляем её (максимум 2 знака)
	if (decimalPart) {
		return `${integerPart}.${decimalPart.slice(0, 2)} %`;
	}
	
	return `${integerPart} %`;
}

/**
 * Извлекает числовое значение из отформатированного процента
 * Если есть математические символы, возвращает как есть
 * 
 * @param value - Отформатированная строка процента
 * @returns Чистое числовое значение
 * 
 * @example
 * parsePercentageInput('13.5 %') // '13.5'
 * parsePercentageInput('100 %') // '100'
 */
export function parsePercentageInput(value: string): string {
	// Если есть математические символы, возвращаем как есть
	if (/[+\-*/()]/.test(value)) {
		return value;
	}
	// Убираем все кроме цифр, точки и запятой
	return value.replace(/[^\d.,]/g, '').replace(',', '.');
}

