import { create } from 'zustand';
import { Task } from './board';
import { createLogger } from '@/shared/lib/logger';

const log = createLogger('History');

type HistoryState = {
	past: Task[][];
	future: Task[][];
	push: (tasks: Task[]) => void;
	undo: () => Task[] | null;
	redo: () => Task[] | null;
	canUndo: () => boolean;
	canRedo: () => boolean;
	clear: () => void;
};

const MAX_HISTORY = 50;

/**
 * Создает глубокую копию массива задач с клонированием всех вложенных объектов и массивов
 * Использует structuredClone для гарантированного глубокого клонирования всех полей,
 * включая будущие поля, которые могут быть добавлены
 */
function cloneTasks(tasks: Task[]): Task[] {
	// Используем structuredClone для полного глубокого клонирования
	// Это гарантирует, что все вложенные объекты и массивы будут клонированы,
	// независимо от структуры Task
	if (typeof structuredClone !== 'undefined') {
		return structuredClone(tasks);
	}
	// Fallback для старых окружений: JSON.parse(JSON.stringify) - медленно, но надёжно
	try {
		return JSON.parse(JSON.stringify(tasks));
	} catch (error) {
		log.error('Failed to clone tasks, using shallow copy', error);
		// Последний fallback: поверхностное копирование (не идеально, но лучше чем ничего)
		return tasks.map((t) => ({ ...t }));
	}
}

export const useHistoryStore = create<HistoryState>((set, get) => ({
	past: [],
	future: [],
	push: (tasks: Task[]) => {
		const { past } = get();
		const snapshot = cloneTasks(tasks); // Глубокая копия для истории
		const newPast = [...past, snapshot].slice(-MAX_HISTORY);
		set({ past: newPast, future: [] });
	},
	undo: () => {
		const { past, future } = get();
		if (past.length === 0) return null;
		const previous = past[past.length - 1];
		const newPast = past.slice(0, -1);
		const newFuture = [cloneTasks(previous), ...future].slice(0, MAX_HISTORY); // Клонируем при добавлении в future
		set({ past: newPast, future: newFuture });
		return cloneTasks(previous); // Возвращаем клон, а не оригинал
	},
	redo: () => {
		const { past, future } = get();
		if (future.length === 0) return null;
		const next = future[0];
		const newPast = [...past, cloneTasks(next)].slice(-MAX_HISTORY); // Клонируем при добавлении в past
		const newFuture = future.slice(1);
		set({ past: newPast, future: newFuture });
		return cloneTasks(next); // Возвращаем клон, а не оригинал
	},
	canUndo: () => get().past.length > 0,
	canRedo: () => get().future.length > 0,
	clear: () => set({ past: [], future: [] }),
}));

