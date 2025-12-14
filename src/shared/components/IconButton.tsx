import React from 'react';
import { 
	TrashIcon, 
	EditIcon, 
	XIcon, 
	PlusIcon, 
	CheckIcon, 
	CopyIcon, 
	DownloadIcon, 
	ArchiveIcon,
	MoreVerticalIcon,
	PaperclipIcon
} from './Icons';

type IconButtonProps = {
	icon: React.ComponentType<{ size?: number; color?: string }>;
	title: string;
	onClick: (e?: React.MouseEvent) => void;
	className?: string;
	type?: 'button' | 'submit' | 'reset';
	iconSize?: number;
	alignSelf?: string;
	hover?: 'accent' | 'danger' | 'success' | 'warning' | 'info' | 'default';
} & Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'type' | 'onClick' | 'title' | 'className'>;

type IconColorScheme = {
	bg: string;
	bgHover: string;
	iconColor: string;
	iconColorHover: string;
};

function getIconColorScheme(Icon: React.ComponentType<{ size?: number; color?: string }>, hover?: string): IconColorScheme {
	// Определяем тип иконки по компоненту
	const iconName = Icon.name || '';
	
	// Если явно указан hover, используем его
	if (hover === 'danger') {
		return {
			bg: 'color-mix(in srgb, var(--red) 8%, transparent)',
			bgHover: 'color-mix(in srgb, var(--red) 20%, transparent)',
			iconColor: 'var(--red)',
			iconColorHover: 'color-mix(in srgb, var(--red) 85%, white)',
		};
	}
	
	if (hover === 'success') {
		return {
			bg: 'color-mix(in srgb, var(--green) 8%, transparent)',
			bgHover: 'color-mix(in srgb, var(--green) 20%, transparent)',
			iconColor: 'var(--green)',
			iconColorHover: 'color-mix(in srgb, var(--green) 85%, white)',
		};
	}
	
	if (hover === 'accent') {
		return {
			bg: 'color-mix(in srgb, var(--accent) 8%, transparent)',
			bgHover: 'color-mix(in srgb, var(--accent) 20%, transparent)',
			iconColor: 'var(--accent)',
			iconColorHover: 'var(--accent)',
		};
	}
	
	if (hover === 'warning') {
		return {
			bg: 'color-mix(in srgb, var(--warning) 8%, transparent)',
			bgHover: 'color-mix(in srgb, var(--warning) 20%, transparent)',
			iconColor: 'var(--warning)',
			iconColorHover: 'color-mix(in srgb, var(--warning) 85%, white)',
		};
	}
	
	// Определяем по типу иконки
	if (Icon === TrashIcon || Icon === XIcon || iconName.includes('Trash') || iconName.includes('X')) {
		return {
			bg: 'color-mix(in srgb, var(--red) 8%, transparent)',
			bgHover: 'color-mix(in srgb, var(--red) 20%, transparent)',
			iconColor: 'var(--red)',
			iconColorHover: 'color-mix(in srgb, var(--red) 85%, white)',
		};
	}
	
	if (Icon === EditIcon || iconName.includes('Edit')) {
		return {
			bg: 'color-mix(in srgb, var(--accent) 8%, transparent)',
			bgHover: 'color-mix(in srgb, var(--accent) 20%, transparent)',
			iconColor: 'var(--accent)',
			iconColorHover: 'var(--accent)',
		};
	}
	
	if (Icon === PlusIcon || iconName.includes('Plus')) {
		return {
			bg: 'color-mix(in srgb, var(--green) 8%, transparent)',
			bgHover: 'color-mix(in srgb, var(--green) 20%, transparent)',
			iconColor: 'var(--green)',
			iconColorHover: 'color-mix(in srgb, var(--green) 85%, white)',
		};
	}
	
	if (Icon === CheckIcon || iconName.includes('Check')) {
		return {
			bg: 'color-mix(in srgb, var(--green) 8%, transparent)',
			bgHover: 'color-mix(in srgb, var(--green) 20%, transparent)',
			iconColor: 'var(--green)',
			iconColorHover: 'color-mix(in srgb, var(--green) 85%, white)',
		};
	}
	
	if (Icon === DownloadIcon || iconName.includes('Download')) {
		return {
			bg: 'color-mix(in srgb, var(--accent) 8%, transparent)',
			bgHover: 'color-mix(in srgb, var(--accent) 20%, transparent)',
			iconColor: 'var(--accent)',
			iconColorHover: 'var(--accent)',
		};
	}
	
	if (Icon === ArchiveIcon || iconName.includes('Archive')) {
		return {
			bg: 'color-mix(in srgb, var(--warning) 8%, transparent)',
			bgHover: 'color-mix(in srgb, var(--warning) 20%, transparent)',
			iconColor: 'var(--warning)',
			iconColorHover: 'color-mix(in srgb, var(--warning) 85%, white)',
		};
	}
	
	if (Icon === CopyIcon || iconName.includes('Copy')) {
		return {
			bg: 'color-mix(in srgb, var(--info) 8%, transparent)',
			bgHover: 'color-mix(in srgb, var(--info) 20%, transparent)',
			iconColor: 'var(--info)',
			iconColorHover: 'color-mix(in srgb, var(--info) 85%, white)',
		};
	}
	
	if (Icon === PaperclipIcon || iconName.includes('Paperclip')) {
		return {
			bg: 'color-mix(in srgb, var(--info) 8%, transparent)',
			bgHover: 'color-mix(in srgb, var(--info) 20%, transparent)',
			iconColor: 'var(--info)',
			iconColorHover: 'color-mix(in srgb, var(--info) 85%, white)',
		};
	}
	
	// Стандартная схема для остальных иконок
	return {
		bg: 'color-mix(in srgb, var(--info) 8%, transparent)',
		bgHover: 'color-mix(in srgb, var(--info) 20%, transparent)',
		iconColor: 'var(--muted)',
		iconColorHover: 'var(--text)',
	};
}

export default function IconButton({
	icon: Icon,
	title,
	onClick,
	className,
	type,
	iconSize = 16,
	alignSelf,
	hover,
	...rest
}: IconButtonProps): React.ReactElement {
	const normalizedType: 'button' | 'submit' | 'reset' =
		typeof type === 'string' && (type === 'button' || type === 'submit' || type === 'reset') ? type : 'button';
	
	const colorScheme = getIconColorScheme(Icon, hover);
	const [isHovered, setIsHovered] = React.useState(false);
	
	return (
		<button
			type={normalizedType}
			onClick={(e) => {
				e.stopPropagation();
				onClick(e);
			}}
			title={title}
			aria-label={title}
			className={className}
			{...rest}
			onMouseEnter={() => setIsHovered(true)}
			onMouseLeave={() => setIsHovered(false)}
			style={{
				background: isHovered ? colorScheme.bgHover : colorScheme.bg,
				border: 'none',
				cursor: 'pointer',
				display: 'inline-flex',
				alignItems: 'center',
				justifyContent: 'center',
				borderRadius: 'var(--radius-md)',
				padding: 'var(--space-xs)',
				transition: 'background-color 0.2s ease, color 0.2s ease',
				alignSelf: alignSelf,
			}}
		>
			<Icon 
				size={iconSize} 
				color={isHovered ? colorScheme.iconColorHover : colorScheme.iconColor}
			/>
		</button>
	);
}



