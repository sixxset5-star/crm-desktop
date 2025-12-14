import React from 'react';
import { TextInput } from '@/shared/ui';
import IconButton from '@/shared/components/IconButton';
import { TrashIcon } from '@/shared/components/Icons';
import { parseCurrencyInput, parseQuantityInput } from '@/shared/lib/input-masks';
import type { ReferenceProject } from '../../../store/calculator';

type ReferenceCardProps = {
	reference: ReferenceProject;
	onUpdate: (updates: Partial<ReferenceProject>) => void;
	onRemove: () => void;
};

/**
 * Карточка референсного проекта
 */
export function ReferenceCard({ reference, onUpdate, onRemove }: ReferenceCardProps): React.ReactElement {
	return (
		<div style={{ border: 'var(--border-default)', borderRadius: 'var(--radius-md)', padding: 'var(--space-md)' }}>
			<div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
				{/* Первая строка: название проекта и иконка мусорки */}
				<div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-md)' }}>
					<TextInput
						type="text"
						placeholder="Название проекта"
						value={reference.name}
						onChange={(e) => onUpdate({ name: (e.target as HTMLInputElement).value })}
						style={{ flex: 1 }}
					/>
					<IconButton icon={TrashIcon} title="Удалить" onClick={onRemove} hover="danger" />
				</div>
				{/* Вторая строка: два поля ввода */}
				<div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-md)', alignItems: 'start', width: '100%' }}>
					<div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)', minWidth: 0 }}>
						<label style={{ fontSize: 'var(--font-size-sm)', color: 'var(--muted)', display: 'block' }}>
							Итоговая сумма
						</label>
						<TextInput
							mask="currency"
							type="text"
							value={reference.totalAmount || ''}
							onChange={(e) => {
								const rawValue = (e.target as HTMLInputElement).value;
								const parsed = parseCurrencyInput(rawValue);
								onUpdate({ totalAmount: parseFloat(parsed) || 0 });
							}}
							placeholder="Например: 50 000"
							style={{ width: '100%', boxSizing: 'border-box' }}
						/>
					</div>
					<div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)', minWidth: 0 }}>
						<label style={{ fontSize: 'var(--font-size-sm)', color: 'var(--muted)', display: 'block' }}>
							Кол-во блоков
						</label>
						<TextInput
							mask="quantity"
							type="text"
							value={reference.blocks || ''}
							onChange={(e) => {
								const rawValue = (e.target as HTMLInputElement).value;
								const parsed = parseQuantityInput(rawValue);
								onUpdate({ blocks: parseInt(parsed) || 0 });
							}}
							placeholder="Например: 10"
							style={{ width: '100%', boxSizing: 'border-box' }}
						/>
					</div>
				</div>
				{/* Третья строка: примечание */}
				<div style={{ width: '100%', minWidth: 0 }}>
					<label style={{ fontSize: 'var(--font-size-sm)', color: 'var(--muted)', display: 'block', marginBottom: 'var(--space-sm)' }}>
						Примечание (иллюстрации, срочность и т.д.)
					</label>
					<TextInput
						type="text"
						placeholder="Например: были иллюстрации, срочный проект"
						value={reference.note}
						onChange={(e) => onUpdate({ note: (e.target as HTMLInputElement).value })}
						style={{ width: '100%', boxSizing: 'border-box' }}
					/>
				</div>
			</div>
		</div>
	);
}

