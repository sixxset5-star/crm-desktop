import { ipcMain } from 'electron';
import { getDatabase } from '../services/db-service.js';
import { autoBackup } from '../services/backup-service.js';
import { enqueueWrite } from '../services/db-queue.js';

export function initGoalsIpc() {
	ipcMain.handle('goals:load', async () => {
		try {
			const db = getDatabase();
			const goals = db.prepare('SELECT * FROM goals').all().map(row => ({
				id: row.id,
				title: row.title,
				description: row.description,
				deadline: row.deadline,
				progress: row.progress,
				completed: row.completed === 1
			}));
			
			const monthlyGoals = db.prepare('SELECT * FROM monthly_financial_goals').all().map(row => ({
				monthKey: row.month_key,
				expenses: JSON.parse(row.expenses || '[]'),
				completed: row.completed === 1,
				manualProfit: row.manual_profit
			}));
			
			const credits = db.prepare('SELECT * FROM credits').all().map(row => ({
				id: row.id,
				name: row.name,
				amount: row.amount,
				monthlyPayment: row.monthly_payment,
				interestRate: row.interest_rate,
				notes: row.notes,
				paidThisMonth: row.paid_this_month === 1,
				lastPaidMonth: row.last_paid_month,
				paymentDate: row.payment_date || undefined
			}));
			
			return { ok: true, data: { goals, monthlyFinancialGoals: monthlyGoals, credits } };
		} catch (error) {
			console.error('Error loading goals:', error);
			return { 
				ok: false, 
				code: 'DB_ERROR', 
				message: error instanceof Error ? error.message : String(error) 
			};
		}
	});

	ipcMain.handle('goals:save', async (_e, data) => {
		return enqueueWrite(async () => {
			try {
			const db = getDatabase();
			const goals = data.goals || [];
			const monthlyGoals = data.monthlyFinancialGoals || [];
			const credits = data.credits || [];
			
			// Сохранение целей
			const goalStmt = db.prepare(`
				INSERT OR REPLACE INTO goals (id, title, description, deadline, progress, completed)
				VALUES (?, ?, ?, ?, ?, ?)
			`);
			
			const goalInsert = db.transaction((goalsList) => {
				const existingIds = new Set(goalsList.map(g => g.id));
				const allRows = db.prepare('SELECT id FROM goals').all();
				for (const row of allRows) {
					if (!existingIds.has(row.id)) {
						db.prepare('DELETE FROM goals WHERE id = ?').run(row.id);
					}
				}
				
				for (const goal of goalsList) {
					goalStmt.run(
						goal.id,
						goal.title || '',
						goal.description || null,
						goal.deadline || null,
						goal.progress || 0,
						goal.completed ? 1 : 0
					);
				}
			});
			
			goalInsert(goals);
			
			// Сохранение месячных финансовых целей
			const monthlyStmt = db.prepare(`
				INSERT OR REPLACE INTO monthly_financial_goals (month_key, expenses, completed, manual_profit)
				VALUES (?, ?, ?, ?)
			`);
			
			const monthlyInsert = db.transaction((monthlyList) => {
				const existingKeys = new Set(monthlyList.map(m => m.monthKey));
				const allRows = db.prepare('SELECT month_key FROM monthly_financial_goals').all();
				for (const row of allRows) {
					if (!existingKeys.has(row.month_key)) {
						db.prepare('DELETE FROM monthly_financial_goals WHERE month_key = ?').run(row.month_key);
					}
				}
				
				for (const monthly of monthlyList) {
					monthlyStmt.run(
						monthly.monthKey,
						JSON.stringify(monthly.expenses || []),
						monthly.completed ? 1 : 0,
						monthly.manualProfit || null
					);
				}
			});
			
			monthlyInsert(monthlyGoals);
			
			// Сохранение кредитов
			const creditStmt = db.prepare(`
				INSERT OR REPLACE INTO credits (id, name, amount, monthly_payment, interest_rate, notes, paid_this_month, last_paid_month, payment_date)
				VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
			`);
			
			const creditInsert = db.transaction((creditsList) => {
				const existingIds = new Set(creditsList.map(c => c.id));
				const allRows = db.prepare('SELECT id FROM credits').all();
				for (const row of allRows) {
					if (!existingIds.has(row.id)) {
						db.prepare('DELETE FROM credits WHERE id = ?').run(row.id);
					}
				}
				
				for (const credit of creditsList) {
					creditStmt.run(
						credit.id,
						credit.name || '',
						credit.amount || null,
						credit.monthlyPayment || null,
						credit.interestRate || null,
						credit.notes || null,
						credit.paidThisMonth ? 1 : 0,
						credit.lastPaidMonth || null,
						credit.paymentDate || null
					);
				}
			});
			
			creditInsert(credits);
			
			// Создаем бекап после успешного сохранения
			autoBackup().catch(err => {
				console.error('[Goals] Backup failed:', err);
			});
			
			return { ok: true };
		} catch (error) {
			console.error('Error saving goals:', error);
			return { 
				ok: false, 
				code: 'DB_ERROR', 
				message: error instanceof Error ? error.message : String(error) 
			};
		}
		});
	});
}


