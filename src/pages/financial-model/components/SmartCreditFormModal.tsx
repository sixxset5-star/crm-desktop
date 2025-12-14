/**
 * Модальное окно для создания/редактирования кредита с умным вводом и графиком
 */
import React, { useState, useEffect, useMemo } from 'react';
import type { Credit, CreditScheduleItem } from '@/store/goals';
import { Modal, ModalFooter } from '@/shared/ui/Modal';
import { TextInput, TextArea, Select, NotesField } from '@/shared/ui';
import { getToken } from '@/shared/lib/tokens';
import { UI_TEXTS } from '@/shared/constants/ui-texts';
import { SmartCreditForm, type InputMode } from './SmartCreditForm';
import { CreditScheduleTable } from './CreditScheduleTable';
import { buildCreditSchedule } from '@/shared/lib/electron-bridge';
import { handleNumericInputBlur } from '../utils';
import { createLogger } from '@/shared/lib/logger';
import { generateShortId } from '@/shared/utils/id';
import { validatePositiveNumber, validatePercentage, parseNumberSafe } from '@/shared/utils/number-validation';
import { validateText } from '@/shared/utils/text-validation';
import { useUIStore } from '@/store/ui';
import styles from './SmartCreditFormModal.module.css';

const log = createLogger('SmartCreditFormModal');

type SmartCreditFormModalProps = {
	open: boolean;
	editing: (Credit & { schedule?: CreditScheduleItem[] }) | null;
	onSubmit: (credit: Credit & { schedule?: CreditScheduleItem[] }) => void;
	onClose: () => void;
};

export function SmartCreditFormModal({
	open,
	editing,
	onSubmit,
	onClose,
}: SmartCreditFormModalProps): React.ReactElement | null {
	const modalWidth = useMemo(() => getToken('--modal-width-lg', 700), []);

	// Базовые поля
	const [name, setName] = useState('');
	const [description, setDescription] = useState('');
	const [notes, setNotes] = useState('');
	const [startDate, setStartDate] = useState('');
	const [paymentDay, setPaymentDay] = useState('');
	const [scheduleType, setScheduleType] = useState<'annuity' | 'differentiated'>('annuity');
	const [status, setStatus] = useState<'active' | 'archived'>('active');

	// Умный ввод
	const [inputMode, setInputMode] = useState<InputMode>('amount_rate_term');
	const [amount, setAmount] = useState('');
	const [annualRate, setAnnualRate] = useState('');
	const [termMonths, setTermMonths] = useState('');
	const [monthlyPayment, setMonthlyPayment] = useState('');
	// Храним рассчитанные значения для использования при построении графика
	const [calculatedTerm, setCalculatedTerm] = useState<number | null>(null);
	const [calculatedPayment, setCalculatedPayment] = useState<number | null>(null);
	const [isInterestFree, setIsInterestFree] = useState(false);
	const [isInitializing, setIsInitializing] = useState(false);

	// График
	const [schedule, setSchedule] = useState<CreditScheduleItem[]>([]);
	const [showSchedule, setShowSchedule] = useState(false);
	const [scheduleViewMode, setScheduleViewMode] = useState<'table' | 'chart'>('table');

	// Инициализация при открытии/редактировании
	useEffect(() => {
		if (open && editing) {
			// Устанавливаем флаг инициализации, чтобы предотвратить перезапись isInterestFree
			setIsInitializing(true);
			
			setName(editing.name || '');
			setDescription(editing.description || '');
			setNotes(editing.notes || '');
			// ВАЖНО: startDate может быть пустой строкой, поэтому проверяем != null и != undefined
			// Сохраняем startDate только если он не пустой и не undefined
			const startDateValue = editing.startDate != null && editing.startDate !== '' ? String(editing.startDate) : '';
			setStartDate(startDateValue);
			// Восстанавливаем режим расчета из сохраненного кредита
			setInputMode(editing.inputMode || 'amount_rate_term');
			// ВАЖНО: paymentDate может быть числом (1-31) в виде строки, поэтому проверяем != null и != undefined
			setPaymentDay(editing.paymentDate != null && editing.paymentDate !== '' 
				? (editing.paymentDate.length <= 2 ? String(editing.paymentDate) : String(new Date(editing.paymentDate).getDate())) 
				: '');
			setScheduleType(editing.scheduleType || 'annuity');
			setStatus(editing.status || 'active');
			setAmount(editing.amount != null ? String(editing.amount) : '');
			
			// ВАЖНО: interestRate может быть 0, поэтому проверяем строгое равенство 0
			// Если interestRate === 0, включаем тумблер "Без процентов"
			const interestRateValue = editing.interestRate;
			// Проверяем строгое равенство 0 (может быть число 0 или строка '0' после преобразования)
			const isFree = interestRateValue === 0 || (interestRateValue != null && !isNaN(Number(interestRateValue)) && Number(interestRateValue) === 0);
			
			// ВАЖНО: Устанавливаем isInterestFree ПЕРВЫМ, чтобы избежать race conditions
			// Затем устанавливаем annualRate в зависимости от isFree
			setIsInterestFree(isFree);
			// Если тумблер включен, устанавливаем annualRate в '0', иначе используем значение из editing
			setAnnualRate(isFree ? '0' : (editing.interestRate != null && editing.interestRate !== 0 ? String(editing.interestRate) : ''));
			
			// Сбрасываем флаг инициализации после небольшой задержки, чтобы график мог построиться
			setTimeout(() => {
				setIsInitializing(false);
			}, 200);
			
			// ВАЖНО: termMonths должен быть > 0, поэтому проверяем != null
			const termMonthsValue = editing.termMonths != null && editing.termMonths !== undefined ? String(editing.termMonths) : '';
			setTermMonths(termMonthsValue);
			setMonthlyPayment(editing.monthlyPayment != null ? String(editing.monthlyPayment) : '');
			// Если есть schedule, используем его, иначе график построится автоматически после инициализации
			if (editing.schedule && editing.schedule.length > 0) {
				setSchedule(editing.schedule);
				setShowSchedule(true);
			} else {
				setSchedule([]);
				setShowSchedule(false);
				// График будет построен автоматически после инициализации, если все поля заполнены
				setCalculatedTerm(null);
				setCalculatedPayment(null);
			}
		} else if (open && !editing) {
			// Сброс для нового кредита
			setIsInitializing(true);
			setName('');
			setDescription('');
			setNotes('');
			setStartDate(new Date().toISOString().split('T')[0]);
			setPaymentDay('');
			setScheduleType('annuity');
			setStatus('active');
			setAmount('');
			setAnnualRate('');
			setTermMonths('');
			setMonthlyPayment('');
			setIsInterestFree(false);
			setSchedule([]);
			setShowSchedule(false);
			setInputMode('amount_rate_term');
			setCalculatedTerm(null);
			setCalculatedPayment(null);
			setTimeout(() => {
				setIsInitializing(false);
			}, 100);
		}
		// ВАЖНО: Используем editing?.id как зависимость, чтобы useEffect срабатывал при изменении кредита
	}, [open, editing, editing?.id]);

	// ВАЖНО: НЕ синхронизируем тумблер с annualRate для редактируемого кредита
	// Тумблер устанавливается только при загрузке кредита в основном useEffect
	// Для нового кредита синхронизация не нужна, так как пользователь сам управляет тумблером

	// Построение графика при изменении параметров
	// ВАЖНО: Строим график автоматически, если все поля заполнены
	useEffect(() => {
		// Пропускаем построение во время инициализации
		if (isInitializing) {
			return;
		}

		// Если редактируем и график уже есть и он не пустой - не перестраиваем автоматически
		// Но если графика нет или он пустой, строим его автоматически
		if (editing && editing.schedule && editing.schedule.length > 0) {
			// График уже есть и не пустой, не перестраиваем автоматически
			// Но если в локальном состоянии графика нет, используем существующий
			if (schedule.length === 0) {
				setSchedule(editing.schedule);
				setShowSchedule(true);
			}
			return;
		}

		const buildScheduleAsync = async () => {
			const amountNum = parseNumberSafe(amount) ?? 0;
			// Если тумблер "Без процентов" включен, используем 0, иначе парсим annualRate
			const rateNum = isInterestFree ? 0 : (parseNumberSafe(annualRate) ?? 0);
			// ФИКС: Используем calculatedTerm только в расчётных режимах, иначе используем ручной ввод
			const shouldUseCalculatedTerm = inputMode === 'amount_rate_payment' && calculatedTerm != null && calculatedTerm > 0;
			const termNum = shouldUseCalculatedTerm ? calculatedTerm : (parseNumberSafe(termMonths) ?? 0);

			if (amountNum > 0 && rateNum >= 0 && termNum > 0 && startDate) {
				try {
					const newSchedule = await buildCreditSchedule({
						scheduleType,
						amount: amountNum,
						annualRate: rateNum,
						termMonths: termNum,
						startDate,
						paymentDay: paymentDay ? parseInt(paymentDay) : undefined,
					});
					setSchedule(newSchedule);
					setShowSchedule(newSchedule.length > 0);
				} catch (error) {
					log.error('Failed to build schedule', error);
					setSchedule([]);
					setShowSchedule(false);
				}
			} else {
				// Не очищаем schedule, если он уже есть (может быть загружен из БД)
				if (schedule.length === 0) {
					setShowSchedule(false);
				}
			}
		};

		buildScheduleAsync();
	}, [amount, annualRate, termMonths, startDate, paymentDay, scheduleType, isInterestFree, isInitializing, editing, calculatedTerm, schedule.length]);

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		
		// Валидация названия
		const nameValidation = validateText(name, {
			required: true,
			fieldName: 'Название кредита',
		});
		if (!nameValidation.valid) {
			await useUIStore.getState().showAlert({
				title: UI_TEXTS.VALIDATION_ERROR,
				message: nameValidation.error || 'Название кредита обязательно для заполнения',
			});
			return;
		}

		// Валидация суммы кредита
		const amountValidation = validatePositiveNumber(amount, {
			required: false,
			fieldName: 'Сумма кредита',
		});
		if (!amountValidation.valid && amount.trim()) {
			await useUIStore.getState().showAlert({
				title: UI_TEXTS.VALIDATION_ERROR,
				message: amountValidation.error || 'Некорректная сумма кредита',
			});
			return;
		}
		const amountNum = amountValidation.value;

		// Валидация процентной ставки
		// ВАЖНО: interestRate может быть 0 (беспроцентный кредит), поэтому нужно явно обрабатывать 0
		// ФИКС: Всегда сохраняем interestRate = 0, если isInterestFree, иначе парсим значение
		let validRate: number | undefined = undefined;
		if (isInterestFree) {
			// Если тумблер "Без процентов" включен, ставка = 0 (ВСЕГДА)
			validRate = 0;
		} else {
			// Если тумблер выключен, парсим значение из поля
			const parsedRate = parseNumberSafe(annualRate);
			if (parsedRate !== null) {
				// Валидируем только если есть значение
				const rateValidation = validatePercentage(annualRate, {
					allowZero: true,
					required: false,
					fieldName: 'Процентная ставка',
				});
				if (!rateValidation.valid) {
					await useUIStore.getState().showAlert({
						title: UI_TEXTS.VALIDATION_ERROR,
						message: rateValidation.error || 'Некорректная процентная ставка',
					});
					return;
				}
				validRate = rateValidation.value ?? parsedRate;
			}
			// Если поле пустое и тумблер выключен, validRate остается undefined
		}

		// Валидация срока кредита
		// ФИКС: Используем calculatedTerm только в расчётных режимах, иначе используем ручной ввод
		let termNum: number | undefined = undefined;
		// calculatedTerm используем только если режим - расчёт срока (amount_rate_payment)
		const shouldUseCalculatedTerm = inputMode === 'amount_rate_payment' && calculatedTerm != null && calculatedTerm > 0;
		
		if (shouldUseCalculatedTerm) {
			// Если режим расчёта срока и есть рассчитанное значение - используем его
			termNum = calculatedTerm;
		} else if (termMonths.trim()) {
			// Иначе используем значение из поля (ручной ввод)
			const termValidation = validatePositiveNumber(termMonths, {
				required: false,
				fieldName: 'Срок кредита',
			});
			if (!termValidation.valid) {
				await useUIStore.getState().showAlert({
					title: UI_TEXTS.VALIDATION_ERROR,
					message: termValidation.error || 'Некорректный срок кредита',
				});
				return;
			}
			termNum = termValidation.value;
		}

		// Валидация ежемесячного платежа
		let paymentNum: number | undefined = undefined;
		if (monthlyPayment.trim()) {
			const paymentValidation = validatePositiveNumber(monthlyPayment, {
				required: false,
				fieldName: 'Ежемесячный платеж',
			});
			if (!paymentValidation.valid) {
				await useUIStore.getState().showAlert({
					title: UI_TEXTS.VALIDATION_ERROR,
					message: paymentValidation.error || 'Некорректный ежемесячный платеж',
				});
				return;
			}
			paymentNum = paymentValidation.value;
		}
		const credit: Credit & { schedule?: CreditScheduleItem[] } = {
			id: editing?.id || generateShortId(),
			name: name.trim(),
			description: description.trim() || undefined,
			notes: notes.trim() || undefined,
			// ВАЖНО: startDate может быть пустой строкой, поэтому проверяем != null и != '', а не truthy
			// Сохраняем startDate только если он не пустой
			startDate: startDate && startDate.trim() !== '' ? startDate.trim() : undefined,
			// ВАЖНО: paymentDate может быть числом (1-31) в виде строки, поэтому проверяем != null и != '', а не truthy
			paymentDate: paymentDay != null && paymentDay.trim() !== '' ? paymentDay.trim() : undefined,
			scheduleType,
			status,
			amount: amountNum != null && !isNaN(amountNum) ? amountNum : undefined,
			// ФИКС: Всегда сохраняем interestRate = 0, если isInterestFree, иначе validRate
			interestRate: isInterestFree ? 0 : validRate,
			// ВАЖНО: termMonths должен быть > 0, поэтому проверяем != null, !isNaN и > 0
			// Используем termNum, если он валиден, иначе undefined
			termMonths: termNum != null && !isNaN(termNum) && termNum > 0 ? Math.round(Number(termNum)) : undefined,
			monthlyPayment: paymentNum != null && !isNaN(paymentNum) ? paymentNum : undefined,
			currentBalance: amountNum != null && !isNaN(amountNum) ? amountNum : undefined, // Будет пересчитан при сохранении
			inputMode, // Сохраняем режим расчета
			schedule: schedule.length > 0 ? schedule : undefined,
		};

		onSubmit(credit);
	};

	const handleAmountBlur = (e: React.FocusEvent<HTMLInputElement>) => {
		handleNumericInputBlur(e.target.value, setAmount);
	};

	const handleMonthlyPaymentBlur = (e: React.FocusEvent<HTMLInputElement>) => {
		handleNumericInputBlur(e.target.value, setMonthlyPayment);
	};

	if (!open) return null;

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
			<form onSubmit={handleSubmit} className="form-grid">
				{/* Базовые поля */}
				<label className="col-span">
					<span>Название кредита/кредитной карты</span>
					<TextInput value={name} onChange={(e) => setName((e.target as HTMLInputElement).value)} required />
				</label>

				<label className="col-span">
					<span>Описание</span>
					<TextInput value={description} onChange={(e) => setDescription((e.target as HTMLInputElement).value)} placeholder="Необязательно" />
				</label>

				<label>
					<span>Дата начала кредита</span>
					<TextInput
						type="date"
						value={startDate}
						onChange={(e) => setStartDate((e.target as HTMLInputElement).value)}
						required
					/>
				</label>

				<label>
					<span>Число месяца для платежа (1-31)</span>
					<TextInput
						type="number"
						inputMode="numeric"
						min="1"
						max="31"
						value={paymentDay}
						onChange={(e) => {
							const val = (e.target as HTMLInputElement).value;
							if (val === '' || (parseInt(val) >= 1 && parseInt(val) <= 31)) {
								setPaymentDay(val);
							}
						}}
						placeholder="Число месяца"
					/>
				</label>

				<label>
					<span>Тип графика</span>
					<Select value={scheduleType} onChange={(e) => setScheduleType(e.target.value as 'annuity' | 'differentiated')} size="sm">
						<option value="annuity">Аннуитетный</option>
						<option value="differentiated">Дифференцированный</option>
					</Select>
				</label>

				<label>
					<span>Статус</span>
					<Select value={status} onChange={(e) => setStatus(e.target.value as 'active' | 'archived')} size="sm">
						<option value="active">Активен</option>
						<option value="archived">Архив</option>
					</Select>
				</label>

				{/* Умный ввод */}
				<div className="col-span" style={{ marginTop: 'var(--space-md)', paddingTop: 'var(--space-md)', borderTop: 'var(--border-default)' }}>
					<h4 style={{ marginTop: 0, marginBottom: 'var(--space-md)', fontSize: 'var(--font-size-md)', fontWeight: 'var(--font-weight-semibold)' }}>
						Умный ввод параметров
					</h4>
					
					<SmartCreditForm
						mode={inputMode}
						onModeChange={(newMode) => {
							setInputMode(newMode);
							// Сбрасываем рассчитанные значения при изменении режима
							setCalculatedTerm(null);
							setCalculatedPayment(null);
						}}
						amount={amount}
						onAmountChange={setAmount}
						annualRate={annualRate}
						onAnnualRateChange={(value) => {
							// ВАЖНО: Не изменяем isInterestFree во время инициализации
							if (isInitializing) {
								setAnnualRate(value);
								return;
							}
							if (!isInterestFree) {
								setAnnualRate(value);
								// Если пользователь вводит '0', автоматически включаем тумблер
								if (value === '0' || value.trim() === '0') {
									setIsInterestFree(true);
								}
							}
						}}
						termMonths={termMonths}
						onTermMonthsChange={(val) => {
							// ФИКС: Сбрасываем calculatedTerm при ручном изменении срока
							// Это предотвращает ситуацию, когда calculatedTerm застрял в state
							// и может перезаписать ручной ввод
							setCalculatedTerm(null);
							setTermMonths(val);
						}}
						monthlyPayment={monthlyPayment}
						onMonthlyPaymentChange={(val) => {
							// ФИКС: Сбрасываем calculatedPayment при ручном изменении платежа
							// Это предотвращает ситуацию, когда calculatedPayment застрял в state
							setCalculatedPayment(null);
							setMonthlyPayment(val);
						}}
						isInterestFree={isInterestFree}
						onCalculationResult={(result) => {
							// Сохраняем рассчитанные значения для использования при построении графика
							if (result.type === 'term') {
								setCalculatedTerm(Math.ceil(result.value));
								// Автоматически обновляем поле termMonths
								setTermMonths(String(Math.ceil(result.value)));
							} else if (result.type === 'payment') {
								setCalculatedPayment(result.value);
							} else if (result.type === 'amount') {
								// Для режима "Ставка + Срок + Платеж -> Сумма" обновляем amount
								setAmount(String(result.value));
							}
						}}
						onInterestFreeChange={(checked) => {
							setIsInterestFree(checked);
							if (checked) {
								setAnnualRate('0');
							} else {
								// Если выключаем тумблер и ставка была '0', очищаем поле
								if (annualRate === '0') {
									setAnnualRate('');
								}
							}
						}}
					/>
				</div>

				{/* График платежей */}
				{schedule.length > 0 && (
					<div className="col-span" style={{ marginTop: 'var(--space-md)', paddingTop: 'var(--space-md)', borderTop: 'var(--border-default)' }}>
						<div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-md)' }}>
							<h4 style={{ margin: 0, fontSize: 'var(--font-size-md)', fontWeight: 'var(--font-weight-semibold)' }}>
								График платежей ({schedule.length} платежей)
							</h4>
							{editing && (
								<button
									type="button"
									onClick={async () => {
										const amountNum = parseNumberSafe(amount) ?? 0;
										const rateNum = isInterestFree ? 0 : (parseNumberSafe(annualRate) ?? 0);
										const termNum = parseNumberSafe(termMonths) ?? 0;
										if (amountNum > 0 && rateNum >= 0 && termNum > 0 && startDate) {
											try {
												const newSchedule = await buildCreditSchedule({
													scheduleType,
													amount: amountNum,
													annualRate: rateNum,
													termMonths: termNum,
													startDate,
													paymentDay: paymentDay ? parseInt(paymentDay) : undefined,
												});
												setSchedule(newSchedule);
												setShowSchedule(newSchedule.length > 0);
											} catch (error) {
												log.error('Failed to rebuild schedule', error);
											}
										}
									}}
									style={{
										padding: 'var(--space-xs) var(--space-sm)',
										fontSize: 'var(--font-size-sm)',
										background: 'var(--panel)',
										border: 'var(--border-default)',
										borderRadius: 'var(--radius-md)',
										cursor: 'pointer',
										color: 'var(--text)',
									}}
								>
									Перестроить график
								</button>
							)}
						</div>
						<CreditScheduleTable
							schedule={schedule}
							onPaymentToggle={async (itemId, paid, paidAmount) => {
								if (!editing?.id) return;
								
								try {
									// Обновляем schedule локально для немедленного отображения
									setSchedule((prev) => {
										if (!prev || prev.length === 0) return prev;
										return prev.map((item) => {
											if (!item || item.id !== itemId) return item;
											return {
												...item,
												paid,
												paidAmount: paid ? (paidAmount || item.plannedPayment) : undefined,
												paidAt: paid ? new Date().toISOString().split('T')[0] : undefined,
											};
										});
									});
									
									// Применяем изменения через IPC (если кредит уже сохранен)
									if (editing.id) {
										const { applyCreditPayment } = await import('@/shared/lib/electron-bridge');
										await applyCreditPayment({
											creditId: editing.id,
											itemId,
											paidAmount: paid ? paidAmount : undefined,
										});
									}
								} catch (error) {
									console.error('Failed to apply payment:', error);
									// Откатываем локальные изменения при ошибке
									setSchedule((prev) => {
										if (!prev || prev.length === 0) return prev;
										return prev.map((item) => {
											if (!item || item.id !== itemId) return item;
											return {
												...item,
												paid: !paid,
												paidAmount: !paid ? paidAmount : undefined,
												paidAt: !paid ? new Date().toISOString().split('T')[0] : undefined,
											};
										});
									});
								}
							}}
							viewMode={scheduleViewMode}
							onViewModeChange={setScheduleViewMode}
						/>
					</div>
				)}

				<label className="col-span">
					<span>Заметки</span>
					<NotesField rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} />
				</label>
			</form>
		</Modal>
	);
}

