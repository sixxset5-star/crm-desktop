/**
 * Утилиты для работы с путями crm://task-files
 */

/**
 * Парсит путь crm://task-files/{taskId}/{fileName}
 * @returns { taskId, fileName } или null если путь невалидный
 */
export function parseCrmPath(crmPath: string): { taskId: string; fileName: string } | null {
	if (!crmPath.startsWith('crm://task-files/')) {
		return null;
	}

	const match = crmPath.match(/^crm:\/\/task-files\/([^\/]+)\/(.+)$/);
	if (!match) {
		return null;
	}

	return {
		taskId: match[1],
		fileName: decodeURIComponent(match[2]),
	};
}

/**
 * Строит путь crm://task-files/{taskId}/{fileName}
 */
export function buildCrmPath(taskId: string, fileName: string): string {
	const encodedFileName = encodeURIComponent(fileName).replace(/%2F/g, '/');
	return `crm://task-files/${taskId}/${encodedFileName}`;
}

/**
 * Извлекает taskId из пути crm://
 */
export function extractTaskIdFromPath(crmPath: string): string | null {
	const parsed = parseCrmPath(crmPath);
	return parsed?.taskId ?? null;
}






