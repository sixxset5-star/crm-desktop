import { useEffect, useRef, useState } from 'react';
import type { Task, SubTask, Contractor } from '@/types';
import { normalizeLinks } from '@/store/board';
import { generateShortId } from '@/shared/utils/id';
import { initializePayments, initializeSubtasks, initializeCalculator, restoreFromLocalStorage } from '../utils/taskFormInit';
import type { Payment } from '../useTaskFormCore';
import type { ExpenseItem } from '../useTaskFormCore';
import type { Access } from '@/types';

type UseTaskFormInitProps = {
	open: boolean;
	initial: Task | null | undefined;
	taskId: string;
	contractors: Contractor[];
	setTitle: (value: string) => void;
	setDeadline: (value: string) => void;
	setStartDate: (value: string) => void;
	setNotes: (value: string) => void;
	setCustomerId: (value: string) => void;
	setContractorId: (value: string) => void;
	setSubtasks: (value: SubTask[]) => void;
	setPayments: (value: Payment[]) => void;
	setPaymentMode: (value: 'payments' | 'subtasks') => void;
	setExpensesItems: (value: ExpenseItem[]) => void;
	setTags: (value: string[]) => void;
	setLinks: (value: Array<{ name?: string; url: string }>) => void;
	setPriority: (value: Task['priority'] | undefined) => void;
	setPausedRanges: (value: Array<{ from: string; to: string }>) => void;
	setAccesses: (value: Access[]) => void;
	setCalculatorQuantity: (value: string) => void;
	setCalculatorPricePerUnit: (value: string) => void;
	setUseCalculator: (value: boolean) => void;
	setTaskFiles: (files: string[]) => void;
	ui: {
		setNewSubtask: (value: string) => void;
		setNewTag: (value: string) => void;
		setNewLink: (value: string) => void;
		setLinkError: (error: string | null) => void;
		closeLinkContextMenu: () => void;
		cancelEditingLinkName: () => void;
	};
	savedCalculatorState: React.MutableRefObject<{
		taskId: string | null;
		quantity: string;
		pricePerUnit: string;
		enabled: boolean;
	}>;
};

export function useTaskFormInit({
	open,
	initial,
	taskId,
	contractors,
	setTitle,
	setDeadline,
	setStartDate,
	setNotes,
	setCustomerId,
	setContractorId,
	setSubtasks,
	setPayments,
	setPaymentMode,
	setExpensesItems,
	setTags,
	setLinks,
	setPriority,
	setPausedRanges,
	setAccesses,
	setCalculatorQuantity,
	setCalculatorPricePerUnit,
	setUseCalculator,
	setTaskFiles,
	ui,
	savedCalculatorState,
}: UseTaskFormInitProps) {
	const [currentTaskId, setCurrentTaskId] = useState<string | null>(null);
	const initialTaskId = initial?.id;

	useEffect(() => {
		if (!open) return;

		const actualTaskId = initialTaskId ?? taskId;
		
		if (actualTaskId !== currentTaskId) {
			const restoredData = !initial && actualTaskId !== 'new' 
				? restoreFromLocalStorage(actualTaskId)
				: null;
			
			const data = initial || restoredData;
			
			// Базовые поля
			setTitle(data?.title || '');
			setDeadline(data?.deadline || '');
			setStartDate(data?.startDate || '');
			setNotes(data?.notes || '');
			setCustomerId(data?.customerId || '');
			
			// Инициализация платежей и подзадач
			const loadedSubtasks = (data?.subtasks || []) as SubTask[];
			const subtasksWithDates = loadedSubtasks.filter((s: SubTask) => s.date);
			const { payments: loadedPayments, mode: initialMode } = initializePayments(data, subtasksWithDates);
			const finalSubtasks = initializeSubtasks(data, subtasksWithDates);
			
			setPayments(loadedPayments);
			setPaymentMode(initialMode);
			setSubtasks(finalSubtasks);
			ui.setNewSubtask('');
			
			// Остальные поля
			setTags(data?.tags || []);
			ui.setNewTag('');
			setLinks(normalizeLinks(data?.links));
			
			// Восстанавливаем файлы из автосохранения
			if (data?.files && data.files.length > 0) {
				setTaskFiles(data.files);
			}
			
			ui.setNewLink('');
			ui.setLinkError(null);
			ui.closeLinkContextMenu();
			ui.cancelEditingLinkName();
			setPriority((data?.priority || 'medium') as Task['priority']);
			setPausedRanges(data?.pausedRanges || []);
			
			// Восстанавливаем contractorId, но проверяем, что подрядчик активен
			const initialContractorId = data?.contractorId || '';
			if (initialContractorId) {
				const contractor = contractors.find(c => c.id === initialContractorId);
				if (!contractor || !contractor.isActive) {
					setContractorId('');
				} else {
					setContractorId(initialContractorId);
				}
			} else {
				setContractorId('');
			}
			
			// Восстанавливаем expensesEntries с поддержкой contractorId
			const restoredExpenses = (data?.expensesEntries || []).map(exp => ({
				id: exp.id || generateShortId(),
				title: exp.title || '',
				amount: exp.amount || 0,
				date: exp.date,
				contractorId: exp.contractorId
			}));
			setExpensesItems(restoredExpenses);
			setAccesses(data?.accesses || []);
			
			// Инициализация калькулятора
			const calculatorState = initializeCalculator(initial, actualTaskId, savedCalculatorState.current);
			setCalculatorQuantity(calculatorState.quantity);
			setCalculatorPricePerUnit(calculatorState.pricePerUnit);
			setUseCalculator(calculatorState.enabled);
			
			setCurrentTaskId(actualTaskId);
		}
	}, [open, initialTaskId, taskId, currentTaskId, setTaskFiles, contractors, initial, setTitle, setDeadline, setStartDate, setNotes, setCustomerId, setContractorId, setSubtasks, setPayments, setPaymentMode, setExpensesItems, setTags, setLinks, setPriority, setPausedRanges, setAccesses, setCalculatorQuantity, setCalculatorPricePerUnit, setUseCalculator, ui, savedCalculatorState]);

	return { currentTaskId };
}

