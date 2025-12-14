import React from 'react';

export interface AccessChipProps {
	label: string;
	login: string;
	password: string;
}

export function AccessChip({ label, login, password }: AccessChipProps): React.ReactElement {
	const hasLogin = login.trim().length > 0;
	const hasPassword = password.trim().length > 0;
	
	return (
		<div 
			style={{ 
				fontSize: 'var(--font-size-xs)',
				padding: 'var(--space-xs) var(--space-sm)',
				borderRadius: 'var(--radius-md)',
				background: 'var(--bg)',
				border: 'var(--border-default)',
				color: 'var(--text-secondary)',
				display: 'inline-flex',
				flexDirection: 'column',
				gap: 'var(--space-xs)',
				lineHeight: 1.3,
				minWidth: 0,
			}}
		>
		<span style={{ color: 'var(--text-tertiary)', fontWeight: 500 }}>{label}</span>
		{hasLogin && (
			<span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-secondary)' }}>Логин: {login}</span>
		)}
		{hasPassword && (
			<span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-secondary)' }}>Пароль: {password}</span>
		)}
		</div>
	);
}

