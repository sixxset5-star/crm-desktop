// Domain слой для Task - бизнес-логика работы с задачами
import type { Task, TaskPayment, TaskExpenseEntry, TaskPausedRange } from '@/types';
import { createLogger } from '@/shared/lib/logger';

const log = createLogger('TaskDomain');

/**
 * Рассчитывает прибыль задачи (amount - expenses - tax)
 * 
 * @param task - Задача для расчета
 * @returns Прибыль задачи (сумма - расходы - налог)
 * 
 * @example
 * const profit = calculateTaskProfit({
 *   amount: 10000,
 *   expenses: 2000,
 *   taxRate: 6
 * }); // 7400 (10000 - 2000 - 600)
 */
export function calculateTaskProfit(task: Task): number {
	const amount = task.amount || 0;
	const expenses = task.expenses || 0;
	const taxRate = task.taxRate || 0;
	
	const taxAmount = (amount * taxRate) / 100;
	return amount - expenses - taxAmount;
}

/**
 * Рассчитывает общую сумму оплат из массива платежей
 * Учитывает amount или qty * price
 * 
 * @param payments - Массив платежей
 * @returns Общая сумма всех платежей
 * 
 * @example
 * const total = calculateTotalPayments([
 *   { amount: 1000 },
 *   { qty: 5, price: 200 }
 * ]); // 2000
 */
export function calculateTotalPayments(payments: TaskPayment[] = []): number {
	return payments.reduce((sum, payment) => {
		if (payment.amount) {
			return sum + payment.amount;
		}
		if (payment.qty && payment.price) {
			return sum + payment.qty * payment.price;
		}
		return sum;
	}, 0);
}

/**
 * Рассчитывает общую сумму расходов из массива записей расходов
 * 
 * @param expenses - Массив записей расходов
 * @returns Общая сумма всех расходов
 * 
 * @example
 * const total = calculateTotalExpenses([
 *   { amount: 500 },
 *   { amount: 300 }
 * ]); // 800
 */
export function calculateTotalExpenses(expenses: TaskExpenseEntry[] = []): number {
	return expenses.reduce((sum, expense) => sum + (expense.amount || 0), 0);
}

/**
 * Проверяет, можно ли архивировать задачу
 * Задача может быть архивирована, если она закрыта или отменена
 * 
 * @param task - Задача для проверки
 * @returns true, если задачу можно архивировать
 * 
 * @example
 * canTaskBeArchived({ columnId: 'closed' }) // true
 * canTaskBeArchived({ columnId: 'inprogress' }) // false
 */
export function canTaskBeArchived(task: Task): boolean {
	// Задача может быть архивирована, если она закрыта или отменена
	return task.columnId === 'closed' || task.columnId === 'cancelled';
}

/**
 * Проверяет, полностью ли оплачена задача
 * Сравнивает общую сумму платежей с суммой задачи
 * 
 * @param task - Задача для проверки
 * @returns true, если сумма платежей >= суммы задачи
 * 
 * @example
 * isTaskFullyPaid({ amount: 1000, payments: [{ amount: 1000 }] }) // true
 * isTaskFullyPaid({ amount: 1000, payments: [{ amount: 500 }] }) // false
 */
export function isTaskFullyPaid(task: Task): boolean {
	const amount = task.amount || 0;
	const totalPayments = calculateTotalPayments(task.payments);
	return totalPayments >= amount;
}

/**
 * Рассчитывает остаток к оплате задачи
 * 
 * @param task - Задача для расчета
 * @returns Остаток к оплате (сумма задачи - сумма платежей), минимум 0
 * 
 * @example
 * calculateRemainingPayment({ amount: 1000, payments: [{ amount: 300 }] }) // 700
 * calculateRemainingPayment({ amount: 1000, payments: [{ amount: 1500 }] }) // 0
 */
export function calculateRemainingPayment(task: Task): number {
	const amount = task.amount || 0;
	const totalPayments = calculateTotalPayments(task.payments);
	return Math.max(0, amount - totalPayments);
}

/**
 * Рассчитывает чистую прибыль задачи с учетом всех оплат и расходов
 * Учитывает налоги от суммы оплат
 * 
 * @param task - Задача для расчета
 * @returns Чистая прибыль (сумма оплат - расходы - налоги)
 * 
 * @example
 * const profit = calculateNetProfit({
 *   payments: [{ amount: 10000 }],
 *   expensesEntries: [{ amount: 2000 }],
 *   taxRate: 6
 * }); // 7400 (10000 - 2000 - 600)
 */
export function calculateNetProfit(task: Task): number {
	const totalPayments = calculateTotalPayments(task.payments);
	const totalExpenses = calculateTotalExpenses(task.expensesEntries);
	const taxRate = task.taxRate || 0;
	
	const taxAmount = (totalPayments * taxRate) / 100;
	return totalPayments - totalExpenses - taxAmount;
}

/**
 * Нормализует строку даты (YYYY-MM-DD или ISO) в объект Date без времени.
 * Используем только часть даты, чтобы не ловить проблемы с часовыми поясами.
 */
function toDateOnly(value?: string | null): Date | null {
	if (!value) return null;
	// Берём только YYYY-MM-DD, если это ISO с временем
	const datePart = value.split('T')[0] || value;
	const [yearStr, monthStr, dayStr] = datePart.split('-');
	const year = Number(yearStr);
	const month = Number(monthStr);
	const day = Number(dayStr);
	if (!year || !month || !day) return null;
	const d = new Date(year, month - 1, day);
	if (Number.isNaN(d.getTime())) return null;
	return d;
}

/**
 * Проверяет, пересекаются ли два интервала дат [startA, endA] и [startB, endB] (включительно)
 */
function rangesOverlap(startA: Date, endA: Date, startB: Date, endB: Date): boolean {
	return startA <= endB && endA >= startB;
}

/**
 * Строит активные интервалы задачи: интервал жизни минус интервалы пауз
 * Интервал жизни определяется как startDate-deadline или createdAt-deadline
 * Из него вычитаются все интервалы пауз (pausedRanges)
 * 
 * @param task - Задача для расчета активных интервалов
 * @returns Массив активных интервалов { start, end }
 * 
 * @example
 * const ranges = getTaskActiveRanges({
 *   startDate: '2024-01-01',
 *   deadline: '2024-01-31',
 *   pausedRanges: [{ from: '2024-01-10', to: '2024-01-15' }]
 * });
 * // Результат: [{ start: Date(2024-01-01), end: Date(2024-01-09) }, { start: Date(2024-01-16), end: Date(2024-01-31) }]
 */
export function getTaskActiveRanges(task: Task): { start: Date; end: Date }[] {
	const lifeStart =
		toDateOnly(task.startDate) ??
		toDateOnly(task.createdAt) ??
		null;
	const lifeEnd =
		toDateOnly(task.deadline) ??
		toDateOnly(task.updatedAt) ??
		toDateOnly(task.startDate) ??
		toDateOnly(task.createdAt) ??
		null;

	if (!lifeStart || !lifeEnd) return [];

	// Гарантируем, что start <= end
	const start = lifeStart <= lifeEnd ? lifeStart : lifeEnd;
	const end = lifeEnd >= lifeStart ? lifeEnd : lifeStart;

	const pauses: TaskPausedRange[] = Array.isArray(task.pausedRanges) ? task.pausedRanges : [];

	// Если пауз нет, возвращаем один сплошной интервал жизни
	if (pauses.length === 0) {
		return [{ start, end }];
	}

	// Нормализуем и сортируем паузы по началу
	const normalizedPauses = pauses
		.map((p) => {
			const from = toDateOnly(p.from);
			const to = toDateOnly(p.to);
			if (!from || !to) return null;
			const pStart = from <= to ? from : to;
			const pEnd = to >= from ? to : from;
			return { start: pStart, end: pEnd };
		})
		.filter((p): p is { start: Date; end: Date } => !!p)
		// Оставляем только те паузы, что пересекаются с жизненным интервалом задачи
		.filter((p) => rangesOverlap(p.start, p.end, start, end))
		.sort((a, b) => a.start.getTime() - b.start.getTime());

	if (normalizedPauses.length === 0) {
		return [{ start, end }];
	}

	const result: { start: Date; end: Date }[] = [];
	let currentStart = start;

	for (const pause of normalizedPauses) {
		// Если пауза начинается после текущего старта, то до неё есть активный интервал
		if (pause.start > currentStart) {
			const activeEnd = new Date(Math.min(pause.start.getTime() - 24 * 60 * 60 * 1000, end.getTime()));
			if (activeEnd >= currentStart) {
				result.push({ start: currentStart, end: activeEnd });
			}
		}

		// Смещаем текущий старт на день после конца паузы
		const nextStart = new Date(pause.end.getFullYear(), pause.end.getMonth(), pause.end.getDate() + 1);
		if (nextStart > end) {
			// Дальше все дни вне жизненного интервала
			return result;
		}
		if (nextStart > currentStart) {
			currentStart = nextStart;
		}
	}

	// После последней паузы может остаться хвост активных дней
	if (currentStart <= end) {
		result.push({ start: currentStart, end });
	}

	return result;
}

/**
 * Проверяет, была ли задача активна (не на паузе) в заданном месяце
 * Учитывает активные интервалы задачи и исключает периоды пауз
 * 
 * @param task - Задача для проверки
 * @param monthDate - Любая дата внутри интересующего месяца
 * @returns true, если задача была активна в указанном месяце
 * 
 * @example
 * const isActive = isTaskActiveInMonth(task, new Date(2024, 0, 15)); // Проверка января 2024
 */
export function isTaskActiveInMonth(task: Task, monthDate: Date): boolean {
	const year = monthDate.getFullYear();
	const month = monthDate.getMonth();
	const monthStart = new Date(year, month, 1);
	const monthEnd = new Date(year, month + 1, 0);

	const activeRanges = getTaskActiveRanges(task);
	if (activeRanges.length === 0) return false;

	return activeRanges.some((range) => rangesOverlap(range.start, range.end, monthStart, monthEnd));
}

/**
 * Рассчитывает итоговую сумму платежей из массива платежей
 * Учитывает calcEnabled: если включен, использует qty * price, иначе amount
 * 
 * @param payments - Массив платежей
 * @returns Общая сумма платежей
 * 
 * @example
 * const total = calculatePaymentsTotal([
 *   { calcEnabled: true, qty: 5, price: 200 },
 *   { amount: 1000 }
 * ]); // 2000
 */
export function calculatePaymentsTotal(payments: TaskPayment[] = []): number {
	return payments.reduce((sum, p) => {
		if (p.calcEnabled && p.qty != null && p.price != null) {
			return sum + (p.qty * p.price);
		} else if (p.amount != null) {
			return sum + p.amount;
		}
		return sum;
	}, 0);
}

/**
 * Рассчитывает сумму только оплаченных платежей
 * Фильтрует платежи по флагу paid и суммирует их
 * 
 * @param payments - Массив платежей
 * @returns Сумма оплаченных платежей
 * 
 * @example
 * const paid = calculatePaidPaymentsTotal([
 *   { paid: true, amount: 1000 },
 *   { paid: false, amount: 500 },
 *   { paid: true, qty: 2, price: 300 }
 * ]); // 1600
 */
export function calculatePaidPaymentsTotal(payments: TaskPayment[] = []): number {
	return payments
		.filter((p) => p.paid)
		.reduce((sum, p) => {
			const amount = p.amount != null ? p.amount : ((p.qty || 0) * (p.price || 0));
			return sum + (amount || 0);
		}, 0);
}

/**
 * Нормализует платежи для сохранения
 * Вычисляет amount из qty*price если есть калькулятор
 * Фильтрует пустые платежи (сохраняет только с суммой, калькулятором, датой, названием или оплаченные)
 * 
 * @param payments - Массив платежей для нормализации
 * @returns Нормализованный массив платежей
 * 
 * @example
 * const normalized = normalizePaymentsForSave([
 *   { calcEnabled: true, qty: 5, price: 200 },
 *   { amount: 0, paid: false } // Будет отфильтрован
 * ]);
 */
export function normalizePaymentsForSave(payments: TaskPayment[]): TaskPayment[] {
	return payments
		.map((p) => {
			// Вычисляем сумму платежа: если есть калькулятор, используем qty*price, иначе amount
			const paymentAmount = (p.qty != null && p.price != null) ? (p.qty * p.price) : p.amount;
			const result = {
				title: p.title,
				date: p.date,
				paid: p.paid,
				taxRate: p.taxRate,
				calcEnabled: p.calcEnabled,
				...(p.qty != null && p.price != null
					? { qty: p.qty, price: p.price }
					: { amount: paymentAmount }
				),
			};
			// Отладочное логирование для последнего платежа
			if (p.title && p.title.includes('PDF')) {
				log.debug('normalizePaymentsForSave - Processing payment', {
					title: p.title,
					originalAmount: p.amount,
					originalQty: p.qty,
					originalPrice: p.price,
					paymentAmount,
					result,
				});
			}
			return result;
		})
		.filter((p) => {
			// Фильтруем только полностью пустые платежи
			// Платеж сохраняется, если:
			// 1. У него есть сумма (> 0) ИЛИ
			// 2. Есть калькулятор (qty > 0 и price > 0) ИЛИ
			// 3. Платеж помечен как оплаченный (paid: true) - это важно для истории платежей ИЛИ
			// 4. У платежа есть дата (date) - сохраняем платежи с датой, даже если сумма 0 ИЛИ
			// 5. У платежа есть название (title) - сохраняем платежи с названием, даже если сумма 0
			const hasAmount = p.amount != null && p.amount > 0;
			const hasCalc = p.qty != null && p.price != null && p.qty > 0 && p.price > 0;
			const isPaid = p.paid === true; // Сохраняем оплаченные платежи даже с нулевой суммой
			const hasDate = p.date != null && p.date.trim().length > 0; // Сохраняем платежи с датой
			const hasTitle = p.title != null && p.title.trim().length > 0; // Сохраняем платежи с названием
			const shouldKeep = hasAmount || hasCalc || isPaid || hasDate || hasTitle;
			// Отладочное логирование для последнего платежа
			if (!shouldKeep && p.title) {
				log.warn('normalizePaymentsForSave - Filtering out payment', {
					title: p.title,
					amount: p.amount,
					qty: p.qty,
					price: p.price,
					paid: p.paid,
					date: p.date,
					hasAmount,
					hasCalc,
					isPaid,
					hasDate,
					hasTitle,
				});
			}
			return shouldKeep;
		});
}

/**
 * Валидирует задачу перед сохранением
 * Проверяет обязательные поля, корректность дат и платежей
 * 
 * @param task - Частичная задача для валидации
 * @returns Объект с флагом валидности и словарем ошибок
 * 
 * @example
 * const result = validateTask({ title: '', amount: -100 });
 * if (!result.valid) {
 *   console.log(result.errors); // { title: '...', amount: '...' }
 * }
 */
export function validateTask(task: Partial<Task>): { valid: boolean; errors: Record<string, string> } {
	const errors: Record<string, string> = {};

	if (!task.title || !task.title.trim()) {
		errors.title = 'Название задачи обязательно';
	}

	if (task.amount !== undefined) {
		const amountNum = Number(task.amount);
		if (isNaN(amountNum) || amountNum < 0) {
			errors.amount = 'Бюджет не может быть отрицательным';
		}
	}

	if (task.deadline) {
		const deadlineDate = new Date(task.deadline);
		if (isNaN(deadlineDate.getTime())) {
			errors.deadline = 'Некорректная дата окончания';
		}
	}

	if (task.startDate) {
		const startDateObj = new Date(task.startDate);
		if (isNaN(startDateObj.getTime())) {
			errors.startDate = 'Некорректная дата начала';
		}
	}

	if (task.startDate && task.deadline) {
		const startDateObj = new Date(task.startDate);
		const deadlineDate = new Date(task.deadline);
		if (startDateObj > deadlineDate) {
			errors.dateOrder = 'Дата начала не может быть позже даты окончания';
		}
	}

	// Валидация платежей
	if (task.payments && task.payments.length > 0) {
		task.payments.forEach((p, idx) => {
			if (p.paid && !p.date) {
				errors[`payments_${idx}_date`] = 'Дата обязательна для оплаченного платежа';
			}
			if (p.calcEnabled) {
				const qty = p.qty ?? 0;
				const price = p.price ?? 0;
				if (qty <= 0 || price <= 0) {
					errors[`payments_${idx}_calc`] = 'Количество и цена должны быть больше 0';
				}
			}
		});
	}

	return {
		valid: Object.keys(errors).length === 0,
		errors,
	};
}

/**
 * Подготавливает данные задачи для сохранения
 * Вычисляет итоговые суммы, нормализует платежи и расходы
 * Преобразует данные формы в формат задачи
 * 
 * @param formData - Данные формы задачи
 * @returns Частичная задача, готовая для сохранения
 * 
 * @example
 * const task = prepareTaskForSave({
 *   title: 'Задача',
 *   amount: '1000',
 *   payments: [...],
 *   expensesItems: [...]
 * });
 */
export function prepareTaskForSave(formData: {
	title: string;
	amount?: string | number;
	payments: TaskPayment[];
	expensesItems: Array<{ id: string; title: string; amount: number; date?: string; contractorId?: string }>;
	deadline?: string;
	startDate?: string;
	notes?: string;
	customerId?: string;
	contractorId?: string;
	pausedRanges?: TaskPausedRange[];
	tags?: string[];
	links?: TaskLink[];
	files?: string[];
	useCalculator?: boolean;
	calculatorQuantity?: string | number;
	calculatorPricePerUnit?: string | number;
	priority?: Task['priority'];
	accesses?: Array<{ label: string; login: string; password: string }>;
}): Partial<Task> {
	const paymentsTotal = calculatePaymentsTotal(formData.payments);
	const expensesTotal = formData.expensesItems.reduce((sum, it) => sum + (it.amount || 0), 0);
	const totalPaid = calculatePaidPaymentsTotal(formData.payments);

	log.debug('prepareTaskForSave - Input payments', { 
		count: formData.payments.length, 
		payments: formData.payments.map(p => ({ title: p.title, amount: p.amount, qty: p.qty, price: p.price })) 
	});
	const finalPayments = normalizePaymentsForSave(formData.payments);
	log.debug('prepareTaskForSave - Final payments after normalizePaymentsForSave', { 
		count: finalPayments.length, 
		payments: finalPayments.map(p => ({ title: p.title, amount: p.amount, qty: p.qty, price: p.price })) 
	});

	return {
		title: formData.title.trim(),
		amount: paymentsTotal > 0 ? paymentsTotal : (formData.amount ? Number(formData.amount) : undefined),
		deadline: formData.deadline || undefined,
		startDate: formData.startDate || undefined,
		expenses: expensesTotal > 0 ? expensesTotal : undefined,
		paidAmount: totalPaid > 0 ? totalPaid : undefined,
		notes: formData.notes || undefined,
		customerId: formData.customerId || undefined,
		payments: finalPayments.length > 0 ? finalPayments : undefined,
		pausedRanges: formData.pausedRanges && formData.pausedRanges.length > 0 
			? formData.pausedRanges.filter(r => r.from && r.to) 
			: undefined,
		expensesEntries: formData.expensesItems.length > 0 
			? formData.expensesItems.map(it => ({ id: it.id, title: it.title, amount: it.amount, date: it.date, contractorId: it.contractorId })) 
			: undefined,
		contractorId: formData.contractorId || undefined,
		tags: formData.tags && formData.tags.length > 0 ? formData.tags : undefined,
		links: formData.links && formData.links.length > 0 ? formData.links : undefined,
		files: formData.files && formData.files.length > 0 ? formData.files : undefined,
		calculatorQuantity: formData.useCalculator && formData.calculatorQuantity 
			? Number(formData.calculatorQuantity) 
			: undefined,
		calculatorPricePerUnit: formData.useCalculator && formData.calculatorPricePerUnit 
			? Number(formData.calculatorPricePerUnit) 
			: undefined,
		priority: formData.priority,
		accesses: formData.accesses && formData.accesses.length > 0 
			? formData.accesses.filter(a => a.label.trim() && (a.login.trim() || a.password.trim()))
			: undefined,
	};
}

/**
 * Получает информацию о платежах задачи
 * Учитывает payments, subtasks с amount+date, и старое поле paidAmount
 * Приоритет: subtasks > payments > paidAmount
 * 
 * @param task - Задача для анализа платежей
 * @returns Объект с общей оплатой, флагом полной оплаты и датой последнего платежа
 * 
 * @example
 * const info = getTaskPaymentInfo(task);
 * console.log(info.totalPaid); // Общая оплата
 * console.log(info.isFullyPaid); // Полностью ли оплачена
 * console.log(info.lastPaymentDate); // Дата последнего платежа
 */
export function getTaskPaymentInfo(task: Task): {
	totalPaid: number;
	isFullyPaid: boolean;
	lastPaymentDate: Date | null;
} {
	let totalPaidFromSubtasks = 0;
	let lastPaymentDate: Date | null = null;

	// Считаем из подзадач (subtasks с amount и date)
	if (task.subtasks && task.subtasks.length > 0) {
		for (const s of task.subtasks) {
			const amount = s.amount || 0;
			if (amount > 0 && s.date && s.date.trim()) {
				totalPaidFromSubtasks += amount;
				const d = toDateOnly(s.date);
				if (d && (!lastPaymentDate || d > lastPaymentDate)) {
					lastPaymentDate = d;
				}
			}
		}
	}

	// Считаем из payments (только оплаченные с датой)
	let totalPaidFromPayments = 0;
	const hasPayments = !!(task.payments && task.payments.length > 0);
	if (hasPayments) {
		for (const p of task.payments!) {
			if (!p?.paid || !p.date || !p.date.trim()) continue;
			const d = toDateOnly(p.date);
			if (!d) continue;
			const amount = p.amount != null ? p.amount : ((p.qty || 0) * (p.price || 0));
			if (amount && amount > 0) {
				totalPaidFromPayments += amount;
				if (!lastPaymentDate || d > lastPaymentDate) {
					lastPaymentDate = d;
				}
			}
		}
	}

	// Итоговая оплата: приоритет подзадачам, потом payments, потом старое поле paidAmount
	const totalPaid = totalPaidFromSubtasks > 0
		? totalPaidFromSubtasks
		: hasPayments
			? totalPaidFromPayments
			: (task.paidAmount || 0);

	const isFullyPaid = task.amount != null && totalPaid >= task.amount;

	return { totalPaid, isFullyPaid, lastPaymentDate };
}



