import { useSettingsStore } from '@/store/settings';

/**
 * Форматирует число как валюту с использованием Intl.NumberFormat
 * 
 * @param value - Числовое значение для форматирования
 * @param currency - Код валюты (по умолчанию 'RUB')
 * @param locale - Локаль для форматирования (по умолчанию 'ru-RU')
 * @returns Отформатированная строка валюты или '—' если значение невалидно
 * 
 * @example
 * formatCurrency(1000, 'RUB', 'ru-RU') // '1 000 ₽'
 * formatCurrency(1000, 'USD', 'en-US') // '$1,000'
 */
export function formatCurrency(value?: number, currency?: string, locale?: string): string {
	if (value == null || Number.isNaN(value)) return '—';
	const curr = currency || 'RUB';
	const loc = locale || 'ru-RU';
	return new Intl.NumberFormat(loc, { style: 'currency', currency: curr, maximumFractionDigits: 0 }).format(value);
}

/**
 * Форматирует число как валюту с использованием настроек приложения
 * Использует валюту и локаль из настроек
 * 
 * @param value - Числовое значение для форматирования
 * @returns Отформатированная строка валюты
 * 
 * @example
 * const formatted = formatCurrencyRub(1000); // Использует настройки из store
 */
export function formatCurrencyRub(value?: number): string {
	const settings = useSettingsStore.getState().settings;
	return formatCurrency(value, settings.currency, settings.dateFormat);
}

/**
 * Форматирует строку даты в локализованный формат
 * 
 * @param value - Строка даты для форматирования
 * @param locale - Локаль для форматирования (по умолчанию 'ru-RU')
 * @returns Отформатированная строка даты или исходное значение при ошибке
 * 
 * @example
 * formatDate('2024-01-15', 'ru-RU') // '15.01.2024'
 * formatDate('2024-01-15', 'en-US') // '1/15/2024'
 */
export function formatDate(value?: string, locale?: string): string {
	if (!value) return '';
	try {
		const loc = locale || 'ru-RU';
		return new Date(value).toLocaleDateString(loc);
	} catch {
		return value;
	}
}

/**
 * Форматирует строку даты с использованием настроек приложения
 * Использует локаль из настроек
 * 
 * @param value - Строка даты для форматирования
 * @returns Отформатированная строка даты
 * 
 * @example
 * const formatted = formatDateWithSettings('2024-01-15'); // Использует настройки из store
 */
export function formatDateWithSettings(value?: string): string {
	const settings = useSettingsStore.getState().settings;
	return formatDate(value, settings.dateFormat);
}

/**
 * Форматирует номер телефона в формат +7 (915) 024-98-94
 * Поддерживает форматы: +7, 8, 7 в начале номера
 * 
 * @param phone - Номер телефона для форматирования
 * @returns Отформатированный номер телефона или исходная строка, если форматирование невозможно
 * 
 * @example
 * formatPhoneNumber('89150249894') // '+7 (915) 024-98-94'
 * formatPhoneNumber('+79150249894') // '+7 (915) 024-98-94'
 * formatPhoneNumber('79150249894') // '+7 (915) 024-98-94'
 */
export function formatPhoneNumber(phone: string): string {
	// Убираем все нецифровые символы кроме +
	const cleaned = phone.replace(/[^\d+]/g, '');
	
	// Проверяем, начинается ли с +7 или 8
	if (cleaned.startsWith('+7')) {
		const digits = cleaned.slice(2).replace(/\D/g, '');
		if (digits.length === 10) {
			return `+7 (${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6, 8)}-${digits.slice(8)}`;
		}
	} else if (cleaned.startsWith('8') && cleaned.length === 11) {
		const digits = cleaned.slice(1);
		return `+7 (${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6, 8)}-${digits.slice(8)}`;
	} else if (cleaned.startsWith('7') && cleaned.length === 11) {
		const digits = cleaned.slice(1);
		return `+7 (${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6, 8)}-${digits.slice(8)}`;
	}
	
	// Если не удалось отформатировать, возвращаем как есть
	return phone;
}

/**
 * Генерирует ссылку для контакта в зависимости от типа
 * Поддерживает типы: Telegram, Телефон, Email, WhatsApp
 * 
 * @param type - Тип контакта (Telegram, Телефон, Email, WhatsApp)
 * @param value - Значение контакта (username, номер, email)
 * @returns Ссылка для контакта или null, если тип не поддерживается
 * 
 * @example
 * getContactLink('Telegram', '@username') // 'https://t.me/username'
 * getContactLink('Телефон', '89150249894') // 'tel:+79150249894'
 * getContactLink('Email', 'test@example.com') // 'mailto:test@example.com'
 * getContactLink('WhatsApp', '89150249894') // 'https://wa.me/79150249894'
 */
export function getContactLink(type: string, value: string): string | null {
	const trimmedValue = value.trim();
	if (!trimmedValue) return null;
	
	switch (type) {
		case 'Telegram':
			// Убираем @ если есть, добавляем https://t.me/
			const telegramUsername = trimmedValue.startsWith('@') 
				? trimmedValue.slice(1) 
				: trimmedValue;
			return `https://t.me/${telegramUsername}`;
		
		case 'Телефон':
			// Убираем все нецифровые символы кроме +
			const phoneDigits = trimmedValue.replace(/[^\d+]/g, '');
			// Если начинается с 8, заменяем на +7
			const phone = phoneDigits.startsWith('8') 
				? '+7' + phoneDigits.slice(1)
				: phoneDigits.startsWith('7') && !phoneDigits.startsWith('+7')
					? '+7' + phoneDigits.slice(1)
					: phoneDigits.startsWith('+')
						? phoneDigits
						: '+7' + phoneDigits;
			return `tel:${phone}`;
		
		case 'Email':
			return `mailto:${trimmedValue}`;
		
		case 'WhatsApp':
			// Для WhatsApp используем tel: формат
			const whatsappDigits = trimmedValue.replace(/[^\d+]/g, '');
			const whatsapp = whatsappDigits.startsWith('8') 
				? '+7' + whatsappDigits.slice(1)
				: whatsappDigits.startsWith('7') && !whatsappDigits.startsWith('+7')
					? '+7' + whatsappDigits.slice(1)
					: whatsappDigits.startsWith('+')
						? whatsappDigits
						: '+7' + whatsappDigits;
			return `https://wa.me/${whatsapp.replace(/[^\d]/g, '')}`;
		
		default:
			return null;
	}
}

/**
 * Форматирует значение контакта для отображения
 * Применяет специальное форматирование для телефонов и WhatsApp
 * 
 * @param type - Тип контакта
 * @param value - Значение контакта
 * @returns Отформатированное значение для отображения
 * 
 * @example
 * formatContactValue('Телефон', '89150249894') // '+7 (915) 024-98-94'
 * formatContactValue('Email', 'test@example.com') // 'test@example.com'
 */
export function formatContactValue(type: string, value: string): string {
	if (type === 'Телефон' || type === 'WhatsApp') {
		return formatPhoneNumber(value);
	}
	return value;
}






