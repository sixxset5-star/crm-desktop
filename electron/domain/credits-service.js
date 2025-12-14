/**
 * Domain Service для кредитов
 * Содержит бизнес-логику расчетов аннуитетных и дифференцированных платежей
 * Умный ввод: расчет платежа, срока или суммы кредита
 */
import { createLogger } from '../services/logger.js';

const log = createLogger('CreditsService');

/**
 * Типы графика погашения
 */
export const SCHEDULE_TYPES = {
	ANNUITY: 'annuity', // Аннуитетный
	DIFFERENTIATED: 'differentiated', // Дифференцированный
};

/**
 * Статусы кредита
 */
export const CREDIT_STATUS = {
	ACTIVE: 'active',
	ARCHIVED: 'archived',
};

/**
 * Режимы умного ввода
 */
export const INPUT_MODES = {
	AMOUNT_RATE_TERM: 'amount_rate_term', // Сумма + ставка + срок → платеж
	AMOUNT_RATE_PAYMENT: 'amount_rate_payment', // Сумма + ставка + платеж → срок
	RATE_TERM_PAYMENT: 'rate_term_payment', // Ставка + срок + платеж → сумма
};

/**
 * Округление до копеек (2 знака после запятой)
 */
function roundToCents(value) {
	return Math.round(value * 100) / 100;
}

/**
 * Вычислить месячную процентную ставку из годовой
 */
function getMonthlyRate(annualRate) {
	// ВАЖНО: annualRate может быть 0 (беспроцентный кредит), поэтому проверяем != null, а не truthy
	if (annualRate == null || annualRate < 0) return 0;
	return annualRate / 12 / 100;
}

/**
 * Режим 1: Сумма + ставка + срок → ежемесячный платеж (аннуитетный)
 * Формула: A = K * (i / (1 - (1 + i)^(-n)))
 * где K - сумма кредита, i - месячная ставка, n - срок в месяцах
 */
export function calculateAnnuityPayment(amount, annualRate, termMonths) {
	log.debug('calculateAnnuityPayment called', { amount, annualRate, termMonths });
	if (!amount || amount <= 0) {
		log.warn('calculateAnnuityPayment: invalid amount', { amount });
		return null;
	}
	if (annualRate == null || annualRate < 0 || isNaN(annualRate)) {
		log.warn('calculateAnnuityPayment: invalid annualRate', { annualRate });
		return null;
	}
	if (!termMonths || termMonths <= 0) {
		log.warn('calculateAnnuityPayment: invalid termMonths', { termMonths });
		return null;
	}
	
	const monthlyRate = getMonthlyRate(annualRate);
	log.debug('calculateAnnuityPayment: monthlyRate calculated', { monthlyRate, annualRate });
	if (monthlyRate === 0) {
		const payment = roundToCents(amount / termMonths);
		log.info('calculateAnnuityPayment: interest-free loan', { amount, termMonths, payment });
		return payment; // Без процентов
	}
	
	const denominator = 1 - Math.pow(1 + monthlyRate, -termMonths);
	if (denominator === 0) return null;
	
	const payment = amount * (monthlyRate / denominator);
	return roundToCents(payment);
}

/**
 * Режим 2: Сумма + ставка + платеж → срок в месяцах (аннуитетный)
 * Обратная формула: n = -log(1 - (K * i / A)) / log(1 + i)
 */
export function calculateTermFromPayment(amount, annualRate, monthlyPayment) {
	if (!amount || amount <= 0) return null;
	if (annualRate == null || annualRate < 0 || isNaN(annualRate)) return null;
	if (!monthlyPayment || monthlyPayment <= 0) return null;
	
	const monthlyRate = getMonthlyRate(annualRate);
	if (monthlyRate === 0) {
		// Без процентов: срок = сумма / платеж
		return Math.ceil(amount / monthlyPayment);
	}
	
	const ratio = (amount * monthlyRate) / monthlyPayment;
	if (ratio >= 1) return null; // Платеж слишком мал, кредит не погасится
	
	const term = -Math.log(1 - ratio) / Math.log(1 + monthlyRate);
	return Math.ceil(term); // Округляем вверх до целого месяца
}

/**
 * Режим 3: Ставка + срок + платеж → максимальная сумма кредита (аннуитетный)
 * Обратная формула: K = A * (1 - (1 + i)^(-n)) / i
 */
export function calculateAmountFromPayment(annualRate, termMonths, monthlyPayment) {
	if (annualRate == null || annualRate < 0 || isNaN(annualRate)) return null;
	if (!termMonths || termMonths <= 0) return null;
	if (!monthlyPayment || monthlyPayment <= 0) return null;
	
	const monthlyRate = getMonthlyRate(annualRate);
	if (monthlyRate === 0) {
		// Без процентов: сумма = платеж * срок
		return roundToCents(monthlyPayment * termMonths);
	}
	
	const numerator = 1 - Math.pow(1 + monthlyRate, -termMonths);
	const amount = (monthlyPayment * numerator) / monthlyRate;
	return roundToCents(amount);
}

/**
 * Построить аннуитетный график платежей
 * Платеж постоянный, но структура "проценты/тело" меняется
 */
export function buildAnnuitySchedule(params) {
	const { amount, annualRate, termMonths, startDate, paymentDay } = params;
	
	log.info('buildAnnuitySchedule called', {
		amount,
		annualRate,
		annualRateType: typeof annualRate,
		termMonths,
		startDate,
		paymentDay,
		paymentDayType: typeof paymentDay,
	});
	
	if (!amount || amount <= 0) {
		log.warn('buildAnnuitySchedule: invalid amount', { amount });
		return [];
	}
	// ВАЖНО: annualRate может быть 0 (беспроцентный кредит), поэтому проверяем != null, а не truthy
	if (annualRate == null || annualRate < 0) {
		log.warn('buildAnnuitySchedule: invalid annualRate', { annualRate });
		return [];
	}
	if (!termMonths || termMonths <= 0) {
		log.warn('buildAnnuitySchedule: invalid termMonths', { termMonths });
		return [];
	}
	if (!startDate) {
		log.warn('buildAnnuitySchedule: invalid startDate', { startDate });
		return [];
	}
	
	const monthlyRate = getMonthlyRate(annualRate);
	const monthlyPayment = calculateAnnuityPayment(amount, annualRate, termMonths);
	log.info('buildAnnuitySchedule: calculated payment', {
		monthlyRate,
		monthlyPayment,
		monthlyPaymentType: typeof monthlyPayment,
		monthlyPaymentIsNull: monthlyPayment === null,
		monthlyPaymentIsUndefined: monthlyPayment === undefined,
		monthlyPaymentIsZero: monthlyPayment === 0,
		monthlyPaymentIsFalsy: !monthlyPayment,
	});
	// ВАЖНО: monthlyPayment может быть 0 только если amount = 0, что уже проверено выше
	// Но проверяем на null/undefined, а не на falsy, чтобы не блокировать валидные значения
	if (monthlyPayment === null || monthlyPayment === undefined) {
		log.warn('buildAnnuitySchedule: monthlyPayment is null/undefined', {
			amount,
			annualRate,
			termMonths,
			monthlyRate,
		});
		return [];
	}
	if (monthlyPayment <= 0) {
		log.warn('buildAnnuitySchedule: monthlyPayment is <= 0', {
			amount,
			annualRate,
			termMonths,
			monthlyRate,
			monthlyPayment,
		});
		return [];
	}
	
	const schedule = [];
	let remainingBalance = amount;
	const start = new Date(startDate);
	// ВАЖНО: paymentDay может быть строкой или числом, преобразуем в число
	const paymentDayNum = paymentDay != null ? (typeof paymentDay === 'string' ? parseInt(paymentDay, 10) : paymentDay) : null;
	
	for (let monthNum = 1; monthNum <= termMonths; monthNum++) {
		// Вычисляем дату платежа (фиксированное число месяца)
		const paymentDate = new Date(start);
		paymentDate.setMonth(start.getMonth() + monthNum - 1);
		paymentDate.setDate(paymentDayNum && paymentDayNum >= 1 && paymentDayNum <= 31 ? paymentDayNum : start.getDate());
		
		// Для последнего платежа корректируем, чтобы остаток стал 0
		const isLastMonth = monthNum === termMonths;
		
		// Проценты = остаток * месячная ставка
		let interestPart = roundToCents(remainingBalance * monthlyRate);
		
		// Погашение тела = платеж - проценты
		let principalPart = roundToCents(monthlyPayment - interestPart);
		
		// Остаток после платежа
		let newBalance = roundToCents(remainingBalance - principalPart);
		
		// Для последнего месяца корректируем, чтобы остаток стал 0
		if (isLastMonth && newBalance !== 0) {
			// Корректируем платеж так, чтобы остаток стал 0
			const adjustment = newBalance;
			principalPart = roundToCents(principalPart + adjustment);
			newBalance = 0;
		}
		
		const actualPayment = roundToCents(interestPart + principalPart);
		
		schedule.push({
			monthNumber: monthNum,
			paymentDate: paymentDate.toISOString().split('T')[0],
			plannedPayment: actualPayment,
			interestPart,
			principalPart,
			remainingBalance: newBalance,
			paid: false,
			paidAmount: null,
			paidAt: null,
		});
		
		remainingBalance = newBalance;
		
		// Если остаток стал 0 или меньше, прекращаем
		if (remainingBalance <= 0) break;
	}
	
	log.info('buildAnnuitySchedule: schedule built', {
		itemsCount: schedule.length,
		amount,
		annualRate,
		termMonths,
		monthlyPayment,
		firstItem: schedule[0],
		lastItem: schedule[schedule.length - 1],
	});
	
	return schedule;
}

/**
 * Построить дифференцированный график платежей
 * Ежемесячная часть тела долга фиксирована, проценты уменьшаются
 */
export function buildDifferentiatedSchedule(params) {
	const { amount, annualRate, termMonths, startDate, paymentDay } = params;
	
	if (!amount || amount <= 0) return [];
	// ВАЖНО: annualRate может быть 0 (беспроцентный кредит), поэтому проверяем != null, а не truthy
	if (annualRate == null || annualRate < 0) return [];
	if (!termMonths || termMonths <= 0) return [];
	if (!startDate) return [];
	
	const monthlyRate = getMonthlyRate(annualRate);
	const fixedPrincipalPart = roundToCents(amount / termMonths); // Фиксированная часть тела
	
	const schedule = [];
	let remainingBalance = amount;
	const start = new Date(startDate);
	// ВАЖНО: paymentDay может быть строкой или числом, преобразуем в число
	const paymentDayNum = paymentDay != null ? (typeof paymentDay === 'string' ? parseInt(paymentDay, 10) : paymentDay) : null;
	
	for (let monthNum = 1; monthNum <= termMonths; monthNum++) {
		// Вычисляем дату платежа
		const paymentDate = new Date(start);
		paymentDate.setMonth(start.getMonth() + monthNum - 1);
		paymentDate.setDate(paymentDayNum && paymentDayNum >= 1 && paymentDayNum <= 31 ? paymentDayNum : start.getDate());
		
		const isLastMonth = monthNum === termMonths;
		
		// Проценты = остаток * месячная ставка
		let interestPart = roundToCents(remainingBalance * monthlyRate);
		
		// Погашение тела (для последнего месяца может быть меньше)
		let principalPart = isLastMonth 
			? remainingBalance // Последний месяц: погашаем весь остаток
			: fixedPrincipalPart;
		
		principalPart = roundToCents(principalPart);
		
		// Платеж = проценты + погашение тела
		const payment = roundToCents(interestPart + principalPart);
		
		// Остаток после платежа
		let newBalance = roundToCents(remainingBalance - principalPart);
		
		// Для последнего месяца корректируем до 0
		if (isLastMonth && newBalance !== 0) {
			principalPart = roundToCents(principalPart + newBalance);
			newBalance = 0;
		}
		
		schedule.push({
			monthNumber: monthNum,
			paymentDate: paymentDate.toISOString().split('T')[0],
			plannedPayment: roundToCents(interestPart + principalPart),
			interestPart,
			principalPart,
			remainingBalance: newBalance,
			paid: false,
			paidAmount: null,
			paidAt: null,
		});
		
		remainingBalance = newBalance;
		
		// Если остаток стал 0 или меньше, прекращаем
		if (remainingBalance <= 0) break;
	}
	
	return schedule;
}

/**
 * Построить график платежей в зависимости от типа
 */
export function buildSchedule(params) {
	const { scheduleType, ...rest } = params;
	
	// ВАЖНО: Нормализуем параметры - преобразуем строки в числа
	const normalizedParams = {
		...rest,
		amount: typeof rest.amount === 'string' ? parseFloat(rest.amount) : rest.amount,
		annualRate: typeof rest.annualRate === 'string' ? parseFloat(rest.annualRate) : rest.annualRate,
		termMonths: typeof rest.termMonths === 'string' ? parseInt(rest.termMonths, 10) : rest.termMonths,
		startDate: typeof rest.startDate === 'string' ? rest.startDate : String(rest.startDate),
		paymentDay: rest.paymentDay != null ? (typeof rest.paymentDay === 'string' ? parseInt(rest.paymentDay, 10) : rest.paymentDay) : undefined,
	};
	
	log.info('buildSchedule called', {
		scheduleType,
		originalParams: rest,
		normalizedParams,
	});
	
	let schedule;
	if (scheduleType === SCHEDULE_TYPES.DIFFERENTIATED) {
		schedule = buildDifferentiatedSchedule(normalizedParams);
	} else {
		// По умолчанию аннуитетный
		schedule = buildAnnuitySchedule(normalizedParams);
	}
	
	log.info('buildSchedule: result', {
		scheduleType,
		itemsCount: schedule.length,
		firstItem: schedule[0],
		lastItem: schedule[schedule.length - 1],
	});
	
	return schedule;
}

/**
 * Применить оплату по строке графика
 * Обновляет остаток долга кредита на основе оплаченных строк
 */
export function applyPayment(schedule, itemIndex, paidAmount = null) {
	if (!schedule || !Array.isArray(schedule)) return schedule;
	if (itemIndex < 0 || itemIndex >= schedule.length) return schedule;
	
	const item = schedule[itemIndex];
	const newSchedule = [...schedule];
	
	// Если оплата применяется
	if (!item.paid) {
		newSchedule[itemIndex] = {
			...item,
			paid: true,
			paidAmount: paidAmount != null ? roundToCents(paidAmount) : item.plannedPayment,
			paidAt: new Date().toISOString().split('T')[0],
		};
	} else {
		// Откат оплаты
		newSchedule[itemIndex] = {
			...item,
			paid: false,
			paidAmount: null,
			paidAt: null,
		};
	}
	
	return newSchedule;
}

/**
 * Пересчитать текущий остаток долга на основе оплаченных строк
 * ВАЖНО: current_balance обновляется только через эту функцию
 */
export function recalculateCurrentBalance(credit, schedule) {
	if (!credit || !schedule) return credit.amount || 0;
	
	// Начальный остаток = сумма кредита
	let balance = credit.amount || 0;
	
	// Вычитаем погашение тела по всем оплаченным строкам
	// Сортируем по month_number, чтобы учитывать в правильном порядке
	const sortedSchedule = [...schedule].sort((a, b) => a.monthNumber - b.monthNumber);
	
	for (const item of sortedSchedule) {
		if (item.paid && item.principalPart) {
			balance = roundToCents(balance - item.principalPart);
		}
	}
	
	return Math.max(0, balance);
}

/**
 * Перестроить график после изменения параметров кредита
 * ВАЖНО: Все paid строки остаются paid, остаток пересчитывается корректно
 */
export function rebuildAfterChange(params) {
	const { credit, schedule, newParams } = params;
	
	if (!credit || !schedule) return [];
	
	// Сохраняем информацию о paid строках
	const paidItems = new Map();
	for (const item of schedule) {
		if (item.paid) {
			paidItems.set(item.monthNumber, {
				paid: true,
				paidAmount: item.paidAmount || item.plannedPayment,
				paidAt: item.paidAt || new Date().toISOString().split('T')[0],
			});
		}
	}
	
	// Строим новый график с новыми параметрами
	// ВАЖНО: credit.interestRate - это годовая ставка (annualRate в domain)
	const newSchedule = buildSchedule({
		scheduleType: newParams.scheduleType || credit.scheduleType || 'annuity',
		amount: newParams.amount || credit.amount,
		annualRate: newParams.annualRate || credit.interestRate, // interestRate в БД = annualRate в domain
		termMonths: newParams.termMonths || credit.termMonths,
		startDate: newParams.startDate || credit.startDate,
		paymentDay: newParams.paymentDay || (credit.paymentDate ? parseInt(credit.paymentDate) : undefined),
	});
	
	// Восстанавливаем paid статусы для соответствующих месяцев
	// ВАЖНО: Если месяц изменился, paid статус может не совпадать - это нормально
	const restoredSchedule = newSchedule.map(item => {
		const paidInfo = paidItems.get(item.monthNumber);
		if (paidInfo) {
			return {
				...item,
				paid: true,
				paidAmount: paidInfo.paidAmount,
				paidAt: paidInfo.paidAt,
			};
		}
		return item;
	});
	
	return restoredSchedule;
}

/**
 * Вычислить итоговые показатели по кредиту
 */
export function calculateCreditSummary(credit, schedule) {
	if (!credit || !schedule) {
		return {
			totalInterestPaid: 0,
			totalPaid: 0,
			actualPaid: 0,
			currentBalance: credit?.amount || 0,
			monthsRemaining: 0,
		};
	}
	
	let totalInterestPaid = 0;
	let totalPaid = 0;
	let actualPaid = 0;
	let currentBalance = credit.amount || 0;
	
	for (const item of schedule) {
		totalInterestPaid += item.interestPart || 0;
		totalPaid += item.plannedPayment || 0;
		
		if (item.paid) {
			actualPaid += item.paidAmount || item.plannedPayment || 0;
			currentBalance = roundToCents(currentBalance - (item.principalPart || 0));
		}
	}
	
	// Количество месяцев до завершения (по неоплаченным строкам)
	const unpaidItems = schedule.filter(item => !item.paid);
	const monthsRemaining = unpaidItems.length;
	
	return {
		totalInterestPaid: roundToCents(totalInterestPaid),
		totalPaid: roundToCents(totalPaid),
		actualPaid: roundToCents(actualPaid),
		currentBalance: Math.max(0, roundToCents(currentBalance)),
		monthsRemaining,
	};
}

/**
 * Получить ближайшие предстоящие платежи для напоминаний
 */
export function getUpcomingPayments(credits, scheduleMap, daysAhead = 7) {
	if (!credits || !Array.isArray(credits)) return [];
	
	const now = new Date();
	now.setHours(0, 0, 0, 0);
	const futureDate = new Date(now);
	futureDate.setDate(now.getDate() + daysAhead);
	
	const upcoming = [];
	
	for (const credit of credits) {
		if (credit.status !== CREDIT_STATUS.ACTIVE) continue;
		
		const schedule = scheduleMap?.[credit.id] || [];
		
		for (const item of schedule) {
			if (item.paid) continue;
			
			const paymentDate = new Date(item.paymentDate);
			paymentDate.setHours(0, 0, 0, 0);
			
			if (paymentDate >= now && paymentDate <= futureDate) {
				upcoming.push({
					creditId: credit.id,
					creditName: credit.name,
					paymentDate: item.paymentDate,
					amount: item.plannedPayment,
					monthNumber: item.monthNumber,
				});
			}
		}
	}
	
	// Сортируем по дате
	upcoming.sort((a, b) => new Date(a.paymentDate) - new Date(b.paymentDate));
	
	return upcoming;
}

