import React, { useMemo } from 'react';
import { type Income } from '@/store/income';
import { formatCurrencyRub, formatDateWithSettings as formatDate } from '@/shared/lib/format';
import { ClockIcon } from '@/shared/components/Icons';
import { getToken } from '@/shared/lib/tokens';

type ArchiveIncomeCardProps = {
	income: Income;
	onEdit: (income: Income) => void;
};

/**
 * Карточка архивного дополнительного дохода
 */
export function ArchiveIncomeCard({ income, onEdit }: ArchiveIncomeCardProps): React.ReactElement {
	const iconSize = useMemo(() => getToken('--icon-size-sm', 16), []);
	return (
		<div
			className="card"
			onDoubleClick={() => onEdit(income)}
			style={{ cursor: 'pointer' }}
			title="Двойной клик — редактировать"
		>
			<div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)', marginBottom: 'var(--space-xs)' }}>
				<div className="card-title" style={{ flex: 1 }}>
					{income.title}
				</div>
			</div>
			{income.amount != null && (
				<div className="card-line">
					<span className="label">Сумма</span>
					<span style={{ color: 'var(--green)', fontWeight: 'var(--font-weight-semibold)' }}>
						{formatCurrencyRub(income.amount)}
					</span>
				</div>
			)}
			{income.taxRate && income.taxRate > 0 && (
				<div className="card-line">
					<span className="label">Налог</span>
					<span>{income.taxRate}%</span>
				</div>
			)}
			{income.date && (
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
					<span>Дата: {formatDate(income.date)}</span>
				</div>
			)}
			{income.notes && (
				<div className="card-line small" style={{ color: 'var(--muted)', fontSize: 'var(--font-size-xs)' }}>
					{income.notes}
				</div>
			)}
		</div>
	);
}

