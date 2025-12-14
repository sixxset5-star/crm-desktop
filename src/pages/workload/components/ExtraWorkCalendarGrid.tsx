import React, { useMemo } from 'react';
import { ExtraWorkCalendarWeek } from './ExtraWorkCalendarWeek';
import { WEEK_DAYS } from '../utils/constants';
import { getDaysInMonth, getWeekStart } from '../utils/dateUtils';
import type { ExtraWork } from '../types/extra-work.types';

type ExtraWorkCalendarGridProps = {
	currentMonth: Date;
	selectedDates: string[];
	worksByDate: Map<string, ExtraWork[]>;
	onDayClick: (day: Date, e: React.MouseEvent) => void;
};

export function ExtraWorkCalendarGrid({
	currentMonth,
	selectedDates,
	worksByDate,
	onDayClick,
}: ExtraWorkCalendarGridProps): React.ReactElement {
	const monthStart = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
	const monthEnd = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0);
	const weekStart = getWeekStart(monthStart);

	const days = useMemo(() => {
		const monthDays = getDaysInMonth(currentMonth.getFullYear(), currentMonth.getMonth());
		const daysBefore = Math.floor((monthStart.getTime() - weekStart.getTime()) / (1000 * 60 * 60 * 24));
		const before = Array.from({ length: daysBefore }, (_, i) => {
			const d = new Date(weekStart);
			d.setDate(d.getDate() + i);
			return d;
		});
		const after = Array.from({ length: 42 - before.length - monthDays.length }, (_, i) => {
			const d = new Date(monthEnd);
			d.setDate(d.getDate() + i + 1);
			return d;
		});
		return [...before, ...monthDays, ...after];
	}, [currentMonth, monthStart, weekStart, monthEnd]);

	// Разбиваем дни на недели (по 7 дней)
	const weeks = useMemo(() => {
		const result: Date[][] = [];
		for (let i = 0; i < days.length; i += 7) {
			result.push(days.slice(i, i + 7));
		}
		return result;
	}, [days]);

	return (
		<div
			style={{
				display: 'grid',
				gridTemplateColumns: 'repeat(7, minmax(0, 1fr))',
				gap: 'var(--space-sm)',
				background: 'var(--panel)',
				padding: 'var(--space-md)',
				borderRadius: 'var(--radius-l)',
				border: 'var(--border-default)',
				flex: 1,
				minHeight: 0,
				overflowY: 'auto',
			}}
		>
			{/* Дни недели */}
			{WEEK_DAYS.map((d) => (
				<div
					key={d}
					style={{
						textAlign: 'center',
						fontWeight: 'var(--font-weight-bold)',
						padding: 'var(--space-sm)',
						color: 'var(--text)',
						fontSize: 'var(--font-size-sm)',
					}}
				>
					{d}
				</div>
			))}

			{/* Недели */}
			{weeks.map((week, weekIdx) => (
				<ExtraWorkCalendarWeek
					key={weekIdx}
					days={week}
					currentMonth={currentMonth}
					selectedDates={selectedDates}
					worksByDate={worksByDate}
					onDayClick={onDayClick}
				/>
			))}
		</div>
	);
}




