import React from 'react';

/**
 * Утилита для preloading страниц
 * 
 * Используется для предзагрузки lazy-loaded компонентов,
 * чтобы ускорить переходы между страницами.
 */

/**
 * Preload страницы через прямой вызов функции импорта
 * 
 * @param lazyImport - Функция импорта, возвращающая Promise
 * @example
 * preloadLazy(() => import('./pages/Dashboard'));
 */
export function preloadLazy<T = unknown>(
	lazyImport: () => Promise<{ default: React.ComponentType<T> }>
): void {
	// Просто вызываем функцию импорта, чтобы начать загрузку модуля
	// Результат не используется, но промис начинает резолвиться
	lazyImport().catch(() => {
		// Игнорируем ошибки при preloading - они будут обработаны при реальном использовании
	});
}

/**
 * Preload страницы через React.lazy компонент
 * 
 * @param lazyComponent - React.lazy компонент
 * @example
 * const Dashboard = lazy(() => import('./pages/Dashboard'));
 * preloadPage(Dashboard);
 */
export function preloadPage<T = unknown>(
	lazyComponent: React.LazyExoticComponent<React.ComponentType<T>>
): void {
	// React.lazy создает компонент с внутренним промисом
	// Попытка доступа к _payload может инициировать загрузку
	// Но более надежный способ - использовать прямой импорт
	if ('_payload' in lazyComponent && lazyComponent._payload) {
		// React.lazy внутренняя структура: _payload может содержать _result
		// Используем unknown для безопасной работы с внутренними полями
		const payload = lazyComponent._payload as {
			_result?: () => Promise<{ default: React.ComponentType<T> }>;
		};
		if (payload._result) {
			// Если промис уже резолвился, ничего не делаем
			if (typeof payload._result === 'function') {
				// Промис еще не резолвился, вызываем его для preloading
				payload._result().catch(() => {
					// Игнорируем ошибки при preloading
				});
			}
		}
	}
}

