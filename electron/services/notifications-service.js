import { Notification } from 'electron';

export async function showNotification(title, body) {
	try {
		// Проверяем, поддерживает ли система уведомления
		if (!Notification.isSupported()) {
			console.log('Notifications are not supported');
			return;
		}
		
		// Проверяем разрешение на уведомления (macOS)
		if (process.platform === 'darwin') {
			const permission = Notification.permission;
			if (permission === 'denied') {
				console.log('Notification permission denied');
				return;
			}
			if (permission === 'default') {
				// Запрашиваем разрешение
				await Notification.requestPermission();
			}
		}
		
		const notification = new Notification({
			title: title,
			body: body,
			silent: false,
		});
		
		notification.show();
	} catch (error) {
		console.error('Error showing notification:', error);
	}
}











