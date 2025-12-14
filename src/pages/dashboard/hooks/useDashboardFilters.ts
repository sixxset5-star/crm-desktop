import { useMemo, useState, useEffect, useRef } from 'react';
import type { Task, ColumnId, TaskPriority } from '@/types';
import { parseDateOnly } from '@/shared/lib/date';
import { getTaskPaymentInfo } from '@/domain/task';
import { debounce } from '@/shared/lib/debounce';
import { getTaskAssigneeHistory } from '@/shared/lib/electron-bridge';
import { DEBOUNCE_DELAY_MS, MONTHS_AHEAD_FOR_TASKS } from '@/shared/constants/numeric-constants';

type FilterState = {
	search: string;
	searchInput: string;
	filterCustomer: string;
	filterContractor: string;
	filterStatus: ColumnId | 'all';
	filterPriority: TaskPriority | 'all';
	filterTags: string;
	filterStartDate: string;
	filterEndDate: string;
	filterAssigneeChanged: boolean;
};

type UseDashboardFiltersProps = {
	tasks: Task[];
	getTaskColumnForCalculations: (task: Task) => ColumnId;
};

function getPrimaryTaskDate(task: Task): Date | null {
	return (
		parseDateOnly(task.deadline) ??
		parseDateOnly(task.startDate) ??
		parseDateOnly(task.updatedAt) ??
		parseDateOnly(task.createdAt) ??
		null
	);
}

export function useDashboardFilters({ tasks, getTaskColumnForCalculations }: UseDashboardFiltersProps) {
	const [search, setSearch] = useState('');
	const [searchInput, setSearchInput] = useState('');
	const [filterCustomer, setFilterCustomer] = useState<string>('all');
	const [filterContractor, setFilterContractor] = useState<string>('all');
	const [filterStatus, setFilterStatus] = useState<ColumnId | 'all'>('all');
	const [filterPriority, setFilterPriority] = useState<TaskPriority | 'all'>('all');
	const [filterTags, setFilterTags] = useState('');
	const [filterStartDate, setFilterStartDate] = useState('');
	const [filterEndDate, setFilterEndDate] = useState('');
	const [filterAssigneeChanged, setFilterAssigneeChanged] = useState(false);
	const [tasksWithHistory, setTasksWithHistory] = useState<Set<string>>(new Set());

	const debouncedSetSearchRef = useRef(
		debounce((value: string) => {
			setSearch(value);
		}, DEBOUNCE_DELAY_MS)
	);

	useEffect(() => {
		debouncedSetSearchRef.current(searchInput);
	}, [searchInput]);

	// Загружаем историю для задач, если фильтр активен
	useEffect(() => {
		if (!filterAssigneeChanged) {
			setTasksWithHistory(new Set());
			return;
		}

		const loadHistory = async () => {
			const historyPromises = tasks.map(async (task) => {
				try {
					const history = await getTaskAssigneeHistory(task.id);
					return history.length > 0 ? task.id : null;
				} catch {
					return null;
				}
			});

			const results = await Promise.all(historyPromises);
			const taskIdsWithHistory = new Set<string>(results.filter((id): id is string => id !== null));
			setTasksWithHistory(taskIdsWithHistory);
		};

		loadHistory();
	}, [filterAssigneeChanged, tasks]);

	// Автосброс фильтра подрядчика при смене заказчика
	const handleCustomerChange = (value: string) => {
		setFilterCustomer(value);
		if (value !== 'all') {
			setFilterContractor('all');
		}
	};

	const activeTagFilters = useMemo(() => {
		return filterTags
			.split(',')
			.map((tag) => tag.trim().toLowerCase())
			.filter((tag) => tag.length > 0);
	}, [filterTags]);

	const filteredTasks = useMemo(() => {
		let result = tasks;
		const today = new Date();
		const currentMonthStart = new Date(today.getFullYear(), today.getMonth(), 1);
		const threeMonthsLater = new Date(today.getFullYear(), today.getMonth() + MONTHS_AHEAD_FOR_TASKS, 1);

		result = result.filter((t) => {
			// Задачи на паузе всегда показываются на доске
			if (t.columnId === 'paused') return true;
			
			const effectiveColumnId = getTaskColumnForCalculations(t);
			// Задачи из "завершено" всегда показываются на доске
			if (effectiveColumnId === 'completed') {
				return true;
			}
			// Задачи из "закрыт" скрываются, если полностью оплачены и последний платеж был до текущего месяца (они в архиве)
			if (effectiveColumnId === 'closed') {
				const { isFullyPaid, lastPaymentDate } = getTaskPaymentInfo(t);

				if (!isFullyPaid) {
					return true;
				}

				if (!lastPaymentDate) {
					return true;
				}

				const lastPaymentMonthStart = new Date(lastPaymentDate.getFullYear(), lastPaymentDate.getMonth(), 1);
				return lastPaymentMonthStart >= currentMonthStart;
			}

			if (t.columnId === 'unprocessed') {
				return true;
			}

			if (effectiveColumnId === 'inwork' || effectiveColumnId === 'notstarted') {
				if (!t.deadline) return true;
				const startDate = t.startDate ? new Date(t.startDate) : null;
				startDate?.setHours(0, 0, 0, 0);
				if (startDate && startDate >= currentMonthStart) {
					return true;
				}
				const deadlineDate = new Date(t.deadline);
				deadlineDate.setHours(0, 0, 0, 0);
				return deadlineDate <= threeMonthsLater;
			}

			return true;
		});

		if (search.trim()) {
			const q = search.toLowerCase();
			result = result.filter((t) => t.title.toLowerCase().includes(q) || t.notes?.toLowerCase().includes(q));
		}

		if (filterCustomer !== 'all') {
			result = result.filter((t) => t.customerId === filterCustomer);
		}

		if (filterContractor !== 'all') {
			if (filterContractor === 'none') {
				result = result.filter((t) => !t.contractorId);
			} else {
				result = result.filter((t) => t.contractorId === filterContractor);
			}
		}

		if (filterAssigneeChanged) {
			result = result.filter((t) => tasksWithHistory.has(t.id));
		}

		if (filterStatus !== 'all') {
			result = result.filter((t) => {
				if (filterStatus === 'paused') {
					return t.columnId === 'paused';
				}
				const effectiveColumnId = getTaskColumnForCalculations(t);
				return effectiveColumnId === filterStatus;
			});
		}

		if (filterPriority !== 'all') {
			result = result.filter((t) => t.priority === filterPriority);
		}

		if (activeTagFilters.length > 0) {
			result = result.filter((t) => {
				const tags = (t.tags || []).map((tag) => tag.toLowerCase().trim());
				return activeTagFilters.every((tag) => tags.includes(tag));
			});
		}

		if (filterStartDate || filterEndDate) {
			const start = parseDateOnly(filterStartDate);
			const end = parseDateOnly(filterEndDate);
			result = result.filter((t) => {
				const date = getPrimaryTaskDate(t);
				if (!date) return false;
				if (start && date < start) return false;
				if (end && date > end) return false;
				return true;
			});
		}

		return result;
	}, [
		tasks,
		search,
		filterCustomer,
		filterContractor,
		filterStatus,
		filterPriority,
		activeTagFilters,
		filterStartDate,
		filterEndDate,
		filterAssigneeChanged,
		tasksWithHistory,
		getTaskColumnForCalculations,
	]);

	const hasActiveFilters = Boolean(
		search ||
		filterCustomer !== 'all' ||
		filterContractor !== 'all' ||
		filterStatus !== 'all' ||
		filterPriority !== 'all' ||
		filterTags ||
		filterStartDate ||
		filterEndDate ||
		filterAssigneeChanged
	);

	const resetFilters = () => {
		setSearch('');
		setSearchInput('');
		setFilterCustomer('all');
		setFilterContractor('all');
		setFilterStatus('all');
		setFilterPriority('all');
		setFilterTags('');
		setFilterStartDate('');
		setFilterEndDate('');
		setFilterAssigneeChanged(false);
	};

	return {
		// State
		searchInput,
		filterCustomer,
		filterContractor,
		filterStatus,
		filterPriority,
		filterTags,
		filterStartDate,
		filterEndDate,
		filterAssigneeChanged,
		// Setters
		setSearchInput,
		setFilterCustomer: handleCustomerChange,
		setFilterContractor,
		setFilterStatus,
		setFilterPriority,
		setFilterTags,
		setFilterStartDate,
		setFilterEndDate,
		setFilterAssigneeChanged,
		// Computed
		filteredTasks,
		hasActiveFilters,
		activeTagFilters,
		// Actions
		resetFilters,
	};
}


