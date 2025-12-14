import React, { useMemo } from 'react';
import { getToken } from '@/shared/lib/tokens';
import { calculateYAxisLabels, calculateTopPosition } from '../utils/chartUtils';

type ChartGridProps = {
	max: number;
	min: number;
	axisWidth: number;
};

export function ChartGrid({ max, min, axisWidth }: ChartGridProps): React.ReactElement {
	const gridLineOpacity = useMemo(() => getToken('--chart-grid-line-opacity', 0.3), []);
	const zeroLineOpacity = useMemo(() => getToken('--chart-zero-line-opacity', 1), []);
	
	const labels = useMemo(() => calculateYAxisLabels(max, min), [max, min]);
	
	return (
		<>
			{labels.map((value, idx) => {
				const topPercent = calculateTopPosition(value, max, min);
				const isZero = value === 0;
				
				return (
					<div
						key={idx}
						style={{
							position: 'absolute',
							left: axisWidth,
							right: 0,
							height: 1,
							borderTop: isZero ? '1px dashed var(--border)' : 'var(--border-top-default)',
							top: `${topPercent}%`,
							pointerEvents: 'none',
							opacity: isZero ? zeroLineOpacity : gridLineOpacity,
						}}
					/>
				);
			})}
		</>
	);
}




