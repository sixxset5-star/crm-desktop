/**
 * Сервис для синхронизации аватаров из Telegram
 */
import { app } from 'electron';
import path from 'node:path';
import fs from 'node:fs/promises';
import fsSync from 'node:fs';
import https from 'node:https';
import { getDatabase } from '../database.js';

const TELEGRAM_API_BASE = 'https://api.telegram.org/bot';
const AVATAR_CACHE_DAYS = 1; // Кэшируем аватары на 1 день

/**
 * Получить настройки Telegram из БД
 */
function getTelegramSettings() {
	try {
		const db = getDatabase();
		const row = db.prepare('SELECT value FROM settings WHERE key = ?').get('main');
		if (!row) return { token: null, chatId: null };
		
		const settings = JSON.parse(row.value);
		return {
			token: settings?.telegramBotToken || null,
			chatId: settings?.telegramChatId || null
		};
	} catch (error) {
		console.error('[TelegramAvatar] Error getting telegram settings:', error);
		return { token: null, chatId: null };
	}
}

/**
 * Получить токен бота из настроек
 */
function getBotToken() {
	return getTelegramSettings().token;
}

/**
 * Отправить сообщение в Telegram
 */
async function sendTelegramMessage(botToken, chatId, message) {
	if (!botToken || !chatId) {
		if (!chatId) {
			console.log('[TelegramAvatar] Chat ID not configured, skipping message');
		}
		return;
	}
	
	return new Promise((resolve, reject) => {
		const url = `${TELEGRAM_API_BASE}${botToken}/sendMessage`;
		const data = JSON.stringify({
			chat_id: chatId,
			text: message,
			parse_mode: 'HTML'
		});
		
		const options = {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				'Content-Length': Buffer.byteLength(data)
			}
		};
		
		const req = https.request(url, options, (res) => {
			let responseData = '';
			
			res.on('data', (chunk) => {
				responseData += chunk;
			});
			
			res.on('end', () => {
				try {
					const response = JSON.parse(responseData);
					if (response.ok) {
						resolve(response.result);
					} else {
						console.error('[TelegramAvatar] Failed to send message:', response.description);
						// Не пробрасываем ошибку, чтобы не ломать синхронизацию
						resolve(null);
					}
				} catch (error) {
					console.error('[TelegramAvatar] Error parsing response:', error);
					resolve(null);
				}
			});
		});
		
		req.on('error', (error) => {
			console.error('[TelegramAvatar] Error sending message:', error);
			// Не пробрасываем ошибку, чтобы не ломать синхронизацию
			resolve(null);
		});
		
		req.write(data);
		req.end();
	});
}

/**
 * Получить последние обновления от бота (для получения chat_id)
 */
export async function getLastChatId() {
	const { token: botToken } = getTelegramSettings();
	if (!botToken) {
		throw new Error('Telegram bot token not configured');
	}

	return new Promise((resolve, reject) => {
		// Получаем последние обновления (до 10 последних)
		const url = `${TELEGRAM_API_BASE}${botToken}/getUpdates?limit=10`;
		
		https.get(url, (res) => {
			let data = '';
			
			res.on('data', (chunk) => {
				data += chunk;
			});
			
			res.on('end', () => {
				try {
					const response = JSON.parse(data);
					if (response.ok && response.result && response.result.length > 0) {
						// Ищем последнее сообщение с chat_id
						for (let i = response.result.length - 1; i >= 0; i--) {
							const update = response.result[i];
							const chatId = update.message?.chat?.id || 
							              update.callback_query?.message?.chat?.id ||
							              update.edited_message?.chat?.id;
							if (chatId) {
								resolve(String(chatId));
								return;
							}
						}
						reject(new Error('No chat_id found in updates. Send /start to the bot first.'));
					} else {
						reject(new Error('No updates found. Send /start to the bot first.'));
					}
				} catch (error) {
					reject(error);
				}
			});
		}).on('error', (error) => {
			reject(error);
		});
	});
}

/**
 * Нормализовать Telegram username (убрать @, пробелы)
 */
function normalizeUsername(username) {
	if (!username) return null;
	return username.trim().replace(/^@/, '').replace(/\s+/g, '');
}

/**
 * Получить информацию о пользователе через Telegram Bot API
 */
async function getUserInfo(botToken, username) {
	return new Promise((resolve, reject) => {
		const normalizedUsername = normalizeUsername(username);
		if (!normalizedUsername) {
			reject(new Error('Invalid username'));
			return;
		}

		const url = `${TELEGRAM_API_BASE}${botToken}/getChat?chat_id=@${normalizedUsername}`;
		
		https.get(url, (res) => {
			let data = '';
			
			res.on('data', (chunk) => {
				data += chunk;
			});
			
			res.on('end', () => {
				try {
					const response = JSON.parse(data);
					if (response.ok && response.result) {
						resolve(response.result);
					} else {
						reject(new Error(response.description || 'Failed to get user info'));
					}
				} catch (error) {
					reject(error);
				}
			});
		}).on('error', (error) => {
			reject(error);
		});
	});
}

/**
 * Получить фото профиля пользователя
 */
async function getUserProfilePhoto(botToken, userId) {
	return new Promise((resolve, reject) => {
		const url = `${TELEGRAM_API_BASE}${botToken}/getUserProfilePhotos?user_id=${userId}&limit=1`;
		
		https.get(url, (res) => {
			let data = '';
			
			res.on('data', (chunk) => {
				data += chunk;
			});
			
			res.on('end', () => {
				try {
					const response = JSON.parse(data);
					if (response.ok && response.result?.photos?.length > 0) {
						const photo = response.result.photos[0];
						// Берем самое большое фото
						const largestPhoto = photo[photo.length - 1];
						resolve(largestPhoto);
					} else {
						resolve(null); // Нет фото профиля
					}
				} catch (error) {
					reject(error);
				}
			});
		}).on('error', (error) => {
			reject(error);
		});
	});
}

/**
 * Скачать файл по file_id
 */
async function downloadFile(botToken, fileId) {
	return new Promise((resolve, reject) => {
		// Сначала получаем путь к файлу
		const getFileUrl = `${TELEGRAM_API_BASE}${botToken}/getFile?file_id=${fileId}`;
		
		https.get(getFileUrl, (res) => {
			let data = '';
			
			res.on('data', (chunk) => {
				data += chunk;
			});
			
			res.on('end', () => {
				try {
					const response = JSON.parse(data);
					if (response.ok && response.result?.file_path) {
						const filePath = response.result.file_path;
						const downloadUrl = `https://api.telegram.org/file/bot${botToken}/${filePath}`;
						
						// Скачиваем файл
						https.get(downloadUrl, (downloadRes) => {
							const chunks = [];
							
							downloadRes.on('data', (chunk) => {
								chunks.push(chunk);
							});
							
							downloadRes.on('end', () => {
								resolve(Buffer.concat(chunks));
							});
						}).on('error', (error) => {
							reject(error);
						});
					} else {
						reject(new Error(response.description || 'Failed to get file path'));
					}
				} catch (error) {
					reject(error);
				}
			});
		}).on('error', (error) => {
			reject(error);
		});
	});
}

/**
 * Сохранить аватар локально
 */
async function saveAvatarLocally(buffer, username) {
	try {
		const avatarsDir = path.join(app.getPath('userData'), 'avatars');
		await fs.mkdir(avatarsDir, { recursive: true });
		
		// Определяем расширение по содержимому
		const isPng = buffer[0] === 0x89 && buffer[1] === 0x50;
		const isJpeg = buffer[0] === 0xFF && buffer[1] === 0xD8;
		const ext = isPng ? '.png' : isJpeg ? '.jpg' : '.jpg';
		
		// Генерируем уникальное имя файла
		const timestamp = Date.now();
		const safeUsername = normalizeUsername(username).replace(/[^a-zA-Z0-9_-]/g, '_');
		const fileName = `telegram_${safeUsername}_${timestamp}${ext}`;
		const filePath = path.join(avatarsDir, fileName);
		
		await fs.writeFile(filePath, buffer);
		
		// Возвращаем путь в формате crm://
		const encodedFileName = encodeURIComponent(fileName);
		return `crm://${encodedFileName}`;
	} catch (error) {
		console.error('[TelegramAvatar] Error saving avatar:', error);
		throw error;
	}
}

/**
 * Проверить, нужно ли обновлять аватар (кэш истек)
 */
function shouldUpdateAvatar(avatarPath) {
	// Если аватара нет - обновляем
	if (!avatarPath) return true;
	
	// Если аватар не из Telegram, но есть Telegram контакт - обновляем (чтобы подтянуть из Telegram)
	// Если аватар уже из Telegram - проверяем кэш
	if (!avatarPath.includes('telegram_')) {
		// Аватар не из Telegram - обновляем, чтобы подтянуть из Telegram
		return true;
	}
	
	// Аватар из Telegram - проверяем возраст
	try {
		const avatarsDir = path.join(app.getPath('userData'), 'avatars');
		const fileName = decodeURIComponent(avatarPath.replace('crm://', ''));
		const filePath = path.join(avatarsDir, fileName);
		
		if (!fsSync.existsSync(filePath)) return true;
		
		const stats = fsSync.statSync(filePath);
		const ageInMs = Date.now() - stats.mtimeMs;
		const ageInDays = ageInMs / (1000 * 60 * 60 * 24);
		
		return ageInDays >= AVATAR_CACHE_DAYS;
	} catch (error) {
		console.error('[TelegramAvatar] Error checking avatar age:', error);
		return true; // В случае ошибки обновляем
	}
}

/**
 * Получить аватар для пользователя по Telegram username
 */
export async function fetchAvatarFromTelegram(username) {
	const botToken = getBotToken();
	if (!botToken) {
		throw new Error('Telegram bot token not configured');
	}

	try {
		// Получаем информацию о пользователе
		const userInfo = await getUserInfo(botToken, username);
		
		if (!userInfo.id) {
			throw new Error('User ID not found');
		}

		// Получаем фото профиля
		const photo = await getUserProfilePhoto(botToken, userInfo.id);
		
		if (!photo) {
			return null; // Нет фото профиля
		}

		// Скачиваем файл
		const buffer = await downloadFile(botToken, photo.file_id);
		
		// Сохраняем локально
		const avatarPath = await saveAvatarLocally(buffer, username);
		
		return avatarPath;
	} catch (error) {
		console.error(`[TelegramAvatar] Error fetching avatar for @${username}:`, error);
		throw error;
	}
}

/**
 * Синхронизировать аватары для списка заказчиков/подрядчиков
 */
export async function syncAvatarsForEntities(entities, entityType = 'customer', sendNotifications = true) {
	const { token: botToken, chatId } = getTelegramSettings();
	if (!botToken) {
		return {
			success: false,
			error: 'Telegram bot token not configured',
			updated: 0,
			failed: 0
		};
	}

	const results = {
		success: true,
		updated: 0,
		failed: 0,
		errors: []
	};

	// Отправляем уведомление о начале синхронизации
	if (sendNotifications && chatId) {
		const entityTypeName = entityType === 'customer' ? 'заказчиков' : 'подрядчиков';
		const count = entities.length;
		try {
			await sendTelegramMessage(botToken, chatId, `🔄 Начинаю синхронизацию аватаров ${entityTypeName}...\nНайдено: ${count}`);
		} catch (error) {
			console.error('[TelegramAvatar] Failed to send start notification:', error);
		}
	}

	for (const entity of entities) {
		// Ищем первый Telegram контакт
		const telegramContact = entity.contacts?.find(c => c.type === 'Telegram');
		if (!telegramContact) continue;

		const username = telegramContact.value;
		
		// Проверяем, нужно ли обновлять аватар
		if (!shouldUpdateAvatar(entity.avatar)) {
			continue; // Аватар свежий, пропускаем
		}

		try {
			const avatarPath = await fetchAvatarFromTelegram(username);
			if (avatarPath) {
				// Обновляем аватар в сущности
				entity.avatar = avatarPath;
				results.updated++;
				
				// Отправляем уведомление об успешном обновлении
				if (sendNotifications && chatId) {
					try {
						await sendTelegramMessage(botToken, chatId, `✅ Обновлен аватар: ${entity.name} (@${username})`);
					} catch (error) {
						console.error('[TelegramAvatar] Failed to send success notification:', error);
					}
				}
				
				// Небольшая задержка между запросами, чтобы не превысить rate limits
				await new Promise(resolve => setTimeout(resolve, 100));
			}
		} catch (error) {
			results.failed++;
			results.errors.push({
				entityId: entity.id,
				entityName: entity.name,
				username,
				error: error.message
			});
			console.error(`[TelegramAvatar] Failed to sync avatar for ${entity.name} (@${username}):`, error);
			
			// Отправляем уведомление об ошибке
			if (sendNotifications && chatId) {
				try {
					await sendTelegramMessage(botToken, chatId, `❌ Ошибка при обновлении аватара: ${entity.name} (@${username})\n${error.message}`);
				} catch (err) {
					console.error('[TelegramAvatar] Failed to send error notification:', err);
				}
			}
		}
	}

	// Отправляем итоговое уведомление
	if (sendNotifications && chatId) {
		const entityTypeName = entityType === 'customer' ? 'заказчиков' : 'подрядчиков';
		let message = `📊 Синхронизация аватаров ${entityTypeName} завершена:\n`;
		message += `✅ Обновлено: ${results.updated}\n`;
		if (results.failed > 0) {
			message += `❌ Ошибок: ${results.failed}`;
		}
		try {
			await sendTelegramMessage(botToken, chatId, message);
		} catch (error) {
			console.error('[TelegramAvatar] Failed to send summary notification:', error);
		}
	}

	if (results.failed > 0) {
		results.success = false;
	}

	return results;
}


