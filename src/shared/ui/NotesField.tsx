import React from 'react';
import { TextArea, type BaseInputProps } from './Controls';

export type NotesFieldProps = Omit<BaseInputProps, 'mask'> & React.TextareaHTMLAttributes<HTMLTextAreaElement> & {
	/**
	 * Значение поля заметок
	 */
	value?: string;
	/**
	 * Обработчик изменения значения
	 */
	onChange?: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
	/**
	 * Количество строк (по умолчанию 3)
	 */
	rows?: number;
	/**
	 * Placeholder (по умолчанию "Дополнительная информация")
	 */
	placeholder?: string;
	/**
	 * Дополнительные классы
	 */
	className?: string;
};

/**
 * Единый компонент для поля заметок в формах
 * Используется для стандартизации внешнего вида полей заметок по всему приложению
 */
export function NotesField({
	value,
	onChange,
	rows = 3,
	placeholder = 'Дополнительная информация',
	className,
	...rest
}: NotesFieldProps): React.ReactElement {
	return (
		<TextArea
			value={value}
			onChange={onChange}
			rows={rows}
			placeholder={placeholder}
			className={className}
			{...rest}
		/>
	);
}
