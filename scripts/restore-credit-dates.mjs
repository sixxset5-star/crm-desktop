#!/usr/bin/env node
/**
 * Скрипт для восстановления дат платежей кредитов из резервных копий
 */

import Database from 'better-sqlite3';
import path from 'node:path';
import fsSync from 'node:fs';

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
	
	// Fallback на текущую директорию
	return process.cwd();
}

const userDataPath = getUserDataPath();
const dbPath = path.join(userDataPath, 'crm.db');
const backupPath = path.join(userDataPath, 'crm.db.backup');
const backupPrevPath = path.join(userDataPath, 'crm.db.backup.prev');

console.log('=== Восстановление дат платежей кредитов ===');
console.log('UserData path:', userDataPath);
console.log('Current DB:', dbPath);
console.log('Backup:', backupPath);
console.log('Previous Backup:', backupPrevPath);

// Проверяем наличие основной БД
if (!fsSync.existsSync(dbPath)) {
	console.error('❌ Основная база данных не найдена:', dbPath);
	process.exit(1);
}

// Функция для получения кредитов из БД
function getCreditsFromDb(dbPath) {
	try {
		const db = new Database(dbPath, { readonly: true });
		const credits = db.prepare('SELECT * FROM credits').all();
		db.close();
		return credits;
	} catch (error) {
		console.error(`❌ Ошибка чтения БД ${dbPath}:`, error.message);
		return null;
	}
}

// Получаем кредиты из основной БД
console.log('\n📖 Читаю кредиты из основной БД...');
const currentCredits = getCreditsFromDb(dbPath);
if (!currentCredits) {
	console.error('❌ Не удалось прочитать кредиты из основной БД');
	process.exit(1);
}
console.log(`Найдено кредитов в основной БД: ${currentCredits.length}`);

// Создаем мапу текущих кредитов по ID
const currentCreditsMap = new Map(currentCredits.map(c => [c.id, c]));

// Функция для поиска дат в резервных копиях
function findPaymentDatesInBackups() {
	const sources = [
		{ name: 'Backup', path: backupPath },
		{ name: 'Previous Backup', path: backupPrevPath }
	];
	
	const restoredDates = new Map();
	
	for (const source of sources) {
		if (!fsSync.existsSync(source.path)) {
			console.log(`⚠️  ${source.name} не найден: ${source.path}`);
			continue;
		}
		
		console.log(`\n🔍 Проверяю ${source.name}...`);
		const backupCredits = getCreditsFromDb(source.path);
		
		if (!backupCredits) {
			continue;
		}
		
		console.log(`Найдено кредитов в ${source.name}: ${backupCredits.length}`);
		
		// Ищем кредиты с датами платежей
		for (const credit of backupCredits) {
			if (credit.payment_date && credit.payment_date.trim()) {
				// Проверяем, есть ли этот кредит в текущей БД
				if (currentCreditsMap.has(credit.id)) {
					const currentCredit = currentCreditsMap.get(credit.id);
					// Если в текущей БД нет даты или она пустая, сохраняем из бэкапа
					if (!currentCredit.payment_date || !currentCredit.payment_date.trim()) {
						// Используем дату из самого свежего бэкапа (первый найденный)
						if (!restoredDates.has(credit.id)) {
							restoredDates.set(credit.id, credit.payment_date);
							console.log(`  ✓ Найдена дата для кредита "${credit.name}": ${credit.payment_date}`);
						}
					}
				}
			}
		}
	}
	
	return restoredDates;
}

// Ищем даты в резервных копиях
const restoredDates = findPaymentDatesInBackups();

if (restoredDates.size === 0) {
	console.log('\n⚠️  Не найдено дат платежей в резервных копиях');
	console.log('Возможно, даты были потеряны до создания резервных копий.');
	process.exit(0);
}

console.log(`\n✅ Найдено ${restoredDates.size} кредитов с датами для восстановления`);

// Создаем резервную копию перед восстановлением
const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
const restoreBackupPath = `${dbPath}.before-restore-${timestamp}`;
try {
	fsSync.copyFileSync(dbPath, restoreBackupPath);
	console.log(`\n💾 Создана резервная копия перед восстановлением: ${restoreBackupPath}`);
} catch (error) {
	console.error('❌ Ошибка создания резервной копии:', error.message);
	process.exit(1);
}

// Восстанавливаем даты
console.log('\n🔄 Восстанавливаю даты...');
try {
	const db = new Database(dbPath);
	
	// Проверяем наличие колонки payment_date
	const tableInfo = db.prepare("PRAGMA table_info(credits)").all();
	const hasPaymentDate = tableInfo.some(col => col.name === 'payment_date');
	
	if (!hasPaymentDate) {
		console.log('⚠️  Колонка payment_date отсутствует, добавляю...');
		db.exec('ALTER TABLE credits ADD COLUMN payment_date TEXT');
	}
	
	const updateStmt = db.prepare('UPDATE credits SET payment_date = ? WHERE id = ?');
	
	const updateMany = db.transaction((datesMap) => {
		for (const [creditId, paymentDate] of datesMap) {
			updateStmt.run(paymentDate, creditId);
			const credit = currentCreditsMap.get(creditId);
			console.log(`  ✓ Восстановлена дата для "${credit?.name || creditId}": ${paymentDate}`);
		}
	});
	
	updateMany(restoredDates);
	db.close();
	
	console.log(`\n✅ Успешно восстановлено ${restoredDates.size} дат платежей!`);
	console.log('Перезапустите приложение, чтобы увидеть восстановленные даты.');
} catch (error) {
	console.error('❌ Ошибка при восстановлении:', error.message);
	console.error('Резервная копия сохранена в:', restoreBackupPath);
	process.exit(1);
}

