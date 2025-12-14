import { ipcMain } from 'electron';
import { getDatabase } from '../services/db-service.js';
import { autoBackup } from '../services/backup-service.js';
import { enqueueWrite } from '../services/db-queue.js';

export function initSettingsIpc() {
	ipcMain.handle('settings:load', async () => {
		try {
			const db = getDatabase();
			const row = db.prepare('SELECT value FROM settings WHERE key = ?').get('main');
			let settings = row ? JSON.parse(row.value) : null;
			
			// КРИТИЧНО: Исправляем структуру данных, если они сохранены неправильно
			// Если данные обернуты в объект с ключом 'settings', извлекаем их
			// Проверяем: если есть ключ 'settings' и это объект с настройками
			if (settings && typeof settings === 'object' && 'settings' in settings) {
				const nestedSettings = settings.settings;
				// Проверяем, что это действительно настройки (есть характерные поля)
				// И что в корневом объекте НЕТ этих полей (значит они вложены)
				const hasNestedData = nestedSettings && typeof nestedSettings === 'object' && 
				    ('currency' in nestedSettings || 'holidays' in nestedSettings || 'customWeekends' in nestedSettings);
				const hasRootData = 'currency' in settings || 'holidays' in settings || 'customWeekends' in settings;
				
				if (hasNestedData && !hasRootData) {
					console.warn('[Settings IPC] Found wrapped settings structure, unwrapping...');
					console.warn('[Settings IPC] Nested data:', {
						hasHolidays: !!nestedSettings.holidays,
						holidaysCount: nestedSettings.holidays?.length || 0,
						hasCustomWeekends: !!nestedSettings.customWeekends,
						customWeekendsCount: nestedSettings.customWeekends?.length || 0,
						hasExcludedWeekends: !!nestedSettings.excludedWeekends,
						excludedWeekendsCount: nestedSettings.excludedWeekends?.length || 0,
					});
					settings = nestedSettings;
					// КРИТИЧНО: Сохраняем исправленную структуру обратно в БД
					// чтобы в будущем не было проблем
					try {
						const db = getDatabase();
						const stmt = db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)');
						stmt.run('main', JSON.stringify(settings));
						console.log('[Settings IPC] Fixed and saved unwrapped settings structure');
					} catch (error) {
						console.error('[Settings IPC] Failed to save fixed structure:', error);
					}
				}
			}
			
			// Логируем для отладки
			if (settings) {
				console.log('[Settings IPC] Loaded from DB:', {
					hasHolidays: !!settings.holidays,
					holidaysCount: settings.holidays?.length || 0,
					holidaysSample: settings.holidays?.slice(0, 2),
					hasCustomWeekends: !!settings.customWeekends,
					customWeekendsCount: settings.customWeekends?.length || 0,
					customWeekendsSample: settings.customWeekends?.slice(0, 3),
					hasExcludedWeekends: !!settings.excludedWeekends,
					excludedWeekendsCount: settings.excludedWeekends?.length || 0,
					excludedWeekendsSample: settings.excludedWeekends?.slice(0, 3),
					hasWeekendTasks: !!settings.weekendTasks,
					weekendTasksKeys: settings.weekendTasks ? Object.keys(settings.weekendTasks).length : 0,
					allKeys: Object.keys(settings),
				});
			} else {
				console.log('[Settings IPC] No settings found in DB');
			}
			
			return { ok: true, data: settings };
		} catch (error) {
			console.error('Error loading settings:', error);
			return { 
				ok: false, 
				code: 'DB_ERROR', 
				message: error instanceof Error ? error.message : String(error) 
			};
		}
	});

	ipcMain.handle('settings:save', async (_e, settings) => {
		return enqueueWrite(async () => {
			try {
				// КРИТИЧНО: Проверяем, что настройки не обернуты в объект с ключом 'settings'
				// Если обернуты - извлекаем их перед сохранением
				let settingsToSave = settings;
				if (settings && typeof settings === 'object' && 'settings' in settings) {
					const nestedSettings = settings.settings;
					const hasNestedData = nestedSettings && typeof nestedSettings === 'object' && 
					    ('currency' in nestedSettings || 'holidays' in nestedSettings || 'customWeekends' in nestedSettings);
					const hasRootData = 'currency' in settings || 'holidays' in settings || 'customWeekends' in settings;
					
					if (hasNestedData && !hasRootData) {
						console.warn('[Settings IPC] WARNING: Received wrapped settings structure for save, unwrapping...');
						settingsToSave = nestedSettings;
					}
				}
				
				// Логируем для отладки перед сохранением
				console.log('[Settings IPC] Saving to DB:', {
					hasHolidays: !!settingsToSave.holidays,
					holidaysCount: settingsToSave.holidays?.length || 0,
					hasCustomWeekends: !!settingsToSave.customWeekends,
					customWeekendsCount: settingsToSave.customWeekends?.length || 0,
					hasExcludedWeekends: !!settingsToSave.excludedWeekends,
					excludedWeekendsCount: settingsToSave.excludedWeekends?.length || 0,
					hasWeekendTasks: !!settingsToSave.weekendTasks,
					weekendTasksKeys: settingsToSave.weekendTasks ? Object.keys(settingsToSave.weekendTasks).length : 0,
				});
				
				const db = getDatabase();
				const stmt = db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)');
				stmt.run('main', JSON.stringify(settingsToSave));
				
				// Создаем бекап после успешного сохранения
				autoBackup().catch(err => {
					console.error('[Settings] Backup failed:', err);
				});
				
				return { ok: true };
			} catch (error) {
				console.error('Error saving settings:', error);
				return { 
					ok: false, 
					code: 'DB_ERROR', 
					message: error instanceof Error ? error.message : String(error) 
				};
			}
		});
	});
}


