import React, { useMemo, useRef, useState, useEffect, useLayoutEffect } from 'react';
import type { Task } from '@/store/board';
import type { Customer } from '@/store/customers';
import { CustomerChip } from '@/shared/ui';
import { getHolidayTheme, type StoredHoliday } from '../utils/holidayUtils';
import { optimizeTaskOrder } from '../utils/taskUtils';
import { 
	EMOJI_ANIMATION_DELAYS, 
	EMOJI_ANIMATION_DURATIONS, 
	CHIP_GAP,
	CALENDAR_CELL_MIN_HEIGHT,
	CALENDAR_CELL_PADDING_ALLOWANCE_HOLIDAY,
	CALENDAR_CELL_PADDING_ALLOWANCE_NORMAL,
	CALENDAR_CELL_BORDER_WIDTH_TODAY,
	CALENDAR_CELL_OPACITY_INACTIVE,
	CALENDAR_HOLIDAYS_GAP,
} from '../utils/constants';
import { getToken } from '@/shared/lib/tokens';

type CalendarDayCellProps = {
	day: Date;
	index: number;
	dayTasks: Task[];
	isCurrentMonth: boolean;
	isToday: boolean;
	isWeekend: boolean;
	holidays: StoredHoliday[];
	holiday: StoredHoliday | null;
	customers: Customer[];
	onDayClick: (day: Date, dayTasks: Task[]) => void;
	viewportKey: number;
};

export function CalendarDayCell({
	day,
	index,
	dayTasks,
	isCurrentMonth,
	isToday,
	isWeekend,
	holidays,
	holiday,
	customers,
	onDayClick,
	viewportKey,
}: CalendarDayCellProps): React.ReactElement {
	const isHoliday = holidays.length > 0;
	const isClickable = dayTasks.length > 0 || isWeekend || isCurrentMonth;
	const cardRef = useRef<HTMLDivElement | null>(null);
	const headerRef = useRef<HTMLDivElement | null>(null);
	const holidaysRef = useRef<HTMLDivElement | null>(null);
	const chipsRef = useRef<HTMLDivElement | null>(null);
	const [maxVisibleChips, setMaxVisibleChips] = useState(dayTasks.length);
	const [isHovered, setIsHovered] = useState(false);
	const [containerWidth, setContainerWidth] = useState(0);

	// Мемоизируем значения токенов
	const cardPadding = useMemo(() => getToken('--space-sm', 8), []);
	const fontSizeSm = useMemo(() => getToken('--font-size-sm', 13), []);
	const fontSizeXs = useMemo(() => getToken('--font-size-xs', 11), []);

	const theme = isHoliday && holiday ? getHolidayTheme(holiday.name, holiday.date) : null;
	const weekendBackground = 'var(--bg)';
	const baseBackground = isWeekend 
		? weekendBackground
		: (isCurrentMonth ? (dayTasks.length === 0 ? 'var(--bg)' : 'var(--panel)') : 'var(--bg)');
	const hoverBackground = isWeekend 
		? weekendBackground
		: (isCurrentMonth ? 'var(--bg)' : 'var(--panel)');

	useEffect(() => {
		setMaxVisibleChips(dayTasks.length);
	}, [dayTasks.length, holidays.length, viewportKey]);

	// Измеряем ширину контейнера для оптимизации
	useLayoutEffect(() => {
		if (cardRef.current) {
			const cardWidth = cardRef.current.clientWidth;
			const padding = cardPadding * 2;
			const width = Math.max(0, cardWidth - padding);
			if (width > 0) {
				setContainerWidth(width);
			}
		}
	}, [viewportKey, dayTasks.length, cardPadding]);

	useLayoutEffect(() => {
		if (!cardRef.current || !chipsRef.current) return;
		const headerHeight = headerRef.current?.offsetHeight ?? 0;
		const holidaysHeight = holidaysRef.current?.offsetHeight ?? 0;
		const paddingAllowance = isHoliday ? CALENDAR_CELL_PADDING_ALLOWANCE_HOLIDAY : CALENDAR_CELL_PADDING_ALLOWANCE_NORMAL;
		const availableHeight = Math.max(0, cardRef.current.clientHeight - headerHeight - holidaysHeight - paddingAllowance);
		const container = chipsRef.current;
		const children = Array.from(container.children) as HTMLElement[];
		if (children.length === 0) return;
		
		const lastChild = children[children.length - 1];
		const lastBottom = lastChild.offsetTop + lastChild.offsetHeight;
		if (lastBottom <= availableHeight + 0.5) {
			return;
		}
		
		let allowed = children.length;
		while (allowed > 1) {
			const child = children[allowed - 1];
			if (!child) break;
			const bottom = child.offsetTop + child.offsetHeight;
			if (bottom <= availableHeight) {
				break;
			}
			allowed--;
		}
		
		allowed = Math.max(1, allowed);
		
		if (allowed !== maxVisibleChips) {
			setMaxVisibleChips(allowed);
		}
	}, [dayTasks.length, isHoliday, maxVisibleChips, viewportKey, containerWidth]);

	const visibleTasks = dayTasks.slice(0, maxVisibleChips);
	const optimizedTasks = useMemo(() => {
		if (containerWidth > 0 && visibleTasks.length > 1) {
			return optimizeTaskOrder(visibleTasks, customers, containerWidth, CHIP_GAP);
		}
		return visibleTasks;
	}, [visibleTasks, customers, containerWidth]);

	const hiddenTasksCount = Math.max(0, dayTasks.length - visibleTasks.length);

	// Функция для склонения слова "задача"
	const getTaskWord = (count: number): string => {
		const lastDigit = count % 10;
		const lastTwoDigits = count % 100;
		if (lastTwoDigits >= 11 && lastTwoDigits <= 19) {
			return 'задач';
		} else if (lastDigit === 1) {
			return 'задача';
		} else if (lastDigit >= 2 && lastDigit <= 4) {
			return 'задачи';
		}
		return 'задач';
	};

	return (
		<div
			ref={cardRef}
			key={index}
			onClick={() => onDayClick(day, dayTasks)}
			style={{
				minHeight: CALENDAR_CELL_MIN_HEIGHT,
				padding: `var(--space-sm)`,
				border: isToday ? `${CALENDAR_CELL_BORDER_WIDTH_TODAY}px solid var(--accent)` : 'var(--border-width) solid var(--border)',
				borderRadius: 'var(--radius-s)',
				background: baseBackground,
				opacity: isCurrentMonth ? 'var(--opacity-full)' : CALENDAR_CELL_OPACITY_INACTIVE,
				overflow: 'hidden',
				cursor: isClickable ? 'pointer' : 'default',
				transition: 'var(--transition-base)',
				position: 'relative',
			}}
			onMouseEnter={(e) => {
				if (isClickable) {
					setIsHovered(true);
					(e.currentTarget as HTMLElement).style.background = hoverBackground;
					(e.currentTarget as HTMLElement).style.transform = 'scale(1.02)';
				}
			}}
			onMouseLeave={(e) => {
				setIsHovered(false);
				(e.currentTarget as HTMLElement).style.background = baseBackground;
				(e.currentTarget as HTMLElement).style.transform = 'scale(1)';
			}}
		>
			{isHoliday && holiday && theme && theme.emoji.map((emoji, emojiIdx) => {
				const pos = theme.emojiPositions[emojiIdx] || {};
				const baseRotMatch = pos.transform?.match(/rotate\(([^)]+)\)/);
				const baseRotDeg = baseRotMatch ? parseFloat(baseRotMatch[1]) : 0;
				return (
					<div
						key={emojiIdx}
						className="holiday-emoji"
						style={{
							position: 'absolute',
							fontSize: `var(--font-size-2xl)`,
							lineHeight: 'var(--line-height-tight)',
							pointerEvents: 'none',
							zIndex: 0,
							opacity: isCurrentMonth ? 'var(--opacity-full)' : CALENDAR_CELL_OPACITY_INACTIVE,
							animationDelay: `${EMOJI_ANIMATION_DELAYS[emojiIdx] || emojiIdx * 0.75}s`,
							animationDuration: `${EMOJI_ANIMATION_DURATIONS[emojiIdx] || 3}s`,
							top: pos.top,
							left: pos.left,
							right: pos.right,
							bottom: pos.bottom,
							'--base-rotation': `${baseRotDeg}`,
						} as React.CSSProperties & { '--base-rotation': string }}
					>
						{emoji}
					</div>
				);
			})}
			<div
				ref={headerRef}
				style={{ 
					display: 'flex', 
					justifyContent: 'space-between', 
					alignItems: 'center', 
					marginBottom: `var(--space-sm)`, 
					position: 'relative', 
					zIndex: 10 
				}}
			>
				<div
					style={{
						fontWeight: isToday ? 'var(--font-weight-bold)' : 'var(--font-weight-semibold)',
						fontSize: `var(--font-size-sm)`,
						color: isToday ? 'var(--accent)' : (isWeekend ? 'var(--muted)' : 'var(--text)'),
					}}
				>
					{day.getDate()}
				</div>
				{hiddenTasksCount > 0 && (
					<div style={{ 
						fontSize: `var(--font-size-xs)`, 
						fontWeight: 'var(--font-weight-medium)', 
						color: 'var(--muted)' 
					}}>
						+{hiddenTasksCount} {getTaskWord(hiddenTasksCount)} еще
					</div>
				)}
			</div>
			<div
				ref={holidaysRef}
				style={{
					display: holidays.length > 0 ? 'flex' : 'none',
					flexDirection: 'column',
					gap: `${CALENDAR_HOLIDAYS_GAP}px`,
					marginBottom: `var(--space-xs)`,
					position: 'relative',
					zIndex: 2,
				}}
			>
				{holidays.slice(0, 2).map((h) => (
					<div
						key={h.id}
						style={{
							fontSize: `var(--font-size-xs)`,
							fontWeight: 'var(--font-weight-semibold)',
							color: 'var(--text)',
							textAlign: 'center',
							padding: `var(--space-xs) var(--space-sm)`,
							background: 'var(--bg)',
							borderRadius: 'var(--radius-md)',
							border: 'var(--border-default)',
							opacity: isCurrentMonth ? 'var(--opacity-full)' : CALENDAR_CELL_OPACITY_INACTIVE,
							display: 'flex',
							alignItems: 'center',
							justifyContent: 'center',
							gap: `var(--space-xs)`,
						}}
					>
						<span>{h.name}</span>
					</div>
				))}
				{holidays.length > 2 && (
					<div
						style={{
							fontSize: `var(--font-size-xs)`,
							fontWeight: 'var(--font-weight-medium)',
							color: 'var(--muted)',
							textAlign: 'center',
							padding: `var(--space-xs)`,
						}}
					>
						+{holidays.length - 2} еще
					</div>
				)}
			</div>
			<div
				ref={chipsRef}
				style={{
					display: 'flex',
					flexWrap: 'wrap',
					gap: `${CHIP_GAP}px`,
					position: 'relative',
					zIndex: 1,
					opacity: isCurrentMonth ? 'var(--opacity-full)' : 'var(--opacity-inactive)',
				}}
			>
				{optimizedTasks.map((t) => {
					const customer = customers.find((c) => c.id === t.customerId);
					// При ховере или на выходных - белый фон
					const chipVariant = (isHovered || isWeekend) ? 'white' : 'default';
					return (
						<div key={t.id} title={t.title} style={{ minWidth: 0 }}>
							{customer ? (
								<CustomerChip name={customer.name} avatarUrl={customer.avatar} variant={chipVariant} />
							) : (
								<span style={{ fontSize: `var(--font-size-sm)`, fontWeight: 'var(--font-weight-medium)' }}>{t.title}</span>
							)}
						</div>
					);
				})}
			</div>
		</div>
	);
}

