import { dialog } from 'electron';
import fs from 'node:fs/promises';

let mainWindow = null;

export function setMainWindow(window) {
	mainWindow = window;
}

export async function selectCsvFile() {
	try {
		console.log('csv:select handler called');
		if (!mainWindow) {
			console.error('Main window is not available');
			return null;
		}
		console.log('Showing dialog...');
		const result = await dialog.showOpenDialog(mainWindow, {
			properties: ['openFile'],
			filters: [
				{ name: 'CSV файлы', extensions: ['csv'] },
				{ name: 'Все файлы', extensions: ['*'] },
			],
		});
		console.log('Dialog result:', result);
		if (result.canceled || result.filePaths.length === 0) {
			console.log('Dialog canceled or no file selected');
			return null;
		}
		console.log('Selected file:', result.filePaths[0]);
		return result.filePaths[0];
	} catch (error) {
		console.error('Error in csv:select:', error);
		return null;
	}
}

export async function readCsvFile(filePath) {
	try {
		const content = await fs.readFile(filePath, 'utf-8');
		return content;
	} catch (error) {
		console.error('Error reading CSV file:', error);
		return null;
	}
}

export async function saveCsvFile(content, defaultFileName) {
	try {
		console.log('csv:save handler called, defaultFileName:', defaultFileName, 'content length:', content?.length);
		if (!mainWindow) {
			console.error('Main window is not available');
			return null;
		}
		console.log('Showing save dialog...');
		const result = await dialog.showSaveDialog(mainWindow, {
			defaultPath: defaultFileName || 'export.csv',
			filters: [
				{ name: 'CSV файлы', extensions: ['csv'] },
				{ name: 'Все файлы', extensions: ['*'] },
			],
		});
		console.log('Save dialog result:', result);
		if (result.canceled || !result.filePath) {
			console.log('Save dialog was canceled or no file path');
			return null;
		}
		console.log('Writing file to:', result.filePath);
		await fs.writeFile(result.filePath, content, 'utf-8');
		console.log('File written successfully');
		return result.filePath;
	} catch (error) {
		console.error('Error saving CSV file:', error);
		return null;
	}
}











