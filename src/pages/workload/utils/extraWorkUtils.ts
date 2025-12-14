import type { ExtraWork, ExtraWorkPayment } from '../types/extra-work.types';
import { getHolidayForDay } from './holidayUtils';
import { createLogger } from '@/shared/lib/logger';
import { generateShortId } from '@/shared/utils/id';

const log = createLogger('ExtraWorkUtils');

/**
 * Утилиты для работы с доп работой
 */

// ============================================================================
// Генерация ID
// ============================================================================

/**
 * Генерирует ID для доп работы
 */
export function generateExtraWorkId(): string {
	return generateShortId();
}

/**
 * Генерирует ID для оплаты
 */
export function generatePaymentId(): string {
	return generateShortId();
}

// ============================================================================
// Работа с датами
// ============================================================================

/**
 * Получает ключ даты (YYYY-MM-DD) из Date объекта
 * Использует локальную дату, а не UTC, чтобы избежать сдвига на границе дня
 */
export function getDateKeyFromDate(date: Date): string {
	const year = date.getFullYear();
	const month = String(date.getMonth() + 1).padStart(2, '0');
	const day = String(date.getDate()).padStart(2, '0');
	return `${year}-${month}-${day}`;
}

/**
 * Извлекает ключ даты (YYYY-MM-DD) из строки
 * Защищен от UTC-сдвига: строгая валидация ISO формата
 * При невалидной дате возвращает сегодняшнюю дату (fallback для старых данных)
 */
export function extractDateKey(dateStr: string): string {
	if (!dateStr || typeof dateStr !== 'string') {
		log.warn('invalid date string, fallback to today', { dateStr });
		return getDateKeyFromDate(new Date());
	}
	
	// Строгая проверка: ISO date only (YYYY-MM-DD)
	const isoDateOnly = /^\d{4}-\d{2}-\d{2}$/;
	if (isoDateOnly.test(dateStr)) {
		return dateStr;
	}
	
	// Строгая проверка: ISO with time (YYYY-MM-DDTHH:mm:ss...)
	const isoDateWithTime = /^\d{4}-\d{2}-\d{2}T/;
	if (isoDateWithTime.test(dateStr)) {
		return dateStr.slice(0, 10);
	}
	
	// Fallback: парсим через Date и нормализуем
	const date = new Date(dateStr);
	if (isNaN(date.getTime())) {
		log.warn('invalid date, fallback to today', { dateStr });
		return getDateKeyFromDate(new Date());
	}
	return getDateKeyFromDate(date);
}

/**
 * Сериализует дату в ISO формат (UTC) для сохранения в БД
 * 
 * ВАЖНО: ExtraWork работает ТОЛЬКО с датами (без времени).
 * Все даты сериализуются как YYYY-MM-DDT00:00:00.000Z (полночь UTC).
 * Время игнорируется - если приходит ISO с временем, оно обнуляется.
 * 
 * Возвращает валидный ISO string с таймзоной Z: YYYY-MM-DDTHH:mm:ss.sssZ
 * 
 * @throws {Error} Если dateStr пустая или невалидная
 */
export function serializeDate(dateStr: string): string {
	if (!dateStr || typeof dateStr !== 'string' || dateStr.trim() === '') {
		throw new Error('serializeDate: date string is required and cannot be empty');
	}
	
	const dateKey = extractDateKey(dateStr);
	
	// ВАЖНО: Всегда используем T00:00:00Z - время игнорируется
	// Это гарантирует, что ExtraWork работает только с датами
	const d = new Date(`${dateKey}T00:00:00Z`);
	
	if (isNaN(d.getTime())) {
		throw new Error(`serializeDate: invalid date key "${dateKey}" extracted from "${dateStr}"`);
	}
	
	return d.toISOString();
}

/**
 * Сериализует массив дат в ISO формат
 * Выбрасывает ошибку при невалидных датах для предотвращения потери данных
 */
export function serializeDates(dateStrs: string[]): string[] {
	if (!Array.isArray(dateStrs)) {
		throw new Error('serializeDates expects an array of date strings');
	}
	return dateStrs.map((dateStr) => {
		try {
			return serializeDate(dateStr);
		} catch (error) {
			throw new Error(`[serializeDates] Invalid date in array: ${dateStr}. ${error instanceof Error ? error.message : String(error)}`);
		}
	});
}

/**
 * Валидация и нормализация дат работы
 */
export function normalizeAndValidateWorkDates(dates: string[]): string[] {
	// Используем serializeDates для сохранения в БД
	return serializeDates(dates).sort();
}

/**
 * Создает мапу дат к сменам доп работы
 * extractDateKey обрабатывает невалидные даты с fallback
 */
export function createDateToWorksMap(extraWorks: ExtraWork[]): Map<string, ExtraWork[]> {
	const map = new Map<string, ExtraWork[]>();
	extraWorks.forEach((work) => {
		work.workDates.forEach((dateStr) => {
			const dateKey = extractDateKey(dateStr);
			if (!map.has(dateKey)) {
				map.set(dateKey, []);
			}
			map.get(dateKey)!.push(work);
		});
	});
	return map;
}

// ============================================================================
// Расчеты оплат
// ============================================================================

/**
 * Рассчитывает оплаченную сумму для смены
 */
export function getPaidAmount(work: ExtraWork): number {
	return work.payments
		.filter((p) => p.paid)
		.reduce((sum, p) => sum + p.amount, 0);
}

/**
 * Проверяет, полностью ли оплачена смена
 */
export function isFullyPaid(work: ExtraWork): boolean {
	const paidAmount = getPaidAmount(work);
	return paidAmount >= work.totalAmount;
}

/**
 * Рассчитывает процент оплаты (0-100)
 */
export function getPaidPercent(work: ExtraWork): number {
	if (work.totalAmount === 0) return 0;
	const paidAmount = getPaidAmount(work);
	return (paidAmount / work.totalAmount) * 100;
}

/**
 * Форматирует процент оплаты для отображения
 */
export function formatPaidPercent(value: number): string {
	const rounded = Math.round(value);
	return `${rounded}%`;
}

/**
 * Получает статус оплаты в виде строки
 */
export function getPaymentStatus(work: ExtraWork): string {
	const isFully = isFullyPaid(work);
	if (isFully) return 'Оплачено';
	const percent = getPaidPercent(work);
	if (percent > 0) return `Частично оплачено (${formatPaidPercent(percent)})`;
	return 'Не оплачено';
}

/**
 * Рассчитывает общую сумму для смены
 * Учитывает разные оклады на выходных и буднях
 */
export function calculateTotalAmount(
	workDates: string[], 
	dailyRate: number, 
	weekendRate?: number
): number {
	if (!weekendRate) {
		return workDates.length * dailyRate;
	}

	let total = 0;

	workDates.forEach((dateStr) => {
		const dateKey = extractDateKey(dateStr);
		// Используем локальную дату из dateKey, чтобы избежать проблем с часовыми поясами
		// dateKey имеет формат YYYY-MM-DD
		const [year, month, day] = dateKey.split('-').map(Number);
		const date = new Date(year, month - 1, day); // month - 1 потому что в JS месяцы 0-11
		
		// В доп работе выходные = только суббота (6) и воскресенье (0), независимо от настроек календаря
		const isWeekend = date.getDay() === 0 || date.getDay() === 6;

		total += isWeekend ? weekendRate : dailyRate;
	});

	return total;
}


