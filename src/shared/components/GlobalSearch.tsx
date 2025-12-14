import React from 'react';

export function GlobalSearch({
	onClose,
	onTaskClick,
	onCustomerClick,
	onGoalClick,
}: {
	onClose: () => void;
	onTaskClick: (taskId: string) => void;
	onCustomerClick: (customerId: string) => void;
	onGoalClick: (goalId: string) => void;
}): React.ReactElement | null {
	// Placeholder for future: render modal with search; for now, hidden
	return null;
}



