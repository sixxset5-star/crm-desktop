import React from 'react';
import { Button } from '@/shared/ui';

type ImportExportRowProps = {
	title: string;
	onExport: () => void;
	onImport: () => void;
};

export function ImportExportRow({ title, onExport, onImport }: ImportExportRowProps): React.ReactElement {
	return (
		<div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
			<h4 style={{ margin: 'var(--space-none)', fontSize: 'var(--font-size-sm)', fontWeight: 'var(--font-weight-semibold)' }}>{title}</h4>
			<div style={{ display: 'flex', gap: 'var(--space-sm)' }}>
				<Button onClick={onExport} variant="secondary" size="sm">Экспорт CSV</Button>
				<Button onClick={onImport} variant="primary" size="sm">Импорт CSV</Button>
			</div>
		</div>
	);
}






