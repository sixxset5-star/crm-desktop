/**
 * LinkAddInput - Поле ввода новой ссылки
 */
import React from 'react';
import { TextInput } from '@/shared/ui';
import IconButton from '@/shared/components/IconButton';
import { PlusIcon } from '@/shared/components/Icons';

type LinkAddInputProps = {
	value: string;
	error: string | null;
	onChange: (value: string) => void;
	onValidate: (value: string) => { valid: boolean; error?: string };
	onSetError: (error: string | null) => void;
	onAdd: () => void;
	selectAllOnDoubleClick: (e: React.MouseEvent) => void;
};

export function LinkAddInput({
	value,
	error,
	onChange,
	onValidate,
	onSetError,
	onAdd,
	selectAllOnDoubleClick,
}: LinkAddInputProps) {
	return (
		<>
			<div style={{ position: 'relative', width: '100%' }}>
				<TextInput 
					value={value}
					onDoubleClick={selectAllOnDoubleClick}
					onChange={(e) => {
						const val = (e.target as HTMLInputElement).value;
						onChange(val);
						// Валидация в реальном времени
						if (val.trim()) {
							const validation = onValidate(val);
							onSetError(validation.valid ? null : (validation.error || 'Некорректный формат URL'));
						} else {
							onSetError(null);
						}
					}} 
					placeholder="https://..." 
					style={{ 
						width: '100%',
						paddingRight: 'var(--space-lg)',
						borderColor: error ? 'var(--red)' : undefined,
						boxSizing: 'border-box',
					}} 
					onKeyDown={(e) => { 
						if (e.key === 'Enter') { 
							e.preventDefault(); 
							onAdd(); 
						} 
					}} 
				/>
				<div
					style={{
						position: 'absolute',
						right: 'var(--space-sm)',
						top: '50%',
						transform: 'translateY(-50%)',
					}}
				>
					<IconButton
						onClick={onAdd}
						title="Добавить ссылку"
						icon={PlusIcon}
						iconSize={20}
					/>
				</div>
			</div>
			{error && (
				<span style={{ 
					fontSize: 'var(--font-size-xs)', 
					color: 'var(--red)', 
				}}>
					{error}
				</span>
			)}
		</>
	);
}

