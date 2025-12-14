/**
 * LinkItem - Компонент плашки ссылки
 */
import React from 'react';
import type { TaskLink } from '@/types';
import { LinkIcon } from '@/shared/components/Icons';

type LinkItemProps = {
	link: TaskLink;
	onContextMenu: (e: React.MouseEvent) => void;
};

export function LinkItem({ link, onContextMenu }: LinkItemProps) {
	const [isHovered, setIsHovered] = React.useState(false);
	
	return (
		<div
			onContextMenu={onContextMenu}
			onMouseEnter={() => setIsHovered(true)}
			onMouseLeave={() => setIsHovered(false)}
			style={{
				display: 'flex',
				alignItems: 'center',
				gap: 'var(--space-sm)',
				padding: 'var(--space-sm) var(--space-sm)',
				background: isHovered ? 'var(--accent)' : 'var(--bg)',
				border: 'var(--border-default)',
				borderRadius: 'var(--radius-md)',
				cursor: 'pointer',
				transition: 'all 0.2s',
			}}
			onClick={(e: React.MouseEvent<HTMLDivElement>) => {
				e.stopPropagation();
				window.open(link.url, '_blank', 'noopener,noreferrer');
			}}
		>
			<LinkIcon size={14} color={isHovered ? 'var(--white)' : 'var(--accent)'} />
			<div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 'var(--space-xs)' }}>
				{link.name && (
					<span style={{ fontSize: 'var(--font-size-sm)', fontWeight: 'var(--font-weight-medium)', color: isHovered ? 'var(--white)' : 'var(--accent)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
						{link.name}
					</span>
				)}
				<span style={{ fontSize: 'var(--font-size-xs)', color: isHovered ? 'color-mix(in srgb, var(--white) 90%, transparent)' : 'var(--muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
					{link.url}
				</span>
			</div>
		</div>
	);
}

