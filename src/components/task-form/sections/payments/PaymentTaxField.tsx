/**
 * PaymentTaxField - Поле налога
 */
import React from 'react';
import { TextInput } from '@/shared/ui';
import { safeEval } from '@/shared/lib/mathParser';
import { parsePercentageInput } from '@/shared/lib/input-masks';
import type { Payment } from '../../useTaskFormCore';

type PaymentTaxFieldProps = {
	payment: Payment;
	onChange: (taxRate: number | undefined) => void;
};

export function PaymentTaxField({
	payment,
	onChange,
}: PaymentTaxFieldProps) {
	return (
		<div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
			<label style={{ fontSize: 'var(--font-size-xs)', color: 'var(--muted)', fontWeight: 500 }}>Налог</label>
			<TextInput
				mask="percentage"
				type="text"
				inputMode="decimal"
				min="0"
				max="100"
				step="0.1"
				value={payment.taxRate ?? 0}
				onChange={(e) => {
					const rawValue = (e.target as HTMLInputElement).value;
					const parsed = parsePercentageInput(rawValue);
					// Если есть математические символы, не преобразуем сразу
					if (parsed && /[+\-*/()]/.test(parsed)) {
						return;
					}
					const num = parsed === '' ? undefined : Number(parsed);
					onChange(isNaN(num as number) ? undefined : (num as number));
				}}
				onBlur={(e) => {
					const value = (e.target as HTMLInputElement).value.trim();
					const parsed = parsePercentageInput(value);
					if (!parsed) {
						onChange(undefined);
						return;
					}
					if (/[+\-*/()]/.test(parsed)) {
						const result = safeEval(parsed);
						if (result !== null && isFinite(result)) {
							// Ограничиваем процент от 0 до 100
							const clamped = Math.max(0, Math.min(100, result));
							onChange(Math.round(clamped * 100) / 100);
						}
					} else {
						const num = parsed === '' ? undefined : Number(parsed);
						onChange(isNaN(num as number) ? undefined : (num as number));
					}
				}}
				placeholder="Например: 13"
				style={{ width: 'var(--payment-tax-field-width, 100px)' }}
			/>
		</div>
	);
}

