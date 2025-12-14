/** Главный процесс Electron. Теперь только инициализирует сервисы и подключает IPC. Вся логика вынесена в отдельные сервисы
 */
import pkg from 'electron';
const { app, protocol, ipcMain } = pkg;
import { getDatabase, closeDatabase } from './database.js';
import { AppService } from './services/app-service.js';

// IPC modules
import { initTasksIpc, setEmitToRenderer as setTasksEmitToRenderer } from './ipc/tasks-ipc.js';
import { initCustomersIpc } from './ipc/customers-ipc.js';
import { initContractorsIpc } from './ipc/contractors-ipc.js';
import { initGoalsIpc } from './ipc/goals-ipc.js';
import { initCreditsIpc } from './ipc/credits-ipc.js';
import { initSettingsIpc } from './ipc/settings-ipc.js';
import { initCalculationsIpc } from './ipc/calculations-ipc.js';
import { initTaxesIpc } from './ipc/taxes-ipc.js';
import { initIncomesIpc } from './ipc/incomes-ipc.js';
import { initExtraWorkIpc } from './ipc/extra-work-ipc.js';
import { initFilesIpc } from './ipc/files-ipc.js';
import { initCsvIpc } from './ipc/csv-ipc.js';
import { initUpdatesIpc } from './ipc/updates-ipc.js';
import { initNotificationsIpc } from './ipc/notifications-ipc.js';
import { initAvatarsIpc } from './ipc/avatars-ipc.js';
import { initContractHandshake } from './ipc/contract-version.js';
import { initIpcSchemas } from './ipc/ipc-validator.js';
import { validateContractCompleteness } from './ipc/ipc-contract-registry.js';

// Services
import * as filesService from './services/files-service.js';
import * as csvService from './services/csv-service.js';
import * as updatesService from './services/updates-service.js';
import * as avatarsSyncScheduler from './services/avatars-sync-scheduler.js';

// Single-instance lock: предотвращаем запуск нескольких экземпляров приложения
const gotLock = app.requestSingleInstanceLock();

if (!gotLock) {
	// Если другой экземпляр уже запущен, закрываем этот
	app.quit();
	process.exit(0);
}

// Создаем сервис приложения
const appService = new AppService();

// Обработка попытки запуска второго экземпляра
app.on('second-instance', () => {
	appService.handleSecondInstance();
});

// Регистрируем схему как привилегированную ДО готовности приложения
app.setAsDefaultProtocolClient('crm');

// Регистрируем схему как привилегированную ДО app.whenReady()
protocol.registerSchemesAsPrivileged([
	{ scheme: 'crm', privileges: { standard: true, secure: true, supportFetchAPI: true } }
]);

// Обработка необработанных исключений
process.on('uncaughtException', (error) => {
	console.error('Uncaught exception:', error);
	console.error('Stack:', error.stack);
	// Отправляем критическую ошибку в UI, если окно готово
	const windowService = appService.getWindowService();
	const mainWindow = windowService?.getMainWindow();
	if (mainWindow && !mainWindow.isDestroyed()) {
		windowService.emitToRenderer('ui:banner', {
			type: 'error',
			message: `Критическая ошибка: ${error.message || 'Неизвестная ошибка'}`
		});
	}
});

// Обработка необработанных отклонений промисов
process.on('unhandledRejection', (reason, promise) => {
	console.warn('Unhandled promise rejection:', reason);
	console.warn('Promise:', promise);
	// Отправляем предупреждение в UI, если окно готово
	const windowService = appService.getWindowService();
	const mainWindow = windowService?.getMainWindow();
	if (mainWindow && !mainWindow.isDestroyed()) {
		const message = reason instanceof Error ? reason.message : String(reason);
		windowService.emitToRenderer('ui:banner', {
			type: 'error',
			message: `Ошибка выполнения: ${message}`
		});
	}
});

// Инициализация приложения
app.whenReady().then(async () => {
	// Инициализируем базу данных (после app.whenReady())
	getDatabase();

	// ВАЖНО: сначала регистрируем все IPC‑обработчики,чтобы первые запросы из renderer не падали с "No handler registered for '...:load'"
	
	// Инициализируем схемы валидации
	try {
		initIpcSchemas();
	} catch (error) {
		console.error('[IPC] Failed to initialize schemas:', error);
		// Не блокируем запуск, но логируем ошибку
	}
	
	// Проверяем целостность контракта (только в dev режиме, чтобы не блокировать запуск)
	if (process.env.NODE_ENV === 'development' || process.env.VITE_DEV_SERVER_URL) {
		try {
			validateContractCompleteness();
		} catch (error) {
			console.warn('[IPC] Contract validation warning:', error.message);
			// Не блокируем запуск, только предупреждаем
		}
	}
	
	// Сначала handshake для проверки версии контракта
	initContractHandshake(ipcMain);
	
	// Затем все остальные IPC обработчики
	initTasksIpc();
	initCustomersIpc();
	try {
		initContractorsIpc();
		console.log('[Main] Contractors IPC initialized');
	} catch (error) {
		console.error('[Main] Failed to initialize contractors IPC:', error);
	}
	initGoalsIpc();
	initCreditsIpc();
	initSettingsIpc();
	initCalculationsIpc();
	initTaxesIpc();
	initIncomesIpc();
	initExtraWorkIpc();
	initFilesIpc();
	initCsvIpc();
	initUpdatesIpc();
	initNotificationsIpc();
	try {
		initAvatarsIpc();
		console.log('[Main] Avatars IPC initialized');
	} catch (error) {
		console.error('[Main] Failed to initialize avatars IPC:', error);
	}

	// Инициализируем приложение (создает окно, регистрирует протоколы)
	await appService.initialize();

	// Получаем сервис окон для настройки других сервисов
	const windowService = appService.getWindowService();
	const mainWindow = windowService.getMainWindow();

	// Инициализируем сервисы с ссылкой на окно
	filesService.setMainWindow(mainWindow);
	csvService.setMainWindow(mainWindow);
	updatesService.setEmitToRenderer(windowService.emitToRenderer.bind(windowService));
	
	// Настраиваем отправку ошибок в UI для IPC обработчиков
	setTasksEmitToRenderer(windowService.emitToRenderer.bind(windowService));
	
	// Настраиваем автообновления
	await updatesService.setupAutoUpdates();
	
	// Настраиваем периодическую синхронизацию аватаров
	avatarsSyncScheduler.setEmitToRenderer(windowService.emitToRenderer.bind(windowService));
	avatarsSyncScheduler.startScheduledSync();
}).catch((err) => {
	console.error('Failed to start app:', err);
	app.quit();
});

// Обработка жизненного цикла теперь в AppService
// (setupLifecycleHandlers вызывается в initialize)
