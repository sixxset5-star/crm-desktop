/**
 * Репозиторий для работы с клиентами
 */
import { BaseRepository } from './base-repository.js';

export class CustomersRepository extends BaseRepository {
	/**
	 * Загрузить всех клиентов
	 */
	findAll() {
		const db = this.getDb();
		const rows = db.prepare('SELECT * FROM customers ORDER BY name').all();
		
		return rows.map(row => ({
			id: row.id,
			name: row.name,
			contact: row.contact,
			contacts: this.safeJsonParse(row.contacts, [], 'array'),
			avatar: row.avatar,
			comment: row.comment,
			accesses: this.safeJsonParse(row.accesses, [], 'array')
		}));
	}

	/**
	 * Найти клиента по ID
	 */
	findById(id) {
		const db = this.getDb();
		const row = db.prepare('SELECT * FROM customers WHERE id = ?').get(id);
		
		if (!row) return null;

		return {
			id: row.id,
			name: row.name,
			contact: row.contact,
			contacts: this.safeJsonParse(row.contacts, [], 'array'),
			avatar: row.avatar,
			comment: row.comment,
			accesses: this.safeJsonParse(row.accesses, [], 'array')
		};
	}

	/**
	 * Сохранить всех клиентов (полная синхронизация)
	 */
	saveAll(customers) {
		if (!Array.isArray(customers)) {
			console.error('[CustomersRepository] saveAll: customers is not an array', { type: typeof customers, customers });
			throw new Error('CustomersRepository.saveAll expects an array of customers');
		}
		
		// Дополнительная проверка: убеждаемся, что массив не пустой и содержит валидные объекты
		if (customers.length === 0) {
			// Пустой массив - это валидный случай, просто удаляем всех существующих клиентов
			const db = this.getDb();
			return this.transaction(() => {
				db.prepare('DELETE FROM customers').run();
			})();
		}
		
		const db = this.getDb();
		
		// Сохраняем customers в константу для гарантированного доступа в транзакции
		const customersToSave = customers;
		
		const stmt = db.prepare(`
			INSERT OR REPLACE INTO customers (id, name, contact, contacts, avatar, comment, accesses)
			VALUES (?, ?, ?, ?, ?, ?, ?)
		`);

		// Используем транзакцию; передаем customersToSave явно через замыкание
		// Сохраняем ссылку на customersToSave в локальной переменной для гарантированного доступа
		const dataToSave = customersToSave;
		
		return this.transaction(() => {
			// Дополнительная проверка внутри транзакции для безопасности
			if (!Array.isArray(dataToSave)) {
				console.error('[CustomersRepository] saveAll: dataToSave is invalid inside transaction', { 
					isArray: Array.isArray(dataToSave), 
					type: typeof dataToSave,
					value: dataToSave
				});
				throw new Error('dataToSave is not a valid array inside transaction');
			}
			
			// Удаляем клиентов, которых нет в новом списке
			const existingIds = new Set(dataToSave.map(c => {
				if (!c || !c.id) {
					console.error('[CustomersRepository] saveAll: Invalid customer in dataToSave', { customer: c });
					return null;
				}
				return c.id;
			}).filter(id => id != null));
			const allRows = db.prepare('SELECT id FROM customers').all();
			for (const row of allRows) {
				if (!existingIds.has(row.id)) {
					db.prepare('DELETE FROM customers WHERE id = ?').run(row.id);
				}
			}

			// Вставляем/обновляем клиентов
			for (const customer of dataToSave) {
				if (!customer || !customer.id) {
					console.error('[CustomersRepository] saveAll: Skipping invalid customer', { customer });
					continue;
				}
				stmt.run(
					customer.id,
					customer.name || '',
					customer.contact || null,
					this.safeJsonStringify(customer.contacts || []),
					customer.avatar || null,
					customer.comment || null,
					this.safeJsonStringify(customer.accesses || [])
				);
			}
		});
	}

	/**
	 * Создать нового клиента
	 */
	create(customer) {
		const db = this.getDb();
		const stmt = db.prepare(`
			INSERT INTO customers (id, name, contact, contacts, avatar, comment, accesses)
			VALUES (?, ?, ?, ?, ?, ?, ?)
		`);

		stmt.run(
			customer.id,
			customer.name || '',
			customer.contact || null,
			this.safeJsonStringify(customer.contacts || []),
			customer.avatar || null,
			customer.comment || null,
			this.safeJsonStringify(customer.accesses || [])
		);

		return this.findById(customer.id);
	}

	/**
	 * Обновить клиента
	 */
	update(id, updates) {
		const existing = this.findById(id);
		if (!existing) {
			throw new Error(`Customer with id ${id} not found`);
		}

		const updated = { ...existing, ...updates };
		const db = this.getDb();
		const stmt = db.prepare(`
			UPDATE customers SET
				name = ?, contact = ?, contacts = ?, avatar = ?, comment = ?, accesses = ?
			WHERE id = ?
		`);

		stmt.run(
			updated.name || '',
			updated.contact || null,
			this.safeJsonStringify(updated.contacts || []),
			updated.avatar || null,
			updated.comment || null,
			this.safeJsonStringify(updated.accesses || []),
			id
		);

		return this.findById(id);
	}

	/**
	 * Удалить клиента
	 */
	delete(id) {
		const db = this.getDb();
		const stmt = db.prepare('DELETE FROM customers WHERE id = ?');
		stmt.run(id);
	}
}


