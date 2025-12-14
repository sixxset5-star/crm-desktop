// Единый сервис для работы с файлами на фронте
import {
	selectFiles,
	getTaskFilesDir,
	copyFileToTaskDir,
	getFileSize,
	openFile,
	downloadFile,
	renameFile,
	selectAvatarFile,
} from './electron-bridge';
import { createLogger } from './logger';

const log = createLogger('Files');

export type FileMeta = {
	name: string;
	path: string;
	size?: number;
	url?: string; // crm:// URL для отображения
};

/**
 * Прикрепляет файлы к задаче
 * Позволяет пользователю выбрать файлы и копирует их в директорию задачи
 * 
 * @param taskId - ID задачи, к которой прикрепляются файлы
 * @returns Массив метаданных прикрепленных файлов
 * @throws {Error} Если не удалось получить директорию файлов задачи
 * 
 * @example
 * const files = await attachFilesToTask('task-123');
 * files.forEach(file => console.log(file.name, file.url));
 */
export async function attachFilesToTask(taskId: string): Promise<FileMeta[]> {
	try {
		const selectedFiles = await selectFiles();
		if (!selectedFiles || selectedFiles.length === 0) {
			return [];
		}

		const taskDir = await getTaskFilesDir(taskId);
		if (!taskDir) {
			throw new Error('Failed to get task files directory');
		}

		const files: FileMeta[] = [];

		for (const sourcePath of selectedFiles) {
			const fileName = sourcePath.split(/[/\\]/).pop() || 'unknown';
			const destPath = `${taskDir}/${fileName}`;

			const copied = await copyFileToTaskDir(sourcePath, destPath);
			if (copied) {
				const size = await getFileSize(destPath);
				const url = `crm://task-files/${taskId}/${encodeURIComponent(fileName)}`;
				files.push({
					name: fileName,
					path: destPath,
					size: size || undefined,
					url,
				});
			}
		}

		return files;
	} catch (error) {
		log.error('Failed to attach files to task', error);
		throw error;
	}
}

/**
 * Открывает файл задачи в системе с помощью системного приложения по умолчанию
 * 
 * @param file - Метаданные файла для открытия
 * @throws {Error} Если путь к файлу отсутствует или открытие не удалось
 * 
 * @example
 * await openTaskFile({ name: 'document.pdf', path: '/path/to/file.pdf' });
 */
export async function openTaskFile(file: FileMeta): Promise<void> {
	if (!file.path) {
		throw new Error('File path is required');
	}
	const result = await openFile(file.path);
	if (!result.ok) {
		throw new Error(result.message || 'Failed to open file');
	}
}

/**
 * Скачивает файл задачи в папку загрузок пользователя
 * 
 * @param file - Метаданные файла для скачивания
 * @throws {Error} Если путь к файлу отсутствует или скачивание не удалось
 * 
 * @example
 * await downloadTaskFile({ name: 'document.pdf', path: '/path/to/file.pdf' });
 */
export async function downloadTaskFile(file: FileMeta): Promise<void> {
	if (!file.path) {
		throw new Error('File path is required');
	}
	const result = await downloadFile(file.path, file.name);
	if (!result.ok) {
		throw new Error(result.message || 'Failed to download file');
	}
}

/**
 * Переименовывает файл задачи
 * 
 * @param file - Метаданные файла для переименования
 * @param newFileName - Новое имя файла
 * @returns Обновленные метаданные файла с новым именем и путем
 * @throws {Error} Если путь к файлу отсутствует или переименование не удалось
 * 
 * @example
 * const renamed = await renameTaskFile(file, 'new-name.pdf');
 * console.log(renamed.name); // 'new-name.pdf'
 */
export async function renameTaskFile(
	file: FileMeta,
	newFileName: string
): Promise<FileMeta> {
	if (!file.path) {
		throw new Error('File path is required');
	}
	const result = await renameFile(file.path, newFileName);
	if (!result.ok) {
		throw new Error(result.message || 'Failed to rename file');
	}
	return {
		...file,
		name: newFileName,
		path: result.data.path,
	};
}

/**
 * Выбирает файл аватара для клиента
 * Открывает диалог выбора файла и возвращает путь к выбранному файлу
 * 
 * @returns Путь к выбранному файлу аватара или null, если выбор отменен
 * 
 * @example
 * const avatarPath = await selectCustomerAvatar();
 * if (avatarPath) {
 *   // Использовать путь для сохранения аватара
 * }
 */
export async function selectCustomerAvatar(): Promise<string | null> {
	return await selectAvatarFile();
}

/**
 * Получает размер файла в байтах
 * 
 * @param filePath - Путь к файлу
 * @returns Размер файла в байтах или null, если размер получить не удалось
 * 
 * @example
 * const size = await getFileSizeForPath('/path/to/file.pdf');
 * if (size) {
 *   console.log(`Размер файла: ${size} байт`);
 * }
 */
export async function getFileSizeForPath(filePath: string): Promise<number | null> {
	return await getFileSize(filePath);
}











