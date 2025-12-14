import React from 'react';
import { TaskModalCard } from '@/shared/components';
import type { TaskForMonth } from '../utils/getTasksForMonth';
import type { Customer } from '@/types';

type TaskCardModalProps = {
	task: TaskForMonth;
	customer?: Customer;
};

export function TaskCardModal({ task, customer }: TaskCardModalProps): React.ReactElement {
	// Считаем общую сумму оплаченных платежей
	const totalPaid = task.payments.reduce((sum, p) => sum + p.amount, 0);

	return (
		<TaskModalCard
			task={{
				id: task.id,
				title: task.title,
				amount: task.income > 0 ? task.income : undefined,
				deadline: task.deadline,
			}}
			customer={customer || (task.customer ? { id: '', name: task.customer, avatar: task.customerAvatar } : undefined)}
			showEditButton={false}
			showPriority={false}
			totalPaid={totalPaid}
		/>
	);
}






