import React from 'react';

type TabButtonProps = {
	active: boolean;
	onClick: () => void;
	children: React.ReactNode;
	count?: number;
};

/**
 * Кнопка вкладки для калькулятора
 */
export function TabButton({ active, onClick, children, count }: TabButtonProps): React.ReactElement {
	return (
		<button
			onClick={onClick}
			style={{
				padding: 'var(--space-sm) var(--space-md)',
				background: 'transparent',
				border: 'none',
				borderBottom: active ? 'var(--border-width) solid var(--accent)' : 'var(--border-width) solid transparent',
				color: active ? 'var(--accent)' : 'var(--muted)',
				fontWeight: active ? 600 : 400,
				cursor: 'pointer',
				transition: 'all var(--transition-base)',
			}}
		>
			{children}
			{count !== undefined && ` (${count})`}
		</button>
	);
}






