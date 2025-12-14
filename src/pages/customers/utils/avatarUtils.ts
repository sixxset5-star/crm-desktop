/**
 * Утилиты для работы с аватарами заказчиков
 */

/**
 * Конвертирует старые пути file:// в новый формат crm://
 * @param avatarPath - путь к аватару (может быть file://, crm:// или просто имя файла)
 * @returns путь в формате crm:// или null если путь пустой
 */
export function normalizeAvatarPath(avatarPath: string | undefined): string | null {
	if (!avatarPath || !avatarPath.trim()) return null;
	if (avatarPath.startsWith('crm://')) return avatarPath;
	if (avatarPath.startsWith('file://')) {
		// Извлекаем имя файла из пути
		const match = avatarPath.match(/[^/]+$/);
		if (match) {
			// Декодируем имя файла из file:// пути, затем кодируем для crm://
			const fileName = decodeURIComponent(match[0]);
			return `crm://${encodeURIComponent(fileName)}`;
		}
	}
	// Если это просто имя файла без протокола, кодируем его
	return `crm://${encodeURIComponent(avatarPath)}`;
}






