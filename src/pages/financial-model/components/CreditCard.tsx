import React from 'react';
import type { Credit } from '@/store/goals';
import { formatCurrencyRub, formatDateWithSettings } from '@/shared/lib/format';
import { EditIcon, TrashIcon } from '@/shared/components/Icons';
import IconButton from '@/shared/components/IconButton';
import { Checkbox } from '@/shared/ui';
import { CreditField } from './CreditField';
import { UI_TEXTS } from '@/shared/constants/ui-texts';

type CreditCardProps = {
	credit: Credit;
	onEdit: (credit: Credit) => void;
	onDelete: (id: string) => void;
	onTogglePaid: (creditId: string, currentPaid: boolean) => void;
};

export function CreditCard({ credit, onEdit, onDelete, onTogglePaid }: CreditCardProps): React.ReactElement {
	return (
		<div
			style={{
				padding: 'var(--space-md)',
				background: 'var(--panel)',
				border: 'var(--border-width) solid var(--border)',
				borderRadius: 'var(--radius-md)',
				opacity: credit.paidThisMonth ? 'var(--opacity-disabled)' : 'var(--opacity-full)',
			}}
		>
			<div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', gap: 'var(--space-md)' }}>
				<div style={{ flex: 1 }}>
					<div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-md)', marginBottom: 'var(--space-sm)' }}>
						{credit.monthlyPayment && (
							<Checkbox
								checked={credit.paidThisMonth || false}
								onChange={() => onTogglePaid(credit.id, credit.paidThisMonth || false)}
								title="Отметить оплату в этом месяце"
							/>
						)}
						<h3
							style={{
								margin: 'var(--space-none)',
								fontSize: 'var(--font-size-lg)',
								fontWeight: 'var(--font-weight-semibold)',
								textDecoration: credit.paidThisMonth ? 'line-through' : 'none',
								color: credit.paidThisMonth ? 'var(--muted)' : 'var(--text)',
							}}
						>
							{credit.name}
						</h3>
						{credit.paidThisMonth && (
							<span
								style={{
									fontSize: 'var(--font-size-xs)',
									color: 'var(--green)',
									fontWeight: 'var(--font-weight-semibold)',
								}}
							>
								✓ Оплачено
							</span>
						)}
					</div>
					<div style={{ display: 'grid', gridTemplateColumns: credit.paymentDate ? 'repeat(4, 1fr)' : 'repeat(3, 1fr)', gap: 'var(--space-md)' }}>
						<CreditField label="Сумма кредита" value={formatCurrencyRub(credit.amount)} valueColor="var(--red)" />
						{credit.monthlyPayment && (
							<CreditField
								label="Ежемесячный платеж"
								value={formatCurrencyRub(credit.monthlyPayment)}
								valueColor={credit.paidThisMonth ? 'var(--green)' : 'var(--text)'}
							/>
						)}
						{credit.paymentDate && (
							<CreditField 
								label="Дата платежа" 
								value={
									// Если paymentDate - это только число (1-31), показываем как "X числа"
									/^\d{1,2}$/.test(credit.paymentDate) 
										? `${credit.paymentDate} числа`
										: formatDateWithSettings(credit.paymentDate)
								} 
							/>
						)}
						{credit.interestRate && credit.interestRate > 0 && (
							<CreditField label="Процентная ставка" value={`${credit.interestRate}%`} />
						)}
					</div>
					{credit.notes && (
						<div
							style={{
								marginTop: 'var(--space-md)',
								padding: 'var(--space-sm)',
								background: 'var(--bg)',
								borderRadius: 'var(--radius-md)',
								fontSize: 'var(--font-size-sm)',
								color: 'var(--muted)',
							}}
						>
							{credit.notes}
						</div>
					)}
				</div>
				<div style={{ display: 'flex', gap: 'var(--space-xs)', alignItems: 'center' }}>
					<IconButton onClick={() => onEdit(credit)} title={UI_TEXTS.EDIT} icon={EditIcon} type="edit" />
					<IconButton onClick={() => onDelete(credit.id)} title={UI_TEXTS.DELETE} icon={TrashIcon} type="delete" />
				</div>
			</div>
		</div>
	);
}

