import React, { useMemo, useState, useCallback } from 'react';
import { useBoardStore, normalizeLinks } from '../store/board';
import type { Task, TaskPriority, TaskLink, SubTask } from '@/types';
import { useCustomersStore } from '../store/customers';
import { useContractorsStore } from '../store/contractors';
import type { Access } from '@/types';
import { useShallowSelector } from '@/shared/hooks/useStoreSelectors';
import { useUIStore } from '../store/ui';
import { useTaskFormCore, type TaskFormData } from './task-form/useTaskFormCore';
import { useTaskFormUI } from './task-form/useTaskFormUI';
import { AccessesSection } from './task-form/sections/AccessesSection';
import { LinksSection } from './task-form/sections/LinksSection';
import { FilesSection } from './task-form/sections/FilesSection';
import { SubtasksSection } from './task-form/sections/SubtasksSection';
import { PaymentsSection } from './task-form/sections/payments/PaymentsSection';
import { ExpensesSection, type ExpenseItem } from './task-form/sections/ExpensesSection';
import { AssigneeHistorySection } from './task-form/sections/AssigneeHistorySection';
import { useTaskPayments } from './task-form/useTaskPayments';
import { generateShortId } from '@/shared/utils/id';
import { useTaskFiles } from './task-form/hooks/useTaskFiles';
import { useLinks } from './task-form/hooks/useLinks';
import { useTaskFormCollections } from './task-form/hooks/useTaskFormCollections';
import { useTaskFormInit } from './task-form/hooks/useTaskFormInit';
import { useTaskFormAutosave } from './task-form/hooks/useTaskFormAutosave';
import { useTaskFormSubmit } from './task-form/hooks/useTaskFormSubmit';
import { ClearButton } from './task-form/components/ClearButton';
import { TagRemoveButton } from './task-form/components/TagRemoveButton';
import { FormField } from './task-form/components/FormField';
import { ContractorSelect } from './task-form/sections/ContractorSelect';
import { PrioritySelect } from './task-form/sections/PrioritySelect';
import {
	compareString,
	compareSubtasks,
	comparePayments,
	compareExpensesItems,
	compareLinks,
	compareFiles,
	compareTags,
	compareAccesses,
	compareValue,
} from './task-form/utils/compare';
import { openExternalUrl } from '@/shared/lib/electron-bridge';
import { getToken } from '@/shared/lib/tokens';
import { XIcon, PlusIcon, TrashIcon } from '@/shared/components/Icons';
import IconButton from '@/shared/components/IconButton';
import { Button, TextInput, TextArea, Select, TagChip, Avatar, NotesField } from '@/shared/ui';
import { Modal, ModalFooter } from '@/shared/ui/Modal';
import { UI_TEXTS } from '@/shared/constants/ui-texts';

// Тип для платежей - теперь импортируется из useTaskFormCore
import type { Payment } from './task-form/useTaskFormCore';

// Компонент кнопки удаления с унифицированным стилем
function DeleteButton({ onClick, title }: { onClick: () => void; title: string }) {
	return (
		<div style={{ 
			display: 'flex', 
			alignItems: 'center', 
			gap: 'var(--space-sm)' 
		}}>
			<IconButton 
				onClick={onClick} 
				title={title} 
				icon={TrashIcon} 
			/>
			<span style={{ 
				fontSize: 'var(--font-size-sm)', 
				color: 'var(--muted)' 
			}}>
				{title}
			</span>
		</div>
	);
}

// Вспомогательная функция для выделения текста при двойном клике
const selectAllOnDoubleClick = (e: React.MouseEvent<HTMLInputElement | HTMLTextAreaElement>) => {
	(e.target as HTMLInputElement | HTMLTextAreaElement).select();
};



type Props = {
	open: boolean;
	initial?: Task | null;
	onClose: () => void;
};

export function TaskFormModal({ open, initial, onClose }: Props): React.ReactElement | null {
	const addTask = useBoardStore((s) => s.addTask);
	const updateTask = useBoardStore((s) => s.updateTask);
	const customers = useShallowSelector(useCustomersStore, (s) => s.customers);
	const addCustomer = useCustomersStore((s) => s.addCustomer);
	const contractors = useShallowSelector(useContractorsStore, (s) => s.contractors);
	const showSuccess = useUIStore((s) => s.showSuccess);
	const showError = useUIStore((s) => s.showError);

	// Единый источник taskId для всей формы (критично для консистентности файлов)
	const [taskId] = useState(() => initial?.id ?? generateShortId());
	const formRef = React.useRef<HTMLFormElement>(null);

	const [title, setTitle] = useState('');
	const [deadline, setDeadline] = useState<string>('');
	const [startDate, setStartDate] = useState<string>('');
	// Глобальный налог задачи больше не используется
	const [notes, setNotes] = useState<string>('');
		const [customerId, setCustomerId] = useState<string>('');
		const [contractorId, setContractorId] = useState<string>('');
	const [subtasks, setSubtasks] = useState<{ id: string; title: string; done: boolean; amount?: number; date?: string }[]>([]);
	
	// Состояние для динамического списка платежей
	const [payments, setPayments] = useState<Payment[]>([]);
	const [paymentMode, setPaymentMode] = useState<'payments' | 'subtasks'>('payments'); // 'payments' или 'subtasks'
	// Список расходов
	const [expensesItems, setExpensesItems] = useState<ExpenseItem[]>([]);
	const [tags, setTags] = useState<string[]>([]);
	const [links, setLinks] = useState<TaskLink[]>([]);
	const [calculatorQuantity, setCalculatorQuantity] = useState<string>('');
	const [calculatorPricePerUnit, setCalculatorPricePerUnit] = useState<string>('');
	const [useCalculator, setUseCalculator] = useState(false);
	const [priority, setPriority] = useState<TaskPriority>('medium');
	const removeTask = useBoardStore((s) => s.removeTask);
	// pendingClose и showConfirmClose теперь в useTaskFormUI
	// Паузы
	const [pausedRanges, setPausedRanges] = useState<{ from: string; to: string }[]>([]);
	// Доступы
	const [accesses, setAccesses] = useState<Access[]>([]);
	// passwordVisible теперь в useTaskFormUI

	// Сохраняем состояние калькулятора локально, чтобы не терять при случайных кликах
	const savedCalculatorState = React.useRef<{ taskId: string | null; quantity: string; pricePerUnit: string; enabled: boolean }>({
		taskId: null,
		quantity: '',
		pricePerUnit: '',
		enabled: false,
	});

	// Подключаем UI хук (раньше, чтобы был доступен в useEffect)
	const ui = useTaskFormUI();

	// Подключаем хуки для работы с файлами (раньше, чтобы files были доступны везде)
	const { files: taskFiles, addFiles, removeFile: removeFileHandler, renameFile: renameFileHandler, setFiles: setTaskFiles } = useTaskFiles(taskId, initial?.files || [], showError);

	// Мемоизируем значения токенов (вычисляются один раз при монтировании)
	const iconSizeMd = useMemo(() => getToken('--icon-size-md', 20), []);
	const iconSizeSm = useMemo(() => getToken('--icon-size-sm', 16), []);
	const iconSizeXs = useMemo(() => getToken('--icon-size-xs', 11), []);
	const modalWidth = useMemo(() => getToken('--modal-width', 400), []);
	const delayShort = useMemo(() => getToken('--delay-short', 200), []);

	// Используем хук для инициализации формы
	const { currentTaskId } = useTaskFormInit({
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
		setPriority: (value: TaskPriority | undefined) => {
			if (value !== undefined) {
				setPriority(value);
			}
		},
		setPausedRanges,
		setAccesses,
		setCalculatorQuantity,
		setCalculatorPricePerUnit,
		setUseCalculator,
		setTaskFiles,
		ui,
		savedCalculatorState,
	});

	// Используем хук для автосохранения
	useTaskFormAutosave({
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
		files: taskFiles,
		expensesItems,
		calculatorQuantity,
		calculatorPricePerUnit,
		useCalculator,
		priority,
		accesses,
	});

	// Загружаем подрядчиков при открытии формы
	// Используем getState() напрямую, так как функция из Zustand store стабильна
	React.useEffect(() => {
		if (open) {
			useContractorsStore.getState().loadFromDisk().catch(() => {});
		}
	}, [open]); // Только open в зависимостях

	// Сохраняем состояние калькулятора при изменении
	React.useEffect(() => {
		if (currentTaskId && useCalculator) {
			savedCalculatorState.current = {
				taskId: currentTaskId,
				quantity: calculatorQuantity,
				pricePerUnit: calculatorPricePerUnit,
				enabled: useCalculator,
			};
		}
	}, [currentTaskId, useCalculator, calculatorQuantity, calculatorPricePerUnit]);

	// Подключаем полноценный core-модуль для работы с платежами (до hasChanges, чтобы порядок хуков был правильным)
	const paymentsCore = useTaskPayments(
		payments,
		setPayments,
		paymentMode,
		setPaymentMode,
		setSubtasks
	);

	// Проверка наличия изменений в форме
	const hasChanges = useMemo(() => {
		if (!initial) {
			// Для новой задачи проверяем, есть ли хотя бы одно заполненное поле
			const hasSubtasksWithAmount = subtasks.length > 0 && subtasks.some(s => (s.amount || 0) > 0);
			const hasPaymentsWithData = payments.length > 0 && payments.some(p => p.date || p.amount || p.qty || p.price);
			const hasAccesses = accesses.length > 0 && accesses.some(a => a.label.trim() || a.login.trim() || a.password.trim());
			return !!(title.trim() || deadline || startDate || notes || customerId || subtasks.length || payments.length || expensesItems.length || tags.length || links.length || taskFiles.length || useCalculator || hasSubtasksWithAmount || hasPaymentsWithData || hasAccesses);
		}
		// Для редактирования сравниваем с начальными значениями
		
		const initialCalculatorQuantity = initial.calculatorQuantity != null ? String(initial.calculatorQuantity) : '';
		const initialCalculatorPricePerUnit = initial.calculatorPricePerUnit != null ? String(initial.calculatorPricePerUnit) : '';
		const initialUseCalculator = !!(initial.calculatorQuantity != null || initial.calculatorPricePerUnit != null);
		
		// Восстанавливаем платежи из initial для сравнения
		let initialPayments: Payment[] = [];
		let initialPaymentMode: 'payments' | 'subtasks' = 'payments';
		if (initial.payments && initial.payments.length > 0) {
			const paymentsArray = initial.payments;
			initialPayments = (paymentsArray as Array<Partial<Payment>>).map((p, idx) => ({
				id: `initial_${idx}`,
				title: p.title || (paymentsArray.length === 2 ? (idx === 0 ? 'Предоплата' : 'Постоплата') : `Платеж ${idx + 1}`),
				date: p.date || '',
				amount: p.amount || 0,
				qty: p.qty,
				price: p.price,
				paid: p.paid ?? (!!p.date),
				taxRate: p.taxRate ?? 0,
				calcEnabled: p.calcEnabled ?? false,
			}));
			if (initialPayments.length >= 3) {
				initialPaymentMode = 'subtasks';
			}
		} else if (initial.subtasks && initial.subtasks.length >= 3) {
			initialPaymentMode = 'subtasks';
		}
		
		// Используем унифицированные функции сравнения
		return (
			compareString(title, initial.title) ||
			compareValue(deadline, initial.deadline || '') ||
			compareValue(startDate, initial.startDate || '') ||
			compareString(notes, initial.notes) ||
			compareValue(customerId, initial.customerId || '') ||
			compareValue(contractorId, initial.contractorId || '') ||
			compareSubtasks(subtasks, initial.subtasks) ||
			comparePayments(payments, initialPayments) ||
			compareValue(paymentMode, initialPaymentMode) ||
			compareExpensesItems(expensesItems, initial.expensesEntries) ||
			compareTags(tags, initial.tags) ||
			compareLinks(links, normalizeLinks(initial.links)) ||
			compareFiles(taskFiles, initial.files) ||
			compareAccesses(accesses, initial.accesses) ||
			compareValue(priority, initial.priority || 'medium') ||
			compareValue(useCalculator, initialUseCalculator) ||
			(useCalculator && (calculatorQuantity !== initialCalculatorQuantity || calculatorPricePerUnit !== initialCalculatorPricePerUnit))
		);
	}, [initial, title, deadline, startDate, notes, customerId, contractorId, subtasks, payments, paymentMode, expensesItems, tags, links, taskFiles, priority, useCalculator, calculatorQuantity, calculatorPricePerUnit, accesses]);



	// Собираем formData для core
	const formData: TaskFormData = useMemo(() => ({
		title,
		deadline,
		startDate,
		notes,
		customerId,
		payments,
		expensesItems,
		tags,
		links,
		files: taskFiles,
		calculatorQuantity,
		calculatorPricePerUnit,
		useCalculator,
		priority,
		pausedRanges,
		accesses,
	}), [title, deadline, startDate, notes, customerId, payments, expensesItems, tags, links, taskFiles, calculatorQuantity, calculatorPricePerUnit, useCalculator, priority, pausedRanges, accesses]);

	// Подключаем core хук с бизнес-логикой
	const core = useTaskFormCore(formData);

	// Подключаем хук для работы со ссылками (после core, т.к. использует core.isValidUrl)
	const linksCore = useLinks(links, setLinks, core.isValidUrl, showError);

	// Подключаем хук для управления коллекциями (подзадачи, теги)
	const collections = useTaskFormCollections({
		subtasks,
		setSubtasks,
		tags,
		setTags,
		newSubtask: ui.newSubtask,
		setNewSubtask: ui.setNewSubtask,
		newTag: ui.newTag,
		setNewTag: ui.setNewTag,
	});

	// Функция для обработки закрытия с проверкой изменений
	const handleClose = React.useCallback((closeCallback: () => void) => {
		if (hasChanges) {
			ui.requestClose(closeCallback);
			} else {
			closeCallback();
		}
	}, [hasChanges, ui]);

	// Обработчики ссылок через useLinks (ВСЕ ХУКИ ДО РАННЕГО ВОЗВРАТА!)
	const handleAddLink = React.useCallback(() => {
		const result = linksCore.addLink(ui.newLink);
		if (result.success) {
			ui.setNewLink('');
			ui.setLinkError(null);
		} else if (result.error) {
			ui.setLinkError(result.error);
		}
	}, [ui.newLink, linksCore, ui.setNewLink, ui.setLinkError]);

	const handleRemoveLink = React.useCallback((idx: number) => {
		linksCore.removeLink(idx);
	}, [linksCore]);

	const handleUpdateLinkName = React.useCallback((idx: number, name: string) => {
		linksCore.updateLinkName(idx, name);
		ui.cancelEditingLinkName();
	}, [linksCore, ui.cancelEditingLinkName]);

	// Мемоизируем функции для ExpensesSection
	const handleAddExpense = useCallback(() => {
		setExpensesItems((prev) => [...prev, { id: generateShortId(), title: '', amount: 0 }]);
	}, []);

	const handleRemoveExpense = useCallback((id: string) => {
		setExpensesItems((prev) => prev.filter(i => i.id !== id));
	}, []);

	const handleUpdateExpense = useCallback((id: string, updates: Partial<ExpenseItem>) => {
		setExpensesItems((prev) => prev.map(i => i.id === id ? { ...i, ...updates } : i));
	}, []);

	// Мемоизируем функцию для SubtasksSection
	const handleUpdateSubtask = useCallback((id: string, patch: Partial<SubTask>) => {
		setSubtasks((prev) => prev.map((s) => (s.id === id ? { ...s, ...patch } : s)));
	}, []);

	// Мемоизируем функции для AccessesSection
	const handleAddAccess = useCallback(() => {
		setAccesses((prev) => [...prev, { label: '', login: '', password: '' }]);
	}, []);

	const handleChangeAccess = useCallback((idx: number, patch: Partial<Access>) => {
		setAccesses((prev) => {
			const updated = [...prev];
			updated[idx] = { ...updated[idx], ...patch };
			return updated;
		});
	}, []);

	const handleRemoveAccess = useCallback((idx: number) => {
		setAccesses((prev) => prev.filter((_, i) => i !== idx));
	}, []);

	const handleCopyAccess = useCallback((text: string) => {
		navigator.clipboard.writeText(text).then(() => {
			showSuccess('Успешно скопировано');
		}).catch(() => {});
	}, [showSuccess]);

	// Мемоизируем функции для LinksSection
	const handleGoToLink = useCallback((url: string) => {
		window.open(url, '_blank', 'noopener,noreferrer');
	}, []);

	const handleGoToLinkExternal = useCallback(async (url: string) => {
		const result = await openExternalUrl(url);
		if (!result.ok) {
			const { logger } = await import('@/shared/lib/logger');
			logger.error('TaskFormModal', 'Failed to open external URL', result.message);
		}
	}, []);

	const handleSelectAllOnDoubleClick = useCallback((e: React.MouseEvent) => {
		const target = e.target as HTMLInputElement | HTMLTextAreaElement;
		if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) {
			target.select();
		}
	}, []);

	// Мемоизируем contractors для ExpensesSection
	const contractorsForExpenses = useMemo(() => 
		contractors.map(c => ({ id: c.id, name: c.name, isActive: c.isActive, avatar: c.avatar })),
		[contractors]
	);


	// Используем хук для submit
	const { handleSubmit } = useTaskFormSubmit({
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
	});

	// handleConfirmClose и handleSaveAndClose используют ui, который объявлен выше
	const handleConfirmClose = useCallback(() => {
		ui.confirmClose();
	}, [ui]);

	const handleSaveAndClose = useCallback((e?: React.MouseEvent) => {
		if (e) {
			e.preventDefault();
		}
		// Используем formRef для правильного вызова submit (без DOM-магии)
		formRef.current?.requestSubmit();
		ui.cancelClose();
	}, [ui]);

	// Ранний возврат ПОСЛЕ всех хуков, но ПЕРЕД return
	if (!open) return null;

	return (
		<>
			{ui.showConfirmClose && (
				<Modal
					open={ui.showConfirmClose}
					onClose={ui.cancelClose}
					title={UI_TEXTS.CONFIRM_CLOSE_WITHOUT_SAVE}
					width={modalWidth}
					footer={<ModalFooter onCancel={handleConfirmClose} onConfirm={handleSaveAndClose} confirmText={UI_TEXTS.SAVE_AND_CLOSE} cancelText={UI_TEXTS.CLOSE} />}
				>
					<p style={{ color: 'var(--muted)', marginBottom: 'var(--space-none)' }}>{UI_TEXTS.CHANGES_WILL_BE_LOST}</p>
				</Modal>
			)}
			<div className="modal-backdrop" onClick={(e: React.MouseEvent<HTMLDivElement>) => { if (e.target === e.currentTarget) { handleClose(onClose); } }}>
				<div className="modal" onClick={(e: React.MouseEvent<HTMLDivElement>) => e.stopPropagation()} style={{ position: 'relative' }}>
					<div style={{ position: 'absolute', top: 'var(--space-md)', right: 'var(--space-md)', zIndex: 'var(--z-index-base)' }}>
						<IconButton
							onClick={() => handleClose(onClose)}
							title={UI_TEXTS.CLOSE}
							icon={XIcon}
							type="button"
							alignSelf="flex-start"
							iconSize={iconSizeMd}
						/>
					</div>
					<h3 style={{ marginTop: 'var(--space-none)', paddingRight: 'var(--space-lg)' }}>{initial ? UI_TEXTS.EDIT_TASK : UI_TEXTS.NEW_TASK}</h3>
					<form ref={formRef} onSubmit={handleSubmit} className="form-grid">
					<label className="col-span">
						<span>Название</span>
						<TextInput value={title} onChange={(e) => setTitle((e.target as HTMLInputElement).value)} onDoubleClick={selectAllOnDoubleClick} required />
					</label>
					{/* Бюджет удалён. Общий бюджет теперь считается как сумма платежей/подзадач. */}
					<label>
						<span>Дата начала</span>
						<TextInput type="date" value={startDate} onChange={(e) => setStartDate((e.target as HTMLInputElement).value)} onDoubleClick={selectAllOnDoubleClick} />
					</label>
					<label>
						<span>Дата окончания</span>
						<TextInput type="date" value={deadline} onChange={(e) => setDeadline((e.target as HTMLInputElement).value)} onDoubleClick={selectAllOnDoubleClick} />
					</label>
					<label className="col-span">
						<span>Паузы (не работали)</span>
						<FormField>
							{pausedRanges.map((r, idx) => (
								<div key={idx} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: 'var(--space-sm)', alignItems: 'center' }}>
									<TextInput type="date" value={r.from || ''} onChange={(e) => setPausedRanges(pausedRanges.map((x,i)=>i===idx?{...x, from: (e.target as HTMLInputElement).value}:x))} />
									<TextInput type="date" value={r.to || ''} onChange={(e) => setPausedRanges(pausedRanges.map((x,i)=>i===idx?{...x, to: (e.target as HTMLInputElement).value}:x))} />
									<IconButton title={UI_TEXTS.DELETE_PAUSE} icon={XIcon} onClick={() => setPausedRanges(pausedRanges.filter((_,i)=>i!==idx))} />
								</div>
							))}
							<div>
								<Button type="button" variant="action" onClick={() => setPausedRanges([...pausedRanges, { from: '', to: '' }])}>
									<span style={{ display: 'inline-flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
									<PlusIcon size={iconSizeSm} /> {UI_TEXTS.ADD} паузу
									</span>
								</Button>
							</div>
						</FormField>
					</label>
					{/* Приоритет, Заказчик и Исполнитель на одной линии */}
					<div className="col-span" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 'var(--space-md)', alignItems: 'start' }}>
						<FormField label="Приоритет">
							<PrioritySelect
								value={priority}
								onChange={setPriority}
								horizontalPadding="var(--space-md)"
							/>
						</FormField>
						<FormField label="Заказчик">
							<ContractorSelect
								value={customerId || undefined}
								contractors={customers}
								onChange={(customerId) => setCustomerId(customerId || '')}
								filterByActive={false}
								normalizeAvatar={false}
								minHeight="var(--control-sm-height)"
							/>
						</FormField>
						<FormField label="Исполнитель">
							<ContractorSelect
								value={contractorId || undefined}
								contractors={contractors}
								onChange={(contractorId) => setContractorId(contractorId || '')}
								minHeight="var(--control-sm-height)"
							/>
						</FormField>
					</div>
					{initial && (
						<label className="col-span">
							<AssigneeHistorySection taskId={taskId} contractors={contractors} />
						</label>
					)}
					<label className="col-span">
						<span>Расходы</span>
						<ExpensesSection
							expensesItems={expensesItems}
							expensesTotal={core.expensesTotal}
							onAdd={handleAddExpense}
							onRemove={handleRemoveExpense}
							onUpdate={handleUpdateExpense}
							onDoubleClick={selectAllOnDoubleClick}
							contractors={contractorsForExpenses}
						/>
					</label>
					<label className="col-span" style={{ marginTop: 'var(--space-none)', marginBottom: 'var(--space-none)' }}>
						<span>Платежи / Задачи</span>
						<div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
							{paymentMode === 'payments' ? (
								<PaymentsSection
									payments={payments}
									paymentErrors={paymentsCore.errors}
									paymentsTotal={paymentsCore.getTotal()}
									paymentActions={paymentsCore.actions}
														onDoubleClick={selectAllOnDoubleClick}
								/>
							) : (
								<SubtasksSection
									subtasks={subtasks}
									newSubtask={ui.newSubtask}
									onNewSubtaskChange={ui.setNewSubtask}
									onAddSubtask={collections.addSubtask}
									onToggleSubtask={collections.toggleSubtask}
									onRemoveSubtask={collections.removeSubtask}
									onUpdateSubtask={handleUpdateSubtask}
									selectAllOnDoubleClick={selectAllOnDoubleClick}
								/>
							)}
						</div>
					</label>
					<label className="col-span">
						<span>Теги</span>
						<FormField>
							{tags.length > 0 && (
								<div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-sm)' }}>
									{tags.map((tag) => (
										<div key={tag} style={{ display: 'inline-flex', alignItems: 'center', gap: 'var(--space-xs)' }}>
											<TagChip label={tag} />
											<TagRemoveButton onClick={() => collections.removeTag(tag)} />
										</div>
									))}
								</div>
							)}
							<div style={{ position: 'relative', width: '100%' }}>
								<TextInput 
									value={ui.newTag} 
									onChange={(e) => ui.setNewTag((e.target as HTMLInputElement).value)} 
									onDoubleClick={selectAllOnDoubleClick} 
									placeholder={UI_TEXTS.ADD_TAG_PLACEHOLDER} 
									style={{ 
										width: '100%',
										paddingRight: 'var(--space-lg)',
										boxSizing: 'border-box'
									}} 
									onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); collections.addTag(); } }} 
								/>
								<div
									style={{
										position: 'absolute',
										right: 'var(--space-sm)',
										top: '50%',
										transform: 'translateY(-50%)',
									}}
								>
									<IconButton
										onClick={collections.addTag}
										title={UI_TEXTS.ADD_TAG}
										icon={PlusIcon}
										iconSize={iconSizeMd}
									/>
								</div>
							</div>
						</FormField>
					</label>
					<label className="col-span">
						<span>Ссылки</span>
						<LinksSection
							links={links}
							newLink={ui.newLink}
							linkError={ui.linkError}
							editingLinkName={ui.editingLinkName}
							linkContextMenu={ui.linkContextMenu}
							onAddLink={handleAddLink}
							onRemoveLink={handleRemoveLink}
							onUpdateLinkName={handleUpdateLinkName}
							onNewLinkChange={ui.setNewLink}
							onNewLinkValidate={core.isValidUrl}
							onSetLinkError={ui.setLinkError}
							onSetEditingLinkName={ui.setEditingLinkName}
							onCancelEditingLinkName={ui.cancelEditingLinkName}
							onHandleLinkContextMenu={ui.handleLinkContextMenu}
							onCloseLinkContextMenu={ui.closeLinkContextMenu}
							onStartEditingLinkName={ui.startEditingLinkName}
							onGoToLink={handleGoToLink}
							onGoToLinkExternal={handleGoToLinkExternal}
							selectAllOnDoubleClick={handleSelectAllOnDoubleClick}
						/>
					</label>
					<label className="col-span">
						<span>Файлы</span>
						<FilesSection
							files={taskFiles}
							onAddFiles={addFiles}
							onRemoveFile={removeFileHandler}
							onRenameFile={renameFileHandler}
						/>
					</label>
					<label className="col-span">
						<span>Доступы</span>
						<AccessesSection
							accesses={accesses}
							onAdd={handleAddAccess}
							onChange={handleChangeAccess}
							onRemove={handleRemoveAccess}
							passwordVisible={ui.passwordVisible}
							onTogglePassword={ui.togglePasswordVisible}
							onCopy={handleCopyAccess}
						/>
					</label>
					<label className="col-span">
						<span>Заметки</span>
						<NotesField rows={4} value={notes} onChange={(e) => setNotes(e.target.value)} onDoubleClick={selectAllOnDoubleClick} />
					</label>
					<div style={{ display: 'flex', gap: 'var(--space-sm)', justifyContent: 'space-between' }} className="col-span">
						{initial && (
							<DeleteButton 
								onClick={async () => { 
									const confirmed = await useUIStore.getState().showConfirm({
										message: UI_TEXTS.DELETE_TASK,
										variant: 'danger',
										confirmText: UI_TEXTS.DELETE,
										cancelText: UI_TEXTS.CANCEL,
									});
									if (confirmed) {
										removeTask(initial.id);
										onClose();
									}
								}}
								title={UI_TEXTS.DELETE_TASK_TITLE}
							/>
						)}
						<div style={{ display: 'flex', gap: 'var(--space-sm)', marginLeft: 'auto' }}>
							<Button type="button" variant="secondary" onClick={() => handleClose(onClose)}>{UI_TEXTS.CANCEL}</Button>
							<Button type="submit" variant="primary">{UI_TEXTS.SAVE}</Button>
						</div>
					</div>
				</form>
			</div>
		</div>
		</>
	);
}