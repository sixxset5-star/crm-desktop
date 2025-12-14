import React from 'react';
import { Select } from '@/shared/ui';
import { getMonthLabel } from '../utils/archiveUtils';
import { ARCHIVE_SELECT_MIN_WIDTH } from '../utils/constants';

type MonthSelectorProps = {
	label: string;
	value: string;
	onChange: (value: string) => void;
	months: string[];
};

/**
 * Селектор для выбора месяца
 */
export function MonthSelector({ label, value, onChange, months }: MonthSelectorProps): React.ReactElement {
	return (
		<div style={{ marginTop: 'var(--space-lg)', marginBottom: 'var(--space-md)' }}>
			<label style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
				<span style={{ fontSize: 'var(--font-size-sm)', fontWeight: 'var(--font-weight-semibold)', color: 'var(--text)' }}>
					{label}
				</span>
				<Select
					value={value}
					onChange={(e) => onChange((e.target as HTMLSelectElement).value)}
					size="md"
					style={{ minWidth: ARCHIVE_SELECT_MIN_WIDTH }}
				>
					{months.map((monthKey) => (
						<option key={monthKey} value={monthKey}>
							{getMonthLabel(monthKey)}
						</option>
					))}
				</Select>
			</label>
		</div>
	);
}

