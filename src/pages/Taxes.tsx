import React from 'react';
import { Select, Table, THead, TBody, TH, EmptyRow } from '@/shared/ui';
import { MetricCard } from '@/shared/components/MetricCard';
import { useTaxesStore } from '../store/taxes';
import { useBoardStore } from '../store/board';
import { useShallowSelector } from '@/shared/hooks/useStoreSelectors';
import {
	calculateDerivedTaxes,
	calculateTotalTaxes,
	calculateUnpaidTaxes,
	getCurrentTaxYearKey,
	formatTaxYearLabel,
	getAvailableTaxYears,
} from './taxes/utils';
import { TaxTableRow } from './taxes/components';
import { TAXES_HEADER_GAP, TAXES_SELECT_PADDING_RIGHT } from './taxes/utils/constants';
import { formatCurrencyRub } from '@/shared/lib/format';

export function Taxes(): React.ReactElement {
	const tasks = useShallowSelector(useBoardStore, (s) => s.tasks);
	const paidFlags = useShallowSelector(useTaxesStore, (s) => s.paidFlags);
	const setPaid = useTaxesStore((s) => s.setPaid);

	const derived = React.useMemo(() => calculateDerivedTaxes(tasks, paidFlags), [tasks, paidFlags]);

	const currentYearKey = React.useMemo(() => getCurrentTaxYearKey(), []);
	const [selectedYearKey, setSelectedYearKey] = React.useState<string>(currentYearKey);
	const availableYears = React.useMemo(() => getAvailableTaxYears(derived, currentYearKey), [derived, currentYearKey]);

	const filtered = React.useMemo(() => derived.filter((r) => r.yearKey === selectedYearKey), [derived, selectedYearKey]);
	const totalAll = React.useMemo(() => calculateTotalTaxes(filtered), [filtered]);
	const totalUnpaid = React.useMemo(() => calculateUnpaidTaxes(filtered), [filtered]);

	return (
		<div className="page">
			<h1 className="page-title">Налоги</h1>

			<div
				style={{
					display: 'flex',
					flexDirection: 'column',
					gap: 'var(--space-md)',
					marginBottom: 'var(--space-md)',
				}}
			>
				<div
					style={{
						display: 'flex',
						flexDirection: 'column',
						gap: 'var(--space-md)',
					}}
				>
					<MetricCard
						title="Всего к оплате"
						value={formatCurrencyRub(totalAll)}
						valueColor="var(--text)"
						explanation="Общая сумма всех налогов за выбранный налоговый период."
						border={false}
					/>
					<MetricCard
						title="Не оплачено"
						value={formatCurrencyRub(totalUnpaid)}
						valueColor="var(--red)"
						explanation="Сумма неоплаченных налогов за выбранный налоговый период."
						border={false}
					/>
				</div>
				<Select
					size="sm"
					value={selectedYearKey}
					onChange={(e) => setSelectedYearKey((e.target as HTMLSelectElement).value)}
					style={{ width: '100%', paddingRight: TAXES_SELECT_PADDING_RIGHT }}
				>
					{availableYears.map((yk) => (
						<option key={yk} value={yk}>
							{formatTaxYearLabel(yk)}
						</option>
					))}
				</Select>
			</div>

			<div className="taxes-table-wrapper">
				<Table className="taxes-table">
					<THead>
						<tr>
							<TH className="taxes-table__th taxes-table__th--status"></TH>
							<TH className="taxes-table__th">Задача</TH>
							<TH className="taxes-table__th">Платёж</TH>
							<TH className="taxes-table__th taxes-table__th--number">Ставка</TH>
							<TH className="taxes-table__th taxes-table__th--number">Налог</TH>
							<TH className="taxes-table__th taxes-table__th--number">Платёж</TH>
							<TH className="taxes-table__th">Дата</TH>
						</tr>
					</THead>
					<TBody>
						{filtered.length === 0 && (
							<EmptyRow colSpan={7}>Нет данных. Укажите ставку налога и платежи в задачах.</EmptyRow>
						)}
						{filtered.map((row) => (
							<TaxTableRow key={row.key} tax={row} onPaidChange={setPaid} />
						))}
					</TBody>
				</Table>
			</div>
		</div>
	);
}
