import { create } from 'zustand';
import { loadSettingsFromDisk, saveSettingsToDisk } from '@/shared/lib/electron-bridge';
import {
	mergeSettings,
	preserveCriticalFields,
	mergeWithDefaults,
	hasCriticalFields,
} from '@/shared/utils/settings-utils';
import { createLogger } from '@/shared/lib/logger';
import { debounce } from '@/shared/lib/debounce';

const log = createLogger('Settings');

export type Settings = {
	currency: string;
	dateFormat: string;
	incomeLogic: 'all' | 'done';
	// Шаблоны подзадач
	subtaskTemplates?: { name: string; subtasks: { title: string; amount?: number }[] }[];
	// Уведомления
	notificationsEnabled?: boolean;
	notificationDaysBefore?: number;
	// Архивация
	autoArchiveEnabled?: boolean;
	autoArchiveDays?: number;
	// Отображение
	compactMode?: boolean;
	showTaskProgress?: boolean;
	// Фильтрация
	taskFilterMonths?: number;
	// Приоритеты
	priorityColors?: {
		high: string;
		medium: string;
		low: string;
	};
	// Автосохранение
	autosaveInterval?: number; // в секундах
	// Экспорт
	autoBackupEnabled?: boolean;
	autoBackupInterval?: number; // в днях
	// Калькулятор
	calculatorPhotoMultiplier?: number; // множитель для "фотки есть" (по умолчанию 0.8)
	calculatorUrgentMultiplier?: number; // множитель для "срочно" (по умолчанию 1.5)
	// Пользовательские выходные дни (даты в формате YYYY-MM-DD)
	customWeekends?: string[];
	// Исключения из стандартных выходных (даты в формате YYYY-MM-DD) - дни, которые являются стандартными выходными, но помечены как рабочие
	excludedWeekends?: string[];
	// Выбранные задачи на выходные дни (ключ - дата YYYY-MM-DD, значение - массив ID задач)
	weekendTasks?: { [date: string]: string[] };
	// Праздники (массив объектов с датой и названием)
	holidays?: Array<{ id: string; date: string; name: string; recurring?: boolean }>; // recurring - ежегодный праздник
	// Telegram
	telegramBotToken?: string; // Токен Telegram бота для синхронизации аватаров
	telegramChatId?: string; // Chat ID для отправки уведомлений (получить можно написав боту /start)
};

// Legacy color used only for migration from old blue (#2563EB) to new neutral design
// Should not be used in UI - only for detecting and migrating old settings
export const LEGACY_LOW_PRIORITY_COLOR = '#2563EB';
export const LOW_PRIORITY_NEUTRAL = 'var(--muted)';

const defaults: Settings = {
	currency: 'RUB',
	dateFormat: 'ru-RU',
	incomeLogic: 'done',
	subtaskTemplates: [
		{
			name: 'Сайт под ключ',
			subtasks: [
				{ title: 'Дизайн', amount: 0 },
				{ title: 'Верстка', amount: 0 },
				{ title: 'Программирование', amount: 0 },
				{ title: 'Тестирование', amount: 0 },
				{ title: 'Деплой', amount: 0 },
			],
		},
	],
	notificationsEnabled: true,
	notificationDaysBefore: 3,
	autoArchiveEnabled: true,
	autoArchiveDays: 30,
	compactMode: false,
	showTaskProgress: true,
	taskFilterMonths: 3,
	priorityColors: {
		high: 'var(--red)',
		medium: 'var(--warning)',
		low: LOW_PRIORITY_NEUTRAL,
	},
	autosaveInterval: 5,
	autoBackupEnabled: false,
	autoBackupInterval: 7,
	calculatorPhotoMultiplier: 0.8,
	calculatorUrgentMultiplier: 1.5,
};

type SettingsState = {
	settings: Settings;
	isLoading: boolean;
	hasLoaded: boolean;
	updateSettings: (updates: Partial<Settings>) => void;
	loadFromDisk: () => Promise<void>;
};

// Промис текущей загрузки для предотвращения дублирования параллельных вызовов
let loadPromise: Promise<void> | null = null;

export const useSettingsStore = create<SettingsState>((set, get) => ({
	settings: defaults,
	isLoading: false,
	hasLoaded: false,
	updateSettings: (updates) => {
		set((s) => {
			// Защита от потери данных: блокируем обновление критических полей до загрузки
			if (!s.hasLoaded && hasCriticalFields(updates)) {
				log.warn('Skipping critical field update before initial load');
				return s;
			}

			// Merge updates with current settings
			const merged = mergeSettings(s.settings, updates);
			
			// Preserve critical fields from current state if not being updated
			const newSettings = preserveCriticalFields(s.settings, updates, merged);
			
			return { settings: newSettings };
		});
	},
	loadFromDisk: async () => {
		const state = get();
		
		// Предотвращаем дублирование загрузки
		if (loadPromise) {
			return loadPromise;
		}
		
		if (state.isLoading || state.hasLoaded) {
			return;
		}
		
		// Создаем промис загрузки
		loadPromise = (async () => {
			try {
				set({ isLoading: true });
				const loaded = await loadSettingsFromDisk();
				
				if (loaded && typeof loaded === 'object') {
					// Merge loaded settings with defaults
					const merged = mergeWithDefaults(defaults, loaded);
					
					// Migrate legacy priority color
					if (merged.priorityColors?.low === LEGACY_LOW_PRIORITY_COLOR) {
						merged.priorityColors.low = LOW_PRIORITY_NEUTRAL;
					}
					
					set({ settings: merged, hasLoaded: true });
				} else {
					set({ settings: defaults, hasLoaded: true });
				}
			} catch (error) {
				log.error('Failed to load settings', error);
				set({ settings: defaults, hasLoaded: true });
			} finally {
				set({ isLoading: false });
				loadPromise = null;
			}
		})();
		
		return loadPromise;
	},
}));

// Autosave with debounce
// Zustand subscribe срабатывает только при реальных изменениях состояния,
// поэтому сравнение через JSON не нужно
const debouncedSave = debounce((settings: Settings) => {
	saveSettingsToDisk(settings).catch((err) => {
		log.error('Autosave failed', err);
	});
}, 300);

useSettingsStore.subscribe((state) => {
	// Пропускаем автсохранение во время загрузки или до первой загрузки
	if (state.isLoading || !state.hasLoaded) {
		return;
	}
	
	// Zustand сам отслеживает изменения состояния
	debouncedSave(state.settings);
});




