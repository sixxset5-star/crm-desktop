import React, { useMemo, useState } from 'react';
import type { Credit } from '@/store/goals';
import { Modal, ModalFooter } from '@/shared/ui/Modal';
import { TextInput, TextArea, NotesField } from '@/shared/ui';
import { getToken } from '@/shared/lib/tokens';
import { UI_TEXTS } from '@/shared/constants/ui-texts';
import { handleNumericInputBlur } from '../utils';
import { parseCurrencyInput, parsePercentageInput } from '@/shared/lib/input-masks';
import { validateText } from '@/shared/utils/text-validation';
import { validateNumber, validatePercentage } from '@/shared/utils/number-validation';
import { useUIStore } from '@/store/ui';

type CreditFormModalProps = {
	open: boolean;
	editing: Credit | null;
	name: string;
	amount: string;
	monthlyPayment: string;
	interestRate: string;
	notes: string;
	paymentDate: string;
	onNameChange: (value: string) => void;
	onAmountChange: (value: string) => void;
	onMonthlyPaymentChange: (value: string) => void;
	onInterestRateChange: (value: string) => void;
	onNotesChange: (value: string) => void;
	onPaymentDateChange: (value: string) => void;
	onSubmit: (e: React.FormEvent) => void;
	onClose: () => void;
};

export function CreditFormModal({
	open,
	editing,
	name,
	amount,
	monthlyPayment,
	interestRate,
	notes,
	paymentDate,
	onNameChange,
	onAmountChange,
	onMonthlyPaymentChange,
	onInterestRateChange,
	onNotesChange,
	onPaymentDateChange,
	onSubmit,
	onClose,
}: CreditFormModalProps): React.ReactElement {
	const modalWidth = useMemo(() => getToken('--modal-width-lg', 700), []);
	
	// Состояния для ошибок валидации
	const [nameError, setNameError] = useState<string | null>(null);
	const [amountError, setAmountError] = useState<string | null>(null);
	const [monthlyPaymentError, setMonthlyPaymentError] = useState<string | null>(null);
	const [interestRateError, setInterestRateError] = useState<string | null>(null);
	const [paymentDateError, setPaymentDateError] = useState<string | null>(null);

	if (!open) return null;

	const handleAmountBlur = (e: React.FocusEvent<HTMLInputElement>) => {
		handleNumericInputBlur(e.target.value, onAmountChange);
		// Валидация при blur
		if (amount.trim()) {
			const validation = validateNumber(amount, {
				min: 0,
				allowNegative: false,
				allowZero: false,
				required: false,
				fieldName: 'Общая сумма кредита',
			});
			if (!validation.valid) {
				setAmountError(validation.error || null);
			} else {
				setAmountError(null);
			}
		} else {
			setAmountError(null);
		}
	};

	const handleMonthlyPaymentBlur = (e: React.FocusEvent<HTMLInputElement>) => {
		handleNumericInputBlur(e.target.value, onMonthlyPaymentChange);
		// Валидация при blur
		if (monthlyPayment.trim()) {
			const validation = validateNumber(monthlyPayment, {
				min: 0,
				allowNegative: false,
				allowZero: false,
				required: false,
				fieldName: 'Ежемесячный платеж',
			});
			if (!validation.valid) {
				setMonthlyPaymentError(validation.error || null);
			} else {
				setMonthlyPaymentError(null);
			}
		} else {
			setMonthlyPaymentError(null);
		}
	};

	const handleInterestRateBlur = () => {
		if (interestRate.trim()) {
			const validation = validatePercentage(interestRate, {
				allowZero: true,
				required: false,
				fieldName: 'Процентная ставка',
			});
			if (!validation.valid) {
				setInterestRateError(validation.error || null);
			} else {
				setInterestRateError(null);
			}
		} else {
			setInterestRateError(null);
		}
	};

	const handlePaymentDateBlur = () => {
		if (paymentDate.trim()) {
			const num = parseInt(paymentDate);
			if (isNaN(num) || num < 1 || num > 31) {
				setPaymentDateError('Число месяца должно быть от 1 до 31');
			} else {
				setPaymentDateError(null);
			}
		} else {
			setPaymentDateError(null);
		}
	};

	const handleNameBlur = () => {
		const validation = validateText(name, {
			required: true,
			fieldName: 'Название кредита',
		});
		if (!validation.valid) {
			setNameError(validation.error || null);
		} else {
			setNameError(null);
		}
	};

	const handleFormSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		
		// Валидация всех полей при submit
		const nameValidation = validateText(name, {
			required: true,
			fieldName: 'Название кредита',
		});
		if (!nameValidation.valid) {
			setNameError(nameValidation.error || null);
			await useUIStore.getState().showAlert({
				title: UI_TEXTS.VALIDATION_ERROR,
				message: nameValidation.error || 'Некорректное название',
			});
			return;
		}

		if (amount.trim()) {
			const amountValidation = validateNumber(amount, {
				min: 0,
				allowNegative: false,
				allowZero: false,
				required: false,
				fieldName: 'Общая сумма кредита',
			});
			if (!amountValidation.valid) {
				setAmountError(amountValidation.error || null);
				await useUIStore.getState().showAlert({
					title: UI_TEXTS.VALIDATION_ERROR,
					message: amountValidation.error || 'Некорректная сумма кредита',
				});
				return;
			}
		}

		if (monthlyPayment.trim()) {
			const paymentValidation = validateNumber(monthlyPayment, {
				min: 0,
				allowNegative: false,
				allowZero: false,
				required: false,
				fieldName: 'Ежемесячный платеж',
			});
			if (!paymentValidation.valid) {
				setMonthlyPaymentError(paymentValidation.error || null);
				await useUIStore.getState().showAlert({
					title: UI_TEXTS.VALIDATION_ERROR,
					message: paymentValidation.error || 'Некорректный ежемесячный платеж',
				});
				return;
			}
		}

		if (interestRate.trim()) {
			const rateValidation = validatePercentage(interestRate, {
				allowZero: true,
				required: false,
				fieldName: 'Процентная ставка',
			});
			if (!rateValidation.valid) {
				setInterestRateError(rateValidation.error || null);
				await useUIStore.getState().showAlert({
					title: UI_TEXTS.VALIDATION_ERROR,
					message: rateValidation.error || 'Некорректная процентная ставка',
				});
				return;
			}
		}

		if (paymentDate.trim()) {
			const num = parseInt(paymentDate);
			if (isNaN(num) || num < 1 || num > 31) {
				setPaymentDateError('Число месяца должно быть от 1 до 31');
				await useUIStore.getState().showAlert({
					title: UI_TEXTS.VALIDATION_ERROR,
					message: 'Число месяца должно быть от 1 до 31',
				});
				return;
			}
		}

		// Все валидации пройдены, вызываем оригинальный onSubmit
		onSubmit(e);
	};

	return (
		<Modal
			open={open}
			onClose={onClose}
			title={editing ? UI_TEXTS.EDIT_CREDIT : UI_TEXTS.NEW_CREDIT}
			width={modalWidth}
			footer={
				<ModalFooter
					onCancel={onClose}
					onConfirm={() => (document.querySelector('form') as HTMLFormElement | null)?.requestSubmit()}
					confirmText={UI_TEXTS.SAVE}
					cancelText={UI_TEXTS.CANCEL}
				/>
			}
		>
			<form onSubmit={handleFormSubmit} className="form-grid">
				<label className="col-span">
					<span>Название кредита/кредитной карты</span>
					<TextInput 
						value={name} 
						onChange={(e) => {
							onNameChange((e.target as HTMLInputElement).value);
							if (nameError) setNameError(null);
						}} 
						onBlur={handleNameBlur}
						error={!!nameError}
						required 
					/>
					{nameError && <span style={{ color: 'var(--red)', fontSize: 'var(--font-size-sm)', marginTop: 'var(--space-xs)' }}>{nameError}</span>}
				</label>
				<label>
					<span>Общая сумма кредита</span>
					<TextInput
						mask="currency"
						type="text"
						inputMode="numeric"
						value={amount}
						onChange={(e) => {
							const rawValue = (e.target as HTMLInputElement).value;
							const parsed = parseCurrencyInput(rawValue);
							onAmountChange(parsed);
							if (amountError) setAmountError(null);
						}}
						onBlur={handleAmountBlur}
						error={!!amountError}
						placeholder="Необязательно (можно: 5000+1000)"
					/>
					{amountError && <span style={{ color: 'var(--red)', fontSize: 'var(--font-size-sm)', marginTop: 'var(--space-xs)' }}>{amountError}</span>}
				</label>
				<label>
					<span>Ежемесячный платеж</span>
					<TextInput
						mask="currency"
						type="text"
						inputMode="numeric"
						value={monthlyPayment}
						onChange={(e) => {
							const rawValue = (e.target as HTMLInputElement).value;
							const parsed = parseCurrencyInput(rawValue);
							onMonthlyPaymentChange(parsed);
							if (monthlyPaymentError) setMonthlyPaymentError(null);
						}}
						onBlur={handleMonthlyPaymentBlur}
						error={!!monthlyPaymentError}
						placeholder="Необязательно (можно: 5000+1000)"
					/>
					{monthlyPaymentError && <span style={{ color: 'var(--red)', fontSize: 'var(--font-size-sm)', marginTop: 'var(--space-xs)' }}>{monthlyPaymentError}</span>}
				</label>
				<label>
					<span>Процентная ставка</span>
					<TextInput
						mask="percentage"
						type="text"
						inputMode="numeric"
						value={interestRate}
						onChange={(e) => {
							const rawValue = (e.target as HTMLInputElement).value;
							const parsed = parsePercentageInput(rawValue);
							onInterestRateChange(parsed);
							if (interestRateError) setInterestRateError(null);
						}}
						onBlur={handleInterestRateBlur}
						error={!!interestRateError}
						min="0"
						max="100"
						step="0.1"
						placeholder="Необязательно"
					/>
					{interestRateError && <span style={{ color: 'var(--red)', fontSize: 'var(--font-size-sm)', marginTop: 'var(--space-xs)' }}>{interestRateError}</span>}
				</label>
				<label>
					<span>Дата платежа (число месяца)</span>
					<TextInput
						type="number"
						inputMode="numeric"
						min="1"
						max="31"
						value={paymentDate}
						onChange={(e) => {
							const val = (e.target as HTMLInputElement).value;
							// Разрешаем только числа от 1 до 31
							if (val === '' || (parseInt(val) >= 1 && parseInt(val) <= 31)) {
								onPaymentDateChange(val);
								if (paymentDateError) setPaymentDateError(null);
							}
						}}
						onBlur={handlePaymentDateBlur}
						error={!!paymentDateError}
						placeholder="Число месяца (1-31)"
					/>
					{paymentDateError && <span style={{ color: 'var(--red)', fontSize: 'var(--font-size-sm)', marginTop: 'var(--space-xs)' }}>{paymentDateError}</span>}
				</label>
				<label className="col-span">
					<span>Заметки</span>
					<NotesField rows={3} value={notes} onChange={(e) => onNotesChange(e.target.value)} />
				</label>
			</form>
		</Modal>
	);
}

