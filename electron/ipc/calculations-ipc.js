import { ipcMain } from 'electron';
import { getDatabase } from '../services/db-service.js';
import { autoBackup } from '../services/backup-service.js';
import { enqueueWrite } from '../services/db-queue.js';

export function initCalculationsIpc() {
	ipcMain.handle('calculations:load', async () => {
		try {
			const db = getDatabase();
			const rows = db.prepare('SELECT * FROM calculations ORDER BY created_at DESC').all();
			const calculations = rows.map(row => ({
				id: row.id,
				name: row.name,
				references: JSON.parse(row.references_data || '[]'),
				newProject: JSON.parse(row.new_project || '{}'),
				rounding: row.rounding,
				manualCoefficients: JSON.parse(row.manual_coefficients || '{}'),
				results: JSON.parse(row.results || '{}'),
				createdAt: row.created_at
			}));
			return { ok: true, data: calculations };
		} catch (error) {
			console.error('Error loading calculations:', error);
			return { 
				ok: false, 
				code: 'DB_ERROR', 
				message: error instanceof Error ? error.message : String(error) 
			};
		}
	});

	ipcMain.handle('calculations:save', async (_e, calculations) => {
		return enqueueWrite(async () => {
			try {
			const db = getDatabase();
			const stmt = db.prepare(`
				INSERT OR REPLACE INTO calculations (id, name, references_data, new_project, rounding, manual_coefficients, results, created_at)
				VALUES (?, ?, ?, ?, ?, ?, ?, ?)
			`);
			
			const insertMany = db.transaction((calcs) => {
				const existingIds = new Set(calcs.map(c => c.id));
				const allRows = db.prepare('SELECT id FROM calculations').all();
				for (const row of allRows) {
					if (!existingIds.has(row.id)) {
						db.prepare('DELETE FROM calculations WHERE id = ?').run(row.id);
					}
				}
				
				for (const calc of calcs) {
					stmt.run(
						calc.id,
						calc.name || null,
						JSON.stringify(calc.references || []),
						JSON.stringify(calc.newProject || {}),
						calc.rounding || null,
						JSON.stringify(calc.manualCoefficients || {}),
						JSON.stringify(calc.results || {}),
						calc.createdAt || new Date().toISOString()
					);
				}
			});
			
			insertMany(calculations);
			
			// Создаем бекап после успешного сохранения
			autoBackup().catch(err => {
				console.error('[Calculations] Backup failed:', err);
			});
			
			return { ok: true };
		} catch (error) {
			console.error('Error saving calculations:', error);
			return { 
				ok: false, 
				code: 'DB_ERROR', 
				message: error instanceof Error ? error.message : String(error) 
			};
		}
		});
	});
}


