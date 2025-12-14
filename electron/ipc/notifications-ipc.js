import { ipcMain } from 'electron';
import * as notificationsService from '../services/notifications-service.js';

export function initNotificationsIpc() {
	ipcMain.handle('notification:show', async (_e, title, body) => {
		return await notificationsService.showNotification(title, body);
	});
}











