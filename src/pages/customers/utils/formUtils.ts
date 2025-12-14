/**
 * Утилиты для работы с формой заказчика
 */

import type { Customer, Contact } from '@/store/customers';

/**
 * Проверяет, есть ли изменения в форме
 * @param editing - редактируемый заказчик или null для нового
 * @param name - текущее значение имени
 * @param contacts - текущие контакты
 * @param comment - текущий комментарий
 * @param avatar - текущий путь к аватару
 * @returns true если есть изменения
 */
export function hasFormChanges(
	editing: Customer | null,
	name: string,
	contacts: Contact[],
	comment: string,
	avatar: string
): boolean {
	if (!editing) {
		// Для нового заказчика проверяем, есть ли хотя бы одно заполненное поле
		return !!(name.trim() || contacts.length > 0 || comment.trim() || avatar.trim());
	}
	// Для редактирования сравниваем с начальными значениями
	const editingContacts = editing.contacts || (editing.contact ? [{ type: 'Другое', value: editing.contact }] : []);
	const contactsChanged = JSON.stringify(contacts) !== JSON.stringify(editingContacts);
	return (
		name.trim() !== (editing.name || '') ||
		contactsChanged ||
		comment.trim() !== (editing.comment || '') ||
		avatar.trim() !== (editing.avatar || '')
	);
}

/**
 * Подготавливает данные формы для редактирования заказчика
 * @param customer - заказчик для редактирования
 * @returns объект с начальными значениями формы
 */
export function getInitialFormValues(customer: Customer): {
	name: string;
	contacts: Contact[];
	comment: string;
	avatar: string;
} {
	return {
		name: customer.name,
		contacts: customer.contacts || (customer.contact ? [{ type: 'Другое', value: customer.contact }] : []),
		comment: customer.comment || '',
		avatar: customer.avatar || '',
	};
}






