import React, { useMemo, useState, useCallback } from 'react';
import { useBoardStore } from '../store/board';
import { useCustomersStore } from '../store/customers';
import { useGoalsStore } from '../store/goals';
import { useIncomeStore } from '../store/income';
import { formatCurrencyRub } from '@/shared/lib/format';
import { useShallowSelector } from '@/shared/hooks/useStoreSelectors';
import { getToken } from '@/shared/lib/tokens';
import { Button, Select, Table, THead, TBody, TH, TD, Card, CardHeader, CardContent } from '@/shared/ui';
import { Modal } from '@/shared/ui/Modal';
import { MetricCard } from '@/shared/components/MetricCard';
import { useOverflowFade } from '@/shared/hooks/useOverflowFade';
import { getMonths, calculateMonthlyData, getTasksForMonth, REPORTS_MODAL_MAX_HEIGHT, type MonthKey } from './reports/utils';
import { MonthRow, TaskCardModal } from './reports/components';

export function Reports(): React.ReactElement {
	const tasks = useShallowSelector(useBoardStore, (s) => s.tasks);
	const customers = useShallowSelector(useCustomersStore, (s) => s.customers);
	const monthlyFinancialGoals = useShallowSelector(useGoalsStore, (s) => s.monthlyFinancialGoals);
	const incomes = useShallowSelector(useIncomeStore, (s) => s.incomes);
	const [yearRange, setYearRange] = useState<number>(1);
	const months = useMemo(() => getMonths(yearRange * 12), [yearRange]);
	const [openedMonth, setOpenedMonth] = useState<MonthKey | null>(null);
	const { ref: monthModalListRef, isOverflowing: monthModalOverflow } = useOverflowFade<HTMLDivElement>();

	const monthlyData = useMemo(
		() => calculateMonthlyData(months, tasks, monthlyFinancialGoals, incomes),
		[tasks, months, monthlyFinancialGoals, incomes]
	);

	// Итоги: показываем общую прибыль и среднюю прибыль в месяц (за 12 мес.)
	const totalProfit = useMemo(
		() => monthlyData.reduce((sum, m) => sum + m.profit, 0),
		[monthlyData]
	);
	const averageMonthlyEarnings = useMemo(
		() => totalProfit / 12,
		[totalProfit]
	);
	const maxProfit = useMemo(
		() => Math.max(1, ...monthlyData.map((m) => m.profit)),
		[monthlyData]
	);
	const minProfit = useMemo(
		() => Math.min(...monthlyData.map((m) => m.profit)),
		[monthlyData]
	);

	const tasksForMonth = useMemo(() => {
		if (!openedMonth) return [];
		return getTasksForMonth(openedMonth, tasks, customers);
	}, [openedMonth, tasks, customers]);

	const modalWidth = useMemo(() => getToken('--modal-width-lg', 700), []);
	const metricsGridColumns = useMemo(() => getToken('--reports-metrics-grid-columns', 2), []);

	const handleMonthClick = useCallback((month: MonthKey) => {
		setOpenedMonth(month);
	}, []);

	const handleCloseModal = useCallback(() => {
		setOpenedMonth(null);
	}, []);

	return (
		<div className="page">
			<div
				style={{
					display: 'flex',
					justifyContent: 'space-between',
					alignItems: 'center',
					marginBottom: 'var(--space-lg)',
				}}
			>
				<div>
					<h1 className="page-title">Отчёт по месяцам</h1>
					<p className="page-subtitle">Финансовая статистика</p>
				</div>
				<Select
					size="xs"
					value={yearRange}
					onChange={(e) => setYearRange(Number((e.target as HTMLSelectElement).value))}
				>
					<option value={1}>Последние 12 месяцев</option>
					<option value={2}>Последние 2 года</option>
					<option value={3}>Последние 3 года</option>
					<option value={4}>Последние 4 года</option>
				</Select>
			</div>

			<div
				style={{
					display: 'grid',
					gridTemplateColumns: `repeat(${metricsGridColumns}, 1fr)`,
					gap: 'var(--space-md)',
					marginTop: 'var(--space-lg)',
				}}
			>
				<MetricCard
					title="Общая прибыль"
					value={formatCurrencyRub(totalProfit)}
					valueColor="var(--green)"
					explanation="Суммарная прибыль за выбранный период (доходы − расходы − налоги)."
					border={false}
				/>
				<MetricCard
					title="Средний заработок в месяц"
					value={formatCurrencyRub(averageMonthlyEarnings)}
					valueColor="var(--green)"
					explanation="Средняя прибыль в месяц за выбранный период. Рассчитывается как общая прибыль, делённая на количество месяцев."
					border={false}
				/>
			</div>

			<div style={{ marginTop: 'var(--space-lg)' }}>
				<Card>
					<CardHeader title="Динамика по месяцам" />
					<CardContent>
						<div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
							{monthlyData.map((m) => (
								<MonthRow
									key={`${m.year}-${m.month}`}
									monthData={m}
									maxProfit={maxProfit}
									minProfit={minProfit}
									onClick={() => handleMonthClick({ year: m.year, month: m.month, label: m.label })}
								/>
							))}
						</div>
					</CardContent>
				</Card>
			</div>

			{openedMonth && (
				<Modal
					open={true}
					onClose={handleCloseModal}
					title={`Задачи за ${openedMonth.label}`}
					width={modalWidth}
				>
					<div
						ref={monthModalListRef}
						className="scroll-fade"
						data-scroll-active={monthModalOverflow ? 'true' : 'false'}
						style={{
							display: 'flex',
							flexDirection: 'column',
							gap: 'var(--space-sm)',
							maxHeight: REPORTS_MODAL_MAX_HEIGHT,
							overflowY: 'auto',
						}}
					>
						{tasksForMonth.length === 0 ? (
							<div
								style={{
									color: 'var(--muted)',
									textAlign: 'center',
									padding: 'var(--space-lg)',
								}}
							>
								Нет задач
							</div>
						) : (
							tasksForMonth.map((t) => <TaskCardModal key={t.id} task={t} />)
						)}
					</div>
					<div
						style={{
							display: 'flex',
							justifyContent: 'flex-end',
							marginTop: 'var(--space-md)',
						}}
					>
						<Button type="button" variant="secondary" onClick={handleCloseModal}>
							Закрыть
						</Button>
					</div>
				</Modal>
			)}

			<div style={{ marginTop: 'var(--space-lg)' }}>
				<Card>
					<CardHeader title="Детализация" />
					<CardContent>
						<div style={{ overflowX: 'auto' }}>
							<Table>
								<THead>
									<tr>
										<TH>Месяц</TH>
										<TH align="right">Задач</TH>
										<TH align="right">Доходы</TH>
										<TH align="right">Расходы</TH>
										<TH align="right">Прибыль</TH>
									</tr>
								</THead>
								<TBody>
									{monthlyData.map((m) => (
										<tr key={`${m.year}-${m.month}`}>
											<TD>
												<span
													style={{
														fontWeight: 'var(--font-weight-semibold)',
														color: 'var(--text)',
													}}
												>
													{m.label}
												</span>
											</TD>
											<TD align="right">
												<span
													style={{
														color: 'var(--text)',
														fontWeight: 'var(--font-weight-medium)',
													}}
												>
													{m.count}
												</span>
											</TD>
											<TD align="right">
												<span
													style={{
														color: 'var(--green)',
														fontWeight: 'var(--font-weight-semibold)',
														fontSize: 'var(--font-size-md)',
													}}
												>
													{formatCurrencyRub(m.income)}
												</span>
											</TD>
											<TD align="right">
												<span
													style={{
														color: 'var(--red)',
														fontWeight: 'var(--font-weight-semibold)',
														fontSize: 'var(--font-size-md)',
													}}
												>
													{formatCurrencyRub(m.expenses)}
												</span>
											</TD>
											<TD align="right">
												<span
													style={{
														fontWeight: 'var(--font-weight-bold)',
														fontSize: 'var(--font-size-md)',
														color: m.profit >= 0 ? 'var(--green)' : 'var(--red)',
													}}
												>
													{formatCurrencyRub(m.profit)}
												</span>
											</TD>
										</tr>
									))}
								</TBody>
							</Table>
						</div>
					</CardContent>
				</Card>
			</div>
		</div>
	);
}
