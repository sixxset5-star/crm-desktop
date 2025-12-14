/**
 * Утилиты для рендеринга компонентов доп работы
 * Содержит логику форматирования, вычисления стилей и статусов
 */
import { getDateKeyFromDate, getPaidAmount } from './extraWorkUtils';
import { getTokenString } from '@/shared/lib/tokens';
import type { ExtraWork } from '../types/extra-work.types';

// Ключ сегодняшней даты (обновляется при изменении даты, но не на каждый рендер)
export const TODAY_KEY = getDateKeyFromDate(new Date());

/**
 * Проверяет, является ли дата сегодняшним днём
 */
export function isTodayDate(day: Date): boolean {
	return getDateKeyFromDate(day) === TODAY_KEY;
}

/**
 * Получает индекс дня недели (0 = воскресенье, 1 = понедельник и т.д.)
 */
export function getDayOfWeekIndex(day: Date): number {
	return day.getDay();
}

/**
 * Определяет цвет статуса оплаты
 */
export function getPaymentStatusColor(paidPercent: number, isFullyPaid: boolean): string {
	if (isFullyPaid) {
		return getTokenString('--color-success', 'var(--green)');
	}
	if (paidPercent > 0) {
		return getTokenString('--color-warning', 'var(--warning)');
	}
	return getTokenString('--color-muted', 'var(--muted)');
}

/**
 * Определяет фоновый цвет статуса оплаты
 */
export function getPaymentStatusBgColor(paidPercent: number, isFullyPaid: boolean): string {
	if (isFullyPaid) {
		return getTokenString('--color-success-bg', 'var(--green-soft)');
	}
	if (paidPercent > 0) {
		return getTokenString('--color-warning-bg', 'var(--warning-soft)');
	}
	return getTokenString('--color-bg', 'var(--bg)');
}

/**
 * Определяет общий статус оплаты для всех работ на день
 * Возвращает: 'fully-paid' | 'partially-paid' | 'unpaid'
 */
export function getDayPaymentStatus(works: ExtraWork[]): 'fully-paid' | 'partially-paid' | 'unpaid' {
	if (works.length === 0) return 'unpaid';
	
	let hasFullyPaid = false;
	let hasUnpaid = false;
	let hasPartiallyPaid = false;
	
	for (const work of works) {
		const paidAmount = getPaidAmount(work);
		if (paidAmount >= work.totalAmount) {
			hasFullyPaid = true;
		} else if (paidAmount > 0) {
			hasPartiallyPaid = true;
		} else {
			hasUnpaid = true;
		}
	}
	
	// Если все работы полностью оплачены
	if (hasFullyPaid && !hasPartiallyPaid && !hasUnpaid) {
		return 'fully-paid';
	}
	
	// Если есть хотя бы одна неоплаченная работа
	if (hasUnpaid) {
		return 'unpaid';
	}
	
	// Если есть частично оплаченные работы
	return 'partially-paid';
}

/**
 * Получает background ячейки календаря в зависимости от состояния
 */
function getCalendarCellBackground(
	isCurrentMonth: boolean,
	isSelected: boolean,
	hasWork: boolean,
	paymentStatus?: 'fully-paid' | 'partially-paid' | 'unpaid'
): string {
	if (!isCurrentMonth) return 'var(--bg)';
	if (isSelected) return 'var(--accent)';
	if (hasWork && paymentStatus === 'fully-paid') {
		return getTokenString('--color-success-bg', 'var(--green-soft)');
	}
	if (hasWork && paymentStatus === 'partially-paid') {
		return getTokenString('--color-warning-bg', 'var(--warning-soft)');
	}
	if (hasWork) return 'var(--bg)';
	return 'var(--panel)';
}

/**
 * Получает стиль ячейки календаря в зависимости от состояния
 */
export function getCalendarCellStyle(
	isCurrentMonth: boolean,
	isSelected: boolean,
	hasWork: boolean,
	paymentStatus?: 'fully-paid' | 'partially-paid' | 'unpaid'
): React.CSSProperties {
	return {
		background: getCalendarCellBackground(isCurrentMonth, isSelected, hasWork, paymentStatus),
		cursor: isCurrentMonth ? 'pointer' : 'default',
	};
}

/**
 * Получает цвет border ячейки календаря в зависимости от статуса оплаты
 */
export function getCalendarCellBorderColor(
	isSelected: boolean,
	paymentStatus?: 'fully-paid' | 'partially-paid' | 'unpaid'
): string {
	if (isSelected) {
		return getTokenString('--color-accent', 'var(--accent)');
	}
	if (paymentStatus === 'fully-paid') {
		return getTokenString('--color-success', 'var(--green)');
	}
	if (paymentStatus === 'partially-paid') {
		return getTokenString('--color-warning', 'var(--warning)');
	}
	if (paymentStatus === 'unpaid') {
		return getTokenString('--color-muted', 'var(--muted)');
	}
	return 'var(--border-default)';
}

/**
 * Получает стиль для числа дня в календаре
 */
export function getDayNumberStyle(isToday: boolean, isCurrentMonth: boolean): React.CSSProperties {
	return {
		fontWeight: isToday 
			? getTokenString('--font-weight-bold', 'var(--font-weight-bold)')
			: getTokenString('--font-weight-semibold', 'var(--font-weight-semibold)'),
		fontSize: getTokenString('--font-size-sm', 'var(--font-size-sm)'),
		color: isToday
			? getTokenString('--color-accent', 'var(--accent)')
			: isCurrentMonth
				? getTokenString('--color-text', 'var(--text)')
				: getTokenString('--color-muted', 'var(--muted)'),
	};
}

/**
 * Получает стиль для суммы доп работы в ячейке календаря
 */
export function getWorkAmountStyle(paidPercent: number, isFullyPaid: boolean): React.CSSProperties {
	return {
		color: getPaymentStatusColor(paidPercent, isFullyPaid),
		fontWeight: getTokenString('--font-weight-semibold', 'var(--font-weight-semibold)'),
	};
}

/**
 * Форматирует tooltip для ячейки с доп работой
 */
export function formatWorkTooltip(dailyRate: number, paymentStatus: string): string {
	return `Доп работа • ${dailyRate.toLocaleString('ru-RU')}₽ за смену\nСтатус: ${paymentStatus}`;
}

