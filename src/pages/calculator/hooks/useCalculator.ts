import { useState, useMemo, useEffect, useCallback } from 'react';
import { useSettingsStore } from '../../../store/settings';
import { useCalculatorStore, type ReferenceProject as StoreReferenceProject } from '../../../store/calculator';
import { useUIStore } from '@/store/ui';
import { useShallowSelector } from '@/shared/hooks/useStoreSelectors';
import { UI_TEXTS } from '@/shared/constants/ui-texts';
import {
	calculateReferencePrices,
	calculateAveragePricePerBlock,
	calculateBasePrice,
	applyModifiers,
	applyLayoutModifiers,
	roundPrice,
	type ManualCoefficients,
	type NewProject,
} from '../utils/calculations';
import {
	CALCULATOR_DEFAULT_PHOTO_MULTIPLIER,
	CALCULATOR_DEFAULT_URGENT_MULTIPLIER,
	CALCULATOR_DEFAULT_LAYOUT_MULTIPLIER,
	CALCULATOR_DEFAULT_STYLE_MULTIPLIER,
	CALCULATOR_DEFAULT_NON_STANDARD_MULTIPLIER,
	CALCULATOR_DEFAULT_SCALE_MULTIPLIER,
} from '../utils/constants';

export type ReferenceProject = {
	id: string;
	name: string;
	totalAmount: number;
	blocks: number;
	note: string;
};

type Tab = 'new' | 'history';

export function useCalculator() {
	const settings = useShallowSelector(useSettingsStore, (s) => s.settings);
	const calculations = useShallowSelector(useCalculatorStore, (s) => s.calculations);
	const addCalculation = useCalculatorStore((s) => s.addCalculation);
	const removeCalculation = useCalculatorStore((s) => s.removeCalculation);

	const photoMultiplier = settings.calculatorPhotoMultiplier ?? CALCULATOR_DEFAULT_PHOTO_MULTIPLIER;
	const urgentMultiplier = settings.calculatorUrgentMultiplier ?? CALCULATOR_DEFAULT_URGENT_MULTIPLIER;

	const [activeTab, setActiveTab] = useState<Tab>('new');
	const [calculationName, setCalculationName] = useState('');
	const [references, setReferences] = useState<ReferenceProject[]>([]);
	const [newProject, setNewProject] = useState<NewProject>({
		blocks: 0,
		hasPhotos: false,
		needsLayout: false,
		isUrgent: false,
		hasStyle: false,
		hasNonStandardFunctionality: false,
	});
	const [rounding, setRounding] = useState<1000 | 5000 | 10000 | null>(null);
	const [manualCoefficients, setManualCoefficients] = useState<ManualCoefficients>({
		photoMultiplier: null,
		urgentMultiplier: null,
		layoutMultiplier: null,
		styleMultiplier: null,
		nonStandardMultiplier: null,
		scaleMultiplier: null,
	});

	// Загрузка расчетов при монтировании
	// Используем getState() напрямую, так как функция из Zustand store стабильна
	useEffect(() => {
		void useCalculatorStore.getState().loadFromDisk();
	}, []); // Пустой массив - выполнится только при монтировании

	// Расчет цен
	const referencePrices = useMemo(() => calculateReferencePrices(references), [references]);
	const averagePricePerBlock = useMemo(
		() => calculateAveragePricePerBlock(referencePrices),
		[referencePrices]
	);
	const basePrice = useMemo(
		() => calculateBasePrice(averagePricePerBlock, newProject.blocks),
		[averagePricePerBlock, newProject.blocks]
	);
	const priceAfterModifiers = useMemo(
		() =>
			applyModifiers(basePrice, newProject, photoMultiplier, urgentMultiplier, manualCoefficients),
		[basePrice, newProject, photoMultiplier, urgentMultiplier, manualCoefficients]
	);
	const finalPrice = useMemo(
		() => applyLayoutModifiers(priceAfterModifiers, newProject, manualCoefficients),
		[priceAfterModifiers, newProject, manualCoefficients]
	);
	const roundedPrice = useMemo(() => roundPrice(finalPrice, rounding), [finalPrice, rounding]);

	// Функции для работы с референсами
	const addReference = useCallback(() => {
		const newRef: ReferenceProject = {
			id: Date.now().toString(),
			name: '',
			totalAmount: 0,
			blocks: 0,
			note: '',
		};
		setReferences((prev) => [...prev, newRef]);
	}, []);

	const updateReference = useCallback((id: string, updates: Partial<ReferenceProject>) => {
		setReferences((prev) => prev.map((ref) => (ref.id === id ? { ...ref, ...updates } : ref)));
	}, []);

	const removeReference = useCallback((id: string) => {
		setReferences((prev) => prev.filter((ref) => ref.id !== id));
	}, []);

	// Сохранение расчета
	const handleSaveCalculation = useCallback(async () => {
		if (references.length === 0 || newProject.blocks === 0) {
			await useUIStore.getState().showAlert({
				title: UI_TEXTS.ERROR,
				message: UI_TEXTS.CALCULATOR_SAVE_ERROR,
			});
			return;
		}

		addCalculation({
			name: calculationName || undefined,
			references: references.map((ref) => ({
				id: ref.id,
				name: ref.name,
				totalAmount: ref.totalAmount,
				blocks: ref.blocks,
				note: ref.note,
			})),
			newProject,
			rounding,
			manualCoefficients,
			results: {
				averagePricePerBlock,
				basePrice,
				priceAfterModifiers,
				finalPrice,
				roundedPrice,
			},
		});

		// Очистка формы
		setCalculationName('');
		setReferences([]);
		setNewProject({
			blocks: 0,
			hasPhotos: false,
			needsLayout: false,
			isUrgent: false,
			hasStyle: false,
			hasNonStandardFunctionality: false,
		});
		setRounding(null);
		setManualCoefficients({
			photoMultiplier: null,
			urgentMultiplier: null,
			layoutMultiplier: null,
			styleMultiplier: null,
			nonStandardMultiplier: null,
			scaleMultiplier: null,
		});

		await useUIStore.getState().showAlert({
			title: UI_TEXTS.SUCCESS,
			message: UI_TEXTS.CALCULATION_SAVED,
		});
		setActiveTab('history');
	}, [references, newProject, calculationName, rounding, manualCoefficients, averagePricePerBlock, basePrice, priceAfterModifiers, finalPrice, roundedPrice, addCalculation]);

	// Загрузка расчета в форму
	const loadCalculationIntoForm = useCallback((calc: typeof calculations[0]) => {
		setReferences(calc.references.map((ref) => ({ ...ref })));
		setNewProject({
			...calc.newProject,
			hasNonStandardFunctionality: calc.newProject.needsLayout ? calc.newProject.hasNonStandardFunctionality : false,
		});
		setRounding(calc.rounding);
		setManualCoefficients({ ...calc.manualCoefficients });
		setActiveTab('new');
	}, []);

	return {
		// Данные
		activeTab,
		setActiveTab,
		calculationName,
		setCalculationName,
		references,
		newProject,
		setNewProject,
		rounding,
		setRounding,
		manualCoefficients,
		setManualCoefficients,
		calculations,
		// Расчеты
		referencePrices,
		averagePricePerBlock,
		basePrice,
		priceAfterModifiers,
		finalPrice,
		roundedPrice,
		// Множители
		photoMultiplier,
		urgentMultiplier,
		layoutMultiplier: CALCULATOR_DEFAULT_LAYOUT_MULTIPLIER,
		styleMultiplier: CALCULATOR_DEFAULT_STYLE_MULTIPLIER,
		nonStandardMultiplier: CALCULATOR_DEFAULT_NON_STANDARD_MULTIPLIER,
		scaleMultiplier: CALCULATOR_DEFAULT_SCALE_MULTIPLIER,
		// Функции
		addReference,
		updateReference,
		removeReference,
		handleSaveCalculation,
		loadCalculationIntoForm,
		removeCalculation,
	};
}






