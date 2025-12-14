import React from 'react';

type SettingsSectionProps = {
	title: string;
	description?: string;
	children: React.ReactNode;
};

export function SettingsSection({ title, description, children }: SettingsSectionProps): React.ReactElement {
	return (
		<section style={{ 
			background: 'var(--panel)', 
			border: 'var(--border-default)', 
			borderRadius: 'var(--surface-radius)', 
			padding: 'var(--space-lg)' 
		}}>
			<h3 style={{ marginTop: 'var(--space-none)' }}>{title}</h3>
			{description && (
				<p style={{ color: 'var(--muted)', marginTop: 'calc(-1 * var(--space-sm))', marginBottom: 'var(--space-md)' }}>
					{description}
				</p>
			)}
			<div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
				{children}
			</div>
		</section>
	);
}

