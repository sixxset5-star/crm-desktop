import React, { useMemo, useState } from 'react';
import { formatCurrencyRub } from '@/shared/lib/format';
import { PlusIcon } from '@/shared/components/Icons';
import { Button, Select } from '@/shared/ui';
import { MetricCard } from '@/shared/components/MetricCard';
import { getToken } from '@/shared/lib/tokens';
import { useSmartFinancialModel } from './financial-model/hooks/useSmartFinancialModel';
import {
	EnhancedCreditCard,
	ExpenseCard,
	ExpenseForm,
	SmartCreditFormModal,
	CreditScheduleTable,
	CreditReminders,
	CreditsMigrationModal,
} from './financial-model/components';
import { getMonthLabel } from './financial-model/utils';
import { useGoalsStore } from '@/store/goals';
import { useCreditsStore } from '@/store/credits';
import { Modal } from '@/shared/ui/Modal';
import { useUIStore } from '@/store/ui';
import { UI_TEXTS } from '@/shared/constants/ui-texts';

export function FinancialModel(): React.ReactElement {
	const iconSizeMd = useMemo(() => getToken('--icon-size-md', 20), []);
	const modalWidthLg = useMemo(() => getToken('--modal-width-lg', 900), []);

	const {
		credits,
		totalDebt,
		monthlyDebtDelta,
		monthlyCreditPayments,
		upcomingPayments,
		availableMonths,
		selectedMonth,
		setSelectedMonth,
		currentMonthData,
		totalExpenses,
		editingExpense,
		newExpenseName,
		setNewExpenseName,
		newExpenseAmount,
		setNewExpenseAmount,
		showForm,
		setShowForm,
		editing,
		setEditing,
		showMigrationModal,
		setShowMigrationModal,
		migrationCredits,
		handleSubmit,
		handleEdit,
		handleDelete,
		handlePaymentToggle,
		handleAddExpense,
		handleEditExpense,
		handleSaveExpense,
		handleCancelEdit,
	} = useSmartFinancialModel();
	
	const loadCredits = useCreditsStore((s) => s.loadCredits);

	const [viewingScheduleCreditId, setViewingScheduleCreditId] = useState<string | null>(null);

	const updateMonthlyExpense = useGoalsStore((s) => s.updateMonthlyExpense);
	const removeMonthlyExpense = useGoalsStore((s) => s.removeMonthlyExpense);

	// Находим кредит для просмотра графика (обновляется автоматически при изменении credits)
	const viewingCredit = useMemo(() => {
		return viewingScheduleCreditId ? credits.find((c) => c.id === viewingScheduleCreditId) : null;
	}, [viewingScheduleCreditId, credits]);

	return (
		<div className="page">
			<div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)', marginBottom: 'var(--space-md)' }}>
				<div>
					<h1 className="page-title">Финансовая модель</h1>
					<p className="page-subtitle">Управление кредитами и финансовыми целями по месяцам</p>
				</div>
				<Button
					onClick={() => {
						setEditing(null);
						setShowForm(true);
					}}
					variant="primary"
					size="sm"
				>
					<span style={{ display: 'inline-flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
						<PlusIcon size={iconSizeMd} color="currentColor" />
						<span>Добавить кредит</span>
					</span>
				</Button>
			</div>

			{/* Напоминания */}
			{upcomingPayments.length > 0 && (
				<CreditReminders
					payments={upcomingPayments}
					onCreditClick={(creditId) => {
						setViewingScheduleCreditId(creditId);
					}}
				/>
			)}

			{/* Список кредитов */}
			<div style={{ marginTop: 'var(--space-lg)' }}>
				<h2 style={{ marginBottom: 'var(--space-md)' }}>Кредиты и кредитные карты</h2>
				<div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
					{credits.map((credit) => (
						<EnhancedCreditCard
							key={credit.id}
							credit={credit}
							onEdit={handleEdit}
							onDelete={handleDelete}
							onViewSchedule={(creditId) => setViewingScheduleCreditId(creditId)}
						/>
					))}
					{credits.length === 0 && (
						<div
							style={{
								textAlign: 'center',
								padding: 'var(--space-xl)',
								color: 'var(--muted)',
							}}
						>
							Нет кредитов. Добавьте первый!
						</div>
					)}
				</div>
			</div>

			{/* Финансовые цели по месяцам */}
			<div
				style={{
					marginTop: 'var(--space-lg)',
					background: 'var(--panel)',
					border: 'var(--border-width) solid var(--border)',
					borderRadius: 'var(--radius-lg)',
					padding: 'var(--space-lg)',
				}}
			>
				<h2 style={{ marginTop: 0, marginBottom: 'var(--space-md)' }}>Финансовые цели по месяцам</h2>
				<div style={{ marginBottom: 'var(--space-md)' }}>
					<label style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
						<span style={{ fontSize: 'var(--font-size-sm)', fontWeight: 'var(--font-weight-semibold)', color: 'var(--text)' }}>
							Выберите месяц
						</span>
						<Select
							size="xs"
							value={selectedMonth}
							onChange={(e) => setSelectedMonth((e.target as HTMLSelectElement).value)}
							style={{ minWidth: 'var(--reports-month-label-min-width)' }}
						>
							{availableMonths.map((monthKey) => (
								<option key={monthKey} value={monthKey}>
									{getMonthLabel(monthKey)}
								</option>
							))}
						</Select>
					</label>
				</div>

				<div
					style={{
						marginBottom: 'var(--space-md)',
						padding: 'var(--space-md)',
						background: 'var(--bg)',
						borderRadius: 'var(--radius-md)',
						border: 'var(--border-width) solid var(--border)',
					}}
				>
					<div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-md)' }}>
						<div style={{ fontSize: 'var(--font-size-sm)', fontWeight: 'var(--font-weight-semibold)', color: 'var(--text)' }}>
							Расходы за {getMonthLabel(selectedMonth)}
						</div>
						<div style={{ fontSize: 'var(--font-size-xl)', fontWeight: 'var(--font-weight-bold)', color: 'var(--accent)' }}>
							{formatCurrencyRub(totalExpenses)}
						</div>
					</div>

					{/* Категория "Кредиты" в расходах */}
					{monthlyCreditPayments > 0 && (
						<div
							style={{
								marginBottom: 'var(--space-sm)',
								padding: 'var(--space-sm)',
								background: 'var(--panel)',
								borderRadius: 'var(--radius-md)',
								display: 'flex',
								justifyContent: 'space-between',
								alignItems: 'center',
							}}
						>
							<span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text)' }}>Кредиты</span>
							<span style={{ fontSize: 'var(--font-size-sm)', fontWeight: 'var(--font-weight-semibold)', color: 'var(--red)', fontFamily: 'monospace' }}>
								{formatCurrencyRub(monthlyCreditPayments)}
							</span>
						</div>
					)}

					<div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)', marginBottom: 'var(--space-md)' }}>
						{currentMonthData.expenses && currentMonthData.expenses.length > 0 ? (
							currentMonthData.expenses.map((expense) => {
								const isEditing = editingExpense?.expenseId === expense.id;
								return isEditing ? (
									<div
										key={expense.id}
										style={{
											display: 'flex',
											alignItems: 'center',
											gap: 'var(--space-sm)',
											padding: 'var(--space-sm)',
											background: 'var(--panel)',
											borderRadius: 'var(--radius-md)',
											border: 'var(--border-width) solid var(--border)',
										}}
									>
										<ExpenseForm
											name={newExpenseName}
											amount={newExpenseAmount}
											onNameChange={setNewExpenseName}
											onAmountChange={setNewExpenseAmount}
											onSubmit={handleSaveExpense}
											onCancel={handleCancelEdit}
											isEditing={true}
										/>
									</div>
								) : (
									<ExpenseCard
										key={expense.id}
										expense={expense}
										isEditing={false}
										onToggleComplete={(completed) => updateMonthlyExpense(selectedMonth, expense.id, { completed })}
										onEdit={() => handleEditExpense(selectedMonth, expense.id)}
									onDelete={async () => {
										const confirmed = await useUIStore.getState().showConfirm({
											message: UI_TEXTS.DELETE_EXPENSE,
											variant: 'danger',
											confirmText: UI_TEXTS.DELETE,
											cancelText: UI_TEXTS.CANCEL,
										});
										if (confirmed) {
											removeMonthlyExpense(selectedMonth, expense.id);
										}
									}}
									/>
								);
							})
						) : (
							<div
								style={{
									textAlign: 'center',
									padding: 'var(--space-lg)',
									color: 'var(--muted)',
									fontSize: 'var(--font-size-sm)',
								}}
							>
								Нет расходов для этого месяца. Добавьте первый расход ниже.
							</div>
						)}
					</div>

					{!editingExpense && (
						<ExpenseForm
							name={newExpenseName}
							amount={newExpenseAmount}
							onNameChange={setNewExpenseName}
							onAmountChange={setNewExpenseAmount}
							onSubmit={handleAddExpense}
						/>
					)}
				</div>
			</div>

			{/* Сводка */}
			<div style={{ marginTop: 'var(--space-lg)', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 'var(--space-md)' }}>
				<MetricCard title="Общая сумма долгов" value={formatCurrencyRub(totalDebt)} valueColor="var(--red)" border={false} />
				<MetricCard title="Платежи по кредитам" value={formatCurrencyRub(monthlyCreditPayments)} valueColor="var(--red)" border={false} />
				<MetricCard
					title="Уменьшение долга за месяц"
					value={formatCurrencyRub(monthlyDebtDelta)}
					valueColor={monthlyDebtDelta > 0 ? 'var(--green)' : 'var(--muted)'}
					border={false}
				/>
			</div>

			{/* Форма добавления/редактирования */}
			<SmartCreditFormModal
				open={showForm}
				editing={editing}
				onSubmit={handleSubmit}
				onClose={() => {
					setShowForm(false);
					setEditing(null);
				}}
			/>

			{/* Модальное окно просмотра графика */}
			{viewingCredit && (
				<Modal
					open={!!viewingScheduleCreditId}
					onClose={() => setViewingScheduleCreditId(null)}
					title={`График платежей: ${viewingCredit.name}`}
					width={modalWidthLg}
				>
					{viewingCredit.schedule && viewingCredit.schedule.length > 0 ? (
						<CreditScheduleTable
							schedule={viewingCredit.schedule}
							onPaymentToggle={async (itemId, paid, paidAmount) => {
								await handlePaymentToggle(viewingCredit.id, itemId, paid, paidAmount);
								// Обновляем кредит после применения платежа (store обновится автоматически)
							}}
							viewMode="table"
						/>
					) : (
						<div style={{ padding: 'var(--space-lg)', textAlign: 'center' }}>
							<p style={{ marginBottom: 'var(--space-md)', color: 'var(--text-secondary)' }}>
								График платежей еще не построен.
							</p>
							<p style={{ marginBottom: 'var(--space-md)', color: 'var(--text-secondary)' }}>
								Отредактируйте кредит и заполните все необходимые поля (сумма, ставка, срок, дата начала), чтобы автоматически построить график.
							</p>
							<Button
								onClick={() => {
									setViewingScheduleCreditId(null);
									handleEdit(viewingCredit);
								}}
								variant="primary"
							>
								Редактировать кредит
							</Button>
						</div>
					)}
				</Modal>
			)}

			{/* Модальное окно миграции кредитов */}
			<CreditsMigrationModal
				open={showMigrationModal}
				credits={migrationCredits}
				onClose={() => setShowMigrationModal(false)}
				onMigrated={async () => {
					await loadCredits(true); // Принудительная перезагрузка
					setShowMigrationModal(false);
				}}
			/>
		</div>
	);
}
