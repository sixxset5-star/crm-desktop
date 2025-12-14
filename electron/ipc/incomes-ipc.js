import { ipcMain } from 'electron';
import { getDatabase } from '../services/db-service.js';
import { autoBackup } from '../services/backup-service.js';
import { enqueueWrite } from '../services/db-queue.js';

export function initIncomesIpc() {
	ipcMain.handle('incomes:load', async () => {
		try {
			const db = getDatabase();
			const rows = db.prepare('SELECT * FROM incomes ORDER BY date DESC').all();
			const incomes = rows.map(row => ({
				id: row.id,
				title: row.title,
				amount: row.amount,
				date: row.date,
				taxRate: row.tax_rate,
				notes: row.notes,
				createdAt: row.created_at,
				updatedAt: row.updated_at
			}));
			return { ok: true, data: incomes };
		} catch (error) {
			console.error('Error loading incomes:', error);
			return { 
				ok: false, 
				code: 'DB_ERROR', 
				message: error instanceof Error ? error.message : String(error) 
			};
		}
	});

	ipcMain.handle('incomes:save', async (_e, incomes) => {
		return enqueueWrite(async () => {
			try {
			const db = getDatabase();
			const stmt = db.prepare(`
				INSERT OR REPLACE INTO incomes (id, title, amount, date, tax_rate, notes, created_at, updated_at)
				VALUES (?, ?, ?, ?, ?, ?, ?, ?)
			`);
			
			const insertMany = db.transaction((incomesList) => {
				const existingIds = new Set(incomesList.map(i => i.id));
				const allRows = db.prepare('SELECT id FROM incomes').all();
				for (const row of allRows) {
					if (!existingIds.has(row.id)) {
						db.prepare('DELETE FROM incomes WHERE id = ?').run(row.id);
					}
				}
				
				for (const income of incomesList) {
					stmt.run(
						income.id,
						income.title || '',
						income.amount || 0,
						income.date || null,
						income.taxRate || null,
						income.notes || null,
						income.createdAt || null,
						income.updatedAt || null
					);
				}
			});
			
			insertMany(incomes);
			
			// Создаем бекап после успешного сохранения
			autoBackup().catch(err => {
				console.error('[Incomes] Backup failed:', err);
			});
			
			return { ok: true };
		} catch (error) {
			console.error('Error saving incomes:', error);
			return { 
				ok: false, 
				code: 'DB_ERROR', 
				message: error instanceof Error ? error.message : String(error) 
			};
		}
		});
	});
}


