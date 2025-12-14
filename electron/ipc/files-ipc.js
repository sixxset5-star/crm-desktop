import { ipcMain } from 'electron';
import { shell } from 'electron';
import * as filesService from '../services/files-service.js';
import { getDatabasePath } from '../services/db-service.js';
import fsSync from 'node:fs';

export function initFilesIpc() {
	ipcMain.handle('avatar:select', async () => {
		return await filesService.selectAvatarFile();
	});

	ipcMain.handle('files:select', async () => {
		return await filesService.selectFiles();
	});

	ipcMain.handle('files:getTaskDir', async (_e, taskId) => {
		return await filesService.getTaskFilesDir(taskId);
	});

	ipcMain.handle('files:copy', async (_e, sourcePath, destPath) => {
		return await filesService.copyFile(sourcePath, destPath);
	});

	ipcMain.handle('files:getSize', async (_e, filePath) => {
		return await filesService.getFileSize(filePath);
	});

	ipcMain.handle('files:open', async (_e, filePath) => {
		return await filesService.openFile(filePath);
	});

	ipcMain.handle('files:download', async (_e, sourcePath, defaultFileName) => {
		return await filesService.downloadFile(sourcePath, defaultFileName);
	});

	ipcMain.handle('files:rename', async (_e, filePath, newFileName) => {
		return await filesService.renameFile(filePath, newFileName);
	});

	ipcMain.handle('url:openExternal', async (_e, url) => {
		try {
			await shell.openExternal(url);
			return { ok: true };
		} catch (error) {
			console.error('Error opening external URL:', error);
			return { ok: false, error: error.message };
		}
	});

	ipcMain.handle('database:open', async () => {
		try {
			const dbPath = getDatabasePath();
			if (!fsSync.existsSync(dbPath)) {
				return { ok: false, error: 'Database file not found' };
			}
			await shell.openPath(dbPath);
			return { ok: true };
		} catch (error) {
			console.error('Error opening database:', error);
			return { ok: false, error: error.message };
		}
	});

	ipcMain.handle('database:getPath', async () => {
		return getDatabasePath();
	});
}











