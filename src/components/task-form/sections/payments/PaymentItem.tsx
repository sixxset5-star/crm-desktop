/**
 * PaymentItem - Одна строка платежа
 */
import React from 'react';
import { TextInput } from '@/shared/ui';
import IconButton from '@/shared/components/IconButton';
import { XIcon } from '@/shared/components/Icons';
import { PaymentAmountField } from './PaymentAmountField';
import { PaymentCalcFields } from './PaymentCalcFields';
import { PaymentDateField } from './PaymentDateField';
import { PaymentTaxField } from './PaymentTaxField';
import { PaymentControls } from './PaymentControls';
import type { Payment } from '../../useTaskFormCore';

type PaymentItemProps = {
	payment: Payment;
	paymentErrors: Record<string, string>;
	showTitle: boolean;
	onUpdate: (updates: Partial<Payment>) => void;
	onRemove: () => void;
	onDoubleClick?: (e: React.MouseEvent<HTMLInputElement>) => void;
	hasDateOrderError?: boolean;
};

export function PaymentItem({
	payment,
	paymentErrors,
	showTitle,
	onUpdate,
	onRemove,
	onDoubleClick,
	hasDateOrderError,
}: PaymentItemProps) {
	return (
		<div
			style={{
				display: 'flex',
				flexDirection: 'column',
				gap: 'var(--space-sm)',
				padding: 'var(--space-sm)',
				background: 'var(--bg)',
				borderRadius: 'var(--radius-md)',
				border: 'var(--border-default)',
				position: 'relative',
				...(hasDateOrderError ? { borderColor: 'var(--red)' } : {}),
			}}
		>
			{/* Заголовок + удалить */}
			{showTitle && (
				<div style={{ position: 'relative', width: '100%' }}>
					<input
						type="text"
						value={payment.title}
						onChange={(e) => onUpdate({ title: e.target.value })}
						onDoubleClick={onDoubleClick}
						placeholder="Название платежа"
						style={{ 
							width: '100%', 
							border: 'var(--border-default)', 
							borderRadius: 'var(--radius-md)', 
							padding: 'var(--space-sm) var(--space-md)', 
							paddingRight: 'var(--space-lg)',
							fontSize: 'var(--font-size-md)',
							boxSizing: 'border-box'
						}}
					/>
					<div
						style={{
							position: 'absolute',
							right: 'var(--space-sm)',
							top: '50%',
							transform: 'translateY(-50%)',
						}}
					>
						<IconButton
							onClick={onRemove}
							title="Удалить платеж"
							icon={XIcon}
							type="close"
						/>
					</div>
				</div>
			)}

			{/* Поля ввода */}
			{payment.calcEnabled ? (
				<div style={{ 
					display: 'grid', 
					gridTemplateColumns: payment.paid ? '1fr 1fr 1fr 1fr' : '1fr 1fr 1fr', 
					gap: 'var(--space-sm)', 
					alignItems: 'end',
					width: '100%'
				}}>
					<PaymentCalcFields
						payment={payment}
						total={payment.qty != null && payment.price != null ? payment.qty * payment.price : null}
						onChange={(updates) => onUpdate(updates)}
						onDoubleClick={onDoubleClick}
					/>
					{payment.paid && (
						<PaymentDateField
							payment={payment}
							onChange={(date, paid) => onUpdate({ date, paid })}
						/>
					)}
				</div>
			) : (
				<div style={{ display: 'flex', flexDirection: 'row', gap: 'var(--space-sm)', alignItems: 'end', flexWrap: 'wrap' }}>
					<PaymentAmountField
						payment={payment}
						onChange={(amount) => onUpdate({ amount })}
						onDoubleClick={onDoubleClick}
					/>
					<PaymentDateField
						payment={payment}
						onChange={(date, paid) => onUpdate({ date, paid })}
					/>
					<PaymentTaxField
						payment={payment}
						onChange={(taxRate) => onUpdate({ taxRate })}
					/>
				</div>
			)}

			{/* Налог (только когда калькулятор включен) */}
			{payment.calcEnabled && (
				<PaymentTaxField
					payment={payment}
					onChange={(taxRate) => onUpdate({ taxRate })}
				/>
			)}

			{/* Управление */}
			<PaymentControls
				payment={payment}
				onToggleCalc={() => onUpdate({ calcEnabled: !payment.calcEnabled })}
				onTogglePaid={(paid) => onUpdate({ paid, ...(paid ? {} : { date: undefined }) })}
			/>

			{/* Ошибки валидации */}
			<div style={{ 
				fontSize: 'var(--font-size-xs)', 
				color: 'var(--red)',
				minHeight: '1.2em',
				lineHeight: '1.2em'
			}}>
				{paymentErrors[`${payment.id}_date`] || paymentErrors[`${payment.id}_amount`] || paymentErrors[`${payment.id}_calc`] || '\u00A0'}
			</div>
		</div>
	);
}

