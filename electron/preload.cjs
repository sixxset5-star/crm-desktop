const { contextBridge, ipcRenderer } = require('electron');

// Белый список разрешенных каналов для безопасности
// Версия контракта (должна совпадать с main процессом)
const IPC_CONTRACT_VERSION = '1.0.0';

// Список каналов из контракта (должен совпадать с ipc-contract-v2.ts)
// В будущем можно генерировать автоматически
const IPC_CONTRACT_CHANNELS = [
	'ipc:handshake',
	'tasks:load',
	'tasks:save',
	'customers:load',
	'customers:save',
	'contractors:load',
	'contractors:save',
	'contractors:deactivate',
	'contractors:delete',
	'goals:load',
	'goals:save',
	'credits:load',
	'credits:save',
	'credits:buildSchedule',
	'credits:rebuildSchedule',
	'credits:applyPayment',
	'credits:delete',
	'credits:calculatePayment',
	'credits:calculateTerm',
	'credits:calculateAmount',
	'credits:getUpcomingPayments',
	'credits:findNeedingMigration',
	'credits:migrate',
	'credits:migrateAll',
	'settings:load',
	'settings:save',
	'calculations:load',
	'calculations:save',
	'taxes:load',
	'taxes:save',
	'incomes:load',
	'incomes:save',
	'extra-work:load',
	'extra-work:save',
	'avatar:select',
	'csv:select',
	'csv:read',
	'csv:save',
	'files:select',
	'files:getTaskDir',
	'files:copy',
	'files:getSize',
	'files:open',
	'files:download',
	'files:rename',
	'avatars:syncCustomers',
	'avatars:syncContractors',
	'avatars:syncAll',
	'avatars:getChatId',
	'url:openExternal',
	'database:open',
	'database:getPath',
	'notification:show',
	'updates:check',
	'updates:install',
];

// Создаём Set для быстрой проверки
const ALLOWED_IPC_CHANNELS = new Set(IPC_CONTRACT_CHANNELS);

/**
 * Проверить, что канал есть в контракте
 */
function isChannelInContract(channel) {
	return ALLOWED_IPC_CHANNELS.has(channel);
}

// Список событий из контракта (должен совпадать с ipc-contract-v2.ts)
const IPC_EVENT_CHANNELS = [
	'updates:available',
	'updates:download-progress',
	'updates:ready',
	'updates:none',
	'ui:banner'
];

const ALLOWED_EVENT_CHANNELS = new Set(IPC_EVENT_CHANNELS);

/**
 * Проверить, что событие есть в контракте
 */
function isEventInContract(channel) {
	return ALLOWED_EVENT_CHANNELS.has(channel);
}

/**
 * Безопасный вызов IPC метода с валидацией канала
 */
function safeInvoke(channel, ...args) {
	if (!ALLOWED_IPC_CHANNELS.has(channel)) {
		console.error(`[Preload] Blocked unauthorized IPC channel: ${channel}`);
		return Promise.resolve({
			ok: false,
			code: 'IPC_INVALID_CHANNEL',
			message: `Channel ${channel} is not allowed`
		});
	}
	return ipcRenderer.invoke(channel, ...args);
}

/**
 * Безопасная подписка на события с проверкой контракта
 */
function subscribeToEvent(channel, callback) {
	// Проверка 1: событие в контракте
	if (!isEventInContract(channel)) {
		console.error(`[Preload] Blocked event channel not in contract: ${channel}`);
		return () => {};
	}
	
	// Проверка 2: callback - функция
	if (typeof callback !== 'function') {
		console.error(`[Preload] Event callback must be a function for channel: ${channel}`);
		return () => {};
	}
	
	const handler = (_event, payload) => {
		try {
			// TODO: здесь можно добавить Zod-валидацию payload события
			callback(payload);
		} catch (error) {
			console.error(`[Preload] Error in event handler for ${channel}:`, error);
		}
	};
	
	ipcRenderer.on(channel, handler);
	return () => {
		ipcRenderer.removeListener(channel, handler);
	};
}

// Типизированный вызов IPC с проверкой канала и контракта
function typedInvoke(channel, payload) {
	// Проверка 1: канал в белом списке
	if (!isChannelInContract(channel)) {
		console.error(`[Preload] Blocked IPC channel not in contract: ${channel}`);
		return Promise.resolve({
			ok: false,
			code: 'IPC_INVALID_CHANNEL',
			message: `Channel ${channel} is not in IPC contract`
		});
	}
	
	// Проверка 2: канал зарегистрирован в main (runtime проверка)
	// Это проверяется через handshake и ответы от main
	
	return ipcRenderer.invoke(channel, payload);
}

// Выполнить handshake при загрузке
let handshakeCompleted = false;
async function performHandshake() {
	if (handshakeCompleted) return;
	
	try {
		const result = await typedInvoke('ipc:handshake', IPC_CONTRACT_VERSION);
		if (!result.ok) {
			console.error('[Preload] Contract version mismatch:', result.message);
			// Можно показать пользователю ошибку
		} else {
			console.log('[Preload] Contract handshake successful:', result);
			handshakeCompleted = true;
		}
	} catch (error) {
		console.error('[Preload] Handshake failed:', error);
	}
}

// Выполняем handshake сразу
performHandshake();

// Экспортируем безопасный API
contextBridge.exposeInMainWorld('crm', {
	// Версия контракта для отладки
	contractVersion: IPC_CONTRACT_VERSION,
	
	// Список каналов контракта (для отладки)
	contractChannels: IPC_CONTRACT_CHANNELS,
	
	// Типизированный invoke с проверкой контракта
	invoke: typedInvoke,
	// Tasks
	loadTasks: () => typedInvoke('tasks:load', undefined),
	saveTasks: (tasks) => typedInvoke('tasks:save', { tasks }),
	getTaskAssigneeHistory: (taskId) => typedInvoke('tasks:getAssigneeHistory', { taskId }),
	getContractorAssigneeHistory: (contractorId) => typedInvoke('tasks:getContractorAssigneeHistory', { contractorId }),
	
	// Customers
	loadCustomers: () => typedInvoke('customers:load', undefined),
	saveCustomers: (customers) => typedInvoke('customers:save', { customers }),
	
	// Contractors
	loadContractors: () => typedInvoke('contractors:load', undefined),
	saveContractors: (contractors) => typedInvoke('contractors:save', { contractors }),
	deactivateContractor: (id) => typedInvoke('contractors:deactivate', { id }),
	deleteContractor: (id) => typedInvoke('contractors:delete', { id }),
	
	// Goals
	loadGoals: () => typedInvoke('goals:load', undefined),
	saveGoals: (goals) => typedInvoke('goals:save', goals),
	
	// Credits
	loadCredits: () => typedInvoke('credits:load', undefined),
	saveCredit: (credit) => typedInvoke('credits:save', credit),
	buildCreditSchedule: (params) => typedInvoke('credits:buildSchedule', params),
	rebuildCreditSchedule: (params) => typedInvoke('credits:rebuildSchedule', params),
	applyCreditPayment: (params) => typedInvoke('credits:applyPayment', params),
	deleteCredit: (params) => typedInvoke('credits:delete', params),
	calculateCreditPayment: (params) => typedInvoke('credits:calculatePayment', params),
	calculateCreditTerm: (params) => typedInvoke('credits:calculateTerm', params),
	calculateCreditAmount: (params) => typedInvoke('credits:calculateAmount', params),
	getUpcomingCreditPayments: (params) => typedInvoke('credits:getUpcomingPayments', params),
	findCreditsNeedingMigration: () => typedInvoke('credits:findNeedingMigration', undefined),
	migrateCredit: (params) => typedInvoke('credits:migrate', params),
	migrateAllCredits: () => typedInvoke('credits:migrateAll', undefined),
	
	// Settings
	loadSettings: () => typedInvoke('settings:load', undefined),
	saveSettings: (settings) => typedInvoke('settings:save', settings),
	
	// Calculations
	loadCalculations: () => safeInvoke('calculations:load'),
	saveCalculations: (calculations) => safeInvoke('calculations:save', calculations),
	
	// Taxes
	loadTaxes: () => safeInvoke('taxes:load'),
	saveTaxes: (taxes) => safeInvoke('taxes:save', taxes),
	
	// Incomes
	loadIncomes: () => safeInvoke('incomes:load'),
	saveIncomes: (incomes) => safeInvoke('incomes:save', incomes),
	
	// Extra Work
	loadExtraWork: () => safeInvoke('extra-work:load'),
	saveExtraWork: (extraWorks) => safeInvoke('extra-work:save', extraWorks),
	
	// Files
	selectAvatar: () => typedInvoke('avatar:select', undefined),
	selectFiles: () => typedInvoke('files:select', undefined),
	getTaskFilesDir: (taskId) => typedInvoke('files:getTaskDir', { taskId }),
	copyFile: (sourcePath, destPath) => typedInvoke('files:copy', { sourcePath, destPath }),
	getFileSize: (filePath) => typedInvoke('files:getSize', { filePath }),
	openFile: (filePath) => typedInvoke('files:open', { filePath }),
	downloadFile: (sourcePath, defaultFileName) => typedInvoke('files:download', { sourcePath, defaultFileName }),
	renameFile: (filePath, newFileName) => typedInvoke('files:rename', { filePath, newFileName }),
	
	// Avatars
	syncAvatarsCustomers: () => typedInvoke('avatars:syncCustomers', undefined),
	syncAvatarsContractors: () => typedInvoke('avatars:syncContractors', undefined),
	syncAvatarsAll: () => typedInvoke('avatars:syncAll', undefined),
	getAvatarsChatId: () => typedInvoke('avatars:getChatId', undefined),
	
	// CSV
	selectCsvFile: () => typedInvoke('csv:select', undefined),
	readCsvFile: (filePath) => typedInvoke('csv:read', { filePath }),
	saveCsvFile: (content, defaultFileName) => typedInvoke('csv:save', { content, defaultFileName }),
	
	// System
	openExternalUrl: (url) => typedInvoke('url:openExternal', { url }),
	openDatabase: () => typedInvoke('database:open', undefined),
	getDatabasePath: () => typedInvoke('database:getPath', undefined),
	showNotification: (title, body) => typedInvoke('notification:show', { title, body }),
	
	// Updates
	checkForUpdates: () => typedInvoke('updates:check', undefined),
	installUpdate: () => typedInvoke('updates:install', undefined),
	
	// Events
	onEvent: (channel, callback) => subscribeToEvent(channel, callback),
});


