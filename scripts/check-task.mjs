#!/usr/bin/env node
/**
 * Скрипт для проверки задач в базе данных
 * Ищет задачу по названию или показывает все задачи с unprocessed статусом
 */

import Database from 'better-sqlite3';
import path from 'node:path';
import { fileURLToPath } from 'url';
import os from 'os';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Путь к базе данных (в userData директории Electron)
const userDataPath = process.env.ELECTRON_USER_DATA || 
	path.join(os.homedir(), 'Library', 'Application Support', 'crm-desktop');
const dbPath = path.join(userDataPath, 'crm.db');

console.log('🔍 Проверка базы данных задач...');
console.log('📁 Путь к БД:', dbPath);

try {
	const db = new Database(dbPath);
	
	// Проверяем, существует ли таблица
	const tableExists = db.prepare(`
		SELECT name FROM sqlite_master 
		WHERE type='table' AND name='tasks'
	`).get();
	
	if (!tableExists) {
		console.error('❌ Таблица tasks не найдена в базе данных');
		process.exit(1);
	}
	
	// Ищем задачу "Родинка"
	const searchTerm = process.argv[2] || 'Родинка';
	console.log(`\n🔎 Поиск задачи: "${searchTerm}"`);
	
	const foundTasks = db.prepare(`
		SELECT id, title, column_id, created_at, updated_at, customer_id
		FROM tasks 
		WHERE title LIKE ?
		ORDER BY created_at DESC
	`).all(`%${searchTerm}%`);
	
	if (foundTasks.length === 0) {
		console.log(`❌ Задача "${searchTerm}" не найдена`);
	} else {
		console.log(`\n✅ Найдено задач: ${foundTasks.length}`);
		foundTasks.forEach((task, index) => {
			console.log(`\n${index + 1}. ${task.title}`);
			console.log(`   ID: ${task.id}`);
			console.log(`   Колонка: ${task.column_id || 'unprocessed'}`);
			console.log(`   Создана: ${task.created_at || 'не указано'}`);
			console.log(`   Обновлена: ${task.updated_at || 'не указано'}`);
			console.log(`   Клиент: ${task.customer_id || 'не указан'}`);
		});
	}
	
	// Показываем все задачи в unprocessed
	console.log('\n\n📋 Все задачи в колонке "Неразобранные" (unprocessed):');
	const unprocessedTasks = db.prepare(`
		SELECT id, title, column_id, created_at, customer_id
		FROM tasks 
		WHERE column_id = 'unprocessed' OR column_id IS NULL
		ORDER BY created_at DESC
	`).all();
	
	if (unprocessedTasks.length === 0) {
		console.log('   Нет задач в колонке "Неразобранные"');
	} else {
		console.log(`   Всего: ${unprocessedTasks.length}`);
		unprocessedTasks.forEach((task, index) => {
			console.log(`   ${index + 1}. ${task.title} (ID: ${task.id})`);
		});
	}
	
	// Статистика по колонкам
	console.log('\n\n📊 Статистика по колонкам:');
	const stats = db.prepare(`
		SELECT 
			COALESCE(column_id, 'unprocessed') as column_id,
			COUNT(*) as count
		FROM tasks
		GROUP BY column_id
		ORDER BY count DESC
	`).all();
	
	stats.forEach(stat => {
		console.log(`   ${stat.column_id || 'NULL'}: ${stat.count} задач`);
	});
	
	// Общее количество задач
	const total = db.prepare('SELECT COUNT(*) as count FROM tasks').get();
	console.log(`\n📈 Всего задач в базе: ${total.count}`);
	
	db.close();
	console.log('\n✅ Проверка завершена');
	
} catch (error) {
	if (error.code === 'SQLITE_CANTOPEN') {
		console.error('❌ Не удалось открыть базу данных');
		console.error('   Убедитесь, что приложение запущено хотя бы раз');
		console.error('   Путь:', dbPath);
	} else {
		console.error('❌ Ошибка:', error.message);
		console.error(error);
	}
	process.exit(1);
}

