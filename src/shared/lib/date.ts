/**
 * Форматирует дату в формат YYYY-MM-DD для input[type="date"]
 * 
 * @param value - Дата в виде Date, строки или числа
 * @returns Строка в формате YYYY-MM-DD или пустая строка при невалидной дате
 * 
 * @example
 * formatDateInput(new Date(2024, 0, 15)) // '2024-01-15'
 * formatDateInput('2024-01-15') // '2024-01-15'
 */
export function formatDateInput(value: Date | string | number): string {
	const date = value instanceof Date ? value : new Date(value);
	if (Number.isNaN(date.getTime())) {
		return '';
	}
	return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

/**
 * Преобразует дату в строку-ключ формата YYYY-MM-DD в локальном времени
 * Избегает проблем с часовыми поясами, парся строки YYYY-MM-DD напрямую
 * 
 * @param value - Дата в виде Date или строки
 * @returns Строка в формате YYYY-MM-DD или null при невалидной дате
 * 
 * @example
 * toLocalDateKey(new Date(2024, 0, 15)) // '2024-01-15'
 * toLocalDateKey('2024-01-15T10:00:00Z') // '2024-01-15' (в локальном времени)
 */
export function toLocalDateKey(value: Date | string): string | null {
	let date: Date;
	
	if (value instanceof Date) {
		date = new Date(value);
	} else {
		// Для строк вида "YYYY-MM-DD" парсим напрямую, чтобы избежать проблем с часовыми поясами
		const dateStr = value.trim();
		const isoMatch = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})(?:T|$)/);
		
		if (isoMatch) {
			// Создаём дату напрямую в локальном времени
			const year = parseInt(isoMatch[1], 10);
			const month = parseInt(isoMatch[2], 10) - 1; // месяцы 0-11
			const day = parseInt(isoMatch[3], 10);
			date = new Date(year, month, day, 0, 0, 0, 0);
		} else {
			// Для других форматов используем стандартный парсинг
			date = new Date(value);
		}
	}
	
	if (Number.isNaN(date.getTime())) {
		return null;
	}
	
	// Убеждаемся, что время установлено на полночь
	date.setHours(0, 0, 0, 0);
	return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

/**
 * Парсит строку даты в объект Date без времени (только дата)
 * Избегает проблем с часовыми поясами, парся строки YYYY-MM-DD напрямую
 * Устанавливает время на полночь (00:00:00)
 * 
 * @param value - Строка даты в формате YYYY-MM-DD или ISO
 * @returns Объект Date с установленным временем на полночь или null при невалидной дате
 * 
 * @example
 * parseDateOnly('2024-01-15') // Date(2024, 0, 15, 0, 0, 0, 0)
 * parseDateOnly('2024-01-15T10:00:00Z') // Date(2024, 0, 15, 0, 0, 0, 0)
 * parseDateOnly(null) // null
 */
export function parseDateOnly(value?: string | null): Date | null {
	if (!value) {
		return null;
	}
	
	// Для строк вида "YYYY-MM-DD" парсим напрямую, чтобы избежать проблем с часовыми поясами
	const dateStr = value.trim();
	const isoMatch = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})(?:T|$)/);
	
	let date: Date;
	if (isoMatch) {
		// Создаём дату напрямую в локальном времени
		const year = parseInt(isoMatch[1], 10);
		const month = parseInt(isoMatch[2], 10) - 1; // месяцы 0-11
		const day = parseInt(isoMatch[3], 10);
		date = new Date(year, month, day, 0, 0, 0, 0);
	} else {
		// Для других форматов используем стандартный парсинг
		date = new Date(value);
		if (Number.isNaN(date.getTime())) {
			return null;
		}
		date.setHours(0, 0, 0, 0);
		return date;
	}
	
	if (Number.isNaN(date.getTime())) {
		return null;
	}
	
	return date;
}


