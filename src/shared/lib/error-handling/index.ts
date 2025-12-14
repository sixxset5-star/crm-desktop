/**
 * Централизованная обработка ошибок
 * 
 * Экспортирует все утилиты для работы с ошибками
 */

export {
	handleError,
	handleErrorSync,
	showErrorToUser,
	normalizeError,
	type ErrorHandlerConfig,
} from '../error-handler';

export {
	withErrorHandling,
	withDefault,
	withRethrow,
	handlePromise,
	type WithErrorHandlingOptions,
} from '../withErrorHandling';

export type { ErrorShape } from '../error-types';
export { ERROR_CATEGORIES, getErrorMessage, sanitizeErrorMessage } from '../error-types';


