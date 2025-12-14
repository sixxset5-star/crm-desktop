/**
 * Type-safe IPC клиент
 * Обеспечивает типобезопасные вызовы IPC на основе контракта
 */
import type { IpcChannel, IpcRequest, IpcResultTyped, IpcResult, IpcApiTyped } from './ipc-contract-v2';

/**
 * Типизированный вызов IPC
 * Гарантирует соответствие запроса и ответа контракту
 * Автоматически обрабатывает ошибки и возвращает нормализованный результат
 * 
 * @param channel - Канал IPC для вызова
 * @param payload - Данные запроса, соответствующие типу канала
 * @returns Типизированный результат вызова IPC
 * 
 * @example
 * const result = await invokeIpc('tasks:get', { id: 'task-123' });
 * if (result.ok) {
 *   console.log(result.data); // Типизированные данные задачи
 * } else {
 *   console.error(result.message); // Сообщение об ошибке
 * }
 */
export async function invokeIpc<K extends IpcChannel>(
	channel: K,
	payload: IpcRequest<K>
): Promise<IpcResultTyped<K>> {
	const crm = (window.crm as IpcApiTyped | undefined);
	if (!crm || typeof crm.invoke !== 'function') {
		return {
			ok: false,
			code: 'NO_API',
			message: 'window.crm not available'
		} as IpcResultTyped<K>;
	}

	try {
		// Вызываем через типизированный API
		return await crm.invoke(channel, payload);
	} catch (error) {
		return {
			ok: false,
			code: 'IPC_ERROR',
			message: error instanceof Error ? error.message : String(error)
		} as IpcResultTyped<K>;
	}
}

/**
 * Хелпер для безопасного извлечения данных из результата IPC
 * Бросает исключение при ошибке, что упрощает использование в try/catch
 * 
 * @param result - Промис с результатом IPC вызова
 * @returns Данные из успешного результата
 * @throws {Error} Если результат содержит ошибку
 * 
 * @example
 * try {
 *   const task = await unwrapIpc(invokeIpc('tasks:get', { id: 'task-123' }));
 *   console.log(task.title); // Безопасный доступ к данным
 * } catch (error) {
 *   console.error('Ошибка получения задачи:', error);
 * }
 */
export async function unwrapIpc<T>(result: Promise<IpcResult<T>>): Promise<T> {
	const res = await result;
	if (!res.ok) {
		throw new Error(res.message);
	}
	return res.data;
}




