import React, { useMemo } from 'react';
import type { Task } from '@/types';
import type { Customer } from '@/types';
import { MetricCard } from '@/shared/components/MetricCard';
import { Modal, ModalFooter } from '@/shared/ui/Modal';
import { CustomerChip } from '@/shared/ui';
import { formatCurrencyRub, formatDateWithSettings as formatDate } from '@/shared/lib/format';
import { getToken } from '@/shared/lib/tokens';
import { ChartAxis } from './ChartAxis';
import { ChartGrid } from './ChartGrid';
import { ChartBar } from './ChartBar';
import { calculateZeroLinePosition } from '../utils/chartUtils';

type FinancialSummarySectionProps = {
	currentFinancialGoalData: {
		totalGoal: number;
		completedTotal: number;
		remainingTotal: number;
		completedExpensesAmount: number;
		completedExpensesCount: number;
		remainingExpensesAmount: number;
		remainingExpensesCount: number;
		totalExpensesCount: number;
		paidCreditsAmount: number;
		unpaidCreditsAmount: number;
		totalCreditsCount: number;
		paidCreditsCount: number;
	};
	totals: {
		totalIncome: number;
		incomeFromSites: number;
		averageCheck: number;
		additionalIncome: number;
		profit: number;
		expected: number;
		tax: number;
		expenses: number;
	};
	sparkData: {
		coords: string;
		coordsPoints: Array<{ x: number; y: number; value: number; hasData: boolean }>;
		dayProfit: number[];
		dayData: Array<{
			profit: number;
			tasks: Array<{ task: Task; amount: number; type: 'payment' | 'expense'; paymentTitle?: string; isAdditionalIncome?: boolean }>;
			date: string;
			hasAdditionalIncome?: boolean;
		}>;
		max: number;
		min: number;
		maxProfit: number;
		minProfit: number;
		minPositive: number;
		days: string[];
	};
	creditsSparkData?: {
		dayData: Array<{
			amount: number;
			credits: Array<{ credit: { id: string; name: string; monthlyPayment?: number }; amount: number }>;
			date: string;
			dayNumber: number;
		}>;
		dayAmounts: number[];
		max: number;
		min: number;
		maxAmount: number;
		minAmount: number;
		totalAmount: number;
		averageAmount: number;
		days: string[];
	};
	customers: Customer[];
};

export function FinancialSummarySection({
	currentFinancialGoalData,
	totals,
	sparkData,
	creditsSparkData,
	customers,
}: FinancialSummarySectionProps): React.ReactElement {
	const [graphPopup, setGraphPopup] = React.useState<number | null>(null);
	const [hoveredBarIndex, setHoveredBarIndex] = React.useState<number | null>(null);
	const [creditsGraphPopup, setCreditsGraphPopup] = React.useState<number | null>(null);
	const [creditsHoveredBarIndex, setCreditsHoveredBarIndex] = React.useState<number | null>(null);

	const hasAdditionalIncomeDays = React.useMemo(
		() => sparkData.dayData.some((d) => d.hasAdditionalIncome),
		[sparkData.dayData]
	);
	return (
		<section className="financial">
			<h2>Финансовая сводка</h2>

			{currentFinancialGoalData.totalGoal > 0 && (
				<div style={{ marginBottom: 'var(--space-lg)', padding: 'var(--space-lg)', background: 'var(--panel)', border: 'var(--border-default)', borderRadius: 'var(--radius-md)' }}>
					<div style={{ fontSize: 'var(--font-size-md)', fontWeight: 'var(--font-weight-semibold)', marginBottom: 'var(--space-md)', color: 'var(--text)' }}>Сравнение с финансовой целью</div>
					<div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 'var(--space-md)' }}>
						<MetricCard
							title="Цель"
							value={formatCurrencyRub(currentFinancialGoalData.totalGoal)}
							valueColor="var(--accent)"
							explanation="Суммарные расходы и обязательные платежи месяца."
							border={false}
						/>
						<MetricCard
							title="Выполнено"
							value={formatCurrencyRub(currentFinancialGoalData.completedTotal)}
							valueColor={computeGoalColor(currentFinancialGoalData.completedTotal, currentFinancialGoalData.totalGoal)}
							explanation="Фактически закрытые расходы и оплаченные кредиты."
							border={false}
						/>
						<MetricCard
							title="Осталось"
							value={formatCurrencyRub(currentFinancialGoalData.remainingTotal)}
							valueColor={computeRemainingColor(currentFinancialGoalData.remainingTotal, currentFinancialGoalData.totalGoal)}
							explanation="Невыполненные расходы и неоплаченные кредиты."
							border={false}
						/>
					</div>
					<div style={{ marginTop: 'var(--space-md)' }}>
						<Progress value={currentFinancialGoalData.completedTotal} total={currentFinancialGoalData.totalGoal} remaining={currentFinancialGoalData.remainingTotal} />
					</div>
				</div>
			)}

			<div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
				<IncomeGrid totals={totals} />
				<ExpenseGrid totals={totals} />
			</div>

			<MonthlyChart
				sparkData={sparkData}
				hoveredBarIndex={hoveredBarIndex}
				setHoveredBarIndex={setHoveredBarIndex}
				onBarClick={setGraphPopup}
				hasAdditionalIncomeDays={hasAdditionalIncomeDays}
			/>

			{creditsSparkData && (
				<CreditsChart
					creditsSparkData={creditsSparkData}
					hoveredBarIndex={creditsHoveredBarIndex}
					setHoveredBarIndex={setCreditsHoveredBarIndex}
					onBarClick={setCreditsGraphPopup}
				/>
			)}

			{creditsSparkData && (
				<CreditsDayDetailsPopup
					open={creditsGraphPopup !== null && creditsGraphPopup >= 0 && creditsGraphPopup < creditsSparkData.dayData.length}
					onClose={() => setCreditsGraphPopup(null)}
					dayInfo={creditsGraphPopup !== null ? creditsSparkData.dayData[creditsGraphPopup] : null}
				/>
			)}

			<DayDetailsPopup
				open={graphPopup !== null && graphPopup >= 0 && graphPopup < sparkData.dayData.length}
				onClose={() => setGraphPopup(null)}
				dayInfo={graphPopup !== null ? sparkData.dayData[graphPopup] : null}
				customers={customers}
			/>
		</section>
	);
}

const tintColor = (colorVar: string, whiteness = 60): string => {
	const colorPortion = 100 - whiteness;
	return `color-mix(in srgb, ${colorVar} ${colorPortion}%, var(--white) ${whiteness}%)`;
};

function computeGoalColor(completed: number, total: number): string {
	if (total <= 0) return 'var(--green)';
	const percent = (completed / total) * 100;
	if (percent >= 100) return 'var(--green)';
	if (percent >= 80) return tintColor('var(--green)', 30);
	if (percent >= 60) return tintColor('var(--green)', 45);
	if (percent >= 40) return 'var(--warning)';
	if (percent >= 20) return tintColor('var(--warning)', 35);
	return 'var(--red)';
}

function computeRemainingColor(remaining: number, total: number): string {
	if (total <= 0) return 'var(--green)';
	const percent = (remaining / total) * 100;
	if (percent < 30) return 'var(--green)';
	if (percent > 60) return 'var(--red)';
	return 'var(--warning)';
}

function Progress({ value, total, remaining }: { value: number; total: number; remaining: number }): React.ReactElement {
	const percent = total > 0 ? Math.min(100, (value / total) * 100) : 0;
	const color = computeGoalColor(value, total);
	return (
		<div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
			<div style={{ width: '100%', height: 'var(--control-sm-height)', background: 'var(--border)', borderRadius: 'var(--radius-md)', overflow: 'hidden', position: 'relative' }}>
				<div style={{ width: `${percent}%`, height: '100%', background: color, transition: 'width 0.3s, background 0.3s', borderRadius: 'var(--radius-md)' }} />
			</div>
			<div style={{ fontSize: 'var(--font-size-xs)', fontWeight: 'var(--font-weight-medium)', color: 'var(--muted)', textAlign: 'center' }}>
				{Math.round(percent)}% {percent >= 100 ? '✓ Цель выполнена!' : `- Осталось заработать ${formatCurrencyRub(remaining)}`}
			</div>
		</div>
	);
}

function IncomeGrid({ totals }: { totals: FinancialSummarySectionProps['totals'] }): React.ReactElement {
	const showAdditionalIncome = totals.additionalIncome > 0;
	return (
		<div
			style={{
				display: 'grid',
				gridTemplateColumns: showAdditionalIncome ? 'repeat(4, 1fr)' : 'repeat(2, 1fr)',
				gap: 'var(--space-md)',
			}}
		>
			<MetricCard title="Общий доход" value={formatCurrencyRub(totals.totalIncome)} valueColor="var(--green)" explanation="Доход за сайты + дополнительные поступления." border={false} />
			{showAdditionalIncome && (
				<MetricCard title="Доход за сайты" value={formatCurrencyRub(totals.incomeFromSites)} valueColor="var(--green)" explanation="Оплаченные платежи в текущем месяце." border={false} />
			)}
			<MetricCard title="Средний чек" value={formatCurrencyRub(totals.averageCheck)} valueColor="var(--accent)" explanation="Средняя сумма оплаченных платежей в текущем месяце. Рассчитывается как сумма всех оплаченных платежей, делённая на количество задач с платежами." border={false} />
			{showAdditionalIncome && (
				<MetricCard title="Доп. доход" value={formatCurrencyRub(totals.additionalIncome)} valueColor="var(--accent-soft)" explanation="Независимые от задач поступления." border={false} />
			)}
		</div>
	);
}

function ExpenseGrid({ totals }: { totals: FinancialSummarySectionProps['totals'] }): React.ReactElement {
	return (
		<div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 'var(--space-md)' }}>
			<MetricCard title="Прибыль" value={formatCurrencyRub(totals.profit)} valueColor={totals.profit >= 0 ? 'var(--green)' : 'var(--red)'} explanation="Доход − Расходы − Налоги." border={false} />
			<MetricCard title="Ожидается" value={formatCurrencyRub(totals.expected)} valueColor="var(--accent)" explanation="Непоступившие платежи месяцу." border={false} />
			<MetricCard title="Налоги" value={formatCurrencyRub(totals.tax)} valueColor="var(--red)" explanation="Налоги по оплатам и доп. доходу." border={false} />
			<MetricCard title="Расходы" value={formatCurrencyRub(totals.expenses)} valueColor="var(--red)" explanation="Расходы задач текущего месяца." border={false} />
		</div>
	);
}

type MonthlyChartProps = {
	sparkData: FinancialSummarySectionProps['sparkData'];
	hoveredBarIndex: number | null;
	setHoveredBarIndex: (idx: number | null) => void;
	onBarClick: (idx: number | null) => void;
	hasAdditionalIncomeDays: boolean;
};

function MonthlyChart({ sparkData, hoveredBarIndex, setHoveredBarIndex, onBarClick, hasAdditionalIncomeDays }: MonthlyChartProps): React.ReactElement {
	const chartHeight = useMemo(() => getToken('--chart-height', 300), []);
	const axisWidth = useMemo(() => getToken('--chart-axis-width', 50), []);
	const barGap = useMemo(() => getToken('--chart-bar-gap', 2), []);
	const dateLabelHeight = useMemo(() => getToken('--chart-date-label-height', 20), []);
	const titleFontSize = useMemo(() => getToken('--font-size-sm', 13), []);
	const dateLabelFontSize = useMemo(() => getToken('--font-size-xs', 11), []);
	const statsFontSize = useMemo(() => getToken('--font-size-sm', 13), []);
	const legendIndicatorSize = useMemo(() => getToken('--chart-legend-indicator-size', 14), []);
	const legendIndicatorRadius = useMemo(() => getToken('--chart-legend-indicator-radius', 3), []);
	
	const zeroLinePercent = calculateZeroLinePosition(sparkData.max, sparkData.min);
	
	return (
		<div style={{ position: 'relative', padding: 'var(--space-lg)', width: '100%', boxSizing: 'border-box', background: 'var(--panel)', border: 'var(--border-default)', borderRadius: 'var(--radius-l)', marginTop: 'var(--space-lg)' }}>
			<div style={{ marginBottom: 'var(--space-md)', fontSize: titleFontSize, fontWeight: 'var(--font-weight-semibold)', color: 'var(--text)' }}>
				Прибыль за текущий месяц (по дням)
			</div>
			<div style={{ width: '100%', marginBottom: 'var(--space-sm)' }}>
				<div style={{ display: 'flex', alignItems: 'flex-end', gap: `${barGap}px`, height: `${chartHeight}px`, paddingLeft: `${axisWidth}px`, paddingRight: 0, position: 'relative', borderBottom: 'var(--border-bottom-default)' }}>
					<ChartAxis max={sparkData.max} min={sparkData.min} />
					<ChartGrid max={sparkData.max} min={sparkData.min} axisWidth={axisWidth} />

					{sparkData.dayData.map((dayInfo, idx) => {
						const profit = dayInfo.profit;
						const range = sparkData.max - sparkData.min || 1;
						const barHeightFromZero = profit >= 0 
							? (profit / range) * 100 
							: (Math.abs(profit) / range) * 100;
						const barColor = dayInfo.hasAdditionalIncome ? 'var(--accent-soft)' : (profit >= 0 ? 'var(--green)' : 'var(--red)');
						const hasData = dayInfo.tasks.length > 0;
						const isHovered = hoveredBarIndex === idx;

						return (
							<ChartBar
								key={idx}
								value={profit}
								barHeight={barHeightFromZero}
								zeroLinePercent={zeroLinePercent}
								barColor={barColor}
								hasData={hasData}
								isHovered={isHovered}
								index={idx}
								onMouseEnter={() => setHoveredBarIndex(idx)}
								onMouseLeave={() => setHoveredBarIndex(null)}
								onClick={() => onBarClick(idx)}
								isPositive={profit >= 0}
							/>
						);
					})}
				</div>
				<div style={{ display: 'flex', alignItems: 'flex-start', marginTop: 'var(--space-sm)', paddingLeft: `${axisWidth}px`, paddingRight: 0, gap: `${barGap}px`, height: `${dateLabelHeight}px` }}>
					{sparkData.dayData.map((dayInfo, idx) => {
						const date = new Date(dayInfo.date);
						const day = date.getDate();
						const month = date.getMonth() + 1;
						const shouldShow = dayInfo.tasks.length > 0;
						
						return (
							<div
								key={idx}
								style={{
									flex: 1,
									minWidth: 0,
									display: 'flex',
									justifyContent: 'center',
									alignItems: 'flex-start',
									fontSize: dateLabelFontSize,
									color: 'var(--muted)',
									fontWeight: 'var(--font-weight-medium)',
									whiteSpace: 'nowrap',
									visibility: shouldShow ? 'visible' : 'hidden',
								}}
							>
								{day}.{month}
							</div>
						);
					})}
				</div>
				<div style={{ marginTop: 'var(--space-lg)', fontSize: statsFontSize, color: 'var(--muted)', display: 'flex', gap: 'var(--space-lg)', flexWrap: 'wrap', paddingTop: 'var(--space-md)', borderTop: 'var(--border-top-default)' }}>
					{sparkData.dayProfit.length > 0 && (
						<>
							<span style={{ fontWeight: 'var(--font-weight-semibold)' }}>Макс: <strong style={{ color: 'var(--text)' }}>{formatCurrencyRub(sparkData.maxProfit)}</strong></span>
							<span style={{ fontWeight: 'var(--font-weight-semibold)' }}>Мин: <strong style={{ color: 'var(--text)' }}>{formatCurrencyRub(sparkData.minProfit)}</strong></span>
							<span style={{ fontWeight: 'var(--font-weight-semibold)' }}>Сегодня: <strong style={{ color: sparkData.dayProfit[sparkData.dayProfit.length - 1] >= 0 ? 'var(--green)' : 'var(--red)' }}>{formatCurrencyRub(sparkData.dayProfit[sparkData.dayProfit.length - 1] || 0)}</strong></span>
							<span style={{ fontWeight: 'var(--font-weight-semibold)' }}>Средняя: <strong style={{ color: 'var(--text)' }}>{formatCurrencyRub(sparkData.dayProfit.reduce((a, b) => a + b, 0) / sparkData.dayProfit.length)}</strong></span>
							{hasAdditionalIncomeDays && (
								<span style={{ fontWeight: 'var(--font-weight-semibold)', display: 'inline-flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
									<span style={{ width: legendIndicatorSize, height: legendIndicatorSize, borderRadius: legendIndicatorRadius, background: 'var(--accent-soft)', display: 'inline-block' }} />
									<span style={{ color: 'var(--text)' }}>— день с доп. доходом</span>
								</span>
							)}
						</>
					)}
				</div>
			</div>
		</div>
	);
}

type CreditsChartProps = {
	creditsSparkData: NonNullable<FinancialSummarySectionProps['creditsSparkData']>;
	hoveredBarIndex: number | null;
	setHoveredBarIndex: (idx: number | null) => void;
	onBarClick: (idx: number | null) => void;
};

function CreditsChart({ creditsSparkData, hoveredBarIndex, setHoveredBarIndex, onBarClick }: CreditsChartProps): React.ReactElement {
	const chartHeight = useMemo(() => getToken('--chart-height', 300), []);
	const axisWidth = useMemo(() => getToken('--chart-axis-width', 50), []);
	const barGap = useMemo(() => getToken('--chart-bar-gap', 2), []);
	const dateLabelHeight = useMemo(() => getToken('--chart-date-label-height', 20), []);
	const titleFontSize = useMemo(() => getToken('--font-size-sm', 13), []);
	const dateLabelFontSize = useMemo(() => getToken('--font-size-xs', 11), []);
	const statsFontSize = useMemo(() => getToken('--font-size-sm', 13), []);
	
	const zeroLinePercent = 100; // Для кредитов всегда снизу
	
	return (
		<div style={{ position: 'relative', padding: 'var(--space-lg)', width: '100%', boxSizing: 'border-box', background: 'var(--panel)', border: 'var(--border-default)', borderRadius: 'var(--radius-l)', marginTop: 'var(--space-lg)' }}>
			<div style={{ marginBottom: 'var(--space-md)', fontSize: titleFontSize, fontWeight: 'var(--font-weight-semibold)', color: 'var(--text)' }}>
				Кредиты за текущий месяц (по дням)
			</div>
			<div style={{ width: '100%', marginBottom: 'var(--space-sm)' }}>
				<div style={{ display: 'flex', alignItems: 'flex-end', gap: `${barGap}px`, height: `${chartHeight}px`, paddingLeft: `${axisWidth}px`, paddingRight: 0, position: 'relative', borderBottom: 'var(--border-bottom-default)' }}>
					<ChartAxis max={creditsSparkData.max} min={creditsSparkData.min} />
					<ChartGrid max={creditsSparkData.max} min={creditsSparkData.min} axisWidth={axisWidth} />

					{creditsSparkData.dayData.map((dayInfo, idx) => {
						const amount = dayInfo.amount;
						const range = creditsSparkData.max - creditsSparkData.min || 1;
						const barHeightFromZero = (amount / range) * 100;
						const barColor = 'var(--red)';
						const hasData = dayInfo.credits.length > 0;
						const isHovered = hoveredBarIndex === idx;

						return (
							<ChartBar
								key={idx}
								value={amount}
								barHeight={barHeightFromZero}
								zeroLinePercent={zeroLinePercent}
								barColor={barColor}
								hasData={hasData}
								isHovered={isHovered}
								index={idx}
								onMouseEnter={() => setHoveredBarIndex(idx)}
								onMouseLeave={() => setHoveredBarIndex(null)}
								onClick={() => onBarClick(idx)}
								isPositive={true}
							/>
						);
					})}
				</div>
				<div style={{ display: 'flex', alignItems: 'flex-start', marginTop: 'var(--space-sm)', paddingLeft: `${axisWidth}px`, paddingRight: 0, gap: `${barGap}px`, height: `${dateLabelHeight}px` }}>
					{creditsSparkData.dayData.map((dayInfo, idx) => {
						const date = new Date(dayInfo.date);
						const day = date.getDate();
						const month = date.getMonth() + 1;
						const shouldShow = dayInfo.credits.length > 0;
						
						return (
							<div
								key={idx}
								style={{
									flex: 1,
									minWidth: 0,
									display: 'flex',
									justifyContent: 'center',
									alignItems: 'flex-start',
									fontSize: dateLabelFontSize,
									color: 'var(--muted)',
									fontWeight: 'var(--font-weight-medium)',
									whiteSpace: 'nowrap',
									visibility: shouldShow ? 'visible' : 'hidden',
								}}
							>
								{day}.{month}
							</div>
						);
					})}
				</div>
				<div style={{ marginTop: 'var(--space-lg)', fontSize: statsFontSize, color: 'var(--muted)', display: 'flex', gap: 'var(--space-lg)', flexWrap: 'wrap', paddingTop: 'var(--space-md)', borderTop: 'var(--border-top-default)' }}>
					{creditsSparkData.dayAmounts.length > 0 && (
						<>
							<span style={{ fontWeight: 'var(--font-weight-semibold)' }}>Макс: <strong style={{ color: 'var(--text)' }}>{formatCurrencyRub(creditsSparkData.maxAmount)}</strong></span>
							<span style={{ fontWeight: 'var(--font-weight-semibold)' }}>Мин: <strong style={{ color: 'var(--text)' }}>{formatCurrencyRub(creditsSparkData.minAmount)}</strong></span>
							<span style={{ fontWeight: 'var(--font-weight-semibold)' }}>Всего: <strong style={{ color: 'var(--text)' }}>{formatCurrencyRub(creditsSparkData.totalAmount)}</strong></span>
							<span style={{ fontWeight: 'var(--font-weight-semibold)' }}>Средняя: <strong style={{ color: 'var(--text)' }}>{formatCurrencyRub(creditsSparkData.averageAmount)}</strong></span>
						</>
					)}
				</div>
			</div>
		</div>
	);
}

type CreditsDayDetailsPopupProps = {
	open: boolean;
	onClose: () => void;
	dayInfo: NonNullable<FinancialSummarySectionProps['creditsSparkData']>['dayData'][number] | null;
};

function CreditsDayDetailsPopup({ open, onClose, dayInfo }: CreditsDayDetailsPopupProps): React.ReactElement | null {
	if (!open || !dayInfo) return null;

	return (
		<Modal
			open={true}
			onClose={onClose}
			title={`Кредиты за ${formatDate(dayInfo.date)}`}
			width={500}
			footer={
				<ModalFooter
					onConfirm={onClose}
					confirmText="Закрыть"
				/>
			}
		>
			<div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
				<div style={{ padding: 'var(--space-sm)', background: 'var(--bg)', borderRadius: 'var(--radius-md)', border: 'var(--border-default)' }}>
					<div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--muted)', marginBottom: 'var(--space-xs)' }}>Сумма платежей</div>
					<div style={{ fontSize: 'var(--font-size-lg)', fontWeight: 'var(--font-weight-semibold)', color: 'var(--red)' }}>
						{formatCurrencyRub(dayInfo.amount)}
					</div>
				</div>

				{dayInfo.credits.length > 0 ? (
					<div>
						<div style={{ fontSize: 'var(--font-size-sm)', fontWeight: 'var(--font-weight-semibold)', marginBottom: 'var(--space-sm)', color: 'var(--text)' }}>
							Кредиты ({dayInfo.credits.length})
						</div>
						<div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)', maxHeight: '400px', overflowY: 'auto' }}>
							{dayInfo.credits.map((item, idx) => (
								<div key={idx} style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text)', padding: 'var(--space-sm)', background: 'var(--bg)', borderRadius: 'var(--radius-md)', border: 'var(--border-default)' }}>
									<div style={{ fontWeight: 'var(--font-weight-semibold)', marginBottom: 'var(--space-sm)', fontSize: 'var(--font-size-sm)' }}>{item.credit.name}</div>
									<div style={{ color: 'var(--red)', fontSize: 'var(--font-size-sm)', fontWeight: 'var(--font-weight-semibold)' }}>
										Платеж: {formatCurrencyRub(item.amount)}
									</div>
								</div>
							))}
						</div>
					</div>
				) : (
					<div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--muted)', textAlign: 'center', padding: 'var(--space-lg)' }}>
						Нет кредитов в этот день
					</div>
				)}
			</div>
		</Modal>
	);
}

type DayDetailsPopupProps = {
	open: boolean;
	onClose: () => void;
	dayInfo: FinancialSummarySectionProps['sparkData']['dayData'][number] | null;
	customers: Customer[];
};

function DayDetailsPopup({ open, onClose, dayInfo, customers }: DayDetailsPopupProps): React.ReactElement | null {
	if (!open || !dayInfo) return null;

	return (
		<Modal
			open={true}
			onClose={onClose}
			title={`Детали за ${formatDate(dayInfo.date)}`}
			width={500}
			footer={
				<ModalFooter
					onConfirm={onClose}
					confirmText="Закрыть"
				/>
			}
		>
			<div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
				<div style={{ padding: 'var(--space-sm)', background: 'var(--bg)', borderRadius: 'var(--radius-md)', border: 'var(--border-default)' }}>
					<div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--muted)', marginBottom: 'var(--space-xs)' }}>Прибыль</div>
					<div style={{ fontSize: 'var(--font-size-lg)', fontWeight: 'var(--font-weight-semibold)', color: dayInfo.profit >= 0 ? 'var(--green)' : 'var(--red)' }}>
						{formatCurrencyRub(dayInfo.profit)}
					</div>
				</div>

				{dayInfo.tasks.length > 0 ? (
					<div>
						<div style={{ fontSize: 'var(--font-size-sm)', fontWeight: 'var(--font-weight-semibold)', marginBottom: 'var(--space-sm)', color: 'var(--text)' }}>
							Операции ({dayInfo.tasks.length})
						</div>
						<div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)', maxHeight: '400px', overflowY: 'auto' }}>
							{dayInfo.tasks.map((item, idx) => {
								const customer = customers.find((c) => c.id === item.task.customerId);
								return (
									<div key={idx} style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text)', padding: 'var(--space-sm)', background: 'var(--bg)', borderRadius: 'var(--radius-md)', border: 'var(--border-default)' }}>
										<div style={{ fontWeight: 'var(--font-weight-semibold)', marginBottom: 'var(--space-sm)', fontSize: 'var(--font-size-sm)' }}>{item.task.title}</div>
										{item.paymentTitle && (
											<div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--muted)', marginBottom: 'var(--space-sm)' }}>
												{item.paymentTitle}
											</div>
										)}
										{customer && (
											<div style={{ marginBottom: 'var(--space-sm)' }}>
												<CustomerChip name={customer.name} avatarUrl={customer.avatar} />
											</div>
										)}
										<div style={{ color: item.type === 'payment' ? 'var(--green)' : 'var(--red)', fontSize: 'var(--font-size-sm)', fontWeight: 'var(--font-weight-semibold)' }}>
											{item.type === 'payment' ? 'Оплата' : 'Расход'}: {formatCurrencyRub(item.amount)}
										</div>
									</div>
								);
							})}
						</div>
					</div>
				) : (
					<div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--muted)', textAlign: 'center', padding: 'var(--space-lg)' }}>
						Нет операций в этот день
					</div>
				)}
			</div>
		</Modal>
	);
}


