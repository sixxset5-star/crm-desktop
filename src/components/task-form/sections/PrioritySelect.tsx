/**
 * PrioritySelect - Кастомный селект приоритета
 */
import React from 'react';
import type { TaskPriority } from '@/types';
import { useSettingsStore } from '@/store/settings';
import { LOW_PRIORITY_NEUTRAL } from '@/store/settings';
import { useShallowSelector } from '@/shared/hooks/useStoreSelectors';

type PriorityOption = {
	value: TaskPriority;
	label: string;
};

const PRIORITY_OPTIONS: PriorityOption[] = [
	{ value: 'high', label: 'Высокий' },
	{ value: 'medium', label: 'Средний' },
	{ value: 'low', label: 'Низкий' },
];

type PrioritySelectProps = {
	value: TaskPriority;
	onChange: (priority: TaskPriority) => void;
	horizontalPadding?: string; // Дополнительный горизонтальный padding
};

export function PrioritySelect({
	value,
	onChange,
	horizontalPadding,
}: PrioritySelectProps): React.ReactElement {
	const [isOpen, setIsOpen] = React.useState(false);
	const containerRef = React.useRef<HTMLDivElement>(null);
	const selectedOption = PRIORITY_OPTIONS.find(opt => opt.value === value) || PRIORITY_OPTIONS[1];
	const settings = useShallowSelector(useSettingsStore, (s) => s.settings);
	const priorityColors = settings.priorityColors;
	
	// Получаем цвета приоритетов из настроек или используем дефолтные
	const getPriorityColor = (priority: TaskPriority): string => {
		if (priority === 'high') {
			return priorityColors?.high || 'var(--red)';
		}
		if (priority === 'medium') {
			return priorityColors?.medium || 'var(--warning)';
		}
		return priorityColors?.low || LOW_PRIORITY_NEUTRAL;
	};
	
	const getPriorityStyle = (priority: TaskPriority, isSelected: boolean) => {
		const color = getPriorityColor(priority);
		return {
			display: 'inline-flex',
			alignItems: 'center',
			padding: `var(--chip-padding-y) ${horizontalPadding || 'var(--space-sm)'}`,
			borderRadius: 'var(--radius-pill)',
			background: isSelected 
				? color 
				: (priority === 'low' 
					? 'color-mix(in srgb, var(--muted) 18%, transparent)'
					: `color-mix(in srgb, ${color} 15%, transparent)`),
			border: 'none',
			color: isSelected 
				? 'var(--white)' 
				: (priority === 'low' ? 'var(--text-secondary)' : color),
			fontSize: 'var(--font-size-xs)',
			fontWeight: isSelected ? 600 : 600,
			boxShadow: 'none',
		};
	};

	React.useEffect(() => {
		function handleClickOutside(event: MouseEvent) {
			if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
				setIsOpen(false);
			}
		}

		if (isOpen) {
			document.addEventListener('mousedown', handleClickOutside);
			return () => document.removeEventListener('mousedown', handleClickOutside);
		}
	}, [isOpen]);

	function handleSelect(priority: TaskPriority) {
		onChange(priority);
		setIsOpen(false);
	}

	function handleToggle() {
		setIsOpen(!isOpen);
	}

	return (
		<div ref={containerRef} style={{ position: 'relative', minWidth: 'fit-content', maxWidth: '100%' }}>
			<div
				onClick={handleToggle}
				style={{
					...getPriorityStyle(value, false),
					cursor: 'pointer',
					minHeight: 'var(--control-sm-height)',
					display: 'inline-flex',
					alignItems: 'center',
					justifyContent: 'center',
				}}
			>
				{selectedOption.label}
			</div>
			{isOpen && (
				<div
					style={{
						position: 'absolute',
						top: '100%',
						left: 0,
						marginTop: 'var(--space-xs)',
						background: 'var(--white)',
						border: 'var(--border-default)',
						borderRadius: 'var(--radius-md)',
						boxShadow: 'var(--shadow-sm)',
						zIndex: 'var(--z-index-modal)',
						minWidth: 'max-content',
					}}
				>
					{PRIORITY_OPTIONS.map((option) => {
						const isSelected = value === option.value;
						return (
							<div
								key={option.value}
								onClick={() => handleSelect(option.value)}
								style={{
									padding: 'var(--space-xs) var(--space-sm)',
									cursor: 'pointer',
									borderBottom: option.value === PRIORITY_OPTIONS[PRIORITY_OPTIONS.length - 1].value ? 'none' : 'var(--border-width) solid var(--border)',
									background: isSelected ? 'var(--panel-hover)' : undefined,
								}}
								onMouseEnter={(e) => {
									(e.currentTarget as HTMLElement).style.background = 'var(--panel-hover)';
								}}
								onMouseLeave={(e) => {
									(e.currentTarget as HTMLElement).style.background = isSelected ? 'var(--panel-hover)' : '';
								}}
							>
								<div style={getPriorityStyle(option.value, isSelected)}>
									{option.label}
								</div>
							</div>
						);
					})}
				</div>
			)}
		</div>
	);
}
