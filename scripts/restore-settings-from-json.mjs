#!/usr/bin/env node
/**
 * Скрипт для восстановления настроек из settings.json в БД
 */

import Database from 'better-sqlite3';
import path from 'node:path';
import fsSync from 'node:fs';
import { fileURLToPath } from 'node:url';
import os from 'node:os';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Определяем путь к userData
function getUserDataPath() {
	const home = os.homedir();
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
	
	return process.cwd();
}

const userDataPath = getUserDataPath();
const dbPath = path.join(userDataPath, 'crm.db');
const jsonPath = path.join(userDataPath, 'settings.json');

console.log('[Restore] UserData path:', userDataPath);
console.log('[Restore] Database path:', dbPath);
console.log('[Restore] Settings JSON path:', jsonPath);

try {
	// Читаем settings.json
	if (!fsSync.existsSync(jsonPath)) {
		console.error('[Restore] ❌ settings.json not found!');
		process.exit(1);
	}
	
	const settingsJson = fsSync.readFileSync(jsonPath, 'utf-8');
	const settings = JSON.parse(settingsJson);
	
	console.log('[Restore] Loaded settings from JSON:', {
		hasHolidays: !!settings.holidays,
		holidaysCount: settings.holidays?.length || 0,
		hasCustomWeekends: !!settings.customWeekends,
		customWeekendsCount: settings.customWeekends?.length || 0,
		hasExcludedWeekends: !!settings.excludedWeekends,
		excludedWeekendsCount: settings.excludedWeekends?.length || 0,
		hasWeekendTasks: !!settings.weekendTasks,
		weekendTasksKeys: settings.weekendTasks ? Object.keys(settings.weekendTasks).length : 0,
	});
	
	// Открываем БД
	if (!fsSync.existsSync(dbPath)) {
		console.log('[Restore] Database not found, creating...');
		const dbDir = path.dirname(dbPath);
		if (!fsSync.existsSync(dbDir)) {
			fsSync.mkdirSync(dbDir, { recursive: true });
		}
	}
	
	const db = new Database(dbPath);
	
	// Создаем таблицу если не существует
	db.exec(`
		CREATE TABLE IF NOT EXISTS settings (
			key TEXT PRIMARY KEY,
			value TEXT NOT NULL
		)
	`);
	
	// Сохраняем настройки
	const stmt = db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)');
	stmt.run('main', JSON.stringify(settings));
	db.close();
	
	console.log('\n[Restore] ✅ Settings restored successfully!');
	console.log('[Restore] Summary:', {
		holidays: settings.holidays?.length || 0,
		customWeekends: settings.customWeekends?.length || 0,
		excludedWeekends: settings.excludedWeekends?.length || 0,
		weekendTasksKeys: settings.weekendTasks ? Object.keys(settings.weekendTasks).length : 0,
	});
	
	if (settings.holidays && settings.holidays.length > 0) {
		console.log('\n[Restore] Holidays:');
		settings.holidays.forEach(h => {
			console.log(`  - ${h.name} (${h.date})${h.recurring ? ' [recurring]' : ''}`);
		});
	}
	
	if (settings.customWeekends && settings.customWeekends.length > 0) {
		console.log(`\n[Restore] Custom weekends: ${settings.customWeekends.length} days`);
		settings.customWeekends.forEach(d => console.log(`  - ${d}`));
	}
	
	if (settings.excludedWeekends && settings.excludedWeekends.length > 0) {
		console.log(`\n[Restore] Excluded weekends: ${settings.excludedWeekends.length} days`);
		settings.excludedWeekends.forEach(d => console.log(`  - ${d}`));
	}
	
	process.exit(0);
} catch (error) {
	console.error('[Restore] ❌ Error:', error);
	process.exit(1);
}




