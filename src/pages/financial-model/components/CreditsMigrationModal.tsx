/**
 * Модальное окно для миграции старых кредитов в новый формат
 */
import React, { useState } from 'react';
import type { Credit } from '@/store/goals';
import { Modal, ModalFooter } from '@/shared/ui/Modal';
import { formatCurrencyRub } from '@/shared/lib/format';
import { useCreditsStore } from '@/store/credits';
import { useUIStore } from '@/store/ui';
import { UI_TEXTS } from '@/shared/constants/ui-texts';
import styles from './CreditsMigrationModal.module.css';

type CreditsMigrationModalProps = {
	open: boolean;
	credits: Credit[];
	onClose: () => void;
	onMigrated: () => void;
};

export function CreditsMigrationModal({
	open,
	credits,
	onClose,
	onMigrated,
}: CreditsMigrationModalProps): React.ReactElement {
	const [isMigrating, setIsMigrating] = useState(false);
	const [migrationProgress, setMigrationProgress] = useState<{ current: number; total: number } | null>(null);
	const loadCredits = useCreditsStore((s) => s.loadCredits);

	const handleMigrateAll = async () => {
		setIsMigrating(true);
		setMigrationProgress({ current: 0, total: credits.length });
		
		try {
			// Мигрируем кредиты по одному, чтобы показать прогресс
			const success: typeof credits = [];
			const failed: Array<{ credit: Credit; error: string }> = [];
			
			for (let i = 0; i < credits.length; i++) {
				const credit = credits[i];
				setMigrationProgress({ current: i + 1, total: credits.length });
				
				try {
					// Если кредит уже в БД - используем migrateCredit
					// Если нет - сохраняем через saveCredit (он автоматически построит график)
					const { saveCreditToDisk } = await import('@/shared/lib/electron-bridge');
					
					// Подготавливаем кредит для сохранения
					const creditToSave: Credit = {
						...credit,
						id: credit.id,
						name: credit.name,
						amount: credit.amount,
						interestRate: credit.interestRate,
						monthlyPayment: credit.monthlyPayment,
						termMonths: credit.termMonths,
						startDate: credit.startDate || new Date().toISOString().split('T')[0],
						scheduleType: credit.scheduleType || 'annuity',
						status: credit.status || 'active',
						notes: credit.notes,
						paymentDate: credit.paymentDate,
					};
					
					await saveCreditToDisk(creditToSave);
					success.push(credit);
				} catch (error) {
					failed.push({
						credit,
						error: error instanceof Error ? error.message : String(error),
					});
				}
			}
			
			// Перезагружаем кредиты (принудительно)
			await loadCredits(true);
			
			onMigrated();
			
			if (failed.length > 0) {
				await useUIStore.getState().showAlert({
					title: UI_TEXTS.MIGRATION_COMPLETE,
					message: UI_TEXTS.MIGRATION_RESULT(success.length, failed.length),
				});
			} else {
				await useUIStore.getState().showAlert({
					title: UI_TEXTS.SUCCESS,
					message: UI_TEXTS.MIGRATION_SUCCESS(success.length),
				});
			}
			
			onClose();
		} catch (error) {
			log.error('Migration failed', error);
			const errorMessage = error instanceof Error ? error.message : String(error);
			await useUIStore.getState().showAlert({
				title: UI_TEXTS.MIGRATION_ERROR,
				message: UI_TEXTS.MIGRATION_ERROR_MESSAGE(errorMessage),
			});
		} finally {
			setIsMigrating(false);
			setMigrationProgress(null);
		}
	};

	if (!open) return null;

	return (
		<Modal
			open={open}
			onClose={onClose}
			title="Обновление кредитов"
			width={600}
			footer={
				<ModalFooter
					onCancel={onClose}
					onConfirm={handleMigrateAll}
					confirmText={isMigrating ? 'Обновление...' : 'Обновить все кредиты'}
					cancelText="Позже"
					confirmDisabled={isMigrating}
				/>
			}
		>
			<div className={styles.container}>
				<div className={styles.message}>
					<p>
						У вас есть <strong>{credits.length}</strong> кредит{credits.length === 1 ? '' : credits.length < 5 ? 'а' : 'ов'}, которые нужно обновить под новые правила.
					</p>
					<p>
						При обновлении будут построены графики платежей и добавлены недостающие поля. Это безопасно и не удалит ваши данные.
					</p>
				</div>

				<div className={styles.creditsList}>
					<h4 className={styles.listTitle}>Кредиты для обновления:</h4>
					{credits.map((credit) => (
						<div key={credit.id} className={styles.creditItem}>
							<div className={styles.creditName}>{credit.name}</div>
							<div className={styles.creditDetails}>
								{credit.amount && (
									<span className={styles.detail}>
										Сумма: {formatCurrencyRub(credit.amount)}
									</span>
								)}
								{credit.monthlyPayment && (
									<span className={styles.detail}>
										Платеж: {formatCurrencyRub(credit.monthlyPayment)}
									</span>
								)}
								{credit.interestRate && (
									<span className={styles.detail}>
										Ставка: {credit.interestRate}%
									</span>
								)}
								{credit.termMonths && (
									<span className={styles.detail}>
										Срок: {credit.termMonths} мес.
									</span>
								)}
								{!credit.amount || !credit.interestRate || !credit.termMonths ? (
									<span className={styles.warning}>
										⚠️ Недостаточно данных для автоматического построения графика
									</span>
								) : (
									<span className={styles.success}>
										✅ Можно построить график автоматически
									</span>
								)}
							</div>
						</div>
					))}
				</div>

				{migrationProgress && (
					<div className={styles.progress}>
						Обновление: {migrationProgress.current} из {migrationProgress.total}...
					</div>
				)}
			</div>
		</Modal>
	);
}

