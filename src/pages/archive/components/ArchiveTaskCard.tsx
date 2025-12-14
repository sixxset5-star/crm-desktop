import React, { useMemo } from 'react';
import { type Task } from '@/store/board';
import { type Customer } from '@/store/customers';
import { CustomerChip } from '@/shared/ui';
import { formatCurrencyRub, formatDateWithSettings as formatDate } from '@/shared/lib/format';
import { ClockIcon } from '@/shared/components/Icons';
import { getTaskPaymentInfo } from '@/domain/task';
import { getToken } from '@/shared/lib/tokens';

type ArchiveTaskCardProps = {
	task: Task;
	customer: Customer | undefined;
	onEdit: (task: Task) => void;
};

/**
 * Карточка архивной задачи
 */
export function ArchiveTaskCard({ task, customer, onEdit }: ArchiveTaskCardProps): React.ReactElement {
	const { totalPaid, isFullyPaid } = getTaskPaymentInfo(task);
	const iconSize = useMemo(() => getToken('--icon-size-sm', 16), []);
	const strokeWidth = useMemo(() => getToken('--icon-stroke-width', 2), []);

	return (
		<div
			className="card"
			onDoubleClick={() => onEdit(task)}
			style={{ cursor: 'pointer' }}
			title="Двойной клик — редактировать"
		>
			<div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)', marginBottom: 'var(--space-xs)' }}>
				<div className="card-title" style={{ flex: 1 }}>
					{task.title}
				</div>
			</div>
			{customer && <CustomerChip name={customer.name} avatarUrl={customer.avatar} />}
			{!isFullyPaid && task.amount != null && (
				<div className="card-line">
					<span className="label">Бюджет</span>
					<span>{formatCurrencyRub(task.amount)}</span>
				</div>
			)}
			{totalPaid > 0 && (
				<div className="card-line">
					<span className="label">Оплачено</span>
					<span style={{ color: 'var(--green)', fontWeight: 'var(--font-weight-semibold)' }}>
						{formatCurrencyRub(totalPaid)}
					</span>
				</div>
			)}
			{task.expenses != null && (
				<div className="card-line">
					<span className="label">Расходы</span>
					<span style={{ color: 'var(--red)', fontWeight: 'var(--font-weight-semibold)' }}>
						{formatCurrencyRub(task.expenses)}
					</span>
				</div>
			)}
			{task.deadline && (
				<div
					className="card-line small"
					style={{
						color: 'var(--muted)',
						fontWeight: 'var(--font-weight-medium)',
						display: 'flex',
						alignItems: 'center',
						gap: 'var(--space-xs)',
					}}
				>
					<ClockIcon size={iconSize} color="var(--muted)" />
					<span>Дедлайн: {formatDate(task.deadline)}</span>
				</div>
			)}
			{task.updatedAt && (
				<div
					className="card-line small"
					style={{
						color: 'var(--muted)',
						fontWeight: 'var(--font-weight-medium)',
						display: 'flex',
						alignItems: 'center',
						gap: 'var(--space-xs)',
					}}
				>
					<svg width={iconSize} height={iconSize} viewBox="0 0 24 24" fill="none" stroke="var(--green)" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
						<polyline points="20 6 9 17 4 12" />
					</svg>
					<span>Завершено: {formatDate(task.updatedAt)}</span>
				</div>
			)}
		</div>
	);
}

