/**
 * useTaskFiles - хук для работы с файлами задачи
 * 
 * Вся логика файлов: добавление, удаление, переименование,
 * копирование в директорию, валидация размеров, генерация путей.
 */
import React, { useState, useCallback } from 'react';
import { selectFiles, copyFileToTaskDir, getTaskFilesDir } from '@/shared/lib/electron-bridge';
import { buildCrmPath, parseCrmPath } from '../utils/crmPaths';
import { useUIStore } from '@/store/ui';
import { createLogger } from '@/shared/lib/logger';

const log = createLogger('TaskFiles');

export type TaskFilesController = {
	files: string[];
	addFiles: () => Promise<void>;
	removeFile: (idx: number) => void;
	renameFile: (idx: number, newFileName: string) => void;
	setFiles: (files: string[]) => void;
};

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

/**
 * Генерация уникального имени файла с timestamp
 */
function generateUniqueFileName(originalName: string): string {
	const timestamp = Date.now();
	const ext = originalName.includes('.') 
		? originalName.substring(originalName.lastIndexOf('.')) 
		: '';
	const baseName = originalName.includes('.') 
		? originalName.substring(0, originalName.lastIndexOf('.')) 
		: originalName;
	return `${baseName}_${timestamp}${ext}`;
}

/**
 * Проверка размера файла
 */
async function validateFileSize(filePath: string): Promise<boolean> {
	try {
		if (filePath.startsWith('file://')) {
			const response = await fetch(filePath, { method: 'HEAD' });
			const contentLength = response.headers.get('content-length');
			if (contentLength && parseInt(contentLength, 10) > MAX_FILE_SIZE) {
				return false;
			}
		}
		return true;
	} catch {
		// Игнорируем ошибки проверки размера
		return true;
	}
}

export function useTaskFiles(
	taskId: string,
	initialFiles: string[] = [],
	onError?: (error: string) => void
): TaskFilesController {
	const [files, setFiles] = useState<string[]>(initialFiles);

	// Синхронизация с initialFiles при изменении taskId или initialFiles
	// ВАЖНО: не включаем files в зависимости, чтобы избежать бесконечного цикла
	React.useEffect(() => {
		// Обновляем только если initialFiles действительно изменились
		// Используем JSON.stringify для глубокого сравнения массивов
		const currentFilesStr = JSON.stringify(files);
		const initialFilesStr = JSON.stringify(initialFiles);
		
		if (currentFilesStr !== initialFilesStr) {
			setFiles(initialFiles);
		}
	}, [taskId, initialFiles]); // taskId для сброса при смене задачи, initialFiles для синхронизации

	const addFiles = useCallback(async () => {
		try {
			const selectedFiles = await selectFiles();
			
			if (!selectedFiles || selectedFiles.length === 0) {
				return;
			}
			
			// Проверяем размер файлов
			const largeFiles: string[] = [];
			for (const filePath of selectedFiles) {
				const isValid = await validateFileSize(filePath);
				if (!isValid) {
					largeFiles.push(filePath.split(/[/\\]/).pop() || filePath);
				}
			}
			
			if (largeFiles.length > 0) {
				const errorMsg = `Следующие файлы слишком большие (максимум 50MB):\n${largeFiles.join('\n')}`;
				if (onError) {
					onError(errorMsg);
				} else {
					const { UI_TEXTS } = await import('@/shared/constants/ui-texts');
					await useUIStore.getState().showAlert({
						title: UI_TEXTS.ERROR,
						message: errorMsg,
					});
				}
				return;
			}
			
			// Получаем директорию для файлов
			const taskFilesDir = await getTaskFilesDir(taskId);
			
			if (!taskFilesDir) {
				// Если не удалось получить папку, просто сохраняем пути
				setFiles(prev => [...prev, ...selectedFiles]);
				return;
			}
			
			// Копируем файлы и сохраняем пути
			const copiedPaths: string[] = [];
			
			log.debug('Adding files for task', { taskId, taskFilesDir });
			
			for (const sourcePath of selectedFiles) {
				const fileName = sourcePath.split(/[/\\]/).pop() || 'file';
				const uniqueFileName = generateUniqueFileName(fileName);
				const destPath = `${taskFilesDir}/${uniqueFileName}`;
				
				const success = await copyFileToTaskDir(sourcePath, destPath);
				if (success) {
					const crmPath = buildCrmPath(taskId, uniqueFileName);
					log.debug('File copied, saving path', { 
						sourcePath, 
						destPath, 
						crmPath, 
						taskId
					});
					copiedPaths.push(crmPath);
				} else {
					log.error('Failed to copy file', { sourcePath });
				}
			}
			
			if (copiedPaths.length > 0) {
				setFiles(prev => [...prev, ...copiedPaths]);
			}
		} catch (error) {
			const errorMsg = 'Ошибка при добавлении файлов: ' + (error instanceof Error ? error.message : String(error));
			log.error('Error adding files', error);
			if (onError) {
				onError(errorMsg);
			}
		}
	}, [taskId, onError]);

	const removeFile = useCallback((idx: number) => {
		setFiles(prev => prev.filter((_, i) => i !== idx));
	}, []);

	const renameFile = useCallback((idx: number, newFileName: string) => {
		setFiles(prev => {
			const file = prev[idx];
			const parsed = parseCrmPath(file);
			if (parsed) {
				const newPath = buildCrmPath(parsed.taskId, newFileName);
				const updated = [...prev];
				updated[idx] = newPath;
				return updated;
			}
			return prev;
		});
	}, []);

	const setFilesDirect = useCallback((newFiles: string[]) => {
		setFiles(newFiles);
	}, []);

	return {
		files,
		addFiles,
		removeFile,
		renameFile,
		setFiles: setFilesDirect,
	};
}

