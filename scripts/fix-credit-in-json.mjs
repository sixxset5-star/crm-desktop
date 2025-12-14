#!/usr/bin/env node
/**
 * Скрипт для исправления кредита "Виталик (долг)" в goals.json
 * Добавляет недостающие поля: interestRate = 0, startDate, termMonths
 */
import fs from 'fs';
import path from 'path';
import os from 'os';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Определяем путь к goals.json
const userDataPath = process.env.APPDATA || 
	(process.platform === 'darwin' 
		? path.join(os.homedir(), 'Library', 'Application Support', 'crm-desktop')
		: path.join(os.homedir(), '.config', 'crm-desktop'));

const goalsPath = path.join(userDataPath, 'goals.json');

if (!fs.existsSync(goalsPath)) {
	console.error('❌ Файл goals.json не найден:', goalsPath);
	process.exit(1);
}

console.log('📖 Читаю файл:', goalsPath);

// Создаем резервную копию
const backupPath = goalsPath + '.backup.' + Date.now();
fs.copyFileSync(goalsPath, backupPath);
console.log('💾 Создана резервная копия:', backupPath);

const goals = JSON.parse(fs.readFileSync(goalsPath, 'utf8'));

if (!goals.credits || !Array.isArray(goals.credits)) {
	console.error('❌ Структура goals.json неверна: credits не найден или не является массивом');
	process.exit(1);
}

// Находим кредит "Виталик (долг)"
const vitalikIndex = goals.credits.findIndex(c => c.name?.includes('Виталик'));
if (vitalikIndex === -1) {
	console.error('❌ Кредит "Виталик (долг)" не найден');
	process.exit(1);
}

const vitalik = goals.credits[vitalikIndex];
console.log('\n🔍 Найден кредит:', vitalik.name);
console.log('   Текущие данные:', JSON.stringify(vitalik, null, 2));

// Исправляем данные
const fixed = {
	...vitalik,
	interestRate: 0, // Беспроцентный кредит
	startDate: '2025-11-26', // Дата начала (из требований пользователя)
	termMonths: 12, // Срок 12 месяцев (из требований пользователя)
	// paymentDate оставляем как есть, если есть, или undefined
};

goals.credits[vitalikIndex] = fixed;

// Сохраняем исправленный файл
fs.writeFileSync(goalsPath, JSON.stringify(goals, null, 2), 'utf8');

console.log('\n✅ Исправленные данные:', JSON.stringify(fixed, null, 2));
console.log('\n✅ Файл goals.json обновлен!');
console.log('💡 Перезапустите приложение, чтобы изменения вступили в силу.');

