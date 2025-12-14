import React from 'react';
import type { Task, Customer, Contractor, Settings } from '@/types';
import { Columns } from '@/store/board';
import { Button } from '@/shared/ui';
import { TaskCard } from './TaskCard';
import { getToken } from '@/shared/lib/tokens';

type PausedTasksSectionProps = {
	tasks: Task[];
	customers: Customer[];
	contractors: Contractor[];
	settings: Settings;
	showPausedColumn: boolean;
	onToggleShow: () => void;
	onEdit: (task: Task) => void;
	onContextMenu: (event: React.MouseEvent, task: Task) => void;
	onDragStart: (e: React.DragEvent, taskId: string) => void;
};

export function PausedTasksSection({
	tasks,
	customers,
	contractors,
	settings,
	showPausedColumn,
	onToggleShow,
	onEdit,
	onContextMenu,
	onDragStart,
}: PausedTasksSectionProps): React.ReactElement | null {
	const iconSizeSm = React.useMemo(() => getToken('--icon-size-sm', 16), []);

	if (tasks.length === 0) {
		return null;
	}

	return (
		<>
			{!showPausedColumn && (
				<div
					style={{
						display: 'flex',
						alignItems: 'center',
						gap: 'var(--space-sm)',
						marginBottom: 'var(--space-md)',
					}}
				>
					<Button onClick={onToggleShow} variant="secondary" size="sm">
						<span style={{ display: 'inline-flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
							<svg
								width={iconSizeSm}
								height={iconSizeSm}
								viewBox="0 0 24 24"
								fill="none"
								stroke="currentColor"
								strokeWidth="2"
								strokeLinecap="round"
								strokeLinejoin="round"
							>
								<circle cx="12" cy="12" r="10" />
								<line x1="10" y1="12" x2="14" y2="12" />
							</svg>
							<span>Показать задачи на паузе</span>
							<span
								style={{
									background: 'var(--accent)',
									color: 'var(--white)',
									borderRadius: 'var(--radius-pill)',
									padding: '2px 8px',
									fontSize: 'var(--font-size-xs)',
									fontWeight: 'var(--font-weight-semibold)',
									lineHeight: 1,
									minWidth: '20px',
									textAlign: 'center',
								}}
							>
								{tasks.length}
							</span>
						</span>
					</Button>
				</div>
			)}
			<div
				style={{
					marginBottom: 'var(--space-lg)',
					background: 'var(--panel-muted)',
					border: '1px solid var(--border-strong)',
					borderRadius: 'var(--radius-l)',
					overflow: 'hidden',
					display: 'grid',
					gridTemplateRows: showPausedColumn ? '1fr' : '0fr',
					transition: 'grid-template-rows 600ms cubic-bezier(0.34, 1.56, 0.64, 1), padding 600ms cubic-bezier(0.34, 1.56, 0.64, 1)',
					padding: showPausedColumn ? 'var(--space-md)' : '0',
				}}
			>
				<div style={{ minHeight: 0, overflow: 'hidden' }}>
					{showPausedColumn && (
					<div
						style={{
							opacity: 1,
							transition: 'opacity var(--transition-smooth)',
						}}
					>
						<div
							style={{
								display: 'flex',
								justifyContent: 'space-between',
								alignItems: 'center',
								marginBottom: 'var(--space-md)',
							}}
						>
							<h3
								style={{
									margin: 0,
									fontSize: 'var(--font-size-md)',
									fontWeight: 'var(--font-weight-semibold)',
									display: 'flex',
									alignItems: 'center',
									gap: 'var(--space-sm)',
								}}
							>
								<svg
									width={iconSizeSm}
									height={iconSizeSm}
									viewBox="0 0 24 24"
									fill="none"
									stroke="currentColor"
									strokeWidth="2"
									strokeLinecap="round"
									strokeLinejoin="round"
								>
									<circle cx="12" cy="12" r="10" />
									<line x1="10" y1="12" x2="14" y2="12" />
								</svg>
								Задачи на паузе ({tasks.length})
							</h3>
							<Button
								onClick={onToggleShow}
								variant="secondary"
								style={{ fontSize: 'var(--font-size-sm)', padding: 'var(--space-xs) var(--space-sm)' }}
							>
								Скрыть
							</Button>
						</div>
						<div
							style={{
								display: 'grid',
								gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
								gap: 'var(--space-md)',
								alignItems: 'stretch',
							}}
						>
							{tasks.map((t) => {
								const customer = customers.find((c) => c.id === t.customerId);
								const contractor = contractors.find((c) => c.id === t.contractorId);
								const effectiveColumnId = t.pausedFromColumnId || 'inwork';
								const originalStatus = Columns.find((c) => c.id === effectiveColumnId)?.title || 'В работе';
								return (
									<TaskCard
										key={t.id}
										task={t}
										customer={customer}
										contractor={contractor}
										settings={settings}
										onEdit={onEdit}
										onContextMenu={onContextMenu}
										variant="paused"
										originalStatus={originalStatus}
										showPriority={false}
										draggable={true}
										onDragStart={onDragStart}
									/>
								);
							})}
						</div>
					</div>
					)}
				</div>
			</div>
		</>
	);
}

