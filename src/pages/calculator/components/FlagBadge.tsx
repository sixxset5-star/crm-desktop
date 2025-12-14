import React from 'react';

type FlagBadgeProps = {
	icon: string;
	label: string;
};

/**
 * Бейдж с флагом/иконкой для истории расчетов
 */
export function FlagBadge({ icon, label }: FlagBadgeProps): React.ReactElement {
	return (
		<span
			style={{
				display: 'inline-flex',
				alignItems: 'center',
				gap: 'var(--space-xs)',
				padding: 'var(--space-xs) var(--space-sm)',
				background: 'var(--bg)',
				border: 'var(--border-default)',
				borderRadius: 'var(--radius-md)',
				fontSize: 'var(--font-size-sm)',
			}}
		>
			<span>{icon}</span>
			<span>{label}</span>
		</span>
	);
}






