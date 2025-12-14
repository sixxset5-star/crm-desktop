/**
 * Улучшенная карточка кредита с информацией о графике и остатке
 */
import React from 'react';
import type { Credit, CreditScheduleItem } from '@/store/goals';
import { formatCurrencyRub, formatDateWithSettings } from '@/shared/lib/format';
import { EditIcon, TrashIcon } from '@/shared/components/Icons';
import IconButton from '@/shared/components/IconButton';
import { CreditField } from './CreditField';
import styles from './EnhancedCreditCard.module.css';
import { UI_TEXTS } from '@/shared/constants/ui-texts';

type EnhancedCreditCardProps = {
	credit: Credit & { schedule?: CreditScheduleItem[] };
	onEdit: (credit: Credit & { schedule?: CreditScheduleItem[] }) => void;
	onDelete: (id: string) => void;
	onViewSchedule?: (creditId: string) => void;
};

export function EnhancedCreditCard({ credit, onEdit, onDelete, onViewSchedule }: EnhancedCreditCardProps): React.ReactElement {
	const isActive = credit.status === 'active';
	const hasSchedule = credit.schedule && credit.schedule.length > 0;
	
	// Находим ближайший неоплаченный платеж
	const nextPayment = hasSchedule
		? credit.schedule.find((item) => !item.paid)
		: null;

	// Количество оплаченных платежей
	const paidCount = hasSchedule ? credit.schedule.filter((item) => item.paid).length : 0;
	const totalCount = hasSchedule ? credit.schedule.length : 0;

	// Форматируем дату следующего платежа безопасно
	const formatNextPaymentDate = (paymentDate?: string): string => {
		if (!paymentDate) return '';
		const date = new Date(paymentDate);
		if (isNaN(date.getTime())) return '';
		return formatDateWithSettings(paymentDate);
	};

	// Форматированная дата следующего платежа (вычисляем один раз)
	const nextPaymentDateFormatted = nextPayment ? formatNextPaymentDate(nextPayment.paymentDate) : '';

	return (
		<div className={`${styles.card} ${!isActive ? styles.archived : ''}`}>
			<div className={styles.header}>
				<div className={styles.titleSection}>
					<h3 className={styles.title}>{credit.name}</h3>
					{credit.status === 'archived' && (
						<span className={styles.archiveBadge}>Архив</span>
					)}
				</div>
				<div className={styles.actions}>
					{onViewSchedule && hasSchedule && (
						<button
							type="button"
							onClick={() => onViewSchedule(credit.id)}
							className={styles.scheduleButton}
							title="Показать график платежей"
						>
							График
						</button>
					)}
					<IconButton onClick={() => onEdit(credit)} title={UI_TEXTS.EDIT} icon={EditIcon} type="edit" />
					<IconButton onClick={() => onDelete(credit.id)} title={UI_TEXTS.DELETE} icon={TrashIcon} type="delete" />
				</div>
			</div>

			<div className={styles.fieldsGrid}>
				{credit.amount && (
					<CreditField label="Сумма кредита" value={formatCurrencyRub(credit.amount)} valueColor="var(--red)" />
				)}
				{credit.currentBalance !== undefined && (
					<CreditField
						label="Текущий остаток"
						value={formatCurrencyRub(credit.currentBalance)}
						valueColor={credit.currentBalance > 0 ? 'var(--red)' : 'var(--green)'}
					/>
				)}
				{credit.monthlyPayment && (
					<CreditField label="Ежемесячный платеж" value={formatCurrencyRub(credit.monthlyPayment)} />
				)}
				{credit.interestRate !== undefined && credit.interestRate !== null && (
					<CreditField 
						label="Процентная ставка" 
						value={credit.interestRate === 0 ? 'Без процентов' : `${credit.interestRate}%`} 
					/>
				)}
				{credit.termMonths && (
					<CreditField label="Срок" value={`${credit.termMonths} мес.`} />
				)}
				{credit.scheduleType && (
					<CreditField
						label="Тип графика"
						value={credit.scheduleType === 'annuity' ? 'Аннуитетный' : 'Дифференцированный'}
					/>
				)}
			</div>

			{hasSchedule && (
				<div className={styles.scheduleInfo}>
					<div className={styles.scheduleProgress}>
						<span className={styles.scheduleLabel}>
							Оплачено: {paidCount} из {totalCount}
						</span>
						<div className={styles.progressBar}>
							<div
								className={styles.progressFill}
								style={{ width: `${(paidCount / totalCount) * 100}%` }}
							/>
						</div>
					</div>
					{nextPayment && (
						<div className={styles.nextPayment}>
							<span className={styles.nextPaymentLabel}>Ближайший платеж:</span>
							<span className={styles.nextPaymentValue}>
								{formatCurrencyRub(nextPayment.plannedPayment)}
								{nextPaymentDateFormatted && ` (${nextPaymentDateFormatted})`}
							</span>
						</div>
					)}
				</div>
			)}

			{credit.description && (
				<div className={styles.description}>{credit.description}</div>
			)}

			{credit.notes && (
				<div className={styles.notes}>{credit.notes}</div>
			)}
		</div>
	);
}

