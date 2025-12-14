import { ipcMain } from 'electron';
import * as updatesService from '../services/updates-service.js';

export function initUpdatesIpc() {
	ipcMain.handle('updates:check', async () => {
		return await updatesService.checkForUpdates();
	});

	ipcMain.handle('updates:install', async () => {
		return await updatesService.installUpdate();
	});
}











