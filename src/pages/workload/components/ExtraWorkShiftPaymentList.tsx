import React, { useMemo } from 'react';
import type { PaymentMode, ExtraWorkPaymentFormData, ManualPaymentFormData } from '../types/extra-work.types';
import { Button, TextInput, CheckboxField } from '@/shared/ui';
import { getToken, getTokenString } from '@/shared/lib/tokens';
import { formatDateWithSettings as formatDate, formatCurrencyRub } from '@/shared/lib/format';
import { extractDateKey, generatePaymentId } from '../utils/extraWorkUtils';
import { parseCurrencyInput } from '@/shared/lib/input-masks';
// EXTRA_WORK_FORM_MAX_HEIGHT удален - используем токен '--extra-work-max-list-height'

type ExtraWorkShiftPaymentListProps = {
	paymentMode: PaymentMode;
	workDates: string[];
	dailyRate: string;
	singlePayment: ExtraWorkPaymentFormData;
	dailyPayments: Map<string, boolean>;
	manualPayments: ManualPaymentFormData[];
	onSinglePaymentChange: (payment: ExtraWorkPaymentFormData) => void;
	onDailyPaymentToggle: (dateKey: string, paid: boolean) => void;
	onManualPaymentsChange: (payments: ManualPaymentFormData[]) => void;
	onAddManualPayment: () => void;
	onRemoveManualPayment: (id: string) => void;
};

export function ExtraWorkShiftPaymentList({
	paymentMode,
	workDates,
	dailyRate,
	singlePayment,
	dailyPayments,
	manualPayments,
	onSinglePaymentChange,
	onDailyPaymentToggle,
	onManualPaymentsChange,
	onAddManualPayment,
	onRemoveManualPayment,
}: ExtraWorkShiftPaymentListProps): React.ReactElement {
	const maxListHeight = useMemo(() => getTokenString('--extra-work-max-list-height', '200px'), []);
	const colorError = useMemo(() => getTokenString('--color-error', 'var(--red)'), []);

	if (paymentMode === 'single') {
		return (
			<>
				<label>
					<span>Дата оплаты</span>
					<TextInput
						type="date"
						value={singlePayment.date}
						onChange={(e) => onSinglePaymentChange({ ...singlePayment, date: (e.target as HTMLInputElement).value })}
					/>
				</label>
				<label>
					<span>Сумма</span>
					<TextInput
						mask="currency"
						type="text"
						inputMode="decimal"
						value={singlePayment.amount}
						onChange={(e) => {
							const rawValue = (e.target as HTMLInputElement).value;
							const parsed = parseCurrencyInput(rawValue);
							onSinglePaymentChange({ ...singlePayment, amount: parsed });
						}}
						placeholder="Например: 5 000"
					/>
				</label>
				<CheckboxField
					className="col-span"
					checked={singlePayment.paid}
					onChange={(e) => onSinglePaymentChange({ ...singlePayment, paid: e.target.checked })}
					label="Оплачено"
					style={{ paddingTop: 'var(--space-xs)' }}
				/>
			</>
		);
	}

	if (paymentMode === 'daily') {
		return (
			<label className="col-span">
				<span>Оплаты по дням</span>
				<div style={{
					padding: 'var(--space-sm)',
					background: 'var(--bg)',
					border: 'var(--border-default)',
					borderRadius: 'var(--radius-md)',
					maxHeight: maxListHeight,
					overflowY: 'auto',
				}}>
					{workDates.map((dateStr) => {
						const dateKey = extractDateKey(dateStr);
						const paid = dailyPayments.get(dateKey) || false;
						return (
							<div key={dateStr} style={{
								display: 'flex',
								justifyContent: 'space-between',
								alignItems: 'center',
								padding: 'var(--space-sm)',
								marginBottom: 'var(--space-xs)',
								background: 'var(--panel)',
								borderRadius: 'var(--radius-sm)',
							}}>
								<span style={{ fontSize: 'var(--font-size-sm)' }}>{formatDate(dateStr)}</span>
								<div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-md)' }}>
									<span style={{ fontWeight: 'var(--font-weight-semibold)' }}>{formatCurrencyRub(parseFloat(dailyRate) || 0)}</span>
									<CheckboxField
										checked={paid}
										onChange={(e) => onDailyPaymentToggle(dateKey, e.target.checked)}
										label={<span style={{ fontSize: 'var(--font-size-xs)' }}>Оплачено</span>}
									/>
								</div>
							</div>
						);
					})}
				</div>
			</label>
		);
	}

	// Manual mode
	return (
		<label className="col-span">
			<span>Оплаты</span>
			<div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
				{manualPayments.map((payment) => (
					<div key={payment.id} style={{
						display: 'grid',
						gridTemplateColumns: '1fr 1fr auto auto auto',
						gap: 'var(--space-sm)',
						alignItems: 'center',
					}}>
						<TextInput
							type="date"
							value={payment.date}
							onChange={(e) => {
								const updated = manualPayments.map(p => 
									p.id === payment.id ? { ...p, date: (e.target as HTMLInputElement).value } : p
								);
								onManualPaymentsChange(updated);
							}}
							placeholder="Дата"
						/>
						<TextInput
							mask="currency"
							type="text"
							inputMode="decimal"
							value={payment.amount}
							onChange={(e) => {
								const rawValue = (e.target as HTMLInputElement).value;
								const parsed = parseCurrencyInput(rawValue);
								const updated = manualPayments.map(p => 
									p.id === payment.id ? { ...p, amount: parsed } : p
								);
								onManualPaymentsChange(updated);
							}}
							placeholder="Например: 3 000"
						/>
						<CheckboxField
							checked={payment.paid}
							onChange={(e) => {
								const updated = manualPayments.map(p => 
									p.id === payment.id ? { ...p, paid: e.target.checked } : p
								);
								onManualPaymentsChange(updated);
							}}
							label={<span style={{ fontSize: 'var(--font-size-xs)' }}>Оплачено</span>}
						/>
						<Button
							type="button"
							variant="secondary"
							size="sm"
							onClick={() => onRemoveManualPayment(payment.id)}
							style={{ color: colorError }}
						>
							Удалить
						</Button>
					</div>
				))}
				<Button type="button" variant="secondary" onClick={onAddManualPayment}>
					+ Добавить оплату
				</Button>
			</div>
		</label>
	);
}

