import React, { useMemo, useState, useEffect, useRef, useCallback } from 'react';
import { Columns, useBoardStore } from '../store/board';
import type { ColumnId, Task, TaskPriority } from '@/types';
import { useCustomersStore } from '../store/customers';
import { useContractorsStore } from '../store/contractors';
import { useSettingsStore } from '../store/settings';
import { useGoalsStore } from '../store/goals';
import { useIncomeStore, type Income } from '../store/income';
import { useExtraWorkStore } from '../store/extra-work';
import { TaskFormModal } from '../components/TaskFormModal';
import { ContextMenu } from '@/shared/components/ContextMenu';
import { PlusIcon } from '@/shared/components/Icons';
import { Button, TagChip } from '@/shared/ui';
import { getToken } from '@/shared/lib/tokens';
import { FiltersBar } from './dashboard/components/FiltersBar';
import { TaskBoardSection } from './dashboard/components/TaskBoardSection';
import { AdditionalIncomeSection } from './dashboard/components/AdditionalIncomeSection';
import { FinancialSummarySection } from './dashboard/components/FinancialSummarySection';
import { IncomeFormModal } from './dashboard/components/IncomeFormModal';
import { PausedTasksSection } from './dashboard/components/PausedTasksSection';
import { useShallowSelector } from '@/shared/hooks/useStoreSelectors';
import { useDashboardCalculations } from './dashboard/hooks/useDashboardCalculations';
import { useDashboardFilters } from './dashboard/hooks/useDashboardFilters';
import { useDashboardHandlers } from './dashboard/hooks/useDashboardHandlers';
import { useDashboardContextMenu } from './dashboard/hooks/useDashboardContextMenu';
import { createLogger } from '@/shared/lib/logger';

const log = createLogger('Dashboard');

const FILTERABLE_COLUMNS: Array<{ id: ColumnId; title: string }> = [
	...Columns,
	{ id: 'cancelled', title: 'Отменено' },
];

export function Dashboard(): React.ReactElement {
	// Оптимизированные селекторы для массивов/объектов (с shallow сравнением)
	const tasks = useShallowSelector(useBoardStore, (s) => s.tasks);
	const customers = useShallowSelector(useCustomersStore, (s) => s.customers);
	const contractors = useShallowSelector(useContractorsStore, (s) => s.contractors);
	const monthlyFinancialGoals = useShallowSelector(useGoalsStore, (s) => s.monthlyFinancialGoals);
	const credits = useShallowSelector(useGoalsStore, (s) => s.credits);
	const incomes = useShallowSelector(useIncomeStore, (s) => s.incomes);
	const extraWorks = useShallowSelector(useExtraWorkStore, (s) => s.extraWorks);
	const settings = useShallowSelector(useSettingsStore, (s) => s.settings);
	
	// Функции стабильны, можно использовать обычные селекторы
	const addTask = useBoardStore((s) => s.addTask);
	const moveTask = useBoardStore((s) => s.moveTask);
	const updateTask = useBoardStore((s) => s.updateTask);
	const removeTask = useBoardStore((s) => s.removeTask);
	const addIncome = useIncomeStore((s) => s.addIncome);
	const updateIncome = useIncomeStore((s) => s.updateIncome);
	const removeIncome = useIncomeStore((s) => s.removeIncome);

	const [showForm, setShowForm] = useState(false);
	const [editing, setEditing] = useState<Task | null>(null);
	const [showIncomeForm, setShowIncomeForm] = useState(false);
	const [editingIncome, setEditingIncome] = useState<Income | null>(null);
	const [showPausedColumn, setShowPausedColumn] = useState(false);

	// Загружаем данные при монтировании компонента
	// Используем getState() напрямую, так как функции из Zustand store стабильны
	useEffect(() => {
		useCustomersStore.getState().loadFromDisk().catch(() => {});
		useContractorsStore.getState().loadFromDisk().catch(() => {});
		useExtraWorkStore.getState().loadFromDisk().catch(() => {});
	}, []); // Пустой массив - выполнится только при монтировании

	const migrationDoneRef = useRef(false);
	useEffect(() => {
        if (migrationDoneRef.current) return;
		const tasksToMigrate = tasks.filter((t) => t.columnId === ('done' as ColumnId));
        if (tasksToMigrate.length > 0) {
            const { updateTask } = useBoardStore.getState();
            tasksToMigrate.forEach((t) => {
                const isFullyPaid = t.amount && t.paidAmount && t.paidAmount >= t.amount;
                updateTask(t.id, { columnId: isFullyPaid ? 'closed' : 'completed' });
            });
            migrationDoneRef.current = true;
        }
    }, [tasks]); // updateTask убран, так как функция из Zustand стабильна

    const tasksByColumn = useMemo(() => {
		const map: Record<ColumnId, Task[]> = {
			unprocessed: [],
			notstarted: [],
			inwork: [],
			completed: [],
			closed: [],
			cancelled: [],
			clients: [],
			paused: [],
		};
		tasks.forEach((t) => {
			// Задачи на паузе обрабатываются отдельно
			if (t.columnId === 'paused') {
				map.paused.push(t);
				return;
			}
			
			if (t.columnId !== 'clients' && t.columnId !== 'cancelled') {
				const columnId = t.columnId === ('done' as ColumnId) ? 'completed' : t.columnId;
				if (columnId && map[columnId]) {
					map[columnId].push(t);
				} else {
					log.warn('Task with unknown columnId', { id: t.id, title: t.title, columnId: t.columnId, available: Object.keys(map) });
				}
			}
		});
		return map;
	}, [tasks]);

	const now = new Date();

	// Используем хук для всех расчетов
	const {
		tasksThisMonth,
		currentFinancialGoalData,
		totals,
		sparkData,
		creditsSparkData,
		getTaskColumnForCalculations,
	} = useDashboardCalculations(tasks, incomes, extraWorks, monthlyFinancialGoals, credits, now);

	// Используем хук для фильтрации
	const filters = useDashboardFilters({
		tasks,
		getTaskColumnForCalculations,
	});

	const availableTags = useMemo(() => {
		const tagSet = new Set<string>();
		tasks.forEach((t) => {
			(t.tags || []).forEach((tag) => {
				if (tag && tag.trim()) {
					tagSet.add(tag.trim());
				}
			});
		});
		return Array.from(tagSet).sort((a, b) => a.localeCompare(b, 'ru'));
	}, [tasks]);

	const filteredTasks = filters.filteredTasks;

	const filteredTasksByColumn = useMemo(() => {
		const map: Record<ColumnId, Task[]> = {
			unprocessed: [],
			notstarted: [],
			inwork: [],
			completed: [],
			closed: [],
			cancelled: [],
			clients: [],
			paused: [],
		};
		filteredTasks.forEach((t) => {
			if (t.columnId === 'paused') {
				map.paused.push(t);
				return;
			}
			
			if (t.columnId !== 'clients' && t.columnId !== 'cancelled') {
				const columnId = t.columnId === ('done' as ColumnId) ? 'completed' : t.columnId;
				if (columnId && map[columnId]) {
					map[columnId].push(t);
				} else {
					log.warn('Task with unknown columnId', { id: t.id, title: t.title, columnId: t.columnId, availableColumns: Object.keys(map) });
				}
			}
		});
        
        const priorityOrder: Record<TaskPriority | 'none', number> = {
            high: 1,
            medium: 2,
            low: 3,
            none: 4,
        };
        
        Object.keys(map).forEach((colId) => {
            map[colId as ColumnId].sort((a, b) => {
                const aPriority = a.priority || 'none';
                const bPriority = b.priority || 'none';
                return priorityOrder[aPriority] - priorityOrder[bPriority];
            });
        });
        
        return map;
    }, [filteredTasks]);

	// Используем хук для контекстного меню
	const contextMenu = useDashboardContextMenu();

	const handleAddTask = useCallback(() => {
		setEditing(null);
		setShowForm(true);
	}, []);

	const handleEditTask = useCallback((task: Task) => {
		setEditing(task);
		setShowForm(true);
	}, []);

	// Используем хук для обработчиков
	const handlers = useDashboardHandlers({
		onEditTask: handleEditTask,
	});

	const handleAddIncome = useCallback(() => {
		setShowIncomeForm(true);
		setEditingIncome(null);
	}, []);

	const handleEditIncome = useCallback((income: Income) => {
		setEditingIncome(income);
		setShowIncomeForm(true);
	}, []);

	const statusOptions = useMemo(() => [
		{ id: 'all' as const, label: 'Все статусы' },
		...FILTERABLE_COLUMNS.map((col) => ({ id: col.id, label: col.title })),
	], []);

	// hasActiveFilters теперь вычисляется в хуке filters

	const iconSizeSm = useMemo(() => getToken('--icon-size-sm', 16), []);
	const iconSizeXs = useMemo(() => getToken('--icon-size-xs', 11), []);

	return (
		<div className="page">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-md)' }}>
            				<div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
                                <h1 className="page-title">Доска</h1>
            					<div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)', flexWrap: 'wrap' }}>
									<p className="page-subtitle" style={{ margin: 0 }}>
										Управление клиентами и финансами
									</p>
									{tasksThisMonth > 0 && (
										<TagChip 
											label={`Задач в этом месяце: ${tasksThisMonth}`} 
											variant="default" 
										/>
									)}
								</div>
            				</div>
				<div style={{ display: 'flex', gap: 'var(--space-sm)', flexWrap: 'wrap' }}>
                            <Button onClick={handleAddTask} variant="primary">
                                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
                                    <PlusIcon size={iconSizeSm} color="currentColor" />
                                    <span>Добавить задачу</span>
                                </span>
                            </Button>
					<Button onClick={handleAddIncome} variant="secondary">
                                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
                                    <PlusIcon size={iconSizeSm} color="currentColor" />
                                    <span>Добавить доход</span>
                                </span>
                            </Button>
                            </div>
            			</div>

            <TaskFormModal open={showForm} initial={editing} onClose={() => { setShowForm(false); setEditing(null); }} />

            {showIncomeForm && (
                <IncomeFormModal
                    open={showIncomeForm}
                    initial={editingIncome}
                    onClose={() => {
                        setShowIncomeForm(false);
                        setEditingIncome(null);
                    }}
                    onSave={(income) => {
                        if (editingIncome) {
                            updateIncome(editingIncome.id, income);
                        } else {
                            addIncome(income.title, income.amount, income.date, income.taxRate, income.notes);
                        }
                        setShowIncomeForm(false);
                        setEditingIncome(null);
                    }}
					onDelete={editingIncome ? () => handlers.handleDeleteIncome(editingIncome) : undefined}
                />
            )}

            {contextMenu.contextMenu && (
                <ContextMenu
                    x={contextMenu.contextMenu.x}
                    y={contextMenu.contextMenu.y}
                    onClose={contextMenu.closeContextMenu}
					sections={[
						{
							id: 'actions',
							actions: [
								{ id: 'edit', label: 'Редактировать', onClick: () => handlers.onEditTask(contextMenu.contextMenu!.task) },
								{ id: 'duplicate', label: 'Дублировать', onClick: () => handlers.handleDuplicateTask(contextMenu.contextMenu!.task) },
								...(contextMenu.contextMenu.task.columnId === 'paused'
									? [{ id: 'resume', label: 'Снять с паузы', onClick: () => handlers.handleResumeTask(contextMenu.contextMenu!.task) }]
									: [{ id: 'pause', label: 'Поставить на паузу', onClick: () => handlers.handlePauseTask(contextMenu.contextMenu!.task) }]),
							],
						},
						{
							id: 'status',
							title: 'Статус',
							actions: contextMenu.availableStatuses.map((status) => ({
								id: status.id,
								label: status.title,
								isActive: contextMenu.contextMenu!.task.columnId === status.id,
								onClick: () => handlers.handleChangeStatus(contextMenu.contextMenu!.task, status.id),
							})),
						},
						{
							id: 'priority',
							title: 'Приоритет',
							actions: contextMenu.availablePriorities.map((priority) => ({
								id: priority.id,
								label: priority.title,
								isActive: contextMenu.contextMenu!.task.priority === priority.id,
								onClick: () => handlers.handleChangePriority(contextMenu.contextMenu!.task, priority.id),
							})),
						},
						{
							id: 'danger',
							actions: [
								{ id: 'delete', label: 'Удалить', tone: 'danger', onClick: () => handlers.handleDeleteTask(contextMenu.contextMenu!.task) },
							],
						},
					]}
                />
            )}

            {contextMenu.linkContextMenu && (
				<ContextMenu
                    x={contextMenu.linkContextMenu.x}
                    y={contextMenu.linkContextMenu.y}
                    onClose={contextMenu.closeLinkContextMenu}
					sections={[
						{
							id: 'link-actions',
							actions: [
								{ id: 'open', label: 'Перейти', onClick: () => handlers.handleLinkGoTo(contextMenu.linkContextMenu!.link) },
								{ id: 'external', label: 'Перейти во внешнем браузере', onClick: () => handlers.handleLinkGoToExternal(contextMenu.linkContextMenu!.link) },
								{ id: 'copy', label: 'Скопировать', onClick: () => handlers.handleLinkCopy(contextMenu.linkContextMenu!.link) },
							],
						},
						{
							id: 'link-danger',
							actions: [
								{ id: 'delete', label: 'Удалить ссылку', tone: 'danger', onClick: () => handlers.handleLinkDelete(contextMenu.linkContextMenu!.link, contextMenu.linkContextMenu!.task) },
							],
						},
					]}
				/>
			)}

			<FiltersBar
				searchInput={filters.searchInput}
				onSearchInputChange={filters.setSearchInput}
				filterCustomer={filters.filterCustomer}
				onCustomerChange={filters.setFilterCustomer}
				filterContractor={filters.filterContractor}
				onContractorChange={filters.setFilterContractor}
				filterStatus={filters.filterStatus}
				onStatusChange={filters.setFilterStatus}
				filterPriority={filters.filterPriority}
				onPriorityChange={filters.setFilterPriority}
				filterTags={filters.filterTags}
				onTagsChange={filters.setFilterTags}
				filterStartDate={filters.filterStartDate}
				filterEndDate={filters.filterEndDate}
				onDateChange={({ start, end }) => {
					filters.setFilterStartDate(start);
					filters.setFilterEndDate(end);
				}}
				filterAssigneeChanged={filters.filterAssigneeChanged}
				onAssigneeChangedChange={filters.setFilterAssigneeChanged}
				onReset={filters.resetFilters}
				hasActiveFilters={filters.hasActiveFilters}
				customers={customers}
				contractors={contractors.filter(c => c.isActive)}
				statusOptions={statusOptions}
				availableTags={availableTags}
			/>

			<PausedTasksSection
				tasks={filteredTasksByColumn.paused}
				customers={customers}
				contractors={contractors}
				settings={settings}
				showPausedColumn={showPausedColumn}
				onToggleShow={() => setShowPausedColumn(!showPausedColumn)}
				onEdit={handleEditTask}
				onContextMenu={contextMenu.handleContextMenu}
				onDragStart={handlers.onDragStart}
			/>

			<TaskBoardSection
				columns={Columns}
				tasksByColumn={filteredTasksByColumn}
				customers={customers}
				contractors={contractors}
				onDragStart={handlers.onDragStart}
				onDrop={handlers.onDrop}
				onDragOver={handlers.onDragOver}
				onEditTask={(task) => {
					setEditing(task);
					setShowForm(true);
				}}
				onTaskContextMenu={contextMenu.handleContextMenu}
				onLinkContextMenu={contextMenu.handleLinkContextMenu}
				hoveredLinkKey={contextMenu.hoveredLinkKey}
				onLinkHover={contextMenu.setHoveredLinkKey}
				settings={settings}
			/>

			<AdditionalIncomeSection
				incomes={incomes}
				onAddIncome={handleAddIncome}
				onEditIncome={handleEditIncome}
				onDeleteIncome={handlers.handleDeleteIncome}
			/>

			<FinancialSummarySection
				currentFinancialGoalData={currentFinancialGoalData}
				totals={totals}
				sparkData={sparkData}
				creditsSparkData={creditsSparkData}
				customers={customers}
			/>
		</div>
	);
}



