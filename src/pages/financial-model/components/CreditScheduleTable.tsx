/**
 * Компонент таблицы графика платежей по кредиту
 * Отображает помесячный график с возможностью отмечать платежи как оплаченные
 */
import React, { useState } from 'react';
import type { CreditScheduleItem } from '@/store/goals';
import { formatCurrencyRub, formatDateWithSettings } from '@/shared/lib/format';
import { Checkbox } from '@/shared/ui';
import { parseNumberSafe } from '@/shared/utils/number-validation';
import tableStyles from '@/shared/ui/Table.module.css';
import styles from './CreditScheduleTable.module.css';

type CreditScheduleTableProps = {
	schedule: CreditScheduleItem[];
	onPaymentToggle: (itemId: string, paid: boolean, paidAmount?: number) => void;
	viewMode?: 'table' | 'chart';
	onViewModeChange?: (mode: 'table' | 'chart') => void;
};

export function CreditScheduleTable({
	schedule,
	onPaymentToggle,
	viewMode = 'table',
	onViewModeChange,
}: CreditScheduleTableProps): React.ReactElement {
	const [editingPaidAmount, setEditingPaidAmount] = useState<{ itemId: string; value: string } | null>(null);

	const handleCheckboxChange = (item: CreditScheduleItem, checked: boolean) => {
		if (checked) {
			// При установке галочки используем плановый платеж по умолчанию
			onPaymentToggle(item.id, true, item.plannedPayment);
		} else {
			// При снятии галочки откатываем оплату
			onPaymentToggle(item.id, false);
		}
	};

	const handlePaidAmountEdit = (item: CreditScheduleItem) => {
		setEditingPaidAmount({
			itemId: item.id,
			value: String(item.paidAmount || item.plannedPayment),
		});
	};

	const handlePaidAmountSave = (item: CreditScheduleItem) => {
		if (editingPaidAmount) {
			const amount = parseNumberSafe(editingPaidAmount.value);
			if (amount !== null && amount > 0) {
				onPaymentToggle(item.id, true, amount);
			}
			setEditingPaidAmount(null);
		}
	};

	const isOverdue = (item: CreditScheduleItem) => {
		if (item.paid) return false;
		const paymentDate = new Date(item.paymentDate);
		const now = new Date();
		now.setHours(0, 0, 0, 0);
		return paymentDate < now;
	};

	if (viewMode === 'chart') {
		// Простой график на основе данных schedule
		// TODO: Реализовать полноценный компонент CreditScheduleChart
		if (!schedule || schedule.length === 0) {
			return (
				<div>
					{onViewModeChange && (
						<div className={styles.viewModeToggle}>
							<button
								type="button"
								onClick={() => onViewModeChange('table')}
								className={`${styles.viewModeButton} ${styles.viewModeButtonActive}`}
							>
								Таблица
							</button>
							<button
								type="button"
								onClick={() => onViewModeChange('chart')}
								className={`${styles.viewModeButton} ${styles.viewModeButtonActive}`}
							>
								График
							</button>
						</div>
					)}
					<div className={tableStyles.empty}>
						График платежей пуст. Постройте график для кредита.
					</div>
				</div>
			);
		}

		const maxPayment = Math.max(...schedule.map(i => i.plannedPayment));
		
		return (
			<div>
				{onViewModeChange && (
					<div className={styles.viewModeToggle}>
						<button
							type="button"
							onClick={() => onViewModeChange('table')}
							className={`${styles.viewModeButton} ${viewMode === 'table' ? styles.viewModeButtonActive : styles.viewModeButtonInactive}`}
						>
							Таблица
						</button>
						<button
							type="button"
							onClick={() => onViewModeChange('chart')}
							className={`${styles.viewModeButton} ${viewMode === 'chart' ? styles.viewModeButtonActive : styles.viewModeButtonInactive}`}
						>
							График
						</button>
					</div>
				)}
				<div style={{ padding: 'var(--space-lg)' }}>
					<div style={{ 
						display: 'flex', 
						flexDirection: 'column', 
						gap: 'var(--space-md)',
						alignItems: 'center',
						justifyContent: 'center',
						minHeight: '200px',
						color: 'var(--text-secondary)',
					}}>
						<p style={{ margin: 0, fontSize: 'var(--font-size-md)' }}>
							График платежей
						</p>
						<div style={{ 
							display: 'flex', 
							flexDirection: 'row', 
							alignItems: 'flex-end',
							gap: 'var(--space-xs)',
							width: '100%',
							maxWidth: '800px',
							height: '300px',
							padding: 'var(--space-md)',
							border: '1px solid var(--border)',
							borderRadius: 'var(--radius-md)',
							background: 'var(--panel)',
						}}>
							{schedule.map((item) => {
								const height = maxPayment > 0 ? (item.plannedPayment / maxPayment) * 100 : 0;
								const isPaid = item.paid;
								
								return (
									<div
										key={item.id}
										style={{
											flex: 1,
											display: 'flex',
											flexDirection: 'column',
											alignItems: 'center',
											justifyContent: 'flex-end',
											gap: 'var(--space-xs)',
											minWidth: '20px',
										}}
										title={`${item.monthNumber}. ${formatDateWithSettings(item.paymentDate)}: ${formatCurrencyRub(item.plannedPayment)}`}
									>
										<div
											style={{
												width: '100%',
												height: `${height}%`,
												background: isPaid ? 'var(--green)' : 'var(--primary)',
												borderRadius: 'var(--radius-sm) var(--radius-sm) 0 0',
												minHeight: height > 0 ? '4px' : '0',
												transition: 'all 0.2s',
												cursor: 'pointer',
												opacity: height > 0 ? 1 : 0.3,
											}}
										/>
										<span style={{ 
											fontSize: 'var(--font-size-xs)', 
											color: 'var(--text-secondary)',
											transform: 'rotate(-45deg)',
											transformOrigin: 'center',
											whiteSpace: 'nowrap',
										}}>
											{item.monthNumber}
										</span>
									</div>
								);
							})}
						</div>
						<p style={{ margin: 0, fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)' }}>
							Зеленые столбцы — оплаченные платежи
						</p>
					</div>
				</div>
			</div>
		);
	}

	if (!schedule || schedule.length === 0) {
		return (
			<div className={tableStyles.empty}>
				График платежей пуст. Постройте график для кредита.
			</div>
		);
	}

	return (
		<div>
			{onViewModeChange && (
				<div className={styles.viewModeToggle}>
					<button
						type="button"
						onClick={() => onViewModeChange('table')}
						className={`${styles.viewModeButton} ${viewMode === 'table' ? styles.viewModeButtonActive : styles.viewModeButtonInactive}`}
					>
						Таблица
					</button>
					<button
						type="button"
						onClick={() => onViewModeChange('chart')}
						className={`${styles.viewModeButton} ${viewMode === 'chart' ? styles.viewModeButtonActive : styles.viewModeButtonInactive}`}
					>
						График
					</button>
				</div>
			)}

			<div className={styles.tableContainer}>
				<table className={tableStyles.table}>
					<thead className={tableStyles.thead} style={{ position: 'sticky', top: 0, background: 'var(--bg)', zIndex: 1 }}>
						<tr>
							<th className={tableStyles.th} style={{ width: '40px' }}>№</th>
							<th className={tableStyles.th}>Дата платежа</th>
							<th className={tableStyles.th} style={{ textAlign: 'right' }}>Платеж</th>
							<th className={tableStyles.th} style={{ textAlign: 'right' }}>Проценты</th>
							<th className={tableStyles.th} style={{ textAlign: 'right' }}>Тело</th>
							<th className={tableStyles.th} style={{ textAlign: 'right' }}>Остаток</th>
							<th className={tableStyles.th} style={{ width: '100px', textAlign: 'center' }}>Оплачено</th>
							<th className={tableStyles.th} style={{ textAlign: 'right' }}>Факт. сумма</th>
						</tr>
					</thead>
					<tbody className={tableStyles.tbody}>
						{schedule.map((item) => {
							if (!item) return null;
							const overdue = isOverdue(item);
							const isEditing = editingPaidAmount?.itemId === item.id;

							return (
								<tr
									key={item.id}
									className={`${item.paid ? styles.paidRow : ''} ${overdue ? styles.overdueRow : ''}`}
								>
									<td className={tableStyles.td} style={{ textAlign: 'center' }}>
										{item.monthNumber}
									</td>
									<td className={tableStyles.td}>
										{formatDateWithSettings(item.paymentDate)}
										{overdue && (
											<span className={styles.overdueLabel}>
												(просрочено)
											</span>
										)}
									</td>
									<td className={tableStyles.td} style={{ textAlign: 'right', fontFamily: 'monospace' }}>
										{formatCurrencyRub(item.plannedPayment)}
									</td>
									<td className={tableStyles.td} style={{ textAlign: 'right', fontFamily: 'monospace', color: 'var(--muted)' }}>
										{formatCurrencyRub(item.interestPart)}
									</td>
									<td className={tableStyles.td} style={{ textAlign: 'right', fontFamily: 'monospace', color: 'var(--green)' }}>
										{formatCurrencyRub(item.principalPart)}
									</td>
									<td className={tableStyles.td} style={{ textAlign: 'right', fontFamily: 'monospace', fontWeight: 'var(--font-weight-semibold)' }}>
										{formatCurrencyRub(item.remainingBalance)}
									</td>
									<td className={tableStyles.td} style={{ textAlign: 'center' }}>
										<Checkbox
											checked={item.paid}
											onChange={(e) => handleCheckboxChange(item, (e.target as HTMLInputElement).checked)}
											title={item.paid ? 'Снять отметку об оплате' : 'Отметить как оплаченное'}
										/>
									</td>
									<td className={tableStyles.td} style={{ textAlign: 'right' }}>
										{item.paid ? (
											isEditing && editingPaidAmount ? (
												<div className={styles.paidAmountContainer}>
													<input
														type="number"
														value={editingPaidAmount.value}
														onChange={(e) => {
															if (editingPaidAmount) {
																setEditingPaidAmount({ ...editingPaidAmount, value: e.target.value });
															}
														}}
														onBlur={() => handlePaidAmountSave(item)}
														onKeyDown={(e) => {
															if (e.key === 'Enter') {
																handlePaidAmountSave(item);
															} else if (e.key === 'Escape') {
																setEditingPaidAmount(null);
															}
														}}
														className={styles.paidAmountInput}
														autoFocus
													/>
												</div>
											) : (
												<div className={styles.paidAmountContainer}>
													<span style={{ fontFamily: 'monospace', color: 'var(--green)' }}>
														{formatCurrencyRub(item.paidAmount || item.plannedPayment)}
													</span>
													{item.paidAmount !== item.plannedPayment && (
														<button
															type="button"
															onClick={() => handlePaidAmountEdit(item)}
															className={styles.paidAmountEditButton}
															title="Изменить сумму"
														>
															✎
														</button>
													)}
												</div>
											)
										) : (
											<span style={{ color: 'var(--muted)', fontSize: 'var(--font-size-xs)' }}>—</span>
										)}
									</td>
								</tr>
							);
						})}
					</tbody>
				</table>
			</div>
		</div>
	);
}

