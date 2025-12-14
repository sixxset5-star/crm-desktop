// Domain слой для Customer - бизнес-логика работы с клиентами
import type { Customer } from '@/types';

/**
 * Получает основной контакт клиента
 */
export function getPrimaryContact(customer: Customer): string | null {
	if (customer.contacts && customer.contacts.length > 0) {
		return customer.contacts[0].value;
	}
	return customer.contact || null;
}

/**
 * Получает все контакты клиента в виде строк
 */
export function getAllContacts(customer: Customer): string[] {
	const contacts: string[] = [];
	
	if (customer.contact) {
		contacts.push(customer.contact);
	}
	
	if (customer.contacts) {
		customer.contacts.forEach(c => {
			if (c.value && !contacts.includes(c.value)) {
				contacts.push(c.value);
			}
		});
	}
	
	return contacts;
}











