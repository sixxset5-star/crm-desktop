import { useUIStore } from '@/store/ui';
import { useBoardStore, Columns } from '@/store/board';
import type { Task, ColumnId } from '@/types';
import { useCustomersStore } from '@/store/customers';
import type { Customer } from '@/types';
import { useIncomeStore, type Income } from '@/store/income';
import { useGoalsStore, type Goal, type MonthlyExpense, type Credit } from '@/store/goals';

/**
 * Система триггеров для плавающих уведомлений
 * Отслеживает изменения в store и показывает соответствующие уведомления
 */

// ==================== ТРИГГЕРЫ ДЛЯ ЗАДАЧ ====================

export function triggerTaskCreated(task: Task, columnId: ColumnId) {
	const columnTitle = Columns.find((c) => c.id === columnId)?.title || 'Неразобранные';
	useUIStore.getState().showResultToast({
		type: 'success',
		title: '✅ Задача создана',
		subtitle: `Добавлена в «${columnTitle}»`,
	});
}

export function triggerTaskUpdated(oldTask: Task, newTask: Task, updates: Partial<Task>) {
	// Задача закрыта
	if (updates.columnId === 'closed' && oldTask.columnId !== 'closed') {
		const income = newTask.amount || 0;
		useUIStore.getState().showResultToast({
			type: 'success',
			title: '☑ Задача закрыта',
			subtitle: income > 0 ? `+${income.toLocaleString('ru-RU')} ₽ в заработок` : undefined,
		});
		return;
	}
	
	// Задача завершена
	if (updates.columnId === 'completed' && oldTask.columnId !== 'completed') {
		useUIStore.getState().showResultToast({
			type: 'success',
			title: '☑ Задача завершена',
			subtitle: newTask.amount ? `+${newTask.amount.toLocaleString('ru-RU')} ₽ в заработок месяца` : undefined,
		});
		return;
	}
	
	// Задача возвращена из закрытых
	if ((oldTask.columnId === 'closed' || oldTask.columnId === 'completed') && 
		updates.columnId && 
		updates.columnId !== 'closed' && 
		updates.columnId !== 'completed') {
		const columnTitle = Columns.find((c) => c.id === updates.columnId)?.title || updates.columnId;
		useUIStore.getState().showResultToast({
			type: 'info',
			title: '↩️ Задача возвращена',
			subtitle: `в «${columnTitle}»`,
		});
		return;
	}
	
	// Изменен дедлайн
	if (updates.deadline !== undefined && updates.deadline !== oldTask.deadline) {
		if (updates.deadline) {
			const date = new Date(updates.deadline);
			const oldDate = oldTask.deadline ? new Date(oldTask.deadline) : null;
			if (oldDate && date < oldDate) {
				const diffDays = Math.ceil((oldDate.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
				useUIStore.getState().showResultToast({
					type: 'warning',
					title: '📅 Дедлайн перенесён',
					subtitle: `срок уменьшен на ${diffDays} ${diffDays === 1 ? 'день' : diffDays < 5 ? 'дня' : 'дней'}`,
				});
			} else if (oldDate && date > oldDate) {
				const diffDays = Math.ceil((date.getTime() - oldDate.getTime()) / (1000 * 60 * 60 * 24));
				useUIStore.getState().showResultToast({
					type: 'info',
					title: '📅 Дедлайн перенесён',
					subtitle: `срок увеличен на ${diffDays} ${diffDays === 1 ? 'день' : diffDays < 5 ? 'дня' : 'дней'}`,
				});
			} else {
				useUIStore.getState().showResultToast({
					type: 'info',
					title: '📅 Дедлайн установлен',
					subtitle: date.toLocaleDateString('ru-RU'),
				});
			}
		} else {
			useUIStore.getState().showResultToast({
				type: 'info',
				title: '📅 Дедлайн удалён',
			});
		}
		return;
	}
	
	// Изменена стоимость
	if (updates.amount !== undefined && updates.amount !== oldTask.amount) {
		const oldAmount = oldTask.amount || 0;
		const newAmount = updates.amount || 0;
		if (newAmount > oldAmount) {
			const diff = newAmount - oldAmount;
			useUIStore.getState().showResultToast({
				type: 'success',
				title: '💰 Стоимость увеличена',
				subtitle: `+${diff.toLocaleString('ru-RU')} ₽ (${newAmount.toLocaleString('ru-RU')} ₽)`,
			});
		} else if (newAmount < oldAmount && newAmount > 0) {
			const diff = oldAmount - newAmount;
			useUIStore.getState().showResultToast({
				type: 'warning',
				title: '💰 Стоимость уменьшена',
				subtitle: `-${diff.toLocaleString('ru-RU')} ₽ (${newAmount.toLocaleString('ru-RU')} ₽)`,
			});
		} else {
			useUIStore.getState().showResultToast({
				type: 'info',
				title: '💰 Стоимость изменена',
				subtitle: newAmount > 0 ? `${newAmount.toLocaleString('ru-RU')} ₽` : 'удалена',
			});
		}
		return;
	}
	
	// Изменен приоритет
	if (updates.priority !== undefined && updates.priority !== oldTask.priority) {
		const priorityLabels: Record<string, string> = {
			high: 'Высокий',
			medium: 'Средний',
			low: 'Низкий',
		};
		useUIStore.getState().showResultToast({
			type: 'info',
			title: '⚡ Приоритет изменён',
			subtitle: priorityLabels[updates.priority] || updates.priority,
		});
		return;
	}
	
	// Изменен клиент
	if (updates.customerId !== undefined && updates.customerId !== oldTask.customerId) {
		const customers = useCustomersStore.getState().customers;
		if (updates.customerId) {
			const customer = customers.find((c) => c.id === updates.customerId);
			useUIStore.getState().showResultToast({
				type: 'info',
				title: '👤 Клиент назначен',
				subtitle: customer?.name || 'Новый клиент',
			});
		} else {
			useUIStore.getState().showResultToast({
				type: 'info',
				title: '👤 Клиент удалён',
			});
		}
		return;
	}
	
	// Добавлены файлы
	if (updates.files && updates.files.length > (oldTask.files?.length || 0)) {
		const addedCount = updates.files.length - (oldTask.files?.length || 0);
		useUIStore.getState().showResultToast({
			type: 'success',
			title: '📎 Файл прикреплён',
			subtitle: addedCount > 1 ? `${addedCount} файла добавлено` : undefined,
		});
		return;
	}
	
	// Удалены файлы
	if (updates.files !== undefined && (updates.files.length || 0) < (oldTask.files?.length || 0)) {
		const removedCount = (oldTask.files?.length || 0) - (updates.files.length || 0);
		useUIStore.getState().showResultToast({
			type: 'info',
			title: '📎 Файл удалён',
			subtitle: removedCount > 1 ? `${removedCount} файлов удалено` : undefined,
		});
		return;
	}
	
	// Добавлены теги
	if (updates.tags && updates.tags.length > (oldTask.tags?.length || 0)) {
		const addedTags = updates.tags.filter((t) => !oldTask.tags?.includes(t));
		useUIStore.getState().showResultToast({
			type: 'success',
			title: '🏷️ Тег добавлен',
			subtitle: addedTags.length > 0 ? addedTags.join(', ') : undefined,
		});
		return;
	}
	
	// Удалены теги
	if (updates.tags !== undefined && (updates.tags.length || 0) < (oldTask.tags?.length || 0)) {
		const removedTags = oldTask.tags?.filter((t) => !updates.tags?.includes(t)) || [];
		useUIStore.getState().showResultToast({
			type: 'info',
			title: '🏷️ Тег удалён',
			subtitle: removedTags.length > 0 ? removedTags.join(', ') : undefined,
		});
		return;
	}
	
	// Добавлены ссылки
	if (updates.links && Array.isArray(updates.links) && updates.links.length > (oldTask.links?.length || 0)) {
		const addedCount = updates.links.length - (oldTask.links?.length || 0);
		useUIStore.getState().showResultToast({
			type: 'success',
			title: '🔗 Ссылка добавлена',
			subtitle: addedCount > 1 ? `${addedCount} ссылок добавлено` : undefined,
		});
		return;
	}
	
	// Добавлены подзадачи
	if (updates.subtasks && updates.subtasks.length > (oldTask.subtasks?.length || 0)) {
		const addedCount = updates.subtasks.length - (oldTask.subtasks?.length || 0);
		useUIStore.getState().showResultToast({
			type: 'success',
			title: '📋 Подзадача добавлена',
			subtitle: addedCount > 1 ? `${addedCount} подзадач добавлено` : undefined,
		});
		return;
	}
	
	// Изменены расходы
	if (updates.expenses !== undefined && updates.expenses !== oldTask.expenses) {
		const oldExpenses = oldTask.expenses || 0;
		const newExpenses = updates.expenses || 0;
		if (newExpenses > oldExpenses) {
			const diff = newExpenses - oldExpenses;
			useUIStore.getState().showResultToast({
				type: 'info',
				title: '💸 Расходы увеличены',
				subtitle: `+${diff.toLocaleString('ru-RU')} ₽`,
			});
		} else if (newExpenses < oldExpenses) {
			const diff = oldExpenses - newExpenses;
			useUIStore.getState().showResultToast({
				type: 'info',
				title: '💸 Расходы уменьшены',
				subtitle: `-${diff.toLocaleString('ru-RU')} ₽`,
			});
		}
		return;
	}
	
	// Изменена оплата
	if (updates.paidAmount !== undefined && updates.paidAmount !== oldTask.paidAmount) {
		const oldPaid = oldTask.paidAmount || 0;
		const newPaid = updates.paidAmount || 0;
		const taskAmount = newTask.amount || 0;
		if (newPaid > oldPaid) {
			const diff = newPaid - oldPaid;
			const remaining = Math.max(0, taskAmount - newPaid);
			useUIStore.getState().showResultToast({
				type: 'success',
				title: '💳 Оплата получена',
				subtitle: remaining > 0 
					? `+${diff.toLocaleString('ru-RU')} ₽ (осталось ${remaining.toLocaleString('ru-RU')} ₽)`
					: `+${diff.toLocaleString('ru-RU')} ₽ (полностью оплачено)`,
			});
		}
		return;
	}
	
	// Изменена налоговая ставка
	if (updates.taxRate !== undefined && updates.taxRate !== oldTask.taxRate) {
		useUIStore.getState().showResultToast({
			type: 'info',
			title: '📊 Налоговая ставка изменена',
			subtitle: updates.taxRate ? `${updates.taxRate}%` : 'удалена',
		});
		return;
	}
	
	// Изменена дата начала
	if (updates.startDate !== undefined && updates.startDate !== oldTask.startDate) {
		if (updates.startDate) {
			useUIStore.getState().showResultToast({
				type: 'info',
				title: '📅 Дата начала установлена',
				subtitle: new Date(updates.startDate).toLocaleDateString('ru-RU'),
			});
		} else {
			useUIStore.getState().showResultToast({
				type: 'info',
				title: '📅 Дата начала удалена',
			});
		}
		return;
	}
}

export function triggerTaskMoved(task: Task, fromColumn: ColumnId, toColumn: ColumnId) {
	if (fromColumn === toColumn) return;
	
	const columnTitle = Columns.find((c) => c.id === toColumn)?.title || toColumn;
	
	if (toColumn === 'closed') {
		useUIStore.getState().showResultToast({
			type: 'success',
			title: '☑ Задача закрыта',
			subtitle: task.amount ? `+${task.amount.toLocaleString('ru-RU')} ₽ в заработок месяца` : undefined,
		});
	} else if (toColumn === 'completed') {
		useUIStore.getState().showResultToast({
			type: 'success',
			title: '☑ Задача завершена',
			subtitle: task.amount ? `+${task.amount.toLocaleString('ru-RU')} ₽ в заработок месяца` : undefined,
		});
	} else {
		useUIStore.getState().showResultToast({
			type: 'info',
			title: '↔️ Задача перемещена',
			subtitle: `в «${columnTitle}»`,
		});
	}
}

export function triggerTaskDeleted(task: Task) {
	useUIStore.getState().showResultToast({
		type: 'info',
		title: '🗑️ Задача удалена',
		subtitle: task.title,
	});
}

// ==================== ТРИГГЕРЫ ДЛЯ КЛИЕНТОВ ====================

export function triggerCustomerCreated(customer: Customer) {
	useUIStore.getState().showResultToast({
		type: 'success',
		title: '👤 Клиент создан',
		subtitle: customer.name,
	});
}

export function triggerCustomerUpdated(oldCustomer: Customer, newCustomer: Customer, updates: Partial<Customer>) {
	// Изменено имя
	if (updates.name !== undefined && updates.name !== oldCustomer.name) {
		useUIStore.getState().showResultToast({
			type: 'info',
			title: '👤 Имя клиента изменено',
			subtitle: updates.name,
		});
		return;
	}
	
	// Добавлены контакты
	if (updates.contacts && updates.contacts.length > (oldCustomer.contacts?.length || 0)) {
		const addedCount = updates.contacts.length - (oldCustomer.contacts?.length || 0);
		useUIStore.getState().showResultToast({
			type: 'success',
			title: '📞 Контакт добавлен',
			subtitle: addedCount > 1 ? `${addedCount} контактов добавлено` : undefined,
		});
		return;
	}
	
	// Добавлены доступы
	if (updates.accesses && updates.accesses.length > (oldCustomer.accesses?.length || 0)) {
		const addedCount = updates.accesses.length - (oldCustomer.accesses?.length || 0);
		useUIStore.getState().showResultToast({
			type: 'success',
			title: '🔐 Доступ добавлен',
			subtitle: addedCount > 1 ? `${addedCount} доступов добавлено` : undefined,
		});
		return;
	}
}

export function triggerCustomerDeleted(customer: Customer) {
	useUIStore.getState().showResultToast({
		type: 'info',
		title: '🗑️ Клиент удалён',
		subtitle: customer.name,
	});
}

// ==================== ТРИГГЕРЫ ДЛЯ ДОХОДОВ ====================

export function triggerIncomeCreated(income: Income) {
	const now = new Date();
	const currentMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
	const monthlyGoals = useGoalsStore.getState().monthlyFinancialGoals;
	const currentMonthGoal = monthlyGoals.find((m) => m.monthKey === currentMonthKey);
	const expenses = currentMonthGoal && Array.isArray(currentMonthGoal.expenses) ? currentMonthGoal.expenses : [];
	const totalExpenses = expenses.reduce((sum, e) => sum + (e.amount || 0), 0);
	const credits = useGoalsStore.getState().credits;
	const unpaidCredits = credits.filter((c) => !(c.paidThisMonth ?? false) && c.monthlyPayment);
	const totalMonthlyPayments = unpaidCredits.reduce((sum, c) => sum + (c.monthlyPayment || 0), 0);
	const totalGoal = totalExpenses + totalMonthlyPayments;
	
	const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
	const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
	const incomeDate = new Date(income.date);
	const isThisMonth = incomeDate >= monthStart && incomeDate <= monthEnd;
	
	if (isThisMonth && totalGoal > 0) {
		// Используем setTimeout чтобы получить актуальные данные после обновления store
		setTimeout(() => {
			const allIncomes = useIncomeStore.getState().incomes;
			const currentIncomes = allIncomes.filter((i) => {
				const iDate = new Date(i.date);
				return iDate >= monthStart && iDate <= monthEnd;
			});
			const totalIncome = currentIncomes.reduce((sum, i) => sum + (i.amount || 0), 0);
			const remaining = Math.max(0, totalGoal - totalIncome);
			
			useUIStore.getState().showResultToast({
				type: 'success',
				title: `💰 +${income.amount.toLocaleString('ru-RU')} ₽`,
				subtitle: remaining > 0 ? `Осталось ${remaining.toLocaleString('ru-RU')} ₽ до цели месяца` : '🎉 Месячная цель выполнена!',
			});
		}, 0);
	} else {
		useUIStore.getState().showResultToast({
			type: 'success',
			title: `💰 +${income.amount.toLocaleString('ru-RU')} ₽`,
			subtitle: income.title,
		});
	}
}

export function triggerIncomeUpdated(oldIncome: Income, newIncome: Income, updates: Partial<Income>) {
	// Изменена сумма
	if (updates.amount !== undefined && updates.amount !== oldIncome.amount) {
		const diff = updates.amount - oldIncome.amount;
		useUIStore.getState().showResultToast({
			type: diff > 0 ? 'success' : 'info',
			title: '💰 Доход изменён',
			subtitle: `${diff > 0 ? '+' : ''}${diff.toLocaleString('ru-RU')} ₽ (${updates.amount.toLocaleString('ru-RU')} ₽)`,
		});
		return;
	}
	
	// Изменена дата
	if (updates.date !== undefined && updates.date !== oldIncome.date) {
		useUIStore.getState().showResultToast({
			type: 'info',
			title: '📅 Дата дохода изменена',
			subtitle: new Date(updates.date).toLocaleDateString('ru-RU'),
		});
		return;
	}
}

export function triggerIncomeDeleted(income: Income) {
	useUIStore.getState().showResultToast({
		type: 'info',
		title: '🗑️ Доход удалён',
		subtitle: `${income.amount.toLocaleString('ru-RU')} ₽`,
	});
}

// ==================== ТРИГГЕРЫ ДЛЯ ЦЕЛЕЙ ====================

export function triggerGoalCreated(goal: Goal) {
	useUIStore.getState().showResultToast({
		type: 'success',
		title: '🎯 Цель создана',
		subtitle: goal.title,
	});
}

export function triggerGoalUpdated(oldGoal: Goal, newGoal: Goal, updates: Partial<Goal>) {
	// Цель достигнута
	if (updates.completed && !oldGoal.completed) {
		useUIStore.getState().showResultToast({
			type: 'success',
			title: '🎉 Цель достигнута',
			subtitle: `${newGoal.progress || 100}% из 100%`,
		});
		return;
	}
	
	// Прогресс обновлен
	if (updates.progress !== undefined && updates.progress !== oldGoal.progress) {
		if (updates.progress >= 100 && !newGoal.completed) {
			useUIStore.getState().showResultToast({
				type: 'success',
				title: '🎯 Цель достигнута',
				subtitle: '+100% из 100%',
			});
		} else if (updates.progress > (oldGoal.progress || 0)) {
			const diff = updates.progress - (oldGoal.progress || 0);
			useUIStore.getState().showResultToast({
				type: 'info',
				title: '🎯 Прогресс обновлён',
				subtitle: `+${diff}% (${updates.progress}% из 100%)`,
			});
		} else if (updates.progress < (oldGoal.progress || 0)) {
			const diff = (oldGoal.progress || 0) - updates.progress;
			useUIStore.getState().showResultToast({
				type: 'warning',
				title: '🎯 Прогресс уменьшен',
				subtitle: `-${diff}% (${updates.progress}% из 100%)`,
			});
		}
		return;
	}
	
	// Изменен дедлайн
	if (updates.deadline !== undefined && updates.deadline !== oldGoal.deadline) {
		if (updates.deadline) {
			useUIStore.getState().showResultToast({
				type: 'info',
				title: '📅 Дедлайн цели изменён',
				subtitle: new Date(updates.deadline).toLocaleDateString('ru-RU'),
			});
		} else {
			useUIStore.getState().showResultToast({
				type: 'info',
				title: '📅 Дедлайн цели удалён',
			});
		}
		return;
	}
}

export function triggerGoalDeleted(goal: Goal) {
	useUIStore.getState().showResultToast({
		type: 'info',
		title: '🗑️ Цель удалена',
		subtitle: goal.title,
	});
}

// ==================== ТРИГГЕРЫ ДЛЯ МЕСЯЧНЫХ РАСХОДОВ ====================

export function triggerMonthlyExpenseCreated(expense: MonthlyExpense, monthKey: string) {
	useUIStore.getState().showResultToast({
		type: 'success',
		title: '💸 Расход добавлен',
		subtitle: `${expense.name}: ${expense.amount.toLocaleString('ru-RU')} ₽`,
	});
}

export function triggerMonthlyExpenseUpdated(
	oldExpense: MonthlyExpense,
	newExpense: MonthlyExpense,
	updates: Partial<MonthlyExpense>,
	monthKey: string
) {
	// Расход выполнен
	if (updates.completed !== undefined && updates.completed && !oldExpense.completed) {
		useUIStore.getState().showResultToast({
			type: 'success',
			title: '✅ Расход выполнен',
			subtitle: `${newExpense.name}: ${newExpense.amount.toLocaleString('ru-RU')} ₽`,
		});
		return;
	}
	
	// Изменена сумма
	if (updates.amount !== undefined && updates.amount !== oldExpense.amount) {
		const diff = updates.amount - oldExpense.amount;
		useUIStore.getState().showResultToast({
			type: 'info',
			title: '💸 Сумма расхода изменена',
			subtitle: `${diff > 0 ? '+' : ''}${diff.toLocaleString('ru-RU')} ₽ (${updates.amount.toLocaleString('ru-RU')} ₽)`,
		});
		return;
	}
}

export function triggerMonthlyExpenseDeleted(expense: MonthlyExpense, monthKey: string) {
	useUIStore.getState().showResultToast({
		type: 'info',
		title: '🗑️ Расход удалён',
		subtitle: `${expense.name}: ${expense.amount.toLocaleString('ru-RU')} ₽`,
	});
}

// ==================== ТРИГГЕРЫ ДЛЯ КРЕДИТОВ ====================

export function triggerCreditCreated(credit: Credit) {
	useUIStore.getState().showResultToast({
		type: 'success',
		title: '💳 Кредит добавлен',
		subtitle: credit.monthlyPayment 
			? `${credit.name}: ${credit.monthlyPayment.toLocaleString('ru-RU')} ₽/мес`
			: credit.name,
	});
}

export function triggerCreditUpdated(oldCredit: Credit, newCredit: Credit, updates: Partial<Credit>) {
	// Кредит оплачен
	if (updates.paidThisMonth !== undefined && updates.paidThisMonth && !oldCredit.paidThisMonth) {
		useUIStore.getState().showResultToast({
			type: 'success',
			title: '✅ Кредит оплачен',
			subtitle: newCredit.monthlyPayment 
				? `${newCredit.name}: ${newCredit.monthlyPayment.toLocaleString('ru-RU')} ₽`
				: newCredit.name,
		});
		return;
	}
	
	// Изменен ежемесячный платеж
	if (updates.monthlyPayment !== undefined && updates.monthlyPayment !== oldCredit.monthlyPayment) {
		const diff = (updates.monthlyPayment || 0) - (oldCredit.monthlyPayment || 0);
		useUIStore.getState().showResultToast({
			type: 'info',
			title: '💳 Платёж изменён',
			subtitle: `${diff > 0 ? '+' : ''}${diff.toLocaleString('ru-RU')} ₽ (${(updates.monthlyPayment || 0).toLocaleString('ru-RU')} ₽/мес)`,
		});
		return;
	}
}

export function triggerCreditDeleted(credit: Credit) {
	useUIStore.getState().showResultToast({
		type: 'info',
		title: '🗑️ Кредит удалён',
		subtitle: credit.name,
	});
}

// ==================== ТРИГГЕРЫ ДЛЯ МЕСЯЧНЫХ ФИНАНСОВЫХ ЦЕЛЕЙ ====================

export function triggerMonthlyFinancialGoalUpdated(monthKey: string, updates: { manualProfit?: number; completed?: boolean }) {
	if (updates.completed !== undefined && updates.completed) {
		useUIStore.getState().showResultToast({
			type: 'success',
			title: '🎉 Месячная цель выполнена',
			subtitle: monthKey,
		});
		return;
	}
	
	if (updates.manualProfit !== undefined) {
		useUIStore.getState().showResultToast({
			type: 'info',
			title: '📊 Ручная прибыль обновлена',
			subtitle: `${updates.manualProfit.toLocaleString('ru-RU')} ₽`,
		});
		return;
	}
}

