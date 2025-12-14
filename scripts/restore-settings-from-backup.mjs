#!/usr/bin/env node
/**
 * Скрипт для восстановления настроек (включая праздники и выходные) из бэкапов БД
 */

import Database from 'better-sqlite3';
import path from 'node:path';
import fsSync from 'node:fs';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Определяем путь к userData
function getUserDataPath() {
	// Пробуем найти в стандартном месте для macOS
	const home = process.env.HOME || process.env.USERPROFILE;
	if (home) {
		// Пробуем разные варианты имен приложения
		const possiblePaths = [
			path.join(home, 'Library', 'Application Support', 'CRM Desktop'),
			path.join(home, 'Library', 'Application Support', 'Mansurov CRM'),
			path.join(home, 'Library', 'Application Support', 'crm-desktop'),
		];
		
		for (const standardPath of possiblePaths) {
			if (fsSync.existsSync(standardPath)) {
				return standardPath;
			}
		}
	}
	
	// Fallback на папку "Из ПАПКИ" в проекте
	const projectPath = path.join(__dirname, '..', 'Из ПАПКИ');
	if (fsSync.existsSync(projectPath)) {
		return projectPath;
	}
	
	// Последний fallback - текущая директория
	return process.cwd();
}

const getDatabasePath = () => {
	return path.join(getUserDataPath(), 'crm.db');
};

const getBackupPath = () => {
	return path.join(getUserDataPath(), 'crm.db.backup');
};

const getBackupPrevPath = () => {
	return path.join(getUserDataPath(), 'crm.db.backup.prev');
};

const getSettingsJsonPath = () => {
	return path.join(getUserDataPath(), 'settings.json');
};

function extractSettingsFromJson(jsonPath) {
	try {
		if (!fsSync.existsSync(jsonPath)) {
			return null;
		}
		
		const content = fsSync.readFileSync(jsonPath, 'utf-8');
		const settings = JSON.parse(content);
		return settings;
	} catch (error) {
		console.error(`[Restore] Error reading from ${jsonPath}:`, error.message);
		return null;
	}
}

function extractSettingsFromDb(dbPath) {
	try {
		if (!fsSync.existsSync(dbPath)) {
			console.log(`[Restore] Database not found: ${dbPath}`);
			return null;
		}
		
		const db = new Database(dbPath, { readonly: true });
		try {
			const row = db.prepare('SELECT value FROM settings WHERE key = ?').get('main');
			if (row) {
				const settings = JSON.parse(row.value);
				return settings;
			}
			return null;
		} finally {
			db.close();
		}
	} catch (error) {
		console.error(`[Restore] Error reading from ${dbPath}:`, error.message);
		return null;
	}
}

async function restoreSettings() {
	console.log('[Restore] Starting settings restoration...');
	
	const userDataPath = getUserDataPath();
	console.log(`[Restore] UserData path: ${userDataPath}`);
	
	const dbPath = getDatabasePath();
	const backupPath = getBackupPath();
	const backupPrevPath = getBackupPrevPath();
	
	console.log(`[Restore] Current DB: ${dbPath}`);
	console.log(`[Restore] Backup: ${backupPath}`);
	console.log(`[Restore] Previous Backup: ${backupPrevPath}`);
	
	const settingsJsonPath = getSettingsJsonPath();
	
	// Список источников для восстановления (в порядке приоритета)
	const sources = [
		{ name: 'Current DB', path: dbPath, type: 'db' },
		{ name: 'Backup', path: backupPath, type: 'db' },
		{ name: 'Previous Backup', path: backupPrevPath, type: 'db' },
		{ name: 'settings.json', path: settingsJsonPath, type: 'json' },
	];
	
	let bestSettings = null;
	let bestSource = null;
	let bestScore = 0;
	
	// Ищем настройки во всех источниках
	for (const source of sources) {
		console.log(`\n[Restore] Checking ${source.name}...`);
		const settings = source.type === 'json' 
			? extractSettingsFromJson(source.path)
			: extractSettingsFromDb(source.path);
		
		if (settings) {
			// Проверяем, есть ли в этих настройках праздники или выходные
			const hasHolidays = settings.holidays && Array.isArray(settings.holidays) && settings.holidays.length > 0;
			const hasCustomWeekends = settings.customWeekends && Array.isArray(settings.customWeekends) && settings.customWeekends.length > 0;
			const hasExcludedWeekends = settings.excludedWeekends && Array.isArray(settings.excludedWeekends) && settings.excludedWeekends.length > 0;
			const hasWeekendTasks = settings.weekendTasks && typeof settings.weekendTasks === 'object' && Object.keys(settings.weekendTasks).length > 0;
			
			const score = (hasHolidays ? settings.holidays.length : 0) +
			              (hasCustomWeekends ? settings.customWeekends.length : 0) +
			              (hasExcludedWeekends ? settings.excludedWeekends.length : 0) +
			              (hasWeekendTasks ? Object.keys(settings.weekendTasks).length : 0);
			
			console.log(`[Restore] ${source.name} contains:`, {
				holidays: hasHolidays ? `${settings.holidays.length} items` : 'none',
				customWeekends: hasCustomWeekends ? `${settings.customWeekends.length} items` : 'none',
				excludedWeekends: hasExcludedWeekends ? `${settings.excludedWeekends.length} items` : 'none',
				weekendTasks: hasWeekendTasks ? `${Object.keys(settings.weekendTasks).length} keys` : 'none',
				score: score,
			});
			
			// Выбираем источник с наибольшим количеством данных
			if (score > bestScore || (!bestSettings && score >= 0)) {
				bestSettings = settings;
				bestSource = source.name;
				bestScore = score;
			}
		} else {
			console.log(`[Restore] ${source.name}: no settings found`);
		}
	}
	
	if (!bestSettings) {
		console.error('\n[Restore] ❌ No settings found in any source!');
		return false;
	}
	
	console.log(`\n[Restore] ✅ Best source: ${bestSource} (score: ${bestScore})`);
	
	// Объединяем данные из всех источников (приоритет более новым)
	const mergedSettings = { ...bestSettings };
	
	// Проверяем все источники и объединяем данные
	for (const source of sources) {
		if (source.name === bestSource) continue;
		const settings = extractSettingsFromDb(source.path);
		if (settings) {
			// Объединяем праздники
			if (settings.holidays && Array.isArray(settings.holidays) && settings.holidays.length > 0) {
				const existingIds = new Set((mergedSettings.holidays || []).map(h => h.id));
				const newHolidays = settings.holidays.filter(h => !existingIds.has(h.id));
				if (newHolidays.length > 0) {
					mergedSettings.holidays = [...(mergedSettings.holidays || []), ...newHolidays];
					console.log(`[Restore] Merged ${newHolidays.length} holidays from ${source.name}`);
				}
			}
			
			// Объединяем пользовательские выходные
			if (settings.customWeekends && Array.isArray(settings.customWeekends) && settings.customWeekends.length > 0) {
				const existing = new Set(mergedSettings.customWeekends || []);
				const newWeekends = settings.customWeekends.filter(d => !existing.has(d));
				if (newWeekends.length > 0) {
					mergedSettings.customWeekends = [...(mergedSettings.customWeekends || []), ...newWeekends];
					console.log(`[Restore] Merged ${newWeekends.length} custom weekends from ${source.name}`);
				}
			}
			
			// Объединяем исключенные выходные
			if (settings.excludedWeekends && Array.isArray(settings.excludedWeekends) && settings.excludedWeekends.length > 0) {
				const existing = new Set(mergedSettings.excludedWeekends || []);
				const newExcluded = settings.excludedWeekends.filter(d => !existing.has(d));
				if (newExcluded.length > 0) {
					mergedSettings.excludedWeekends = [...(mergedSettings.excludedWeekends || []), ...newExcluded];
					console.log(`[Restore] Merged ${newExcluded.length} excluded weekends from ${source.name}`);
				}
			}
			
			// Объединяем задачи на выходные
			if (settings.weekendTasks && typeof settings.weekendTasks === 'object') {
				mergedSettings.weekendTasks = {
					...(mergedSettings.weekendTasks || {}),
					...settings.weekendTasks,
				};
				const newKeys = Object.keys(settings.weekendTasks).filter(k => !(k in (mergedSettings.weekendTasks || {})));
				if (newKeys.length > 0) {
					console.log(`[Restore] Merged ${newKeys.length} weekend tasks keys from ${source.name}`);
				}
			}
		}
	}
	
	// Восстанавливаем в основную БД
	try {
		if (!fsSync.existsSync(dbPath)) {
			console.error(`[Restore] ❌ Database not found: ${dbPath}`);
			console.log('[Restore] Creating database...');
			// Создаем директорию если не существует
			const dbDir = path.dirname(dbPath);
			if (!fsSync.existsSync(dbDir)) {
				fsSync.mkdirSync(dbDir, { recursive: true });
			}
		}
		
		const db = new Database(dbPath);
		
		// Создаем таблицу settings если не существует
		db.exec(`
			CREATE TABLE IF NOT EXISTS settings (
				key TEXT PRIMARY KEY,
				value TEXT NOT NULL
			)
		`);
		
		const stmt = db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)');
		stmt.run('main', JSON.stringify(mergedSettings));
		db.close();
		
		console.log('\n[Restore] ✅ Settings restored successfully!');
		console.log('[Restore] Summary:', {
			holidays: mergedSettings.holidays?.length || 0,
			customWeekends: mergedSettings.customWeekends?.length || 0,
			excludedWeekends: mergedSettings.excludedWeekends?.length || 0,
			weekendTasksKeys: mergedSettings.weekendTasks ? Object.keys(mergedSettings.weekendTasks).length : 0,
		});
		
		if (mergedSettings.holidays && mergedSettings.holidays.length > 0) {
			console.log('\n[Restore] Holidays:');
			mergedSettings.holidays.forEach(h => {
				console.log(`  - ${h.name} (${h.date})${h.recurring ? ' [recurring]' : ''}`);
			});
		}
		
		if (mergedSettings.customWeekends && mergedSettings.customWeekends.length > 0) {
			console.log(`\n[Restore] Custom weekends: ${mergedSettings.customWeekends.length} days`);
		}
		
		return true;
	} catch (error) {
		console.error('[Restore] ❌ Error restoring settings:', error);
		return false;
	}
}

// Запускаем восстановление
restoreSettings()
	.then((success) => {
		if (success) {
			console.log('\n[Restore] ✅ Restoration completed successfully!');
			console.log('[Restore] Please restart the application to see restored data.');
			process.exit(0);
		} else {
			console.error('\n[Restore] ❌ Restoration failed!');
			process.exit(1);
		}
	})
	.catch((error) => {
		console.error('\n[Restore] ❌ Fatal error:', error);
		process.exit(1);
	});
