/**
 * Утилиты для работы с выходными днями
 */

import type { StoredHoliday } from './holidayUtils';
import { getHolidayForDay } from './holidayUtils';
import { getDateKeyFromDate } from './extraWorkUtils';

/**
 * Проверяет, является ли день выходным для задач (без учета праздников)
 */
export function isWeekendDayForTasks(
	day: Date,
	excludedWeekends: string[],
	customWeekends: string[]
): boolean {
	const dateKey = getDateKeyFromDate(day);
	// Проверяем стандартные выходные (суббота и воскресенье)
	const isStandardWeekend = day.getDay() === 0 || day.getDay() === 6;
	// Проверяем исключения из стандартных выходных
	const isExcluded = excludedWeekends.includes(dateKey);
	// Проверяем пользовательские выходные
	const isCustomWeekend = customWeekends.includes(dateKey);
	// День выходной для задач, если это стандартный выходной (и не исключен) или пользовательский выходной
	return (isStandardWeekend && !isExcluded) || isCustomWeekend;
}

/**
 * Проверяет, является ли день выходным (с учетом пользовательских выходных и праздников)
 */
export function isWeekendDay(
	day: Date,
	excludedWeekends: string[],
	customWeekends: string[],
	holidays: StoredHoliday[]
): boolean {
	const dateKey = getDateKeyFromDate(day);
	// Проверяем стандартные выходные (суббота и воскресенье)
	const isStandardWeekend = day.getDay() === 0 || day.getDay() === 6;
	// Проверяем исключения из стандартных выходных
	const isExcluded = excludedWeekends.includes(dateKey);
	// Проверяем пользовательские выходные
	const isCustomWeekend = customWeekends.includes(dateKey);
	// Проверяем праздники
	const holiday = getHolidayForDay(day, holidays);
	const isHoliday = holiday !== null;
	// День выходной, если это стандартный выходной (и не исключен), пользовательский выходной или праздник
	return (isStandardWeekend && !isExcluded) || isCustomWeekend || isHoliday;
}

/**
 * Подсчитывает количество выходных дней в месяце (без учета праздников)
 */
export function countWeekendDaysInMonth(
	year: number,
	month: number,
	excludedWeekends: string[],
	customWeekends: string[]
): number {
	const monthDays = Array.from({ length: new Date(year, month + 1, 0).getDate() }, (_, i) => new Date(year, month, i + 1));
	const excludedSet = new Set(excludedWeekends);
	const customSet = new Set(customWeekends);
	
	let count = 0;
	
	monthDays.forEach(day => {
		const year = day.getFullYear();
		const month = day.getMonth();
		const date = day.getDate();
		const localDay = new Date(year, month, date);
		const dayOfWeek = localDay.getDay();
		
		const storageKey = getDateKeyFromDate(localDay);
		
		const isStandardWeekend = dayOfWeek === 0 || dayOfWeek === 6;
		const isExcluded = excludedSet.has(storageKey);
		const isCustomWeekend = customSet.has(storageKey);
		
		const isWeekend = (isStandardWeekend && !isExcluded) || isCustomWeekend;
		
		if (isWeekend) {
			count++;
		}
	});
	
	return count;
}



