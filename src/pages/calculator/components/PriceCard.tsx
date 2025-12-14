import React from 'react';
import { formatCurrency } from '../utils/formatting';
import { CALCULATOR_PRICE_LARGE_FONT_SIZE, CALCULATOR_PRICE_MEDIUM_FONT_SIZE } from '../utils/constants';

type PriceCardProps = {
	label: string;
	value: number;
	explanation?: string;
	highlight?: boolean;
	size?: 'medium' | 'large';
	valueColor?: string;
};

/**
 * Карточка с отображением цены
 */
export function PriceCard({
	label,
	value,
	explanation,
	highlight = false,
	size = 'medium',
	valueColor,
}: PriceCardProps): React.ReactElement {
	const fontSize = size === 'large' ? CALCULATOR_PRICE_LARGE_FONT_SIZE : CALCULATOR_PRICE_MEDIUM_FONT_SIZE;
	const backgroundColor = highlight ? 'var(--accent)' : 'var(--bg)';
	const textColor = highlight ? 'var(--white)' : undefined;

	return (
		<div
			style={{
				padding: 'var(--space-md)',
				background: backgroundColor,
				borderRadius: 'var(--radius-md)',
				border: highlight ? 'none' : 'var(--border-default)',
				color: textColor,
			}}
		>
			<div style={{ fontSize: 'var(--font-size-sm)', opacity: highlight ? 'var(--opacity-subtle)' : 'var(--opacity-full)', marginBottom: 'var(--space-xs)' }}>
				{label}
			</div>
			<div
				style={{
					fontSize,
					fontWeight: 700,
					color: valueColor || textColor,
				}}
			>
				{formatCurrency(value)}
			</div>
			{explanation && (
				<div
					style={{
						fontSize: 'var(--font-size-xs)',
						opacity: highlight ? 'var(--opacity-hover)' : 'var(--opacity-full)',
						marginTop: 'var(--space-xs)',
						color: textColor || 'var(--muted)',
					}}
				>
					{explanation}
				</div>
			)}
		</div>
	);
}

