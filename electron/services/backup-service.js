import pkg from 'electron';
const { app } = pkg;
import path from 'node:path';
import fsSync from 'node:fs';
import Database from 'better-sqlite3';
import { getDatabasePath } from '../database.js';

const BACKUP_FILENAME = 'crm.db.backup';
const BACKUP_PREV_FILENAME = 'crm.db.backup.prev';
const MIN_DB_SIZE = 1024; // Минимальный размер БД в байтах (1KB)

/**
 * Получает путь к файлу бекапа
 */
function getBackupPath() {
	return path.join(app.getPath('userData'), BACKUP_FILENAME);
}

/**
 * Получает путь к предыдущему бекапу
 */
function getBackupPrevPath() {
	return path.join(app.getPath('userData'), BACKUP_PREV_FILENAME);
}

/**
 * Проверяет, что основная БД существует и имеет валидный размер
 * @param {string} dbPath - путь к БД
 * @returns {boolean} true если БД валидна
 */
function validateDatabase(dbPath) {
	if (!fsSync.existsSync(dbPath)) {
		console.error('[Backup] Main DB not found for backup:', dbPath);
		return false;
	}
	
	try {
		const stat = fsSync.statSync(dbPath);
		if (stat.size < MIN_DB_SIZE) {
			console.warn(`[Backup] DB file suspiciously small (${stat.size} bytes). Backup skipped.`);
			return false;
		}
		return true;
	} catch (error) {
		console.error('[Backup] Error checking DB file:', error);
		return false;
	}
}

/**
 * Создает бекап базы данных (синхронно)
 * @param {string} sourcePath - путь к исходному файлу
 * @param {string} targetPath - путь к целевому файлу
 * @returns {boolean} true если бекап создан успешно
 */
function createBackupSync(sourcePath, targetPath) {
	try {
		fsSync.copyFileSync(sourcePath, targetPath);
		return true;
	} catch (error) {
		console.error('[Backup] Error creating backup:', error);
		return false;
	}
}

/**
 * Удаляет файл бекапа (если существует)
 * @param {string} backupPath - путь к бекапу
 */
function removeBackupIfExists(backupPath) {
	try {
		if (fsSync.existsSync(backupPath)) {
			fsSync.unlinkSync(backupPath);
		}
	} catch (error) {
		console.error('[Backup] Error removing backup:', error);
		// Не бросаем ошибку, чтобы не прерывать основной процесс
	}
}

/**
 * Проверяет целостность базы данных и схему
 * @param {string} dbPath - путь к БД
 * @returns {boolean} true если БД целостна и схема корректна
 */
function checkDatabaseIntegrity(dbPath) {
	try {
		// Используем временное соединение для проверки целостности
		const db = new Database(dbPath, { readonly: true });
		
		try {
			// 1. PRAGMA integrity_check - проверка целостности файла
			const integrityResult = db.prepare('PRAGMA integrity_check').get();
			const isIntegrityOk = integrityResult && integrityResult.integrity_check === 'ok';
			
			if (!isIntegrityOk) {
				console.error('[Backup] Database integrity check failed:', integrityResult);
				return false;
			}
			
			// 2. PRAGMA foreign_key_check - проверка внешних ключей
			try {
				const foreignKeyResult = db.prepare('PRAGMA foreign_key_check').all();
				if (foreignKeyResult && foreignKeyResult.length > 0) {
					console.error('[Backup] Foreign key check failed:', foreignKeyResult);
					return false;
				}
			} catch (fkError) {
				// Если foreign keys не включены, это не критично для бэкапа
				console.warn('[Backup] Foreign key check skipped:', fkError.message);
			}
			
			// 3. PRAGMA schema_version - проверка версии схемы (для контроля миграций)
			try {
				const schemaVersion = db.prepare('PRAGMA schema_version').get();
				if (schemaVersion && typeof schemaVersion.schema_version === 'number') {
					console.log('[Backup] Database schema version:', schemaVersion.schema_version);
				}
			} catch (schemaError) {
				// Не критично, просто логируем
				console.warn('[Backup] Schema version check skipped:', schemaError.message);
			}
			
			return true;
		} finally {
			db.close();
		}
	} catch (error) {
		console.error('[Backup] Error checking database integrity:', error);
		return false;
	}
}

/**
 * Выполняет ротацию бекапов: prev → backup → новый backup
 * Использует синхронные операции для гарантии атомарности
 * @returns {boolean} true если операция успешна
 */
function rotateBackupsSync() {
	const dbPath = getDatabasePath();
	const backupPath = getBackupPath();
	const backupPrevPath = getBackupPrevPath();
	
	// Проверяем валидность основной БД
	if (!validateDatabase(dbPath)) {
		return false;
	}
	
	// Проверяем целостность БД перед бэкапом
	if (!checkDatabaseIntegrity(dbPath)) {
		console.error('[Backup] Database integrity check failed. Backup skipped to prevent corruption.');
		return false;
	}
	
	try {
		// Ротация: prev → backup → новый backup
		// 1. Удаляем самый старый (prev)
		removeBackupIfExists(backupPrevPath);
		
		// 2. Текущий backup становится prev (если существует)
		if (fsSync.existsSync(backupPath)) {
			fsSync.renameSync(backupPath, backupPrevPath);
		}
		
		// 3. Создаем новый backup из основной БД
		const success = createBackupSync(dbPath, backupPath);
		
		if (success) {
			console.log('[Backup] Backup rotation completed successfully');
		}
		
		return success;
	} catch (error) {
		console.error('[Backup] Error rotating backups:', error);
		return false;
	}
}

// Очередь бекапов: один бекап в работе → остальные ждут
let backupLock = Promise.resolve();

/**
 * Автоматически создает бекап после изменения данных
 * Использует очередь для предотвращения гонок при параллельных сохранениях
 * @returns {Promise<void>}
 */
export async function autoBackup() {
	// Добавляем в очередь: следующий бекап ждет завершения предыдущего
	backupLock = backupLock
		.then(() => {
			// Выполняем ротацию синхронно для гарантии атомарности
			rotateBackupsSync();
		})
		.catch((error) => {
			// Логируем ошибку, но не прерываем очередь
			console.error('[Backup] Auto-backup failed:', error);
		});
	
	// Возвращаем промис для возможности ожидания (опционально)
	return backupLock;
}
