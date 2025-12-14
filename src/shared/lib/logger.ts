import { IS_DEV } from '@/shared/config';

/**
 * Log levels
 */
export enum LogLevel {
	ERROR = 0,
	WARN = 1,
	INFO = 2,
	DEBUG = 3,
}

const LOG_LEVEL_NAMES = ['ERROR', 'WARN', 'INFO', 'DEBUG'];

/**
 * Logger configuration
 */
interface LoggerConfig {
	/**
	 * Maximum log level to output
	 * In production: WARN (only ERROR and WARN)
	 * In development: DEBUG (all levels)
	 */
	level: LogLevel;
	/**
	 * Whether to include category prefix in logs
	 */
	includeCategory: boolean;
}

/**
 * Default configuration
 */
const defaultConfig: LoggerConfig = {
	level: IS_DEV ? LogLevel.DEBUG : LogLevel.WARN,
	includeCategory: true,
};

/**
 * Main logger class
 */
export class Logger {
	private config: LoggerConfig;

	constructor(config: Partial<LoggerConfig> = {}) {
		this.config = { ...defaultConfig, ...config };
	}

	/**
	 * Set log level
	 */
	setLevel(level: LogLevel): void {
		this.config.level = level;
	}

	/**
	 * Set configuration
	 */
	setConfig(config: Partial<LoggerConfig>): void {
		this.config = { ...this.config, ...config };
	}

	/**
	 * Internal log method
	 */
	private log(level: LogLevel, category: string, message: string, data?: unknown): void {
		if (level > this.config.level) return;

		const levelName = LOG_LEVEL_NAMES[level];
		const prefix = this.config.includeCategory 
			? `[${levelName}] [${category}]` 
			: `[${levelName}]`;

		const logMessage = data !== undefined 
			? `${prefix} ${message}` 
			: prefix;

		switch (level) {
			case LogLevel.ERROR:
				console.error(logMessage, data !== undefined ? data : message);
				break;
			case LogLevel.WARN:
				console.warn(logMessage, data !== undefined ? data : message);
				break;
			case LogLevel.INFO:
				console.log(logMessage, data !== undefined ? data : message);
				break;
			case LogLevel.DEBUG:
				console.debug(logMessage, data !== undefined ? data : message);
				break;
		}
	}

	/**
	 * Log error
	 */
	error(category: string, message: string, data?: unknown): void {
		this.log(LogLevel.ERROR, category, message, data);
	}

	/**
	 * Log warning
	 */
	warn(category: string, message: string, data?: unknown): void {
		this.log(LogLevel.WARN, category, message, data);
	}

	/**
	 * Log info
	 */
	info(category: string, message: string, data?: unknown): void {
		this.log(LogLevel.INFO, category, message, data);
	}

	/**
	 * Log debug
	 */
	debug(category: string, message: string, data?: unknown): void {
		this.log(LogLevel.DEBUG, category, message, data);
	}
}

/**
 * Singleton logger instance
 */
export const logger = new Logger();

/**
 * Create a category-specific logger
 * @param category Category name
 * @returns Logger with methods bound to the category
 */
export function createLogger(category: string) {
	return {
		error: (message: string, data?: unknown) => logger.error(category, message, data),
		warn: (message: string, data?: unknown) => logger.warn(category, message, data),
		info: (message: string, data?: unknown) => logger.info(category, message, data),
		debug: (message: string, data?: unknown) => logger.debug(category, message, data),
	};
}

