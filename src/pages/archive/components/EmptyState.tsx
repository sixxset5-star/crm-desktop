import React from 'react';

type EmptyStateProps = {
	title: string;
	description?: string;
};

/**
 * Компонент для отображения пустого состояния
 */
export function EmptyState({ title, description }: EmptyStateProps): React.ReactElement {
	return (
		<div
			style={{
				marginTop: 'var(--space-lg)',
				padding: 'var(--space-lg)',
				background: 'var(--panel)',
				border: 'var(--border-default)',
				borderRadius: 'var(--radius-lg)',
				textAlign: 'center',
			}}
		>
			<p style={{ color: 'var(--muted)', fontSize: 'var(--font-size-md)' }}>{title}</p>
			{description && (
				<p style={{ color: 'var(--muted)', fontSize: 'var(--font-size-sm)', marginTop: 'var(--space-sm)' }}>
					{description}
				</p>
			)}
		</div>
	);
}






