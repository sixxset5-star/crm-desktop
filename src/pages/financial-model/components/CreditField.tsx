import React from 'react';

type CreditFieldProps = {
	label: string;
	value: React.ReactNode;
	valueColor?: string;
};

export function CreditField({ label, value, valueColor }: CreditFieldProps): React.ReactElement {
	return (
		<div>
			<div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--muted)', marginBottom: 'var(--space-xs)' }}>
				{label}
			</div>
			<div
				style={{
					fontSize: 'var(--font-size-md)',
					fontWeight: 'var(--font-weight-semibold)',
					color: valueColor || 'var(--text)',
				}}
			>
				{value}
			</div>
		</div>
	);
}






