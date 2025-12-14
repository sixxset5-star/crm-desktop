/**
 * PaymentControls - Управление платежом (калькулятор, оплачено)
 */
import React from 'react';
import type { Payment } from '../../useTaskFormCore';
import { Switch, Checkbox } from '@/shared/ui';

type PaymentControlsProps = {
	payment: Payment;
	onToggleCalc: () => void;
	onTogglePaid: (paid: boolean) => void;
};

export function PaymentControls({
	payment,
	onToggleCalc,
	onTogglePaid,
}: PaymentControlsProps) {
	return (
		<div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)', marginTop: 'var(--space-sm)' }}>
			{/* Переключатель калькулятора */}
			<div style={{ display: 'inline-flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
				<Switch
					checked={!!payment.calcEnabled}
					onChange={() => onToggleCalc()}
				/>
				<span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--muted)' }}>Калькулятор</span>
			</div>
			{/* Чекбокс оплачено */}
			<div style={{ display: 'inline-flex', alignItems: 'center', gap: 'var(--space-xs)' }}>
				<Checkbox
					checked={!!payment.paid}
					onChange={(e) => onTogglePaid((e.target as HTMLInputElement).checked)}
				/>
				<span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--muted)' }}>Оплачено</span>
			</div>
		</div>
	);
}

