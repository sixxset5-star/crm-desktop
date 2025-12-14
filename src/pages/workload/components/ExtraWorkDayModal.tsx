import React, { useMemo } from 'react';
import type { ExtraWork } from '../types/extra-work.types';
import { Modal, ModalFooter } from '@/shared/ui/Modal';
import { Button } from '@/shared/ui';
import { formatDateWithSettings as formatDate, formatCurrencyRub } from '@/shared/lib/format';
import { getToken, getTokenString } from '@/shared/lib/tokens';
import { useUIStore } from '@/store/ui';
import { UI_TEXTS } from '@/shared/constants/ui-texts';
import { MODAL_WIDTH_LG } from '../utils/constants';
import { getPaidAmount, isFullyPaid, getPaidPercent, getPaymentStatus, getDateKeyFromDate } from '../utils/extraWorkUtils';
import { getPaymentStatusColor, getPaymentStatusBgColor } from '../utils/extraWorkRenderUtils';

type ExtraWorkDayModalProps = {
	open: boolean;
	date: Date | null;
	works: ExtraWork[];
	onClose: () => void;
	onEditWork: (work: ExtraWork) => void;
	onDeleteWork: (id: string) => void;
};

export function ExtraWorkDayModal({
	open,
	date,
	works,
	onClose,
	onEditWork,
	onDeleteWork,
}: ExtraWorkDayModalProps): React.ReactElement | null {
	const colorError = useMemo(() => getTokenString('--color-error', 'var(--red)'), []);
	const showConfirm = useUIStore((s) => s.showConfirm);
	
	if (!open || !date || works.length === 0) return null;

	const handleDeleteWork = async (workId: string) => {
		const confirmed = await showConfirm({
			message: UI_TEXTS.DELETE_SHIFT,
			variant: 'danger',
			title: UI_TEXTS.DELETE_SHIFT_TITLE,
			confirmText: UI_TEXTS.DELETE,
			cancelText: UI_TEXTS.CANCEL,
		});
		if (confirmed) {
			onDeleteWork(workId);
			onClose();
		}
	};

	const dateStr = formatDate(getDateKeyFromDate(date));

	return (
		<Modal
			open={open}
			onClose={onClose}
			title={`Доп работа за ${dateStr}`}
			width={MODAL_WIDTH_LG}
			footer={
				<ModalFooter
					onCancel={onClose}
					onConfirm={onClose}
					confirmText="Закрыть"
					cancelText="Отмена"
				/>
			}
		>
			<div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
				{works.map((work) => {
					const paidAmount = getPaidAmount(work);
					const workIsFullyPaid = isFullyPaid(work);
					const paidPercent = getPaidPercent(work);
					const paymentStatus = getPaymentStatus(work);
					
					// Определяем, является ли выбранный день выходным
					const isWeekend = date && (date.getDay() === 0 || date.getDay() === 6);
					// Используем weekendRate для выходных, если он указан, иначе dailyRate
					const displayRate = isWeekend && work.weekendRate !== undefined ? work.weekendRate : work.dailyRate;

					return (
						<div
							key={work.id}
							style={{
								padding: 'var(--space-md)',
								background: 'var(--panel)',
								border: 'var(--border-default)',
								borderRadius: 'var(--radius-md)',
							}}
						>
							<div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 'var(--space-sm)' }}>
								<div>
									<div style={{ fontWeight: 'var(--font-weight-semibold)', marginBottom: 'var(--space-xs)' }}>
										{work.workDates.length} {work.workDates.length === 1 ? 'день' : 'дней'} работы
									</div>
									<div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--muted)', marginBottom: 'var(--space-xs)' }}>
										Оклад: {formatCurrencyRub(displayRate)} за смену {isWeekend && work.weekendRate !== undefined ? '(выходной)' : '(будни)'}
									</div>
									<div style={{ fontSize: 'var(--font-size-lg)', fontWeight: 'var(--font-weight-semibold)', color: 'var(--accent)' }}>
										Итого: {formatCurrencyRub(work.totalAmount)}
									</div>
								</div>
								<div style={{ display: 'flex', gap: 'var(--space-xs)' }}>
									<Button
										variant="secondary"
										size="sm"
										onClick={() => {
											onEditWork(work);
											onClose();
										}}
									>
										Редактировать
									</Button>
									<Button
										variant="secondary"
										size="sm"
										onClick={() => handleDeleteWork(work.id)}
										style={{ color: colorError, borderColor: colorError }}
									>
										Удалить
									</Button>
								</div>
							</div>

							{/* Статус оплаты */}
							<div style={{
								padding: 'var(--space-sm)',
								background: getPaymentStatusBgColor(paidPercent, workIsFullyPaid),
								borderRadius: 'var(--radius-sm)',
								marginBottom: 'var(--space-sm)',
							}}>
								<div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
									<span style={{ fontSize: 'var(--font-size-sm)', fontWeight: 'var(--font-weight-semibold)' }}>
										Статус оплаты:
									</span>
									<span style={{
										fontSize: 'var(--font-size-sm)',
										fontWeight: 'var(--font-weight-semibold)',
										color: getPaymentStatusColor(paidPercent, workIsFullyPaid),
									}}>
										{paymentStatus}
									</span>
								</div>
								<div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 'var(--space-xs)' }}>
									<span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--muted)' }}>
										Оплачено: {formatCurrencyRub(paidAmount)} из {formatCurrencyRub(work.totalAmount)}
									</span>
									{!workIsFullyPaid && (
										<span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--muted)' }}>
											Осталось: {formatCurrencyRub(work.totalAmount - paidAmount)}
										</span>
									)}
								</div>
							</div>

							{/* Даты работы */}
							<div style={{ marginBottom: 'var(--space-sm)' }}>
								<div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--muted)', marginBottom: 'var(--space-xs)' }}>
									Даты работы:
								</div>
								<div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-xs)' }}>
									{work.workDates.map((dateStr) => (
										<span
											key={dateStr}
											style={{
												padding: 'var(--space-xs) var(--space-xs)',
												background: 'var(--bg)',
												border: 'var(--border-default)',
												borderRadius: 'var(--radius-sm)',
												fontSize: 'var(--font-size-xs)',
											}}
										>
											{formatDate(dateStr)}
										</span>
									))}
								</div>
							</div>

							{/* Оплаты */}
							{work.payments.length > 0 && (
								<div>
									<div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--muted)', marginBottom: 'var(--space-xs)' }}>
										Оплаты ({work.payments.length}):
									</div>
									<div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-xs)' }}>
										{work.payments.map((payment) => (
											<div
												key={payment.id}
												style={{
													display: 'flex',
													justifyContent: 'space-between',
													alignItems: 'center',
													padding: 'var(--space-xs) var(--space-sm)',
													background: payment.paid ? getPaymentStatusBgColor(100, true) : 'var(--bg)',
													border: 'var(--border-default)',
													borderRadius: 'var(--radius-sm)',
												}}
											>
												<span style={{ fontSize: 'var(--font-size-sm)' }}>
													{formatDate(payment.date)} - {formatCurrencyRub(payment.amount)}
												</span>
												{payment.paid && (
													<span style={{
														fontSize: 'var(--font-size-xs)',
														color: getPaymentStatusColor(100, true),
														fontWeight: 'var(--font-weight-semibold)',
													}}>
														✓ Оплачено
													</span>
												)}
											</div>
										))}
									</div>
								</div>
							)}

							{/* Заметки */}
							{work.notes && (
								<div>
									<div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--muted)', marginBottom: 'var(--space-xs)' }}>
										Заметки:
									</div>
									<div style={{
										padding: 'var(--space-sm)',
										background: 'var(--bg)',
										border: 'var(--border-default)',
										borderRadius: 'var(--radius-sm)',
										fontSize: 'var(--font-size-sm)',
										color: 'var(--text)',
									}}>
										{work.notes}
									</div>
								</div>
							)}
						</div>
					);
				})}
			</div>
		</Modal>
	);
}

