import React, { useState } from 'react';
import { Button, TextInput } from '@/shared/ui';
import { handleNumericInputBlur } from '../utils';
import { parseCurrencyInput } from '@/shared/lib/input-masks';
import { UI_TEXTS } from '@/shared/constants/ui-texts';
import { validateText } from '@/shared/utils/text-validation';
import { validatePositiveNumber } from '@/shared/utils/number-validation';
import { useUIStore } from '@/store/ui';

type ExpenseFormProps = {
	name: string;
	amount: string;
	onNameChange: (value: string) => void;
	onAmountChange: (value: string) => void;
	onSubmit: () => void;
	onCancel?: () => void;
	isEditing?: boolean;
};

export function ExpenseForm({
	name,
	amount,
	onNameChange,
	onAmountChange,
	onSubmit,
	onCancel,
	isEditing = false,
}: ExpenseFormProps): React.ReactElement {
	const [nameError, setNameError] = useState<string | null>(null);
	const [amountError, setAmountError] = useState<string | null>(null);

	const handleAmountBlur = (e: React.FocusEvent<HTMLInputElement>) => {
		handleNumericInputBlur(e.target.value, onAmountChange);
		// Валидация при blur
		if (amount.trim()) {
			const validation = validatePositiveNumber(amount, {
				required: false,
				fieldName: 'Сумма',
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

	const handleNameBlur = () => {
		const validation = validateText(name, {
			required: true,
			fieldName: 'Название расхода',
		});
		if (!validation.valid) {
			setNameError(validation.error || null);
		} else {
			setNameError(null);
		}
	};

	const handleKeyDown = async (e: React.KeyboardEvent<HTMLInputElement>) => {
		if (e.key === 'Enter') {
			e.preventDefault();
			await handleSubmit();
		}
	};

	const handleSubmit = async () => {
		// Валидация при submit
		const nameValidation = validateText(name, {
			required: true,
			fieldName: 'Название расхода',
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
			const amountValidation = validatePositiveNumber(amount, {
				required: false,
				fieldName: 'Сумма',
			});
			if (!amountValidation.valid) {
				setAmountError(amountValidation.error || null);
				await useUIStore.getState().showAlert({
					title: UI_TEXTS.VALIDATION_ERROR,
					message: amountValidation.error || 'Некорректная сумма',
				});
				return;
			}
		}

		onSubmit();
	};

	return (
		<div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
			<div style={{ display: 'flex', gap: 'var(--space-sm)' }}>
				<div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
					<TextInput
						type="text"
						size="xs"
						value={name}
						onChange={(e) => {
							onNameChange((e.target as HTMLInputElement).value);
							if (nameError) setNameError(null);
						}}
						onBlur={handleNameBlur}
						error={!!nameError}
						placeholder="Название расхода"
						style={{ flex: 1 }}
						onKeyDown={handleKeyDown}
					/>
					{nameError && <span style={{ color: 'var(--red)', fontSize: 'var(--font-size-sm)', marginTop: 'var(--space-xs)' }}>{nameError}</span>}
				</div>
				<div style={{ display: 'flex', flexDirection: 'column', width: 'var(--reports-task-count-min-width)' }}>
					<TextInput
						mask="currency"
						type="text"
						size="xs"
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
						placeholder="Например: 1 500"
						style={{ width: '100%' }}
						onKeyDown={handleKeyDown}
					/>
					{amountError && <span style={{ color: 'var(--red)', fontSize: 'var(--font-size-sm)', marginTop: 'var(--space-xs)' }}>{amountError}</span>}
				</div>
				<Button onClick={handleSubmit} variant="primary" size="xs">
					{isEditing ? UI_TEXTS.SAVE : UI_TEXTS.NEW_EXPENSE}
				</Button>
				{isEditing && onCancel && (
					<Button onClick={onCancel} variant="secondary" size="sm">
						{UI_TEXTS.CANCEL}
					</Button>
				)}
			</div>
		</div>
	);
}

