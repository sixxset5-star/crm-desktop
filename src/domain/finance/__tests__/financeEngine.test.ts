import { describe, it, expect } from 'vitest';
import { calculateFinanceSummary } from '../financeEngine';
import type { Task } from '@/store/board';
import type { Income } from '@/store/income';
import type { ExtraWork } from '@/pages/workload/types/extra-work.types';
import type { MonthlyFinancialGoal, Credit } from '@/store/goals';

describe('financeEngine', () => {
	const createMockDate = (year: number, month: number, day: number): Date => {
		return new Date(year, month, day, 12, 0, 0);
	};

	describe('calculateFinanceSummary - extraWorkIncome', () => {
		it('должен рассчитывать доход от доп работы только из оплаченных платежей', () => {
			const now = createMockDate(2024, 1, 15); // 15 февраля 2024
			
			const extraWorks: ExtraWork[] = [
				{
					id: 'work1',
					workDates: ['2024-02-01T00:00:00.000Z', '2024-02-02T00:00:00.000Z'],
					dailyRate: 2500,
					totalAmount: 5000,
					payments: [
						{
							id: 'p1',
							date: '2024-02-01T00:00:00.000Z',
							amount: 2500,
							paid: true,
						},
						{
							id: 'p2',
							date: '2024-02-02T00:00:00.000Z',
							amount: 2500,
							paid: false, // не оплачено
						},
					],
					createdAt: '2024-02-01T00:00:00.000Z',
					updatedAt: '2024-02-01T00:00:00.000Z',
				},
			];

			const summary = calculateFinanceSummary({
				tasks: [],
				incomes: [],
				extraWorks,
				credits: [],
				monthlyFinancialGoals: [],
				now,
			});

			// Только оплаченный платеж должен попасть в доход
			expect(summary.month.extraWorkIncome).toBe(2500);
			expect(summary.month.totalIncome).toBe(2500);
		});

		it('должен рассчитывать доход от доп работы за текущий месяц', () => {
			const now = createMockDate(2024, 1, 15); // 15 февраля 2024
			
			const extraWorks: ExtraWork[] = [
				{
					id: 'work1',
					workDates: ['2024-02-01T00:00:00.000Z'],
					dailyRate: 2500,
					totalAmount: 2500,
					payments: [
						{
							id: 'p1',
							date: '2024-02-01T00:00:00.000Z',
							amount: 2500,
							paid: true,
						},
					],
					createdAt: '2024-02-01T00:00:00.000Z',
					updatedAt: '2024-02-01T00:00:00.000Z',
				},
				{
					id: 'work2',
					workDates: ['2024-01-15T00:00:00.000Z'], // прошлый месяц
					dailyRate: 3000,
					totalAmount: 3000,
					payments: [
						{
							id: 'p2',
							date: '2024-01-15T00:00:00.000Z',
							amount: 3000,
							paid: true,
						},
					],
					createdAt: '2024-01-15T00:00:00.000Z',
					updatedAt: '2024-01-15T00:00:00.000Z',
				},
			];

			const summary = calculateFinanceSummary({
				tasks: [],
				incomes: [],
				extraWorks,
				credits: [],
				monthlyFinancialGoals: [],
				now,
			});

			// Только платеж за текущий месяц (февраль)
			expect(summary.month.extraWorkIncome).toBe(2500);
		});

		it('должен рассчитывать дневной доход от доп работы в byDay', () => {
			const now = createMockDate(2024, 1, 15); // 15 февраля 2024
			
			const extraWorks: ExtraWork[] = [
				{
					id: 'work1',
					workDates: ['2024-02-01T00:00:00.000Z', '2024-02-02T00:00:00.000Z'],
					dailyRate: 2500,
					totalAmount: 5000,
					payments: [
						{
							id: 'p1',
							date: '2024-02-01T00:00:00.000Z',
							amount: 2500,
							paid: true,
						},
						{
							id: 'p2',
							date: '2024-02-02T00:00:00.000Z',
							amount: 2500,
							paid: true,
						},
					],
					createdAt: '2024-02-01T00:00:00.000Z',
					updatedAt: '2024-02-01T00:00:00.000Z',
				},
			];

			const summary = calculateFinanceSummary({
				tasks: [],
				incomes: [],
				extraWorks,
				credits: [],
				monthlyFinancialGoals: [],
				now,
			});

			// Проверяем дневные данные
			const day1 = summary.byDayMap.get('2024-02-01');
			const day2 = summary.byDayMap.get('2024-02-02');

			expect(day1).toBeDefined();
			expect(day1?.extraWorkIncome).toBe(2500);
			expect(day1?.hasAdditionalIncome).toBe(true);

			expect(day2).toBeDefined();
			expect(day2?.extraWorkIncome).toBe(2500);
			expect(day2?.hasAdditionalIncome).toBe(true);

			// Проверяем profit
			expect(day1?.profit).toBe(2500); // extraWorkIncome - taxes - expenses (0 - 0 - 0)
			expect(day2?.profit).toBe(2500);
		});

		it('должен правильно рассчитывать profit с учетом extraWorkIncome', () => {
			const now = createMockDate(2024, 1, 15); // 15 февраля 2024
			
			const extraWorks: ExtraWork[] = [
				{
					id: 'work1',
					workDates: ['2024-02-01T00:00:00.000Z'],
					dailyRate: 2500,
					totalAmount: 2500,
					payments: [
						{
							id: 'p1',
							date: '2024-02-01T00:00:00.000Z',
							amount: 2500,
							paid: true,
						},
					],
					createdAt: '2024-02-01T00:00:00.000Z',
					updatedAt: '2024-02-01T00:00:00.000Z',
				},
			];

			const summary = calculateFinanceSummary({
				tasks: [],
				incomes: [],
				extraWorks,
				credits: [],
				monthlyFinancialGoals: [],
				now,
			});

			// profit = totalIncome - totalExpenses - totalTaxes
			// totalIncome = extraWorkIncome = 2500
			// totalExpenses = 0
			// totalTaxes = 0
			expect(summary.month.profit).toBe(2500);
			expect(summary.month.totalIncome).toBe(2500);
			expect(summary.month.extraWorkIncome).toBe(2500);
		});
	});
});




