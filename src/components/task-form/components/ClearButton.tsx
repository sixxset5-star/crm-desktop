import React from 'react';
import { XIcon } from '@/shared/components/Icons';
import IconButton from '@/shared/components/IconButton';

type ClearButtonProps = {
	onClick: () => void;
	'aria-label'?: string;
};

export function ClearButton({ onClick, 'aria-label': ariaLabel = 'Очистить' }: ClearButtonProps): React.ReactElement {
	return (
		<div
			style={{
				position: 'absolute',
				right: 'var(--space-sm)',
				top: '50%',
				transform: 'translateY(-50%)',
			}}
		>
			<IconButton
				icon={XIcon}
				title={ariaLabel}
				onClick={onClick}
			/>
		</div>
	);
}

