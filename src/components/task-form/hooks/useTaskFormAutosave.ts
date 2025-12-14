import { useEffect } from 'react';
import type { Payment } from '../useTaskFormCore';
import type { ExpenseItem } from '../useTaskFormCore';
import type { TaskLink } from '@/types';
import type { Access } from '@/types';
import type { TaskPriority } from '@/types';

type UseTaskFormAutosaveProps = {
	open: boolean;
	currentTaskId: string | null;
	title: string;
	deadline: string;
	startDate: string;
	notes: string;
	customerId: string;
	subtasks: Array<{ id: string; title: string; done: boolean; amount?: number; date?: string }>;
	payments: Payment[];
	paymentMode: 'payments' | 'subtasks';
	tags: string[];
	links: TaskLink[];
	files: string[];
	expensesItems: ExpenseItem[];
	calculatorQuantity: string;
	calculatorPricePerUnit: string;
	useCalculator: boolean;
	priority: TaskPriority;
	accesses: Access[];
};

export function useTaskFormAutosave({
	open,
	currentTaskId,
	title,
	deadline,
	startDate,
	notes,
	customerId,
	subtasks,
	payments,
	paymentMode,
	tags,
	links,
	files,
	expensesItems,
	calculatorQuantity,
	calculatorPricePerUnit,
	useCalculator,
	priority,
	accesses,
}: UseTaskFormAutosaveProps) {
	useEffect(() => {
		if (!open || !currentTaskId) return;
		
		const timeoutId = setTimeout(() => {
			const formData = {
				title,
				deadline,
				startDate,
				notes,
				customerId,
				subtasks,
				payments,
				paymentMode,
				tags,
				links,
				files,
				expensesItems,
				calculatorQuantity,
				calculatorPricePerUnit,
				useCalculator,
				priority,
				accesses,
			};
			try {
				localStorage.setItem(`taskForm_${currentTaskId}`, JSON.stringify(formData));
			} catch (error) {
				// Игнорируем ошибки localStorage
			}
		}, 500); // 500ms debounce
		
		return () => clearTimeout(timeoutId);
	}, [
		open,
		currentTaskId,
		title,
		deadline,
		startDate,
		notes,
		customerId,
		subtasks,
		payments,
		paymentMode,
		tags,
		links,
		files,
		expensesItems,
		calculatorQuantity,
		calculatorPricePerUnit,
		useCalculator,
		priority,
		accesses,
	]);
}


