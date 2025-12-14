import React, { useMemo, useRef, useEffect, useState } from 'react';
import { FixedSizeGrid as Grid } from 'react-window';
import type { Contractor } from '@/types';
import type { ContractorStats } from '../utils/contractorStats';
import { ContractorCard } from './ContractorCard';
import { getToken } from '@/shared/lib/tokens';
import { 
	CONTRACTOR_CARD_HEIGHT, 
	GRID_MIN_COLUMN_WIDTH, 
	MIN_CONTAINER_HEIGHT,
	VIRTUALIZATION_THRESHOLD 
} from '@/shared/constants/numeric-constants';

type VirtualizedContractorGridProps = {
	contractors: Contractor[];
	contractorStats: Map<string, ContractorStats>;
	onEdit: (contractor: Contractor) => void;
	onDeactivate: (id: string) => void;
	onActivate: (id: string) => void;
	onDelete: (id: string) => void;
	onViewProfile: (contractor: Contractor) => void;
	containerWidth: number;
	containerHeight: number;
};

/**
 * Виртуализированный grid список подрядчиков
 * Используется для больших списков (>50 элементов) для улучшения производительности
 */
export function VirtualizedContractorGrid({
	contractors,
	contractorStats,
	onEdit,
	onDeactivate,
	onActivate,
	onDelete,
	onViewProfile,
	containerWidth,
	containerHeight,
}: VirtualizedContractorGridProps): React.ReactElement {
	const gridMinColumnWidth = useMemo(() => getToken('--customer-grid-min-column-width', GRID_MIN_COLUMN_WIDTH), []);
	// Получаем значение gap из CSS переменной (обычно var(--space-md) = 16px)
	const gridGap = useMemo(() => getToken('--space-md', 16), []);

	// Вычисляем количество колонок на основе ширины контейнера
	const columnCount = useMemo(() => {
		const minWidth = typeof gridMinColumnWidth === 'number' 
			? gridMinColumnWidth 
			: GRID_MIN_COLUMN_WIDTH;
		const gapValue = gridGap;
		const availableWidth = containerWidth;
		const cols = Math.floor((availableWidth + gapValue) / (minWidth + gapValue));
		return Math.max(1, cols);
	}, [containerWidth, gridMinColumnWidth, gridGap]);

	// Вычисляем ширину колонки
	const columnWidth = useMemo(() => {
		const gapValue = gridGap;
		return (containerWidth - gapValue * (columnCount - 1)) / columnCount;
	}, [containerWidth, columnCount, gridGap]);

	// Вычисляем количество строк
	const rowCount = useMemo(() => {
		return Math.ceil(contractors.length / columnCount);
	}, [contractors.length, columnCount]);

	const itemData = useMemo(() => ({
		contractors,
		contractorStats,
		onEdit,
		onDeactivate,
		onActivate,
		onDelete,
		onViewProfile,
		columnCount,
		columnWidth,
		gridGap,
	}), [contractors, contractorStats, onEdit, onDeactivate, onActivate, onDelete, onViewProfile, columnCount, columnWidth, gridGap]);

	const Cell = ({ columnIndex, rowIndex, style, data }: {
		columnIndex: number;
		rowIndex: number;
		style: React.CSSProperties;
		data: typeof itemData;
	}) => {
		const index = rowIndex * data.columnCount + columnIndex;
		if (index >= data.contractors.length) {
			return <div style={style} />;
		}

		const contractor = data.contractors[index];
		const stats = data.contractorStats.get(contractor.id) || { 
			tasksCount: 0, 
			completedTasksCount: 0, 
			totalExpenses: 0, 
			totalProfitOrLoss: 0,
			totalEarned: 0
		};

		return (
			<div style={{
				...style,
				paddingRight: columnIndex < data.columnCount - 1 ? data.gridGap : 0,
				paddingBottom: rowIndex < Math.ceil(data.contractors.length / data.columnCount) - 1 ? data.gridGap : 0,
			}}>
				<ContractorCard
					contractor={contractor}
					stats={stats}
					onEdit={data.onEdit}
					onDeactivate={data.onDeactivate}
					onActivate={data.onActivate}
					onDelete={data.onDelete}
					onViewProfile={data.onViewProfile}
				/>
			</div>
		);
	};

	if (contractors.length === 0) {
		return (
			<div style={{ 
				textAlign: 'center', 
				padding: '48px', 
				color: 'var(--muted)' 
			}}>
				Подрядчиков пока нет. Добавьте первого!
			</div>
		);
	}

	return (
		<Grid
			columnCount={columnCount}
			columnWidth={columnWidth}
			height={containerHeight}
			rowCount={rowCount}
			rowHeight={CONTRACTOR_CARD_HEIGHT + gridGap}
			width={containerWidth}
			itemData={itemData}
		>
			{Cell}
		</Grid>
	);
}

type VirtualizedContractorGridContainerProps = {
	contractors: Contractor[];
	contractorStats: Map<string, ContractorStats>;
	onEdit: (contractor: Contractor) => void;
	onDeactivate: (id: string) => void;
	onActivate: (id: string) => void;
	onDelete: (id: string) => void;
	onViewProfile: (contractor: Contractor) => void;
};

/**
 * Контейнер для виртуализированного grid списка подрядчиков
 * Отслеживает размеры контейнера и передает их в VirtualizedContractorGrid
 */
export function VirtualizedContractorGridContainer({
	contractors,
	contractorStats,
	onEdit,
	onDeactivate,
	onActivate,
	onDelete,
	onViewProfile,
}: VirtualizedContractorGridContainerProps): React.ReactElement {
	const containerRef = useRef<HTMLDivElement>(null);
	const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

	useEffect(() => {
		const container = containerRef.current;
		if (!container) return;

		const updateDimensions = () => {
			if (container) {
				setDimensions({
					width: container.clientWidth,
					height: container.clientHeight,
				});
			}
		};

		// Устанавливаем начальные размеры
		updateDimensions();

		// Используем ResizeObserver для отслеживания изменений размера
		const resizeObserver = new ResizeObserver(updateDimensions);
		resizeObserver.observe(container);

		// Также слушаем изменения размера окна
		window.addEventListener('resize', updateDimensions);

		return () => {
			resizeObserver.disconnect();
			window.removeEventListener('resize', updateDimensions);
		};
	}, []);

	// Используем минимальную высоту, если контейнер еще не измерен
	const height = dimensions.height > 0 ? dimensions.height : MIN_CONTAINER_HEIGHT;

	return (
		<div ref={containerRef} style={{ width: '100%', height: '100%', minHeight: MIN_CONTAINER_HEIGHT }}>
			{dimensions.width > 0 && (
				<VirtualizedContractorGrid
					contractors={contractors}
					contractorStats={contractorStats}
					onEdit={onEdit}
					onDeactivate={onDeactivate}
					onActivate={onActivate}
					onDelete={onDelete}
					onViewProfile={onViewProfile}
					containerWidth={dimensions.width}
					containerHeight={height}
				/>
			)}
		</div>
	);
}

