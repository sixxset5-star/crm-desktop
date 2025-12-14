/**
 * Сквозная модель ошибок домена
 * Единый формат ошибок от domain-сервисов до UI
 */

/**
 * Коды ошибок домена
 */
export const DOMAIN_ERROR_CODES = {
	// Валидация
	VALIDATION_FAILED: 'VALIDATION_FAILED',
	TASK_VALIDATION_FAILED: 'TASK_VALIDATION_FAILED',
	CUSTOMER_VALIDATION_FAILED: 'CUSTOMER_VALIDATION_FAILED',
	
	// Не найдено
	NOT_FOUND: 'NOT_FOUND',
	TASK_NOT_FOUND: 'TASK_NOT_FOUND',
	CUSTOMER_NOT_FOUND: 'CUSTOMER_NOT_FOUND',
	
	// БД
	DB_ERROR: 'DB_ERROR',
	DB_CONSTRAINT_VIOLATION: 'DB_CONSTRAINT_VIOLATION',
	DB_TRANSACTION_FAILED: 'DB_TRANSACTION_FAILED',
	
	// Бизнес-правила
	BUSINESS_RULE_VIOLATION: 'BUSINESS_RULE_VIOLATION',
	INVALID_STATE_TRANSITION: 'INVALID_STATE_TRANSITION',
	
	// Неизвестная ошибка
	UNKNOWN: 'UNKNOWN',
};

/**
 * Ошибка домена
 * Расширяет стандартный Error с кодом и деталями
 */
export class DomainError extends Error {
	code;
	details;

	constructor(code, message, details = null) {
		super(message);
		this.name = 'DomainError';
		this.code = code;
		this.details = details;
		
		// Сохраняем правильный stack trace
		if (Error.captureStackTrace) {
			Error.captureStackTrace(this, DomainError);
		}
	}

	/**
	 * Преобразовать в объект для сериализации
	 */
	toJSON() {
		return {
			name: this.name,
			code: this.code,
			message: this.message,
			details: this.details,
			stack: this.stack
		};
	}
}

/**
 * Создать DomainError из Zod ошибки
 */
export function createDomainErrorFromZod(zodError, entityType = 'Entity') {
	// Проверяем, что это действительно ZodError
	if (!zodError) {
		return new DomainError(
			DOMAIN_ERROR_CODES.VALIDATION_FAILED,
			`${entityType} validation failed: error object is null or undefined`
		);
	}
	
	// ZodError может иметь issues или errors
	const issues = zodError.issues || zodError.errors || [];
	
	// Проверяем наличие issues/errors
	if (!Array.isArray(issues) || issues.length === 0) {
		return new DomainError(
			DOMAIN_ERROR_CODES.VALIDATION_FAILED,
			`${entityType} validation failed: invalid error object (missing issues/errors array)`,
			{ 
				errorType: zodError?.constructor?.name,
				errorName: zodError?.name,
				hasErrors: !!zodError?.errors,
				hasIssues: !!zodError?.issues,
				errorKeys: zodError ? Object.keys(zodError) : []
			}
		);
	}
	
	let flattened;
	try {
		flattened = zodError.flatten();
	} catch (flattenError) {
		// Если flatten() не работает, используем пустые значения
		flattened = { fieldErrors: {}, formErrors: [] };
	}
	
	// Используем issues (стандартное поле ZodError) или errors (для совместимости)
	const firstError = issues && issues.length > 0 ? issues[0] : null;
	const pathStr = firstError && firstError.path && Array.isArray(firstError.path) 
		? firstError.path.join('.') 
		: 'unknown';
	const message = firstError 
		? `${entityType} validation failed: ${pathStr} - ${firstError.message || 'validation error'}`
		: `${entityType} validation failed`;

	return new DomainError(
		DOMAIN_ERROR_CODES.VALIDATION_FAILED,
		message,
		{
			errors: flattened?.fieldErrors || {},
			formErrors: flattened?.formErrors || []
		}
	);
}

/**
 * Создать DomainError для "не найдено"
 */
export function createNotFoundError(entityType, id) {
	return new DomainError(
		DOMAIN_ERROR_CODES.NOT_FOUND,
		`${entityType} with id ${id} not found`,
		{ entityType, id }
	);
}

/**
 * Создать DomainError для ошибки БД
 */
export function createDatabaseError(message, details = null) {
	return new DomainError(
		DOMAIN_ERROR_CODES.DB_ERROR,
		`Database error: ${message}`,
		details
	);
}

/**
 * Маппинг DomainError → IPC код ошибки
 */
export function mapDomainErrorToIpcCode(domainError) {
	if (!(domainError instanceof DomainError)) {
		return 'UNKNOWN_ERROR';
	}

	const codeMap = {
		[DOMAIN_ERROR_CODES.VALIDATION_FAILED]: 'VALIDATION_ERROR',
		[DOMAIN_ERROR_CODES.TASK_VALIDATION_FAILED]: 'TASK_VALIDATION_ERROR',
		[DOMAIN_ERROR_CODES.CUSTOMER_VALIDATION_FAILED]: 'CUSTOMER_VALIDATION_ERROR',
		[DOMAIN_ERROR_CODES.NOT_FOUND]: 'NOT_FOUND',
		[DOMAIN_ERROR_CODES.TASK_NOT_FOUND]: 'TASK_NOT_FOUND',
		[DOMAIN_ERROR_CODES.CUSTOMER_NOT_FOUND]: 'CUSTOMER_NOT_FOUND',
		[DOMAIN_ERROR_CODES.DB_ERROR]: 'DB_ERROR',
		[DOMAIN_ERROR_CODES.DB_CONSTRAINT_VIOLATION]: 'DB_CONSTRAINT_VIOLATION',
		[DOMAIN_ERROR_CODES.DB_TRANSACTION_FAILED]: 'DB_TRANSACTION_ERROR',
		[DOMAIN_ERROR_CODES.BUSINESS_RULE_VIOLATION]: 'BUSINESS_RULE_VIOLATION',
		[DOMAIN_ERROR_CODES.INVALID_STATE_TRANSITION]: 'INVALID_STATE_TRANSITION',
	};

	return codeMap[domainError.code] || 'UNKNOWN_ERROR';
}



