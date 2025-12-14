import React, { useMemo } from 'react';
import type { ExtraWork } from '../types/extra-work.types';
import { getToken, getTokenString } from '@/shared/lib/tokens';
import { formatCurrencyRub } from '@/shared/lib/format';
import { EXTRA_WORK_CALENDAR_CELL_MIN_HEIGHT, OPACITY_INACTIVE } from '../utils/constants';
import { isFullyPaid, getPaymentStatus, getPaidPercent } from '../utils/extraWorkUtils';
import { getCalendarCellStyle, getDayNumberStyle, getWorkAmountStyle, formatWorkTooltip, getDayPaymentStatus, getCalendarCellBorderColor } from '../utils/extraWorkRenderUtils';

type ExtraWorkCalendarDayCellProps = {
	day: Date;
	dateKey: string;
	isCurrentMonth: boolean;
	isToday: boolean;
	isSelected: boolean;
	works: ExtraWork[];
	onClick: (e: React.MouseEvent) => void;
};

export function ExtraWorkCalendarDayCell({
	day,
	dateKey,
	isCurrentMonth,
	isToday,
	isSelected,
	works,
	onClick,
}: ExtraWorkCalendarDayCellProps): React.ReactElement {
	const opacityFull = useMemo(() => getToken('--opacity-full', 1), []);
	const borderWidth = useMemo(() => getToken('--border-width-md', 2), []);
	const itemGap = useMemo(() => getTokenString('--extra-work-item-gap', '2px'), []);
	
	const hasWork = works.length > 0;
	const paymentStatus = useMemo(() => hasWork ? getDayPaymentStatus(works) : undefined, [hasWork, works]);
	const cellStyle = getCalendarCellStyle(isCurrentMonth, isSelected, hasWork, paymentStatus);
	const borderColor = useMemo(() => getCalendarCellBorderColor(isSelected, paymentStatus), [isSelected, paymentStatus]);

	return (
		<div
			key={dateKey}
			onClick={onClick}
			style={{
				minHeight: `${EXTRA_WORK_CALENDAR_CELL_MIN_HEIGHT}px`,
				padding: 'var(--space-sm)',
				...cellStyle,
				border: isCurrentMonth && (isSelected || hasWork)
					? `${borderWidth}px solid ${borderColor}`
					: 'var(--border-default)',
				borderRadius: 'var(--radius-md)',
				opacity: isCurrentMonth ? opacityFull : OPACITY_INACTIVE,
				position: 'relative',
				transition: 'all var(--transition-base)',
			}}
		>
			<div
				style={{
					...getDayNumberStyle(isToday, isCurrentMonth),
					marginBottom: 'var(--space-xs)',
				}}
			>
				{day.getDate()}
			</div>

			{hasWork && (
				<div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--muted)' }}>
					{works.map((work) => {
						const workIsFullyPaid = isFullyPaid(work);
						const paidPercent = getPaidPercent(work);
						const paymentStatus = getPaymentStatus(work);
						
						// Определяем, является ли день выходным (суббота или воскресенье)
						const isWeekend = day.getDay() === 0 || day.getDay() === 6;
						// Используем weekendRate для выходных, если он указан, иначе dailyRate
						const displayRate = isWeekend && work.weekendRate !== undefined ? work.weekendRate : work.dailyRate;
						const rateType = isWeekend && work.weekendRate !== undefined ? 'выходной' : 'будни';
						
						return (
							<div
								key={work.id}
								style={{
									marginBottom: itemGap,
									...getWorkAmountStyle(paidPercent, workIsFullyPaid),
								}}
								title={`Доп работа • ${displayRate.toLocaleString('ru-RU')}₽ за смену (${rateType})\nСтатус: ${paymentStatus}`}
							>
								{formatCurrencyRub(displayRate)}
							</div>
						);
					})}
				</div>
			)}
		</div>
	);
}

