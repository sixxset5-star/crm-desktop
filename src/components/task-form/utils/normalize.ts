/**
 * Единый модуль нормализации для всех типов данных формы
 * 
 * Централизованная нормализация для сравнения и обработки данных.
 */
import type { SubTask } from '@/types';
import type { TaskLink } from '@/types';
import type { Payment } from '../useTaskFormCore';
import { normalizePayments } from '../useTaskPayments';

/**
 * Нормализация подзадач для сравнения
 */
export function normalizeSubtasks(
	subtasks: Array<{ id: string; title: string; done: boolean; amount?: number; date?: string }>
): Array<{ id: string; title: string; done: boolean; amount: number; date: string }> {
	return [...subtasks].sort((a, b) => {
		if ((a.date || '') !== (b.date || '')) return (a.date || '').localeCompare(b.date || '');
		if ((a.amount || 0) !== (b.amount || 0)) return (a.amount || 0) - (b.amount || 0);
		return a.title.localeCompare(b.title);
	}).map(s => ({ 
		id: s.id, 
		title: s.title, 
		done: s.done, 
		amount: s.amount || 0, 
		date: s.date || '' 
	}));
}

/**
 * Нормализация платежей (делегируем в useTaskPayments для единообразия)
 */
export function normalizePaymentsList(payments: Payment[]) {
	return normalizePayments(payments);
}

/**
 * Нормализация ссылок (сортировка и приведение к стандартному виду)
 */
export function normalizeLinksList(links: TaskLink[]): TaskLink[] {
	return [...links].sort((a, b) => {
		const urlA = a.url || '';
		const urlB = b.url || '';
		if (urlA !== urlB) return urlA.localeCompare(urlB);
		const nameA = a.name || '';
		const nameB = b.name || '';
		return nameA.localeCompare(nameB);
	}).map(link => ({
		url: link.url,
		name: link.name || undefined,
	}));
}

/**
 * Нормализация файлов (сортировка по пути)
 */
export function normalizeFiles(files: string[]): string[] {
	return [...files].sort((a, b) => a.localeCompare(b));
}

/**
 * Нормализация тегов (сортировка и приведение к lowercase)
 */
export function normalizeTags(tags: string[]): string[] {
	return [...new Set(tags.map(t => t.toLowerCase().trim()))].sort();
}

/**
 * Нормализация доступов (сортировка по label)
 */
export function normalizeAccesses(
	accesses: Array<{ label: string; login: string; password: string }>
): Array<{ label: string; login: string; password: string }> {
	return [...accesses].sort((a, b) => {
		const labelA = a.label || '';
		const labelB = b.label || '';
		return labelA.localeCompare(labelB);
	}).map(acc => ({
		label: acc.label || '',
		login: acc.login || '',
		password: acc.password || '',
	}));
}






