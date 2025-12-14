import React from 'react';

type SurfaceProps = {
	children: React.ReactNode;
	className?: string;
	variant?: 'default' | 'elevated' | 'outlined' | 'flat';
	padding?: 'none' | 'sm' | 'md' | 'lg';
	radius?: 'none' | 'sm' | 'md' | 'lg' | 'xl';
	shadow?: 'none' | 'sm' | 'md' | 'lg';
	onClick?: () => void;
	style?: React.CSSProperties;
};

const variantStyles = {
	default: {
		background: 'var(--surface-bg)',
		border: 'var(--surface-border)',
		boxShadow: 'var(--surface-shadow)',
	},
	elevated: {
		background: 'var(--surface-bg)',
		border: 'var(--surface-border)',
		boxShadow: '0 24px 48px color-mix(in srgb, var(--black) 12%, transparent)',
	},
	outlined: {
		background: 'transparent',
		border: 'var(--surface-border)',
		boxShadow: 'none',
	},
	flat: {
		background: 'var(--surface-bg)',
		border: 'none',
		boxShadow: 'none',
	},
};

const paddingMap = {
	none: '0',
	sm: 'var(--space-2)',
	md: 'var(--surface-padding)',
	lg: 'var(--space-5)',
};

const radiusMap = {
	none: '0',
	sm: 'var(--radius-sm)',
	md: 'var(--radius-md)',
	lg: 'var(--radius-lg)',
	xl: 'var(--surface-radius)',
};

const shadowMap = {
	none: 'none',
	sm: 'var(--shadow-sm)',
	md: 'var(--shadow-md)',
	lg: 'var(--shadow-lg)',
};

export function Surface({
	children,
	className = '',
	variant = 'default',
	padding = 'md',
	radius = 'xl',
	shadow,
	onClick,
	style,
}: SurfaceProps): React.ReactElement {
	const variantStyle = variantStyles[variant];
	const finalShadow = shadow !== undefined ? shadowMap[shadow] : variantStyle.boxShadow;

	return (
		<div
			className={`surface ${className}`}
			onClick={onClick}
			style={{
				...variantStyle,
				padding: paddingMap[padding],
				borderRadius: radiusMap[radius],
				boxShadow: finalShadow,
				transition: 'box-shadow var(--transition-base), transform var(--transition-base), border-color var(--transition-base)',
				...(onClick && { cursor: 'pointer' }),
				...style,
			}}
		>
			{children}
		</div>
	);
}








