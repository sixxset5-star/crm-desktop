import React, { useMemo, useRef, useEffect, useState } from 'react';
import { FixedSizeGrid as Grid } from 'react-window';
import type { Customer } from '@/types';
import type { CustomerStats } from '../utils/customerStats';
import { CustomerCard } from './CustomerCard';
import { getToken } from '@/shared/lib/tokens';
import { 
	CUSTOMER_CARD_HEIGHT, 
	GRID_MIN_COLUMN_WIDTH, 
	MIN_CONTAINER_HEIGHT,
	VIRTUALIZATION_THRESHOLD 
} from '@/shared/constants/numeric-constants';

type VirtualizedCustomerGridProps = {
	customers: Customer[];
	customerStats: Map<string, CustomerStats>;
	onEdit: (customer: Customer) => void;
	onDelete: (id: string) => void;
	onViewProfile: (customer: Customer) => void;
	containerWidth: number;
	containerHeight: number;
};

/**
 * Виртуализированный grid список клиентов
 * Используется для больших списков (>50 элементов) для улучшения производительности
 */
export function VirtualizedCustomerGrid({
	customers,
	customerStats,
	onEdit,
	onDelete,
	onViewProfile,
	containerWidth,
	containerHeight,
}: VirtualizedCustomerGridProps): React.ReactElement {
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
		return Math.ceil(customers.length / columnCount);
	}, [customers.length, columnCount]);

	const itemData = useMemo(() => ({
		customers,
		customerStats,
		onEdit,
		onDelete,
		onViewProfile,
		columnCount,
		columnWidth,
		gridGap,
	}), [customers, customerStats, onEdit, onDelete, onViewProfile, columnCount, columnWidth, gridGap]);

	const Cell = ({ columnIndex, rowIndex, style, data }: {
		columnIndex: number;
		rowIndex: number;
		style: React.CSSProperties;
		data: typeof itemData;
	}) => {
		const index = rowIndex * data.columnCount + columnIndex;
		if (index >= data.customers.length) {
			return <div style={style} />;
		}

		const customer = data.customers[index];
		const stats = data.customerStats.get(customer.id) || { 
			tasks: 0, 
			totalAmount: 0, 
			paidAmount: 0, 
			remaining: 0, 
			expenses: 0, 
			profit: 0 
		};

		return (
			<div style={{
				...style,
				paddingRight: columnIndex < data.columnCount - 1 ? data.gridGap : 0,
				paddingBottom: rowIndex < Math.ceil(data.customers.length / data.columnCount) - 1 ? data.gridGap : 0,
			}}>
				<CustomerCard
					customer={customer}
					stats={stats}
					onEdit={data.onEdit}
					onDelete={data.onDelete}
					onViewProfile={data.onViewProfile}
				/>
			</div>
		);
	};

	if (customers.length === 0) {
		return (
			<div style={{ 
				textAlign: 'center', 
				padding: '48px', 
				color: 'var(--muted)' 
			}}>
				Заказчиков пока нет. Добавьте первого!
			</div>
		);
	}

	return (
		<Grid
			columnCount={columnCount}
			columnWidth={columnWidth}
			height={containerHeight}
			rowCount={rowCount}
			rowHeight={CUSTOMER_CARD_HEIGHT + gridGap}
			width={containerWidth}
			itemData={itemData}
		>
			{Cell}
		</Grid>
	);
}

type VirtualizedCustomerGridContainerProps = {
	customers: Customer[];
	customerStats: Map<string, CustomerStats>;
	onEdit: (customer: Customer) => void;
	onDelete: (id: string) => void;
	onViewProfile: (customer: Customer) => void;
};

/**
 * Контейнер для виртуализированного grid списка клиентов
 * Отслеживает размеры контейнера и передает их в VirtualizedCustomerGrid
 */
export function VirtualizedCustomerGridContainer({
	customers,
	customerStats,
	onEdit,
	onDelete,
	onViewProfile,
}: VirtualizedCustomerGridContainerProps): React.ReactElement {
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
				<VirtualizedCustomerGrid
					customers={customers}
					customerStats={customerStats}
					onEdit={onEdit}
					onDelete={onDelete}
					onViewProfile={onViewProfile}
					containerWidth={dimensions.width}
					containerHeight={height}
				/>
			)}
		</div>
	);
}

