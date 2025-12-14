/**
 * SubtasksSection - Секция для управления подзадачами
 * 
 * Только UI, без бизнес-логики.
 */
import React from 'react';
import { TextInput, Button, Checkbox } from '@/shared/ui';
import { PlusIcon, XIcon } from '@/shared/components/Icons';
import IconButton from '@/shared/components/IconButton';
import { safeEval } from '@/shared/lib/mathParser';
import { parseCurrencyInput } from '@/shared/lib/input-masks';

type Subtask = {
	id: string;
	title: string;
	done: boolean;
	amount?: number;
	date?: string;
};

type SubtasksSectionProps = {
	subtasks: Subtask[];
	newSubtask: string;
	onNewSubtaskChange: (value: string) => void;
	onAddSubtask: () => void;
	onToggleSubtask: (id: string) => void;
	onRemoveSubtask: (id: string) => void;
	onUpdateSubtask: (id: string, patch: Partial<Subtask>) => void;
	selectAllOnDoubleClick?: (e: React.MouseEvent<HTMLInputElement>) => void;
};

export function SubtasksSection({
	subtasks,
	newSubtask,
	onNewSubtaskChange,
	onAddSubtask,
	onToggleSubtask,
	onRemoveSubtask,
	onUpdateSubtask,
	selectAllOnDoubleClick,
}: SubtasksSectionProps) {
	const totalAmount = subtasks.reduce((sum, s) => sum + (s.amount || 0), 0);

	return (
		<div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
			{/* Список подзадач */}
			{subtasks.map((subtask) => (
				<div
					key={subtask.id}
					style={{
						display: 'flex',
						flexDirection: 'column',
						gap: 'var(--space-sm)',
						padding: 'var(--space-sm)',
						background: 'var(--bg)',
						borderRadius: 'var(--radius-md)',
						border: 'var(--border-default)',
						position: 'relative',
					}}
				>
					{/* Заголовок и чекбокс */}
					<div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
						<Checkbox
							checked={subtask.done}
							onChange={() => onToggleSubtask(subtask.id)}
						/>
						<TextInput
							type="text"
							value={subtask.title}
							onChange={(e) => onUpdateSubtask(subtask.id, { title: (e.target as HTMLInputElement).value })}
							onDoubleClick={selectAllOnDoubleClick}
							placeholder="Название задачи"
							style={{ flex: 1 }}
						/>
						<IconButton
							onClick={() => onRemoveSubtask(subtask.id)}
							title="Удалить задачу"
							icon={XIcon}
							type="close"
						/>
					</div>

					{/* Сумма и дата */}
					<div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-sm)' }}>
						<div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
							<label style={{ fontSize: 'var(--font-size-xs)', color: 'var(--muted)', fontWeight: 'var(--font-weight-medium)' }}>Сумма</label>
							<TextInput
								mask="currency"
								type="text"
								inputMode="numeric"
								value={subtask.amount ?? ''}
								onChange={(e) => {
									const rawValue = (e.target as HTMLInputElement).value;
									const parsed = parseCurrencyInput(rawValue);
									// Если есть математические символы, не преобразуем сразу
									if (parsed && /[+\-*/()]/.test(parsed)) {
										return;
									}
									const numValue = parsed.trim() ? Number(parsed) : undefined;
									onUpdateSubtask(subtask.id, { amount: isNaN(numValue || 0) ? undefined : numValue });
								}}
								onBlur={(e) => {
									const value = (e.target as HTMLInputElement).value.trim();
									const parsed = parseCurrencyInput(value);
									if (!parsed) {
										onUpdateSubtask(subtask.id, { amount: undefined });
										return;
									}
									if (/[+\-*/()]/.test(parsed)) {
										const result = safeEval(parsed);
										if (result !== null && isFinite(result)) {
											onUpdateSubtask(subtask.id, { amount: Math.round(result) });
										}
									} else {
										const numValue = parsed.trim() ? Number(parsed) : undefined;
										onUpdateSubtask(subtask.id, { amount: isNaN(numValue || 0) ? undefined : numValue });
									}
								}}
								onDoubleClick={selectAllOnDoubleClick}
								placeholder="Например: 2 000"
							/>
						</div>
						{subtask.done && (
							<div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
								<label style={{ fontSize: 'var(--font-size-xs)', color: 'var(--muted)', fontWeight: 'var(--font-weight-medium)' }}>Дата</label>
								<TextInput
									type="date"
									value={subtask.date || ''}
									data-subtask-id={subtask.id}
									onChange={(e) => onUpdateSubtask(subtask.id, { date: (e.target as HTMLInputElement).value })}
								/>
							</div>
						)}
					</div>
				</div>
			))}

			{/* Итого оплачено */}
			{subtasks.length > 0 && (
				<div style={{ paddingTop: 'var(--space-xs)', fontSize: 'var(--font-size-sm)', fontWeight: 'var(--font-weight-semibold)', color: 'var(--text)', textAlign: 'right' }}>
					Итого оплачено: {new Intl.NumberFormat('ru-RU', { style: 'currency', currency: 'RUB', maximumFractionDigits: 0 }).format(totalAmount)}
				</div>
			)}

			{/* Добавление новой подзадачи */}
			<div style={{ display: 'flex', gap: 'var(--space-sm)', alignItems: 'center' }}>
				<TextInput
					value={newSubtask}
					onChange={(e) => onNewSubtaskChange((e.target as HTMLInputElement).value)}
					onDoubleClick={selectAllOnDoubleClick}
					placeholder="Название задачи"
					style={{ flex: 1 }}
					onKeyDown={(e) => {
						if (e.key === 'Enter') {
							e.preventDefault();
							onAddSubtask();
						}
					}}
				/>
				<Button type="button" variant="action" onClick={onAddSubtask}>
					<span style={{ display: 'inline-flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
						<PlusIcon size={16} />
						<span>Добавить задачу</span>
					</span>
				</Button>
			</div>
		</div>
	);
}

