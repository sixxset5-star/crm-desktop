/**
 * Утилиты для работы с аватарами заказчиков
 */

/**
 * Конвертирует пути аватаров в формат, пригодный для отображения
 * @param avatarPath - путь к аватару (может быть file://, crm://, http://, https:// или просто имя файла)
 * @returns URL для отображения или null если путь пустой
 */
export function normalizeAvatarPath(avatarPath: string | undefined): string | null {
	if (!avatarPath || !avatarPath.trim()) return null;
	
	// Если это уже полный URL (http/https) - возвращаем как есть
	if (avatarPath.startsWith('http://') || avatarPath.startsWith('https://')) {
		return avatarPath;
	}
	
	// В браузере преобразуем crm:// в Supabase Storage URL
	if (avatarPath.startsWith('crm://')) {
		if (typeof window !== 'undefined' && !window.crm) {
			// В браузере - используем Supabase Storage
			const { getAvatarUrl } = require('@/shared/lib/api/storage-client');
			return getAvatarUrl(avatarPath);
		}
		// В Electron - возвращаем как есть
		return avatarPath;
	}
	
	if (avatarPath.startsWith('file://')) {
		// Извлекаем имя файла из пути
		const match = avatarPath.match(/[^/]+$/);
		if (match) {
			const fileName = decodeURIComponent(match[0]);
			if (typeof window !== 'undefined' && !window.crm) {
				// В браузере - используем Supabase Storage
				const { getAvatarUrl } = require('@/shared/lib/api/storage-client');
				return getAvatarUrl(fileName);
			}
			// В Electron - преобразуем в crm://
			return `crm://${encodeURIComponent(fileName)}`;
		}
	}
	
	// Если это просто имя файла без протокола
	if (typeof window !== 'undefined' && !window.crm) {
		// В браузере - используем Supabase Storage
		const { getAvatarUrl } = require('@/shared/lib/api/storage-client');
		return getAvatarUrl(avatarPath);
	}
	
	// В Electron - кодируем для crm://
	return `crm://${encodeURIComponent(avatarPath)}`;
}






