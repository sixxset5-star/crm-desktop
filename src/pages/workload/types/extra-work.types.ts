/**
 * Централизованные типы для системы доп работы
 * Все типы связанные с ExtraWork должны быть здесь
 * 
 * ВАЖНО: ExtraWork работает ТОЛЬКО с датами (без времени).
 * Все даты хранятся в формате ISO: YYYY-MM-DDTHH:mm:ss.sssZ
 * Время всегда T00:00:00.000Z (полночь UTC) - время игнорируется.
 * 
 * Это означает:
 * - Нет интервалов работы (08:00-12:00)
 * - Нет биллинга по часам
 * - Работа считается за весь день
 */

export type ExtraWorkPayment = {
	id: string;
	/**
	 * ISO date string - дата оплаты
	 * Формат: YYYY-MM-DDTHH:mm:ss.sssZ
	 * Время всегда T00:00:00.000Z (игнорируется)
	 */
	date: string;
	amount: number; // Сумма оплаты
	paid: boolean; // Галочка "Оплачено"
};

export type ExtraWork = {
	id: string;
	/**
	 * Массив дат работы (ISO date strings)
	 * Формат каждой даты: YYYY-MM-DDTHH:mm:ss.sssZ
	 * Время всегда T00:00:00.000Z (игнорируется)
	 * 
	 * Пример: ['2024-03-01T00:00:00.000Z', '2024-03-02T00:00:00.000Z']
	 */
	workDates: string[];
	dailyRate: number; // Оклад за смену (будни)
	weekendRate?: number; // Оклад за смену на выходных (если не указан, используется dailyRate)
	totalAmount: number; // Автоматически: сумма окладов за все дни
	payments: ExtraWorkPayment[];
	notes?: string;
	createdAt?: string;
	updatedAt?: string;
};

export type PaymentMode = 'single' | 'daily' | 'manual';

export type ExtraWorkPaymentFormData = {
	date: string;
	amount: string;
	paid: boolean;
};

export type ManualPaymentFormData = {
	id: string;
	date: string;
	amount: string;
	paid: boolean;
};
