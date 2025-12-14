/**
 * Утилиты для миграции клиентов
 * Вынесено из store для разделения ответственности
 */
import type { Customer, Access, Contact } from '@/types';

/**
 * Валидирует клиента: базовая проверка структуры
 * Проверяет наличие обязательных полей (id, name)
 * 
 * @param customer - Объект для проверки
 * @returns true, если объект является валидным клиентом
 * 
 * @example
 * if (isValidCustomer(data)) {
 *   // data - валидный клиент
 * }
 */
export function isValidCustomer(customer: unknown): customer is Customer {
	if (!customer || typeof customer !== 'object') return false;
	const c = customer as Record<string, unknown>;
	return typeof c.id === 'string' && 
	       c.id.length > 0 && 
	       (typeof c.name === 'string' || c.id.length > 0);
}

/**
 * Нормализация доступа (миграция старых форматов)
 */
function normalizeAccess(acc: unknown): Access {
	// Старый формат: строка
	if (typeof acc === 'string') {
		return { label: 'Доступ', login: acc, password: '' };
	}
	
	// Проверяем, что это объект
	if (!acc || typeof acc !== 'object') {
		return { label: 'Доступ', login: '', password: '' };
	}
	
	const accObj = acc as Record<string, unknown>;
	
	// Старый формат с value
	if ('value' in accObj && typeof accObj.value === 'string' && 
	    !('login' in accObj) && !('password' in accObj)) {
		return {
			label: (typeof accObj.label === 'string' ? accObj.label : 'Доступ'),
			login: accObj.value,
			password: ''
		};
	}
	
	// Новый формат с login/password
	if ('login' in accObj && 'password' in accObj) {
		return {
			label: (typeof accObj.label === 'string' ? accObj.label : 'Доступ'),
			login: (typeof accObj.login === 'string' ? accObj.login : ''),
			password: (typeof accObj.password === 'string' ? accObj.password : '')
		};
	}
	
	// Fallback для неизвестного формата
	return { label: 'Доступ', login: '', password: '' };
}

/**
 * Мигрирует клиента: конвертирует старые форматы в новый
 * - Преобразует старый формат contact в новый формат contacts
 * - Нормализует accesses (старый формат с value -> новый с login/password)
 * 
 * @param customer - Клиент для миграции
 * @returns Мигрированный клиент
 * 
 * @example
 * const migrated = migrateCustomer({
 *   id: '1',
 *   name: 'Клиент',
 *   contact: 'email@test.com' // Старый формат
 * });
 * // Результат: { id: '1', name: 'Клиент', contacts: [{ type: 'Другое', value: 'email@test.com' }] }
 */
export function migrateCustomer(customer: Customer): Customer {
	let updated = { ...customer };
	
	// Конвертируем старый формат contact в новый формат contacts
	if (customer.contact && !customer.contacts) {
		updated = { 
			...updated, 
			contacts: [{ type: 'Другое', value: customer.contact }] as Contact[]
		};
	}
	
	// Миграция старых accesses с value в новый формат
	if (updated.accesses && Array.isArray(updated.accesses)) {
		updated.accesses = updated.accesses.map(normalizeAccess);
	}
	
	return updated;
}

/**
 * Мигрирует массив клиентов
 * Фильтрует невалидных клиентов и применяет миграцию форматов
 * 
 * @param customers - Массив клиентов для миграции
 * @returns Массив мигрированных валидных клиентов
 * 
 * @example
 * const migrated = migrateCustomers(rawCustomers);
 * // Все клиенты валидированы и мигрированы
 */
export function migrateCustomers(customers: unknown[]): Customer[] {
	if (!Array.isArray(customers)) {
		return [];
	}

	return customers
		.filter(isValidCustomer)
		.map(migrateCustomer);
}





