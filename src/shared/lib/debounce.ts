/**
 * Создает debounced версию функции, которая откладывает выполнение
 * до истечения указанного времени ожидания после последнего вызова
 * 
 * @param func - Функция для debounce
 * @param wait - Время ожидания в миллисекундах
 * @returns Debounced функция, которая откладывает выполнение
 * 
 * @example
 * const debouncedSearch = debounce((query: string) => {
 *   console.log('Поиск:', query);
 * }, 300);
 * 
 * debouncedSearch('a'); // Не выполнится сразу
 * debouncedSearch('ab'); // Отменит предыдущий вызов
 * debouncedSearch('abc'); // Отменит предыдущий вызов
 * // Через 300мс после последнего вызова выполнится только 'abc'
 */
export function debounce<T extends (...args: unknown[]) => unknown>(
	func: T,
	wait: number
): (...args: Parameters<T>) => void {
	let timeout: ReturnType<typeof setTimeout> | null = null;
	
	return function executedFunction(...args: Parameters<T>) {
		const later = () => {
			timeout = null;
			func(...args);
		};
		
		if (timeout) {
			clearTimeout(timeout);
		}
		timeout = setTimeout(later, wait);
	};
}











