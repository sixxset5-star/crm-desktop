import React from 'react';
import { CustomerChip, PriorityBadge } from '@/shared/ui';
import { formatCurrencyRub, formatDateWithSettings as formatDate } from '@/shared/lib/format';
import IconButton from '@/shared/components/IconButton';
import { EditIcon } from '@/shared/components/Icons';
import type { Task } from '@/types';
import type { Customer } from '@/types';

type TaskModalCardProps = {
	task: {
		id: string;
		title: string;
		amount?: number;
		deadline?: string;
		startDate?: string;
		priority?: 'high' | 'medium' | 'low';
		customerId?: string;
	};
	customer?: Customer;
	onEdit?: (task: Task) => void;
	showPriority?: boolean;
	showEditButton?: boolean;
	// Для отчётов - дополнительные данные
	totalPaid?: number;
	// Кастомный фон для карточки
	background?: string;
};

export function TaskModalCard({
	task,
	customer,
	onEdit,
	showPriority = true,
	showEditButton = true,
	totalPaid,
	background,
}: TaskModalCardProps): React.ReactElement {
	const hasData = task.amount || task.deadline || task.startDate || totalPaid;

	return (
		<div 
			style={{ 
				padding: 'var(--space-md)', 
				background: background || 'var(--bg)', 
				border: 'var(--border-default)', 
				borderRadius: 'var(--radius-md)',
				display: 'flex',
				flexDirection: 'column',
				gap: 'var(--space-sm)',
			}}
		>
			<div style={{ display: 'flex', alignItems: 'flex-start', gap: 'var(--space-md)' }}>
				<div style={{ flex: 1 }}>
					<div style={{ 
						display: 'flex', 
						alignItems: 'center', 
						gap: 'var(--space-sm)', 
						marginBottom: 'var(--space-sm)', 
						flexWrap: 'wrap' 
					}}>
						<div style={{ fontWeight: 'var(--font-weight-semibold)', fontSize: 'var(--font-size-lg)' }}>
							{task.title}
						</div>
						{showPriority && task.priority && <PriorityBadge priority={task.priority} />}
					</div>
					{customer && (
						<CustomerChip name={customer.name} avatarUrl={customer.avatar} />
					)}
				</div>
				{showEditButton && onEdit && (
					<IconButton
						onClick={() => onEdit(task as Task)}
						title="Редактировать"
						icon={EditIcon}
						iconSize={18}
						type="edit"
					/>
				)}
			</div>
			{hasData && (
				<div style={{ 
					display: 'flex', 
					gap: 'var(--space-md)', 
					flexWrap: 'wrap', 
					fontSize: 'var(--font-size-sm)' 
				}}>
					{task.amount && (
						<div style={{ color: 'var(--muted)' }}>
							<span style={{ fontWeight: 'var(--font-weight-semibold)', color: 'var(--text)' }}>Бюджет:</span>{' '}
							{formatCurrencyRub(task.amount)}
						</div>
					)}
					{totalPaid !== undefined && totalPaid > 0 && (
						<div style={{ color: 'var(--muted)' }}>
							<span style={{ fontWeight: 'var(--font-weight-semibold)', color: 'var(--text)' }}>Оплачено:</span>{' '}
							<span style={{ color: 'var(--green)' }}>{formatCurrencyRub(totalPaid)}</span>
						</div>
					)}
					{task.startDate && (
						<div style={{ color: 'var(--muted)' }}>
							<span style={{ fontWeight: 'var(--font-weight-semibold)', color: 'var(--text)' }}>Начало:</span> {formatDate(task.startDate)}
						</div>
					)}
					{task.deadline && (
						<div style={{ color: 'var(--muted)' }}>
							<span style={{ fontWeight: 'var(--font-weight-semibold)', color: 'var(--text)' }}>Дедлайн:</span> {formatDate(task.deadline)}
						</div>
					)}
				</div>
			)}
		</div>
	);
}
