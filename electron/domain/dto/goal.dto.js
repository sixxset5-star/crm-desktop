/**
 * DTO схемы для целей
 */
import { z } from 'zod';

export const GoalSchema = z.object({
	id: z.string().min(1, 'Goal ID is required'),
	title: z.string().min(1, 'Goal title is required'),
	description: z.string().optional(),
	deadline: z.string().optional(),
	progress: z.number().min(0).max(100).default(0),
	completed: z.boolean().default(false),
}).strict();

export const MonthlyFinancialGoalSchema = z.object({
	monthKey: z.string().min(1, 'Month key is required'),
	expenses: z.array(z.any()).default([]),
	completed: z.boolean().default(false),
	manualProfit: z.number().optional(),
}).strict();

export const CreditSchema = z.object({
	id: z.string().min(1, 'Credit ID is required'),
	name: z.string().min(1, 'Credit name is required'),
	amount: z.number().optional(),
	monthlyPayment: z.number().optional(),
	interestRate: z.number().optional(),
	notes: z.string().optional(),
	paidThisMonth: z.boolean().default(false),
	lastPaidMonth: z.string().optional(),
}).strict();

export const GoalsDataSchema = z.object({
	goals: z.array(GoalSchema),
	monthlyFinancialGoals: z.array(MonthlyFinancialGoalSchema),
	credits: z.array(CreditSchema).optional(),
}).strict();

export function validateGoalsData(data) {
	return GoalsDataSchema.parse(data);
}

export function safeValidateGoalsData(data) {
	const result = GoalsDataSchema.safeParse(data);
	if (!result.success) {
		return {
			success: false,
			errors: result.error.errors,
			message: result.error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ')
		};
	}
	return {
		success: true,
		data: result.data
	};
}





