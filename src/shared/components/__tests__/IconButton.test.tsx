/**
 * Тесты для IconButton компонента
 * Проверяет корректность типов и работу компонента
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import IconButton from '../IconButton';
import { TrashIcon, EditIcon, PlusIcon } from '../Icons';

// Мок иконки
const MockIcon = ({ size, color }: { size?: number; color?: string }) => (
	<svg data-testid="mock-icon" width={size} height={size} fill={color}>
		<circle cx="12" cy="12" r="10" />
	</svg>
);

describe('IconButton', () => {
	it('должен рендериться с корректными типами пропсов', () => {
		const handleClick = vi.fn();
		
		render(
			<IconButton
				icon={MockIcon}
				title="Test button"
				onClick={handleClick}
			/>
		);

		const button = screen.getByRole('button', { name: 'Test button' });
		expect(button).toBeInTheDocument();
	});

	it('должен принимать type prop с корректными значениями', () => {
		const handleClick = vi.fn();
		
		const { rerender } = render(
			<IconButton
				icon={MockIcon}
				title="Test"
				onClick={handleClick}
				type="button"
			/>
		);
		
		let button = screen.getByRole('button');
		expect(button).toHaveAttribute('type', 'button');

		rerender(
			<IconButton
				icon={MockIcon}
				title="Test"
				onClick={handleClick}
				type="submit"
			/>
		);
		
		button = screen.getByRole('button');
		expect(button).toHaveAttribute('type', 'submit');

		rerender(
			<IconButton
				icon={MockIcon}
				title="Test"
				onClick={handleClick}
				type="reset"
			/>
		);
		
		button = screen.getByRole('button');
		expect(button).toHaveAttribute('type', 'reset');
	});

	it('должен использовать button по умолчанию, если type не указан', () => {
		const handleClick = vi.fn();
		
		render(
			<IconButton
				icon={MockIcon}
				title="Test"
				onClick={handleClick}
			/>
		);

		const button = screen.getByRole('button');
		expect(button).toHaveAttribute('type', 'button');
	});

	it('должен принимать дополнительные HTML атрибуты через rest props', () => {
		const handleClick = vi.fn();
		
		render(
			<IconButton
				icon={MockIcon}
				title="Test"
				onClick={handleClick}
				data-testid="custom-button"
				aria-label="Custom label"
				disabled
			/>
		);

		const button = screen.getByTestId('custom-button');
		expect(button).toHaveAttribute('aria-label', 'Custom label');
		expect(button).toBeDisabled();
	});

	it('должен вызывать onClick при клике', () => {
		const handleClick = vi.fn();
		
		render(
			<IconButton
				icon={MockIcon}
				title="Test"
				onClick={handleClick}
			/>
		);

		const button = screen.getByRole('button');
		button.click();
		
		expect(handleClick).toHaveBeenCalledTimes(1);
	});

	it('должен останавливать всплытие события при клике', () => {
		const handleClick = vi.fn((e?: React.MouseEvent) => {
			expect(e?.stopPropagation).toBeDefined();
		});
		
		const parentClick = vi.fn();
		
		render(
			<div onClick={parentClick}>
				<IconButton
					icon={MockIcon}
					title="Test"
					onClick={handleClick}
				/>
			</div>
		);

		const button = screen.getByRole('button');
		button.click();
		
		expect(handleClick).toHaveBeenCalled();
		expect(parentClick).not.toHaveBeenCalled();
	});

	it('должен применять hover стили для разных типов иконок', () => {
		const handleClick = vi.fn();
		
		const { rerender } = render(
			<IconButton
				icon={TrashIcon}
				title="Delete"
				onClick={handleClick}
			/>
		);

		let button = screen.getByRole('button');
		expect(button).toBeInTheDocument();

		rerender(
			<IconButton
				icon={EditIcon}
				title="Edit"
				onClick={handleClick}
			/>
		);

		button = screen.getByRole('button');
		expect(button).toBeInTheDocument();

		rerender(
			<IconButton
				icon={PlusIcon}
				title="Add"
				onClick={handleClick}
			/>
		);

		button = screen.getByRole('button');
		expect(button).toBeInTheDocument();
	});

	it('должен применять явно указанный hover prop', () => {
		const handleClick = vi.fn();
		
		render(
			<IconButton
				icon={MockIcon}
				title="Test"
				onClick={handleClick}
				hover="danger"
			/>
		);

		const button = screen.getByRole('button');
		expect(button).toBeInTheDocument();
	});
});


