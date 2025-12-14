import type { Settings } from '@/store/settings';

/**
 * Critical fields that need special handling to prevent data loss
 */
const CRITICAL_FIELDS = ['holidays', 'customWeekends', 'excludedWeekends', 'weekendTasks'] as const;

export type CriticalField = typeof CRITICAL_FIELDS[number];

/**
 * Проверяет, является ли поле критическим (требует специальной обработки)
 * Критические поля требуют особого внимания при слиянии настроек
 * 
 * @param field - Имя поля для проверки
 * @returns true, если поле является критическим
 * 
 * @example
 * isCriticalField('holidays') // true
 * isCriticalField('currency') // false
 */
export function isCriticalField(field: string): field is CriticalField {
	return CRITICAL_FIELDS.includes(field as CriticalField);
}

/**
 * Проверяет, затрагивают ли обновления какие-либо критические поля
 * 
 * @param updates - Обновления настроек для проверки
 * @returns true, если обновления содержат критические поля
 * 
 * @example
 * hasCriticalFields({ currency: 'USD' }) // false
 * hasCriticalFields({ holidays: [] }) // true
 */
export function hasCriticalFields(updates: Partial<Settings>): boolean {
	return CRITICAL_FIELDS.some(field => field in updates);
}

/**
 * Извлекает критические поля из настроек
 * 
 * @param settings - Настройки для извлечения
 * @returns Объект с критическими полями
 * 
 * @example
 * const critical = getCriticalFields(settings);
 * // { holidays: [...], customWeekends: [...], ... }
 */
export function getCriticalFields(settings: Settings): Partial<Pick<Settings, CriticalField>> {
	return {
		holidays: settings.holidays,
		customWeekends: settings.customWeekends,
		excludedWeekends: settings.excludedWeekends,
		weekendTasks: settings.weekendTasks,
	};
}

/**
 * Объединяет обновления настроек с текущими настройками, сохраняя критические поля
 * Использует оптимистичный подход к слиянию:
 * - Обновления применяются
 * - Критические поля полностью заменяются (даже если пустые)
 * - priorityColors объединяются глубоко
 * - Обычные поля просто присваиваются (undefined пропускается)
 * 
 * @param current - Текущие настройки
 * @param updates - Обновления для применения
 * @returns Объединенные настройки с сохраненными критичными полями
 * 
 * @example
 * const merged = mergeSettings(
 *   { currency: 'RUB', priorityColors: { high: 'red' } },
 *   { currency: 'USD', priorityColors: { medium: 'yellow' } }
 * );
 * // Результат: { currency: 'USD', priorityColors: { high: 'red', medium: 'yellow' } }
 */
export function mergeSettings(current: Settings, updates: Partial<Settings>): Settings {
	const merged = { ...current };

	for (const key in updates) {
		if (!(key in updates)) continue;
		
		const value = updates[key as keyof Settings];
		const settingsKey = key as keyof Settings;
		
		if (isCriticalField(key)) {
			// Critical fields: replace completely (even if empty/undefined)
			// This allows explicit clearing of these fields
			merged[settingsKey] = value as Settings[typeof settingsKey];
		} else if (key === 'priorityColors') {
			// Priority colors: deep merge
			if (value === undefined || value === null) {
				merged[settingsKey] = value as Settings[typeof settingsKey];
			} else {
				merged[settingsKey] = {
					...(current.priorityColors ?? {}),
					...(value as Settings['priorityColors']),
				} as Settings[typeof settingsKey];
			}
		} else {
			// Regular fields: simple assignment (skip undefined)
			if (value !== undefined) {
				merged[settingsKey] = value as Settings[typeof settingsKey];
			}
		}
	}

	return merged;
}

/**
 * Сохраняет критические поля из текущего состояния, если они не в обновлениях
 * Используется для дополнительной защиты критических полей при слиянии
 * 
 * @param current - Текущие настройки
 * @param updates - Обновления, которые были применены
 * @param merged - Уже объединенные настройки
 * @returns Настройки с сохраненными критическими полями
 * 
 * @example
 * const preserved = preserveCriticalFields(current, updates, merged);
 * // Критические поля, отсутствующие в updates, будут восстановлены из current
 */
export function preserveCriticalFields(
	current: Settings,
	updates: Partial<Settings>,
	merged: Settings
): Settings {
	const preserved = { ...merged };

	// If a critical field is not being updated, preserve it from current state
	for (const field of CRITICAL_FIELDS) {
		if (!(field in updates)) {
			preserved[field] = current[field];
		}
	}

	return preserved;
}

/**
 * Объединяет загруженные настройки с настройками по умолчанию
 * Гарантирует сохранение критических полей из загруженных данных
 * 
 * @param defaults - Настройки по умолчанию
 * @param loaded - Загруженные настройки (частичные)
 * @returns Объединенные настройки с сохраненными критическими полями
 * 
 * @example
 * const merged = mergeWithDefaults(defaultSettings, loadedFromDisk);
 * // Критические поля из loadedFromDisk будут сохранены, даже если они пустые
 */
export function mergeWithDefaults(defaults: Settings, loaded: Partial<Settings>): Settings {
	const merged = { ...defaults, ...loaded };

	// Explicitly preserve critical fields from loaded data (even if undefined/empty)
	for (const field of CRITICAL_FIELDS) {
		if (field in loaded) {
			merged[field] = loaded[field] as Settings[typeof field];
		}
	}

	return merged;
}

