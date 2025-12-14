import React, { useMemo } from 'react';
import { XIcon } from '@/shared/components/Icons';
import { getToken } from '@/shared/lib/tokens';

type ResetButtonProps = {
	onClick: (e: React.MouseEvent) => void;
	disabled: boolean;
};

/**
 * Кнопка сброса коэффициента
 */
export function ResetButton({ onClick, disabled }: ResetButtonProps): React.ReactElement | null {
	const iconSize = useMemo(() => getToken('--icon-size-xs', 11), []);

	if (disabled) {
		return null;
	}
	return (
		<button
			onClick={(e) => {
				e.preventDefault();
				e.stopPropagation();
				onClick(e);
			}}
			style={{
				background: 'transparent',
				border: 'none',
				cursor: 'pointer',
				padding: 'var(--space-xs) var(--space-xs)',
				display: 'flex',
				alignItems: 'center',
				gap: 'var(--space-xs)',
			}}
			title="Сбросить"
		>
			<span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--muted)' }}>Сбросить</span>
			<XIcon size={iconSize} color="var(--muted)" />
		</button>
	);
}

