/**
 * PaymentCalcFields - Поля калькулятора (qty × price = total)
 */
import React from 'react';
import { TextInput } from '@/shared/ui';
import { safeEval } from '@/shared/lib/mathParser';
import { parseCurrencyInput, parseQuantityInput } from '@/shared/lib/input-masks';
import type { Payment } from '../../useTaskFormCore';

type PaymentCalcFieldsProps = {
	payment: Payment;
	total: number | null; // Передаём вычисленный total извне
	onChange: (updates: { qty?: number; price?: number }) => void;
	onDoubleClick?: (e: React.MouseEvent<HTMLInputElement>) => void;
};

export function PaymentCalcFields({
	payment,
	total,
	onChange,
	onDoubleClick,
}: PaymentCalcFieldsProps) {

	return (
		<>
			<div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)', width: '100%' }}>
				<label style={{ fontSize: 'var(--font-size-xs)', color: 'var(--muted)', fontWeight: 500 }}>Кол-во</label>
				<TextInput
					mask="quantity"
					type="text"
					inputMode="numeric"
					value={payment.qty != null ? String(payment.qty) : ''}
					onChange={(e) => {
						const rawValue = (e.target as HTMLInputElement).value;
						const parsed = parseQuantityInput(rawValue);
						// Если есть математические символы, не преобразуем сразу
						if (parsed && /[+\-*/()]/.test(parsed)) {
							return;
						}
						// Количество - только целые числа
						onChange({ qty: parsed ? Math.round(Number(parsed)) : undefined });
					}}
					onBlur={(e) => {
						const value = (e.target as HTMLInputElement).value.trim();
						const parsed = parseQuantityInput(value);
						if (!parsed) {
							onChange({ qty: undefined });
							return;
						}
						if (/[+\-*/()]/.test(parsed)) {
							const result = safeEval(parsed);
							if (result !== null && isFinite(result)) {
								onChange({ qty: Math.round(result) });
							}
						} else {
							// Количество - только целые числа
							onChange({ qty: parsed ? Math.round(Number(parsed)) : undefined });
						}
					}}
					onDoubleClick={onDoubleClick}
					placeholder="0"
				/>
			</div>
			<div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)', width: '100%' }}>
				<label style={{ fontSize: 'var(--font-size-xs)', color: 'var(--muted)', fontWeight: 500 }}>Цена за штуку</label>
				<TextInput
					mask="currency"
					type="text"
					inputMode="numeric"
					value={payment.price != null ? String(payment.price) : ''}
					onChange={(e) => {
						const rawValue = (e.target as HTMLInputElement).value;
						const parsed = parseCurrencyInput(rawValue);
						// Если есть математические символы, не преобразуем сразу
						if (parsed && /[+\-*/()]/.test(parsed)) {
							return;
						}
						onChange({ price: parsed ? Number(parsed) : undefined });
					}}
					onBlur={(e) => {
						const value = (e.target as HTMLInputElement).value.trim();
						const parsed = parseCurrencyInput(value);
						if (!parsed) {
							onChange({ price: undefined });
							return;
						}
						if (/[+\-*/()]/.test(parsed)) {
							const result = safeEval(parsed);
							if (result !== null && isFinite(result)) {
								onChange({ price: Math.round(result) });
							}
						} else {
							onChange({ price: parsed ? Number(parsed) : undefined });
						}
					}}
					onDoubleClick={onDoubleClick}
					placeholder="0"
				/>
			</div>
			<div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)', width: '100%' }}>
				<label style={{ fontSize: 'var(--font-size-xs)', color: 'var(--muted)', fontWeight: 500 }}>Итого</label>
				<div style={{ 
					height: 'var(--control-xl-height)',
					padding: '0 var(--space-md)', 
					background: 'var(--panel)', 
					border: 'var(--border-width) solid var(--border)',
					borderRadius: 'var(--radius-pill)', 
					fontSize: 'var(--font-size-md)',
					fontWeight: 600,
					textAlign: 'center',
					display: 'flex',
					alignItems: 'center',
					justifyContent: 'center',
					width: '100%',
					boxSizing: 'border-box'
				}}>
					{total !== null
						? new Intl.NumberFormat('ru-RU', { style: 'currency', currency: 'RUB', maximumFractionDigits: 0 }).format(total)
						: '—'
					}
				</div>
			</div>
		</>
	);
}

