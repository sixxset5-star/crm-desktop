/**
 * Утилиты для оборачивания асинхронных операций с автоматической обработкой ошибок
 */

import { handleError, type ErrorHandlerConfig } from './error-handler';
import type { ErrorShape } from './error-types';

/**
 * Опции для withErrorHandling
 */
export interface WithErrorHandlingOptions extends ErrorHandlerConfig {
	/**
	 * Значение по умолчанию, которое вернётся при ошибке
	 */
	defaultValue?: unknown;
	/**
	 * Пробрасывать ли ошибку после обработки
	 * @default false
	 */
	rethrow?: boolean;
}

/**
 * Оборачивает асинхронную функцию с автоматической обработкой ошибок
 * 
 * @param fn - Асинхронная функция для оборачивания
 * @param options - Опции обработки ошибок
 * @returns Оборачиванная функция
 * 
 * @example
 * ```ts
 * const safeLoadData = withErrorHandling(
 *   async () => await loadData(),
 *   { defaultValue: [], logCategory: 'DataLoader' }
 * );
 * 
 * const data = await safeLoadData(); // При ошибке вернёт []
 * ```
 */
export function withErrorHandling<
	TArgs extends unknown[],
	TResult
>(
	fn: (...args: TArgs) => Promise<TResult>,
	options: WithErrorHandlingOptions = {}
): (...args: TArgs) => Promise<TResult> {
	const { defaultValue, rethrow = false, ...errorConfig } = options;

	return async (...args: TArgs): Promise<TResult> => {
		try {
			return await fn(...args);
		} catch (error) {
			const normalizedError = handleError(error, errorConfig);
			
			if (rethrow) {
				throw normalizedError;
			}
			
			return defaultValue as TResult;
		}
	};
}

/**
 * Создаёт обёртку для асинхронной функции, которая возвращает значение по умолчанию при ошибке
 * 
 * @param fn - Асинхронная функция
 * @param defaultValue - Значение по умолчанию
 * @param errorConfig - Конфигурация обработки ошибок
 * @returns Оборачиванная функция
 * 
 * @example
 * ```ts
 * const safeLoad = withDefault([], loadTasks, { logCategory: 'Tasks' });
 * const tasks = await safeLoad(); // При ошибке вернёт []
 * ```
 */
export function withDefault<TResult, TArgs extends unknown[]>(
	defaultValue: TResult,
	fn: (...args: TArgs) => Promise<TResult>,
	errorConfig?: ErrorHandlerConfig
): (...args: TArgs) => Promise<TResult> {
	return withErrorHandling(fn, { defaultValue, ...errorConfig });
}

/**
 * Создаёт обёртку для асинхронной функции, которая пробрасывает ошибку после обработки
 * 
 * @param fn - Асинхронная функция
 * @param errorConfig - Конфигурация обработки ошибок
 * @returns Оборачиванная функция
 * 
 * @example
 * ```ts
 * const safeSave = withRethrow(saveData, { logCategory: 'DataSaver' });
 * try {
 *   await safeSave();
 * } catch (error) {
 *   // Ошибка уже обработана и залогирована
 * }
 * ```
 */
export function withRethrow<
	TArgs extends unknown[],
	TResult
>(
	fn: (...args: TArgs) => Promise<TResult>,
	errorConfig?: ErrorHandlerConfig
): (...args: TArgs) => Promise<TResult> {
	return withErrorHandling(fn, { rethrow: true, ...errorConfig });
}

/**
 * Обрабатывает промис с автоматической обработкой ошибок
 * 
 * @param promise - Промис для обработки
 * @param options - Опции обработки ошибок
 * @returns Результат промиса или значение по умолчанию
 * 
 * @example
 * ```ts
 * const data = await handlePromise(
 *   loadData(),
 *   { defaultValue: [], logCategory: 'DataLoader' }
 * );
 * ```
 */
export async function handlePromise<TResult>(
	promise: Promise<TResult>,
	options: WithErrorHandlingOptions = {}
): Promise<TResult | unknown> {
	const { defaultValue, rethrow = false, ...errorConfig } = options;

	try {
		return await promise;
	} catch (error) {
		const normalizedError = handleError(error, errorConfig);
		
		if (rethrow) {
			throw normalizedError;
		}
		
		return defaultValue;
	}
}


