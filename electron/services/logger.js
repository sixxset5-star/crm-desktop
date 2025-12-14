/**
 * Централизованная система логирования
 * Поддерживает разные уровни логирования и категории
 */
import pkg from 'electron';
const { app } = pkg;
import path from 'node:path';
import fs from 'node:fs/promises';
import fsSync from 'node:fs';
import { sanitizeLogData, sanitizeLogMessage } from './log-sanitizer.js';

const LOG_LEVELS = {
	ERROR: 0,
	WARN: 1,
	INFO: 2,
	DEBUG: 3,
};

const LOG_LEVEL_NAMES = ['ERROR', 'WARN', 'INFO', 'DEBUG'];

class Logger {
	constructor() {
		this.logLevel = process.env.NODE_ENV === 'development' ? LOG_LEVELS.DEBUG : LOG_LEVELS.INFO;
		this.logDir = null;
		this.logFile = null;
		this.errorLogFile = null; // Отдельный файл для ошибок
		this.requestIdCounter = 0;
		this.initialized = false;
		// Не инициализируем сразу, ждем app.whenReady()
	}

	async ensureInitialized() {
		if (this.initialized) return;
		
		try {
			// Ждем, пока app будет готов
			if (!app.isReady()) {
				await app.whenReady();
			}
			
			const userDataPath = app.getPath('userData');
			this.logDir = path.join(userDataPath, 'logs');
			
			// Создаем директорию, если не существует
			if (!fsSync.existsSync(this.logDir)) {
				await fs.mkdir(this.logDir, { recursive: true });
			}

			// Создаем файлы логов с датой
			const date = new Date().toISOString().split('T')[0];
			this.logFile = path.join(this.logDir, `app-${date}.log`);
			this.errorLogFile = path.join(this.logDir, `error-${date}.log`);

			// Очищаем старые логи (старше 7 дней) асинхронно, не блокируя инициализацию
			this.cleanOldLogs().catch(() => {
				// Игнорируем ошибки очистки
			});
			
			this.initialized = true;
		} catch (error) {
			// Не используем console.error, чтобы избежать рекурсии
			process.stderr.write(`[Logger] Failed to initialize log directory: ${error.message}\n`);
		}
	}

	async cleanOldLogs() {
		try {
			if (!this.logDir) return;
			
			const files = await fs.readdir(this.logDir);
			const now = Date.now();
			const maxAge = 7 * 24 * 60 * 60 * 1000; // 7 дней

			for (const file of files) {
				if (!file.startsWith('app-') && !file.startsWith('error-')) continue;
				if (!file.endsWith('.log')) continue;
				
				const filePath = path.join(this.logDir, file);
				const stats = await fs.stat(filePath);
				
				if (now - stats.mtimeMs > maxAge) {
					await fs.unlink(filePath);
					// Не используем console, чтобы избежать проблем при инициализации
				}
			}
		} catch (error) {
			// Не используем console.error, чтобы избежать рекурсии
			process.stderr.write(`[Logger] Failed to clean old logs: ${error.message}\n`);
		}
	}

	/**
	 * Генерировать correlation ID для запроса
	 */
	generateRequestId() {
		this.requestIdCounter = (this.requestIdCounter + 1) % 1000000;
		const timestamp = Date.now();
		return `${timestamp}-${this.requestIdCounter.toString(36)}`;
	}

	async writeToFile(level, category, message, data = null, requestId = null) {
		// Ленивая инициализация
		await this.ensureInitialized();
		
		if (!this.logFile) return;

		try {
			const timestamp = new Date().toISOString();
			const levelName = LOG_LEVEL_NAMES[level];
			
			// Санитизируем данные перед записью
			const sanitizedMessage = sanitizeLogMessage(message);
			const sanitizedData = data ? sanitizeLogData(data) : null;
			
			// Структурированный лог в JSON формате
			const logEntry = {
				timestamp,
				level: levelName,
				category,
				message: sanitizedMessage,
				...(requestId && { requestId }),
				...(sanitizedData && { data: sanitizedData }),
			};
			
			const logLine = JSON.stringify(logEntry) + '\n';

			// Пишем в основной лог
			await fs.appendFile(this.logFile, logLine, 'utf-8');
			
			// Ошибки также пишем в отдельный файл
			if (level === LOG_LEVELS.ERROR && this.errorLogFile) {
				await fs.appendFile(this.errorLogFile, logLine, 'utf-8');
			}
		} catch (error) {
			// Не используем console.error, чтобы избежать рекурсии
			process.stderr.write(`[Logger] Failed to write to log file: ${error.message}\n`);
		}
	}

	log(level, category, message, data = null, requestId = null) {
		if (level > this.logLevel) return;

		const levelName = LOG_LEVEL_NAMES[level];
		const prefix = `[${levelName}] [${category}]${requestId ? ` [${requestId}]` : ''}`;

		switch (level) {
			case LOG_LEVELS.ERROR:
				console.error(prefix, message, data || '');
				break;
			case LOG_LEVELS.WARN:
				console.warn(prefix, message, data || '');
				break;
			case LOG_LEVELS.INFO:
				console.log(prefix, message, data || '');
				break;
			case LOG_LEVELS.DEBUG:
				console.debug(prefix, message, data || '');
				break;
		}

		// Асинхронно пишем в файл (не блокируем выполнение)
		this.writeToFile(level, category, message, data, requestId).catch(() => {
			// Игнорируем ошибки записи в файл
		});
	}

	error(category, message, data = null, requestId = null) {
		this.log(LOG_LEVELS.ERROR, category, message, data, requestId);
	}

	warn(category, message, data = null, requestId = null) {
		this.log(LOG_LEVELS.WARN, category, message, data, requestId);
	}

	info(category, message, data = null, requestId = null) {
		this.log(LOG_LEVELS.INFO, category, message, data, requestId);
	}

	debug(category, message, data = null, requestId = null) {
		this.log(LOG_LEVELS.DEBUG, category, message, data, requestId);
	}

	setLogLevel(level) {
		if (typeof level === 'string') {
			level = LOG_LEVELS[level.toUpperCase()] ?? LOG_LEVELS.INFO;
		}
		this.logLevel = Math.max(LOG_LEVELS.ERROR, Math.min(LOG_LEVELS.DEBUG, level));
	}
}

// Singleton экземпляр
export const logger = new Logger();

// Создаем категоризированные логгеры для удобства
export const createLogger = (category) => ({
	error: (message, data, requestId) => logger.error(category, message, data, requestId),
	warn: (message, data, requestId) => logger.warn(category, message, data, requestId),
	info: (message, data, requestId) => logger.info(category, message, data, requestId),
	debug: (message, data, requestId) => logger.debug(category, message, data, requestId),
	// Хелпер для генерации requestId
	generateRequestId: () => logger.generateRequestId(),
});

