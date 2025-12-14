import React from 'react';
import { formatContactValue, getContactLink } from '@/shared/lib/format';

export interface ContactChipProps {
	type: string;
	value: string;
}

export function ContactChip({ type, value }: ContactChipProps): React.ReactElement {
	const link = getContactLink(type, value);
	const displayValue = formatContactValue(type, value);
	
	const chipContent = (
		<span 
			style={{ 
				fontSize: 'var(--font-size-xs)', 
				padding: 'var(--chip-padding-y) var(--space-sm)',
			borderRadius: 'var(--tabs-tab-radius)',
			background: link ? 'var(--bg)' : 'transparent',
			border: link ? 'var(--border-default)' : 'none',
			color: link ? 'var(--accent)' : 'var(--text-secondary)',
				cursor: link ? 'pointer' : 'default',
				display: 'inline-flex',
				alignItems: 'center',
				gap: 'var(--space-xs)',
				transition: link ? 'all 0.2s' : 'none',
				textDecoration: 'none',
				fontWeight: link ? 500 : 400,
				whiteSpace: 'nowrap',
				lineHeight: 1.2,
			}}
			onMouseEnter={(e) => {
				if (link) {
					(e.currentTarget as HTMLElement).style.background = 'var(--accent)';
					(e.currentTarget as HTMLElement).style.color = 'var(--white)';
					(e.currentTarget as HTMLElement).style.borderColor = 'var(--accent)';
				}
			}}
			onMouseLeave={(e) => {
				if (link) {
					(e.currentTarget as HTMLElement).style.background = 'var(--bg)';
					(e.currentTarget as HTMLElement).style.color = 'var(--accent)';
					(e.currentTarget as HTMLElement).style.borderColor = 'var(--border)';
				}
			}}
		>
			<span style={{ color: 'var(--text-tertiary)' }}>{type}:</span>
			<span>{displayValue}</span>
		</span>
	);
	
	if (link) {
		return (
			<a
				href={link}
				onClick={(e) => {
					e.stopPropagation();
				}}
				style={{ textDecoration: 'none' }}
				target={link.startsWith('http') ? '_blank' : undefined}
				rel={link.startsWith('http') ? 'noopener noreferrer' : undefined}
			>
				{chipContent}
			</a>
		);
	}
	
	return chipContent;
}

