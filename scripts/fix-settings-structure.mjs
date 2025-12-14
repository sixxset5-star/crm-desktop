#!/usr/bin/env node
/**
 * Скрипт для исправления структуры настроек в БД
 * Извлекает данные из обернутой структуры { settings: { ... } } и сохраняет напрямую
 */

import Database from 'better-sqlite3';
import path from 'node:path';
import fsSync from 'node:fs';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Определяем путь к userData
function getUserDataPath() {
	const home = process.env.HOME || process.env.USERPROFILE;
	if (home) {
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
	
	const projectPath = path.join(__dirname, '..', 'Из ПАПКИ');
	if (fsSync.existsSync(projectPath)) {
		return projectPath;
	}
	
	return process.cwd();
}

const getDatabasePath = () => {
	return path.join(getUserDataPath(), 'crm.db');
};

async function fixSettingsStructure() {
	console.log('[Fix] Starting settings structure fix...');
	
	const dbPath = getDatabasePath();
	console.log(`[Fix] Database path: ${dbPath}`);
	
	if (!fsSync.existsSync(dbPath)) {
		console.error(`[Fix] ❌ Database not found: ${dbPath}`);
		return false;
	}
	
	try {
		const db = new Database(dbPath);
		const row = db.prepare('SELECT value FROM settings WHERE key = ?').get('main');
		
		if (!row) {
			console.log('[Fix] No settings found in DB');
			db.close();
			return false;
		}
		
		let settings = JSON.parse(row.value);
		console.log('[Fix] Current structure keys:', Object.keys(settings));
		
		// Проверяем, обернуты ли данные
		if (settings && typeof settings === 'object' && 'settings' in settings) {
			const nestedSettings = settings.settings;
			if (nestedSettings && typeof nestedSettings === 'object') {
				console.log('[Fix] Found wrapped structure, unwrapping...');
				console.log('[Fix] Nested data:', {
					hasHolidays: !!nestedSettings.holidays,
					holidaysCount: nestedSettings.holidays?.length || 0,
					hasCustomWeekends: !!nestedSettings.customWeekends,
					customWeekendsCount: nestedSettings.customWeekends?.length || 0,
					hasExcludedWeekends: !!nestedSettings.excludedWeekends,
					excludedWeekendsCount: nestedSettings.excludedWeekends?.length || 0,
				});
				
				// Сохраняем исправленную структуру
				const stmt = db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)');
				stmt.run('main', JSON.stringify(nestedSettings));
				
				console.log('[Fix] ✅ Structure fixed!');
				console.log('[Fix] Fixed data:', {
					hasHolidays: !!nestedSettings.holidays,
					holidaysCount: nestedSettings.holidays?.length || 0,
					hasCustomWeekends: !!nestedSettings.customWeekends,
					customWeekendsCount: nestedSettings.customWeekends?.length || 0,
					hasExcludedWeekends: !!nestedSettings.excludedWeekends,
					excludedWeekendsCount: nestedSettings.excludedWeekends?.length || 0,
				});
				
				db.close();
				return true;
			}
		} else {
			console.log('[Fix] Structure is already correct');
			console.log('[Fix] Data:', {
				hasHolidays: !!settings.holidays,
				holidaysCount: settings.holidays?.length || 0,
				hasCustomWeekends: !!settings.customWeekends,
				customWeekendsCount: settings.customWeekends?.length || 0,
			});
			db.close();
			return true;
		}
		
		db.close();
		return false;
	} catch (error) {
		console.error('[Fix] ❌ Error:', error);
		return false;
	}
}

fixSettingsStructure()
	.then((success) => {
		if (success) {
			console.log('\n[Fix] ✅ Fix completed successfully!');
			console.log('[Fix] Please restart the application to see the changes.');
			process.exit(0);
		} else {
			console.error('\n[Fix] ❌ Fix failed!');
			process.exit(1);
		}
	})
	.catch((error) => {
		console.error('\n[Fix] ❌ Fatal error:', error);
		process.exit(1);
	});




