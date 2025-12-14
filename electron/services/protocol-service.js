/**
 * Сервис для регистрации кастомных протоколов
 * Вынесен из main.js
 */
import { protocol, app } from 'electron';
import path from 'node:path';
import fsSync from 'node:fs';

export class ProtocolService {
	/**
	 * Зарегистрировать протокол crm:// для обслуживания файлов
	 */
	registerCrmProtocol() {
		protocol.registerFileProtocol('crm', (request, callback) => {
			try {
				let url = request.url.replace('crm://', '').replace(/\/+$/, '');
				let decodedUrl;
				try {
					decodedUrl = decodeURIComponent(url);
				} catch (e) {
					decodedUrl = url;
				}
				
				if (decodedUrl.startsWith('task-files/')) {
					const pathParts = decodedUrl.replace('task-files/', '').split('/');
					const taskId = pathParts[0];
					const fileName = pathParts.slice(1).join('/');
					let decodedFileName;
					try {
						decodedFileName = decodeURIComponent(fileName);
					} catch (e) {
						decodedFileName = fileName;
					}
					const filePath = path.join(app.getPath('userData'), 'task-files', taskId, decodedFileName);
					if (!fsSync.existsSync(filePath)) {
						const filePathWithoutDecode = path.join(app.getPath('userData'), 'task-files', taskId, fileName);
						if (fsSync.existsSync(filePathWithoutDecode)) {
							callback({ path: filePathWithoutDecode });
							return;
						}
						callback({ error: -2 });
						return;
					}
					callback({ path: filePath });
				} else {
					let fileName;
					try {
						fileName = decodeURIComponent(decodedUrl);
					} catch (e) {
						fileName = decodedUrl;
					}
					const filePath = path.join(app.getPath('userData'), 'avatars', fileName);
					if (!fsSync.existsSync(filePath)) {
						const filePathEncoded = path.join(app.getPath('userData'), 'avatars', decodedUrl);
						if (fsSync.existsSync(filePathEncoded)) {
							callback({ path: filePathEncoded });
							return;
						}
						callback({ error: -2 });
						return;
					}
					callback({ path: filePath });
				}
			} catch (error) {
				console.error('Error in crm protocol handler:', error);
				callback({ error: -2 });
			}
		});
		
		console.log('crm:// protocol registered successfully');
	}
}





