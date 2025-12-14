/**
 * React хук для централизованной обработки ошибок
 * 
 * Предоставляет удобный API для обработки ошибок в компонентах
 */

import { useCallback } from 'react';
import { handleError, showErrorToUser, normalizeError, type ErrorHandlerConfig } from '@/shared/lib/error-handler';
import type { ErrorShape } from '@/shared/lib/error-types';

/**
 * Возвращаемые методы хука
 */
export interface UseErrorHandlerReturn {
	/**
	 * Обработать ошибку (логирует и показывает пользователю)
	 */
	handleError: (error: unknown, config?: ErrorHandlerConfig) => ErrorShape;
	/**
	 * Показать ошибку пользователю (без логирования)
	 */
	showError: (error: unknown, config?: Omit<ErrorHandlerConfig, 'logError'>) => ErrorShape;
	/**
	 * Нормализовать ошибку (без логирования и показа пользователю)
	 */
	normalizeError: (error: unknown) => ErrorShape;
}

/**
 * Хук для обработки ошибок в React компонентах
 * 
 * @param defaultConfig - Конфигурация по умолчанию для всех методов
 * @returns Объект с методами обработки ошибок
 * 
 * @example
 * ```tsx
 * const { handleError, showError } = useErrorHandler({ logCategory: 'MyComponent' });
 * 
 * const handleSave = async () => {
 *   try {
 *     await saveData();
 *   } catch (error) {
 *     handleError(error, { context: { action: 'save' } });
 *   }
 * };
 * ```
 */
export function useErrorHandler(
	defaultConfig: ErrorHandlerConfig = {}
): UseErrorHandlerReturn {
	const handleErrorWithDefaults = useCallback(
		(error: unknown, config?: ErrorHandlerConfig) => {
			return handleError(error, { ...defaultConfig, ...config });
		},
		[defaultConfig]
	);

	const showErrorWithDefaults = useCallback(
		(error: unknown, config?: Omit<ErrorHandlerConfig, 'logError'>) => {
			return showErrorToUser(error, { ...defaultConfig, ...config });
		},
		[defaultConfig]
	);

	const normalizeErrorWithDefaults = useCallback(
		(error: unknown) => {
			return normalizeError(error);
		},
		[]
	);

	return {
		handleError: handleErrorWithDefaults,
		showError: showErrorWithDefaults,
		normalizeError: normalizeErrorWithDefaults,
	};
}


