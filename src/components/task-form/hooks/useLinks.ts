/**
 * useLinks - хук для работы со ссылками задачи
 * 
 * Вся логика ссылок: добавление, удаление, переименование, валидация.
 */
import { useCallback } from 'react';
import type { TaskLink } from '@/types';

export type LinksController = {
	links: TaskLink[];
	addLink: (url: string) => { success: boolean; error?: string };
	removeLink: (idx: number) => void;
	updateLinkName: (idx: number, name: string) => void;
};

export function useLinks(
	links: TaskLink[],
	setLinks: React.Dispatch<React.SetStateAction<TaskLink[]>>,
	validateUrl: (url: string) => { valid: boolean; error?: string },
	onError?: (error: string) => void
): LinksController {
	const addLink = useCallback((url: string) => {
		const trimmed = url.trim();
		if (!trimmed) {
			const error = 'Введите ссылку';
			if (onError) {
				onError(error);
			}
			return { success: false, error };
		}
		
		// Валидация URL
		const validation = validateUrl(trimmed);
		if (!validation.valid) {
			const errorMsg = validation.error || 'Некорректный формат URL';
			if (onError) {
				onError(errorMsg);
			}
			return { success: false, error: errorMsg };
		}
		
		setLinks(prev => [...prev, { url: trimmed }]);
		return { success: true };
	}, [validateUrl, onError, setLinks]);

	const removeLink = useCallback((idx: number) => {
		setLinks(prev => prev.filter((_, i) => i !== idx));
	}, [setLinks]);

	const updateLinkName = useCallback((idx: number, name: string) => {
		setLinks(prev => {
			const updated = [...prev];
			updated[idx] = { ...updated[idx], name: name.trim() || undefined };
			return updated;
		});
	}, [setLinks]);

	return {
		links,
		addLink,
		removeLink,
		updateLinkName,
	};
}






