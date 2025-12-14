import { app } from 'electron';
import autoUpdaterPkg from 'electron-updater';

const { autoUpdater } = autoUpdaterPkg;

let emitToRenderer = null;

export function setEmitToRenderer(emitFn) {
	emitToRenderer = emitFn;
}

export async function setupAutoUpdates() {
	if (!app.isPackaged) {
		console.log('[AutoUpdate] Skipping in dev mode');
		return;
	}

	autoUpdater.autoDownload = true;
	autoUpdater.logger = console;

	const UPDATE_FEED_URL = process.env.AUTO_UPDATE_URL || null;
	if (UPDATE_FEED_URL) {
		try {
			autoUpdater.setFeedURL({ url: UPDATE_FEED_URL });
			console.log('[AutoUpdate] Custom feed URL set:', UPDATE_FEED_URL);
		} catch (feedError) {
			console.error('[AutoUpdate] Failed to set custom feed URL:', feedError);
		}
	}

	autoUpdater.on('checking-for-update', () => console.log('[AutoUpdate] Checking for updates...'));
	autoUpdater.on('update-available', (info) => {
		console.log('[AutoUpdate] Update available:', info?.version);
		if (emitToRenderer) {
			emitToRenderer('updates:available', info);
			emitToRenderer('ui:banner', {
				type: 'info',
				message: `Загружаем обновление ${info?.version || ''}...`,
			});
		}
	});
	autoUpdater.on('update-not-available', () => {
		console.log('[AutoUpdate] No updates found');
		if (emitToRenderer) {
			emitToRenderer('updates:none', { version: app.getVersion ? app.getVersion() : null });
			emitToRenderer('ui:banner', {
				type: 'info',
				message: 'Уже установлена последняя версия',
			});
		}
	});
	autoUpdater.on('error', (error) => console.error('[AutoUpdate] Error:', error));
	autoUpdater.on('download-progress', (progress) => {
		if (emitToRenderer) {
			emitToRenderer('updates:download-progress', progress);
		}
	});
	autoUpdater.on('update-downloaded', (info) => {
		console.log('[AutoUpdate] Update downloaded, prompting restart');
		if (emitToRenderer) {
			emitToRenderer('updates:ready', info);
			emitToRenderer('ui:banner', {
				type: 'success',
				message: `Обновление ${info?.version || ''} скачано. Перезапустить сейчас?`,
			});
		}
	});

	try {
		await autoUpdater.checkForUpdatesAndNotify();
	} catch (error) {
		console.error('[AutoUpdate] checkForUpdatesAndNotify failed:', error);
	}
}

export async function checkForUpdates() {
	if (!app.isPackaged) {
		console.log('[AutoUpdate] Manual check skipped in dev mode');
		return { ok: false, reason: 'dev' };
	}
	try {
		await autoUpdater.checkForUpdates();
		return { ok: true };
	} catch (error) {
		console.error('[AutoUpdate] Manual check failed:', error);
		return { ok: false, error: error.message };
	}
}

export async function installUpdate() {
	if (!app.isPackaged) {
		return { ok: false, reason: 'dev' };
	}
	try {
		autoUpdater.quitAndInstall();
		return { ok: true };
	} catch (error) {
		console.error('[AutoUpdate] quitAndInstall failed:', error);
		return { ok: false, error: error.message };
	}
}











