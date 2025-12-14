import React, { useEffect, useRef, useState } from 'react';
import type { Income } from '@/store/income';
import { Modal, ModalFooter } from '@/shared/ui/Modal';
import { Button, TextInput, NotesField } from '@/shared/ui';
import IconButton from '@/shared/components/IconButton';
import { TrashIcon } from '@/shared/components/Icons';
import { UI_TEXTS } from '@/shared/constants/ui-texts';
import { safeEval } from '@/shared/lib/mathParser';
import { formatDateInput } from '@/shared/lib/date';
import { parseCurrencyInput, parsePercentageInput } from '@/shared/lib/input-masks';
import { validatePositiveNumber, validatePercentage, parseNumberSafe } from '@/shared/utils/number-validation';
import { useUIStore } from '@/store/ui';

type IncomeFormModalProps = {
	open: boolean;
	initial: Income | null;
	onClose: () => void;
	onSave: (income: { title: string; amount: number; date: string; taxRate?: number; notes?: string }) => void;
	onDelete?: () => void;
};

export function IncomeFormModal({
	open,
	initial,
	onClose,
	onSave,
	onDelete,
}: IncomeFormModalProps): React.ReactElement | null {
	const [title, setTitle] = useState(initial?.title || '');
	const [amount, setAmount] = useState(initial?.amount ? String(initial.amount) : '');
	const [date, setDate] = useState(initial?.date || formatDateInput(new Date()));
	const [taxRate, setTaxRate] = useState(initial?.taxRate ? String(initial.taxRate) : '');
	const [notes, setNotes] = useState(initial?.notes || '');
	const formRef = useRef<HTMLFormElement>(null);

	useEffect(() => {
		if (initial) {
			setTitle(initial.title || '');
			setAmount(initial.amount ? String(initial.amount) : '');
			setDate(initial.date || formatDateInput(new Date()));
			setTaxRate(initial.taxRate ? String(initial.taxRate) : '');
			setNotes(initial.notes || '');
		} else {
			setTitle('');
			setAmount('');
			setDate(formatDateInput(new Date()));
			setTaxRate('');
			setNotes('');
		}
	}, [initial, open]);

	function resolveAmount(value: string): number | null {
		const trimmed = value.trim();
		if (!trimmed) return null;
		const normalized = trimmed.replace(',', '.');
		const containsExpression = /[+\-*/()]/.test(normalized);
		const evaluated = containsExpression ? safeEval(normalized) : null;
		const result = evaluated ?? parseNumberSafe(normalized);
		if (result === null) {
			return null;
		}
		return result;
	}

	async function handleSubmit(e: React.FormEvent) {
		e.preventDefault();
		
		// Валидация суммы
		const amountValidation = validatePositiveNumber(amount, {
			required: true,
			fieldName: 'Сумма',
		});
		if (!amountValidation.valid || amountValidation.value === undefined) {
			await useUIStore.getState().showAlert({
				title: UI_TEXTS.VALIDATION_ERROR,
				message: amountValidation.error || 'Некорректная сумма',
			});
			return;
		}

		if (!title.trim() || !date) {
			return;
		}

		// Валидация налоговой ставки
		let taxRateNum: number | undefined = undefined;
		if (taxRate.trim()) {
			const taxRateValidation = validatePercentage(taxRate, {
				allowZero: true,
				required: false,
				fieldName: 'Налог',
			});
			if (!taxRateValidation.valid) {
				await useUIStore.getState().showAlert({
					title: UI_TEXTS.VALIDATION_ERROR,
					message: taxRateValidation.error || 'Некорректная налоговая ставка',
				});
				return;
			}
			taxRateNum = taxRateValidation.value;
		}

		onSave({
			title: title.trim(),
			amount: amountValidation.value,
			date,
			taxRate: taxRateNum,
			notes: notes.trim() || undefined,
		});
	}

	if (!open) return null;

	return (
		<Modal
			open={open}
			onClose={onClose}
			title={initial ? UI_TEXTS.EDIT_INCOME : UI_TEXTS.NEW_INCOME}
			width={500}
			footer={
				<div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
					{onDelete && (
						<div style={{ 
							display: 'flex',
							alignItems: 'center',
							gap: 'var(--space-sm)'
						}}>
							<IconButton
								icon={TrashIcon}
								title={UI_TEXTS.DELETE_INCOME}
								onClick={onDelete}
							/>
							<span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--muted)' }}>{UI_TEXTS.DELETE_INCOME}</span>
						</div>
					)}
					<div style={{ display: 'flex', gap: 'var(--space-sm)', marginLeft: 'auto' }}>
						<ModalFooter
							onCancel={onClose}
							onConfirm={() => formRef.current?.requestSubmit()}
							confirmText={UI_TEXTS.SAVE}
							cancelText={UI_TEXTS.CANCEL}
						/>
					</div>
				</div>
			}
		>
			<form ref={formRef} onSubmit={handleSubmit} className="form-grid">
				<label className="col-span">
					<span>Название дохода</span>
					<TextInput
						value={title}
						onChange={(e) => setTitle((e.target as HTMLInputElement).value)}
						placeholder="Например: Подработка на стройке, Деньги от жены, Подарок"
						required
					/>
				</label>
				<label>
					<span>Сумма</span>
					<TextInput
						mask="currency"
						type="text"
						inputMode="decimal"
						value={amount}
						onChange={(e) => {
							const rawValue = (e.target as HTMLInputElement).value;
							const parsed = parseCurrencyInput(rawValue);
							setAmount(parsed);
						}}
						onDoubleClick={(e) => (e.target as HTMLInputElement).select()}
					onBlur={(e) => {
						const value = (e.target as HTMLInputElement).value.trim();
						const parsed = parseCurrencyInput(value);
						// Если есть математические символы, вычисляем выражение
						if (parsed && /[+\-*/()]/.test(parsed)) {
							const result = safeEval(parsed);
							if (result !== null && isFinite(result)) {
								const normalizedValue = Math.round(result * 100) / 100;
								setAmount(String(normalizedValue));
							}
						} else {
							const resolved = resolveAmount(parsed);
							if (resolved !== null && isFinite(resolved)) {
								const normalizedValue = Math.round(resolved * 100) / 100;
								setAmount(String(normalizedValue));
							}
						}
					}}
						placeholder="Например: 10 000"
						required
					/>
				</label>
				<label>
					<span>Дата получения</span>
					<TextInput
						type="date"
						value={date}
						onChange={(e) => setDate((e.target as HTMLInputElement).value)}
						required
					/>
				</label>
				<label>
					<span>Налог</span>
					<TextInput
						mask="percentage"
						type="text"
						step="0.1"
						min="0"
						max="100"
						value={taxRate}
						onChange={(e) => {
							const rawValue = (e.target as HTMLInputElement).value;
							const parsed = parsePercentageInput(rawValue);
							setTaxRate(parsed);
						}}
						placeholder="Например: 13"
					/>
				</label>
				<label className="col-span">
					<span>Заметки</span>
					<NotesField
						value={notes}
						onChange={(e) => setNotes(e.target.value)}
					/>
				</label>
			</form>
		</Modal>
	);
}






