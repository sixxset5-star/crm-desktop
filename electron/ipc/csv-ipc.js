import { ipcMain } from 'electron';
import * as csvService from '../services/csv-service.js';

export function initCsvIpc() {
	ipcMain.handle('csv:select', async () => {
		return await csvService.selectCsvFile();
	});

	ipcMain.handle('csv:read', async (_e, filePath) => {
		return await csvService.readCsvFile(filePath);
	});

	ipcMain.handle('csv:save', async (_e, content, defaultFileName) => {
		return await csvService.saveCsvFile(content, defaultFileName);
	});
}











