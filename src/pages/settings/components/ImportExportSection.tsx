import React from 'react';
import { Button } from '@/shared/ui';
import { SettingsSection } from './SettingsSection';
import { ImportExportRow } from './ImportExportRow';

type ImportExportSectionProps = {
	onExportTasks: () => void;
	onImportTasks: () => void;
	onExportCustomers: () => void;
	onImportCustomers: () => void;
	onExportCredits: () => void;
	onImportCredits: () => void;
	onExportJSON: () => void;
};

export function ImportExportSection({
	onExportTasks,
	onImportTasks,
	onExportCustomers,
	onImportCustomers,
	onExportCredits,
	onImportCredits,
	onExportJSON,
}: ImportExportSectionProps): React.ReactElement {
	return (
		<SettingsSection title="Импорт и экспорт данных">
			<div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
				<ImportExportRow title="Задачи" onExport={onExportTasks} onImport={onImportTasks} />
				<ImportExportRow title="Заказчики" onExport={onExportCustomers} onImport={onImportCustomers} />
				<ImportExportRow title="Кредиты" onExport={onExportCredits} onImport={onImportCredits} />
				<div style={{ marginTop: 'var(--space-sm)', paddingTop: 'var(--space-sm)', borderTop: 'var(--border-top-default)' }}>
					<Button onClick={onExportJSON} variant="secondary" size="sm">Экспорт JSON (полный бэкап)</Button>
				</div>
				<p style={{ margin: 0, fontSize: 'var(--font-size-sm)', color: 'var(--muted)' }}>
					При импорте CSV: если ID совпадает — данные обновляются, если ID отличается или отсутствует — добавляется новая запись.
				</p>
			</div>
		</SettingsSection>
	);
}

