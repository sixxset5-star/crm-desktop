/**
 * Константы для страницы Workload
 * Используются вместо хардкодных значений
 * Все значения основаны на дизайн-токенах из tokens.css
 */

// Размеры для чипов заказчиков (используем getToken для получения из токенов)
// Эти значения используются в runtime вычислениях, поэтому нужны числовые значения
export const AVATAR_WIDTH = 18;
export const CHIP_GAP = 5;
export const CHIP_PADDING_LEFT = 4; // var(--space-xs)
export const CHIP_PADDING_RIGHT = 10;
export const CHAR_WIDTH = 7.5; // Вычисляемое значение для оценки ширины текста

// Размеры для календарных ячеек
export const CALENDAR_CELL_MIN_HEIGHT = 120;
export const CALENDAR_CELL_PADDING_ALLOWANCE_HOLIDAY = 10;
export const CALENDAR_CELL_PADDING_ALLOWANCE_NORMAL = 6;
export const CALENDAR_CELL_BORDER_WIDTH_TODAY = 2; // Толщина рамки для текущего дня
export const CALENDAR_CELL_OPACITY_INACTIVE = 0.5; // Прозрачность для дней не текущего месяца
export const CALENDAR_HOLIDAYS_GAP = 3; // Отступ между праздниками в ячейке
export const EXTRA_WORK_CALENDAR_CELL_MIN_HEIGHT = 80; // Минимальная высота ячейки для доп работы
export const EXTRA_WORK_ITEM_GAP = 2; // Отступ между элементами доп работы в ячейке

// Размеры для модальных окон
export const MODAL_WIDTH_LG = 600;

// Размеры для тогглов и чекбоксов
export const TOGGLE_WIDTH = 44;
export const TOGGLE_HEIGHT = 24;
export const TOGGLE_THUMB_SIZE = 20;
export const TOGGLE_THUMB_OFFSET = 2;
export const TOGGLE_THUMB_ACTIVE_OFFSET = 22;
export const CHECKBOX_SIZE = 20;

// Размеры для чекбоксов в модальном окне выходных дней
export const WEEKEND_TASK_CHECKBOX_SIZE = 20;

// Приоритеты задач для сортировки
export const PRIORITY_ORDER: Record<string, number> = { 
	high: 3, 
	medium: 2, 
	low: 1 
};

// Дни недели
export const WEEK_DAYS = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];

// Задержки анимации для эмодзи праздников
export const EMOJI_ANIMATION_DELAYS = [0, 0.75, 1.5, 2.25];
export const EMOJI_ANIMATION_DURATIONS = [2.8, 3.2, 3.0, 3.4];

// Размеры для форм и модалок
// Используем токены для размеров, но для числовых значений (rows) оставляем константы
export const EXTRA_WORK_FORM_TEXTAREA_ROWS = 3; // Количество строк textarea для заметок
// EXTRA_WORK_FORM_MAX_HEIGHT удален - используем токен '--extra-work-max-list-height'

// Непрозрачность
export const OPACITY_INACTIVE = 0.4;
export const OPACITY_FULL = 1;

