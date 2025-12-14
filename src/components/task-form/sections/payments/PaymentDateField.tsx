/**
 * PaymentDateField - Поле даты платежа
 */
import React from 'react';
import { TextInput } from '@/shared/ui';
import type { Payment } from '../../useTaskFormCore';

type PaymentDateFieldProps = {
	payment: Payment;
	onChange: (date: string, paid: boolean) => void;
};

export function PaymentDateField({
	payment,
	onChange,
}: PaymentDateFieldProps) {
	if (!payment.paid) {
		return null;
	}

	return (
		<div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
			<label style={{ fontSize: 'var(--font-size-xs)', color: 'var(--muted)', fontWeight: 'var(--font-weight-medium)' }}>Дата</label>
			<TextInput
				type="date"
				value={payment.date || ''}
				data-payment-id={payment.id}
				data-field="date"
				onChange={(e) => {
					const newDate = (e.target as HTMLInputElement).value;
					// Сохраняем дату (может быть пустой строкой, но это нормально - пользователь может заполнить позже)
					onChange(newDate || '', true);
				}}
			/>
		</div>
	);
}

