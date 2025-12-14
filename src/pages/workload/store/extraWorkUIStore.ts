/**
 * UI Store для управления состоянием модалок и выделений доп работы
 * Централизует управление UI состоянием
 */
import { create } from 'zustand';

type ExtraWorkUIState = {
	// Выбранные дни в календаре
	selectedDates: string[]; // Массив dateKey (YYYY-MM-DD)
	
	// Модалки
	isShiftFormOpen: boolean;
	isDayModalOpen: boolean;
	
	// Данные для модалок
	editingWorkId: string | null;
	selectedDay: Date | null;
	
	// Действия для дат
	setSelectedDates: (dates: string[]) => void;
	toggleDateSelection: (dateKey: string) => void;
	clearSelectedDates: () => void;
	
	// Действия для формы смены
	openShiftFormForCreate: (dates?: string[]) => void;
	openShiftFormForEdit: (workId: string) => void;
	closeShiftForm: () => void;
	
	// Действия для модалки дня
	openDayModal: (date: Date) => void;
	closeDayModal: () => void;
	
	// Общий сброс состояния
	reset: () => void;
};

export const useExtraWorkUIStore = create<ExtraWorkUIState>((set) => ({
	selectedDates: [],
	isShiftFormOpen: false,
	isDayModalOpen: false,
	editingWorkId: null,
	selectedDay: null,
	
	setSelectedDates: (dates) => set({ selectedDates: dates }),
	
	toggleDateSelection: (dateKey) => set((state) => {
		const index = state.selectedDates.indexOf(dateKey);
		if (index > -1) {
			return { selectedDates: state.selectedDates.filter(d => d !== dateKey) };
		} else {
			return { selectedDates: [...state.selectedDates, dateKey] };
		}
	}),
	
	clearSelectedDates: () => set({ selectedDates: [] }),
	
	openShiftFormForCreate: (dates = []) => set({ 
		isShiftFormOpen: true, 
		editingWorkId: null,
		selectedDates: dates,
		isDayModalOpen: false,
	}),
	
	openShiftFormForEdit: (workId) => set({ 
		isShiftFormOpen: true, 
		editingWorkId: workId,
		isDayModalOpen: false,
	}),
	
	closeShiftForm: () => set({ 
		isShiftFormOpen: false, 
		editingWorkId: null,
	}),
	
	openDayModal: (date) => set({ 
		isDayModalOpen: true, 
		selectedDay: date,
		isShiftFormOpen: false,
	}),
	
	closeDayModal: () => set({ 
		isDayModalOpen: false, 
		selectedDay: null,
	}),
	
	reset: () => set({
		selectedDates: [],
		isShiftFormOpen: false,
		isDayModalOpen: false,
		editingWorkId: null,
		selectedDay: null,
	}),
}));
