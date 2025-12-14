import React from 'react';
import type { MonthlyExpense } from '@/store/goals';
import { formatCurrencyRub } from '@/shared/lib/format';
import { EditIcon, TrashIcon } from '@/shared/components/Icons';
import IconButton from '@/shared/components/IconButton';
import { Checkbox } from '@/shared/ui';
import { UI_TEXTS } from '@/shared/constants/ui-texts';

type ExpenseCardProps = {
	expense: MonthlyExpense;
	isEditing: boolean;
	onToggleComplete: (completed: boolean) => void;
	onEdit: () => void;
	onDelete: () => void;
};

export function ExpenseCard({ expense, isEditing, onToggleComplete, onEdit, onDelete }: ExpenseCardProps): React.ReactElement {
	if (isEditing) {
		return null; // Редактирование обрабатывается в ExpenseForm
	}

	return (
		<div
			style={{
				display: 'flex',
				alignItems: 'center',
				gap: 'var(--space-sm)',
				padding: 'var(--space-sm)',
				background: 'var(--panel)',
				borderRadius: 'var(--radius-md)',
				border: 'var(--border-width) solid var(--border)',
				opacity: expense.completed ? 'var(--opacity-disabled)' : 'var(--opacity-full)',
			}}
		>
			<Checkbox
				checked={expense.completed || false}
				onChange={(e) => onToggleComplete((e.target as HTMLInputElement).checked)}
			/>
			<div
				style={{
					flex: 1,
					fontWeight: 'var(--font-weight-medium)',
					textDecoration: expense.completed ? 'line-through' : 'none',
					color: expense.completed ? 'var(--muted)' : 'var(--text)',
				}}
			>
				{expense.name}
			</div>
			<div
				style={{
					fontSize: 'var(--font-size-md)',
					fontWeight: 'var(--font-weight-semibold)',
					color: expense.completed ? 'var(--green)' : 'var(--text)',
					minWidth: 'var(--reports-task-count-min-width)',
					textAlign: 'right',
				}}
			>
				{formatCurrencyRub(expense.amount)}
			</div>
			<div style={{ display: 'flex', gap: 'var(--space-xs)', alignItems: 'center' }}>
				<IconButton onClick={onEdit} title={UI_TEXTS.EDIT} icon={EditIcon} type="edit" />
				<IconButton onClick={onDelete} title={UI_TEXTS.DELETE} icon={TrashIcon} type="delete" />
			</div>
		</div>
	);
}

