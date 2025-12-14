import { selectCsvFile, readCsvFile, saveCsvFile } from '@/shared/lib/electron-bridge';
import {
	exportTasksToCsv,
	parseTaskFromCsv,
	exportCustomersToCsv,
	parseCustomerFromCsv,
	exportCreditsToCsv,
	parseCreditFromCsv,
	parseCsvLine,
} from '@/shared/lib/csv-utils';
import type { Task } from '@/store/board';
import type { Customer } from '@/store/customers';
import type { Credit, Goal } from '@/store/goals';
import type { Settings } from '@/store/settings';

export async function exportTasksToFile(tasks: Task[]): Promise<void> {
	if (!window.crm) {
		const { useUIStore } = await import('@/store/ui');
		useUIStore.getState().showError('Ошибка: window.crm не доступен. Убедитесь, что приложение запущено в Electron.');
		return;
	}
	
	if (tasks.length === 0) {
		const { useUIStore } = await import('@/store/ui');
		useUIStore.getState().showError('Нет задач для экспорта');
		return;
	}
	
	const csv = exportTasksToCsv(tasks);
	const fileName = `crm-tasks-${new Date().toISOString().slice(0, 10)}.csv`;
	const saved = await saveCsvFile(csv, fileName);
	
	const { useUIStore } = await import('@/store/ui');
	if (saved) {
		useUIStore.getState().showSuccess(`Задачи экспортированы в: ${saved}`);
	} else {
		useUIStore.getState().showError('Экспорт отменен');
	}
}

export async function exportCustomersToFile(customers: Customer[]): Promise<void> {
	if (!window.crm) {
		const { useUIStore } = await import('@/store/ui');
		useUIStore.getState().showError('Ошибка: window.crm не доступен. Убедитесь, что приложение запущено в Electron.');
		return;
	}
	
	if (customers.length === 0) {
		const { useUIStore } = await import('@/store/ui');
		useUIStore.getState().showError('Нет заказчиков для экспорта');
		return;
	}
	
	const csv = exportCustomersToCsv(customers);
	const fileName = `crm-customers-${new Date().toISOString().slice(0, 10)}.csv`;
	const saved = await saveCsvFile(csv, fileName);
	
	const { useUIStore } = await import('@/store/ui');
	if (saved) {
		useUIStore.getState().showSuccess(`Заказчики экспортированы в: ${saved}`);
	} else {
		useUIStore.getState().showError('Экспорт отменен');
	}
}

export async function exportCreditsToFile(credits: Credit[]): Promise<void> {
	if (!window.crm) {
		const { useUIStore } = await import('@/store/ui');
		useUIStore.getState().showError('Ошибка: window.crm не доступен. Убедитесь, что приложение запущено в Electron.');
		return;
	}
	
	if (credits.length === 0) {
		const { useUIStore } = await import('@/store/ui');
		useUIStore.getState().showError('Нет кредитов для экспорта');
		return;
	}
	
	const csv = exportCreditsToCsv(credits);
	const fileName = `crm-credits-${new Date().toISOString().slice(0, 10)}.csv`;
	const saved = await saveCsvFile(csv, fileName);
	
	const { useUIStore } = await import('@/store/ui');
	if (saved) {
		useUIStore.getState().showSuccess(`Кредиты экспортированы в: ${saved}`);
	} else {
		useUIStore.getState().showError('Экспорт отменен');
	}
}

export async function importTasksFromFile(
	tasks: Task[],
	addTask: (task: Partial<Task>) => void,
	updateTask: (id: string, updates: Partial<Task>) => void
): Promise<void> {
	if (!window.crm) {
		const { useUIStore } = await import('@/store/ui');
		useUIStore.getState().showError('Ошибка: window.crm не доступен. Убедитесь, что приложение запущено в Electron.');
		return;
	}
	
	const filePath = await selectCsvFile();
	if (!filePath) return;
	
	const content = await readCsvFile(filePath);
	if (!content) {
		const { useUIStore } = await import('@/store/ui');
		const { UI_TEXTS } = await import('@/shared/constants/ui-texts');
		await useUIStore.getState().showAlert({
			title: UI_TEXTS.ERROR,
			message: UI_TEXTS.FILE_READ_ERROR,
		});
		return;
	}
	
	const lines = content.split('\n').filter(line => line.trim());
	if (lines.length < 2) {
		const { useUIStore } = await import('@/store/ui');
		const { UI_TEXTS } = await import('@/shared/constants/ui-texts');
		await useUIStore.getState().showAlert({
			title: UI_TEXTS.ERROR,
			message: UI_TEXTS.FILE_FORMAT_ERROR,
		});
		return;
	}
	
	const headers = parseCsvLine(lines[0]);
	const dataLines = lines.slice(1);
	
	let updated = 0;
	let added = 0;
	
	for (const line of dataLines) {
		if (!line.trim()) continue;
		
		const columns = parseCsvLine(line);
		const result = parseTaskFromCsv(headers, columns, tasks);
		
		if (!result) continue;
		
		const { task, isUpdate } = result;
		
		if (isUpdate && task.id) {
			const updates: Partial<Task> = { ...task };
			delete updates.id;
			updateTask(task.id, updates);
			updated++;
		} else {
			// parseTaskFromCsv гарантирует наличие title (возвращает null если title отсутствует)
			if (!task.title) continue;
			const newTask = { ...task };
			delete newTask.id;
			// addTask ожидает объект с title: string, что гарантируется parseTaskFromCsv
			addTask(newTask as Partial<Task> & { title: string });
			added++;
		}
	}
	
	const { useUIStore } = await import('@/store/ui');
	useUIStore.getState().showError(`Загружено из CSV:\nОбновлено задач: ${updated}\nДобавлено задач: ${added}`);
}

export async function importCustomersFromFile(
	customers: Customer[],
	addCustomer: (name: string, contact?: string, avatar?: string) => Customer,
	updateCustomer: (id: string, updates: Partial<Customer>) => void
): Promise<void> {
	if (!window.crm) {
		const { useUIStore } = await import('@/store/ui');
		useUIStore.getState().showError('Ошибка: window.crm не доступен. Убедитесь, что приложение запущено в Electron.');
		return;
	}
	
	const filePath = await selectCsvFile();
	if (!filePath) return;
	
	const content = await readCsvFile(filePath);
	if (!content) {
		const { useUIStore } = await import('@/store/ui');
		const { UI_TEXTS } = await import('@/shared/constants/ui-texts');
		await useUIStore.getState().showAlert({
			title: UI_TEXTS.ERROR,
			message: UI_TEXTS.FILE_READ_ERROR,
		});
		return;
	}
	
	const lines = content.split('\n').filter(line => line.trim());
	if (lines.length < 2) {
		const { useUIStore } = await import('@/store/ui');
		const { UI_TEXTS } = await import('@/shared/constants/ui-texts');
		await useUIStore.getState().showAlert({
			title: UI_TEXTS.ERROR,
			message: UI_TEXTS.FILE_FORMAT_ERROR,
		});
		return;
	}
	
	const headers = parseCsvLine(lines[0]);
	const dataLines = lines.slice(1);
	
	let updated = 0;
	let added = 0;
	
	for (const line of dataLines) {
		if (!line.trim()) continue;
		
		const columns = parseCsvLine(line);
		const result = parseCustomerFromCsv(headers, columns, customers);
		
		if (!result) continue;
		
		const { customer, isUpdate } = result;
		
		if (isUpdate && customer.id) {
			const updates: Partial<Customer> = { ...customer };
			delete updates.id;
			updateCustomer(customer.id, updates);
			updated++;
		} else {
			const newCustomer = { ...customer };
			delete newCustomer.id;
			const addedCustomer = addCustomer(newCustomer.name || '', newCustomer.contact, newCustomer.avatar);
			if (newCustomer.contacts && newCustomer.contacts.length > 0) {
				updateCustomer(addedCustomer.id, { contacts: newCustomer.contacts });
			}
			added++;
		}
	}
	
	const { useUIStore } = await import('@/store/ui');
	useUIStore.getState().showError(`Загружено из CSV:\nОбновлено заказчиков: ${updated}\nДобавлено заказчиков: ${added}`);
}

export async function importCreditsFromFile(
	credits: Credit[],
	addCredit: (name: string, amount: number, monthlyPayment: number, interestRate: number, notes?: string) => void,
	updateCredit: (id: string, updates: Partial<Credit>) => void
): Promise<void> {
	if (!window.crm) {
		const { useUIStore } = await import('@/store/ui');
		useUIStore.getState().showError('Ошибка: window.crm не доступен. Убедитесь, что приложение запущено в Electron.');
		return;
	}
	
	const filePath = await selectCsvFile();
	if (!filePath) return;
	
	const content = await readCsvFile(filePath);
	if (!content) {
		const { useUIStore } = await import('@/store/ui');
		const { UI_TEXTS } = await import('@/shared/constants/ui-texts');
		await useUIStore.getState().showAlert({
			title: UI_TEXTS.ERROR,
			message: UI_TEXTS.FILE_READ_ERROR,
		});
		return;
	}
	
	const lines = content.split('\n').filter(line => line.trim());
	if (lines.length < 2) {
		const { useUIStore } = await import('@/store/ui');
		const { UI_TEXTS } = await import('@/shared/constants/ui-texts');
		await useUIStore.getState().showAlert({
			title: UI_TEXTS.ERROR,
			message: UI_TEXTS.FILE_FORMAT_ERROR,
		});
		return;
	}
	
	const headers = parseCsvLine(lines[0]);
	const dataLines = lines.slice(1);
	
	let updated = 0;
	let added = 0;
	
	for (const line of dataLines) {
		if (!line.trim()) continue;
		
		const columns = parseCsvLine(line);
		const result = parseCreditFromCsv(headers, columns, credits);
		
		if (!result) continue;
		
		const { credit, isUpdate } = result;
		
		if (isUpdate && credit.id) {
			const updates: Partial<Credit> = { ...credit };
			delete updates.id;
			updateCredit(credit.id, updates);
			updated++;
		} else {
			const newCredit = { ...credit };
			delete newCredit.id;
			addCredit(
				newCredit.name || '',
				newCredit.amount,
				newCredit.monthlyPayment,
				newCredit.interestRate,
				newCredit.notes
			);
			added++;
		}
	}
	
	const { useUIStore } = await import('@/store/ui');
	useUIStore.getState().showError(`Загружено из CSV:\nОбновлено кредитов: ${updated}\nДобавлено кредитов: ${added}`);
}

export function exportToJSON(data: { tasks: Task[]; customers: Customer[]; goals: Goal[]; settings: Settings }): void {
	const jsonData = { ...data, exportedAt: new Date().toISOString() };
	const blob = new Blob([JSON.stringify(jsonData, null, 2)], { type: 'application/json' });
	const url = URL.createObjectURL(blob);
	const a = document.createElement('a');
	a.href = url;
	a.download = `crm-backup-${new Date().toISOString().slice(0, 10)}.json`;
	a.click();
	URL.revokeObjectURL(url);
}






