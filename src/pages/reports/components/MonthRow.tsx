import React from 'react';
import { formatCurrencyRub } from '@/shared/lib/format';
import { getBarColor } from '../utils/colorUtils';
import { REPORTS_MONTH_LABEL_MIN_WIDTH, REPORTS_TASK_COUNT_MIN_WIDTH, REPORTS_TEXT_SHADOW } from '../utils/constants';
import type { MonthlyDataItem } from '../utils/calculateMonthlyData';

type MonthRowProps = {
	monthData: MonthlyDataItem;
	maxProfit: number;
	minProfit: number;
	onClick: () => void;
};

export function MonthRow({ monthData, maxProfit, minProfit, onClick }: MonthRowProps): React.ReactElement {
	const { label, profit, count } = monthData;

	return (
		<div
			style={{
				display: 'flex',
				alignItems: 'center',
				gap: 'var(--space-md)',
				padding: 'var(--space-md)',
				borderRadius: 'var(--radius-md)',
				cursor: 'pointer',
				transition: 'background var(--transition-base)',
			}}
			onClick={onClick}
			onMouseEnter={(e) => {
				e.currentTarget.style.background = 'var(--panel-hover)';
			}}
			onMouseLeave={(e) => {
				e.currentTarget.style.background = 'transparent';
			}}
			title="Показать задачи месяца"
		>
			<div
				style={{
					minWidth: REPORTS_MONTH_LABEL_MIN_WIDTH,
					fontWeight: 'var(--font-weight-semibold)',
					color: 'var(--text)',
					fontSize: 'var(--font-size-md)',
				}}
			>
				{label}
			</div>
			<div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 'var(--space-md)' }}>
				<div
					style={{
						flex: 1,
						height: 'var(--control-lg-height)',
						background: 'var(--bg)',
						borderRadius: 'var(--radius-md)',
						overflow: 'hidden',
						position: 'relative',
						border: 'var(--border-default)',
					}}
				>
					{profit > 0 && (
						<div
							style={{
								width: `${Math.max(0, (profit / maxProfit) * 100)}%`,
								height: '100%',
								background: getBarColor(profit, minProfit, maxProfit),
								transition: 'width var(--transition-base), background var(--transition-base)',
							}}
						/>
					)}
					<div
						style={{
							position: 'absolute',
							left: 'var(--space-md)',
							top: '50%',
							transform: 'translateY(-50%)',
							fontSize: 'var(--font-size-sm)',
							fontWeight: 'var(--font-weight-semibold)',
							color: profit > 0 ? 'var(--white)' : 'var(--muted)',
							textShadow: profit > 0 ? REPORTS_TEXT_SHADOW : 'none',
						}}
					>
						{formatCurrencyRub(profit)}
					</div>
				</div>
				<div
					style={{
						minWidth: REPORTS_TASK_COUNT_MIN_WIDTH,
						textAlign: 'right',
						fontSize: 'var(--font-size-md)',
						fontWeight: 'var(--font-weight-semibold)',
						color: 'var(--text)',
					}}
				>
					{count} {count === 1 ? 'задача' : count < 5 ? 'задачи' : 'задач'}
				</div>
			</div>
		</div>
	);
}

