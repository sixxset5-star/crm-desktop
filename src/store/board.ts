import { create } from 'zustand';
import { loadTasks, saveTasks } from '@/shared/lib/data-source';
import { useHistoryStore } from './history';
import { triggerTaskCreated, triggerTaskUpdated, triggerTaskMoved, triggerTaskDeleted } from '@/shared/lib/toast-triggers';
import { migrateTasks } from '@/shared/lib/task-migration';
import { createAsyncState, AsyncStateHelpers } from '@/shared/store/async-store-base';
import type { ErrorShape } from '@/shared/lib/error-types';
import type { Task, ColumnId, TaskPriority, SubTask, TaskLink } from '@/types';
import { createLogger } from '@/shared/lib/logger';
import { generateTaskId } from '@/shared/utils/id';

const log = createLogger('Board');

// Helper для нормализации ссылок (поддержка старого формата string[] и нового TaskLink[])
export function normalizeLinks(links?: string[] | TaskLink[]): TaskLink[] {
	if (!links || links.length === 0) return [];
	return links.map((link) => {
		if (typeof link === 'string') {
			return { url: link };
		}
		return link;
	});
}

export const Columns: { id: ColumnId; title: string }[] = [
	{ id: 'unprocessed', title: 'Неразобранные' },
	{ id: 'notstarted', title: 'Не начат' },
	{ id: 'inwork', title: 'В работе' },
	{ id: 'completed', title: 'Завершено' },
	{ id: 'closed', title: 'Закрыт' },
];

type BoardState = {
	tasks: Task[];
	hasLoadedOnce: boolean; // Флаг первой загрузки внутри стора
	isHydrating: boolean; // Флаг загрузки из БД - отключает автосейв
	isLoading: boolean;
	isSaving: boolean;
	error: ErrorShape | null;
	lastSyncAt: string | null;
	addTask: (data: { title: string; amount?: number; notes?: string; columnId?: ColumnId; startDate?: string; deadline?: string; expenses?: number; paidAmount?: number; taxRate?: number; customerId?: string; subtasks?: SubTask[]; tags?: string[]; links?: string[] | TaskLink[]; files?: string[]; calculatorQuantity?: number; calculatorPricePerUnit?: number; priority?: TaskPriority; }) => void;
	updateTask: (id: string, updates: Partial<Omit<Task, 'id'>>) => void;
	moveTask: (id: string, toColumn: ColumnId) => void;
	loadFromDisk: () => Promise<void>;
    removeTask: (id: string) => void;
	clearAllTasks: () => void;
};

export const useBoardStore = create<BoardState>((set, get) => ({
	...createAsyncState(),
	tasks: [] as Task[],
	hasLoadedOnce: false,
	isHydrating: false,
		addTask: ({ title, amount, notes, columnId = 'unprocessed', startDate, deadline, expenses, paidAmount, taxRate, customerId, subtasks, tags, links, files, calculatorQuantity, calculatorPricePerUnit, priority }) =>
		set((state) => {
			const newTask: Task = { id: generateTaskId(), title, amount, notes, columnId, startDate, deadline, expenses, paidAmount, taxRate, customerId, subtasks, tags, links, files, calculatorQuantity, calculatorPricePerUnit, priority, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
			
			log.debug('addTask called', {
				title: newTask.title,
				id: newTask.id,
				columnId: newTask.columnId,
				totalTasksBefore: state.tasks.length,
				isHydrating: state.isHydrating,
				hasLoadedOnce: state.hasLoadedOnce
			});
			
			// Оптимистичное обновление
			const newTasks = [...state.tasks, newTask];
			
			log.debug('New task added', { totalTasks: newTasks.length });
			
			// Проверяем, что задача действительно в массиве
			const taskInArray = newTasks.find(t => t.id === newTask.id);
			if (!taskInArray) {
				log.error('Task not found in newTasks array', { taskId: newTask.id });
			} else {
				log.debug('Task confirmed in array', { title: taskInArray.title });
			}
			
			useHistoryStore.getState().push(state.tasks);
			setTimeout(() => triggerTaskCreated(newTask, columnId), 0);
			
			// ВАЖНО: setSaving распространяет весь state, включая tasks, поэтому tasks должен быть ПОСЛЕ
			const savingState = AsyncStateHelpers.setSaving(state);
			const { tasks: _, ...stateWithoutTasks } = savingState; // Удаляем tasks из savingState
			const newState = { 
				...stateWithoutTasks,
				tasks: newTasks, // tasks должен быть ПОСЛЕ, чтобы не перезаписаться
			};
			
			// Проверяем состояние сразу после возврата
			setTimeout(() => {
				const checkState = get();
				const rodinkaInState = checkState.tasks.find(t => t.title && t.title.toLowerCase().includes('родинк'));
				if (rodinkaInState) {
					log.debug('addTask - Задача "Родинка" подтверждена в store после set', {
						id: rodinkaInState.id,
						totalTasks: checkState.tasks.length
					});
				} else {
					log.error('addTask - Задача "Родинка" НЕ найдена в store после set', {
						totalTasks: checkState.tasks.length
					});
				}
			}, 0);
			
			return newState;
		}),
	updateTask: (id, updates) =>
		set((state) => {
			const oldTask = state.tasks.find((t) => t.id === id);
			if (!oldTask) return state;
			
			// Обрабатываем логику pausedFromColumnId при изменении columnId
			let finalUpdates = { ...updates };
			if (updates.columnId !== undefined) {
				const newColumnId = updates.columnId;
				const oldColumnId = oldTask.columnId;
				
				// Если перемещаем в паузу, сохраняем исходный статус
				if (newColumnId === 'paused' && oldColumnId !== 'paused') {
					finalUpdates.pausedFromColumnId = oldColumnId;
				}
				
				// Если перемещаем из паузы, очищаем pausedFromColumnId
				if (oldColumnId === 'paused' && newColumnId !== 'paused') {
					finalUpdates.pausedFromColumnId = undefined;
				}
			}
			
			const newTasks = state.tasks.map((t) => (t.id === id ? { ...t, ...finalUpdates, updatedAt: new Date().toISOString() } : t));
			const updatedTask = newTasks.find((t) => t.id === id);
			
			// Проверяем, не перезаписывается ли задача "Родинка"
			if (oldTask && oldTask.title && oldTask.title.toLowerCase().includes('родинк')) {
				log.debug('updateTask - Обновляется задача "Родинка"', { id: oldTask.id });
			}
			
			useHistoryStore.getState().push(state.tasks);
			
			if (oldTask && updatedTask) {
				setTimeout(() => triggerTaskUpdated(oldTask, updatedTask, finalUpdates), 0);
			}
			
			return { tasks: newTasks };
		}),
	moveTask: (id, toColumn) =>
		set((state) => {
			const task = state.tasks.find((t) => t.id === id);
			if (!task) return state;
			
			const fromColumn = task.columnId;
			
			// Обновляем локальное состояние с учетом логики паузы
			const newTasks = state.tasks.map((t) => {
				if (t.id !== id) return t;
				
				// Если перемещаем в паузу, сохраняем исходный статус
				if (toColumn === 'paused' && fromColumn !== 'paused') {
					return { ...t, columnId: toColumn, pausedFromColumnId: fromColumn };
				}
				
				// Если перемещаем из паузы, очищаем pausedFromColumnId
				if (fromColumn === 'paused' && toColumn !== 'paused') {
					return { ...t, columnId: toColumn, pausedFromColumnId: undefined };
				}
				
				// Обычное перемещение
				return { ...t, columnId: toColumn };
			});
			
			useHistoryStore.getState().push(state.tasks);
			
			if (task.columnId !== toColumn) {
				setTimeout(() => triggerTaskMoved(task, fromColumn, toColumn), 0);
			}
			
			return { tasks: newTasks };
		}),
    removeTask: (id) =>
        set((state) => {
			const task = state.tasks.find((t) => t.id === id);
			const newTasks = state.tasks.filter((t) => t.id !== id);
			useHistoryStore.getState().push(state.tasks);
			
			if (task) {
				setTimeout(() => triggerTaskDeleted(task), 0);
			}
			
			return { tasks: newTasks };
		}),
	clearAllTasks: () =>
		set({ tasks: [] }),
	loadFromDisk: async () => {
		// Всегда загружаем, если еще не загружали
		const currentState = get();
		if (currentState.hasLoadedOnce) {
			log.debug('loadFromDisk skipped - already loaded once');
			// Проверяем, не перезаписываем ли мы задачу "Родинка"
			const rodinkaBeforeSkip = currentState.tasks.find(t => t.title && t.title.toLowerCase().includes('родинк'));
			if (rodinkaBeforeSkip) {
				log.warn('loadFromDisk skipped, but "Родинка" exists in store');
			}
			return;
		}
		
		const state = get();
		const tasksBeforeLoad = state.tasks.length;
		const rodinkaBeforeLoad = state.tasks.find(t => t.title && t.title.toLowerCase().includes('родинк'));
		log.debug('loadFromDisk starting', { tasksInStoreBeforeLoad: tasksBeforeLoad });
		if (rodinkaBeforeLoad) {
			log.warn('loadFromDisk - Задача "Родинка" существует перед загрузкой! Она будет перезаписана!');
		}
		
		set({
			...AsyncStateHelpers.setLoading(state),
			tasks: state.tasks, // Сохраняем существующие задачи при установке loading
			isHydrating: true, // Отключаем автосейв во время загрузки
		});
		
		try {
			log.debug('Loading tasks from disk');
			const tasks = await loadTasks();
			log.debug('Loaded tasks', { count: tasks.length });
			
			// Проверяем, есть ли задача "Родинка" в загруженных задачах
			const rodinkaInLoaded = tasks.find(t => t.title && t.title.toLowerCase().includes('родинк'));
			if (rodinkaInLoaded) {
				log.debug('Задача "Родинка" найдена в загруженных задачах', {
					id: rodinkaInLoaded.id,
					title: rodinkaInLoaded.title,
					columnId: rodinkaInLoaded.columnId
				});
			} else {
				log.debug('Задача "Родинка" НЕ найдена в загруженных задачах');
			}
			
			// Миграция и валидация через утилиту
			const migratedTasks = migrateTasks(tasks);
			log.debug('Migrated tasks', { count: migratedTasks.length });
			
			// Загружаем задачи даже если массив пустой (чтобы не потерять данные)
			log.debug('Setting tasks in store', { count: migratedTasks.length });
			if (migratedTasks.length > 0) {
				log.debug('Sample task', migratedTasks[0]);
			}
			const currentState = get();
			const rodinkaBeforeSet = currentState.tasks.find(t => t.title && t.title.toLowerCase().includes('родинк'));
			if (rodinkaBeforeSet && !migratedTasks.find(t => t.id === rodinkaBeforeSet.id)) {
				log.error('loadFromDisk - Задача "Родинка" будет ПЕРЕЗАПИСАНА при загрузке!', {
					rodinkaId: rodinkaBeforeSet.id,
					loadedTasksCount: migratedTasks.length
				});
			}
			
			const successState = AsyncStateHelpers.setSuccess(currentState);
			set({ 
				...successState,
				tasks: migratedTasks, 
				hasLoadedOnce: true,
				isHydrating: false, // Включаем автосейв после загрузки
			});
			const finalState = get();
			log.debug('Tasks set, final state', { 
				tasksCount: finalState.tasks.length, 
				hasLoadedOnce: finalState.hasLoadedOnce 
			});
			
			// Не сохраняем автоматически после загрузки - данные уже в БД
			// Автосохранение будет работать через подписку на изменения
		} catch (error) {
			log.error('Failed to load tasks', error);
			const currentState = get();
			set({ 
				...AsyncStateHelpers.setError(currentState, error as ErrorShape),
				tasks: currentState.tasks, // Сохраняем существующие задачи при ошибке
				hasLoadedOnce: true,
				isHydrating: false, // Включаем автосейв даже при ошибке
			});
		}
	},
	undo: () => {
		const history = useHistoryStore.getState();
		const previous = history.undo();
		if (previous) {
			set({ tasks: previous });
		}
	},
	redo: () => {
		const history = useHistoryStore.getState();
		const next = history.redo();
		if (next) {
			set({ tasks: next });
		}
	},
	canUndo: () => useHistoryStore.getState().canUndo(),
	canRedo: () => useHistoryStore.getState().canRedo(),
}));

// autosave with debounce
let saveTimer: ReturnType<typeof setTimeout> | null = null;

useBoardStore.subscribe((state, prevState) => {
	// Логируем все изменения состояния для отладки
	const rodinkaInCurrent = state.tasks.find(t => t.title && t.title.toLowerCase().includes('родинк'));
	
		if (prevState) {
			const rodinkaInPrev = prevState.tasks.find(t => t.title && t.title.toLowerCase().includes('родинк'));
			
			if (state.tasks.length !== prevState.tasks.length) {
				log.debug('Subscribe: Tasks count changed', { 
					from: prevState.tasks.length, 
					to: state.tasks.length 
				});
				if (rodinkaInPrev && !rodinkaInCurrent) {
					log.error('Subscribe: Задача "Родинка" ПОТЕРЯНА при изменении состояния!');
				} else if (!rodinkaInPrev && rodinkaInCurrent) {
					log.debug('Subscribe: Задача "Родинка" ДОБАВЛЕНА в состояние');
				}
			} else if (rodinkaInPrev && !rodinkaInCurrent) {
				log.error('Subscribe: Задача "Родинка" ПОТЕРЯНА (количество задач не изменилось)!');
			} else if (!rodinkaInPrev && rodinkaInCurrent) {
				log.debug('Subscribe: Задача "Родинка" ДОБАВЛЕНА (количество задач не изменилось)');
			}
		} else {
			log.debug('Subscribe: Initial state', { tasksCount: state.tasks.length });
			if (rodinkaInCurrent) {
				log.debug('Subscribe: Задача "Родинка" найдена в начальном состоянии');
			}
		}
	
	// Не сохраняем во время загрузки из БД (isHydrating)
	if (state.isHydrating || state.isLoading) {
		log.debug('Autosave skipped - hydrating or loading');
		return;
	}
	// Не сохраняем пустые данные, если еще не загружали (защита от потери данных при первой загрузке)
	if (!state.hasLoadedOnce && state.tasks.length === 0) {
		log.debug('Autosave skipped - not loaded yet and tasks empty');
		return;
	}
	if (saveTimer) clearTimeout(saveTimer);
	saveTimer = setTimeout(() => {
		// Получаем актуальное состояние на момент сохранения
		const currentState = useBoardStore.getState();
		const rodinkaTask = currentState.tasks.find(t => t.title && t.title.toLowerCase().includes('родинк'));
		log.debug('Autosave triggered', { tasksCount: currentState.tasks.length });
		log.debug('Autosave - State at save time', {
			tasksCount: currentState.tasks.length,
			isHydrating: currentState.isHydrating,
			hasLoadedOnce: currentState.hasLoadedOnce
		});
		if (rodinkaTask) {
			log.debug('Autosave - Задача "Родинка" найдена перед сохранением', {
				id: rodinkaTask.id,
				title: rodinkaTask.title,
				columnId: rodinkaTask.columnId
			});
		} else {
			log.warn('Autosave - Задача "Родинка" НЕ найдена перед сохранением!', {
				totalTasks: currentState.tasks.length,
				taskTitles: currentState.tasks.map(t => t.title).slice(0, 10)
			});
		}
		// Сохраняем всегда, даже если массив пустой (для корректного удаления)
		saveTasks(currentState.tasks).catch((error) => {
			log.error('Autosave failed', error);
		});
	}, 300);
});


