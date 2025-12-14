/**
 * Унифицированные функции сравнения для hasChanges
 * 
 * Declarative API для проверки изменений в форме.
 */
import { deepEqual, compareArraysById } from './arrayCompare';
import { normalizeSubtasks, normalizePaymentsList, normalizeLinksList, normalizeFiles, normalizeTags, normalizeAccesses } from './normalize';
import type { SubTask, TaskLink } from '@/types';
import type { Payment } from '../useTaskFormCore';

/**
 * Сравнение простых значений
 */
export function compareValue<T>(current: T, initial: T): boolean {
	return current === initial;
}

/**
 * Сравнение строк с trim
 */
export function compareString(current: string, initial: string | undefined): boolean {
	return (current.trim() || '') !== (initial || '').trim();
}

/**
 * Сравнение подзадач
 */
export function compareSubtasks(
	current: Array<{ id: string; title: string; done: boolean; amount?: number; date?: string }>,
	initial: SubTask[] | undefined
): boolean {
	const normalizedCurrent = normalizeSubtasks(current);
	const normalizedInitial = normalizeSubtasks(initial || []);
	return !deepEqual(normalizedCurrent, normalizedInitial);
}

/**
 * Сравнение платежей (через normalize из useTaskPayments)
 */
export function comparePayments(current: Payment[], initial: Payment[]): boolean {
	const normalizedCurrent = normalizePaymentsList(current);
	const normalizedInitial = normalizePaymentsList(initial);
	return !deepEqual(normalizedCurrent, normalizedInitial);
}

/**
 * Сравнение расходов по ID
 */
export function compareExpensesItems(
	current: Array<{ id: string; title: string; amount: number; date?: string; contractorId?: string }>,
	initial: Array<{ id: string; title: string; amount: number; date?: string; contractorId?: string }> | undefined
): boolean {
	return !compareArraysById(current, initial || []);
}

/**
 * Сравнение ссылок
 */
export function compareLinks(current: TaskLink[], initial: TaskLink[] | undefined): boolean {
	const normalizedCurrent = normalizeLinksList(current);
	const normalizedInitial = normalizeLinksList(initial || []);
	return !deepEqual(normalizedCurrent, normalizedInitial);
}

/**
 * Сравнение файлов
 */
export function compareFiles(current: string[], initial: string[] | undefined): boolean {
	const normalizedCurrent = normalizeFiles(current);
	const normalizedInitial = normalizeFiles(initial || []);
	return !deepEqual(normalizedCurrent, normalizedInitial);
}

/**
 * Сравнение тегов
 */
export function compareTags(current: string[], initial: string[] | undefined): boolean {
	const normalizedCurrent = normalizeTags(current);
	const normalizedInitial = normalizeTags(initial || []);
	return !deepEqual(normalizedCurrent, normalizedInitial);
}

/**
 * Сравнение доступов
 */
export function compareAccesses(
	current: Array<{ label: string; login: string; password: string }>,
	initial: Array<{ label: string; login: string; password: string }> | undefined
): boolean {
	const normalizedCurrent = normalizeAccesses(current);
	const normalizedInitial = normalizeAccesses(initial || []);
	return !deepEqual(normalizedCurrent, normalizedInitial);
}




