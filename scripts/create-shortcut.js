#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import os from 'os';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const desktopPath = path.join(os.homedir(), 'Desktop');
const appName = 'MansurovCRM';
const projectPath = path.resolve(__dirname, '..');

// Создаем скрипт запуска приложения
const launchScript = `#!/bin/bash
cd "${projectPath}"
npm start
`;

const scriptPath = path.join(projectPath, 'launch.sh');

// Записываем скрипт запуска
fs.writeFileSync(scriptPath, launchScript, { mode: 0o755 });

if (process.platform === 'darwin') {
	// Для macOS создаем AppleScript для запуска приложения
	const applescript = `tell application "Terminal"
	activate
	do script "cd '${projectPath}' && npm start"
end tell`;

	const scriptFile = path.join(projectPath, 'launch.applescript');
	fs.writeFileSync(scriptFile, applescript);

	// Создаем .command файл для двойного клика
	const commandFile = path.join(desktopPath, `${appName}.command`);
	const commandContent = `#!/bin/bash
cd "${projectPath}"
npm start
`;
	fs.writeFileSync(commandFile, commandContent, { mode: 0o755 });

	console.log(`✅ Ярлык создан на рабочем столе: ${appName}.command`);
	console.log(`   Дважды кликните на файл "${appName}.command" на рабочем столе для запуска приложения`);
} else if (process.platform === 'win32') {
	// Для Windows создаем .bat файл
	const batFile = path.join(desktopPath, `${appName}.bat`);
	const batContent = `@echo off
cd /d "${projectPath}"
npm start
pause
`;
	fs.writeFileSync(batFile, batContent);
	console.log(`✅ Ярлык создан на рабочем столе: ${appName}.bat`);
} else {
	// Для Linux создаем .desktop файл
	const desktopFile = path.join(desktopPath, `${appName}.desktop`);
	const desktopContent = `[Desktop Entry]
Name=${appName}
Comment=CRM Desktop Application
Exec=cd "${projectPath}" && npm start
Icon=application-x-executable
Terminal=true
Type=Application
Categories=Office;
`;
	fs.writeFileSync(desktopFile, desktopContent, { mode: 0o755 });
	console.log(`✅ Ярлык создан на рабочем столе: ${appName}.desktop`);
}

console.log('\n📝 Инструкция по запуску:');
console.log('   1. Для разработки: npm run dev');
console.log('   2. Для production: npm start');
console.log('   3. Или используйте ярлык на рабочем столе');

