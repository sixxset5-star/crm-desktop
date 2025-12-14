/**
 * Утилиты для расчета стоимости проекта
 */

import {
	CALCULATOR_DEFAULT_LAYOUT_MULTIPLIER,
	CALCULATOR_DEFAULT_STYLE_MULTIPLIER,
	CALCULATOR_DEFAULT_NON_STANDARD_MULTIPLIER,
	CALCULATOR_DEFAULT_SCALE_MULTIPLIER,
	CALCULATOR_SCALE_THRESHOLD,
} from './constants';
import type { ReferenceProject } from '../../../store/calculator';

export type ManualCoefficients = {
	photoMultiplier: number | null;
	urgentMultiplier: number | null;
	layoutMultiplier: number | null;
	styleMultiplier: number | null;
	nonStandardMultiplier: number | null;
	scaleMultiplier: number | null;
};

export type NewProject = {
	blocks: number;
	hasPhotos: boolean;
	needsLayout: boolean;
	isUrgent: boolean;
	hasStyle: boolean;
	hasNonStandardFunctionality: boolean;
};

/**
 * Рассчитывает цену за блок для каждого референсного проекта
 */
export function calculateReferencePrices(references: ReferenceProject[]) {
	return references.map((ref) => ({
		...ref,
		pricePerBlock: ref.blocks > 0 ? ref.totalAmount / ref.blocks : 0,
	}));
}

/**
 * Рассчитывает среднюю цену за блок на основе референсов
 */
export function calculateAveragePricePerBlock(referencePrices: ReturnType<typeof calculateReferencePrices>) {
	if (referencePrices.length === 0) return 0;
	const sum = referencePrices.reduce((acc, ref) => acc + ref.pricePerBlock, 0);
	return sum / referencePrices.length;
}

/**
 * Рассчитывает базовую цену нового проекта
 */
export function calculateBasePrice(averagePricePerBlock: number, blocks: number) {
	return averagePricePerBlock * blocks;
}

/**
 * Применяет модификаторы к базовой цене
 */
export function applyModifiers(
	basePrice: number,
	newProject: NewProject,
	photoMultiplier: number,
	urgentMultiplier: number,
	manualCoefficients: ManualCoefficients
) {
	let price = basePrice;

	// Эффект масштаба: если больше порогового значения блоков
	if (newProject.blocks > CALCULATOR_SCALE_THRESHOLD) {
		const scaleMult = manualCoefficients.scaleMultiplier ?? CALCULATOR_DEFAULT_SCALE_MULTIPLIER;
		price *= scaleMult;
	}

	// Множитель для фото
	const photoMult = manualCoefficients.photoMultiplier ?? (newProject.hasPhotos ? photoMultiplier : 1);
	price *= photoMult;

	// Множитель для срочности
	const urgentMult = manualCoefficients.urgentMultiplier ?? (newProject.isUrgent ? urgentMultiplier : 1);
	price *= urgentMult;

	// Стиль уже есть
	if (newProject.hasStyle) {
		const styleMult = manualCoefficients.styleMultiplier ?? CALCULATOR_DEFAULT_STYLE_MULTIPLIER;
		price *= styleMult;
	}

	return price;
}

/**
 * Применяет модификаторы верстки к цене после модификаторов
 */
export function applyLayoutModifiers(
	priceAfterModifiers: number,
	newProject: NewProject,
	manualCoefficients: ManualCoefficients
) {
	let price = priceAfterModifiers;

	// Коэффициент верстки
	const layoutMult = manualCoefficients.layoutMultiplier ?? (newProject.needsLayout ? CALCULATOR_DEFAULT_LAYOUT_MULTIPLIER : 1);
	price *= layoutMult;

	// Нестандартный функционал
	if (newProject.needsLayout && newProject.hasNonStandardFunctionality) {
		const nonStandardMult = manualCoefficients.nonStandardMultiplier ?? CALCULATOR_DEFAULT_NON_STANDARD_MULTIPLIER;
		price *= nonStandardMult;
	}

	return price;
}

/**
 * Округляет цену до указанного значения
 */
export function roundPrice(price: number, rounding: 1000 | 5000 | 10000 | null) {
	if (!rounding) return price;
	return Math.round(price / rounding) * rounding;
}






