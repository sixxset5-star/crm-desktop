import React from 'react';
import buttonStyles from './Button.module.css';
import inputStyles from './Input.module.css';
import switchStyles from './Switch.module.css';
import progressStyles from './ProgressBar.module.css';
import { useInputMask } from '@/shared/hooks/useInputMask';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'action';
export type ButtonSize = 'xs' | 'sm' | 'md' | 'lg';

export type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
	variant?: ButtonVariant;
	size?: ButtonSize;
	fullWidth?: boolean;
};

export function Button({
	children,
	variant = 'primary',
	size = 'md',
	fullWidth = false,
	className,
	...rest
}: ButtonProps): React.ReactElement {
	const classes = [
		buttonStyles.button,
		buttonStyles[variant],
		buttonStyles[size],
		fullWidth ? buttonStyles.fullWidth : '',
		className || '',
	].join(' ').trim();

	return (
		<button {...rest} className={classes}>
			{children}
		</button>
	);
}

export type InputSize = 'xs' | 'sm' | 'md' | 'lg';
export type InputMask = 'phone' | 'currency' | 'contractor-rate' | 'quantity' | 'percentage';

export type BaseInputProps = {
	id?: string;
	name?: string;
	value?: string | number;
	defaultValue?: string | number;
	placeholder?: string;
	disabled?: boolean;
	required?: boolean;
	className?: string;
	size?: InputSize;
	error?: boolean;
	mask?: InputMask;
	onChange?: React.ChangeEventHandler<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>;
	onBlur?: React.FocusEventHandler<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>;
	onFocus?: React.FocusEventHandler<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>;
};

// Внутренний компонент для инпута с маской
function MaskedInput({
	mask,
	value,
	onChange,
	onBlur,
	onFocus,
	...rest
}: {
	mask: InputMask;
	value?: string | number;
	onChange?: React.ChangeEventHandler<HTMLInputElement>;
	onBlur?: React.FocusEventHandler<HTMLInputElement>;
	onFocus?: React.FocusEventHandler<HTMLInputElement>;
} & Omit<React.InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange' | 'onBlur' | 'onFocus'>) {
	const stringValue = typeof value === 'number' ? String(value) : (value || '');
	const maskProps = useInputMask(
		mask,
		stringValue,
		(rawValue) => {
			if (onChange) {
				const syntheticEvent = {
					target: { value: rawValue },
				} as React.ChangeEvent<HTMLInputElement>;
				onChange(syntheticEvent);
			}
		}
	);

	return (
		<input
			{...rest}
			{...maskProps}
			onBlur={(e) => {
				// Вызываем оба обработчика: сначала пользовательский (чтобы получить значение до изменений маски), потом маски
				if (onBlur) {
					onBlur(e);
				}
				if (maskProps.onBlur) {
					maskProps.onBlur();
				}
			}}
			onFocus={(e) => {
				// Вызываем оба обработчика: сначала маски, потом пользовательский
				if (maskProps.onFocus) {
					maskProps.onFocus(e);
				}
				if (onFocus) {
					onFocus(e);
				}
			}}
		/>
	);
}

export function TextInput(props: BaseInputProps & Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'>): React.ReactElement {
	const { className, size, error, mask, value, onChange, onBlur, onFocus, ...rest } = props;

	const classes = [
		inputStyles.input,
		size ? inputStyles[size] : '',
		error ? inputStyles.error : '',
		className || '',
	].join(' ').trim();
	
	// Если указана маска, используем компонент с маской
	// Применяем маску даже для пустых значений (пустая строка), чтобы маска работала при вводе
	if (mask) {
		return (
			<MaskedInput
				mask={mask}
				value={value ?? ''}
				onChange={onChange}
				onBlur={onBlur}
				onFocus={onFocus}
				{...rest}
				className={classes}
			/>
		);
	}
	
	// Обычный инпут без маски
	return (
		<input
			{...rest}
			value={value}
			onChange={onChange}
			onBlur={onBlur}
			onFocus={onFocus}
			className={classes}
		/>
	);
}

export function TextArea(props: BaseInputProps & React.TextareaHTMLAttributes<HTMLTextAreaElement>): React.ReactElement {
	const { className, size, error, ...rest } = props;
	const classes = [
		inputStyles.input,
		inputStyles.textarea,
		size ? inputStyles[size] : '',
		error ? inputStyles.error : '',
		className || '',
	].join(' ').trim();
	return <textarea {...rest} className={classes} />;
}

export function Select(props: BaseInputProps & Omit<React.SelectHTMLAttributes<HTMLSelectElement>, 'size'>): React.ReactElement {
	const { className, size, error, children, ...rest } = props;
	const classes = [
		inputStyles.input,
		inputStyles.select,
		size ? inputStyles[size] : '',
		error ? inputStyles.error : '',
		className || '',
	].join(' ').trim();
	return (
		<div className={inputStyles.selectWrapper}>
			<select {...rest} className={classes}>{children}</select>
		</div>
	);
}

export function Checkbox(props: React.InputHTMLAttributes<HTMLInputElement>): React.ReactElement {
	const { className, ...rest } = props;
	return <input {...rest} type="checkbox" className={[inputStyles.checkbox, className || ''].join(' ').trim()} />;
}

export function Radio(props: React.InputHTMLAttributes<HTMLInputElement>): React.ReactElement {
	const { className, ...rest } = props;
	return <input {...rest} type="radio" className={[inputStyles.radio, className || ''].join(' ').trim()} />;
}

export type CheckboxFieldProps = Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> & {
	label: React.ReactNode;
	className?: string;
	labelClassName?: string;
};

export function CheckboxField({ label, className, labelClassName, ...rest }: CheckboxFieldProps): React.ReactElement {
	return (
		<label
			style={{
				display: 'flex',
				flexDirection: 'row',
				alignItems: 'center',
				gap: 'var(--space-sm)',
				cursor: 'pointer',
			}}
			className={className}
		>
			<Checkbox {...rest} style={{ margin: 0, ...rest.style }} />
			<span className={labelClassName}>{label}</span>
		</label>
	);
}

export type RadioFieldProps = Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> & {
	label: React.ReactNode;
	className?: string;
	labelClassName?: string;
};

export function RadioField({ label, className, labelClassName, ...rest }: RadioFieldProps): React.ReactElement {
	return (
		<label
			style={{
				display: 'flex',
				flexDirection: 'row',
				alignItems: 'center',
				gap: 'var(--space-sm)',
				cursor: 'pointer',
			}}
			className={className}
		>
			<Radio {...rest} style={{ margin: 0, ...rest.style }} />
			<span className={labelClassName}>{label}</span>
		</label>
	);
}

export function Labeled({
	label,
	children,
	className,
}: {
	label: string;
	children: React.ReactNode;
	className?: string;
}): React.ReactElement {
	return (
		<label className={[inputStyles.label, className || ''].join(' ').trim()}>
			<span className={inputStyles.labelText}>{label}</span>
			{children}
		</label>
	);
}

export type SwitchProps = {
	checked?: boolean;
	onChange?: (checked: boolean) => void;
	className?: string;
	disabled?: boolean;
};

export function Switch({ checked, onChange, className, disabled }: SwitchProps): React.ReactElement {
	return (
		<button
			type="button"
			role="switch"
			aria-checked={!!checked}
			disabled={disabled}
			onClick={() => onChange?.(!checked)}
			className={[switchStyles._root, className || ''].join(' ').trim()}
		>
			<span className={switchStyles._thumb} />
		</button>
	);
}

export function ProgressBar({ value }: { value: number }): React.ReactElement {
	const clamped = Math.max(0, Math.min(100, value || 0));
	return (
		<div className={progressStyles._wrap}>
			<div className={progressStyles._track}>
				<div className={progressStyles._bar} style={{ width: `${clamped}%` }} />
			</div>
		</div>
	);
}


