import React, { useEffect, useState } from 'react';
import type { TaskAssigneeHistory, Task } from '@/types';
import { getContractorAssigneeHistory } from '@/shared/lib/electron-bridge';
import { useBoardStore } from '@/store/board';
import { useShallowSelector } from '@/shared/hooks/useStoreSelectors';
import { createLogger } from '@/shared/lib/logger';

const log = createLogger('ContractorTaskHistory');

type ContractorTaskHistorySectionProps = {
	contractorId: string;
};

function formatDateShort(dateString: string): string {
	try {
		const date = new Date(dateString);
		const day = String(date.getDate()).padStart(2, '0');
		const month = String(date.getMonth() + 1).padStart(2, '0');
		const year = date.getFullYear();
		return `${day}.${month}.${year}`;
	} catch {
		return dateString;
	}
}

/**
 * Компонент для отображения истории всех задач подрядчика
 */
export function ContractorTaskHistorySection({ contractorId }: ContractorTaskHistorySectionProps): React.ReactElement | null {
	const [history, setHistory] = useState<TaskAssigneeHistory[]>([]);
	const [loading, setLoading] = useState(true);
	const tasks = useShallowSelector(useBoardStore, (s) => s.tasks);

	useEffect(() => {
		if (!contractorId) {
			setHistory([]);
			setLoading(false);
			return;
		}

		setLoading(true);
		getContractorAssigneeHistory(contractorId)
			.then((h) => {
				setHistory(h);
				setLoading(false);
			})
			.catch((error) => {
				log.error('Failed to load contractor assignee history', error);
				setHistory([]);
				setLoading(false);
			});
	}, [contractorId]);

	if (loading) {
		return (
			<div style={{ 
				width: '100%',
				padding: 'var(--space-md)',
				background: 'var(--bg)',
				borderRadius: 'var(--radius-md)',
				border: 'var(--border-default)'
			}}>
				<div style={{ 
					fontSize: 'var(--font-size-xs)', 
					color: 'var(--muted)',
					marginBottom: 'var(--space-sm)',
					fontWeight: 'var(--font-weight-medium)'
				}}>
					История задач
				</div>
				<div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--muted)' }}>
					Загрузка...
				</div>
			</div>
		);
	}

	if (history.length === 0) {
		return null;
	}

	const getTaskTitle = (taskId: string): string => {
		const task = tasks.find(t => t.id === taskId);
		return task ? task.title : 'Неизвестная задача';
	};

	const formatHistoryEntry = (entry: TaskAssigneeHistory): string => {
		const date = formatDateShort(entry.changedAt);
		const taskTitle = getTaskTitle(entry.taskId);

		if (!entry.oldContractorId && entry.newContractorId) {
			return `${date} — Назначен на задачу "${taskTitle}"`;
		} else if (entry.oldContractorId && !entry.newContractorId) {
			return `${date} — Снят с задачи "${taskTitle}" (деактивирован)`;
		} else if (entry.oldContractorId && entry.newContractorId) {
			return `${date} — Заменён на задаче "${taskTitle}"`;
		}
		return `${date} — Изменение на задаче "${taskTitle}"`;
	};

	// Группируем по задачам и показываем последние 10 записей
	const recentHistory = history.slice(0, 10);

	return (
		<div style={{ 
			width: '100%',
			padding: 'var(--space-md)',
			background: 'var(--bg)',
			borderRadius: 'var(--radius-md)',
			border: 'var(--border-default)'
		}}>
			<div style={{ 
				fontSize: 'var(--font-size-xs)', 
				color: 'var(--muted)',
				marginBottom: 'var(--space-sm)',
				fontWeight: 'var(--font-weight-medium)'
			}}>
				История задач ({history.length})
			</div>
			<div style={{ 
				display: 'flex',
				flexDirection: 'column',
				gap: 'var(--space-xs)'
			}}>
				{recentHistory.map((entry) => (
					<div 
						key={entry.id} 
						style={{ 
							fontSize: 'var(--font-size-sm)',
							color: 'var(--text)',
							padding: 'var(--space-xs)',
							background: 'var(--surface)',
							borderRadius: 'var(--radius-sm)',
							lineHeight: 'var(--line-height-relaxed)'
						}}
					>
						{formatHistoryEntry(entry)}
					</div>
				))}
				{history.length > 10 && (
					<div style={{ 
						fontSize: 'var(--font-size-xs)', 
						color: 'var(--muted)',
						marginTop: 'var(--space-xs)',
						textAlign: 'center'
					}}>
						...и еще {history.length - 10} записей
					</div>
				)}
			</div>
		</div>
	);
}


