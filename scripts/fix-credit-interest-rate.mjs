#!/usr/bin/env node
/**
 * Скрипт для исправления interest_rate = NULL в БД
 * Устанавливает interest_rate = 0 для кредитов, где он NULL, но есть другие данные
 */
import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import os from 'os';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Определяем путь к БД
const userDataPath = process.env.APPDATA || 
	(process.platform === 'darwin' 
		? path.join(os.homedir(), 'Library', 'Application Support', 'crm-desktop')
		: path.join(os.homedir(), '.config', 'crm-desktop'));

const dbPath = path.join(userDataPath, 'crm.db');

if (!fs.existsSync(dbPath)) {
	console.error('❌ База данных не найдена:', dbPath);
	process.exit(1);
}

console.log('📖 Открываю базу данных:', dbPath);

const db = new Database(dbPath, { readonly: false });

try {
	// Проверяем наличие таблицы credits
	const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='credits'").all();
	if (tables.length === 0) {
		console.error('❌ Таблица credits не найдена в базе данных. База данных может быть не инициализирована.');
		console.log('💡 Запустите приложение один раз, чтобы инициализировать базу данных.');
		db.close();
		process.exit(1);
	}

	// Находим кредиты с NULL interest_rate
	const creditsWithNull = db.prepare(`
		SELECT id, name, start_date, term_months, interest_rate, payment_date, amount
		FROM credits
		WHERE interest_rate IS NULL
	`).all();

	console.log(`\n🔍 Найдено кредитов с interest_rate = NULL: ${creditsWithNull.length}`);

	if (creditsWithNull.length === 0) {
		console.log('✅ Все кредиты имеют корректный interest_rate');
		db.close();
		process.exit(0);
	}

	// Показываем найденные кредиты
	console.log('\n📋 Кредиты с NULL interest_rate:');
	for (const credit of creditsWithNull) {
		console.log(`  - ${credit.name} (id: ${credit.id})`);
		console.log(`    start_date: ${credit.start_date || 'NULL'}`);
		console.log(`    term_months: ${credit.term_months || 'NULL'}`);
		console.log(`    interest_rate: ${credit.interest_rate} (NULL)`);
		console.log(`    payment_date: ${credit.payment_date || 'NULL'}`);
		console.log(`    amount: ${credit.amount || 'NULL'}`);
	}

	// Исправляем: устанавливаем interest_rate = 0 для кредитов с NULL
	const updateStmt = db.prepare(`
		UPDATE credits
		SET interest_rate = 0
		WHERE interest_rate IS NULL
	`);

	const result = updateStmt.run();
	console.log(`\n✅ Обновлено кредитов: ${result.changes}`);

	// Проверяем результат
	const verifyStmt = db.prepare(`
		SELECT id, name, interest_rate
		FROM credits
		WHERE id IN (${creditsWithNull.map(() => '?').join(', ')})
	`);
	
	const updated = verifyStmt.all(...creditsWithNull.map(c => c.id));
	console.log('\n📊 Проверка обновленных кредитов:');
	for (const credit of updated) {
		console.log(`  - ${credit.name}: interest_rate = ${credit.interest_rate} (type: ${typeof credit.interest_rate})`);
	}

	// Проверяем кредит "Виталик (долг)" специально
	const vitalik = db.prepare(`
		SELECT id, name, start_date, term_months, interest_rate, payment_date
		FROM credits
		WHERE name LIKE '%Виталик%'
	`).get();

	if (vitalik) {
		console.log('\n🎯 Кредит "Виталик (долг)":');
		console.log(`  id: ${vitalik.id}`);
		console.log(`  name: ${vitalik.name}`);
		console.log(`  start_date: ${vitalik.start_date || 'NULL'}`);
		console.log(`  term_months: ${vitalik.term_months || 'NULL'}`);
		console.log(`  interest_rate: ${vitalik.interest_rate} (type: ${typeof vitalik.interest_rate})`);
		console.log(`  payment_date: ${vitalik.payment_date || 'NULL'}`);
	}

	console.log('\n✅ Готово!');
} catch (error) {
	console.error('❌ Ошибка:', error);
	process.exit(1);
} finally {
	db.close();
}

