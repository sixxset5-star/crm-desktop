import React, { useMemo } from 'react';
import { FixedSizeList as List } from 'react-window';
import type { ColumnId, Task, TaskLink } from '@/types';
import type { Customer, Contractor } from '@/types';
import type { Settings } from '@/store/settings';
import { TaskCard } from './TaskCard';
import { useOverflowFade } from '@/shared/hooks/useOverflowFade';
import { VIRTUALIZATION_THRESHOLD_TASKS, MIN_CONTAINER_HEIGHT } from '@/shared/constants/numeric-constants';

type TaskBoardSectionProps = {
	columns: Array<{ id: ColumnId; title: string }>;
	tasksByColumn: Record<ColumnId, Task[]>;
	customers: Customer[];
	contractors?: Contractor[];
	onDragStart: (e: React.DragEvent, taskId: string) => void;
	onDrop: (e: React.DragEvent, columnId: ColumnId) => void;
	onDragOver: (e: React.DragEvent) => void;
	onEditTask: (task: Task) => void;
	onTaskContextMenu: (event: React.MouseEvent, task: Task) => void;
	onLinkContextMenu: (event: React.MouseEvent, link: TaskLink, task: Task) => void;
	hoveredLinkKey: string | null;
	onLinkHover: (key: string | null) => void;
	settings: Settings;
};

// Примерная высота карточки задачи (включая отступы)
const CARD_HEIGHT = 200;
const CARD_GAP = 12;

type VirtualizedColumnProps = {
	tasks: Task[];
	customerMap: Map<string, Customer>;
	contractorMap: Map<string, Contractor>;
	settings: Settings;
	onEditTask: (task: Task) => void;
	onTaskContextMenu: (event: React.MouseEvent, task: Task) => void;
	onLinkContextMenu: (event: React.MouseEvent, link: TaskLink, task: Task) => void;
	hoveredLinkKey: string | null;
	onLinkHover: (key: string | null) => void;
	onDragStart: (e: React.DragEvent, taskId: string) => void;
	columnHeight: number;
};

function VirtualizedColumn({
	tasks,
	customerMap,
	contractorMap,
	settings,
	onEditTask,
	onTaskContextMenu,
	onLinkContextMenu,
	hoveredLinkKey,
	onLinkHover,
	onDragStart,
	columnHeight,
}: VirtualizedColumnProps): React.ReactElement {
	const itemData = useMemo(() => ({
		tasks,
		customerMap,
		contractorMap,
		settings,
		onEditTask,
		onTaskContextMenu,
		onLinkContextMenu,
		hoveredLinkKey,
		onLinkHover,
		onDragStart,
	}), [tasks, customerMap, contractorMap, settings, onEditTask, onTaskContextMenu, onLinkContextMenu, hoveredLinkKey, onLinkHover, onDragStart]);

	const Row = ({ index, style, data }: { index: number; style: React.CSSProperties; data: typeof itemData }) => {
		const task = data.tasks[index];
		const customer = task.customerId ? data.customerMap.get(task.customerId) : undefined;
		const contractor = task.contractorId ? data.contractorMap.get(task.contractorId) : undefined;
		
		return (
			<div style={{ ...style, paddingBottom: index < data.tasks.length - 1 ? CARD_GAP : 0 }}>
				<TaskCard
					task={task}
					customer={customer}
					contractor={contractor}
					settings={data.settings}
					onEdit={data.onEditTask}
					onContextMenu={data.onTaskContextMenu}
					onLinkContextMenu={data.onLinkContextMenu}
					hoveredLinkKey={data.hoveredLinkKey}
					onLinkHover={data.onLinkHover}
					onDragStart={data.onDragStart}
				/>
			</div>
		);
	};

	if (tasks.length === 0) {
		return <div style={{ height: columnHeight }} />;
	}

	return (
		<List
			height={columnHeight}
			itemCount={tasks.length}
			itemSize={CARD_HEIGHT + CARD_GAP}
			width="100%"
			itemData={itemData}
		>
			{Row}
		</List>
	);
}

export function TaskBoardSection({
	columns,
	tasksByColumn,
	customers,
	contractors = [],
	onDragStart,
	onDrop,
	onDragOver,
	onEditTask,
	onTaskContextMenu,
	onLinkContextMenu,
	hoveredLinkKey,
	onLinkHover,
	settings,
}: TaskBoardSectionProps): React.ReactElement {
	// Создаем Map для быстрого поиска O(1) вместо O(n) для find()
	const customerMap = useMemo(() => {
		const map = new Map<string, Customer>();
		customers.forEach(c => map.set(c.id, c));
		return map;
	}, [customers]);

	const contractorMap = useMemo(() => {
		const map = new Map<string, Contractor>();
		contractors.forEach(c => map.set(c.id, c));
		return map;
	}, [contractors]);

	// Вычисляем высоту колонки на основе доступной высоты экрана
	// Используем 80vh как максимальную высоту, минус заголовок колонки (~50px)
	const columnHeight = typeof window !== 'undefined' 
		? Math.max(400, window.innerHeight * 0.8 - 50)
		: MIN_CONTAINER_HEIGHT;

	return (
		<div className="board">
			{columns.map((col) => {
				if (col.id === 'unprocessed' && tasksByColumn[col.id].length === 0) {
					return null;
				}
				// Скрываем колонку 'paused' если она пустая (управляется через showPausedColumn в Dashboard)
				if (col.id === 'paused' && tasksByColumn[col.id].length === 0) {
					return null;
				}
				const tasks = tasksByColumn[col.id];
				// Виртуализируем только если задач больше порога
				// Для небольших списков виртуализация может быть избыточной
				const shouldVirtualize = tasks.length > VIRTUALIZATION_THRESHOLD_TASKS;
				
				return (
					<section key={col.id} className="board-column" onDrop={(e) => onDrop(e, col.id)} onDragOver={onDragOver}>
						<header className="board-column-header">
							<span>{col.title}</span>
							<span className="counter">{tasks.length}</span>
						</header>
						<ColumnBody>
							{shouldVirtualize ? (
								<VirtualizedColumn
									tasks={tasks}
									customerMap={customerMap}
									contractorMap={contractorMap}
									settings={settings}
									onEditTask={onEditTask}
									onTaskContextMenu={onTaskContextMenu}
									onLinkContextMenu={onLinkContextMenu}
									hoveredLinkKey={hoveredLinkKey}
									onLinkHover={onLinkHover}
									onDragStart={onDragStart}
									columnHeight={columnHeight}
								/>
							) : (
								tasks.map((t) => {
									const customer = t.customerId ? customerMap.get(t.customerId) : undefined;
									const contractor = t.contractorId ? contractorMap.get(t.contractorId) : undefined;
									return (
										<TaskCard
											key={t.id}
											task={t}
											customer={customer}
											contractor={contractor}
											settings={settings}
											onEdit={onEditTask}
											onContextMenu={onTaskContextMenu}
											onLinkContextMenu={onLinkContextMenu}
											hoveredLinkKey={hoveredLinkKey}
											onLinkHover={onLinkHover}
											onDragStart={onDragStart}
										/>
									);
								})
							)}
						</ColumnBody>
					</section>
				);
			})}
		</div>
	);
}

function ColumnBody({ children }: { children: React.ReactNode }): React.ReactElement {
	const { ref, isOverflowing } = useOverflowFade<HTMLDivElement>();
	return (
		<div
			ref={ref}
			className="board-column-body scroll-fade"
			data-scroll-active={isOverflowing ? 'true' : 'false'}
			style={{ '--scroll-fade-to': 'var(--bg)', '--scroll-fade-middle': 'color-mix(in srgb, var(--white) 80%, transparent)' } as React.CSSProperties}
		>
			{children}
		</div>
	);
}



