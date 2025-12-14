import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Logger, LogLevel, logger, createLogger } from '../logger';

describe('Logger', () => {
	let originalConsoleError: typeof console.error;
	let originalConsoleWarn: typeof console.warn;
	let originalConsoleLog: typeof console.log;
	let originalConsoleDebug: typeof console.debug;
	
	beforeEach(() => {
		// Сохраняем оригинальные методы
		originalConsoleError = console.error;
		originalConsoleWarn = console.warn;
		originalConsoleLog = console.log;
		originalConsoleDebug = console.debug;
		
		// Мокаем console методы
		console.error = vi.fn();
		console.warn = vi.fn();
		console.log = vi.fn();
		console.debug = vi.fn();
	});
	
	afterEach(() => {
		// Восстанавливаем оригинальные методы
		console.error = originalConsoleError;
		console.warn = originalConsoleWarn;
		console.log = originalConsoleLog;
		console.debug = originalConsoleDebug;
	});
	
	describe('LogLevel enum', () => {
		it('должен иметь правильные значения', () => {
			expect(LogLevel.ERROR).toBe(0);
			expect(LogLevel.WARN).toBe(1);
			expect(LogLevel.INFO).toBe(2);
			expect(LogLevel.DEBUG).toBe(3);
		});
	});
	
	describe('Logger class', () => {
		it('должен создаваться с правильной конфигурацией', () => {
			const testLogger = new Logger({ level: LogLevel.INFO });
			testLogger.error('test', 'error message');
			testLogger.info('test', 'info message');
			testLogger.debug('test', 'debug message');
			
			expect(console.error).toHaveBeenCalled();
			expect(console.log).toHaveBeenCalled();
			expect(console.debug).not.toHaveBeenCalled(); // DEBUG фильтруется
		});
		
		it('должен фильтровать логи по уровню', () => {
			const testLogger = new Logger({ level: LogLevel.WARN });
			
			testLogger.error('test', 'error');
			testLogger.warn('test', 'warn');
			testLogger.info('test', 'info');
			testLogger.debug('test', 'debug');
			
			expect(console.error).toHaveBeenCalled();
			expect(console.warn).toHaveBeenCalled();
			expect(console.log).not.toHaveBeenCalled();
			expect(console.debug).not.toHaveBeenCalled();
		});
		
		it('должен логировать с категорией', () => {
			const testLogger = new Logger({ level: LogLevel.DEBUG, includeCategory: true });
			testLogger.info('MyCategory', 'test message');
			
			expect(console.log).toHaveBeenCalledWith(
				expect.stringContaining('[INFO]'),
				expect.anything()
			);
			expect(console.log).toHaveBeenCalledWith(
				expect.stringContaining('[MyCategory]'),
				expect.anything()
			);
		});
		
		it('должен логировать без категории когда includeCategory = false', () => {
			const testLogger = new Logger({ level: LogLevel.DEBUG, includeCategory: false });
			testLogger.info('MyCategory', 'test message');
			
			expect(console.log).toHaveBeenCalledWith(
				expect.stringContaining('[INFO]'),
				expect.anything()
			);
			expect(console.log).not.toHaveBeenCalledWith(
				expect.stringContaining('[MyCategory]'),
				expect.anything()
			);
		});
		
		it('должен логировать сообщение и данные отдельно', () => {
			const testLogger = new Logger({ level: LogLevel.DEBUG });
			const testData = { key: 'value', count: 42 };
			
			testLogger.info('test', 'test message', testData);
			
			expect(console.log).toHaveBeenCalled();
			// Проверяем, что данные переданы как отдельный аргумент
			const calls = (console.log as any).mock.calls;
			expect(calls[0]).toHaveLength(2);
			expect(calls[0][0]).toContain('[INFO]');
			expect(calls[0][0]).toContain('[test]');
			expect(calls[0][0]).toContain('test message');
			expect(calls[0][1]).toEqual(testData);
		});
		
		it('должен использовать правильные console методы', () => {
			const testLogger = new Logger({ level: LogLevel.DEBUG });
			
			testLogger.error('test', 'error');
			testLogger.warn('test', 'warn');
			testLogger.info('test', 'info');
			testLogger.debug('test', 'debug');
			
			expect(console.error).toHaveBeenCalled();
			expect(console.warn).toHaveBeenCalled();
			expect(console.log).toHaveBeenCalled();
			expect(console.debug).toHaveBeenCalled();
		});
		
		it('должен позволять изменять уровень логирования', () => {
			const testLogger = new Logger({ level: LogLevel.ERROR });
			testLogger.info('test', 'info');
			expect(console.log).not.toHaveBeenCalled();
			
			testLogger.setLevel(LogLevel.INFO);
			testLogger.info('test', 'info');
			expect(console.log).toHaveBeenCalled();
		});
		
		it('должен позволять изменять конфигурацию', () => {
			const testLogger = new Logger({ level: LogLevel.DEBUG, includeCategory: true });
			testLogger.info('test', 'message');
			expect(console.log).toHaveBeenCalledWith(
				expect.stringContaining('[test]'),
				expect.anything()
			);
			
			// Очищаем вызовы
			vi.clearAllMocks();
			
			testLogger.setConfig({ includeCategory: false });
			testLogger.info('test', 'message');
			expect(console.log).not.toHaveBeenCalledWith(
				expect.stringContaining('[test]'),
				expect.anything()
			);
		});
	});
	
	describe('createLogger', () => {
		it('должен создавать logger с категорией', () => {
			const categoryLogger = createLogger('MyCategory');
			const testLogger = new Logger({ level: LogLevel.DEBUG });
			
			// Мокаем logger чтобы проверить вызовы
			const errorSpy = vi.spyOn(logger, 'error');
			const warnSpy = vi.spyOn(logger, 'warn');
			const infoSpy = vi.spyOn(logger, 'info');
			const debugSpy = vi.spyOn(logger, 'debug');
			
			categoryLogger.error('error message');
			categoryLogger.warn('warn message');
			categoryLogger.info('info message');
			categoryLogger.debug('debug message');
			
			expect(errorSpy).toHaveBeenCalledWith('MyCategory', 'error message', undefined);
			expect(warnSpy).toHaveBeenCalledWith('MyCategory', 'warn message', undefined);
			expect(infoSpy).toHaveBeenCalledWith('MyCategory', 'info message', undefined);
			expect(debugSpy).toHaveBeenCalledWith('MyCategory', 'debug message', undefined);
			
			errorSpy.mockRestore();
			warnSpy.mockRestore();
			infoSpy.mockRestore();
			debugSpy.mockRestore();
		});
		
		it('должен передавать данные в logger', () => {
			const categoryLogger = createLogger('MyCategory');
			const errorSpy = vi.spyOn(logger, 'error');
			const testData = { key: 'value' };
			
			categoryLogger.error('error message', testData);
			
			expect(errorSpy).toHaveBeenCalledWith('MyCategory', 'error message', testData);
			
			errorSpy.mockRestore();
		});
	});
	
	describe('Production behavior', () => {
		it('должен фильтровать debug и info в production режиме (если IS_DEV = false)', () => {
			// Проверяем, что logger по умолчанию правильно настроен
			// В тестах мы не можем напрямую изменить IS_DEV, но можем проверить поведение
			// при разных уровнях логирования
			
			const prodLogger = new Logger({ level: LogLevel.WARN });
			prodLogger.debug('test', 'debug message');
			prodLogger.info('test', 'info message');
			prodLogger.warn('test', 'warn message');
			prodLogger.error('test', 'error message');
			
			// В production режиме должны логироваться только warn и error
			expect(console.debug).not.toHaveBeenCalled();
			expect(console.log).not.toHaveBeenCalled();
			expect(console.warn).toHaveBeenCalled();
			expect(console.error).toHaveBeenCalled();
		});
	});
	
	describe('Edge cases', () => {
		it('должен корректно обрабатывать пустые сообщения', () => {
			const testLogger = new Logger({ level: LogLevel.DEBUG });
			testLogger.info('test', '');
			
			expect(console.log).toHaveBeenCalled();
		});
		
		it('должен корректно обрабатывать undefined данные', () => {
			const testLogger = new Logger({ level: LogLevel.DEBUG });
			testLogger.info('test', 'message', undefined);
			
			expect(console.log).toHaveBeenCalled();
		});
		
		it('должен корректно обрабатывать null данные', () => {
			const testLogger = new Logger({ level: LogLevel.DEBUG });
			testLogger.info('test', 'message', null);
			
			expect(console.log).toHaveBeenCalled();
		});
		
		it('должен корректно обрабатывать сложные объекты', () => {
			const testLogger = new Logger({ level: LogLevel.DEBUG });
			const complexData = {
				nested: { value: 1 },
				array: [1, 2, 3],
				date: new Date(),
			};
			
			testLogger.info('test', 'message', complexData);
			
			expect(console.log).toHaveBeenCalled();
			// Проверяем, что данные переданы как отдельный аргумент
			const calls = (console.log as any).mock.calls;
			expect(calls[0]).toHaveLength(2);
			expect(calls[0][0]).toContain('[INFO]');
			expect(calls[0][0]).toContain('[test]');
			expect(calls[0][0]).toContain('message');
			expect(calls[0][1]).toEqual(complexData);
		});
	});
});

