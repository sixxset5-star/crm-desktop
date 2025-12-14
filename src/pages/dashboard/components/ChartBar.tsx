import React, { useMemo } from 'react';
import { getToken, getTokenString } from '@/shared/lib/tokens';

type ChartBarProps = {
	value: number;
	barHeight: number;
	zeroLinePercent: number;
	barColor: string;
	hasData: boolean;
	isHovered: boolean;
	index: number;
	onMouseEnter: () => void;
	onMouseLeave: () => void;
	onClick: () => void;
	isPositive?: boolean;
};

export function ChartBar({
	value,
	barHeight,
	zeroLinePercent,
	barColor,
	hasData,
	isHovered,
	index,
	onMouseEnter,
	onMouseLeave,
	onClick,
	isPositive = true,
}: ChartBarProps): React.ReactElement {
	const barOpacityDefault = useMemo(() => getToken('--chart-bar-opacity-default', 0.8), []);
	const barOpacityEmpty = useMemo(() => getToken('--chart-bar-opacity-empty', 0.3), []);
	const barOpacityHovered = useMemo(() => getToken('--chart-bar-opacity-hovered', 1), []);
	const barMinHeight = useMemo(() => getToken('--chart-bar-min-height', 2), []);
	const barHoverScale = useMemo(() => getToken('--chart-bar-hover-scale', 1.05), []);
	const barHoverShadow = useMemo(() => getTokenString('--chart-bar-hover-shadow', '0 4px 8px color-mix(in srgb, var(--black) 15%, transparent)'), []);
	const barTransition = useMemo(() => getTokenString('--chart-bar-transition', 'all 0.2s'), []);
	const indicatorSize = useMemo(() => getToken('--chart-indicator-size', 20), []);
	const indicatorBorderWidth = useMemo(() => getToken('--chart-indicator-border-width', 2), []);
	const indicatorHoverScale = useMemo(() => getToken('--chart-indicator-hover-scale', 1.2), []);
	const indicatorCompensationFactor = useMemo(() => getToken('--chart-indicator-compensation-factor', 0.05), []);
	
	// Столбцы всегда видны, но с разной opacity в зависимости от наличия данных
	// Если есть данные, используем нормальную opacity, иначе - более прозрачную
	const opacity = isHovered ? barOpacityHovered : (hasData ? barOpacityDefault : barOpacityEmpty);
	// Минимальная высота нужна для видимости, но только если значение не равно нулю
	const minHeight = value === 0 ? 0 : `${barMinHeight}px`;
	// Убеждаемся, что scale - это число
	const scaleValue = typeof barHoverScale === 'number' ? barHoverScale : 1.05;
	const transform = isHovered ? `scaleY(${scaleValue})` : 'scaleY(1)';
	const indicatorScaleValue = typeof indicatorHoverScale === 'number' ? indicatorHoverScale : 1.2;
	const indicatorTransform = isHovered ? `scale(${indicatorScaleValue})` : 'scale(1)';
	
	// zeroLinePercent - позиция от верха контейнера (0-100)
	// Для положительных столбцов: bottom = 100 - zeroLinePercent (чтобы столбец начинался от нулевой линии снизу)
	// Для отрицательных столбцов: top = zeroLinePercent (чтобы столбец начинался от нулевой линии сверху)
	const barStyle = isPositive
		? {
				position: 'absolute' as const,
				bottom: `${100 - zeroLinePercent}%`,
				width: '100%',
				height: `${barHeight}%`,
				backgroundColor: barColor,
				opacity,
				borderRadius: 'var(--radius-md) var(--radius-md) 0 0',
				cursor: 'pointer',
				minHeight,
				transition: barTransition,
				transform,
				transformOrigin: 'bottom',
				boxShadow: isHovered ? barHoverShadow : 'none',
				pointerEvents: 'auto' as const,
			}
		: {
				position: 'absolute' as const,
				top: `${zeroLinePercent}%`,
				width: '100%',
				height: `${barHeight}%`,
				backgroundColor: barColor,
				opacity,
				borderRadius: '0 0 var(--radius-md) var(--radius-md)',
				cursor: 'pointer',
				minHeight,
				transition: barTransition,
				transform,
				transformOrigin: 'top',
				boxShadow: isHovered ? barHoverShadow.replace('0 4px', '0 -4px') : 'none',
				pointerEvents: 'auto' as const,
			};

	return (
		<div
			data-bar-index={index}
			style={{
				flex: 1,
				display: 'flex',
				flexDirection: 'column',
				alignItems: 'center',
				justifyContent: 'flex-end',
				height: '100%',
				position: 'relative',
				cursor: 'pointer',
			}}
			onMouseEnter={onMouseEnter}
			onMouseLeave={onMouseLeave}
			onClick={onClick}
		>
			<div style={barStyle} />
			{hasData && (
				<div
					style={{
						position: 'absolute',
						// Позиция индикатора рассчитывается от верха контейнера
						// Для положительных: вершина столбца = zeroLinePercent - barHeight (от верха)
						// При scaleY столбец увеличивается, вершина поднимается на barHeight * compensationFactor
						// Компенсируем это, сдвигая индикатор вниз на ту же величину при hover
						top: isPositive 
							? `calc(${zeroLinePercent - barHeight}% - ${indicatorSize}px - ${isHovered ? barHeight * indicatorCompensationFactor : 0}%)` 
							: `calc(${zeroLinePercent + barHeight}% - ${indicatorSize / 2}px + ${isHovered ? barHeight * indicatorCompensationFactor : 0}%)`,
						width: indicatorSize,
						height: indicatorSize,
						borderRadius: '50%',
						backgroundColor: barColor,
						border: `${indicatorBorderWidth}px solid var(--white)`,
						display: 'flex',
						alignItems: 'center',
						justifyContent: 'center',
						cursor: 'pointer',
						fontSize: getToken('--font-size-xs', 11),
						fontWeight: 'bold',
						color: 'var(--white)',
						zIndex: 10,
						transition: barTransition,
						transform: indicatorTransform,
						transformOrigin: 'center',
					}}
				>
					?
				</div>
			)}
		</div>
	);
}

