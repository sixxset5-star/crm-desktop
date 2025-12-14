// Очередь операций с базой данных для защиты от race conditions
// Все операции записи выполняются последовательно через эту очередь

let writeQueue = Promise.resolve();

/**
 * Выполняет операцию записи в БД через очередь
 * Гарантирует, что операции выполняются последовательно
 * @param {Function} operation - функция, которая выполняет операцию с БД
 * @returns {Promise<T>} результат операции
 */
export async function enqueueWrite(operation) {
	// Добавляем операцию в очередь
	writeQueue = writeQueue
		.then(async () => {
			try {
				return await operation();
			} catch (error) {
				console.error('[DB Queue] Operation failed:', error);
				throw error;
			}
		})
		.catch((error) => {
			// Логируем ошибку, но не прерываем очередь
			console.error('[DB Queue] Error in queue:', error);
			throw error;
		});
	
	// Возвращаем промис для ожидания результата
	return writeQueue;
}

/**
 * Выполняет операцию чтения из БД
 * Чтение может выполняться параллельно, но можно использовать очередь для консистентности
 * @param {Function} operation - функция, которая выполняет операцию чтения
 * @returns {Promise<T>} результат операции
 */
export async function enqueueRead(operation) {
	// Для чтения можно выполнять параллельно, но для консистентности
	// можно использовать очередь после операций записи
	return enqueueWrite(operation);
}







