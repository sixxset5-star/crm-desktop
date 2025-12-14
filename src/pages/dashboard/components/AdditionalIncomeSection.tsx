import React from 'react';
import type { Income } from '@/store/income';
import { Button } from '@/shared/ui';
import { formatCurrencyRub, formatDateWithSettings as formatDate } from '@/shared/lib/format';
import IconButton from '@/shared/components/IconButton';
import { TrashIcon, EditIcon } from '@/shared/components/Icons';

type AdditionalIncomeSectionProps = {
	incomes: Income[];
	onAddIncome: () => void;
	onEditIncome: (income: Income) => void;
	onDeleteIncome: (income: Income) => void | Promise<void>;
};

export function AdditionalIncomeSection({
	incomes,
	onAddIncome,
	onEditIncome,
	onDeleteIncome,
}: AdditionalIncomeSectionProps): React.ReactElement | null {
	const now = new Date();
	const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
	const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

	const currentMonthIncomes = incomes.filter((income) => {
		if (!income.date) return false;
		const incomeDate = new Date(income.date);
		return incomeDate >= monthStart && incomeDate <= monthEnd;
	});

	if (currentMonthIncomes.length === 0) {
		return null;
	}

	return (
		<section style={{ marginTop: 'var(--space-lg)', marginBottom: 'var(--space-lg)' }}>
			<div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-md)' }}>
				<h2 style={{ margin: 0 }}>Дополнительные доходы</h2>
				<Button onClick={onAddIncome} variant="secondary" size="sm">
					Добавить доход
				</Button>
			</div>
			<div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
				{[...currentMonthIncomes]
					.sort((a, b) => {
						const dateA = a.date ? new Date(a.date).getTime() : 0;
						const dateB = b.date ? new Date(b.date).getTime() : 0;
						return dateB - dateA;
					})
					.map((income) => {
						const incomeDate = income.date ? new Date(income.date) : null;
						return (
							<div
								key={income.id}
								style={{
									padding: 'var(--space-md)',
									background: 'var(--panel)',
									border: 'var(--border-default)',
									borderRadius: 'var(--radius-md)',
									display: 'flex',
									justifyContent: 'space-between',
									alignItems: 'center',
									cursor: 'pointer',
								}}
								onClick={() => onEditIncome(income)}
								onDoubleClick={(e) => {
									e.stopPropagation();
									onEditIncome(income);
								}}
							>
								<div style={{ flex: 1 }}>
									<div style={{ fontWeight: 600, marginBottom: 'var(--space-xs)', fontSize: 'var(--font-size-sm)' }}>{income.title}</div>
									{incomeDate && (
										<div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--muted)', marginBottom: 'var(--space-xs)' }}>
											{formatDate(income.date)}
										</div>
									)}
									{income.notes && (
										<div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--muted)', marginTop: 'var(--space-xs)' }}>
											{income.notes}
										</div>
									)}
								</div>
								<div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
									<div style={{ textAlign: 'right' }}>
										<div style={{ fontWeight: 600, fontSize: 16, color: 'var(--green)' }}>
											{formatCurrencyRub(income.amount || 0)}
										</div>
										{income.taxRate && income.taxRate > 0 && (
											<div style={{ fontSize: 11, color: 'var(--muted)' }}>
												Налог: {income.taxRate}%
											</div>
										)}
									</div>
									<div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-xs)' }}>
										<IconButton
											icon={EditIcon}
											title="Редактировать"
											onClick={(e) => {
												e.stopPropagation();
												onEditIncome(income);
											}}
										/>
										<IconButton
											icon={TrashIcon}
											title="Удалить"
											onClick={(e) => {
												e.stopPropagation();
												onDeleteIncome(income);
											}}
											type="delete"
										/>
									</div>
								</div>
							</div>
						);
					})}
			</div>
		</section>
	);
}






