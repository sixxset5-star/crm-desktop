import { useCallback } from 'react';
import { generateShortId } from '@/shared/utils/id';

type SubTask = { id: string; title: string; done: boolean; amount?: number; date?: string };

export function useSubtasksAndTags(
	subtasks: SubTask[],
	setSubtasks: React.Dispatch<React.SetStateAction<SubTask[]>>,
	tags: string[],
	setTags: React.Dispatch<React.SetStateAction<string[]>>,
	newSubtask: string,
	setNewSubtask: (value: string) => void,
	newTag: string,
	setNewTag: (value: string) => void
) {
	const addSubtask = useCallback(() => {
		if (!newSubtask.trim()) return;
		setSubtasks([
			...subtasks,
			{
				id: generateShortId(),
				title: newSubtask.trim(),
				done: false,
				amount: 0,
				date: new Date().toISOString().split('T')[0],
			},
		]);
		setNewSubtask('');
	}, [newSubtask, subtasks, setSubtasks, setNewSubtask]);

	const toggleSubtask = useCallback(
		(id: string) => {
			setSubtasks(subtasks.map((item) => (item.id === id ? { ...item, done: !item.done } : item)));
		},
		[subtasks, setSubtasks]
	);

	const removeSubtask = useCallback(
		(id: string) => {
			setSubtasks(subtasks.filter((item) => item.id !== id));
		},
		[subtasks, setSubtasks]
	);

	const addTag = useCallback(() => {
		const trimmed = newTag.trim().toLowerCase();
		if (!trimmed) return;
		if (tags.includes(trimmed)) {
			setNewTag('');
			return;
		}
		setTags([...tags, trimmed]);
		setNewTag('');
	}, [newTag, tags, setTags, setNewTag]);

	const removeTag = useCallback(
		(tag: string) => {
			setTags(tags.filter((t) => t !== tag));
		},
		[tags, setTags]
	);

	return {
		addSubtask,
		toggleSubtask,
		removeSubtask,
		addTag,
		removeTag,
	};
}

