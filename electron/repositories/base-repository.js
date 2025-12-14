/**
 * Базовый репозиторий
 * Предоставляет общие методы для работы с БД
 */
import { getDatabase } from '../database.js';

export class BaseRepository {
	constructor() {
		this._db = null;
	}

	/**
	 * Получить экземпляр базы данных
	 */
	getDb() {
		if (!this._db) {
			this._db = getDatabase();
		}
		return this._db;
	}

	/**
	 * Выполнить операцию в транзакции
	 * @param {Function} callback - Функция, которая будет выполнена в транзакции
	 * @returns {*} Результат выполнения callback
	 */
	transaction(callback) {
		const db = this.getDb();
		const transaction = db.transaction((...args) => {
			return callback(...args);
		});
		return transaction();
	}

	/**
	 * Выполнить операцию в транзакции (алиас для transaction)
	 * Используется domain-сервисами для явного указания транзакционности
	 * @param {Function} callback - Функция, которая будет выполнена в транзакции
	 * @returns {*} Результат выполнения callback
	 */
	runInTransaction(callback) {
		return this.transaction(callback);
	}

	/**
	 * Безопасный парсинг JSON
	 * @param {string} jsonString - JSON строка
	 * @param {*} defaultValue - Значение по умолчанию
	 * @param {string} expectedType - Ожидаемый тип ('array' или 'object')
	 * @returns {*} Распарсенный объект или значение по умолчанию
	 */
	safeJsonParse(jsonString, defaultValue = null, expectedType = null) {
		if (!jsonString || jsonString === 'null') {
			return defaultValue;
		}

		try {
			const parsed = JSON.parse(jsonString);
			
			if (expectedType === 'array' && !Array.isArray(parsed)) {
				return defaultValue;
			}
			
			if (expectedType === 'object' && (typeof parsed !== 'object' || Array.isArray(parsed))) {
				return defaultValue;
			}
			
			return parsed;
		} catch (error) {
			return defaultValue;
		}
	}

	/**
	 * Безопасная сериализация в JSON
	 * @param {*} value - Значение для сериализации
	 * @returns {string | null} JSON строка или null при ошибке
	 */
	safeJsonStringify(value) {
		if (value === null || value === undefined) {
			return null;
		}
		
		// Пустые массивы возвращаем как null
		if (Array.isArray(value) && value.length === 0) {
			return null;
		}
		
		try {
			return JSON.stringify(value);
		} catch (error) {
			console.error('[BaseRepository] safeJsonStringify failed:', error.message);
			return null;
		}
	}
}
