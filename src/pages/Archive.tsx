import React, { useMemo, useState, useCallback } from 'react';
import { useBoardStore, type Task } from '../store/board';
import { useCustomersStore } from '../store/customers';
import { useIncomeStore, type Income } from '../store/income';
import { TaskFormModal } from '../components/TaskFormModal';
import { useShallowSelector } from '@/shared/hooks/useStoreSelectors';
import { IncomeFormModal } from './dashboard/components/IncomeFormModal';
import { EmptyState } from './archive/components/EmptyState';
import { MonthSelector } from './archive/components/MonthSelector';
import { ArchiveTaskCard } from './archive/components/ArchiveTaskCard';
import { ArchiveIncomeCard } from './archive/components/ArchiveIncomeCard';
import {
	getArchivedTaskMonths,
	getArchivedIncomeMonths,
	getArchivedTasksForMonth,
	getArchivedIncomesForMonth,
} from './archive/utils/archiveUtils';
import { ARCHIVE_CARD_GRID_MIN_WIDTH } from './archive/utils/constants';

export function Archive(): React.ReactElement {
	const tasks = useShallowSelector(useBoardStore, (s) => s.tasks);
	const customers = useShallowSelector(useCustomersStore, (s) => s.customers);
	const incomes = useShallowSelector(useIncomeStore, (s) => s.incomes);
	const addIncome = useIncomeStore((s) => s.addIncome);
	const updateIncome = useIncomeStore((s) => s.updateIncome);
	const removeIncome = useIncomeStore((s) => s.removeIncome);
	const [editing, setEditing] = useState<Task | null>(null);
	const [showForm, setShowForm] = useState(false);
	const [editingIncome, setEditingIncome] = useState<Income | null>(null);
	const [showIncomeForm, setShowIncomeForm] = useState(false);
	const [selectedMonth, setSelectedMonth] = useState<string>('');
	const [selectedIncomeMonth, setSelectedIncomeMonth] = useState<string>('');

	// Получаем список месяцев с архивными задачами (по последнему платежу)
	const archivedMonths = useMemo(() => getArchivedTaskMonths(tasks), [tasks]);

	// Получаем список месяцев с архивными доп. доходами
	const incomeArchivedMonths = useMemo(() => getArchivedIncomeMonths(incomes), [incomes]);

	// Получаем задачи для выбранного месяца (по месяцу последнего платежа)
	const archivedTasks = useMemo(
		() => getArchivedTasksForMonth(tasks, selectedMonth),
		[tasks, selectedMonth]
	);

	// Получаем доп. доходы для выбранного месяца
	const archivedIncomes = useMemo(
		() => getArchivedIncomesForMonth(incomes, selectedIncomeMonth),
		[incomes, selectedIncomeMonth]
	);

	// Автоматически выбираем первый месяц, если не выбран
	React.useEffect(() => {
		if (!selectedMonth && archivedMonths.length > 0) {
			setSelectedMonth(archivedMonths[0]);
		}
	}, [selectedMonth, archivedMonths]);

	// Автоматически выбираем первый месяц для доп. доходов, если не выбран
	React.useEffect(() => {
		if (!selectedIncomeMonth && incomeArchivedMonths.length > 0) {
			setSelectedIncomeMonth(incomeArchivedMonths[0]);
		}
	}, [selectedIncomeMonth, incomeArchivedMonths]);

	const onEditTask = useCallback((task: Task) => {
		setEditing(task);
		setShowForm(true);
	}, []);

	const onEditIncome = useCallback((income: Income) => {
		setEditingIncome(income);
		setShowIncomeForm(true);
	}, []);

	const handleCloseTaskForm = useCallback(() => {
		setShowForm(false);
		setEditing(null);
	}, []);

	const handleCloseIncomeForm = useCallback(() => {
		setShowIncomeForm(false);
		setEditingIncome(null);
	}, []);

	const handleSaveIncome = useCallback((income: Omit<Income, 'id'>) => {
		if (editingIncome) {
			updateIncome(editingIncome.id, income);
		} else {
			addIncome(income.title, income.amount, income.date, income.taxRate, income.notes);
		}
		handleCloseIncomeForm();
	}, [editingIncome, updateIncome, addIncome, handleCloseIncomeForm]);

	const handleDeleteIncome = useCallback(() => {
		if (editingIncome) {
			removeIncome(editingIncome.id);
			handleCloseIncomeForm();
		}
	}, [editingIncome, removeIncome, handleCloseIncomeForm]);

	return (
		<div className="page">
			<div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
				<div>
					<h1 className="page-title">Архив задач</h1>
					<p className="page-subtitle">
						Завершенные полностью оплаченные задачи по последнему платежу за прошлые месяцы
					</p>
				</div>
			</div>

			<TaskFormModal open={showForm} initial={editing} onClose={handleCloseTaskForm} />

			{showIncomeForm && (
				<IncomeFormModal
					open={showIncomeForm}
					initial={editingIncome}
					onClose={handleCloseIncomeForm}
					onSave={handleSaveIncome}
					onDelete={editingIncome ? handleDeleteIncome : undefined}
				/>
			)}

			{archivedMonths.length === 0 ? (
				<EmptyState
					title="Архивных задач пока нет"
					description="Завершенные задачи, у которых последний платёж был в прошлом месяце, автоматически попадают в архив"
				/>
			) : (
				<>
					<MonthSelector
						label="Выберите месяц"
						value={selectedMonth}
						onChange={setSelectedMonth}
						months={archivedMonths}
					/>

					<div
						style={{
							display: 'grid',
							gridTemplateColumns: `repeat(auto-fill, minmax(${ARCHIVE_CARD_GRID_MIN_WIDTH}, 1fr))`,
							gap: 'var(--space-md)',
							marginTop: 'var(--space-md)',
						}}
					>
						{archivedTasks.map((t) => {
							const customer = customers.find((c) => c.id === t.customerId);
							return <ArchiveTaskCard key={t.id} task={t} customer={customer} onEdit={onEditTask} />;
						})}
					</div>

					{archivedTasks.length === 0 && selectedMonth && (
						<EmptyState title="Нет задач за выбранный месяц" />
					)}

					<hr
						style={{
						margin: 'var(--space-xl) 0',
						border: 'none',
						borderTop: 'var(--border-top-default)',
					}}
					/>

					<div
						style={{
							display: 'flex',
							justifyContent: 'space-between',
							alignItems: 'center',
							marginTop: 'var(--space-sm)',
						}}
					>
						<div>
							<h2 style={{ margin: 0 }}>Архив дополнительных доходов</h2>
							<p
								style={{
									margin: 'var(--space-xs) 0 0',
									color: 'var(--muted)',
									fontSize: 'var(--font-size-sm)',
								}}
							>
								Доп. доходы, которые были получены в прошлых месяцах
							</p>
						</div>
					</div>

					{incomeArchivedMonths.length === 0 ? (
						<EmptyState title="Архивных доп. доходов пока нет" />
					) : (
						<>
							<MonthSelector
								label="Месяц доп. доходов"
								value={selectedIncomeMonth}
								onChange={setSelectedIncomeMonth}
								months={incomeArchivedMonths}
							/>

							<div
								style={{
									display: 'grid',
									gridTemplateColumns: `repeat(auto-fill, minmax(${ARCHIVE_CARD_GRID_MIN_WIDTH}, 1fr))`,
									gap: 'var(--space-md)',
									marginTop: 'var(--space-md)',
								}}
							>
								{archivedIncomes.map((inc) => (
									<ArchiveIncomeCard key={inc.id} income={inc} onEdit={onEditIncome} />
								))}
							</div>

							{archivedIncomes.length === 0 && selectedIncomeMonth && (
								<EmptyState title="Нет доп. доходов за выбранный месяц" />
							)}
						</>
					)}
				</>
			)}
		</div>
	);
}
