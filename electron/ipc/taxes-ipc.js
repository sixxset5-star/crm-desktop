import { ipcMain } from 'electron';
import { getDatabase } from '../services/db-service.js';
import { autoBackup } from '../services/backup-service.js';
import { enqueueWrite } from '../services/db-queue.js';

export function initTaxesIpc() {
	ipcMain.handle('taxes:load', async () => {
		try {
			const db = getDatabase();
			const rows = db.prepare('SELECT * FROM tax_paid_flags').all();
			const taxes = rows.map(row => ({
				key: row.key,
				paid: row.paid === 1
			}));
			return { ok: true, data: taxes };
		} catch (error) {
			console.error('Error loading taxes:', error);
			return { 
				ok: false, 
				code: 'DB_ERROR', 
				message: error instanceof Error ? error.message : String(error) 
			};
		}
	});

	ipcMain.handle('taxes:save', async (_e, taxes) => {
		return enqueueWrite(async () => {
			try {
			const db = getDatabase();
			const stmt = db.prepare('INSERT OR REPLACE INTO tax_paid_flags (key, paid) VALUES (?, ?)');
			
			const insertMany = db.transaction((flags) => {
				const existingKeys = new Set(flags.map(f => f.key));
				const allRows = db.prepare('SELECT key FROM tax_paid_flags').all();
				for (const row of allRows) {
					if (!existingKeys.has(row.key)) {
						db.prepare('DELETE FROM tax_paid_flags WHERE key = ?').run(row.key);
					}
				}
				
				for (const flag of flags) {
					if (flag && flag.key) {
						stmt.run(flag.key, flag.paid ? 1 : 0);
					}
				}
			});
			
			insertMany(taxes);
			
			// Создаем бекап после успешного сохранения
			autoBackup().catch(err => {
				console.error('[Taxes] Backup failed:', err);
			});
			
			return { ok: true };
		} catch (error) {
			console.error('Error saving taxes:', error);
			return { 
				ok: false, 
				code: 'DB_ERROR', 
				message: error instanceof Error ? error.message : String(error) 
			};
		}
		});
	});
}


