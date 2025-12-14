import { useCallback } from 'react';
import type { Task, TaskPriority } from '@/types';
import { useBoardStore } from '../../../store/board';
import { useUIStore } from '../../../store/ui';
import type { TaskFormData } from '../useTaskFormCore';
import type { Payment } from '../useTaskFormCore';
import type { SubTask } from '@/types';

type UseTaskFormSubmitProps = {
	formData: TaskFormData;
	core: {
		formErrors: {
			title?: string;
			deadline?: string;
			startDate?: string;
			dateOrder?: string;
		};
		validateAll: (
			paymentMode: 'payments' | 'subtasks',
			payments: Payment[],
			subtasks?: SubTask[],
			paymentErrors?: Record<string, string>
		) => string | null;
		prepareForSave: (options?: {
			files?: string[];
			customerId?: string;
			contractorId?: string;
			paymentMode?: 'payments' | 'subtasks';
			subtasks?: SubTask[];
		}) => Partial<Task>;
	};
	paymentMode: 'payments' | 'subtasks';
	payments: Payment[];
	subtasks: SubTask[];
	paymentsCore: {
		errors: Record<string, string>;
	};
	taskFiles: string[];
	contractorId: string;
	currentTaskId: string | null;
	initial: Task | null | undefined;
	onClose: () => void;
};

export function useTaskFormSubmit({
	formData,
	core,
	paymentMode,
	payments,
	subtasks,
	paymentsCore,
	taskFiles,
	contractorId,
	currentTaskId,
	initial,
	onClose,
}: UseTaskFormSubmitProps) {
	const addTask = useBoardStore((s) => s.addTask);
	const updateTask = useBoardStore((s) => s.updateTask);
	const showError = useUIStore((s) => s.showError);

	const handleSubmit = useCallback((e: React.FormEvent) => {
		e.preventDefault();
		
		// Валидация формы через core
		const formErrors = core.formErrors;
		if (formErrors.title || formErrors.deadline || formErrors.startDate || formErrors.dateOrder) {
			const firstError = formErrors.title || formErrors.deadline || formErrors.startDate || formErrors.dateOrder;
			showError(firstError || 'Ошибка валидации');
			return;
		}
		
		const chosenCustomerId = formData.customerId;
		const finalFiles = taskFiles;
		
		// Валидация всех данных через core
		const validationError = core.validateAll(
			paymentMode,
			payments,
			paymentMode === 'subtasks' ? subtasks : undefined,
			paymentsCore.errors
		);
		if (validationError) {
			showError(validationError);
			return;
		}
		
		// Подготовка данных через core
		const payload = core.prepareForSave({
			files: finalFiles,
			customerId: chosenCustomerId,
			contractorId: contractorId || undefined,
			paymentMode,
			subtasks: paymentMode === 'subtasks' ? subtasks : undefined,
		});
		
		if (initial) {
			updateTask(initial.id, payload);
		} else {
			// Для новой задачи
			const createPayload = {
				title: payload.title || '',
				amount: payload.amount,
				notes: payload.notes,
				startDate: payload.startDate,
				deadline: payload.deadline,
				expenses: payload.expenses,
				taxRate: payload.taxRate,
				customerId: payload.customerId,
				contractorId: contractorId || undefined,
				subtasks: payload.subtasks,
				tags: payload.tags,
				links: payload.links,
				files: payload.files,
				calculatorQuantity: payload.calculatorQuantity,
				calculatorPricePerUnit: payload.calculatorPricePerUnit,
				priority: payload.priority,
				accesses: payload.accesses,
			};
			addTask(createPayload);
		}
		
		// Очищаем автосохранение после успешного сохранения
		if (currentTaskId) {
			try {
				localStorage.removeItem(`taskForm_${currentTaskId}`);
			} catch (error) {
				// Игнорируем ошибки
			}
		}
		
		onClose();
	}, [
		core,
		paymentMode,
		payments,
		subtasks,
		paymentsCore.errors,
		taskFiles,
		contractorId,
		currentTaskId,
		initial,
		formData.customerId,
		addTask,
		updateTask,
		showError,
		onClose,
	]);

	return { handleSubmit };
}

