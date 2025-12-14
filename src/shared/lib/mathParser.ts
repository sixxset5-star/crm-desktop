/**
 * Безопасный парсер математических выражений
 * Поддерживает только простые арифметические операции: +, -, *, /
 * Использует алгоритм обратной польской нотации (RPN) для безопасного вычисления
 * 
 * @param expression - Математическое выражение для вычисления
 * @returns Результат вычисления или null при ошибке/невалидном выражении
 * 
 * @example
 * safeEval('2 + 2') // 4
 * safeEval('10 * 5 - 3') // 47
 * safeEval('(10 + 5) * 2') // 30
 * safeEval('10 / 0') // null (деление на ноль)
 * safeEval('invalid') // null (невалидное выражение)
 */
export function safeEval(expression: string): number | null {
	if (!expression || typeof expression !== 'string') {
		return null;
	}

	// Удаляем все пробелы
	const cleaned = expression.replace(/\s/g, '');
	
	// Проверяем, что выражение содержит только числа (с точкой), операторы и скобки
	if (!/^[\d.+\-*/()]+$/.test(cleaned)) {
		return null;
	}

	try {
		// Парсим выражение вручную, используя стек
		const tokens = tokenize(cleaned);
		if (!tokens || tokens.length === 0) {
			return null;
		}
		
		const rpn = infixToRPN(tokens);
		if (!rpn) {
			return null;
		}
		
		return evaluateRPN(rpn);
	} catch (error) {
		return null;
	}
}

type Token = { type: 'number' | 'operator' | 'paren'; value: string | number };

/**
 * Разбивает математическое выражение на токены (числа, операторы, скобки)
 * 
 * @param expression - Математическое выражение
 * @returns Массив токенов или null при ошибке парсинга
 */
function tokenize(expression: string): Token[] | null {
	const tokens: Token[] = [];
	let i = 0;
	
	while (i < expression.length) {
		const char = expression[i];
		
		if (char === ' ') {
			i++;
			continue;
		}
		
		if (char === '(' || char === ')') {
			tokens.push({ type: 'paren', value: char });
			i++;
		} else if (['+', '-', '*', '/'].includes(char)) {
			tokens.push({ type: 'operator', value: char });
			i++;
		} else if (/\d/.test(char)) {
			let numStr = '';
			while (i < expression.length && (/\d/.test(expression[i]) || expression[i] === '.')) {
				numStr += expression[i];
				i++;
			}
			const num = parseFloat(numStr);
			if (isNaN(num)) {
				return null;
			}
			tokens.push({ type: 'number', value: num });
		} else {
			return null; // Недопустимый символ
		}
	}
	
	return tokens;
}

/**
 * Возвращает приоритет оператора для алгоритма RPN
 * 
 * @param op - Оператор (+, -, *, /)
 * @returns Приоритет оператора (1 для +/-, 2 для умножения и деления)
 */
function getPrecedence(op: string): number {
	switch (op) {
		case '+':
		case '-':
			return 1;
		case '*':
		case '/':
			return 2;
		default:
			return 0;
	}
}

/**
 * Преобразует инфиксную нотацию в обратную польскую нотацию (RPN)
 * Использует алгоритм Shunting Yard
 * 
 * @param tokens - Массив токенов в инфиксной нотации
 * @returns Массив токенов в RPN или null при ошибке (несбалансированные скобки)
 */
function infixToRPN(tokens: Token[]): (number | string)[] | null {
	const output: (number | string)[] = [];
	const operators: string[] = [];
	
	for (const token of tokens) {
		if (token.type === 'number') {
			output.push(token.value as number);
		} else if (token.type === 'operator') {
			const op = token.value as string;
			while (
				operators.length > 0 &&
				operators[operators.length - 1] !== '(' &&
				getPrecedence(operators[operators.length - 1]) >= getPrecedence(op)
			) {
				output.push(operators.pop()!);
			}
			operators.push(op);
		} else if (token.value === '(') {
			operators.push('(');
		} else if (token.value === ')') {
			while (operators.length > 0 && operators[operators.length - 1] !== '(') {
				output.push(operators.pop()!);
			}
			if (operators.length === 0 || operators[operators.length - 1] !== '(') {
				return null; // Несбалансированные скобки
			}
			operators.pop(); // Удаляем '('
		}
	}
	
	while (operators.length > 0) {
		const op = operators.pop()!;
		if (op === '(' || op === ')') {
			return null; // Несбалансированные скобки
		}
		output.push(op);
	}
	
	return output;
}

/**
 * Вычисляет результат выражения в обратной польской нотации (RPN)
 * 
 * @param rpn - Массив токенов в RPN
 * @returns Результат вычисления или null при ошибке (деление на ноль, недостаточно операндов)
 */
function evaluateRPN(rpn: (number | string)[]): number | null {
	const stack: number[] = [];
	
	for (const token of rpn) {
		if (typeof token === 'number') {
			stack.push(token);
		} else if (typeof token === 'string') {
			if (stack.length < 2) {
				return null;
			}
			const b = stack.pop()!;
			const a = stack.pop()!;
			
			let result: number;
			switch (token) {
				case '+':
					result = a + b;
					break;
				case '-':
					result = a - b;
					break;
				case '*':
					result = a * b;
					break;
				case '/':
					if (b === 0) {
						return null; // Деление на ноль
					}
					result = a / b;
					break;
				default:
					return null;
			}
			
			if (!isFinite(result)) {
				return null;
			}
			
			stack.push(result);
		}
	}
	
	if (stack.length !== 1) {
		return null;
	}
	
	return stack[0];
}











