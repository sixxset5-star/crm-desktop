/**
 * Компонент напоминаний о предстоящих платежах по кредитам
 */
import React from 'react';
import { formatCurrencyRub, formatDateWithSettings } from '@/shared/lib/format';
import styles from './CreditReminders.module.css';

type UpcomingPayment = {
	creditId: string;
	creditName: string;
	paymentDate: string;
	amount: number;
	monthNumber: number;
};

type CreditRemindersProps = {
	payments: UpcomingPayment[];
	onCreditClick?: (creditId: string) => void;
};

export function CreditReminders({ payments, onCreditClick }: CreditRemindersProps): React.ReactElement {
	if (!payments || payments.length === 0) {
		return null;
	}

	const now = new Date();
	now.setHours(0, 0, 0, 0);

	// Разделяем на просроченные и предстоящие
	const overdue = payments.filter((p) => {
		const paymentDate = new Date(p.paymentDate);
		paymentDate.setHours(0, 0, 0, 0);
		return paymentDate < now;
	});

	const upcoming = payments.filter((p) => {
		const paymentDate = new Date(p.paymentDate);
		paymentDate.setHours(0, 0, 0, 0);
		return paymentDate >= now;
	});

	return (
		<div className={styles.container}>
			<h3 className={styles.title}>Напоминания о платежах</h3>

			{overdue.length > 0 && (
				<div className={styles.section}>
					<h4 className={styles.sectionTitle}>⚠️ Просроченные платежи</h4>
					<div className={styles.list}>
						{overdue.map((payment) => {
							const paymentDate = new Date(payment.paymentDate);
							const daysOverdue = Math.floor((now.getTime() - paymentDate.getTime()) / (1000 * 60 * 60 * 24));

							return (
								<div
									key={`${payment.creditId}-${payment.monthNumber}`}
									className={`${styles.item} ${styles.overdue}`}
									onClick={() => onCreditClick?.(payment.creditId)}
								>
									<div className={styles.itemHeader}>
										<span className={styles.creditName}>{payment.creditName}</span>
										<span className={styles.amount}>{formatCurrencyRub(payment.amount)}</span>
									</div>
									<div className={styles.itemDetails}>
										<span className={styles.date}>
											{formatDateWithSettings(payment.paymentDate)} ({daysOverdue} дн. назад)
										</span>
									</div>
								</div>
							);
						})}
					</div>
				</div>
			)}

			{upcoming.length > 0 && (
				<div className={styles.section}>
					<h4 className={styles.sectionTitle}>📅 Предстоящие платежи</h4>
					<div className={styles.list}>
						{upcoming.map((payment) => {
							const paymentDate = new Date(payment.paymentDate);
							const daysUntil = Math.floor((paymentDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

							return (
								<div
									key={`${payment.creditId}-${payment.monthNumber}`}
									className={styles.item}
									onClick={() => onCreditClick?.(payment.creditId)}
								>
									<div className={styles.itemHeader}>
										<span className={styles.creditName}>{payment.creditName}</span>
										<span className={styles.amount}>{formatCurrencyRub(payment.amount)}</span>
									</div>
									<div className={styles.itemDetails}>
										<span className={styles.date}>
											{formatDateWithSettings(payment.paymentDate)} (через {daysUntil} {daysUntil === 1 ? 'день' : daysUntil < 5 ? 'дня' : 'дней'})
										</span>
									</div>
								</div>
							);
						})}
					</div>
				</div>
			)}
		</div>
	);
}

