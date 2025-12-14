/**
 * FileAddButton - Кнопка добавления файлов
 */
import React from 'react';
import { PaperclipIcon } from '@/shared/components/Icons';
import { Button } from '@/shared/ui';

type FileAddButtonProps = {
	onClick: (e: React.MouseEvent<HTMLButtonElement>) => void;
};

export function FileAddButton({ onClick }: FileAddButtonProps) {
	return (
		<Button
			type="button"
			onClick={onClick}
			variant="action"
			size="sm"
			title="Выбрать файлы"
		>
			<span style={{ display: 'inline-flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
				<PaperclipIcon size={18} color="currentColor" />
				<span>Добавить файлы</span>
			</span>
		</Button>
	);
}

