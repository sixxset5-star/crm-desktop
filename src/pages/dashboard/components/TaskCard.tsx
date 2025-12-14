import React from 'react';
import type { Task, TaskLink, ColumnId } from '@/types';
import { normalizeLinks } from '@/store/board';
import type { Customer, Contractor } from '@/types';
import type { Settings } from '@/store/settings';
import { formatCurrencyRub, formatDateWithSettings as formatDate } from '@/shared/lib/format';
import { CustomerChip, PriorityBadge, ProgressBar, TagChip } from '@/shared/ui';
import { ListIcon, LinkIcon, ClockIcon } from '@/shared/components/Icons';

type TaskCardProps = {
	task: Task;
	customer: Customer | undefined;
	contractor?: Contractor | undefined;
	settings: Settings;
	onEdit: (task: Task) => void;
	onContextMenu: (event: React.MouseEvent, task: Task) => void;
	onLinkContextMenu?: (event: React.MouseEvent, link: TaskLink, task: Task) => void;
	hoveredLinkKey?: string | null;
	onLinkHover?: (key: string | null) => void;
	onDragStart?: (e: React.DragEvent, taskId: string) => void;
	// Опции для задач на паузе
	variant?: 'normal' | 'paused';
	originalStatus?: string;
	showPriority?: boolean;
	draggable?: boolean;
	customStyles?: React.CSSProperties;
};

function shortenUrlForDisplay(url: string): string {
	try {
		const urlObj = new URL(url);
		const host = urlObj.hostname;
		const pathname = urlObj.pathname;
		const segments = pathname.split('/').filter((segment) => segment.length > 0);
		if (segments.length > 0) {
			return `${host}/${segments[0]}`;
		}
		return host;
	} catch {
		return url;
	}
}

export function TaskCard({
	task,
	customer,
	contractor,
	settings,
	onEdit,
	onContextMenu,
	onLinkContextMenu,
	hoveredLinkKey,
	onLinkHover,
	onDragStart,
	variant = 'normal',
	originalStatus,
	showPriority = true,
	draggable = true,
	customStyles,
}: TaskCardProps): React.ReactElement {
	// Для задач на паузе используем исходный статус для определения isCompleted
	const effectiveColumnId = task.columnId === 'paused' && task.pausedFromColumnId ? task.pausedFromColumnId : task.columnId;
	const isCompleted = effectiveColumnId === 'completed' || effectiveColumnId === 'closed';
	const isClosed = effectiveColumnId === 'closed';

	const totalPaidFromPayments = task.payments && task.payments.length > 0
		? task.payments.filter((p) => p.paid).reduce((sum, p) => {
			const amount = p.amount != null ? p.amount : ((p.qty || 0) * (p.price || 0));
			return sum + (amount || 0);
		}, 0)
		: 0;
	const hasPayments = !!(task.payments && task.payments.length > 0);
	const totalPaid = hasPayments ? totalPaidFromPayments : (task.paidAmount || 0);
	const hasBudget = task.amount != null && task.amount > 0;
	const budget = task.amount || 0;
	const remaining = budget - totalPaid;
	const normalizedLinks = normalizeLinks(task.links);

	const isPaused = variant === 'paused';
	const cardStyles: React.CSSProperties = {
		...(isPaused && {
			opacity: 'var(--opacity-subtle)',
			border: 'var(--border-dashed)',
			margin: 0,
			position: 'relative',
			display: 'flex',
			flexDirection: 'column',
			height: '100%',
		}),
		...customStyles,
	};

	const titleTooltip = isPaused && originalStatus
		? `${task.title}\nИсходный статус: ${originalStatus}\nДвойной клик — редактировать\nПравый клик — меню`
		: `${task.title}\nДвойной клик — редактировать\nПравый клик — меню\nПеретащите — изменить статус`;

	return (
		<div
			className="card"
			draggable={draggable}
			onDragStart={draggable && onDragStart ? (e) => onDragStart(e, task.id) : undefined}
			onDoubleClick={() => onEdit(task)}
			onContextMenu={(e) => onContextMenu(e, task)}
			title={titleTooltip}
			style={cardStyles}
		>
			{isPaused && originalStatus && (
				<div
					style={{
						position: 'absolute',
						top: 'var(--space-md)',
						right: 'var(--space-md)',
						fontSize: 'var(--font-size-xs)',
						color: 'var(--muted)',
						background: 'var(--bg)',
						padding: 'var(--space-xs) var(--space-sm)',
						borderRadius: 'var(--radius-s)',
						border: 'var(--border-default)',
						zIndex: 1,
						whiteSpace: 'nowrap',
					}}
				>
					{originalStatus}
				</div>
			)}
			<div
				style={{
					display: 'flex',
					alignItems: 'center',
					gap: 'var(--space-sm)',
					marginBottom: 'var(--space-xs)',
					paddingRight: isPaused ? 'calc(var(--space-md) * 5)' : 0,
				}}
			>
				<div className="card-title" style={{ flex: 1 }}>
					{task.title}
				</div>
				{showPriority && !isCompleted && task.priority && <PriorityBadge priority={task.priority} />}
			</div>
			{(customer || contractor) && (
				<div style={{ 
					marginTop: 'var(--space-sm)', 
					display: 'flex', 
					gap: 'var(--space-sm)', 
					flexWrap: 'wrap',
					alignItems: 'center'
				}}>
					{customer && (
						<div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-xs)' }}>
							<span style={{ 
								fontSize: 'var(--font-size-xs)', 
								color: 'var(--muted)',
								fontWeight: 'var(--font-weight-medium)'
							}}>
								Заказчик:
							</span>
							<CustomerChip name={customer.name} avatarUrl={customer.avatar} />
						</div>
					)}
					{contractor && (
						<div style={{ 
							display: 'flex', 
							alignItems: 'center', 
							gap: 'var(--space-xs)',
							paddingLeft: customer ? 'var(--space-sm)' : 0,
							borderLeft: customer ? '1px solid var(--border)' : 'none'
						}}>
							<span style={{ 
								fontSize: 'var(--font-size-xs)', 
								color: 'var(--muted)',
								fontWeight: 'var(--font-weight-medium)'
							}}>
								Исполнитель:
							</span>
							<CustomerChip name={contractor.name} avatarUrl={contractor.avatar} />
						</div>
					)}
				</div>
			)}

			{hasBudget && !isClosed && (
				<div className="card-line">
					<span className="label">Бюджет</span>
					<span>{formatCurrencyRub(budget)}</span>
				</div>
			)}
			{isClosed && totalPaid > 0 && (
				<div className="card-line">
					<span className="label">Оплачено</span>
					<span style={{ color: 'var(--green)', fontWeight: 600 }}>{formatCurrencyRub(totalPaid)}</span>
				</div>
			)}
			{!isClosed && hasBudget && remaining > 0 && (
				<div className="card-line">
					<span className="label">Ожидается</span>
					<span style={{ color: 'var(--accent)', fontWeight: 600 }}>{formatCurrencyRub(remaining)}</span>
				</div>
			)}

			{!isClosed && task.expenses != null && task.expenses > 0 && (
				<div className="card-line">
					<span className="label">Расходы</span>
					<span style={{ color: 'var(--red)', fontWeight: 600 }}>{formatCurrencyRub(task.expenses)}</span>
				</div>
			)}

			{!isClosed && (task.expenses || 0) > 0 && effectiveColumnId !== 'completed' && (() => {
				const expenses = task.expenses || 0;
				const paidPayments = (task.payments || []).filter((p) => p.paid);
				const paid = paidPayments.reduce((sum, p) => {
					const amount = p.amount != null ? p.amount : ((p.qty || 0) * (p.price || 0));
					return sum + (amount || 0);
				}, 0);
				const paidTaxes = paidPayments.reduce((sum, p) => {
					const amount = p.amount != null ? p.amount : ((p.qty || 0) * (p.price || 0));
					const rate = p.taxRate ?? 0;
					return sum + (amount || 0) * (rate / 100);
				}, 0);
				if (paid > 0) {
					const profit = paid - paidTaxes - expenses;
					return (
						<div className="card-line">
							<span className="label">Прибыль</span>
							<span style={{ color: profit >= 0 ? 'var(--green)' : 'var(--red)', fontWeight: 600 }}>
								{formatCurrencyRub(profit)}
							</span>
						</div>
					);
				}
				return null;
			})()}

			{settings.showTaskProgress !== false && effectiveColumnId !== 'closed' && task.payments && task.payments.length > 0 && (
				<div 
					className="card-line small" 
					style={{ 
						display: 'flex', 
						flexDirection: 'column', 
						gap: 'var(--space-sm)', 
						marginTop: isPaused ? 'auto' : 'var(--space-xs)',
						paddingTop: isPaused ? 'var(--space-md)' : undefined,
					}}
				>
					<div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)', fontSize: 'var(--font-size-sm)', fontWeight: 500 }}>
						<ListIcon size={14} color="var(--muted)" />
						<span>
							Платежей: {(() => {
								const total = (task.payments || []).length || 0;
								const done = (task.payments || []).filter((p) => p.paid).length;
								return `${done}/${total}`;
							})()}
						</span>
					</div>
					{(() => {
						const budgetValue = task.amount || 0;
						const paidSum = (task.payments || []).filter((p) => p.paid).reduce((sum, p) => {
							const amt = p.amount != null ? p.amount : ((p.qty || 0) * (p.price || 0));
							return sum + (amt || 0);
						}, 0);
						const percent = !budgetValue || budgetValue <= 0 ? 0 : Math.max(0, Math.min(100, (paidSum / budgetValue) * 100));
						return <ProgressBar value={percent} />;
					})()}
				</div>
			)}

			{task.tags && task.tags.length > 0 && (
				<div className="card-line small" style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-xs)', marginTop: 'var(--space-xs)' }}>
					{task.tags.map((tag) => (
						<TagChip key={tag} label={tag} />
					))}
				</div>
			)}

			{normalizedLinks.length > 0 && onLinkContextMenu && onLinkHover && (
				<div className="card-line small" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)', justifyContent: 'stretch', alignItems: 'stretch', width: '100%', marginTop: 'var(--space-sm)' }}>
					{normalizedLinks.map((link, idx) => {
						const linkKey = `${task.id}-${idx}`;
						const isHovered = hoveredLinkKey === linkKey;
						return (
							<a
								key={idx}
								href={link.url}
								target="_blank"
								rel="noopener noreferrer"
								onClick={(e) => e.stopPropagation()}
								onContextMenu={(e) => {
									e.preventDefault();
									e.stopPropagation();
									onLinkContextMenu(e, link, task);
								}}
								style={{
									display: 'flex',
									alignItems: 'flex-start',
									gap: 'var(--space-sm)',
									padding: 'var(--space-sm) var(--space-sm)',
								background: isHovered ? 'var(--accent)' : 'var(--bg)',
								border: isHovered ? 'var(--border-width) solid var(--accent)' : 'var(--border-default)',
								borderRadius: 'var(--radius-md)',
									cursor: 'pointer',
									textDecoration: 'none',
									transition: 'all var(--transition-base)',
									width: '100%',
									minWidth: 0,
									boxSizing: 'border-box',
								}}
								onMouseEnter={() => onLinkHover(linkKey)}
								onMouseLeave={() => onLinkHover(null)}
							>
								<div style={{ marginTop: 'var(--space-xs)', flexShrink: 0 }}>
									<LinkIcon size={14} color={isHovered ? 'var(--white)' : 'var(--accent)'} />
								</div>
								<div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 'var(--space-xs)' }}>
									{link.name && (
										<span
											className="link-name"
											style={{
												fontSize: 'var(--font-size-sm)',
												fontWeight: 500,
												color: isHovered ? 'var(--white)' : 'var(--accent)',
												overflow: 'hidden',
												textOverflow: 'ellipsis',
												whiteSpace: 'nowrap',
												display: 'block',
												minWidth: 0,
											}}
											title={link.name}
										>
											{link.name}
										</span>
									)}
									<span
										className="link-url"
										style={{
											fontSize: 'var(--font-size-xs)',
											color: isHovered ? 'color-mix(in srgb, var(--white) 90%, transparent)' : 'var(--muted)',
											overflow: 'hidden',
											textOverflow: 'ellipsis',
											whiteSpace: 'nowrap',
											display: 'block',
											minWidth: 0,
										}}
										title={link.url}
									>
										{shortenUrlForDisplay(link.url)}
									</span>
								</div>
							</a>
						);
					})}
				</div>
			)}

			{effectiveColumnId !== 'completed' && effectiveColumnId !== 'closed' && task.deadline && (
				<div className="card-line small" style={{ color: 'var(--muted)', fontWeight: 500, display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
					<ClockIcon size={14} color="var(--muted)" />
					<span>Дедлайн: {formatDate(task.deadline)}</span>
				</div>
			)}
			{effectiveColumnId !== 'completed' && effectiveColumnId !== 'closed' && task.startDate && !task.deadline && (
				<div className="card-line small">
					<span>с {formatDate(task.startDate)}</span>
				</div>
			)}
		</div>
	);
}

