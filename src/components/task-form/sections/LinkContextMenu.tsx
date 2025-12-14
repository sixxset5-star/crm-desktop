/**
 * LinkContextMenu - Контекстное меню для ссылок
 */
import React from 'react';
import { LinkIcon, EditIcon, XIcon } from '@/shared/components/Icons';

type LinkContextMenuProps = {
	x: number;
	y: number;
	onClose: () => void;
	onEditName: () => void;
	onGoTo: () => void;
	onGoToExternal: () => void;
	onDelete: () => void;
};

export function LinkContextMenu({
	x,
	y,
	onClose,
	onEditName,
	onGoTo,
	onGoToExternal,
	onDelete,
}: LinkContextMenuProps): React.ReactElement {
	const menuRef = React.useRef<HTMLDivElement>(null);

	React.useEffect(() => {
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
		left: `${x}px`,
		top: `${y}px`,
		background: 'var(--panel)',
		border: 'var(--border-default)',
		borderRadius: 'var(--radius-md)',
		boxShadow: 'var(--shadow-sm)',
		padding: 'var(--space-xs)',
		zIndex: 10000,
		minWidth: 180,
		animation: 'fadeIn 0.15s ease-out',
	};

	const buttonStyle: React.CSSProperties = {
		width: '100%',
		display: 'flex',
		alignItems: 'center',
		gap: 'var(--space-sm)',
		padding: 'var(--space-sm) var(--space-md)',
		background: 'transparent',
		border: 'none',
		borderRadius: 'var(--radius-md)',
		cursor: 'pointer',
		fontSize: 'var(--font-size-md)',
		color: 'var(--text)',
		textAlign: 'left',
	};

	return (
		<div
			ref={menuRef}
			style={menuStyle}
			onClick={(e: React.MouseEvent<HTMLDivElement>) => e.stopPropagation()}
			onContextMenu={(e: React.MouseEvent<Element>) => e.preventDefault()}
		>
			<style>{`
				@keyframes fadeIn {
					from { opacity: 0; transform: scale(0.95); }
					to { opacity: 1; transform: scale(1); }
				}
			`}</style>
			<button
				type="button"
				onClick={onGoTo}
				style={buttonStyle}
				onMouseEnter={(e: React.MouseEvent<Element>) => (e.currentTarget as HTMLElement).style.background = 'var(--bg)'}
				onMouseLeave={(e: React.MouseEvent<Element>) => (e.currentTarget as HTMLElement).style.background = 'transparent'}
			>
				<LinkIcon size={16} />
				Перейти
			</button>
			<button
				type="button"
				onClick={onGoToExternal}
				style={buttonStyle}
				onMouseEnter={(e: React.MouseEvent<Element>) => (e.currentTarget as HTMLElement).style.background = 'var(--bg)'}
				onMouseLeave={(e: React.MouseEvent<Element>) => (e.currentTarget as HTMLElement).style.background = 'transparent'}
			>
				<LinkIcon size={16} />
				Перейти во внешнем браузере
			</button>
			<div style={{ height: 1, background: 'var(--border)', margin: 'var(--space-xs) 0' }} />
			<button
				type="button"
				onClick={onEditName}
				style={buttonStyle}
				onMouseEnter={(e: React.MouseEvent<Element>) => (e.currentTarget as HTMLElement).style.background = 'var(--bg)'}
				onMouseLeave={(e: React.MouseEvent<Element>) => (e.currentTarget as HTMLElement).style.background = 'transparent'}
			>
				<EditIcon size={16} />
				Изменить название
			</button>
			<div style={{ height: 1, background: 'var(--border)', margin: 'var(--space-xs) 0' }} />
			<button
				type="button"
				onClick={onDelete}
				style={{ ...buttonStyle, color: 'var(--red)' }}
				onMouseEnter={(e: React.MouseEvent<Element>) => (e.currentTarget as HTMLElement).style.background = 'var(--bg)'}
				onMouseLeave={(e: React.MouseEvent<Element>) => (e.currentTarget as HTMLElement).style.background = 'transparent'}
			>
				<XIcon size={16} />
				Удалить
			</button>
		</div>
	);
}

