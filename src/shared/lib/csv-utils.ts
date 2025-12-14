import type { Task, ColumnId, TaskPriority } from '@/types';
import type { Customer } from '@/types';
import type { Credit } from '@/store/goals';

/**
 * Экранирует значение для безопасной записи в CSV
 * Оборачивает значение в кавычки, если оно содержит специальные символы
 * 
 * @param value - Значение для экранирования
 * @returns Экранированная строка для CSV
 * 
 * @example
 * escapeCsvValue('Простая строка') // 'Простая строка'
 * escapeCsvValue('Строка, с запятой') // '"Строка, с запятой"'
 * escapeCsvValue('Строка с "кавычками"') // '"Строка с ""кавычками"""'
 */
function escapeCsvValue(value: unknown): string {
	if (value === null || value === undefined) return '';
	const str = String(value);
	// Если значение содержит запятую, кавычки или перенос строки, оборачиваем в кавычки
	if (str.includes(',') || str.includes('"') || str.includes('\n')) {
		return `"${str.replace(/"/g, '""')}"`;
	}
	return str;
}

/**
 * Парсит строку CSV с учетом кавычек и экранирования
 * Корректно обрабатывает значения, обернутые в кавычки, и двойные кавычки внутри них
 * 
 * @param line - CSV строка для парсинга
 * @returns Массив значений из CSV строки
 * 
 * @example
 * parseCsvLine('value1,value2,"value,3"') // ['value1', 'value2', 'value,3']
 * parseCsvLine('"value with ""quotes""",normal') // ['value with "quotes"', 'normal']
 */
export function parseCsvLine(line: string): string[] {
	const columns: string[] = [];
	let current = '';
	let inQuotes = false;
	
	for (let i = 0; i < line.length; i++) {
		const char = line[i];
		if (char === '"') {
			if (inQuotes && line[i + 1] === '"') {
				// Двойная кавычка - экранированная кавычка
				current += '"';
				i++; // Пропускаем следующую кавычку
			} else {
				inQuotes = !inQuotes;
			}
		} else if (char === ',' && !inQuotes) {
			columns.push(current.trim());
			current = '';
		} else {
			current += char;
		}
	}
	columns.push(current.trim()); // Последняя колонка
	
	return columns;
}

/**
 * Экспортирует список задач в формат CSV
 * 
 * @param tasks - Массив задач для экспорта
 * @returns CSV строка с заголовками и данными задач
 * 
 * @example
 * const csv = exportTasksToCsv([{ id: '1', title: 'Задача', amount: 1000 }]);
 * // Результат: CSV строка с заголовками и данными
 */
export function exportTasksToCsv(tasks: Task[]): string {
	const headers = [
		'ID',
		'Название',
		'Статус',
		'Сумма',
		'Расходы',
		'Оплачено',
		'Налог %',
		'Дата начала',
		'Дедлайн',
		'Заказчик ID',
		'Приоритет',
		'Теги',
		'Заметки',
		'Ссылки',
		'Создано',
		'Обновлено',
	];
	
	const rows = [headers.map(escapeCsvValue).join(',')];
	
	for (const task of tasks) {
		const row = [
			task.id || '',
			task.title || '',
			task.columnId || '',
			task.amount?.toString() || '',
			task.expenses?.toString() || '',
			task.paidAmount?.toString() || '',
			task.taxRate?.toString() || '',
			task.startDate || '',
			task.deadline || '',
			task.customerId || '',
			task.priority || '',
			task.tags?.join('; ') || '',
			task.notes || '',
			task.links?.join('; ') || '',
			task.createdAt || '',
			task.updatedAt || '',
		];
		rows.push(row.map(escapeCsvValue).join(','));
	}
	
	return rows.join('\n');
}

/**
 * Импортирует задачи из CSV строки
 * Подсчитывает количество добавленных и обновленных задач
 * 
 * @param csvContent - CSV содержимое для импорта
 * @param existingTasks - Существующие задачи для проверки обновлений
 * @returns Объект с количеством добавленных и обновленных задач
 * @throws {Error} Если CSV не содержит обязательные колонки ID и Название
 * 
 * @example
 * const result = importTasksFromCsv(csvString, existingTasks);
 * console.log(`Добавлено: ${result.added}, Обновлено: ${result.updated}`);
 */
export function importTasksFromCsv(csvContent: string, existingTasks: Task[]): { added: number; updated: number } {
	const lines = csvContent.split('\n').filter(line => line.trim());
	if (lines.length < 2) return { added: 0, updated: 0 };
	
	const headers = parseCsvLine(lines[0]);
	const dataLines = lines.slice(1);
	
	let added = 0;
	let updated = 0;
	
	// Находим индексы колонок
	const idIdx = headers.findIndex(h => h === 'ID' || h === 'id');
	const titleIdx = headers.findIndex(h => h === 'Название' || h.toLowerCase() === 'title');
	
	if (idIdx === -1 || titleIdx === -1) {
		throw new Error('CSV файл должен содержать колонки ID и Название');
	}
	
	for (const line of dataLines) {
		if (!line.trim()) continue;
		
		const columns = parseCsvLine(line);
		if (columns.length <= Math.max(idIdx, titleIdx)) continue;
		
		const id = columns[idIdx]?.trim();
		const title = columns[titleIdx]?.trim();
		
		if (!id && !title) continue; // Пропускаем пустые строки
		
		// Находим существующую задачу по ID
		const existingTask = id ? existingTasks.find(t => t.id === id) : null;
		
		if (existingTask) {
			// Обновляем существующую задачу
			updated++;
			// Возвращаем объект с обновлениями, который будет применен в Settings.tsx
			// Здесь мы просто считаем, детальная логика обновления будет в Settings.tsx
		} else {
			// Добавляем новую задачу
			added++;
		}
	}
	
	return { added, updated };
}

/**
 * Парсит задачу из CSV строки на основе заголовков и колонок
 * Определяет, является ли задача обновлением существующей или новой
 * 
 * @param headers - Массив заголовков CSV
 * @param columns - Массив значений колонок для текущей строки
 * @param existingTasks - Существующие задачи для проверки обновлений
 * @returns Объект с частичной задачей и флагом обновления, или null если название отсутствует
 * 
 * @example
 * const result = parseTaskFromCsv(['ID', 'Название', 'Сумма'], ['1', 'Задача', '1000'], tasks);
 * if (result) {
 *   console.log(result.task.title); // 'Задача'
 *   console.log(result.isUpdate); // true/false
 * }
 */
export function parseTaskFromCsv(headers: string[], columns: string[], existingTasks: Task[]): { task: Partial<Task>; isUpdate: boolean } | null {
	const getColumn = (name: string): string => {
		const idx = headers.findIndex(h => h === name || h.toLowerCase() === name.toLowerCase());
		return idx >= 0 && idx < columns.length ? columns[idx]?.trim() || '' : '';
	};
	
	const id = getColumn('ID');
	const title = getColumn('Название');
	
	if (!title) return null;
	
	const existingTask = id ? existingTasks.find(t => t.id === id) : null;
	
	const task: Partial<Task> = {
		...(id ? { id } : {}),
		title,
		columnId: (getColumn('Статус') || 'unprocessed') as ColumnId,
		amount: getColumn('Сумма') ? parseFloat(getColumn('Сумма')) : undefined,
		expenses: getColumn('Расходы') ? parseFloat(getColumn('Расходы')) : undefined,
		paidAmount: getColumn('Оплачено') ? parseFloat(getColumn('Оплачено')) : undefined,
		taxRate: getColumn('Налог %') ? parseFloat(getColumn('Налог %')) : undefined,
		startDate: getColumn('Дата начала') || undefined,
		deadline: getColumn('Дедлайн') || undefined,
		customerId: getColumn('Заказчик ID') || undefined,
		priority: (getColumn('Приоритет') || undefined) as TaskPriority | undefined,
		tags: getColumn('Теги') ? getColumn('Теги').split(';').map(t => t.trim()).filter(Boolean) : undefined,
		notes: getColumn('Заметки') || undefined,
		links: getColumn('Ссылки') ? getColumn('Ссылки').split(';').map(l => l.trim()).filter(Boolean) : undefined,
		createdAt: getColumn('Создано') || undefined,
		updatedAt: getColumn('Обновлено') || undefined,
	};
	
	return { task, isUpdate: !!existingTask };
}

/**
 * Экспортирует список заказчиков в формат CSV
 * 
 * @param customers - Массив заказчиков для экспорта
 * @returns CSV строка с заголовками и данными заказчиков
 * 
 * @example
 * const csv = exportCustomersToCsv([{ id: '1', name: 'Клиент', contacts: [...] }]);
 */
export function exportCustomersToCsv(customers: Customer[]): string {
	const headers = ['ID', 'Имя', 'Контакт', 'Контакты (JSON)'];
	
	const rows = [headers.map(escapeCsvValue).join(',')];
	
	for (const customer of customers) {
		const contactsJson = customer.contacts ? JSON.stringify(customer.contacts) : '';
		const row = [
			customer.id || '',
			customer.name || '',
			customer.contact || '',
			contactsJson,
		];
		rows.push(row.map(escapeCsvValue).join(','));
	}
	
	return rows.join('\n');
}

/**
 * Парсит заказчика из CSV строки на основе заголовков и колонок
 * Поддерживает миграцию старого формата contact в новый формат contacts
 * 
 * @param headers - Массив заголовков CSV
 * @param columns - Массив значений колонок для текущей строки
 * @param existingCustomers - Существующие заказчики для проверки обновлений
 * @returns Объект с частичным заказчиком и флагом обновления, или null если имя отсутствует
 * 
 * @example
 * const result = parseCustomerFromCsv(['ID', 'Имя', 'Контакт'], ['1', 'Клиент', 'email@test.com'], customers);
 */
export function parseCustomerFromCsv(headers: string[], columns: string[], existingCustomers: Customer[]): { customer: Partial<Customer>; isUpdate: boolean } | null {
	const getColumn = (name: string): string => {
		const idx = headers.findIndex(h => h === name || h.toLowerCase() === name.toLowerCase());
		return idx >= 0 && idx < columns.length ? columns[idx]?.trim() || '' : '';
	};
	
	const id = getColumn('ID');
	const name = getColumn('Имя');
	
	if (!name) return null;
	
	const existingCustomer = id ? existingCustomers.find(c => c.id === id) : null;
	
	let contacts: Customer['contacts'];
	const contactsJson = getColumn('Контакты (JSON)');
	if (contactsJson) {
		try {
			contacts = JSON.parse(contactsJson);
		} catch {
			// Если не JSON, используем старый формат contact
			const contact = getColumn('Контакт');
			if (contact) {
				contacts = [{ type: 'Другое', value: contact }];
			}
		}
	} else {
		const contact = getColumn('Контакт');
		if (contact) {
			contacts = [{ type: 'Другое', value: contact }];
		}
	}
	
	const customer: Partial<Customer> = {
		...(id ? { id } : {}),
		name,
		...(contacts ? { contacts } : {}),
		...(getColumn('Контакт') && !contacts ? { contact: getColumn('Контакт') } : {}),
	};
	
	return { customer, isUpdate: !!existingCustomer };
}

/**
 * Экспортирует список кредитов в формат CSV
 * 
 * @param credits - Массив кредитов для экспорта
 * @returns CSV строка с заголовками и данными кредитов
 * 
 * @example
 * const csv = exportCreditsToCsv([{ id: '1', name: 'Кредит', amount: 100000 }]);
 */
export function exportCreditsToCsv(credits: Credit[]): string {
	const headers = [
		'ID',
		'Название',
		'Сумма',
		'Ежемесячный платеж',
		'Процентная ставка',
		'Заметки',
		'Оплачен в этом месяце',
		'Последний месяц оплаты',
	];
	
	const rows = [headers.map(escapeCsvValue).join(',')];
	
	for (const credit of credits) {
		const row = [
			credit.id || '',
			credit.name || '',
			credit.amount?.toString() || '',
			credit.monthlyPayment?.toString() || '',
			credit.interestRate?.toString() || '',
			credit.notes || '',
			credit.paidThisMonth ? 'TRUE' : 'FALSE',
			credit.lastPaidMonth || '',
		];
		rows.push(row.map(escapeCsvValue).join(','));
	}
	
	return rows.join('\n');
}

/**
 * Парсит кредит из CSV строки на основе заголовков и колонок
 * 
 * @param headers - Массив заголовков CSV
 * @param columns - Массив значений колонок для текущей строки
 * @param existingCredits - Существующие кредиты для проверки обновлений
 * @returns Объект с частичным кредитом и флагом обновления, или null если название отсутствует
 * 
 * @example
 * const result = parseCreditFromCsv(['ID', 'Название', 'Сумма'], ['1', 'Кредит', '100000'], credits);
 */
export function parseCreditFromCsv(headers: string[], columns: string[], existingCredits: Credit[]): { credit: Partial<Credit>; isUpdate: boolean } | null {
	const getColumn = (name: string): string => {
		const idx = headers.findIndex(h => h === name || h.toLowerCase() === name.toLowerCase());
		return idx >= 0 && idx < columns.length ? columns[idx]?.trim() || '' : '';
	};
	
	const id = getColumn('ID');
	const name = getColumn('Название');
	
	if (!name) return null;
	
	const existingCredit = id ? existingCredits.find(c => c.id === id) : null;
	
	const credit: Partial<Credit> = {
		...(id ? { id } : {}),
		name,
		amount: getColumn('Сумма') ? parseFloat(getColumn('Сумма')) : undefined,
		monthlyPayment: getColumn('Ежемесячный платеж') ? parseFloat(getColumn('Ежемесячный платеж')) : undefined,
		interestRate: getColumn('Процентная ставка') ? parseFloat(getColumn('Процентная ставка')) : undefined,
		notes: getColumn('Заметки') || undefined,
		paidThisMonth: getColumn('Оплачен в этом месяце') === 'TRUE' ? true : getColumn('Оплачен в этом месяце') === 'FALSE' ? false : undefined,
		lastPaidMonth: getColumn('Последний месяц оплаты') || undefined,
	};
	
	return { credit, isUpdate: !!existingCredit };
}

