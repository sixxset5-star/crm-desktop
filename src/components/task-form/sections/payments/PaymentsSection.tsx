/**
 * PaymentsSection - Секция для управления платежами
 * 
 * Контейнер UI, без бизнес-логики.
 */
import React from 'react';
import { Button } from '@/shared/ui';
import { PlusIcon } from '@/shared/components/Icons';
import { PaymentItem } from './PaymentItem';
import type { Payment } from '../../useTaskFormCore';
import type { PaymentActions } from '../../useTaskPayments';

type PaymentsSectionProps = {
	payments: Payment[];
	paymentErrors: Record<string, string>;
	paymentsTotal: number;
	paymentActions: PaymentActions;
	onDoubleClick?: (e: React.MouseEvent<HTMLInputElement>) => void;
};

export function PaymentsSection({
	payments,
	paymentErrors,
	paymentsTotal,
	paymentActions,
	onDoubleClick,
}: PaymentsSectionProps) {
	return (
		<div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
			{/* Список платежей */}
			{payments.map((payment, idx) => (
				<PaymentItem
					key={payment.id}
					payment={payment}
					paymentErrors={paymentErrors}
					showTitle={payments.length > 1}
					onUpdate={(updates) => paymentActions.updatePayment(payment.id, updates)}
					onRemove={() => paymentActions.removePayment(payment.id)}
					onDoubleClick={onDoubleClick}
					hasDateOrderError={paymentErrors.dateOrder && idx < 2}
				/>
			))}

			{/* Ошибка порядка дат */}
			{paymentErrors.dateOrder && (
				<div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--red)', padding: 'var(--space-xs) var(--space-sm)', background: 'var(--bg)', borderRadius: 'var(--radius-md)' }}>
					{paymentErrors.dateOrder}
				</div>
			)}

			{/* Итого и кнопка добавления */}
			<div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 'var(--space-xs)' }}>
				<Button type="button" variant="action" onClick={paymentActions.addPayment}>
					<span style={{ display: 'inline-flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
						<PlusIcon size={16} />
						<span>Добавить платеж</span>
					</span>
				</Button>
				{payments.length > 0 && (
					<div style={{ fontSize: 'var(--font-size-sm)', fontWeight: 600, color: 'var(--text)' }}>
						Итого: {new Intl.NumberFormat('ru-RU', { style: 'currency', currency: 'RUB', maximumFractionDigits: 0 }).format(paymentsTotal)}
					</div>
				)}
			</div>
		</div>
	);
}

