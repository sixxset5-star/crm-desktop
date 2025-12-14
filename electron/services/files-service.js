import { app, dialog, shell } from 'electron';
import path from 'node:path';
import fs from 'node:fs/promises';
import fsSync from 'node:fs';

let mainWindow = null;

export function setMainWindow(window) {
	mainWindow = window;
}

export async function selectAvatarFile() {
	try {
		if (!mainWindow) {
			console.error('Main window is not available');
			return null;
		}
		const result = await dialog.showOpenDialog(mainWindow, {
			properties: ['openFile'],
			filters: [
				{ name: 'Изображения', extensions: ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp'] },
				{ name: 'Все файлы', extensions: ['*'] },
			],
		});
		if (result.canceled || result.filePaths.length === 0) {
			return null;
		}
		const filePath = result.filePaths[0];
		// Копируем файл в папку userData/avatars
		const avatarsDir = path.join(app.getPath('userData'), 'avatars');
		await fs.mkdir(avatarsDir, { recursive: true });
		const sourceFileName = path.basename(filePath);
		// Генерируем уникальное имя файла, чтобы избежать конфликтов
		const timestamp = Date.now();
		const ext = path.extname(sourceFileName);
		const baseName = path.basename(sourceFileName, ext).replace(/[^a-zA-Z0-9_-]/g, '_');
		const uniqueFileName = `avatar_${timestamp}${ext}`;
		const destPath = path.join(avatarsDir, uniqueFileName);
		console.log('Copying avatar file:', { source: filePath, dest: destPath });
		await fs.copyFile(filePath, destPath);
		// Проверяем, что файл скопировался
		if (!fsSync.existsSync(destPath)) {
			console.error('Avatar file was not copied successfully:', destPath);
			return null;
		}
		console.log('Avatar file copied successfully:', destPath);
		// Возвращаем путь к файлу в формате crm:// для обхода ограничений безопасности
		const encodedFileName = encodeURIComponent(uniqueFileName);
		const crmUrl = `crm://${encodedFileName}`;
		console.log('Returning avatar URL:', crmUrl);
		return crmUrl;
	} catch (error) {
		console.error('Error in avatar:select:', error);
		return null;
	}
}

export async function selectFiles() {
	try {
		if (!mainWindow) {
			console.error('Main window is not available');
			return null;
		}
		const result = await dialog.showOpenDialog(mainWindow, {
			properties: ['openFile', 'multiSelections'],
			filters: [
				{ name: 'Все файлы', extensions: ['*'] },
			],
		});
		if (result.canceled || result.filePaths.length === 0) {
			return null;
		}
		return result.filePaths;
	} catch (error) {
		console.error('Error in files:select:', error);
		return null;
	}
}

export async function getTaskFilesDir(taskId) {
	try {
		const taskFilesDir = path.join(app.getPath('userData'), 'task-files', taskId);
		await fs.mkdir(taskFilesDir, { recursive: true });
		return taskFilesDir;
	} catch (error) {
		console.error('Error getting task files dir:', error);
		return null;
	}
}

export async function copyFile(sourcePath, destPath) {
	try {
		await fs.mkdir(path.dirname(destPath), { recursive: true });
		await fs.copyFile(sourcePath, destPath);
		return true;
	} catch (error) {
		console.error('Error copying file:', error);
		return false;
	}
}

export async function getFileSize(filePath) {
	try {
		const stats = await fs.stat(filePath);
		return stats.size;
	} catch (error) {
		console.error('Error getting file size:', error);
		return null;
	}
}

export async function openFile(filePath) {
	try {
		await shell.openPath(filePath);
		return { ok: true };
	} catch (error) {
		console.error('Error opening file:', error);
		return { ok: false, error: error.message };
	}
}

export async function downloadFile(sourcePath, defaultFileName) {
	try {
		if (!mainWindow) {
			console.error('Main window is not available');
			return { ok: false, error: 'Main window not available' };
		}
		const result = await dialog.showSaveDialog(mainWindow, {
			defaultPath: defaultFileName || path.basename(sourcePath),
			filters: [
				{ name: 'Все файлы', extensions: ['*'] },
			],
		});
		if (result.canceled || !result.filePath) {
			return { ok: false, error: 'Dialog canceled' };
		}
		await fs.mkdir(path.dirname(result.filePath), { recursive: true });
		await fs.copyFile(sourcePath, result.filePath);
		return { ok: true, path: result.filePath };
	} catch (error) {
		console.error('Error downloading file:', error);
		return { ok: false, error: error.message };
	}
}

export async function renameFile(filePath, newFileName) {
	try {
		const dir = path.dirname(filePath);
		const newPath = path.join(dir, newFileName);
		// Проверяем, что файл с новым именем не существует
		if (fsSync.existsSync(newPath)) {
			return { ok: false, error: 'File with this name already exists' };
		}
		await fs.rename(filePath, newPath);
		return { ok: true, path: newPath };
	} catch (error) {
		console.error('Error renaming file:', error);
		return { ok: false, error: error.message };
	}
}











