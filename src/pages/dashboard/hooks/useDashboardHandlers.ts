import { useCallback } from 'react';
import type { Task, TaskLink, TaskPriority, ColumnId } from '@/types';
import { useBoardStore, normalizeLinks } from '@/store/board';
import { useIncomeStore, type Income } from '@/store/income';
import { useUIStore } from '@/store/ui';
import { UI_TEXTS } from '@/shared/constants/ui-texts';
import { openExternalUrl } from '@/shared/lib/electron-bridge';

type UseDashboardHandlersProps = {
	onEditTask: (task: Task) => void;
};

export function useDashboardHandlers({
	onEditTask,
}: UseDashboardHandlersProps) {
	// Используем только для типизации
	const addTask = useBoardStore((s) => s.addTask);

	const onDragStart = useCallback((e: React.DragEvent, taskId: string) => {
		e.dataTransfer.setData('text/task-id', taskId);
	}, []);

	const onDrop = useCallback((e: React.DragEvent, to: ColumnId) => {
		e.preventDefault();
		const id = e.dataTransfer.getData('text/task-id');
		if (id) useBoardStore.getState().moveTask(id, to);
	}, []); // moveTask убран, так как функция из Zustand стабильна

	const onDragOver = useCallback((e: React.DragEvent) => {
		e.preventDefault();
	}, []);

	const handleDuplicateTask = useCallback((task: Task) => {
		const newTask: Parameters<typeof addTask>[0] = {
			title: `${task.title} (копия)`,
			amount: task.amount,
			expenses: task.expenses,
			paidAmount: 0,
			taxRate: task.taxRate,
			startDate: task.startDate,
			deadline: task.deadline,
			subtasks: task.subtasks ? task.subtasks.map((s) => ({ ...s, done: false })) : undefined,
			tags: task.tags ? [...task.tags] : undefined,
			notes: task.notes,
			customerId: task.customerId,
			links: task.links ? normalizeLinks(task.links) : undefined,
			files: task.files ? [...task.files] : undefined,
			calculatorQuantity: task.calculatorQuantity,
			calculatorPricePerUnit: task.calculatorPricePerUnit,
			priority: task.priority,
			columnId: task.columnId,
		};
		useBoardStore.getState().addTask(newTask);
	}, []); // addTask убран, так как функция из Zustand стабильна

	const handleDeleteTask = useCallback(async (task: Task) => {
		const confirmed = await useUIStore.getState().showConfirm({
			message: `Удалить задачу "${task.title}"?`,
			variant: 'danger',
			title: 'Подтверждение удаления',
			confirmText: UI_TEXTS.DELETE,
			cancelText: UI_TEXTS.CANCEL,
		});
		if (confirmed) {
			useBoardStore.getState().removeTask(task.id);
		}
	}, []); // showConfirm и removeTask убраны, так как функции из Zustand стабильны

	const handleChangeStatus = useCallback((task: Task, status: string) => {
		useBoardStore.getState().moveTask(task.id, status as ColumnId);
	}, []); // moveTask убран, так как функция из Zustand стабильна

	const handlePauseTask = useCallback((task: Task) => {
		useBoardStore.getState().moveTask(task.id, 'paused');
	}, []); // moveTask убран, так как функция из Zustand стабильна

	const handleResumeTask = useCallback((task: Task) => {
		const targetColumn = task.pausedFromColumnId || 'inwork';
		useBoardStore.getState().moveTask(task.id, targetColumn);
	}, []); // moveTask убран, так как функция из Zustand стабильна

	const handleChangePriority = useCallback((task: Task, priority: string) => {
		useBoardStore.getState().updateTask(task.id, { priority: priority as TaskPriority });
	}, []); // updateTask убран, так как функция из Zustand стабильна

	const handleAddIncome = useCallback(() => {
		// Это будет обработано в компоненте
	}, []);

	const handleEditIncome = useCallback((income: Income) => {
		// Это будет обработано в компоненте
	}, []);

	const handleDeleteIncome = useCallback(async (income: Income) => {
		const confirmed = await useUIStore.getState().showConfirm({
			message: `Удалить доход "${income.title}"?`,
			variant: 'danger',
			title: 'Подтверждение удаления',
			confirmText: UI_TEXTS.DELETE,
			cancelText: UI_TEXTS.CANCEL,
		});
		if (confirmed) {
			useIncomeStore.getState().removeIncome(income.id);
		}
	}, []); // showConfirm и removeIncome убраны, так как функции из Zustand стабильны

	const handleLinkGoTo = useCallback((link: TaskLink) => {
		window.open(link.url, '_blank', 'noopener,noreferrer');
	}, []);

	const handleLinkGoToExternal = useCallback(async (link: TaskLink) => {
		await openExternalUrl(link.url);
	}, []);

	const handleLinkCopy = useCallback((link: TaskLink) => {
		navigator.clipboard.writeText(link.url).catch(() => {});
	}, []);

	const handleLinkDelete = useCallback((link: TaskLink, task: Task) => {
		const normalizedLinks = normalizeLinks(task.links);
		const updatedLinks = normalizedLinks.filter((l) => l.url !== link.url || l.name !== link.name);
		useBoardStore.getState().updateTask(task.id, { links: updatedLinks.length > 0 ? updatedLinks : undefined });
	}, []); // updateTask убран, так как функция из Zustand стабильна

	return {
		onDragStart,
		onDrop,
		onDragOver,
		handleDuplicateTask,
		handleDeleteTask,
		handleChangeStatus,
		handlePauseTask,
		handleResumeTask,
		handleChangePriority,
		handleAddIncome,
		handleEditIncome,
		handleDeleteIncome,
		handleLinkGoTo,
		handleLinkGoToExternal,
		handleLinkCopy,
		handleLinkDelete,
	};
}

