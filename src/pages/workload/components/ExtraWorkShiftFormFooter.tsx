import React from 'react';
import IconButton from '@/shared/components/IconButton';
import { TrashIcon } from '@/shared/components/Icons';

type ExtraWorkShiftFormFooterProps = {
	onDelete?: () => void;
};

export function ExtraWorkShiftFormFooter({ onDelete }: ExtraWorkShiftFormFooterProps): React.ReactElement | null {
	if (!onDelete) return null;

	return (
		<div style={{ 
			marginTop: 'var(--space-md)', 
			paddingTop: 'var(--space-md)', 
			borderTop: 'var(--border-default)',
			display: 'flex',
			alignItems: 'center',
			gap: 'var(--space-sm)'
		}}>
			<IconButton
				icon={TrashIcon}
				title="Удалить смену"
				onClick={onDelete}
			/>
			<span style={{ 
				fontSize: 'var(--font-size-sm)', 
				color: 'var(--muted)' 
			}}>
				Удалить смену
			</span>
		</div>
	);
}

