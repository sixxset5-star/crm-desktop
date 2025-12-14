import React from 'react';
import type { PaymentMode } from '../types/extra-work.types';
import { RadioField } from '@/shared/ui';

type ExtraWorkShiftPaymentModeProps = {
	paymentMode: PaymentMode;
	onModeChange: (mode: PaymentMode) => void;
};

export function ExtraWorkShiftPaymentMode({
	paymentMode,
	onModeChange,
}: ExtraWorkShiftPaymentModeProps): React.ReactElement {
	return (
		<label className="col-span">
			<span>Режим оплаты</span>
			<div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
				<RadioField
					checked={paymentMode === 'single'}
					onChange={() => onModeChange('single')}
					label="Одна оплата за весь период"
				/>
				<RadioField
					checked={paymentMode === 'daily'}
					onChange={() => onModeChange('daily')}
					label="Оплата каждый день"
				/>
				<RadioField
					checked={paymentMode === 'manual'}
					onChange={() => onModeChange('manual')}
					label="Оплаты вручную (частями)"
				/>
			</div>
		</label>
	);
}




