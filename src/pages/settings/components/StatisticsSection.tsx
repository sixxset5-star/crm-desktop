import React from 'react';
import { SettingsSection } from './SettingsSection';

type StatisticsSectionProps = {
	tasksCount: number;
	customersCount: number;
	goalsCount: number;
};

export function StatisticsSection({ tasksCount, customersCount, goalsCount }: StatisticsSectionProps): React.ReactElement {
	return (
		<SettingsSection title="Статистика">
			<div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 'var(--space-sm)' }}>
				<div>
					<div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--muted)' }}>Задач</div>
					<div style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 'var(--font-weight-bold)' }}>{tasksCount}</div>
				</div>
				<div>
					<div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--muted)' }}>Заказчиков</div>
					<div style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 'var(--font-weight-bold)' }}>{customersCount}</div>
				</div>
				<div>
					<div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--muted)' }}>Целей</div>
					<div style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 'var(--font-weight-bold)' }}>{goalsCount}</div>
				</div>
			</div>
		</SettingsSection>
	);
}






