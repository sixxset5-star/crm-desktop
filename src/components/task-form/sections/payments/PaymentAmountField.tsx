/**
 * PaymentAmountField - Поле ввода суммы платежа
 */
import React, { useState, useEffect } from 'react';
import { TextInput } from '@/shared/ui';
import { safeEval } from '@/shared/lib/mathParser';
import { parseCurrencyInput } from '@/shared/lib/input-masks';
import type { Payment } from '../../useTaskFormCore';

type PaymentAmountFieldProps = {
	payment: Payment;
	onChange: (amount: number | undefined) => void;
	onDoubleClick?: (e: React.MouseEvent<HTMLInputElement>) => void;
};

export function PaymentAmountField({
	payment,
	onChange,
	onDoubleClick,
}: PaymentAmountFieldProps) {
	const [localValue, setLocalValue] = useState(payment.amount != null ? String(payment.amount) : '');
	const lastInputValueRef = React.useRef<string>('');

	// Синхронизируем с внешним значением, если оно изменилось извне
	useEffect(() => {
		setLocalValue(payment.amount != null ? String(payment.amount) : '');
	}, [payment.amount]);

	return (
		<div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
			<label style={{ fontSize: 'var(--font-size-xs)', color: 'var(--muted)', fontWeight: 'var(--font-weight-medium)' }}>Сумма</label>
			<TextInput
				mask="currency"
				type="text"
				inputMode="numeric"
				value={localValue}
				onChange={(e) => {
					// Получаем значение из события - это уже сырое значение от маски (без форматирования, если есть математические символы)
					const rawValue = (e.target as HTMLInputElement).value;
					
					// Парсим значение (parseCurrencyInput сохраняет математические символы)
					const parsed = parseCurrencyInput(rawValue);
					
					// Сохраняем в ref для использования в onBlur
					lastInputValueRef.current = parsed;
					
					// Сохраняем локальное значение для отображения
					// Если есть математические символы, сохраняем как есть (без форматирования)
					// Если нет - маска сама отформатирует
					setLocalValue(parsed);
					
					// Если есть математические символы, не пытаемся сразу преобразовать в число
					if (parsed && /[+\-*/()]/.test(parsed)) {
						// Не вызываем onChange родителя, оставляем вычисление на onBlur
						return;
					}
					
					// Если нет математических символов, преобразуем в число
					const numValue = parsed.trim() ? Number(parsed) : undefined;
					if (!isNaN(numValue || 0)) {
						onChange(numValue);
					}
				}}
				onDoubleClick={onDoubleClick}
				onBlur={(e) => {
					// При потере фокуса используем сохраненное значение из ref
					// Это значение было сохранено в onChange и не изменено маской
					const valueToProcess = lastInputValueRef.current || localValue;
					const parsed = parseCurrencyInput(valueToProcess);
					
					if (!parsed) {
						onChange(undefined);
						setLocalValue('');
						return;
					}
					
					// Если есть математические символы, вычисляем выражение
					if (/[+\-*/()]/.test(parsed)) {
						const result = safeEval(parsed);
						if (result !== null && isFinite(result)) {
							const rounded = Math.round(result);
							onChange(rounded);
							setLocalValue(String(rounded));
						} else {
							// Если вычисление не удалось, оставляем текущее значение
							onChange(payment.amount);
							setLocalValue(payment.amount != null ? String(payment.amount) : '');
						}
					} else {
						// Если нет математических символов, просто преобразуем в число
						const numValue = parsed.trim() ? Number(parsed) : undefined;
						if (!isNaN(numValue || 0)) {
							onChange(numValue);
							setLocalValue(numValue != null ? String(numValue) : '');
						} else {
							onChange(payment.amount);
							setLocalValue(payment.amount != null ? String(payment.amount) : '');
						}
					}
				}}
				placeholder="Например: 5 000"
			/>
		</div>
	);
}

