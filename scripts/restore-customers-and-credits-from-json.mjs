// Генерация SQL-скрипта для восстановления клиентов и кредитов
// из JSON файлов Mansurov CRM в базу crm.db

import fs from 'node:fs/promises';
import fsSync from 'node:fs';
import path from 'node:path';

async function main() {
	console.log('=== Prepare SQL to restore customers & credits from JSON → SQLite ===');

	const home = process.env.HOME || process.env.USERPROFILE;
	if (!home) {
		console.error('Cannot detect HOME directory');
		process.exit(1);
	}

	const userDataPath = path.join(home, 'Library', 'Application Support', 'Mansurov CRM');
	const customersPath = path.join(userDataPath, 'customers.json');
	const goalsPath = path.join(userDataPath, 'goals.json');
	const dbPath = path.join(userDataPath, 'crm.db');

	console.log('UserData path:', userDataPath);
	console.log('customers.json:', customersPath);
	console.log('goals.json:', goalsPath);
	console.log('crm.db:', dbPath);

	if (!fsSync.existsSync(customersPath)) {
		console.error('customers.json not found at', customersPath);
		process.exit(1);
	}
	if (!fsSync.existsSync(goalsPath)) {
		console.error('goals.json not found at', goalsPath);
		process.exit(1);
	}
	if (!fsSync.existsSync(dbPath)) {
		console.error('crm.db not found at', dbPath);
		process.exit(1);
	}

	// Резервная копия базы
	const backupPath = `${dbPath}.backup-customers-credits-${Date.now()}`;
	await fs.copyFile(dbPath, backupPath);
	console.log('Backup of crm.db created:', backupPath);

	// Читаем customers.json
	const customersRaw = await fs.readFile(customersPath, 'utf-8');
	let customers;
	try {
		customers = JSON.parse(customersRaw);
	} catch (err) {
		console.error('Failed to parse customers.json:', err);
		process.exit(1);
	}
	if (!Array.isArray(customers)) {
		console.error('customers.json does not contain an array');
		process.exit(1);
	}
	console.log('Customers in JSON:', customers.length);

	// Читаем goals.json (там же лежат credits)
	const goalsRaw = await fs.readFile(goalsPath, 'utf-8');
	let goalsData;
	try {
		goalsData = JSON.parse(goalsRaw);
	} catch (err) {
		console.error('Failed to parse goals.json:', err);
		process.exit(1);
	}

	let credits = [];
	if (Array.isArray(goalsData)) {
		// старая структура, кредиты могли не храниться
		credits = [];
	} else if (goalsData && typeof goalsData === 'object') {
		credits = Array.isArray(goalsData.credits) ? goalsData.credits : [];
	}
	console.log('Credits in JSON:', credits.length);

	const esc = (value) => {
		if (value === null || value === undefined) return 'NULL';
		if (typeof value === 'number') return String(value);
		return `'${String(value).replace(/'/g, "''")}'`;
	};

	const lines = [];
	lines.push('-- ВОССТАНОВЛЕНИЕ КЛИЕНТОВ И КРЕДИТОВ ИЗ customers.json / goals.json');
	lines.push('-- ПЕРЕД ВЫПОЛНЕНИЕМ СДЕЛАЙТЕ РЕЗЕРВНУЮ КОПИЮ crm.db (уже создана автоматически)');
	lines.push('DELETE FROM customers;');
	lines.push('DELETE FROM credits;');
	lines.push('');

	for (const c of customers) {
		lines.push(
			`INSERT OR REPLACE INTO customers (id, name, contact, contacts, avatar, comment, accesses) VALUES (` +
				[
					esc(c.id),
					esc(c.name || ''),
					esc(c.contact || null),
					esc(JSON.stringify(c.contacts || [])),
					esc(c.avatar || null),
					esc(c.comment || null),
					esc(JSON.stringify(c.accesses || [])),
				].join(', ') +
				');'
		);
	}

	for (const credit of credits) {
		lines.push(
			`INSERT OR REPLACE INTO credits (id, name, amount, monthly_payment, interest_rate, notes, paid_this_month, last_paid_month, payment_date) VALUES (` +
				[
					esc(credit.id),
					esc(credit.name || ''),
					esc(credit.amount ?? null),
					esc(credit.monthlyPayment ?? null),
					esc(credit.interestRate ?? null),
					esc(credit.notes || null),
					esc(credit.paidThisMonth ? 1 : 0),
					esc(credit.lastPaidMonth || null),
					esc(credit.paymentDate || null),
				].join(', ') +
				');'
		);
	}

	const outPath = path.join(process.cwd(), 'restore-customers-credits.sql');
	await fs.writeFile(outPath, lines.join('\n'), 'utf-8');
	console.log('SQL script generated:', outPath);
	console.log('Открой /Users/rafael/Library/Application Support/Mansurov CRM/crm.db в SQLiteStudio и выполните этот скрипт ИЛИ примените его через sqlite3, как для задач.');
}

main().catch((err) => {
	console.error('Unexpected error:', err);
	process.exit(1);
});








