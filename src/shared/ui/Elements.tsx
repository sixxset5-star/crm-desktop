import React from 'react';
import customerStyles from './CustomerChip.module.css';
import tagStyles from './TagChip.module.css';
import priorityStyles from './PriorityBadge.module.css';

export type AvatarProps = {
	src?: string | null;
	alt: string;
	size?: number;
	backgroundColor?: string;
};

export function Avatar({ src, alt, size = 32, backgroundColor = 'var(--accent)' }: AvatarProps): React.ReactElement {
	const dimension = { width: size, height: size };
	const [imageError, setImageError] = React.useState(false);
	
	React.useEffect(() => {
		setImageError(false);
	}, [src]);
	
	if (src && !imageError) {
		return (
			<img
				src={src}
				alt={alt}
				onError={() => setImageError(true)}
				style={{
					...dimension,
					borderRadius: '50%',
					objectFit: 'cover',
					border: 'var(--border-default)',
					flexShrink: 0,
				}}
			/>
		);
	}
	return (
		<div
			aria-label={alt}
			title={alt}
			style={{
				...dimension,
				borderRadius: '50%',
				background: backgroundColor,
				display: 'flex',
				alignItems: 'center',
				justifyContent: 'center',
				color: 'var(--white)',
				fontSize: 14,
				fontWeight: 700,
				border: 'var(--border-default)',
				flexShrink: 0,
			}}
		>
			{alt?.[0]?.toUpperCase()}
		</div>
	);
}

export interface CustomerChipProps {
	name: string;
	avatarUrl?: string;
	variant?: 'default' | 'white';
	minHeight?: string;
}

function getInitials(name: string): string {
	const parts = name.trim().split(/\s+/);
	if (parts.length === 0) return '';
	const first = parts[0]?.[0] || '';
	const second = parts.length > 1 ? parts[1]?.[0] || '' : '';
	return (first + second).toUpperCase() || first.toUpperCase();
}

export function colorFromName(name: string): string {
	const colors = ['var(--accent)', 'var(--accent-soft)', 'var(--warning)', 'var(--red)', 'var(--info)', 'var(--green)'];
	let hash = 0;
	for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
	return colors[Math.abs(hash) % colors.length];
}

export function CustomerChip({ name, avatarUrl, variant = 'default', minHeight }: CustomerChipProps): React.ReactElement {
	const [imageError, setImageError] = React.useState(false);
	
	React.useEffect(() => {
		setImageError(false);
	}, [avatarUrl]);
	
	// Вычисляем размер аватарки на основе minHeight
	// Если minHeight передан, увеличиваем аватарку пропорционально
	const avatarSize = minHeight 
		? `calc(${minHeight} - var(--chip-padding-y) * 2)`
		: undefined;
	
	return (
		<span 
			className={customerStyles._chip} 
			title={name}
			style={{
				...(variant === 'white' ? { background: 'var(--white)' } : {}),
				...(minHeight ? { minHeight } : {}),
			}}
		>
			{avatarUrl && !imageError ? (
				<img 
					className={customerStyles._avatar} 
					src={avatarUrl} 
					alt={name}
					onError={() => setImageError(true)}
					style={avatarSize ? { width: avatarSize, height: avatarSize } : undefined}
				/>
			) : (
				<span 
					className={customerStyles._avatar} 
					style={{ 
						background: colorFromName(name),
						...(avatarSize ? { width: avatarSize, height: avatarSize } : {}),
					}}
				>
					{getInitials(name).slice(0, 1)}
				</span>
			)}
			<span className={customerStyles._name}>{name}</span>
		</span>
	);
}

type TagChipProps = {
	label: string;
	variant?: 'default' | 'accent' | 'ghost';
	onClick?: (e: React.MouseEvent) => void;
};

export function TagChip({ label, variant = 'default', onClick }: TagChipProps): React.ReactElement {
	const isButton = typeof onClick === 'function';
	const Component = (isButton ? 'button' : 'span') as React.ElementType;
	const className = [
		tagStyles._chip,
		variant === 'accent' ? tagStyles._accent : null,
		variant === 'ghost' ? tagStyles._ghost : null,
		isButton ? tagStyles._clickable : null,
	]
		.filter(Boolean)
		.join(' ');

	return (
		<Component
			type={isButton ? 'button' : undefined}
			className={className}
			onClick={onClick}
		>
			{label}
		</Component>
	);
}

export function PriorityBadge({
	priority,
}: {
	priority: 'high' | 'medium' | 'low';
}): React.ReactElement {
	const label = priority === 'high' ? 'Высокий' : priority === 'medium' ? 'Средний' : 'Низкий';
	const priorityClass =
		priority === 'high' ? priorityStyles._high : priority === 'medium' ? priorityStyles._medium : priorityStyles._low;
	return <span className={[priorityStyles._badge, priorityClass].join(' ').trim()}>{label}</span>;
}


