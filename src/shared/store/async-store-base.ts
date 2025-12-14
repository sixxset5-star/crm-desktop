/**
 * Базовый store с состояниями загрузки и ошибок
 * Стандартизирует работу с асинхронными операциями
 */
import type { ErrorShape } from '@/shared/lib/error-types';

/**
 * Состояние асинхронной операции
 */
export interface AsyncState {
	isLoading: boolean;
	isSaving: boolean;
	error: ErrorShape | null;
	lastSyncAt: string | null;
}

/**
 * Базовое состояние store с асинхронными операциями
 */
export interface AsyncStoreState<T> extends AsyncState {
	items: T[];
}

/**
 * Создать начальное состояние
 */
export function createAsyncState(): AsyncState {
	return {
		isLoading: false,
		isSaving: false,
		error: null,
		lastSyncAt: null,
	};
}

/**
 * Хелперы для обновления состояния
 */
export const AsyncStateHelpers = {
	setLoading: (state: AsyncState) => ({
		...state,
		isLoading: true,
		error: null,
	}),

	setSaving: (state: AsyncState) => ({
		...state,
		isSaving: true,
		error: null,
	}),

	setError: (state: AsyncState, error: ErrorShape) => ({
		...state,
		isLoading: false,
		isSaving: false,
		error,
	}),

	setSuccess: (state: AsyncState) => ({
		...state,
		isLoading: false,
		isSaving: false,
		error: null,
		lastSyncAt: new Date().toISOString(),
	}),

	reset: () => createAsyncState(),
};

/**
 * Обёртка для оптимистичных обновлений с rollback
 */
export function createOptimisticUpdate<T>(
	store: { items: T[] },
	updateFn: (items: T[]) => T[],
	onError?: (error: Error) => void
) {
	// Сохраняем snapshot для rollback
	const snapshot = [...store.items];
	
	try {
		// Применяем обновление
		const updated = updateFn(store.items);
		store.items = updated;
		
		return {
			rollback: () => {
				store.items = snapshot;
			},
		};
	} catch (error) {
		// Откатываем при ошибке
		store.items = snapshot;
		if (onError) {
			onError(error as Error);
		}
		throw error;
	}
}





