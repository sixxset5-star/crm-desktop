import React, { useMemo } from 'react';
import { formatCurrencyRub } from '@/shared/lib/format';
import { extractDateKey } from '../utils/extraWorkUtils';
import { parseNumberSafe } from '@/shared/utils/number-validation';

type ExtraWorkShiftFormHeaderProps = {
	workDatesCount: number;
	dailyRate: string;
	weekendRate?: string;
	totalAmount: number;
	workDates: string[];
};

export function ExtraWorkShiftFormHeader({
	workDatesCount,
	dailyRate,
	weekendRate,
	totalAmount,
	workDates,
}: ExtraWorkShiftFormHeaderProps): React.ReactElement {
	const calculationText = useMemo(() => {
		const rate = parseNumberSafe(dailyRate) ?? 0;
		const weekendRateValue = weekendRate ? (parseNumberSafe(weekendRate) ?? undefined) : undefined;
		
		if (!weekendRateValue) {
			return `${workDatesCount} дней × ${rate}₽ = ${formatCurrencyRub(totalAmount)}`;
		}

		// Подсчитываем будни и выходные
		let weekdaysCount = 0;
		let weekendsCount = 0;

		workDates.forEach((dateStr) => {
			const dateKey = extractDateKey(dateStr);
			// Используем локальную дату из dateKey, чтобы избежать проблем с часовыми поясами
			// dateKey имеет формат YYYY-MM-DD
			const [year, month, day] = dateKey.split('-').map(Number);
			const date = new Date(year, month - 1, day); // month - 1 потому что в JS месяцы 0-11
			// В доп работе выходные = только суббота (6) и воскресенье (0), независимо от настроек календаря
			const isWeekend = date.getDay() === 0 || date.getDay() === 6;

			if (isWeekend) {
				weekendsCount++;
			} else {
				weekdaysCount++;
			}
		});

		if (weekendsCount === 0) {
			return `${workDatesCount} дней × ${rate}₽ = ${formatCurrencyRub(totalAmount)}`;
		}

		if (weekdaysCount === 0) {
			return `${workDatesCount} дней × ${weekendRateValue}₽ = ${formatCurrencyRub(totalAmount)}`;
		}

		return `${weekdaysCount} будн. × ${rate}₽ + ${weekendsCount} вых. × ${weekendRateValue}₽ = ${formatCurrencyRub(totalAmount)}`;
	}, [workDatesCount, dailyRate, weekendRate, totalAmount, workDates]);

	return (
		<>
			{/* Итоговая сумма */}
			<label className="col-span">
				<span>Итого</span>
				<div style={{
					padding: 'var(--space-md)',
					background: 'var(--accent-soft)',
					border: 'var(--border-default)',
					borderRadius: 'var(--radius-md)',
					fontSize: 'var(--font-size-lg)',
					fontWeight: 'var(--font-weight-semibold)',
					color: 'var(--accent-contrast)',
				}}>
					{calculationText}
				</div>
			</label>
		</>
	);
}

