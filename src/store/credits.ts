/**
 * Zustand store для кредитов
 * Только состояние и вызовы IPC - никакой математики
 */
import { create } from 'zustand';
import type { Credit, CreditScheduleItem } from './goals';
import {
	loadCredits,
	saveCredit,
	deleteCredit,
} from '@/shared/lib/data-source';
import {
	rebuildCreditSchedule,
	applyCreditPayment as applyCreditPaymentBridge,
	buildCreditSchedule as buildCreditScheduleBridge,
} from '@/shared/lib/electron-bridge';
import { createLogger } from '@/shared/lib/logger';

const log = createLogger('Credits');

export type CreditWithSchedule = Credit & { schedule: CreditScheduleItem[] };

type CreditsState = {
	credits: CreditWithSchedule[];
	
	// Actions
	loadCredits: (force?: boolean) => Promise<{ needsMigration?: boolean; migrationCount?: number } | void>;
	saveCredit: (creditDraft: Credit) => Promise<void>;
	rebuildCreditSchedule: (creditId: string, newParams: {
		scheduleType?: 'annuity' | 'differentiated';
		amount?: number;
		annualRate?: number;
		termMonths?: number;
		startDate?: string;
		paymentDay?: number;
	}) => Promise<void>;
	applyCreditPayment: (params: {
		creditId: string;
		scheduleItemId: string;
		paidAmount?: number;
	}) => Promise<void>;
	buildCreditSchedule: (creditId: string, params: {
		scheduleType: 'annuity' | 'differentiated';
		amount: number;
		annualRate: number;
		termMonths: number;
		startDate: string;
		paymentDay?: number;
	}) => Promise<void>;
	deleteCredit: (id: string) => Promise<void>;
	
	// Selectors (вычисляемые значения, но без сложной математики)
	getTotalDebt: () => number;
	getMonthlyCreditPayments: (monthKey: string) => number;
	getMonthlyDebtDelta: (monthKey: string) => number;
};

export const useCreditsStore = create<CreditsState>((set, get) => ({
	credits: [],
	
	loadCredits: async (force = false) => {
		const currentCredits = get().credits;

		// ФИКС: Ретрай логика для защиты от временных сбоев IPC
		// Если _skipUpdate и стор пустой, делаем ретрай (иначе после reload так и останется пусто)
		for (let attempt = 1; attempt <= 5; attempt++) {
			try {
				const credits = await loadCredits();
				// Для совместимости с новой логикой - всегда обновляем
				const result = { credits, _skipUpdate: false, needsMigration: false, migrationCount: 0 };

				// Если данные успешно загружены - обновляем store и выходим
				if (!result._skipUpdate) {
					set({ credits: result.credits });
					return {
						needsMigration: result.needsMigration || false,
						migrationCount: result.migrationCount || 0,
					};
				}

				// Если данные уже есть в store и не force - не трогаем
				if (!force && currentCredits.length > 0) {
					log.debug('Skipping credits update - data already exists and not forced', {
						currentCreditsCount: currentCredits.length,
						attempt,
					});
					return { needsMigration: false, migrationCount: 0 };
				}

				// Если стор пустой и _skipUpdate - ждём и пробуем ещё
				// Это защищает от ситуации, когда IPC ещё не готов при втором reload
				if (currentCredits.length === 0) {
					const delay = 150 * attempt; // Увеличиваем задержку с каждой попыткой
					log.debug('Retrying credits load - IPC not ready', {
						attempt,
						delay,
					});
					await new Promise((resolve) => setTimeout(resolve, delay));
					continue;
				}

				// Если данные есть, но _skipUpdate - просто возвращаем
				return { needsMigration: false, migrationCount: 0 };
			} catch (error) {
				log.error(`Failed to load credits (attempt ${attempt}/5)`, error);
				// Если это не последняя попытка - продолжаем
				if (attempt < 5) {
					const delay = 150 * attempt;
					await new Promise((resolve) => setTimeout(resolve, delay));
					continue;
				}
				// После всех ретраев - не затираем существующие данные
				if (currentCredits.length > 0) {
					log.warn('Failed to load credits after retries, keeping existing data', {
						currentCreditsCount: currentCredits.length,
					});
					return { needsMigration: false, migrationCount: 0 };
				}
				// Если стор пустой и все попытки провалились - устанавливаем пустой массив
				set({ credits: [] });
				return { needsMigration: false, migrationCount: 0 };
			}
		}

		// После всех ретраев - просто не затираем ничего
		log.warn('Failed to load credits after all retries, keeping existing state');
		return { needsMigration: false, migrationCount: 0 };
	},
	
	saveCredit: async (creditDraft: Credit) => {
		try {
			// Для совместимости: если есть schedule, сохраняем его тоже
			const creditWithSchedule = creditDraft as Credit & { schedule?: CreditScheduleItem[] };
			await saveCredit(creditWithSchedule);
			const savedCredit = creditDraft; // После сохранения используем исходный объект
			set((state) => {
				const existingIndex = state.credits.findIndex((c) => c.id === savedCredit.id);
				if (existingIndex >= 0) {
					const updated = [...state.credits];
					updated[existingIndex] = savedCredit;
					return { credits: updated };
				} else {
					return { credits: [...state.credits, savedCredit] };
				}
			});
		} catch (error) {
			log.error('Failed to save credit', error);
			throw error;
		}
	},
	
	rebuildCreditSchedule: async (creditId: string, newParams: {
		scheduleType?: 'annuity' | 'differentiated';
		amount?: number;
		annualRate?: number;
		termMonths?: number;
		startDate?: string;
		paymentDay?: number;
	}) => {
		try {
			const updatedCredit = await rebuildCreditSchedule({ creditId, newParams });
			set((state) => {
				const existingIndex = state.credits.findIndex((c) => c.id === creditId);
				if (existingIndex >= 0) {
					const updated = [...state.credits];
					updated[existingIndex] = updatedCredit;
					return { credits: updated };
				}
				return state;
			});
		} catch (error) {
			log.error('Failed to rebuild schedule', error);
			throw error;
		}
	},
	
	applyCreditPayment: async (params: {
		creditId: string;
		scheduleItemId: string;
		paidAmount?: number;
	}) => {
		try {
			const updatedCredit = await applyCreditPaymentBridge({
				creditId: params.creditId,
				itemId: params.scheduleItemId,
				paidAmount: params.paidAmount,
			});
			set((state) => {
				const existingIndex = state.credits.findIndex((c) => c.id === params.creditId);
				if (existingIndex >= 0) {
					const updated = [...state.credits];
					updated[existingIndex] = updatedCredit;
					return { credits: updated };
				}
				return state;
			});
		} catch (error) {
			log.error('Failed to apply payment', error);
			throw error;
		}
	},
	
	buildCreditSchedule: async (creditId: string, params: {
		scheduleType: 'annuity' | 'differentiated';
		amount: number;
		annualRate: number;
		termMonths: number;
		startDate: string;
		paymentDay?: number;
	}) => {
		try {
			const schedule = await buildCreditScheduleBridge(params);
			// Обновляем кредит с новым графиком
			const state = get();
			const credit = state.credits.find((c) => c.id === creditId);
			if (credit) {
				await get().saveCredit({
					...credit,
					schedule,
				});
			}
		} catch (error) {
			log.error('Failed to build schedule', error);
			throw error;
		}
	},
	
	deleteCredit: async (id: string) => {
		try {
			await deleteCredit(id);
			set((state) => ({
				credits: state.credits.filter((c) => c.id !== id),
			}));
		} catch (error) {
			log.error('Failed to delete credit', error);
			throw error;
		}
	},
	
	// Selectors
	getTotalDebt: () => {
		const state = get();
		return state.credits
			.filter((c) => c.status === 'active')
			.reduce((sum, c) => sum + (c.currentBalance || 0), 0);
	},
	
	getMonthlyCreditPayments: (monthKey: string) => {
		// monthKey format: "2024-12"
		const [year, month] = monthKey.split('-').map(Number);
		const state = get();
		
		return state.credits
			.filter((c) => c.status === 'active')
			.reduce((sum, credit) => {
				const scheduleItem = credit.schedule?.find((item) => {
					const itemDate = new Date(item.paymentDate);
					return itemDate.getFullYear() === year && itemDate.getMonth() + 1 === month;
				});
				return sum + (scheduleItem?.plannedPayment || 0);
			}, 0);
	},
	
	getMonthlyDebtDelta: (monthKey: string) => {
		// monthKey format: "2024-12"
		const [year, month] = monthKey.split('-').map(Number);
		const state = get();
		
		return state.credits
			.filter((c) => c.status === 'active')
			.reduce((sum, credit) => {
				const scheduleItem = credit.schedule?.find((item) => {
					const itemDate = new Date(item.paymentDate);
					return itemDate.getFullYear() === year && itemDate.getMonth() + 1 === month;
				});
				// Суммируем погашение тела по оплаченным строкам
				if (scheduleItem?.paid && scheduleItem.principalPart) {
					return sum + scheduleItem.principalPart;
				}
				return sum;
			}, 0);
	},
}));

