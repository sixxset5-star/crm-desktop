import { useState, useCallback } from 'react';
import type { Task, TaskLink, TaskPriority, ColumnId } from '@/types';
import { Columns } from '@/store/board';

type ContextMenuState = {
	x: number;
	y: number;
	task: Task;
} | null;

type LinkContextMenuState = {
	x: number;
	y: number;
	link: TaskLink;
	task: Task;
} | null;

export function useDashboardContextMenu() {
	const [contextMenu, setContextMenu] = useState<ContextMenuState>(null);
	const [linkContextMenu, setLinkContextMenu] = useState<LinkContextMenuState>(null);
	const [hoveredLinkKey, setHoveredLinkKey] = useState<string | null>(null);

	const handleContextMenu = useCallback((event: React.MouseEvent, task: Task) => {
		event.preventDefault();
		event.stopPropagation();
		setContextMenu({ x: event.clientX, y: event.clientY, task });
	}, []);

	const handleLinkContextMenu = useCallback((event: React.MouseEvent, link: TaskLink, task: Task) => {
		event.preventDefault();
		event.stopPropagation();
		const x = event.pageX || event.clientX;
		const y = event.pageY || event.clientY;
		setLinkContextMenu({ x, y, link, task });
	}, []);

	const closeContextMenu = useCallback(() => {
		setContextMenu(null);
	}, []);

	const closeLinkContextMenu = useCallback(() => {
		setLinkContextMenu(null);
	}, []);

	const availableStatuses = Columns.map((col) => ({ id: col.id, title: col.title }));

	const availablePriorities: Array<{ id: TaskPriority; title: string }> = [
		{ id: 'high', title: 'Высокий приоритет' },
		{ id: 'medium', title: 'Средний приоритет' },
		{ id: 'low', title: 'Низкий приоритет' },
	];

	return {
		contextMenu,
		linkContextMenu,
		hoveredLinkKey,
		setHoveredLinkKey,
		handleContextMenu,
		handleLinkContextMenu,
		closeContextMenu,
		closeLinkContextMenu,
		availableStatuses,
		availablePriorities,
	};
}

