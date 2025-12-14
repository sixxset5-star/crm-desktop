/**
 * Компонент умного ввода кредита
 * Поддерживает три режима:
 * 1. Сумма + ставка + срок → платеж
 * 2. Сумма + ставка + платеж → срок
 * 3. Ставка + срок + платеж → сумма
 */
import React, { useState, useEffect } from 'react';
import { TextInput, Select, Checkbox } from '@/shared/ui';
import { formatCurrencyRub } from '@/shared/lib/format';
import { parseCurrencyInput, parsePercentageInput } from '@/shared/lib/input-masks';
import {
	calculateCreditPayment,
	calculateCreditTerm,
	calculateCreditAmount,
} from '@/shared/lib/electron-bridge';
import { createLogger } from '@/shared/lib/logger';
import { parseNumberSafe, validatePositiveNumber, validatePercentage, validateNumber } from '@/shared/utils/number-validation';
import styles from './SmartCreditForm.module.css';

const log = createLogger('SmartCreditForm');

export type InputMode = 'amount_rate_term' | 'amount_rate_payment' | 'rate_term_payment';

type SmartCreditFormProps = {
	mode: InputMode;
	onModeChange: (mode: InputMode) => void;
	amount: string;
	onAmountChange: (value: string) => void;
	annualRate: string;
	onAnnualRateChange: (value: string) => void;
	termMonths: string;
	onTermMonthsChange: (value: string) => void;
	monthlyPayment: string;
	onMonthlyPaymentChange: (value: string) => void;
	onCalculationResult?: (result: { type: string; value: number; formula: string }) => void;
	isInterestFree?: boolean;
	onInterestFreeChange?: (isFree: boolean) => void;
};

export function SmartCreditForm({
	mode,
	onModeChange,
	amount,
	onAmountChange,
	annualRate,
	onAnnualRateChange,
	termMonths,
	onTermMonthsChange,
	monthlyPayment,
	onMonthlyPaymentChange,
	onCalculationResult,
	isInterestFree = false,
	onInterestFreeChange,
}: SmartCreditFormProps): React.ReactElement {
	const [calculatedValue, setCalculatedValue] = useState<number | null>(null);
	const [formula, setFormula] = useState<string>('');
	const [isCalculating, setIsCalculating] = useState(false);
	
	// Состояния для ошибок валидации
	const [amountError, setAmountError] = useState<string | null>(null);
	const [annualRateError, setAnnualRateError] = useState<string | null>(null);
	const [termMonthsError, setTermMonthsError] = useState<string | null>(null);
	const [monthlyPaymentError, setMonthlyPaymentError] = useState<string | null>(null);

	// Определяем, какие поля обязательны для текущего режима
	const getRequiredFields = () => {
		switch (mode) {
			case 'amount_rate_term':
				return { amount: true, annualRate: true, termMonths: true, monthlyPayment: false };
			case 'amount_rate_payment':
				return { amount: true, annualRate: true, termMonths: false, monthlyPayment: true };
			case 'rate_term_payment':
				return { amount: false, annualRate: true, termMonths: true, monthlyPayment: true };
			default:
				return { amount: false, annualRate: false, termMonths: false, monthlyPayment: false };
		}
	};

	const requiredFields = getRequiredFields();

	const handleAmountBlur = () => {
		if (amount.trim() && requiredFields.amount) {
			const validation = validatePositiveNumber(amount, {
				required: true,
				fieldName: 'Сумма кредита',
			});
			if (!validation.valid) {
				setAmountError(validation.error || null);
			} else {
				setAmountError(null);
			}
		} else if (amount.trim() && !requiredFields.amount) {
			const validation = validatePositiveNumber(amount, {
				required: false,
				fieldName: 'Сумма кредита',
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

	const handleAnnualRateBlur = () => {
		if (annualRate.trim() && requiredFields.annualRate && !isInterestFree) {
			const validation = validatePercentage(annualRate, {
				allowZero: true,
				required: true,
				fieldName: 'Годовая ставка',
			});
			if (!validation.valid) {
				setAnnualRateError(validation.error || null);
			} else {
				setAnnualRateError(null);
			}
		} else if (annualRate.trim() && !requiredFields.annualRate && !isInterestFree) {
			const validation = validatePercentage(annualRate, {
				allowZero: true,
				required: false,
				fieldName: 'Годовая ставка',
			});
			if (!validation.valid) {
				setAnnualRateError(validation.error || null);
			} else {
				setAnnualRateError(null);
			}
		} else {
			setAnnualRateError(null);
		}
	};

	const handleTermMonthsBlur = () => {
		if (termMonths.trim() && requiredFields.termMonths) {
			const validation = validatePositiveNumber(termMonths, {
				required: true,
				fieldName: 'Срок (месяцев)',
			});
			if (!validation.valid) {
				setTermMonthsError(validation.error || null);
			} else {
				setTermMonthsError(null);
			}
		} else if (termMonths.trim() && !requiredFields.termMonths) {
			const validation = validatePositiveNumber(termMonths, {
				required: false,
				fieldName: 'Срок (месяцев)',
			});
			if (!validation.valid) {
				setTermMonthsError(validation.error || null);
			} else {
				setTermMonthsError(null);
			}
		} else {
			setTermMonthsError(null);
		}
	};

	const handleMonthlyPaymentBlur = () => {
		if (monthlyPayment.trim() && requiredFields.monthlyPayment) {
			const validation = validatePositiveNumber(monthlyPayment, {
				required: true,
				fieldName: 'Ежемесячный платеж',
			});
			if (!validation.valid) {
				setMonthlyPaymentError(validation.error || null);
			} else {
				setMonthlyPaymentError(null);
			}
		} else if (monthlyPayment.trim() && !requiredFields.monthlyPayment) {
			const validation = validatePositiveNumber(monthlyPayment, {
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

	// Автоматический расчет при изменении полей
	useEffect(() => {
		const calculate = async () => {
			setIsCalculating(true);
			try {
				let result: number | null = null;
				let formulaText = '';

				if (mode === 'amount_rate_term') {
					// Режим 1: Сумма + ставка + срок → платеж
					const amountNum = parseNumberSafe(amount) ?? 0;
					const rateNum = parseNumberSafe(annualRate) ?? 0;
					const termNum = parseNumberSafe(termMonths) ?? 0;

					if (amountNum > 0 && rateNum >= 0 && termNum > 0) {
						result = await calculateCreditPayment({
							amount: amountNum,
							annualRate: rateNum,
							termMonths: termNum,
						});
						if (result) {
							if (rateNum === 0) {
								formulaText = `Беспроцентный кредит: A = K / n = ${formatCurrencyRub(amountNum)} / ${termNum} = ${formatCurrencyRub(result)}`;
							} else {
								const monthlyRate = rateNum / 12 / 100;
								formulaText = `A = K × (i / (1 - (1 + i)^(-n))) = ${formatCurrencyRub(amountNum)} × (${(monthlyRate * 100).toFixed(4)}% / (1 - (1 + ${(monthlyRate * 100).toFixed(4)}%)^(-${termNum})))`;
							}
						}
					}
				} else if (mode === 'amount_rate_payment') {
					// Режим 2: Сумма + ставка + платеж → срок
					const amountNum = parseNumberSafe(amount) ?? 0;
					const rateNum = parseNumberSafe(annualRate) ?? 0;
					const paymentNum = parseNumberSafe(monthlyPayment) ?? 0;

					if (amountNum > 0 && rateNum >= 0 && paymentNum > 0) {
						result = await calculateCreditTerm({
							amount: amountNum,
							annualRate: rateNum,
							monthlyPayment: paymentNum,
						});
						if (result) {
							if (rateNum === 0) {
								formulaText = `Беспроцентный кредит: n = K / A = ${formatCurrencyRub(amountNum)} / ${formatCurrencyRub(paymentNum)} = ${Math.ceil(result)} месяцев`;
							} else {
								const monthlyRate = rateNum / 12 / 100;
								formulaText = `n = -log(1 - (K × i / A)) / log(1 + i) = -log(1 - (${formatCurrencyRub(amountNum)} × ${(monthlyRate * 100).toFixed(4)}% / ${formatCurrencyRub(paymentNum)})) / log(1 + ${(monthlyRate * 100).toFixed(4)}%)`;
							}
						}
					}
				} else if (mode === 'rate_term_payment') {
					// Режим 3: Ставка + срок + платеж → сумма
					const rateNum = parseNumberSafe(annualRate) ?? 0;
					const termNum = parseNumberSafe(termMonths) ?? 0;
					const paymentNum = parseNumberSafe(monthlyPayment) ?? 0;

					if (rateNum >= 0 && termNum > 0 && paymentNum > 0) {
						result = await calculateCreditAmount({
							annualRate: rateNum,
							termMonths: termNum,
							monthlyPayment: paymentNum,
						});
						if (result) {
							if (rateNum === 0) {
								formulaText = `Беспроцентный кредит: K = A × n = ${formatCurrencyRub(paymentNum)} × ${termNum} = ${formatCurrencyRub(result)}`;
							} else {
								const monthlyRate = rateNum / 12 / 100;
								formulaText = `K = A × (1 - (1 + i)^(-n)) / i = ${formatCurrencyRub(paymentNum)} × (1 - (1 + ${(monthlyRate * 100).toFixed(4)}%)^(-${termNum})) / ${(monthlyRate * 100).toFixed(4)}%`;
							}
						}
					}
				}

				setCalculatedValue(result);
				setFormula(formulaText);

				if (result && onCalculationResult) {
					let type = '';
					if (mode === 'amount_rate_term') type = 'payment';
					else if (mode === 'amount_rate_payment') type = 'term';
					else type = 'amount';

					onCalculationResult({
						type,
						value: result,
						formula: formulaText,
					});
				}
			} catch (error) {
				log.error('Calculation error', error);
				setCalculatedValue(null);
				setFormula('');
			} finally {
				setIsCalculating(false);
			}
		};

		calculate();
	}, [mode, amount, annualRate, termMonths, monthlyPayment, onCalculationResult]);

	const modeLabels = {
		amount_rate_term: 'Сумма + Ставка + Срок → Платеж',
		amount_rate_payment: 'Сумма + Ставка + Платеж → Срок',
		rate_term_payment: 'Ставка + Срок + Платеж → Сумма',
	};

	// Проверяем, заполнены ли обязательные поля
	const isFieldFilled = (field: string) => {
		const value = field === 'amount' ? amount : field === 'annualRate' ? annualRate : field === 'termMonths' ? termMonths : monthlyPayment;
		if (value.trim() === '') return false;
		const numValue = parseNumberSafe(value);
		if (numValue === null) return false;
		// Для процентной ставки разрешаем 0 (беспроцентный кредит)
		if (field === 'annualRate') {
			return numValue >= 0;
		}
		return numValue > 0;
	};

	const getFieldHint = (field: string) => {
		if (!requiredFields[field as keyof typeof requiredFields]) return null;
		if (isFieldFilled(field)) return null;
		return '⚠️ Заполните это поле для расчета';
	};

	return (
		<div className={styles.container}>
			{/* Выбор режима */}
			<label className={styles.modeSelector}>
				<span className={styles.modeSelectorLabel}>Режим расчета</span>
				<Select
					value={mode}
					onChange={(e) => onModeChange(e.target.value as InputMode)}
					size="sm"
				>
					{Object.entries(modeLabels).map(([value, label]) => (
						<option key={value} value={value}>
							{label}
						</option>
					))}
				</Select>
			</label>

			{/* Подсказка о режиме */}
			<div className={styles.modeHint}>
				{mode === 'amount_rate_term' && '💡 Заполните сумму, ставку и срок — система автоматически рассчитает ежемесячный платеж'}
				{mode === 'amount_rate_payment' && '💡 Заполните сумму, ставку и желаемый платеж — система рассчитает необходимый срок'}
				{mode === 'rate_term_payment' && '💡 Заполните ставку, срок и желаемый платеж — система рассчитает максимальную сумму кредита'}
			</div>

			{/* Поля ввода в зависимости от режима */}
			<div className={styles.fieldsGrid}>
				{mode !== 'rate_term_payment' && (
					<label className={requiredFields.amount ? styles.requiredField : ''}>
						<span className={styles.fieldLabel}>
							Сумма кредита
							{requiredFields.amount && <span className={styles.requiredMark}> *</span>}
						</span>
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
							placeholder="Например: 500 000"
							size="sm"
							className={requiredFields.amount && !isFieldFilled('amount') ? styles.fieldWarning : ''}
						/>
						{amountError && <span style={{ color: 'var(--red)', fontSize: 'var(--font-size-sm)', marginTop: 'var(--space-xs)' }}>{amountError}</span>}
						{!amountError && getFieldHint('amount') && <span className={styles.fieldHint}>{getFieldHint('amount')}</span>}
					</label>
				)}

				<label className={requiredFields.annualRate ? styles.requiredField : ''}>
					<span className={styles.fieldLabel}>
						Годовая ставка
						{requiredFields.annualRate && <span className={styles.requiredMark}> *</span>}
					</span>
					{/* Тумблер "Без процентов" над полем */}
					{onInterestFreeChange && (
						<div style={{ marginBottom: 'var(--space-xs)', display: 'flex', alignItems: 'center', gap: 'var(--space-xs)' }}>
							<Checkbox
								checked={isInterestFree}
								onChange={(e) => {
									const checked = (e.target as HTMLInputElement).checked;
									onInterestFreeChange(checked);
									if (checked) {
										onAnnualRateChange('0');
									} else {
										// Если выключаем тумблер и ставка была '0', очищаем поле
										if (annualRate === '0') {
											onAnnualRateChange('');
										}
									}
								}}
							/>
							<span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)' }}>Без процентов</span>
						</div>
					)}
					{!isInterestFree && (
						<>
							<TextInput
								mask="percentage"
								type="text"
								inputMode="numeric"
								value={annualRate}
								onChange={(e) => {
									const rawValue = (e.target as HTMLInputElement).value;
									const parsed = parsePercentageInput(rawValue);
									onAnnualRateChange(parsed);
									if (annualRateError) setAnnualRateError(null);
								}}
								onBlur={handleAnnualRateBlur}
								error={!!annualRateError}
								placeholder="Например: 15.5"
								size="sm"
								min="0"
								step="0.1"
								className={requiredFields.annualRate && !isFieldFilled('annualRate') ? styles.fieldWarning : ''}
							/>
							{annualRateError && <span style={{ color: 'var(--red)', fontSize: 'var(--font-size-sm)', marginTop: 'var(--space-xs)' }}>{annualRateError}</span>}
							{!annualRateError && getFieldHint('annualRate') && <span className={styles.fieldHint}>{getFieldHint('annualRate')}</span>}
						</>
					)}
					{isInterestFree && (
						<div style={{ 
							padding: 'var(--space-sm)', 
							background: 'var(--panel)', 
							borderRadius: 'var(--radius-sm)',
							color: 'var(--text-secondary)',
							fontSize: 'var(--font-size-sm)'
						}}>
							Беспроцентный кредит (0%)
						</div>
					)}
				</label>

				{mode !== 'amount_rate_payment' && (
					<label className={requiredFields.termMonths ? styles.requiredField : ''}>
						<span className={styles.fieldLabel}>
							Срок (месяцев)
							{requiredFields.termMonths && <span className={styles.requiredMark}> *</span>}
						</span>
						<TextInput
							type="number"
							inputMode="numeric"
							value={termMonths}
							onChange={(e) => {
								onTermMonthsChange((e.target as HTMLInputElement).value);
								if (termMonthsError) setTermMonthsError(null);
							}}
							onBlur={handleTermMonthsBlur}
							error={!!termMonthsError}
							placeholder="Например: 12"
							size="sm"
							min="1"
							className={requiredFields.termMonths && !isFieldFilled('termMonths') ? styles.fieldWarning : ''}
						/>
						{termMonthsError && <span style={{ color: 'var(--red)', fontSize: 'var(--font-size-sm)', marginTop: 'var(--space-xs)' }}>{termMonthsError}</span>}
						{!termMonthsError && getFieldHint('termMonths') && <span className={styles.fieldHint}>{getFieldHint('termMonths')}</span>}
					</label>
				)}

				{mode !== 'amount_rate_term' && (
					<label className={requiredFields.monthlyPayment ? styles.requiredField : ''}>
						<span className={styles.fieldLabel}>
							Ежемесячный платеж
							{requiredFields.monthlyPayment && <span className={styles.requiredMark}> *</span>}
						</span>
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
							placeholder="Например: 15 000"
							size="sm"
							className={requiredFields.monthlyPayment && !isFieldFilled('monthlyPayment') ? styles.fieldWarning : ''}
						/>
						{monthlyPaymentError && <span style={{ color: 'var(--red)', fontSize: 'var(--font-size-sm)', marginTop: 'var(--space-xs)' }}>{monthlyPaymentError}</span>}
						{!monthlyPaymentError && getFieldHint('monthlyPayment') && <span className={styles.fieldHint}>{getFieldHint('monthlyPayment')}</span>}
					</label>
				)}
			</div>

			{/* Результат расчета */}
			{calculatedValue !== null && !isCalculating && (
				<div className={styles.resultBox}>
					<div>
						<span className={styles.resultLabel}>
							{mode === 'amount_rate_term' && 'Ежемесячный платеж: '}
							{mode === 'amount_rate_payment' && 'Срок кредита: '}
							{mode === 'rate_term_payment' && 'Максимальная сумма: '}
						</span>
						<span className={styles.resultValue}>
							{mode === 'amount_rate_payment' ? `${Math.ceil(calculatedValue)} месяцев` : formatCurrencyRub(calculatedValue)}
						</span>
					</div>
					{formula && (
						<div className={styles.formula}>
							{formula}
						</div>
					)}
				</div>
			)}

			{isCalculating && (
				<div className={styles.calculating}>
					Вычисление...
				</div>
			)}
		</div>
	);
}

