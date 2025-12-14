/**
 * Тесты для useTaskPayments
 * Проверяет корректность типов и работу функций
 */

import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useTaskPayments } from '../useTaskPayments';
import type { Payment } from '../useTaskFormCore';
import type { SubTask } from '@/types';

describe('useTaskPayments', () => {
	const createMockSetState = <T,>() => {
		let state: T;
		return [
			(newState: T | ((prev: T) => T)) => {
				state = typeof newState === 'function' ? (newState as (prev: T) => T)(state) : newState;
			},
			() => state,
		] as const;
	};

	it('должен корректно работать с типами Payment', () => {
		const [setPayments, getPayments] = createMockSetState<Payment[]>();
		const [setPaymentMode, getPaymentMode] = createMockSetState<'payments' | 'subtasks'>();
		
		const initialPayments: Payment[] = [
			{
				id: '1',
				title: 'Платеж 1',
				amount: 1000,
				date: '2024-01-01',
			},
		];

		setPayments(initialPayments);
		setPaymentMode('payments');

		const { result } = renderHook(() =>
			useTaskPayments(
				getPayments(),
				setPayments,
				getPaymentMode(),
				setPaymentMode
			)
		);

		expect(result.current.actions).toBeDefined();
		expect(result.current.errors).toBeDefined();
		expect(result.current.getTotal).toBeDefined();
		expect(result.current.normalize).toBeDefined();
		expect(result.current.convertOldFormats).toBeDefined();
		expect(result.current.determineMode).toBeDefined();
	});

	it('должен корректно конвертировать старые форматы платежей', () => {
		const [setPayments] = createMockSetState<Payment[]>();
		const [setPaymentMode] = createMockSetState<'payments' | 'subtasks'>();
		
		const oldFormatPayments = [
			{
				title: 'Старый платеж',
				amount: 500,
				date: '2024-01-01',
				paid: true,
			},
		];

		const { result } = renderHook(() =>
			useTaskPayments(
				[],
				setPayments,
				'payments',
				setPaymentMode
			)
		);

		const converted = result.current.convertOldFormats(oldFormatPayments);
		
		expect(converted).toHaveLength(1);
		expect(converted[0]).toMatchObject({
			title: 'Старый платеж',
			amount: 500,
			date: '2024-01-01',
			paid: true,
		});
		expect(converted[0].id).toBeDefined();
	});

	it('должен корректно определять режим на основе платежей', () => {
		const [setPayments] = createMockSetState<Payment[]>();
		const [setPaymentMode] = createMockSetState<'payments' | 'subtasks'>();
		
		const { result } = renderHook(() =>
			useTaskPayments(
				[],
				setPayments,
				'payments',
				setPaymentMode
			)
		);

		// Меньше 3 платежей - режим payments
		const payments: Payment[] = [
			{ id: '1', title: 'Платеж 1', amount: 100 },
			{ id: '2', title: 'Платеж 2', amount: 200 },
		];
		
		expect(result.current.determineMode(payments)).toBe('payments');

		// 3 и более платежей - режим subtasks
		const manyPayments: Payment[] = [
			{ id: '1', title: 'Платеж 1', amount: 100 },
			{ id: '2', title: 'Платеж 2', amount: 200 },
			{ id: '3', title: 'Платеж 3', amount: 300 },
		];
		
		expect(result.current.determineMode(manyPayments)).toBe('subtasks');
	});

	it('должен корректно определять режим на основе подзадач', () => {
		const [setPayments] = createMockSetState<Payment[]>();
		const [setPaymentMode] = createMockSetState<'payments' | 'subtasks'>();
		
		const { result } = renderHook(() =>
			useTaskPayments(
				[],
				setPayments,
				'payments',
				setPaymentMode
			)
		);

		const payments: Payment[] = [
			{ id: '1', title: 'Платеж 1', amount: 100 },
		];

		const subtasks: SubTask[] = [
			{ id: '1', title: 'Подзадача 1', done: false, date: '2024-01-01' },
			{ id: '2', title: 'Подзадача 2', done: false, date: '2024-01-02' },
			{ id: '3', title: 'Подзадача 3', done: false, date: '2024-01-03' },
		];

		expect(result.current.determineMode(payments, subtasks)).toBe('subtasks');
	});

	it('должен корректно нормализовать платежи', () => {
		const [setPayments] = createMockSetState<Payment[]>();
		const [setPaymentMode] = createMockSetState<'payments' | 'subtasks'>();
		
		const { result } = renderHook(() =>
			useTaskPayments(
				[],
				setPayments,
				'payments',
				setPaymentMode
			)
		);

		const payments: Payment[] = [
			{
				id: '1',
				title: 'Платеж 1',
				amount: 1000,
				date: '2024-01-01',
			},
			{
				id: '2',
				title: 'Платеж 2',
				amount: 2000,
				date: '2024-01-02',
				qty: 2,
				price: 1000,
			},
		];

		const normalized = result.current.normalize(payments);
		
		expect(normalized).toHaveLength(2);
		expect(normalized[0]).toMatchObject({
			title: 'Платеж 1',
			date: '2024-01-01',
			amount: 1000,
		});
		expect(normalized[1]).toMatchObject({
			title: 'Платеж 2',
			date: '2024-01-02',
			qty: 2,
			price: 1000,
		});
	});

	it('должен корректно работать с setSubtasks типа SubTask[]', () => {
		const [setPayments] = createMockSetState<Payment[]>();
		const [setPaymentMode] = createMockSetState<'payments' | 'subtasks'>();
		const [setSubtasks] = createMockSetState<SubTask[]>();
		
		const { result } = renderHook(() =>
			useTaskPayments(
				[],
				setPayments,
				'payments',
				setPaymentMode,
				setSubtasks
			)
		);

		// Проверяем, что хук работает с корректными типами
		expect(result.current).toBeDefined();
		
		act(() => {
			result.current.actions.applyTemplate(
				[
					{ title: 'Шаблон 1', amount: 100, date: '2024-01-01' },
				],
				'template-name'
			);
		});
	});
});


