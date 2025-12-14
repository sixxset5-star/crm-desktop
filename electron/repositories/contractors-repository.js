/**
 * Репозиторий для работы с подрядчиками
 * 
 * ВАЖНО: Удаление подрядчиков запрещено. Используйте deactivate() для деактивации.
 */
import { BaseRepository } from './base-repository.js';

export class ContractorsRepository extends BaseRepository {
	/**
	 * Удалить подрядчика (только если у него нет задач)
	 * Если есть задачи - выбрасывает ошибку
	 * @param {string} id - ID подрядчика
	 * @throws {Error} Если у подрядчика есть задачи
	 */
	delete(id) {
		const existing = this.findById(id);
		if (!existing) {
			throw new Error(`Contractor with id ${id} not found`);
		}

		// Проверяем, есть ли задачи у этого подрядчика
		const tasks = this.findTasksByContractor(id);
		if (tasks && tasks.length > 0) {
			const error = new Error(`Нельзя удалить подрядчика "${existing.name}": у него есть ${tasks.length} ${tasks.length === 1 ? 'задача' : tasks.length < 5 ? 'задачи' : 'задач'}. Используйте deactivate() для деактивации.`);
			console.error('[ContractorsRepository] Attempted to delete contractor with tasks:', id, error);
			throw error;
		}

		// Если задач нет - удаляем физически
		const db = this.getDb();
		const stmt = db.prepare('DELETE FROM contractors WHERE id = ?');
		stmt.run(id);
		
		console.log('[ContractorsRepository] Contractor deleted (no tasks):', id);
		return true;
	}

	/**
	 * Удаление подрядчиков запрещено, если есть задачи.
	 * Используйте deactivate() для деактивации подрядчика.
	 */
	remove(id) {
		return this.delete(id);
	}
	/**
	 * Загрузить всех подрядчиков
	 */
	findAll() {
		const db = this.getDb();
		const rows = db.prepare('SELECT * FROM contractors ORDER BY name').all();
		
		return rows.map(row => ({
			id: row.id,
			name: row.name,
			contact: row.contact || undefined,
			contacts: this.safeJsonParse(row.contacts, [], 'array'),
			avatar: row.avatar || undefined,
			comment: row.comment || undefined,
			specialization: row.specialization || undefined, // Преобразуем null в undefined
			rate: row.rate !== null && row.rate !== undefined ? row.rate : undefined,
			rating: row.rating ?? undefined,
			isActive: row.is_active === 1,
			createdAt: row.created_at || undefined,
			updatedAt: row.updated_at || undefined,
		}));
	}

	/**
	 * Найти подрядчика по ID
	 */
	findById(id) {
		const db = this.getDb();
		const row = db.prepare('SELECT * FROM contractors WHERE id = ?').get(id);
		
		if (!row) return null;

		return {
			id: row.id,
			name: row.name,
			contact: row.contact || undefined,
			contacts: this.safeJsonParse(row.contacts, [], 'array'),
			avatar: row.avatar || undefined,
			comment: row.comment || undefined,
			specialization: row.specialization || undefined, // Преобразуем null в undefined
			rate: row.rate !== null && row.rate !== undefined ? row.rate : undefined,
			rating: row.rating ?? undefined,
			isActive: row.is_active === 1,
			createdAt: row.created_at || undefined,
			updatedAt: row.updated_at || undefined,
		};
	}

	/**
	 * Найти активных подрядчиков
	 */
	findActive() {
		const db = this.getDb();
		const rows = db.prepare('SELECT * FROM contractors WHERE is_active = 1 ORDER BY name').all();
		
		return rows.map(row => ({
			id: row.id,
			name: row.name,
			contact: row.contact || undefined,
			contacts: this.safeJsonParse(row.contacts, [], 'array'),
			avatar: row.avatar || undefined,
			comment: row.comment || undefined,
			specialization: row.specialization || undefined, // Преобразуем null в undefined
			rate: row.rate !== null && row.rate !== undefined ? row.rate : undefined,
			rating: row.rating ?? undefined,
			isActive: true,
			createdAt: row.created_at || undefined,
			updatedAt: row.updated_at || undefined,
		}));
	}

	/**
	 * Сохранить всех подрядчиков (полная синхронизация)
	 * ВАЖНО: для подрядчиков не удаляем записи физически - только деактивируем
	 */
	saveAll(contractors) {
		if (!Array.isArray(contractors)) {
			console.error('[ContractorsRepository] saveAll: contractors is not an array', { type: typeof contractors, contractors });
			throw new Error('ContractorsRepository.saveAll expects an array of contractors');
		}
		
		console.log('[ContractorsRepository] saveAll called with', {
			count: contractors.length,
			contractors: contractors.map(c => ({
				id: c?.id,
				name: c?.name,
				isActive: c?.isActive,
				hasContacts: !!c?.contacts && Array.isArray(c.contacts) && c.contacts.length > 0,
				hasContact: !!c?.contact,
				createdAt: c?.createdAt,
				updatedAt: c?.updatedAt
			}))
		});
		
		const db = this.getDb();
		
		// Сохраняем contractors в константу для гарантированного доступа в транзакции
		const contractorsToSave = contractors;
		
		const stmt = db.prepare(`
			INSERT OR REPLACE INTO contractors (id, name, contact, contacts, avatar, comment, specialization, rate, rating, is_active, created_at, updated_at)
			VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
		`);

		// Используем транзакцию; передаем contractorsToSave явно через замыкание
		const dataToSave = contractorsToSave;
		
		const result = this.transaction(() => {
			// Дополнительная проверка внутри транзакции для безопасности
			if (!Array.isArray(dataToSave)) {
				console.error('[ContractorsRepository] saveAll: dataToSave is invalid inside transaction', { 
					isArray: Array.isArray(dataToSave), 
					type: typeof dataToSave,
					value: dataToSave
				});
				throw new Error('dataToSave is not a valid array inside transaction');
			}

			let savedCount = 0;
			let skippedCount = 0;

			// Вставляем/обновляем подрядчиков
			// ВАЖНО: не удаляем подрядчиков физически - только обновляем is_active
			for (const contractor of dataToSave) {
				if (!contractor || !contractor.id) {
					console.error('[ContractorsRepository] saveAll: Skipping invalid contractor', { contractor });
					skippedCount++;
					continue;
				}
				
				console.log('[ContractorsRepository] saveAll: Saving contractor', {
					id: contractor.id,
					name: contractor.name,
					isActive: contractor.isActive,
					createdAt: contractor.createdAt,
					updatedAt: contractor.updatedAt
				});
				
				// Явно обрабатываем isActive: если undefined/null, считаем активным (1)
				const isActive = contractor.isActive !== undefined && contractor.isActive !== null 
					? (contractor.isActive === true ? 1 : 0)
					: 1; // По умолчанию активен
				
				stmt.run(
					contractor.id,
					contractor.name || '',
					contractor.contact || null,
					this.safeJsonStringify(contractor.contacts || []),
					contractor.avatar || null,
					contractor.comment || null,
					contractor.specialization || null,
					contractor.rate || null,
					contractor.rating ?? null,
					isActive,
					contractor.createdAt || null,
					contractor.updatedAt || null
				);
				savedCount++;
			}
			
			console.log('[ContractorsRepository] saveAll: Transaction completed', {
				total: dataToSave.length,
				saved: savedCount,
				skipped: skippedCount
			});
			
			return { saved: savedCount, skipped: skippedCount };
		});
		
		console.log('[ContractorsRepository] saveAll: Finished', result);
		return result;
	}

	/**
	 * Создать нового подрядчика
	 */
	create(contractor) {
		const db = this.getDb();
		const stmt = db.prepare(`
			INSERT INTO contractors (id, name, contact, contacts, avatar, comment, specialization, rate, rating, is_active, created_at, updated_at)
			VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
		`);

		stmt.run(
			contractor.id,
			contractor.name || '',
			contractor.contact || null,
			this.safeJsonStringify(contractor.contacts || []),
			contractor.avatar || null,
			contractor.comment || null,
			contractor.specialization || null,
			contractor.rate || null,
			contractor.rating ?? null,
			contractor.isActive === false ? 0 : 1,
			contractor.createdAt || null,
			contractor.updatedAt || null
		);

		return this.findById(contractor.id);
	}

	/**
	 * Обновить подрядчика
	 */
	update(id, updates) {
		const existing = this.findById(id);
		if (!existing) {
			throw new Error(`Contractor with id ${id} not found`);
		}

		const updated = { ...existing, ...updates };
		const db = this.getDb();
		const stmt = db.prepare(`
			UPDATE contractors SET
				name = ?, contact = ?, contacts = ?, avatar = ?, comment = ?, specialization = ?, rate = ?, rating = ?, is_active = ?, updated_at = ?
			WHERE id = ?
		`);

		stmt.run(
			updated.name || '',
			updated.contact || null,
			this.safeJsonStringify(updated.contacts || []),
			updated.avatar || null,
			updated.comment || null,
			updated.specialization || null,
			updated.rate || null,
			updated.rating ?? null,
			updated.isActive === false ? 0 : 1,
			updated.updatedAt || new Date().toISOString(),
			id
		);

		return this.findById(id);
	}

	/**
	 * Деактивировать подрядчика (установить is_active = 0)
	 * ВАЖНО: физически не удаляем запись
	 */
	deactivate(id) {
		const existing = this.findById(id);
		if (!existing) {
			throw new Error(`Contractor with id ${id} not found`);
		}

		const db = this.getDb();
		const stmt = db.prepare('UPDATE contractors SET is_active = 0, updated_at = ? WHERE id = ?');
		stmt.run(new Date().toISOString(), id);

		return this.findById(id);
	}

	/**
	 * Получить все задачи с указанным подрядчиком
	 */
	findTasksByContractor(contractorId) {
		const db = this.getDb();
		const rows = db.prepare('SELECT * FROM tasks WHERE contractor_id = ?').all(contractorId);
		return rows;
	}
}
