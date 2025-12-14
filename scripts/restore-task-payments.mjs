// Скрипт для восстановления платежей задачи "Северный портал"
// Ищет задачу в базе данных и резервных копиях, восстанавливает платежи

import Database from 'better-sqlite3';
import fs from 'node:fs/promises';
import fsSync from 'node:fs';
import path from 'node:path';

const home = process.env.HOME || process.env.USERPROFILE;

// Возможные пути к базе данных
const possiblePaths = [
	path.join(home, 'Library', 'Application Support', 'CRM Desktop'),
	path.join(home, 'Library', 'Application Support', 'Mansurov CRM'),
	path.join(home, 'Library', 'Application Support', 'crm-desktop'),
];

// Находим существующий путь
let userDataPath = null;
let dbPath = null;

for (const possiblePath of possiblePaths) {
	const testDbPath = path.join(possiblePath, 'crm.db');
	if (fsSync.existsSync(testDbPath)) {
		userDataPath = possiblePath;
		dbPath = testDbPath;
		break;
	}
}

const oldDataPath = path.join(home, 'Library', 'Application Support', 'crm-desktop');
const taskTitle = 'Северный портал';

console.log('🔍 Поиск задачи:', taskTitle);
if (dbPath) {
	console.log('📁 База данных:', dbPath);
} else {
	console.log('⚠️  База данных не найдена, будут проверены только резервные копии');
}

// Функция для поиска задачи в базе данных
function findTaskInDatabase(dbPath) {
	if (!fsSync.existsSync(dbPath)) {
		console.log('⚠️  База данных не найдена:', dbPath);
		return null;
	}

	try {
		const db = new Database(dbPath);
		const tasks = db.prepare('SELECT * FROM tasks').all();
		
		// Ищем задачу по названию (регистронезависимо)
		const task = tasks.find(t => 
			t.title && t.title.toLowerCase().includes(taskTitle.toLowerCase())
		);
		
		db.close();
		return task;
	} catch (error) {
		console.error('❌ Ошибка при чтении базы данных:', error.message);
		return null;
	}
}

// Функция для поиска задачи в JSON файлах
async function findTaskInJsonFiles() {
	const sources = [
		{ name: 'tasks.json (текущий)', path: path.join(userDataPath, 'tasks.json') },
		{ name: 'tasks.json (старый)', path: path.join(oldDataPath, 'tasks.json') },
	];

	const results = [];

	for (const source of sources) {
		if (!fsSync.existsSync(source.path)) {
			console.log(`⚠️  ${source.name} не найден: ${source.path}`);
			continue;
		}

		try {
			const content = await fs.readFile(source.path, 'utf-8');
			const tasks = JSON.parse(content);
			
			if (!Array.isArray(tasks)) {
				continue;
			}

			const task = tasks.find(t => 
				t.title && t.title.toLowerCase().includes(taskTitle.toLowerCase())
			);

			if (task) {
				results.push({ source: source.name, task });
				console.log(`✅ Найдена задача в ${source.name}`);
			}
		} catch (error) {
			console.error(`❌ Ошибка при чтении ${source.name}:`, error.message);
		}
	}

	return results;
}

// Функция для поиска в резервных копиях
async function findTaskInBackups() {
	const backupDirs = [
		path.join(userDataPath, 'backups'),
		path.join(oldDataPath, 'backups'),
	];

	const results = [];

	for (const backupDir of backupDirs) {
		if (!fsSync.existsSync(backupDir)) {
			continue;
		}

		try {
			const entries = await fs.readdir(backupDir, { withFileTypes: true });
			
			for (const entry of entries) {
				if (entry.isDirectory()) {
					const tasksPath = path.join(backupDir, entry.name, 'tasks.json');
					if (fsSync.existsSync(tasksPath)) {
						try {
							const content = await fs.readFile(tasksPath, 'utf-8');
							const tasks = JSON.parse(content);
							
							if (Array.isArray(tasks)) {
								const task = tasks.find(t => 
									t.title && t.title.toLowerCase().includes(taskTitle.toLowerCase())
								);

								if (task) {
									results.push({ 
										source: `backup/${entry.name}/tasks.json`, 
										task 
									});
									console.log(`✅ Найдена задача в резервной копии: ${entry.name}`);
								}
							}
						} catch (error) {
							// Игнорируем ошибки чтения отдельных файлов
						}
					}
				}
			}
		} catch (error) {
			console.error(`❌ Ошибка при чтении резервных копий:`, error.message);
		}
	}

	return results;
}

// Функция для восстановления платежей
async function restorePayments(taskId, payments) {
	if (!fsSync.existsSync(dbPath)) {
		console.error('❌ База данных не найдена:', dbPath);
		return false;
	}

	try {
		const db = new Database(dbPath);
		
		// Делаем резервную копию перед изменением
		const backupPath = `${dbPath}.backup-${Date.now()}`;
		await fs.copyFile(dbPath, backupPath);
		console.log('💾 Создана резервная копия:', backupPath);

		// Обновляем платежи
		const paymentsJson = JSON.stringify(payments || []);
		const stmt = db.prepare('UPDATE tasks SET payments = ? WHERE id = ?');
		stmt.run(paymentsJson, taskId);
		
		db.close();
		
		console.log(`✅ Платежи восстановлены для задачи "${taskTitle}"`);
		console.log(`   Количество платежей: ${payments?.length || 0}`);
		if (payments && payments.length > 0) {
			console.log('   Платежи:');
			payments.forEach((p, idx) => {
				const amount = p.amount || (p.qty && p.price ? p.qty * p.price : 0);
				console.log(`     ${idx + 1}. ${p.title || 'Без названия'} - ${amount} руб. (${p.paid ? 'оплачен' : 'не оплачен'})`);
			});
		}
		
		return true;
	} catch (error) {
		console.error('❌ Ошибка при восстановлении платежей:', error.message);
		return false;
	}
}

// Основная функция
async function main() {
	console.log('\n=== Восстановление платежей задачи ===\n');

	// 1. Ищем задачу в текущей базе данных
	console.log('1️⃣  Поиск в текущей базе данных...');
	const currentTask = findTaskInDatabase(dbPath);
	
	if (currentTask) {
		console.log(`✅ Задача найдена в базе данных (ID: ${currentTask.id})`);
		const currentPayments = currentTask.payments ? JSON.parse(currentTask.payments) : [];
		console.log(`   Текущее количество платежей: ${currentPayments.length}`);
		
		if (currentPayments.length > 0) {
			console.log('   Текущие платежи:');
			currentPayments.forEach((p, idx) => {
				const amount = p.amount || (p.qty && p.price ? p.qty * p.price : 0);
				console.log(`     ${idx + 1}. ${p.title || 'Без названия'} - ${amount} руб.`);
			});
		}
	} else {
		console.log('⚠️  Задача не найдена в текущей базе данных');
	}

	// 2. Ищем задачу в JSON файлах
	console.log('\n2️⃣  Поиск в JSON файлах...');
	const jsonResults = await findTaskInJsonFiles();
	
	// 3. Ищем задачу в резервных копиях
	console.log('\n3️⃣  Поиск в резервных копиях...');
	const backupResults = await findTaskInBackups();

	// 4. Объединяем все результаты
	const allResults = [...jsonResults, ...backupResults];

	if (allResults.length === 0) {
		console.log('\n❌ Задача не найдена ни в одном источнике');
		console.log('   Проверьте название задачи и наличие резервных копий');
		return;
	}

	// 5. Выбираем задачу с наибольшим количеством платежей
	let bestTask = null;
	let maxPayments = 0;

	for (const result of allResults) {
		const payments = result.task.payments || [];
		if (payments.length > maxPayments) {
			maxPayments = payments.length;
			bestTask = result;
		}
	}

	if (!bestTask) {
		console.log('\n❌ Не найдено задачи с платежами');
		return;
	}

	console.log(`\n✅ Найдена лучшая версия задачи в: ${bestTask.source}`);
	console.log(`   Количество платежей: ${bestTask.task.payments?.length || 0}`);

	// 6. Восстанавливаем платежи
	if (currentTask) {
		const taskId = currentTask.id;
		const payments = bestTask.task.payments || [];
		
		console.log(`\n🔄 Восстанавливаю платежи для задачи "${taskTitle}" (ID: ${taskId})...`);
		
		const restored = await restorePayments(taskId, payments);
		
		if (restored) {
			console.log('\n✅ Готово! Перезапустите приложение, чтобы увидеть восстановленные платежи.');
		}
	} else {
		console.log('\n⚠️  Задача не найдена в текущей базе данных.');
		console.log('   Не могу восстановить платежи без ID задачи в базе.');
		console.log(`   Найденная задача из резервной копии (ID: ${bestTask.task.id}):`);
		console.log(JSON.stringify(bestTask.task, null, 2));
	}
}

main().catch((err) => {
	console.error('❌ Неожиданная ошибка:', err);
	process.exit(1);
});

