import React from 'react';

type FormFieldProps = {
	label?: string;
	children: React.ReactNode;
	className?: string;
	style?: React.CSSProperties;
};

export function FormField({ label, children, className = '', style }: FormFieldProps): React.ReactElement {
	return (
		<div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)', ...style }} className={className}>
			{label && (
				<span style={{
					fontSize: 'var(--font-size-md)',
					fontWeight: 'var(--font-weight-medium)',
				}}>
					{label}
				</span>
			)}
			{children}
		</div>
	);
}






