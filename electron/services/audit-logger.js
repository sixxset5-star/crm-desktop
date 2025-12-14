/**
 * Audit logger для логирования доменных событий
 * Отдельный канал для audit trail
 */
import { createLogger } from './logger.js';
import { app } from 'electron';
import path from 'node:path';
import fs from 'node:fs/promises';
import fsSync from 'node:fs';

const log = createLogger('AuditLogger');

class AuditLogger {
	constructor() {
		this.auditLogFile = null;
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
			const auditDir = path.join(userDataPath, 'logs', 'audit');
			
			// Создаем директорию, если не существует
			if (!fsSync.existsSync(auditDir)) {
				await fs.mkdir(auditDir, { recursive: true });
			}

			// Создаем файл audit лога с датой
			const date = new Date().toISOString().split('T')[0];
			this.auditLogFile = path.join(auditDir, `audit-${date}.log`);

			// Очищаем старые audit логи (старше 30 дней)
			this.cleanOldAuditLogs(auditDir);
			
			this.initialized = true;
		} catch (error) {
			process.stderr.write(`[AuditLogger] Failed to initialize audit log: ${error.message}\n`);
		}
	}

	async cleanOldAuditLogs(auditDir) {
		try {
			const files = await fs.readdir(auditDir);
			const now = Date.now();
			const maxAge = 30 * 24 * 60 * 60 * 1000; // 30 дней

			for (const file of files) {
				if (!file.startsWith('audit-') || !file.endsWith('.log')) continue;
				
				const filePath = path.join(auditDir, file);
				const stats = await fs.stat(filePath);
				
				if (now - stats.mtimeMs > maxAge) {
					await fs.unlink(filePath);
					log.debug('Deleted old audit log file', { file });
				}
			}
		} catch (error) {
			log.error('Failed to clean old audit logs', { error: error.message });
		}
	}

	async writeAuditEvent(event, entityType, entityId, changes = null, userId = 'system') {
		// Ленивая инициализация
		await this.ensureInitialized();
		
		if (!this.auditLogFile) return;

		try {
			const timestamp = new Date().toISOString();
			const auditEntry = {
				timestamp,
				event,
				entityType,
				entityId,
				userId,
				...(changes && { changes }),
			};
			
			const logLine = JSON.stringify(auditEntry) + '\n';
			await fs.appendFile(this.auditLogFile, logLine, 'utf-8');
			
			log.debug('Audit event logged', { event, entityType, entityId });
		} catch (error) {
			process.stderr.write(`[AuditLogger] Failed to write audit log: ${error.message}\n`);
		}
	}

	/**
	 * Логировать создание сущности
	 */
	async logCreated(entityType, entityId, entity = null) {
		await this.writeAuditEvent('created', entityType, entityId, entity ? { new: entity } : null);
	}

	/**
	 * Логировать обновление сущности
	 */
	async logUpdated(entityType, entityId, oldEntity, newEntity) {
		const changes = this.calculateDiff(oldEntity, newEntity);
		await this.writeAuditEvent('updated', entityType, entityId, changes);
	}

	/**
	 * Логировать удаление сущности
	 */
	async logDeleted(entityType, entityId, entity = null) {
		await this.writeAuditEvent('deleted', entityType, entityId, entity ? { deleted: entity } : null);
	}

	/**
	 * Вычислить diff между двумя объектами
	 */
	calculateDiff(oldObj, newObj) {
		const diff = {};
		
		// Сравниваем все ключи из обоих объектов
		const allKeys = new Set([...Object.keys(oldObj || {}), ...Object.keys(newObj || {})]);
		
		for (const key of allKeys) {
			const oldValue = oldObj?.[key];
			const newValue = newObj?.[key];
			
			// Пропускаем технические поля
			if (key === 'updatedAt' || key === 'createdAt') continue;
			
			// Если значения разные
			if (JSON.stringify(oldValue) !== JSON.stringify(newValue)) {
				diff[key] = {
					old: oldValue,
					new: newValue
				};
			}
		}
		
		return diff;
	}
}

// Singleton экземпляр
export const auditLogger = new AuditLogger();

