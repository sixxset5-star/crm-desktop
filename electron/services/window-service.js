/**
 * Сервис для управления окнами приложения
 * Вынесен из main.js для разделения ответственности
 */
import { BrowserWindow, app } from 'electron';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs/promises';
import fsSync from 'node:fs';
import { emitValidatedEvent } from '../ipc/event-validator.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class WindowService {
	constructor() {
		this.mainWindow = null;
		this.pendingRendererEvents = [];
	}

	/**
	 * Создать главное окно приложения
	 */
	async createMainWindow() {
		const APP_NAME = 'Mansurov CRM';
		const APP_ICON_PATH = path.join(__dirname, '..', '..', 'assets', 'icon.png');
		const APP_ROOT = app.isPackaged ? app.getAppPath() : process.cwd();
		const IS_DEV = process.env.VITE_DEV_SERVER_URL || !app.isPackaged;

		// Получаем путь к preload
		let preloadPath = path.join(__dirname, '..', 'preload.cjs');
		try {
			await fs.access(preloadPath);
		} catch {
			preloadPath = path.join(process.cwd(), 'electron', 'preload.cjs');
		}

		// Проверяем иконку
		let iconPath = null;
		try {
			await fs.access(APP_ICON_PATH);
			iconPath = APP_ICON_PATH;
		} catch {
			// Используем дефолтную иконку
		}

		this.mainWindow = new BrowserWindow({
			width: 1200,
			height: 800,
			title: APP_NAME,
			...(iconPath && { icon: iconPath }),
			webPreferences: {
				contextIsolation: true,
				nodeIntegration: false,
				preload: preloadPath,
				webSecurity: true,
			},
		});

		// Загружаем контент
		const devServerUrl = process.env.VITE_DEV_SERVER_URL;
		if (devServerUrl) {
			await this.mainWindow.loadURL(devServerUrl);
			this.mainWindow.webContents.once('did-finish-load', () => {
				this.flushPendingEvents();
			});
		} else {
			const distPath = path.join(APP_ROOT, 'dist', 'index.html');
			try {
				await fs.access(distPath);
				await this.mainWindow.loadFile(distPath);
				this.mainWindow.webContents.once('did-finish-load', () => {
					this.flushPendingEvents();
				});
			} catch (error) {
				console.error('Error loading dist file:', error);
			}
		}

		// Открываем DevTools в dev режиме
		if (IS_DEV) {
			this.mainWindow.webContents.once('did-finish-load', () => {
				setTimeout(() => {
					this.mainWindow.webContents.openDevTools({ mode: 'detach' });
				}, 300);
			});
		}

		// Обработка закрытия окна
		this.mainWindow.on('closed', () => {
			this.mainWindow = null;
		});

		// Устанавливаем иконку в Dock для macOS
		if (process.platform === 'darwin' && iconPath) {
			app.dock.setIcon(iconPath);
		}

		return this.mainWindow;
	}

	/**
	 * Получить главное окно
	 */
	getMainWindow() {
		return this.mainWindow;
	}

	/**
	 * Отправить событие в renderer процесс с валидацией
	 */
	emitToRenderer(channel, payload) {
		if (this.mainWindow && !this.mainWindow.isDestroyed() && 
		    this.mainWindow.webContents && !this.mainWindow.webContents.isLoading()) {
			// Валидируем payload перед отправкой
			emitValidatedEvent(this.mainWindow.webContents, channel, payload);
		} else {
			this.pendingRendererEvents.push({ channel, payload });
		}
	}

	/**
	 * Отправить накопленные события с валидацией
	 */
	flushPendingEvents() {
		if (!this.mainWindow || !this.mainWindow.webContents) return;
		while (this.pendingRendererEvents.length > 0) {
			const event = this.pendingRendererEvents.shift();
			if (event) {
				emitValidatedEvent(this.mainWindow.webContents, event.channel, event.payload);
			}
		}
	}

	/**
	 * Восстановить окно (для single-instance)
	 */
	restoreWindow() {
		if (this.mainWindow) {
			if (this.mainWindow.isMinimized()) {
				this.mainWindow.restore();
			}
			this.mainWindow.focus();
		}
	}
}

