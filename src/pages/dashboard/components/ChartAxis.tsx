import React, { useMemo } from 'react';
import { getToken } from '@/shared/lib/tokens';
import { formatCurrencyRub } from '@/shared/lib/format';
import { calculateYAxisLabels, calculateTopPosition } from '../utils/chartUtils';

type ChartAxisProps = {
	max: number;
	min: number;
	formatValue?: (value: number) => string;
};

export function ChartAxis({ max, min, formatValue = formatCurrencyRub }: ChartAxisProps): React.ReactElement {
	const axisWidth = useMemo(() => getToken('--chart-axis-width', 50), []);
	const fontSize = useMemo(() => getToken('--font-size-xs', 11), []);
	const fontWeight = useMemo(() => getToken('--font-weight-medium', 500), []);
	
	const labels = useMemo(() => calculateYAxisLabels(max, min), [max, min]);
	
	return (
		<>
			{labels.map((value, idx) => {
				const topPercent = calculateTopPosition(value, max, min);
				return (
					<div
						key={idx}
						style={{
							position: 'absolute',
							left: 0,
							top: `${topPercent}%`,
							transform: 'translateY(-50%)',
							fontSize,
							color: 'var(--muted)',
							fontWeight,
							width: axisWidth,
							textAlign: 'left',
						}}
					>
						{formatValue(value)}
					</div>
				);
			})}
		</>
	);
}




