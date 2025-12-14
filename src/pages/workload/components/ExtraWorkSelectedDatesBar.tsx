import React, { useMemo } from 'react';
import { Button } from '@/shared/ui';
import { getToken } from '@/shared/lib/tokens';
import { formatDateWithSettings as formatDate } from '@/shared/lib/format';

type ExtraWorkSelectedDatesBarProps = {
	selectedDates: string[];
	onCreateShift: () => void;
};

export function ExtraWorkSelectedDatesBar({
	selectedDates,
	onCreateShift,
}: ExtraWorkSelectedDatesBarProps): React.ReactElement | null {
	if (selectedDates.length === 0) return null;

	return (
		<div style={{
			padding: 'var(--space-md)',
			background: 'var(--panel)',
			border: 'var(--border-default)',
			borderRadius: 'var(--radius-md)',
			display: 'flex',
			justifyContent: 'space-between',
			alignItems: 'center',
		}}>
			<div>
				<div style={{ fontWeight: 'var(--font-weight-semibold)', marginBottom: 'var(--space-xs)' }}>
					Выбрано дней: {selectedDates.length}
				</div>
				<div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--muted)' }}>
					{selectedDates.slice(0, 5).map((d) => formatDate(d)).join(', ')}
					{selectedDates.length > 5 && '...'}
				</div>
			</div>
			<Button
				variant="primary"
				onClick={onCreateShift}
			>
				Создать смену для выбранных дней
			</Button>
		</div>
	);
}

