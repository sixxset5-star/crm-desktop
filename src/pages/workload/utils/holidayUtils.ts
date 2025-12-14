/**
 * Утилиты для работы с праздниками
 */
import { getTokenString } from '@/shared/lib/tokens';

export type HolidayTheme = {
	emoji: string[];
	background: string;
	borderColor: string;
	textColor: string;
	gradient?: string;
	emojiPositions: Array<{ top?: string; bottom?: string; left?: string; right?: string; transform?: string }>;
	icon?: string;
};

export type StoredHoliday = { id: string; date: string; name: string; recurring?: boolean };

/**
 * Получает значение токена для позиции эмодзи с отрицательным знаком
 */
function getEmojiOffset(tokenName: string, fallback: string): string {
	if (typeof window === 'undefined') return fallback;
	const value = getTokenString(tokenName, fallback);
	// Если значение уже отрицательное, возвращаем как есть
	if (value.startsWith('-')) return value;
	// Иначе добавляем минус
	return `-${value}`;
}

/**
 * Функция для проверки, содержит ли строка хотя бы один из ключевых слов
 */
function matchesKeywords(text: string, keywords: string[]): boolean {
	const normalized = text.toLowerCase().replace(/ё/g, 'е');
	return keywords.some(keyword => {
		const normalizedKeyword = keyword.toLowerCase().replace(/ё/g, 'е');
		return normalized.includes(normalizedKeyword);
	});
}

/**
 * Смешивает цвет с белым
 */
const mixWithWhite = (colorVar: string, whitePortion: number): string => {
	const colorPortion = 100 - whitePortion;
	return `color-mix(in srgb, ${colorVar} ${colorPortion}%, var(--white) ${whitePortion}%)`;
};

/**
 * Смешивает цвет с черным
 */
const mixWithBlack = (colorVar: string, blackPortion: number): string => {
	const colorPortion = 100 - blackPortion;
	return `color-mix(in srgb, ${colorVar} ${colorPortion}%, var(--black) ${blackPortion}%)`;
};

/**
 * Создает базовую тему праздника
 */
function buildHolidayBase(colorVar: string, textTone: 'light' | 'dark' = 'dark'): Pick<HolidayTheme, 'background' | 'borderColor' | 'textColor' | 'gradient'> {
	return {
		background: `linear-gradient(135deg, ${mixWithWhite(colorVar, 85)} 0%, ${mixWithWhite(colorVar, 70)} 100%)`,
		borderColor: colorVar,
		textColor: textTone === 'light' ? 'var(--white)' : 'var(--text)',
		gradient: `linear-gradient(135deg, ${colorVar} 0%, ${mixWithBlack(colorVar, 25)} 100%)`,
	};
}

/**
 * Получает тему оформления для праздника на основе его названия
 */
export function getHolidayTheme(holidayName: string, holidayDate?: string): HolidayTheme {
	const name = holidayName.toLowerCase();
	
	// 8 марта
	const march8Keywords = [
		'8 марта', '8ое марта', '8-е марта', '8-ое марта', '8-го марта',
		'восьмое марта', 'восьмого марта', '8-е', '8ое',
		'международный женский день', 'международный женский',
		'женский день', 'день женщин', 'день женщины',
		'день 8 марта', '8 марта день', 'марта 8', 'март 8',
		'8-е марта день', 'восьмое число марта',
		'women\'s day', 'international women\'s day'
	];
	if (matchesKeywords(name, march8Keywords)) {
		const baseTheme = buildHolidayBase('var(--warning)');
		return {
			...baseTheme,
			emoji: ['🌸', '💐', '🌺', '🌷'],
			icon: '🌸',
			emojiPositions: [
				{ top: getEmojiOffset('--holiday-emoji-offset-top-medium', '10px'), left: getEmojiOffset('--holiday-emoji-offset-left-small', '5px'), transform: 'rotate(-12deg)' },
				{ top: getEmojiOffset('--holiday-emoji-offset-top-small', '8px'), right: getEmojiOffset('--holiday-emoji-offset-right-small', '5px'), transform: 'rotate(12deg)' },
				{ bottom: getEmojiOffset('--holiday-emoji-offset-bottom-medium', '10px'), left: getTokenString('--holiday-emoji-offset-left-positive-medium', '8px'), transform: 'rotate(8deg)' },
				{ bottom: getEmojiOffset('--holiday-emoji-offset-bottom-small', '8px'), right: getTokenString('--holiday-emoji-offset-right-positive-small', '8px'), transform: 'rotate(-8deg)' },
			],
		};
	}
	
	// 23 февраля
	const feb23Keywords = [
		'23 февраля', '23-е февраля', '23-го февраля', '23ое февраля',
		'двадцать третье февраля', 'двадцать третьего февраля',
		'день защитника', 'день защитника отечества',
		'день защитника родины', 'день защитника отечества',
		'мужской день', 'день мужчин', 'день мужчины',
		'23-е', '23ое', '23 число февраля',
		'февраля 23', 'февраль 23', '23.02',
		'defender\'s day', 'men\'s day'
	];
	if (matchesKeywords(name, feb23Keywords)) {
		const baseTheme = buildHolidayBase('var(--accent)');
		return {
			...baseTheme,
			emoji: ['🎖️', '🪖', '⚔️', '🛡️'],
			icon: '🎖️',
			emojiPositions: [
				{ top: getEmojiOffset('--holiday-emoji-offset-top-medium', '10px'), left: getEmojiOffset('--holiday-emoji-offset-left-small', '5px'), transform: 'rotate(-10deg)' },
				{ top: getEmojiOffset('--holiday-emoji-offset-top-small', '8px'), right: getEmojiOffset('--holiday-emoji-offset-right-small', '5px'), transform: 'rotate(10deg)' },
				{ bottom: getEmojiOffset('--holiday-emoji-offset-bottom-medium', '10px'), left: getTokenString('--holiday-emoji-offset-left-positive-large', '10px'), transform: 'rotate(5deg)' },
				{ bottom: getEmojiOffset('--holiday-emoji-offset-bottom-small', '8px'), right: getTokenString('--holiday-emoji-offset-right-positive-medium', '10px'), transform: 'rotate(-5deg)' },
			],
		};
	}
	
	// Новый год и рождество
	const newYearKeywords = [
		'новый год', 'новогод', 'новогодний', 'новогодняя',
		'новый год день', 'новогодний день', 'новогодняя ночь',
		'new year', 'newyear', 'ny', 'n.y.',
		'рождество', 'рождественский', 'рождественская',
		'рождество христово', 'christmas', 'xmas',
		'новый год праздник', 'новогодний праздник'
	];
	if (matchesKeywords(name, newYearKeywords)) {
		const baseTheme = buildHolidayBase('var(--info)');
		return {
			...baseTheme,
			emoji: ['🎄', '❄️', '🎅', '⭐'],
			icon: '🎄',
			emojiPositions: [
				{ top: getEmojiOffset('--holiday-emoji-offset-top-large', '12px'), left: getEmojiOffset('--holiday-emoji-offset-left-medium', '8px'), transform: 'rotate(-20deg)' },
				{ top: getEmojiOffset('--holiday-emoji-offset-top-medium', '10px'), right: getEmojiOffset('--holiday-emoji-offset-right-medium', '8px'), transform: 'rotate(20deg)' },
				{ bottom: getEmojiOffset('--holiday-emoji-offset-bottom-large', '12px'), left: getTokenString('--holiday-emoji-offset-left-positive-small', '5px'), transform: 'rotate(15deg)' },
				{ bottom: getEmojiOffset('--holiday-emoji-offset-bottom-medium', '10px'), right: getTokenString('--holiday-emoji-offset-right-positive-small', '5px'), transform: 'rotate(-15deg)' },
			],
		};
	}
	
	// Пасха
	const easterKeywords = [
		'пасха', 'пасхальный', 'пасхальная', 'пасхальное',
		'пасха день', 'пасхальный день', 'пасхальное воскресенье',
		'easter', 'easter day', 'easter sunday',
		'воскресение христово', 'светлое воскресение',
		'пасха праздник', 'пасхальный праздник'
	];
	if (matchesKeywords(name, easterKeywords)) {
		const baseTheme = buildHolidayBase('var(--green)');
		return {
			...baseTheme,
			emoji: ['🐰', '🥚', '🌿', '🌸'],
			icon: '🐰',
			emojiPositions: [
				{ top: getEmojiOffset('--holiday-emoji-offset-top-medium', '10px'), left: getEmojiOffset('--holiday-emoji-offset-left-small', '5px'), transform: 'rotate(-15deg)' },
				{ top: getEmojiOffset('--holiday-emoji-offset-top-small', '8px'), right: getEmojiOffset('--holiday-emoji-offset-right-small', '5px'), transform: 'rotate(15deg)' },
				{ bottom: getEmojiOffset('--holiday-emoji-offset-bottom-medium', '10px'), left: getTokenString('--holiday-emoji-offset-left-positive-medium', '8px'), transform: 'rotate(10deg)' },
				{ bottom: getEmojiOffset('--holiday-emoji-offset-bottom-small', '8px'), right: getTokenString('--holiday-emoji-offset-right-positive-small', '8px'), transform: 'rotate(-10deg)' },
			],
		};
	}
	
	// Юбилеи и годовщины
	const anniversaryKeywords = [
		'юбилей', 'юбилейный', 'юбилейная', 'юбилейное',
		'годовщина', 'годовщина свадьбы', 'годовщина работы',
		'anniversary', 'anniv', 'годовщина день',
		'юбилейный день', 'юбилей праздник',
		'годовщина день', 'годовщина праздник'
	];
	if (matchesKeywords(name, anniversaryKeywords)) {
		const baseTheme = buildHolidayBase('var(--accent-soft)');
		return {
			...baseTheme,
			emoji: ['💍', '💎', '✨', '🌟'],
			icon: '💍',
			emojiPositions: [
				{ top: getEmojiOffset('--holiday-emoji-offset-top-medium', '10px'), left: getEmojiOffset('--holiday-emoji-offset-left-small', '5px'), transform: 'rotate(-12deg)' },
				{ top: getEmojiOffset('--holiday-emoji-offset-top-small', '8px'), right: getEmojiOffset('--holiday-emoji-offset-right-small', '5px'), transform: 'rotate(12deg)' },
				{ bottom: getEmojiOffset('--holiday-emoji-offset-bottom-medium', '10px'), left: getTokenString('--holiday-emoji-offset-left-positive-large', '10px'), transform: 'rotate(8deg)' },
				{ bottom: getEmojiOffset('--holiday-emoji-offset-bottom-small', '8px'), right: getTokenString('--holiday-emoji-offset-right-positive-medium', '10px'), transform: 'rotate(-8deg)' },
			],
		};
	}
	
	// Свадьба
	const weddingKeywords = [
		'свадьба', 'свадебный', 'свадебная', 'свадебное',
		'свадьба день', 'свадебный день', 'свадебная церемония',
		'wedding', 'wed', 'бракосочетание',
		'свадьба праздник', 'свадебный праздник',
		'женитьба', 'замужество'
	];
	if (matchesKeywords(name, weddingKeywords)) {
		const baseTheme = buildHolidayBase('var(--warning)');
		return {
			...baseTheme,
			emoji: ['💒', '💐', '💍', '🎊'],
			icon: '💒',
			emojiPositions: [
				{ top: getEmojiOffset('--holiday-emoji-offset-top-medium', '10px'), left: getEmojiOffset('--holiday-emoji-offset-left-small', '5px'), transform: 'rotate(-15deg)' },
				{ top: getEmojiOffset('--holiday-emoji-offset-top-small', '8px'), right: getEmojiOffset('--holiday-emoji-offset-right-small', '5px'), transform: 'rotate(15deg)' },
				{ bottom: getEmojiOffset('--holiday-emoji-offset-bottom-medium', '10px'), left: getTokenString('--holiday-emoji-offset-left-positive-medium', '8px'), transform: 'rotate(10deg)' },
				{ bottom: getEmojiOffset('--holiday-emoji-offset-bottom-small', '8px'), right: getTokenString('--holiday-emoji-offset-right-positive-small', '8px'), transform: 'rotate(-10deg)' },
			],
		};
	}
	
	// Дни рождения
	const birthdayKeywords = [
		'день рождения', 'день рождение', 'день рожденья', 'день рожденье',
		'др ', 'д.р.', 'д р', 'birthday', 'bday',
		'рождение', 'рожденье', 'рожденья',
		'именины', 'именинник', 'именинница'
	];
	if (matchesKeywords(name, birthdayKeywords)) {
		const baseTheme = buildHolidayBase('var(--accent)');
		return {
			...baseTheme,
			emoji: ['🎂', '🎉', '🎈', '🎁'],
			icon: '🎂',
			emojiPositions: [
				{ top: '-10px', left: '-5px', transform: 'rotate(-15deg)' },
				{ top: '-8px', right: '-5px', transform: 'rotate(15deg)' },
				{ bottom: '-10px', left: '10px', transform: 'rotate(10deg)' },
				{ bottom: '-8px', right: '10px', transform: 'rotate(-10deg)' },
			],
		};
	}
	
	// Универсальное оформление для остальных праздников
	return {
		...buildHolidayBase('var(--red)', 'light'),
		emoji: ['🎉', '🎊', '✨', '🌟'],
		icon: '🎉',
		emojiPositions: [
			{ top: getEmojiOffset('--holiday-emoji-offset-top-medium', '10px'), left: getEmojiOffset('--holiday-emoji-offset-left-small', '5px'), transform: 'rotate(-12deg)' },
			{ top: getEmojiOffset('--holiday-emoji-offset-top-small', '8px'), right: getEmojiOffset('--holiday-emoji-offset-right-small', '5px'), transform: 'rotate(12deg)' },
			{ bottom: getEmojiOffset('--holiday-emoji-offset-bottom-medium', '10px'), left: getTokenString('--holiday-emoji-offset-left-positive-large', '10px'), transform: 'rotate(8deg)' },
			{ bottom: getEmojiOffset('--holiday-emoji-offset-bottom-small', '8px'), right: getTokenString('--holiday-emoji-offset-right-positive-medium', '10px'), transform: 'rotate(-8deg)' },
		],
	};
}

/**
 * Получает все праздники на день
 */
export function getHolidaysForDay(
	day: Date,
	holidays: StoredHoliday[]
): StoredHoliday[] {
	const dayKey = `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, '0')}-${String(day.getDate()).padStart(2, '0')}`;
	const monthDay = `${String(day.getMonth() + 1).padStart(2, '0')}-${String(day.getDate()).padStart(2, '0')}`;
	
	const result: StoredHoliday[] = [];
	
	// Проверяем точное совпадение даты
	holidays.forEach(h => {
		if (h.date === dayKey) {
			result.push(h);
		}
	});
	
	// Проверяем ежегодные праздники
	holidays.forEach(h => {
		if (h.recurring && !result.find(r => r.id === h.id)) {
			const holidayDate = new Date(h.date);
			const holidayMonthDay = `${String(holidayDate.getMonth() + 1).padStart(2, '0')}-${String(holidayDate.getDate()).padStart(2, '0')}`;
			if (holidayMonthDay === monthDay) {
				result.push(h);
			}
		}
	});
	
	return result;
}

/**
 * Получает первый праздник на день (для обратной совместимости)
 */
export function getHolidayForDay(
	day: Date,
	holidays: StoredHoliday[]
): StoredHoliday | null {
	const allHolidays = getHolidaysForDay(day, holidays);
	return allHolidays.length > 0 ? allHolidays[0] : null;
}






