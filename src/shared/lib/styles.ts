/**
 * Утилиты для стилей
 * Предоставляет переиспользуемые стили для избежания дублирования
 * 
 * Примечание: Для inline стилей рекомендуется использовать CSS переменные напрямую:
 * - var(--border-style) вместо borderStyle
 * - var(--border-dashed-style) вместо borderDashedStyle
 * - var(--border-active-style) вместо borderActiveStyle
 * 
 * Эти константы оставлены для обратной совместимости и случаев, когда нужна JS-константа.
 */

/**
 * Стандартный border стиль для элементов
 * @deprecated Используйте var(--border-style) в CSS или inline стилях
 */
export const borderStyle = 'var(--border-style)';

/**
 * Стандартный border стиль для dashed границ
 * @deprecated Используйте var(--border-dashed-style) в CSS или inline стилях
 */
export const borderDashedStyle = 'var(--border-dashed-style)';

/**
 * Стандартный border стиль для активных/выделенных элементов
 * @deprecated Используйте var(--border-active-style) в CSS или inline стилях
 */
export const borderActiveStyle = 'var(--border-active-style)';

