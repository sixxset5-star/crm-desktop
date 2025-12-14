import { ipcMain } from 'electron';
import { getDatabase } from '../services/db-service.js';
import { autoBackup } from '../services/backup-service.js';
import { enqueueWrite } from '../services/db-queue.js';
import { createLogger } from '../services/logger.js';

const log = createLogger('ExtraWorkIPC');

export function initExtraWorkIpc() {
	ipcMain.handle('extra-work:load', async () => {
		try {
			const db = getDatabase();
			const rows = db.prepare('SELECT * FROM extra_work ORDER BY created_at DESC').all();
			const extraWorks = rows.map(row => {
				let workDates = [];
				let payments = [];
				
				try {
					workDates = JSON.parse(row.work_dates || '[]');
				} catch (e) {
					console.error('Failed to parse work_dates:', e);
				}
				
				try {
					payments = JSON.parse(row.payments || '[]');
				} catch (e) {
					console.error('Failed to parse payments:', e);
				}
				
				const weekendRate = row.weekend_rate != null ? Number(row.weekend_rate) : undefined;
				log.debug('Loading work from DB', { 
					workId: row.id, 
					weekend_rate_db: row.weekend_rate, 
					weekend_rate_type: typeof row.weekend_rate,
					weekendRate: weekendRate,
					weekendRate_type: typeof weekendRate
				});
				
				return {
					id: row.id,
					workDates: workDates,
					dailyRate: row.daily_rate,
					// ВАЖНО: weekend_rate может быть 0 или null, поэтому проверяем != null, а не truthy
					// Если weekend_rate === null в БД, преобразуем в undefined для TypeScript
					weekendRate: weekendRate,
					totalAmount: row.total_amount,
					payments: payments,
					notes: row.notes || undefined,
					createdAt: row.created_at,
					updatedAt: row.updated_at
				};
			});
			return { ok: true, data: extraWorks };
		} catch (error) {
			console.error('Error loading extra work:', error);
			return { 
				ok: false, 
				code: 'DB_ERROR', 
				message: error instanceof Error ? error.message : String(error) 
			};
		}
	});

	ipcMain.handle('extra-work:save', async (_e, extraWorks) => {
		return enqueueWrite(async () => {
			try {
				const db = getDatabase();
				const stmt = db.prepare(`
					INSERT OR REPLACE INTO extra_work (id, work_dates, daily_rate, weekend_rate, total_amount, payments, notes, created_at, updated_at)
					VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
				`);
				
				const insertMany = db.transaction((extraWorksList) => {
					const existingIds = new Set(extraWorksList.map(w => w.id));
					const allRows = db.prepare('SELECT id FROM extra_work').all();
					for (const row of allRows) {
						if (!existingIds.has(row.id)) {
							db.prepare('DELETE FROM extra_work WHERE id = ?').run(row.id);
						}
					}
					
					for (const work of extraWorksList) {
						// ВАЖНО: weekendRate может быть 0, поэтому проверяем != null (проверяет и null и undefined)
						// Если weekendRate === undefined или null, сохраняем null в БД
						// Если weekendRate === 0 или другое число, сохраняем число
						const weekendRate = work.weekendRate != null ? Number(work.weekendRate) : null;
						log.debug('Saving work to DB', { 
							workId: work.id, 
							weekendRate_js: work.weekendRate,
							weekendRate_js_type: typeof work.weekendRate,
							weekendRate_db: weekendRate,
							weekendRate_db_type: typeof weekendRate,
							hasWeekendRate: 'weekendRate' in work
						});
						
						stmt.run(
							work.id,
							JSON.stringify(work.workDates || []),
							work.dailyRate || 0,
							weekendRate,
							work.totalAmount || 0,
							JSON.stringify(work.payments || []),
							work.notes || null,
							work.createdAt || null,
							work.updatedAt || null
						);
					}
				});
				
				insertMany(extraWorks);
				
				// Создаем бекап после успешного сохранения
				autoBackup().catch(err => {
					console.error('[ExtraWork] Backup failed:', err);
				});
				
				return { ok: true };
			} catch (error) {
				console.error('Error saving extra work:', error);
				return { 
					ok: false, 
					code: 'DB_ERROR', 
					message: error instanceof Error ? error.message : String(error) 
				};
			}
		});
	});
}




