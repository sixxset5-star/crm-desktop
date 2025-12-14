import { useCallback, useRef, useState, useEffect } from 'react';
import {
	formatPhoneInput,
	parsePhoneInput,
	formatCurrencyInput,
	parseCurrencyInput,
	formatContractorRateInput,
	parseContractorRateInput,
	formatQuantityInput,
	parseQuantityInput,
	formatPercentageInput,
	parsePercentageInput,
} from '@/shared/lib/input-masks';

export type InputMaskType = 'phone' | 'currency' | 'contractor-rate' | 'quantity' | 'percentage';

/**
 * Хук для применения маски к инпуту
 * 
 * @param maskType - тип маски ('phone' | 'currency' | 'contractor-rate')
 * @param value - текущее значение инпута
 * @param onChange - функция изменения значения (получает сырое значение без форматирования)
 */
export function useInputMask(
	maskType: InputMaskType,
	value: string,
	onChange: (rawValue: string) => void
) {
	const inputRef = useRef<HTMLInputElement | null>(null);
	const [isFocused, setIsFocused] = useState(false);
	const [localValue, setLocalValue] = useState(value);

	// Синхронизируем localValue с внешним value, но только если не в фокусе
	useEffect(() => {
		if (!isFocused) {
			setLocalValue(value);
		}
	}, [value, isFocused]);

	const formatValue = useCallback((rawValue: string): string => {
		switch (maskType) {
			case 'phone':
				return formatPhoneInput(rawValue);
			case 'currency':
				return formatCurrencyInput(rawValue);
			case 'contractor-rate':
				return formatContractorRateInput(rawValue);
			case 'quantity':
				return formatQuantityInput(rawValue);
			case 'percentage':
				return formatPercentageInput(rawValue);
			default:
				return rawValue;
		}
	}, [maskType]);

	const parseValue = useCallback((formattedValue: string): string => {
		switch (maskType) {
			case 'phone':
				return parsePhoneInput(formattedValue);
			case 'currency':
				return parseCurrencyInput(formattedValue);
			case 'contractor-rate':
				return parseContractorRateInput(formattedValue);
			case 'quantity':
				return parseQuantityInput(formattedValue);
			case 'percentage':
				return parsePercentageInput(formattedValue);
			default:
				return formattedValue;
		}
	}, [maskType]);

	const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
		const input = e.target;
		const inputValue = input.value;
		
		// Для денежных масок и количества разрешаем математические выражения
		const allowsMath = maskType === 'currency' || maskType === 'quantity' || maskType === 'percentage';
		
		// Проверяем, есть ли математические символы
		const hasMathSymbols = allowsMath && /[+\-*/()]/.test(inputValue);
		
		if (hasMathSymbols) {
			// Если есть математические символы, НЕ форматируем вообще
			// Парсим только для очистки от лишних символов (пробелы, валютные знаки), но сохраняем математические операторы
			const parsed = parseValue(inputValue);
			// Сохраняем сырое значение БЕЗ форматирования
			setLocalValue(parsed);
			onChange(parsed);
		} else {
			// Если нет математических символов, парсим и форматируем как обычно
			const rawValue = parseValue(inputValue);
			setLocalValue(rawValue);
			onChange(rawValue);
		}
		
		inputRef.current = input;
	}, [onChange, parseValue, maskType]);

	// Проверяем, есть ли математические символы в текущем значении
	const allowsMath = maskType === 'currency' || maskType === 'quantity' || maskType === 'percentage';
	const hasMathSymbols = allowsMath && /[+\-*/()]/.test(localValue);

	// Во время ввода показываем значение:
	// - Если есть математические символы - ВСЕГДА показываем как есть (без форматирования), чтобы не терять часть после оператора
	// - Если нет математических символов - форматируем как обычно
	const displayValue = hasMathSymbols
		? localValue 
		: formatValue(localValue);

	// Восстанавливаем позицию курсора после форматирования
	const handleFocus = useCallback((e: React.FocusEvent<HTMLInputElement>) => {
		inputRef.current = e.target;
		setIsFocused(true);
		// При фокусе показываем сырое значение для удобства редактирования
		const rawValue = parseValue(value);
		setLocalValue(rawValue);
	}, [value, parseValue]);

	const handleBlur = useCallback(() => {
		setIsFocused(false);
		// При потере фокуса форматируем значение, если нет математических символов
		if (inputRef.current && localValue) {
			const hasMath = allowsMath && /[+\-*/()]/.test(localValue);
			
			if (!hasMath) {
				const formatted = formatValue(localValue);
				setLocalValue(formatted);
			}
		}
	}, [localValue, formatValue, allowsMath]);

	return {
		value: displayValue,
		onChange: handleChange,
		onFocus: handleFocus,
		onBlur: handleBlur,
	};
}

