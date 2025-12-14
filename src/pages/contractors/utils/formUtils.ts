/**
 * Утилиты для работы с формой подрядчика
 */

import type { Contractor, Contact } from '@/types';

/**
 * Проверяет, есть ли изменения в форме
 * @param editing - редактируемый подрядчик или null для нового
 * @param name - текущее значение имени
 * @param contacts - текущие контакты
 * @param comment - текущий комментарий
 * @param avatar - текущий путь к аватару
 * @param specialization - текущая специализация
 * @param rate - текущая ставка
 * @param rating - текущий рейтинг
 * @returns true если есть изменения
 */
export function hasFormChanges(
	editing: Contractor | null,
	name: string,
	contacts: Contact[],
	comment: string,
	avatar: string,
	specialization: string,
	rate: string,
	rating: string
): boolean {
	if (!editing) {
		// Для нового подрядчика проверяем, есть ли хотя бы одно заполненное поле
		return !!(name.trim() || contacts.length > 0 || comment.trim() || avatar.trim() || specialization.trim() || rate.trim() || rating.trim());
	}
	// Для редактирования сравниваем с начальными значениями
	const editingContacts = editing.contacts || (editing.contact ? [{ type: 'Другое', value: editing.contact }] : []);
	const contactsChanged = JSON.stringify(contacts) !== JSON.stringify(editingContacts);
	return (
		name.trim() !== (editing.name || '') ||
		contactsChanged ||
		comment.trim() !== (editing.comment || '') ||
		avatar.trim() !== (editing.avatar || '') ||
		specialization.trim() !== (editing.specialization || '') ||
		rate.trim() !== String(editing.rate || '') ||
		rating.trim() !== String(editing.rating || '')
	);
}

/**
 * Подготавливает данные формы для редактирования подрядчика
 * @param contractor - подрядчик для редактирования
 * @returns объект с начальными значениями формы
 */
export function getInitialFormValues(contractor: Contractor): {
	name: string;
	contacts: Contact[];
	comment: string;
	avatar: string;
	specialization: string;
	rate: string;
	rating: string;
} {
	return {
		name: contractor.name,
		contacts: contractor.contacts || (contractor.contact ? [{ type: 'Другое', value: contractor.contact }] : []),
		comment: contractor.comment || '',
		avatar: contractor.avatar || '',
		specialization: contractor.specialization || '',
		rate: String(contractor.rate || ''),
		rating: String(contractor.rating || ''),
	};
}


