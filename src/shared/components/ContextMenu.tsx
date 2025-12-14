import React, { useEffect, useRef } from 'react';
type MenuAction = {
	id: string;
	label: string;
	onClick: () => void;
	icon?: React.ComponentType<{ size?: number; color?: string }>;
	tone?: 'default' | 'danger';
	isActive?: boolean;
};

type MenuSection = {
	id: string;
	title?: string;
	actions: MenuAction[];
};

type ContextMenuProps = {
	x: number;
	y: number;
	onClose: () => void;
	sections: MenuSection[];
};

export function ContextMenu({ x, y, onClose, sections }: ContextMenuProps): React.ReactElement {
	const menuRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		function handleClickOutside(event: MouseEvent) {
			if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
				onClose();
			}
		}
		function handleEscape(event: KeyboardEvent) {
			if (event.key === 'Escape') {
				onClose();
			}
		}
		const timeout = setTimeout(() => {
			document.addEventListener('mousedown', handleClickOutside);
			document.addEventListener('contextmenu', handleClickOutside);
		}, 10);
		document.addEventListener('keydown', handleEscape);
		return () => {
			clearTimeout(timeout);
			document.removeEventListener('mousedown', handleClickOutside);
			document.removeEventListener('contextmenu', handleClickOutside);
			document.removeEventListener('keydown', handleEscape);
		};
	}, [onClose]);

	const menuStyle: React.CSSProperties = {
		position: 'fixed',
		left: x,
		top: y,
		background: 'var(--panel)',
		border: 'var(--border-width) solid var(--border)',
		borderRadius: 'var(--radius-md)',
		boxShadow: '0 4px 12px color-mix(in srgb, var(--black) 15%, transparent)',
		padding: 'var(--space-xs)',
		zIndex: 10000,
		minWidth: 180,
		animation: 'fadeIn 0.15s ease-out',
		maxWidth: `calc(100vw - ${x + 10}px)`,
		maxHeight: `calc(100vh - ${y + 10}px)`,
	};

	return (
		<div
			ref={menuRef}
			style={menuStyle}
			onClick={(e) => e.stopPropagation()}
			onContextMenu={(e) => e.preventDefault()}
		>
			<style>{`
				@keyframes fadeIn {
					from { opacity: 0; transform: scale(0.95); }
					to { opacity: 1; transform: scale(1); }
				}
			`}</style>

			{sections.flatMap((section, sectionIdx) => {
				const header = section.title ? (
					<div key={`${section.id}-title`} style={{ fontSize: 'var(--font-size-xs)', fontWeight: 600, color: 'var(--muted)', padding: '6px var(--space-md) var(--space-xs)' }}>
						{section.title}
					</div>
				) : null;

				const items = section.actions.map((action) => (
					<MenuItem
						key={action.id}
						icon={action.icon}
						onClick={() => {
							action.onClick();
							onClose();
						}}
						label={action.label}
						isDanger={action.tone === 'danger'}
						isActive={action.isActive}
					/>
				));

				const separator = sectionIdx < sections.length - 1 ? (
					<div key={`${section.id}-divider`} style={{ height: 'var(--border-width)', background: 'var(--border)', margin: 'var(--space-xs) 0' }} />
				) : null;

				return [header, ...items, separator].filter(Boolean);
			})}
		</div>
	);
}

type MenuItemProps = {
	icon?: React.ComponentType<{ size?: number; color?: string }>;
	onClick: () => void;
	label: string;
	isActive?: boolean;
	isDanger?: boolean;
};

function MenuItem({ icon: Icon, onClick, label, isActive, isDanger }: MenuItemProps): React.ReactElement {
	const [hover, setHover] = React.useState(false);
	return (
		<button
			type="button"
			onClick={onClick}
			onMouseEnter={() => setHover(true)}
			onMouseLeave={() => setHover(false)}
			style={{
				width: '100%',
				display: 'flex',
				alignItems: 'center',
				gap: 'var(--space-sm)',
				padding: 'var(--space-sm) var(--space-md)',
				background: hover 
					? (isDanger ? 'color-mix(in srgb, var(--red) 15%, var(--white) 85%)' : isActive ? 'var(--accent)' : 'var(--panel-hover)')
					: (isActive ? 'var(--panel-selected)' : 'transparent'),
				border: 'none',
				borderRadius: 'var(--radius-md)',
				cursor: 'pointer',
				fontSize: 'var(--font-size-sm)',
				color: isDanger 
					? 'var(--red)' 
					: isActive 
						? (hover ? 'var(--white)' : 'var(--accent)')
						: 'var(--text-primary)',
				transition: 'all 0.15s ease',
				textAlign: 'left',
			}}
		>
			{Icon && <Icon size={16} color={isDanger ? 'var(--red)' : isActive && hover ? 'var(--white)' : 'currentColor'} />}
			<span style={{ flex: 1 }}>{label}</span>
			{isActive && !Icon && (
				<svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
					<polyline points="20 6 9 17 4 12" />
				</svg>
			)}
		</button>
	);
}


