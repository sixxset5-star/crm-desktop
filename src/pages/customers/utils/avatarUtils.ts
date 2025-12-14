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
	
	// Проверяем, в браузере ли мы
	const isBrowser = typeof window !== 'undefined' && !(window as any).crm;
	
	// В браузере преобразуем crm:// в Supabase Storage URL
	if (avatarPath.startsWith('crm://')) {
		if (isBrowser) {
			// В браузере - используем Supabase Storage
			// Извлекаем имя файла из crm://
			const fileName = decodeURIComponent(avatarPath.replace('crm://', '').replace(/^.*[\\\/]/, ''));
			// Возвращаем Supabase Storage URL (синхронно, так как getPublicUrl синхронный)
			try {
				// Динамический импорт для избежания циклических зависимостей
				const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
				if (supabaseUrl) {
					const projectId = supabaseUrl.replace('https://', '').replace('.supabase.co', '');
					return `https://${projectId}.supabase.co/storage/v1/object/public/avatars/${encodeURIComponent(fileName)}`;
				}
			} catch {
				// Если не удалось - возвращаем как есть
			}
		}
		// В Electron - возвращаем как есть
		return avatarPath;
	}
	
	if (avatarPath.startsWith('file://')) {
		// Извлекаем имя файла из пути
		const match = avatarPath.match(/[^/]+$/);
		if (match) {
			const fileName = decodeURIComponent(match[0]);
			if (isBrowser) {
				// В браузере - используем Supabase Storage
				try {
					const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
					if (supabaseUrl) {
						const projectId = supabaseUrl.replace('https://', '').replace('.supabase.co', '');
						return `https://${projectId}.supabase.co/storage/v1/object/public/avatars/${encodeURIComponent(fileName)}`;
					}
				} catch {
					// Если не удалось - преобразуем в crm://
				}
			}
			// В Electron - преобразуем в crm://
			return `crm://${encodeURIComponent(fileName)}`;
		}
	}
	
	// Если это просто имя файла без протокола
	if (isBrowser) {
		// В браузере - используем Supabase Storage
		try {
			const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
			if (supabaseUrl) {
				const projectId = supabaseUrl.replace('https://', '').replace('.supabase.co', '');
				const fileName = avatarPath.replace(/^.*[\\\/]/, '');
				return `https://${projectId}.supabase.co/storage/v1/object/public/avatars/${encodeURIComponent(fileName)}`;
			}
		} catch {
			// Если не удалось - преобразуем в crm://
		}
	}
	
	// В Electron - кодируем для crm://
	return `crm://${encodeURIComponent(avatarPath)}`;
}






