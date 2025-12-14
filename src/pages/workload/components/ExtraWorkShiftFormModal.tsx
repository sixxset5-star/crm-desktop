import React, { useState, useEffect, useMemo } from 'react';
import type { ExtraWork, ExtraWorkPayment, PaymentMode, ExtraWorkPaymentFormData, ManualPaymentFormData } from '../types/extra-work.types';
import { Modal, ModalFooter } from '@/shared/ui/Modal';
import { TextInput, NotesField } from '@/shared/ui';
import { formatDateInput, toLocalDateKey } from '@/shared/lib/date';
import { MODAL_WIDTH_LG, EXTRA_WORK_FORM_TEXTAREA_ROWS } from '../utils/constants';
import { formatCurrencyRub } from '@/shared/lib/format';
import { serializeDates, serializeDate, generatePaymentId, extractDateKey, calculateTotalAmount } from '../utils/extraWorkUtils';
import { validateWorkDates, validateDailyRate, validatePayments } from '../utils/extraWork.validators';
import { parseNumberSafe } from '@/shared/utils/number-validation';
import { ExtraWorkShiftFormHeader } from './ExtraWorkShiftFormHeader';
import { ExtraWorkShiftDates } from './ExtraWorkShiftDates';
import { ExtraWorkShiftPaymentMode } from './ExtraWorkShiftPaymentMode';
import { ExtraWorkShiftPaymentList } from './ExtraWorkShiftPaymentList';
import IconButton from '@/shared/components/IconButton';
import { TrashIcon } from '@/shared/components/Icons';
import { useUIStore } from '@/store/ui';
import { UI_TEXTS } from '@/shared/constants/ui-texts';
import { createLogger } from '@/shared/lib/logger';

const log = createLogger('ExtraWorkShiftFormModal');

type ExtraWorkShiftFormModalProps = {
	open: boolean;
	initial?: ExtraWork | null;
	initialDates?: string[]; // Даты, выбранные в календаре
	onClose: () => void;
	onSave: (data: {
		workDates: string[];
		dailyRate: number;
		weekendRate?: number;
		payments: ExtraWorkPayment[];
		notes?: string;
	}) => void;
	onDelete?: () => void;
};

export function ExtraWorkShiftFormModal({
	open,
	initial,
	initialDates = [],
	onClose,
	onSave,
	onDelete,
}: ExtraWorkShiftFormModalProps): React.ReactElement | null {
	const [workDates, setWorkDates] = useState<string[]>(initialDates);
	const [dailyRate, setDailyRate] = useState(initial?.dailyRate ? String(initial.dailyRate) : '');
	// ВАЖНО: правильно инициализируем weekendRate - проверяем на undefined и null
	const [weekendRate, setWeekendRate] = useState(() => {
		if (initial?.weekendRate !== undefined && initial.weekendRate !== null) {
			return String(initial.weekendRate);
		}
		return '';
	});
	const [paymentMode, setPaymentMode] = useState<PaymentMode>('single');
	const [notes, setNotes] = useState(initial?.notes || '');

	// Оплаты в зависимости от режима
	const [singlePayment, setSinglePayment] = useState<ExtraWorkPaymentFormData>({
		date: formatDateInput(new Date()),
		amount: '',
		paid: false,
	});
	const [dailyPayments, setDailyPayments] = useState<Map<string, boolean>>(new Map());
	const [manualPayments, setManualPayments] = useState<ManualPaymentFormData[]>([]);

	// Отслеживаем, был ли изменен weekendRate пользователем
	const weekendRateChangedRef = React.useRef<{
		current: boolean;
		prevInitialId?: string;
	}>({ current: false });
	// Сохраняем последнее введенное пользователем значение weekendRate
	const lastUserWeekendRateRef = React.useRef<string | undefined>(undefined);
	
	useEffect(() => {
		if (initial) {
			setWorkDates(initial.workDates);
			setDailyRate(String(initial.dailyRate));
			// Обновляем weekendRate только если пользователь его не изменял
			// ВАЖНО: проверяем на undefined и null, чтобы правильно обработать случай, когда weekendRate не задан
			// КРИТИЧНО: Если weekendRateChangedRef.current.current === true, НЕ обновляем поле, чтобы не потерять введенное пользователем значение
			if (!weekendRateChangedRef.current.current) {
				// Если initial.weekendRate есть - используем его, иначе используем сохраненное пользовательское значение
				const weekendRateValue = initial.weekendRate !== undefined && initial.weekendRate !== null 
					? String(initial.weekendRate) 
					: (lastUserWeekendRateRef.current !== undefined ? lastUserWeekendRateRef.current : '');
				setWeekendRate(weekendRateValue);
			}
			setNotes(initial.notes || '');
			
			// Инициализируем оплаты
			if (initial.payments && initial.payments.length > 0) {
				// Определяем режим по оплатам
				if (initial.payments.length === 1 && initial.payments[0].amount === initial.totalAmount) {
					setPaymentMode('single');
					const paymentDate = initial.payments[0].date 
						? (toLocalDateKey(initial.payments[0].date) || formatDateInput(new Date()))
						: formatDateInput(new Date());
					setSinglePayment({
						date: paymentDate,
						amount: String(initial.payments[0].amount),
						paid: initial.payments[0].paid,
					});
				} else if (initial.payments.length === initial.workDates.length) {
					setPaymentMode('daily');
					const dailyMap = new Map<string, boolean>();
					initial.payments.forEach((p) => {
						const dateKey = extractDateKey(p.date);
						dailyMap.set(dateKey, p.paid);
					});
					setDailyPayments(dailyMap);
				} else {
					setPaymentMode('manual');
					setManualPayments(
						initial.payments.map((p) => {
							const paymentDate = p.date 
								? (toLocalDateKey(p.date) || formatDateInput(new Date()))
								: formatDateInput(new Date());
							return {
								id: p.id || generatePaymentId(),
								date: paymentDate,
								amount: String(p.amount),
								paid: p.paid,
							};
						})
					);
				}
			} else {
				setPaymentMode('single');
			}
		} else {
			setWorkDates(initialDates);
			setDailyRate('');
			setWeekendRate('');
			setNotes('');
			setPaymentMode('single');
			setSinglePayment({
				date: formatDateInput(new Date()),
				amount: '',
				paid: false,
			});
			setDailyPayments(new Map());
			setManualPayments([]);
			weekendRateChangedRef.current.current = false;
		}
		// Сбрасываем флаг при открытии модалки только если initial.id изменился
		// КРИТИЧНО: НЕ сбрасываем флаг при изменении initial.weekendRate, чтобы не потерять значение при обновлении страницы
		if (open && initial?.id) {
			// Сохраняем предыдущий id для отслеживания изменений
			const prevId = weekendRateChangedRef.current.prevInitialId;
			if (prevId !== initial.id) {
				// Сбрасываем флаг только при смене смены
				weekendRateChangedRef.current.current = false;
				lastUserWeekendRateRef.current = undefined;
				weekendRateChangedRef.current.prevInitialId = initial.id;
			}
		}
	}, [initial?.id, initial?.weekendRate, initialDates, open]);

	const totalAmount = useMemo(() => {
		const rate = parseNumberSafe(dailyRate) ?? 0;
		const weekendRateValue = weekendRate ? parseNumberSafe(weekendRate) ?? undefined : undefined;
		if (!weekendRateValue) {
			return workDates.length * rate;
		}
		return calculateTotalAmount(
			workDates,
			rate,
			weekendRateValue
		);
	}, [workDates, dailyRate, weekendRate]);

	// Автоматически заполняем сумму для единой оплаты
	useEffect(() => {
		if (paymentMode === 'single' && totalAmount > 0) {
			setSinglePayment((prev) => ({ ...prev, amount: String(totalAmount) }));
		}
	}, [totalAmount, paymentMode]);

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		
		// Валидация
		const datesValidation = validateWorkDates(workDates);
		if (!datesValidation.valid) {
			await useUIStore.getState().showAlert({
				title: UI_TEXTS.VALIDATION_ERROR,
				message: datesValidation.error,
			});
			return;
		}

		const rateValidation = validateDailyRate(dailyRate);
		if (!rateValidation.valid) {
			await useUIStore.getState().showAlert({
				title: UI_TEXTS.VALIDATION_ERROR,
				message: rateValidation.error,
			});
			return;
		}

		const rate = parseNumberSafe(dailyRate);
		if (rate === null || rate <= 0) {
			await useUIStore.getState().showAlert({
				title: UI_TEXTS.VALIDATION_ERROR,
				message: 'Некорректный оклад за смену',
			});
			return;
		}

		// Если поле пустое или невалидное, то undefined, иначе парсим число
		const weekendRateValue = weekendRate.trim() ? parseNumberSafe(weekendRate) ?? undefined : undefined;

		// Убеждаемся, что все даты в ISO формате
		// Обрабатываем ошибки сериализации дат с понятным сообщением
		let normalizedWorkDates: string[];
		try {
			normalizedWorkDates = serializeDates(workDates);
		} catch (error) {
			const errorMessage = error instanceof Error ? error.message : String(error);
			await useUIStore.getState().showAlert({
				title: UI_TEXTS.DATE_PROCESSING_ERROR,
				message: UI_TEXTS.DATE_PROCESSING_ERROR_MESSAGE(errorMessage),
			});
			return;
		}

		// Формируем оплаты в зависимости от режима
		// Обрабатываем ошибки сериализации дат в платежах
		let payments: ExtraWorkPayment[] = [];
		try {
			if (paymentMode === 'single') {
				if (singlePayment.date && singlePayment.amount) {
					const amountValue = parseNumberSafe(singlePayment.amount);
					if (amountValue === null || amountValue <= 0) {
						throw new Error(`Некорректная сумма оплаты: ${singlePayment.amount}`);
					}
					payments = [
						{
							id: generatePaymentId(),
							date: serializeDate(singlePayment.date),
							amount: amountValue,
							paid: singlePayment.paid,
						},
					];
				}
			} else if (paymentMode === 'daily') {
				payments = workDates.map((dateStr) => {
					const dateKey = extractDateKey(dateStr);
					return {
						id: generatePaymentId(),
						date: serializeDate(dateStr),
						amount: rate,
						paid: dailyPayments.get(dateKey) || false,
					};
				});
			} else if (paymentMode === 'manual') {
					payments = manualPayments
					.filter((p) => p.date && p.amount)
					.map((p) => {
						const amountValue = parseNumberSafe(p.amount);
						if (amountValue === null || amountValue <= 0) {
							throw new Error(`Некорректная сумма оплаты: ${p.amount}`);
						}
						return {
							id: p.id || generatePaymentId(),
							date: serializeDate(p.date),
							amount: amountValue,
							paid: p.paid,
						};
					});
			}
		} catch (error) {
			const errorMessage = error instanceof Error ? error.message : String(error);
			await useUIStore.getState().showAlert({
				title: UI_TEXTS.PAYMENT_PROCESSING_ERROR,
				message: UI_TEXTS.PAYMENT_PROCESSING_ERROR_MESSAGE(errorMessage),
			});
			return;
		}

		// Валидация оплат
		const paymentsValidation = validatePayments(payments);
		if (!paymentsValidation.valid) {
			await useUIStore.getState().showAlert({
				title: UI_TEXTS.VALIDATION_ERROR,
				message: paymentsValidation.error,
			});
			return;
		}

		const saveData: {
			workDates: string[];
			dailyRate: number;
			weekendRate?: number;
			payments: ExtraWorkPayment[];
			notes?: string;
		} = {
			workDates: normalizedWorkDates,
			dailyRate: rate,
			payments,
		};
		
		// ВСЕГДА передаем weekendRate при сохранении, чтобы гарантировать его сохранение
		// Если поле заполнено - передаем значение
		// Если поле пустое - передаем undefined (для новой смены) или undefined (для удаления в существующей)
		saveData.weekendRate = weekendRateValue;
		
		if (notes.trim()) {
			saveData.notes = notes.trim();
		}
		
		onSave(saveData);
	};

	const addManualPayment = () => {
		setManualPayments([
			...manualPayments,
			{
				id: generatePaymentId(),
				date: formatDateInput(new Date()),
				amount: '',
				paid: false,
			},
		]);
	};

	const removeManualPayment = (id: string) => {
		setManualPayments(manualPayments.filter((p) => p.id !== id));
	};

	if (!open) return null;

	return (
		<Modal
			open={open}
			onClose={onClose}
			title={initial ? 'Редактировать смену' : 'Создать смену'}
			width={MODAL_WIDTH_LG}
			footer={
				<div style={{ display: 'flex', gap: 'var(--space-sm)', justifyContent: 'space-between', width: '100%' }}>
					{initial && onDelete ? (
						<div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
							<IconButton
								icon={TrashIcon}
								title="Удалить смену"
								onClick={onDelete}
							/>
							<span style={{ 
								fontSize: 'var(--font-size-sm)', 
								color: 'var(--muted)' 
							}}>
								Удалить смену
							</span>
						</div>
					) : <div />}
					<div style={{ display: 'flex', gap: 'var(--space-sm)', marginLeft: 'auto' }}>
						<ModalFooter
							onCancel={onClose}
							onConfirm={() => handleSubmit({ preventDefault: () => {} } as React.FormEvent)}
							confirmText="Сохранить"
							cancelText="Отмена"
						/>
					</div>
				</div>
			}
		>
			<form onSubmit={handleSubmit} className="form-grid">
				<ExtraWorkShiftDates 
					workDates={workDates} 
					onRemoveDate={(dateStr) => {
						setWorkDates(workDates.filter(d => d !== dateStr));
					}}
				/>

				{/* Оклад за смену (будни) */}
				<label>
					<span>Оклад за смену (будни)</span>
					<TextInput
						mask="currency"
						type="text"
						inputMode="decimal"
						value={dailyRate}
						onChange={(e) => setDailyRate((e.target as HTMLInputElement).value)}
						placeholder="Например: 3 000"
						required
					/>
				</label>

				{/* Оклад за смену (выходные) */}
				<label>
					<span>Оклад за смену (выходные)</span>
					<TextInput
						mask="currency"
						type="text"
						inputMode="decimal"
						value={weekendRate}
						onChange={(e) => {
							const newValue = (e.target as HTMLInputElement).value;
							weekendRateChangedRef.current.current = true;
							lastUserWeekendRateRef.current = newValue;
							setWeekendRate(newValue);
						}}
						placeholder="Например: 4 500 (необязательно)"
					/>
				</label>

				<ExtraWorkShiftFormHeader 
					workDatesCount={workDates.length}
					dailyRate={dailyRate}
					weekendRate={weekendRate}
					totalAmount={totalAmount}
					workDates={workDates}
				/>

				<ExtraWorkShiftPaymentMode 
					paymentMode={paymentMode}
					onModeChange={setPaymentMode}
				/>

				<ExtraWorkShiftPaymentList
					paymentMode={paymentMode}
					workDates={workDates}
					dailyRate={dailyRate}
					singlePayment={singlePayment}
					dailyPayments={dailyPayments}
					manualPayments={manualPayments}
					onSinglePaymentChange={setSinglePayment}
					onDailyPaymentToggle={(dateKey, paid) => {
						setDailyPayments((prev) => {
							const next = new Map(prev);
							next.set(dateKey, paid);
							return next;
						});
					}}
					onManualPaymentsChange={setManualPayments}
					onAddManualPayment={addManualPayment}
					onRemoveManualPayment={removeManualPayment}
				/>

				{/* Заметки */}
				<label className="col-span">
					<span>Заметки</span>
					<NotesField
						value={notes}
						onChange={(e) => setNotes(e.target.value)}
						rows={EXTRA_WORK_FORM_TEXTAREA_ROWS}
					/>
				</label>
			</form>
		</Modal>
	);
}

