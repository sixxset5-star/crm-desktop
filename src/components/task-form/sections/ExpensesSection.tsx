/**
 * ExpensesSection - Секция для управления расходами
 * 
 * Простой UI-компонент без бизнес-логики.
 */
import React from 'react';
import { Button, TextInput } from '@/shared/ui';
import IconButton from '@/shared/components/IconButton';
import { PlusIcon, XIcon } from '@/shared/components/Icons';
import { ContractorSelect } from './ContractorSelect';
import { safeEval } from '@/shared/lib/mathParser';
import { parseCurrencyInput } from '@/shared/lib/input-masks';

export type ExpenseItem = {
	id: string;
	title: string;
	amount: number;
	date?: string;
	contractorId?: string; // Ссылка на подрядчика, которому относится этот расход
};

type ExpensesSectionProps = {
	expensesItems: ExpenseItem[];
	expensesTotal: number;
	onAdd: () => void;
	onRemove: (id: string) => void;
	onUpdate: (id: string, updates: Partial<ExpenseItem>) => void;
	onDoubleClick?: (e: React.MouseEvent<HTMLInputElement>) => void;
	contractors?: Array<{ id: string; name: string; isActive: boolean; avatar?: string }>; // Активные подрядчики для выбора
};

export function ExpensesSection({
	expensesItems,
	expensesTotal,
	onAdd,
	onRemove,
	onUpdate,
	onDoubleClick,
	contractors = [],
}: ExpensesSectionProps) {
	const activeContractors = contractors.filter(c => c.isActive);
	return (
		<div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
			{expensesItems.map((item) => (
				<div
					key={item.id}
					style={{
						display: 'flex',
						flexDirection: 'row',
						gap: 'var(--space-sm)',
						alignItems: 'center',
						border: 'var(--border-default)',
						borderRadius: 'var(--radius-md)',
						padding: 'var(--space-sm)',
						background: 'var(--bg)',
						flexWrap: 'nowrap',
					}}
				>
					<TextInput
						type="text"
						value={item.title}
						onChange={(e) => onUpdate(item.id, { title: (e.target as HTMLInputElement).value })}
						onDoubleClick={onDoubleClick}
						placeholder="Название платежки"
						style={{ fontSize: 'var(--font-size-sm)', flex: '1.5', minWidth: 0 }}
					/>
					<TextInput
						mask="currency"
						type="text"
						inputMode="numeric"
						value={String(item.amount ?? 0)}
						onChange={(e) => {
							const rawValue = (e.target as HTMLInputElement).value;
							const parsed = parseCurrencyInput(rawValue);
							// Если есть математические символы, не преобразуем сразу
							if (parsed && /[+\-*/()]/.test(parsed)) {
								return;
							}
							const numValue = parsed.trim() ? Number(parsed) : 0;
							onUpdate(item.id, { amount: numValue });
						}}
						onBlur={(e) => {
							const value = (e.target as HTMLInputElement).value.trim();
							const parsed = parseCurrencyInput(value);
							if (!parsed) {
								onUpdate(item.id, { amount: 0 });
								return;
							}
							if (/[+\-*/()]/.test(parsed)) {
								const result = safeEval(parsed);
								if (result !== null && isFinite(result)) {
									onUpdate(item.id, { amount: Math.round(result) });
								}
							} else {
								const numValue = parsed.trim() ? Number(parsed) : 0;
								onUpdate(item.id, { amount: numValue });
							}
						}}
						onDoubleClick={onDoubleClick}
						placeholder="Например: 1 500"
						style={{ fontSize: 'var(--font-size-sm)', width: '100px', flexShrink: 0 }}
					/>
					<TextInput
						type="date"
						value={item.date || ''}
						onChange={(e) => onUpdate(item.id, { date: (e.target as HTMLInputElement).value })}
						style={{ fontSize: 'var(--font-size-sm)', width: '130px', flexShrink: 0 }}
					/>
					{activeContractors.length > 0 && (
						<div style={{ width: 'fit-content', flexShrink: 0 }}>
							<ContractorSelect
								value={item.contractorId}
								contractors={contractors}
								onChange={(contractorId) => onUpdate(item.id, { contractorId })}
							/>
						</div>
					)}
					<div style={{ display: 'flex', justifyContent: 'flex-end', flexShrink: 0 }}>
						<IconButton
							onClick={(e) => {
								if (e) {
									e.stopPropagation();
									e.preventDefault();
								}
								onRemove(item.id);
							}}
							title="Удалить расход"
							icon={XIcon}
							type="close"
						/>
					</div>
				</div>
			))}
			<div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
				<Button type="button" variant="action" onClick={onAdd}>
					<span style={{ display: 'inline-flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
						<PlusIcon size={16} />
						Добавить расход
					</span>
				</Button>
				{expensesItems.length > 0 && (
					<div style={{ fontSize: 'var(--font-size-sm)', fontWeight: 'var(--font-weight-semibold)' }}>
						Итого расходов: {new Intl.NumberFormat('ru-RU', { style: 'currency', currency: 'RUB', maximumFractionDigits: 0 }).format(expensesTotal)}
					</div>
				)}
			</div>
		</div>
	);
}

