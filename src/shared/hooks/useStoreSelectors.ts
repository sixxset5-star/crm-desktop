// Хелперы для оптимизированного использования zustand store селекторов
// Использует shallow сравнение для предотвращения лишних ререндеров

import { shallow } from 'zustand/shallow';
import type { StoreApi, UseBoundStore } from 'zustand';

/**
 * Хук для мемоизированного селектора с shallow сравнением
 * Используется когда селектор возвращает объект или массив
 * 
 * @example
 * const tasks = useShallowSelector(useBoardStore, (s) => s.tasks);
 */
export function useShallowSelector<T, U>(
	store: UseBoundStore<StoreApi<T>>,
	selector: (state: T) => U
): U {
	return store(selector, shallow);
}

/**
 * Хук для селектора одного поля (примитив или функция)
 * Не требует shallow, так как zustand сам оптимизирует примитивы
 * 
 * @example
 * const addTask = useStoreSelector(useBoardStore, (s) => s.addTask);
 */
export function useStoreSelector<T, U>(
	store: UseBoundStore<StoreApi<T>>,
	selector: (state: T) => U
): U {
	return store(selector);
}















