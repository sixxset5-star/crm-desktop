import React, { useMemo, useEffect, useCallback } from 'react';
import type { ExtraWork, ExtraWorkPayment } from '../types/extra-work.types';
import { ExtraWorkShiftFormModal } from './ExtraWorkShiftFormModal';
import { ExtraWorkDayModal } from './ExtraWorkDayModal';
import { ExtraWorkSelectedDatesBar } from './ExtraWorkSelectedDatesBar';
import { ExtraWorkCalendarGrid } from './ExtraWorkCalendarGrid';
import { createDateToWorksMap, getDateKeyFromDate, serializeDates } from '../utils/extraWorkUtils';
import { useExtraWorkUIStore } from '../store/extraWorkUIStore';
import { DOUBLE_CLICK_COUNT } from '@/shared/constants/numeric-constants';

type ExtraWorkShiftFormData = {
	workDates: string[];
	dailyRate: number;
	weekendRate?: number;
	payments: ExtraWorkPayment[];
	notes?: string;
};

type ExtraWorkCalendarProps = {
	extraWorks: ExtraWork[];
	currentMonth: Date;
	onAddExtraWork: (workDates: string[], dailyRate: number, payments: ExtraWorkPayment[], notes?: string, weekendRate?: number) => void;
	onUpdateExtraWork: (id: string, updates: Partial<Omit<ExtraWork, 'id'>>) => void;
	onRemoveExtraWork: (id: string) => void;
};

export function ExtraWorkCalendar({
	extraWorks,
	currentMonth,
	onAddExtraWork,
	onUpdateExtraWork,
	onRemoveExtraWork,
}: ExtraWorkCalendarProps): React.ReactElement {

	const {
		selectedDates,
		selectedDay,
		isShiftFormOpen,
		editingWorkId,
		toggleDateSelection,
		clearSelectedDates,
		openShiftFormForCreate,
		openShiftFormForEdit,
		openDayModal,
		closeDayModal,
		closeShiftForm,
	} = useExtraWorkUIStore();

	const editingWork = useMemo(() => 
		editingWorkId ? extraWorks.find(w => w.id === editingWorkId) ?? null : null,
		[editingWorkId, extraWorks]
	);

	// Мапа дат к сменам доп работы
	const dateToWorksMap = useMemo(() => createDateToWorksMap(extraWorks), [extraWorks]);

	const handleDayClick = useCallback((day: Date, e: React.MouseEvent) => {
		const dateKey = getDateKeyFromDate(day);
		const isCurrentMonth = day.getMonth() === currentMonth.getMonth();
		
		if (!isCurrentMonth) return;

		const works = dateToWorksMap.get(dateKey) || [];
		const hasWork = works.length > 0;

		// Если двойной клик или есть работа - показываем модалку
		if (e.detail === DOUBLE_CLICK_COUNT || hasWork) {
			if (hasWork) {
				openDayModal(day);
			}
			return;
		}

		// Одиночный клик - выделение для создания новой смены
		toggleDateSelection(dateKey);
	}, [currentMonth, dateToWorksMap, openDayModal, toggleDateSelection]);

	const selectedDatesSorted = useMemo(() => [...selectedDates].sort(), [selectedDates]);

	// Преобразуем selectedDates в ISO формат для формы (для сохранения в БД)
	const selectedDatesISO = useMemo(() => serializeDates(selectedDatesSorted), [selectedDatesSorted]);

	const handleCreateShift = useCallback(() => {
		openShiftFormForCreate(selectedDatesSorted);
	}, [selectedDatesSorted, openShiftFormForCreate]);

	// Сбрасываем selectedDates при смене месяца
	// Используем useMemo для отслеживания изменения месяца
	const monthKey = useMemo(
		() => `${currentMonth.getFullYear()}-${currentMonth.getMonth()}`,
		[currentMonth]
	);

	useEffect(() => {
		clearSelectedDates();
	}, [monthKey, clearSelectedDates]);

	// Мемоизируем колбэки для ExtraWorkShiftFormModal
	const handleShiftFormClose = useCallback(() => {
		closeShiftForm();
		clearSelectedDates();
	}, [closeShiftForm, clearSelectedDates]);

	const handleShiftFormSave = useCallback((data: ExtraWorkShiftFormData) => {
		if (editingWork) {
			onUpdateExtraWork(editingWork.id, data);
		} else {
			onAddExtraWork(data.workDates, data.dailyRate, data.payments, data.notes, data.weekendRate);
		}
		closeShiftForm();
		clearSelectedDates();
	}, [editingWork, onUpdateExtraWork, onAddExtraWork, closeShiftForm, clearSelectedDates]);

	const handleShiftFormDelete = useCallback(() => {
		if (editingWork) {
			onRemoveExtraWork(editingWork.id);
			closeShiftForm();
		}
	}, [editingWork, onRemoveExtraWork, closeShiftForm]);

	// Мемоизируем колбэки для ExtraWorkDayModal
	const handleDayModalEditWork = useCallback((work: ExtraWork) => {
		closeDayModal();
		openShiftFormForEdit(work.id);
	}, [closeDayModal, openShiftFormForEdit]);

	const handleDayModalDeleteWork = useCallback((id: string) => {
		onRemoveExtraWork(id);
	}, [onRemoveExtraWork]);

	return (
		<div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: 'var(--space-md)' }}>
			<ExtraWorkSelectedDatesBar
				selectedDates={selectedDatesSorted}
				onCreateShift={handleCreateShift}
			/>

			<ExtraWorkCalendarGrid
				currentMonth={currentMonth}
				selectedDates={selectedDatesSorted}
				worksByDate={dateToWorksMap}
				onDayClick={handleDayClick}
			/>

			{/* Модалка формы смены */}
			<ExtraWorkShiftFormModal
				open={isShiftFormOpen}
				initial={editingWork}
				initialDates={selectedDatesISO}
				onClose={handleShiftFormClose}
				onSave={handleShiftFormSave}
				onDelete={editingWork ? handleShiftFormDelete : undefined}
			/>

			{/* Модалка просмотра смен по дню */}
			{selectedDay && (
				<ExtraWorkDayModal
					open={true}
					date={selectedDay}
					works={dateToWorksMap.get(getDateKeyFromDate(selectedDay)) || []}
					onClose={closeDayModal}
					onEditWork={handleDayModalEditWork}
					onDeleteWork={handleDayModalDeleteWork}
				/>
			)}
		</div>
	);
}

