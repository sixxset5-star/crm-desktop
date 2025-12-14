/**
 * LinkEditInput - Поле редактирования названия ссылки
 */
import React from 'react';
import { TextInput } from '@/shared/ui';
import IconButton from '@/shared/components/IconButton';
import { CheckIcon, XIcon } from '@/shared/components/Icons';

type LinkEditInputProps = {
	value: string;
	onChange: (value: string) => void;
	onSave: () => void;
	onCancel: () => void;
};

export function LinkEditInput({
	value,
	onChange,
	onSave,
	onCancel,
}: LinkEditInputProps) {
	return (
		<div style={{ display: 'flex', gap: 'var(--space-sm)', alignItems: 'center' }}>
			<TextInput
				value={value}
				onChange={(e) => onChange((e.target as HTMLInputElement).value)}
				placeholder="Название ссылки (необязательно)"
				style={{ flex: 1 }}
				autoFocus
				onKeyDown={(e) => {
					if (e.key === 'Enter') {
						e.preventDefault();
						onSave();
					} else if (e.key === 'Escape') {
						onCancel();
					}
				}}
			/>
			<IconButton
				onClick={onSave}
				title="Сохранить"
				icon={CheckIcon}
				type="default"
			/>
			<IconButton
				onClick={onCancel}
				title="Отмена"
				icon={XIcon}
				type="close"
			/>
		</div>
	);
}

