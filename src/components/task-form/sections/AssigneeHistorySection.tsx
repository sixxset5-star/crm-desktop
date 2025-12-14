import React, { useEffect, useState } from 'react';
import type { TaskAssigneeHistory, Contractor } from '@/types';
import { getTaskAssigneeHistory } from '@/shared/lib/electron-bridge';
import { createLogger } from '@/shared/lib/logger';

const log = createLogger('AssigneeHistory');

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

type AssigneeHistorySectionProps = {
	taskId: string;
	contractors: Contractor[];
};

/**
 * Компонент для отображения истории изменения исполнителей задачи
 */
export function AssigneeHistorySection({ taskId, contractors }: AssigneeHistorySectionProps): React.ReactElement | null {
	const [history, setHistory] = useState<TaskAssigneeHistory[]>([]);
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		if (!taskId) {
			setHistory([]);
			setLoading(false);
			return;
		}

		setLoading(true);
		getTaskAssigneeHistory(taskId)
			.then((h) => {
				setHistory(h);
				setLoading(false);
			})
			.catch((error) => {
				log.error('Failed to load assignee history', error);
				setHistory([]);
				setLoading(false);
			});
	}, [taskId]);

	if (loading) {
		return (
			<div style={{ 
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
					История исполнителей
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

	const getContractorName = (contractorId: string | null | undefined): string => {
		if (!contractorId) return '—';
		const contractor = contractors.find(c => c.id === contractorId);
		return contractor ? contractor.name : 'Неизвестный подрядчик';
	};

	const formatHistoryEntry = (entry: TaskAssigneeHistory): string => {
		const date = formatDateShort(entry.changedAt);
		const oldName = getContractorName(entry.oldContractorId);
		const newName = getContractorName(entry.newContractorId);

		if (!entry.oldContractorId && entry.newContractorId) {
			return `${date} — Исполнитель назначен: ${newName}`;
		} else if (entry.oldContractorId && !entry.newContractorId) {
			return `${date} — Исполнитель снят (${oldName} деактивирован)`;
		} else if (entry.oldContractorId && entry.newContractorId) {
			return `${date} — Исполнитель изменён: ${oldName} → ${newName}`;
		}
		return `${date} — Изменение исполнителя`;
	};

	return (
		<div style={{ 
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
				История исполнителей
			</div>
			<div style={{ 
				display: 'flex',
				flexDirection: 'column',
				gap: 'var(--space-xs)'
			}}>
				{history.map((entry) => (
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
			</div>
		</div>
	);
}


