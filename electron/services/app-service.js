/**
 * Сервис для управления жизненным циклом приложения
 * Вынесен из main.js
 * Централизует управление жизненным циклом и событиями
 */
import pkg from 'electron';
const { app, session } = pkg;
import { WindowService } from './window-service.js';
import { ProtocolService } from './protocol-service.js';
import { closeDatabase } from '../database.js';
import { eventBus, APP_EVENTS } from './event-bus.js';
import { createLogger } from './logger.js';

const log = createLogger('AppService');

export class AppService {
	constructor() {
		this.windowService = new WindowService();
		this.protocolService = new ProtocolService();
	}

	/**
	 * Инициализировать приложение (вызывается после app.whenReady())
	 */
	async initialize() {
		log.info('Initializing application');
		
		try {
			// Регистрируем протокол
			this.protocolService.registerCrmProtocol();
			log.debug('Protocol registered');

			// Создаем окно
			const window = await this.windowService.createMainWindow();
			eventBus.emit(APP_EVENTS.WINDOW_CREATED, { window });
			log.debug('Main window created');

			// Устанавливаем React DevTools (только для dev)
			await this.installReactDevTools();

			// Устанавливаем обработчики жизненного цикла
			this.setupLifecycleHandlers();

			// Отправляем событие готовности
			eventBus.emit(APP_EVENTS.APP_READY);
			log.info('Application initialized successfully');
		} catch (error) {
			log.error('Failed to initialize application', { error: error.message });
			throw error;
		}
	}

	/**
	 * Настроить обработчики жизненного цикла приложения
	 */
	setupLifecycleHandlers() {
		// Обработка закрытия всех окон
		app.on('window-all-closed', () => {
			eventBus.emit(APP_EVENTS.APP_WINDOW_ALL_CLOSED);
			if (process.platform !== 'darwin') {
				closeDatabase();
				app.quit();
			}
		});

		// Обработка перед выходом
		app.on('before-quit', () => {
			eventBus.emit(APP_EVENTS.APP_WILL_QUIT);
			closeDatabase();
		});

		// Обработка активации (macOS)
		app.on('activate', async () => {
			const window = this.windowService.getMainWindow();
			if (window === null) {
				const newWindow = await this.windowService.createMainWindow();
				eventBus.emit(APP_EVENTS.WINDOW_CREATED, { window: newWindow });
			} else {
				window.focus();
				eventBus.emit(APP_EVENTS.WINDOW_FOCUSED, { window });
			}
		});

		// Отслеживание закрытия окна
		const mainWindow = this.windowService.getMainWindow();
		if (mainWindow) {
			mainWindow.on('closed', () => {
				eventBus.emit(APP_EVENTS.WINDOW_CLOSED);
			});
		}
	}

	/**
	 * Установить React DevTools (только для dev)
	 */
	async installReactDevTools() {
		const IS_DEV = process.env.VITE_DEV_SERVER_URL || !app.isPackaged;
		if (!IS_DEV) {
			return;
		}

		let installExtension;
		let REACT_DEVELOPER_TOOLS;
		try {
			const devtoolsInstaller = await import('electron-devtools-installer');
			installExtension = devtoolsInstaller.default || devtoolsInstaller.installExtension;
			REACT_DEVELOPER_TOOLS = devtoolsInstaller.REACT_DEVELOPER_TOOLS;
			
			if (!installExtension || !REACT_DEVELOPER_TOOLS) {
				console.warn('[Electron] electron-devtools-installer is not properly configured');
				return;
			}
		} catch (importError) {
			console.warn('[Electron] Could not load electron-devtools-installer:', importError.message);
			return;
		}
		
		try {
			if (typeof installExtension !== 'function') {
				console.warn('[Electron] installExtension is not a function, skipping React DevTools installation');
				return;
			}
			
			console.log('[Electron] Installing React DevTools...');
			const name = await installExtension(REACT_DEVELOPER_TOOLS, {
				loadExtensionOptions: { allowFileAccess: true },
			});
			console.log('[Electron] ✅ React DevTools installed successfully:', name);
			
			// Проверяем установку
			try {
				const extensions = session.defaultSession.getAllExtensions();
				const extensionNames = extensions.map(ext => ext.name || ext.id || 'unknown');
				console.log('[Electron] Installed extensions:', extensionNames);
				
				const hasReactDevTools = extensionNames.some(name => 
					name.toLowerCase().includes('react') || 
					name.toLowerCase().includes('devtools')
				);
				if (hasReactDevTools) {
					console.log('[Electron] ✅ React DevTools confirmed in extensions list');
				} else {
					console.warn('[Electron] ⚠️ React DevTools not found in extensions list');
				}
			} catch (checkError) {
				console.log('[Electron] Could not check extensions:', checkError.message);
			}
		} catch (error) {
			const errorMsg = error?.message || String(error);
			if (errorMsg.includes('already installed') || errorMsg.includes('already loaded')) {
				console.log('[Electron] ℹ️ React DevTools already installed');
			} else {
				console.error('[Electron] ❌ Error installing React DevTools:', error);
			}
		}
	}

	/**
	 * Получить сервис окон
	 */
	getWindowService() {
		return this.windowService;
	}

	/**
	 * Обработать попытку запуска второго экземпляра
	 */
	handleSecondInstance() {
		log.info('Second instance detected, restoring window');
		this.windowService.restoreWindow();
		const window = this.windowService.getMainWindow();
		if (window) {
			eventBus.emit(APP_EVENTS.WINDOW_FOCUSED, { window });
		}
	}

	/**
	 * Получить event bus для подписки на события
	 */
	getEventBus() {
		return eventBus;
	}
}

