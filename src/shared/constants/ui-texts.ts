/**
 * Константы для UI текстов
 * 
 * Этот файл содержит все пользовательские тексты, используемые в интерфейсе.
 * В будущем эти константы можно заменить на i18n для интернационализации.
 */

/**
 * Общие действия
 */
export const UI_TEXTS = {
	// Действия
	SAVE: 'Сохранить',
	SAVE_AND_CLOSE: 'Сохранить и закрыть',
	SAVE_AND_EXIT: 'Сохранить и выйти',
	CANCEL: 'Отмена',
	DELETE: 'Удалить',
	EDIT: 'Редактировать',
	CREATE: 'Создать',
	ADD: 'Добавить',
	CONFIRM: 'Подтвердить',
	CLOSE: 'Закрыть',

	// Состояния загрузки
	LOADING: 'Загрузка...',

	// Заголовки диалогов
	NOTIFICATION: 'Уведомление',
	CONFIRMATION: 'Подтверждение',
	ERROR: 'Ошибка',
	SUCCESS: 'Успешно',
	OK: 'ОК',
	NEW_TASK: 'Новая задача/проект',
	EDIT_TASK: 'Редактировать',
	NEW_CUSTOMER: 'Новый заказчик',
	EDIT_CUSTOMER: 'Редактировать',
	NEW_CONTRACTOR: 'Новый подрядчик',
	EDIT_CONTRACTOR: 'Редактировать',
	NEW_CREDIT: 'Новый кредит',
	EDIT_CREDIT: 'Редактировать кредит',
	NEW_SHIFT: 'Создать смену',
	EDIT_SHIFT: 'Редактировать смену',
	NEW_INCOME: 'Добавить доход',
	EDIT_INCOME: 'Редактировать доход',
	NEW_EXPENSE: 'Добавить расход',
	EDIT_EXPENSE: 'Редактировать расход',
	NEW_HOLIDAY: 'Добавить праздник',
	EDIT_HOLIDAY: 'Редактировать праздник',

	// Подтверждения удаления
	DELETE_TASK: 'Удалить задачу?',
	DELETE_TASK_TITLE: 'Удалить задачу',
	DELETE_CUSTOMER: (name: string) => `Удалить заказчика "${name}"? Это действие нельзя отменить.`,
	DELETE_CONTRACTOR: (name: string) => `Удалить подрядчика "${name}"? Это действие нельзя отменить.`,
	DELETE_CREDIT: 'Удалить кредит?',
	DELETE_EXPENSE: 'Удалить расход?',
	DELETE_INCOME: 'Удалить доход',
	DELETE_GOAL: 'Удалить цель?',
	DELETE_SHIFT: 'Удалить эту смену?',
	DELETE_SHIFT_TITLE: 'Удалить смену',
	DELETE_PAYMENT: 'Удалить платеж',
	DELETE_EXPENSE_ITEM: 'Удалить расход',
	DELETE_SUBTASK: 'Удалить задачу',
	DELETE_FILE: 'Удалить файл',
	DELETE_TAG: 'Удалить тег',
	DELETE_ACCESS: 'Удалить доступ',
	DELETE_CONTACT: 'Удалить контакт',
	DELETE_DAY: 'Удалить день',
	DELETE_LINK: 'Удалить ссылку',
	DELETE_CALCULATION: 'Удалить этот расчет?',
	DELETE_PAUSE: 'Удалить паузу',

	// Другие действия
	DEACTIVATE_CONTRACTOR: (name: string) => `Деактивировать подрядчика "${name}"? Незавершенные задачи будут возвращены вам.`,
	DEACTIVATE: 'Деактивировать',

	// Подсказки и тултипы
	DOUBLE_CLICK_TO_EDIT: 'Двойной клик — редактировать',
	RIGHT_CLICK_FOR_MENU: 'Правой клик — меню',
	DRAG_TO_CHANGE_STATUS: 'Перетащите — изменить статус',
	EDIT_LINK: 'Редактировать',
	DELETE_LINK_TITLE: 'Удалить',

	// Контекстное меню
	CONTEXT_MENU_EDIT: 'Редактировать',
	CONTEXT_MENU_DELETE: 'Удалить',
	CONTEXT_MENU_DELETE_LINK: 'Удалить ссылку',

	// Формы и валидация
	SAVE_CHANGES: 'Сохранить изменения',
	CREATE_SHIFT_FOR_SELECTED_DAYS: 'Создать смену для выбранных дней',
	ADD_TAG: 'Добавить тег',
	ADD_TAG_PLACEHOLDER: 'Добавить тег (например: срочно, важный)',
	ADD_PAUSE: 'Добавить паузу',

	// Сообщения об ошибках (основные уже есть в error-types.ts)
	// Здесь можно добавить специфичные UI сообщения

	// Сообщения об ошибках валидации
	VALIDATION_ERROR: 'Ошибка валидации',
	DATE_PROCESSING_ERROR: 'Ошибка обработки дат',
	PAYMENT_PROCESSING_ERROR: 'Ошибка обработки оплат',
	FILE_READ_ERROR: 'Ошибка при чтении файла',
	FILE_FORMAT_ERROR: 'Файл слишком короткий или имеет неправильный формат',
	DATE_PROCESSING_ERROR_MESSAGE: (error: string) => `Ошибка при обработке дат работы: ${error}\n\nПроверьте, что все даты заполнены корректно.`,
	PAYMENT_PROCESSING_ERROR_MESSAGE: (error: string) => `Ошибка при обработке дат оплат: ${error}\n\nПроверьте, что все даты оплат заполнены корректно.`,

	// Сообщения об успехе
	CALCULATION_SAVED: 'Расчет сохранен!',
	SETTINGS_RELOADED: 'Настройки перезагружены из файла',
	MIGRATION_COMPLETE: 'Миграция завершена',
	MIGRATION_SUCCESS: (count: number) => `✅ Все кредиты успешно обновлены! (${count})`,
	MIGRATION_RESULT: (success: number, failed: number) => `✅ Успешно: ${success}\n❌ Ошибок: ${failed}`,
	MIGRATION_ERROR: 'Ошибка миграции',
	MIGRATION_ERROR_MESSAGE: (error: string) => `❌ Ошибка миграции: ${error}`,

	// Telegram
	TELEGRAM_BOT_TOKEN_REQUIRED: 'Сначала введите токен бота',
	CHAT_ID_RECEIVED: 'Chat ID получен',
	CHAT_ID_RECEIVED_MESSAGE: (chatId: string) => `Chat ID получен: ${chatId}\n\nВажно: сначала напишите боту /start в Telegram!`,
	CHAT_ID_ERROR: 'Не удалось получить Chat ID. Убедитесь, что вы написали боту /start в Telegram.',
	TELEGRAM_ERROR: (error: string) => `Ошибка: ${error}\n\nУбедитесь, что вы написали боту /start в Telegram.`,

	// Валидация калькулятора
	CALCULATOR_SAVE_ERROR: 'Добавьте референсы и укажите количество блоков для сохранения расчета',

	// Другие
	ORIGINAL_STATUS: 'Исходный статус:',
	CONFIRM_CLOSE_WITHOUT_SAVE: 'Вы точно хотите закрыть без сохранения?',
	CHANGES_WILL_BE_LOST: 'Внесенные изменения будут потеряны.',
} as const;

/**
 * Тип для всех UI текстов
 */
export type UITextKey = keyof typeof UI_TEXTS;

