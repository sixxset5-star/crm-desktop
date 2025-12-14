import React from 'react';
import { formatDateWithSettings as formatDate } from '@/shared/lib/format';
import { XIcon } from '@/shared/components/Icons';
import IconButton from '@/shared/components/IconButton';
import { getToken } from '@/shared/lib/tokens';

const EXTRA_WORK_DATE_PILL_CLASS = 'extraWorkDatePill';

type ExtraWorkShiftDatesProps = {
	workDates: string[];
	onRemoveDate?: (dateStr: string) => void;
};

export function ExtraWorkShiftDates({ workDates, onRemoveDate }: ExtraWorkShiftDatesProps): React.ReactElement {
	const iconSizeXs = React.useMemo(() => getToken('--icon-size-xs', 11), []);

	return (
		<label className="col-span">
			<span>Дни работы ({workDates.length})</span>
			<div style={{
				padding: 'var(--space-sm)',
				background: 'var(--bg)',
				border: 'var(--border-default)',
				borderRadius: 'var(--radius-md)',
				fontSize: 'var(--font-size-sm)',
				color: 'var(--muted)',
			}}>
				{workDates.length > 0 ? (
					<div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--chip-gap)' }}>
						{workDates.map((dateStr) => (
							<span 
								key={dateStr} 
								style={{ 
									display: 'inline-flex',
									alignItems: 'center',
									gap: 'var(--space-xs)',
								padding: 'var(--chip-padding-y) var(--chip-padding-x)', 
								background: 'var(--panel)', 
									borderRadius: 'var(--radius-sm)',
								}}
							>
								{formatDate(dateStr)}
								{onRemoveDate && workDates.length > 1 && (
									<IconButton
										onClick={() => onRemoveDate(dateStr)}
										title="Удалить день"
										icon={XIcon}
										type="close"
										iconSize={iconSizeXs}
										style={{ width: 'auto', height: 'auto', padding: 0 }}
									/>
								)}
							</span>
						))}
					</div>
				) : (
					<span>Нет выбранных дней</span>
				)}
			</div>
		</label>
	);
}

