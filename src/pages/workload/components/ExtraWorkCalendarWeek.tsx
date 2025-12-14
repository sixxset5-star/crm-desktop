import React from 'react';
import { ExtraWorkCalendarDayCell } from './ExtraWorkCalendarDayCell';
import type { ExtraWork } from '../types/extra-work.types';
import { getDateKeyFromDate } from '../utils/extraWorkUtils';
import { isTodayDate } from '../utils/extraWorkRenderUtils';

type ExtraWorkCalendarWeekProps = {
	days: Date[];
	currentMonth: Date;
	selectedDates: string[];
	worksByDate: Map<string, ExtraWork[]>;
	onDayClick: (day: Date, e: React.MouseEvent) => void;
};

export function ExtraWorkCalendarWeek({
	days,
	currentMonth,
	selectedDates,
	worksByDate,
	onDayClick,
}: ExtraWorkCalendarWeekProps): React.ReactElement {
	return (
		<>
			{days.map((day, idx) => {
				const dateKey = getDateKeyFromDate(day);
				const isCurrentMonth = day.getMonth() === currentMonth.getMonth();
				const isToday = isTodayDate(day);
				const isSelected = selectedDates.includes(dateKey);
				const works = worksByDate.get(dateKey) || [];

				return (
					<ExtraWorkCalendarDayCell
						key={`${dateKey}-${idx}`}
						day={day}
						dateKey={dateKey}
						isCurrentMonth={isCurrentMonth}
						isToday={isToday}
						isSelected={isSelected}
						works={works}
						onClick={(e) => onDayClick(day, e)}
					/>
				);
			})}
		</>
	);
}




