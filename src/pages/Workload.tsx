import React, { useMemo, useState, useEffect, useCallback } from 'react';
import { useBoardStore, type ColumnId, type Task } from '../store/board';
import { useCustomersStore } from '../store/customers';
import { useSettingsStore } from '../store/settings';
import { useExtraWorkStore } from '../store/extra-work';
import { createLogger } from '@/shared/lib/logger';
import { useShallowSelector } from '@/shared/hooks/useStoreSelectors';

const log = createLogger('Workload');
import { TaskFormModal } from '../components/TaskFormModal';
import { formatDateWithSettings as formatDate, formatCurrencyRub } from '@/shared/lib/format';
import { EditIcon, LightbulbIcon, ChevronLeftIcon, ChevronRightIcon, PlusIcon } from '@/shared/components/Icons';
import IconButton from '@/shared/components/IconButton';
import { CustomerChip, PriorityBadge, Button, Modal, TagChip } from '@/shared/ui';
import { TaskModalCard } from '@/shared/components';
import { useOverflowFade } from '@/shared/hooks/useOverflowFade';
import { CalendarDayCell, HolidaysModal, ExtraWorkCalendar } from './workload/components';
import { getDaysInMonth, getWeekStart } from './workload/utils/dateUtils';
import type { ExtraWork, ExtraWorkPayment } from './workload/types/extra-work.types';
import {
	getHolidaysForDay,
	getHolidayForDay,
	getHolidayTheme,
	type StoredHoliday,
} from './workload/utils/holidayUtils';
import {
	isTaskOnDay,
	sortTasksByPriority,
	getTasksForWeekend,
} from './workload/utils/taskUtils';
import {
	isWeekendDayForTasks,
	isWeekendDay,
	countWeekendDaysInMonth,
} from './workload/utils/weekendUtils';
import { getDateKeyFromDate } from './workload/utils/extraWorkUtils';
import { WEEK_DAYS, PRIORITY_ORDER, MODAL_WIDTH_LG, TOGGLE_WIDTH, TOGGLE_HEIGHT, TOGGLE_THUMB_SIZE, TOGGLE_THUMB_OFFSET, TOGGLE_THUMB_ACTIVE_OFFSET, WEEKEND_TASK_CHECKBOX_SIZE } from './workload/utils/constants';
import { getToken } from '@/shared/lib/tokens';

type WorkloadTab = 'main' | 'extra-work';

export function Workload(): React.ReactElement {
	const tasks = useShallowSelector(useBoardStore, (s) => s.tasks);
	const customers = useShallowSelector(useCustomersStore, (s) => s.customers);
	const settings = useShallowSelector(useSettingsStore, (s) => s.settings);
	const extraWorks = useShallowSelector(useExtraWorkStore, (s) => s.extraWorks);
	const [activeTab, setActiveTab] = useState<WorkloadTab>('main');
	const [currentMonth, setCurrentMonth] = useState(new Date());
	const [selectedDay, setSelectedDay] = useState<Date | null>(null);
	const [selectedDayTasks, setSelectedDayTasks] = useState<Task[]>([]);
	const [editingTask, setEditingTask] = useState<Task | null>(null);
	const [showTaskForm, setShowTaskForm] = useState(false);
	const [selectedWeekendTasks, setSelectedWeekendTasks] = useState<string[]>([]);
	const [showHolidaysModal, setShowHolidaysModal] = useState(false);
	const [viewportVersion, setViewportVersion] = useState(0);
	const { ref: calendarRef, isOverflowing: calendarHasOverflow } = useOverflowFade<HTMLDivElement>();

	// Мемоизируем значения токенов
	const iconSizeMd = useMemo(() => getToken('--icon-size-md', 20), []);
	const iconSizeSm = useMemo(() => getToken('--icon-size-sm', 16), []);
	const iconSizeXs = useMemo(() => getToken('--icon-size-xs', 11), []);
	const controlSize = useMemo(() => getToken('--control-md-height', 36), []);

	// Загружаем данные при монтировании компонента
	// Используем getState() напрямую, так как функции из Zustand store стабильны
	useEffect(() => {
		useCustomersStore.getState().loadFromDisk().catch(() => {});
		useExtraWorkStore.getState().loadFromDisk().catch(() => {});
	}, []); // Пустой массив - выполнится только при монтировании

	// Загружаем выбранные задачи для выходного дня при открытии модального окна
	useEffect(() => {
		if (selectedDay) {
			const dateKey = getDateKeyFromDate(selectedDay);
			const weekendTasks = settings.weekendTasks?.[dateKey] || [];
			setSelectedWeekendTasks(weekendTasks);
		}
	}, [selectedDay, settings.weekendTasks]);

	useEffect(() => {
		if (typeof window === 'undefined') {
			return;
		}
		const handleResize = () => {
			setViewportVersion((v) => v + 1);
		};
		window.addEventListener('resize', handleResize);
		return () => {
			window.removeEventListener('resize', handleResize);
		};
	}, []);

	const tasksWithDates = useMemo(() => {
		return tasks.filter((t) => t.startDate || t.deadline);
	}, [tasks]);

	const monthStart = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
	const monthEnd = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0);
	const weekStart = getWeekStart(monthStart);

	// Статистика праздников в текущем месяце
	const holidaysStats = useMemo(() => {
		const allHolidays = settings.holidays || [];
		const monthKey = `${currentMonth.getFullYear()}-${String(currentMonth.getMonth() + 1).padStart(2, '0')}`;
		const currentMonthNum = currentMonth.getMonth() + 1;

		const monthHolidays: StoredHoliday[] = [];

		allHolidays.forEach(h => {
			if (h.recurring) {
				const holidayDate = new Date(h.date);
				if (holidayDate.getMonth() + 1 === currentMonthNum) {
					monthHolidays.push(h);
				}
			} else {
				if (h.date.startsWith(monthKey)) {
					monthHolidays.push(h);
				}
			}
		});

		// Группируем по типам
		const byType: Record<string, number> = {};
		monthHolidays.forEach(h => {
			const theme = getHolidayTheme(h.name, h.date);
			const type = theme.icon || '🎉';
			byType[type] = (byType[type] || 0) + 1;
		});

		return {
			total: monthHolidays.length,
			byType,
		};
	}, [settings.holidays, currentMonth]);

	// Подсчет выходных дней в текущем месяце (без учета праздников)
	const weekendDaysCount = useMemo(() => {
		return countWeekendDaysInMonth(
			currentMonth.getFullYear(),
			currentMonth.getMonth(),
			settings.excludedWeekends || [],
			settings.customWeekends || []
		);
	}, [currentMonth, settings.excludedWeekends, settings.customWeekends]);

	const days = useMemo(() => {
		const monthDays = getDaysInMonth(currentMonth.getFullYear(), currentMonth.getMonth());
		const daysBefore = Math.floor((monthStart.getTime() - weekStart.getTime()) / (1000 * 60 * 60 * 24));
		const before = Array.from({ length: daysBefore }, (_, i) => {
			const d = new Date(weekStart);
			d.setDate(d.getDate() + i);
			return d;
		});
		const after = Array.from({ length: 42 - before.length - monthDays.length }, (_, i) => {
			const d = new Date(monthEnd);
			d.setDate(d.getDate() + i + 1);
			return d;
		});
		return [...before, ...monthDays, ...after];
	}, [currentMonth, monthStart, weekStart, monthEnd]);

	const tasksByDay = useMemo(() => {
		const map = new Map<string, Task[]>();
		const holidays = settings.holidays || [];
		days.forEach((d) => {
			const key = getDateKeyFromDate(d);
			if (isWeekendDayForTasks(d, settings.excludedWeekends || [], settings.customWeekends || [])) {
				const weekendTaskIds = settings.weekendTasks?.[key] || [];
				const weekendTasks = tasks.filter((t) => {
					if (!weekendTaskIds.includes(t.id)) return false;
					const pauses = t.pausedRanges || [];
					const dayStart = new Date(d.getFullYear(), d.getMonth(), d.getDate());
					for (const p of pauses) {
						if (!p?.from || !p?.to) continue;
						const ps = new Date(p.from);
						const pe = new Date(p.to);
						const psDay = new Date(ps.getFullYear(), ps.getMonth(), ps.getDate());
						const peDay = new Date(pe.getFullYear(), pe.getMonth(), pe.getDate());
						if (dayStart >= psDay && dayStart <= peDay) {
							return false;
						}
					}
					return true;
				});
				map.set(key, sortTasksByPriority(weekendTasks));
			} else {
				const dayTasks = tasks.filter((t) => isTaskOnDay(t, d));
				map.set(key, sortTasksByPriority(dayTasks));
			}
		});
		return map;
	}, [days, tasks, settings.weekendTasks, settings.excludedWeekends, settings.customWeekends]);

	const prevMonth = useCallback(() => {
		setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
	}, [currentMonth]);

	const nextMonth = useCallback(() => {
		setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
	}, [currentMonth]);

	const handleDayClick = useCallback((day: Date, dayTasks: Task[]) => {
		const isCurrentMonth = day.getMonth() === currentMonth.getMonth();
		const isWeekend = isWeekendDay(day, settings.excludedWeekends || [], settings.customWeekends || [], settings.holidays || []);

		if (isWeekend) {
			const weekendTasks = getTasksForWeekend(day, tasks);
			setSelectedDay(day);
			setSelectedDayTasks(weekendTasks);
		} else if (dayTasks.length > 0 || isCurrentMonth) {
			const allTasksForDay = tasks.filter((t) => isTaskOnDay(t, day));
			setSelectedDay(day);
			setSelectedDayTasks(sortTasksByPriority(allTasksForDay));
		}
	}, [currentMonth, settings.excludedWeekends, settings.customWeekends, settings.holidays, tasks]);

	// Функция для сохранения выбранных задач на выходной день
	const saveWeekendTasks = useCallback((date: Date, taskIds: string[]) => {
		const dateKey = getDateKeyFromDate(date);
		const weekendTasks = settings.weekendTasks || {};
		const newWeekendTasks = {
			...weekendTasks,
			[dateKey]: taskIds,
		};
		if (taskIds.length === 0) {
			delete newWeekendTasks[dateKey];
		}
		useSettingsStore.getState().updateSettings({
			weekendTasks: newWeekendTasks,
		});
	}, [settings.weekendTasks]); // updateSettings убран, так как функция из Zustand стабильна

	// Функция для переключения выбора задачи на выходной день
	const toggleWeekendTask = useCallback((taskId: string) => {
		if (!selectedDay) return;
		const newSelected = selectedWeekendTasks.includes(taskId)
			? selectedWeekendTasks.filter((id) => id !== taskId)
			: [...selectedWeekendTasks, taskId];
		setSelectedWeekendTasks(newSelected);
		saveWeekendTasks(selectedDay, newSelected);
	}, [selectedDay, selectedWeekendTasks, saveWeekendTasks]);

	const closeDayModal = useCallback(() => {
		setSelectedDay(null);
		setSelectedDayTasks([]);
	}, []);

	const handleEditTask = useCallback((task: Task) => {
		setEditingTask(task);
		setShowTaskForm(true);
		setSelectedDay(null);
		setSelectedDayTasks([]);
	}, []);

	// Функция для переключения дня между рабочим и выходным
	const toggleDayWeekend = useCallback((day: Date) => {
		const dateKey = getDateKeyFromDate(day);
		const isStandardWeekend = day.getDay() === 0 || day.getDay() === 6;
		
		// КРИТИЧНО: Проверяем, что данные загружены перед обновлением
		// Если данные undefined, это означает, что они еще не загружены из БД
		if (settings.customWeekends === undefined || settings.excludedWeekends === undefined) {
			log.error('Cannot toggle weekend day - settings not loaded yet!', {
				customWeekends: settings.customWeekends,
				excludedWeekends: settings.excludedWeekends,
			});
			return;
		}
		
		const customWeekends = settings.customWeekends;
		const excludedWeekends = settings.excludedWeekends;
		const isCustomWeekend = customWeekends.includes(dateKey);
		const isExcluded = excludedWeekends.includes(dateKey);
		const { updateSettings } = useSettingsStore.getState();

		if (isStandardWeekend) {
			if (isExcluded) {
				updateSettings({
					excludedWeekends: excludedWeekends.filter((d) => d !== dateKey),
				});
			} else {
				updateSettings({
					excludedWeekends: [...excludedWeekends, dateKey],
				});
			}
		} else {
			if (isCustomWeekend) {
				updateSettings({
					customWeekends: customWeekends.filter((d) => d !== dateKey),
				});
			} else {
				updateSettings({
					customWeekends: [...customWeekends, dateKey],
				});
			}
		}
	}, [settings.customWeekends, settings.excludedWeekends]); // updateSettings убран, так как функция из Zustand стабильна

	// Мемоизируем простые колбэки для UI
	const handleSetMainTab = useCallback(() => setActiveTab('main'), []);
	const handleSetExtraWorkTab = useCallback(() => setActiveTab('extra-work'), []);
	const handleShowHolidaysModal = useCallback(() => setShowHolidaysModal(true), []);
	const handleCloseHolidaysModal = useCallback(() => setShowHolidaysModal(false), []);
	const handleSaveHolidays = useCallback((holidays: StoredHoliday[]) => {
		useSettingsStore.getState().updateSettings({ holidays });
	}, []); // updateSettings убран, так как функция из Zustand стабильна

	// Мемоизируем колбэк для TaskFormModal
	const handleTaskFormClose = useCallback(() => {
		setShowTaskForm(false);
		setEditingTask(null);
		if (selectedDay) {
			const dayTasks = tasks.filter((t) => isTaskOnDay(t, selectedDay));
			setSelectedDayTasks(sortTasksByPriority(dayTasks));
		}
	}, [selectedDay, tasks]);

	// Мемоизируем колбэк для создания задачи на выбранный день
	const handleCreateTaskForSelectedDay = useCallback(() => {
		if (!selectedDay) return;
		const dateStr = getDateKeyFromDate(selectedDay);
		setEditingTask({ 
			id: '', 
			title: '', 
			startDate: dateStr,
			columnId: 'negotiation' as ColumnId,
			createdAt: new Date().toISOString(),
			updatedAt: new Date().toISOString(),
		} as Task);
		setShowTaskForm(true);
		closeDayModal();
	}, [selectedDay, closeDayModal]);

	// Мемоизируем колбэк для переключения дня выходной/рабочий
	const handleToggleDayWeekendClick = useCallback(() => {
		if (selectedDay) {
			toggleDayWeekend(selectedDay);
		}
	}, [selectedDay, toggleDayWeekend]);

	// Мемоизируем колбэки для ExtraWorkCalendar
	const handleAddExtraWork = useCallback((workDates: string[], dailyRate: number, payments: ExtraWorkPayment[], notes?: string, weekendRate?: number) => {
		useExtraWorkStore.getState().addExtraWork(workDates, dailyRate, payments, notes, weekendRate);
	}, []);

	const handleUpdateExtraWork = useCallback((id: string, updates: Partial<Omit<ExtraWork, 'id'>>) => {
		useExtraWorkStore.getState().updateExtraWork(id, updates);
	}, []);

	const handleRemoveExtraWork = useCallback((id: string) => {
		useExtraWorkStore.getState().removeExtraWork(id);
	}, []);

	return (
		<div className="page" style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
			<div style={{ 
				display: 'flex', 
				flexDirection: 'column',
				gap: 'var(--space-md)',
				marginBottom: `var(--space-lg)`, 
				flexShrink: 0 
			}}>
				<div style={{ display: 'flex', flexDirection: 'column', gap: `var(--space-sm)` }}>
					<h1 className="page-title">Загруженность</h1>
					{/* Табы */}
					<div style={{ display: 'flex', gap: `var(--space-xs)`, marginBottom: `var(--space-sm)` }}>
						<button
							type="button"
							onClick={handleSetMainTab}
							style={{
								padding: 'var(--space-sm) var(--space-md)',
								background: activeTab === 'main' ? 'var(--panel)' : 'transparent',
								border: 'none',
								borderBottom: activeTab === 'main' ? '2px solid var(--accent)' : '2px solid transparent',
								color: activeTab === 'main' ? 'var(--accent)' : 'var(--muted)',
								fontWeight: activeTab === 'main' ? 600 : 400,
								cursor: 'pointer',
								transition: 'all var(--transition-base)',
								fontSize: 'var(--font-size-sm)',
							}}
						>
							Основное
						</button>
						<button
							type="button"
							onClick={handleSetExtraWorkTab}
							style={{
								padding: 'var(--space-sm) var(--space-md)',
								background: activeTab === 'extra-work' ? 'var(--panel)' : 'transparent',
								border: 'none',
								borderBottom: activeTab === 'extra-work' ? '2px solid var(--accent)' : '2px solid transparent',
								color: activeTab === 'extra-work' ? 'var(--accent)' : 'var(--muted)',
								fontWeight: activeTab === 'extra-work' ? 600 : 400,
								cursor: 'pointer',
								transition: 'all var(--transition-base)',
								fontSize: 'var(--font-size-sm)',
							}}
						>
							Доп работа
						</button>
					</div>
					<div style={{ display: 'flex', alignItems: 'center', gap: `var(--space-sm)`, flexWrap: 'wrap' }}>
						{activeTab === 'main' ? (
							<>
								<p className="page-subtitle" style={{ margin: 0 }}>
									Календарь проектов и задач — показывает задачи по датам начала и дедлайнов
								</p>
								{holidaysStats.total > 0 && (
									<TagChip 
										label={`🎉 Праздников: ${holidaysStats.total}`} 
										variant="default" 
									/>
								)}
								{weekendDaysCount > 0 && (
									<TagChip 
										label={`🏖️ Выходных: ${weekendDaysCount}`} 
										variant="default" 
									/>
								)}
							</>
						) : (
							<p className="page-subtitle" style={{ margin: 0 }}>
								Календарь доп работы — отмечайте дни, когда выполняли доп работу
							</p>
						)}
					</div>
					{tasksWithDates.length === 0 && tasks.length > 0 && (
						<p style={{ 
							color: 'var(--muted)', 
							fontSize: `var(--font-size-sm)`, 
							marginTop: `var(--space-sm)`, 
							display: 'flex', 
							alignItems: 'center', 
							gap: 6 
						}}>
							<LightbulbIcon size={iconSizeSm} color="var(--muted)" />
							<span>Добавьте дату начала или дедлайн к задачам, чтобы они отображались в календаре</span>
						</p>
					)}
				</div>
				<div style={{ 
					display: 'flex', 
					alignItems: 'center', 
					gap: `var(--space-md)`,
					background: 'var(--panel)',
					border: 'var(--border-default)',
					borderRadius: 'var(--radius-pill)',
					padding: `var(--space-sm) var(--space-md)`,
					boxShadow: 'var(--shadow-sm)',
				}}>
					<Button 
						onClick={prevMonth} 
						variant="ghost"
						size="sm"
						style={{ width: `${controlSize}px`, height: `${controlSize}px`, padding: 0 }}
						title="Предыдущий месяц"
					>
						<ChevronLeftIcon size={iconSizeMd} color="currentColor" />
					</Button>
					<div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 'var(--space-xs)', minWidth: 'fit-content' }}>
						<span style={{ 
							fontWeight: 'var(--font-weight-semibold)',
							fontSize: `var(--font-size-md)`,
							color: 'var(--text)',
							whiteSpace: 'nowrap',
						}}>
							{currentMonth.toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' })}
						</span>
					</div>
					<Button 
						onClick={nextMonth} 
						variant="ghost"
						size="sm"
						style={{ width: `${controlSize}px`, height: `${controlSize}px`, padding: 0 }}
						title="Следующий месяц"
					>
						<ChevronRightIcon size={iconSizeMd} color="currentColor" />
					</Button>
					<Button 
						onClick={handleShowHolidaysModal} 
						variant="ghost"
						size="sm"
						style={{ width: `${controlSize}px`, height: `${controlSize}px`, padding: 0, marginLeft: `var(--space-sm)` }}
						title="Управление праздниками"
					>
						<svg width={iconSizeMd} height={iconSizeMd} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
							<path d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
						</svg>
					</Button>
				</div>
			</div>

			{activeTab === 'main' ? (
				<div
					ref={calendarRef}
					className="scroll-fade"
					data-scroll-active={calendarHasOverflow ? 'true' : 'false'}
					style={{ 
						display: 'grid', 
						gridTemplateColumns: 'repeat(7, minmax(0, 1fr))', 
						gap: `var(--space-sm)`, 
						background: 'var(--panel)', 
						padding: `var(--space-md)`, 
						borderRadius: 'var(--radius-l)', 
						border: 'var(--border-default)',
						overflowY: 'auto',
						flex: 1,
						minHeight: 0,
						width: '100%',
						boxSizing: 'border-box',
						'--scroll-fade-to': 'var(--panel)',
						'--scroll-fade-offset-x': 'var(--space-md)',
					} as React.CSSProperties}
				>
				{WEEK_DAYS.map((d) => (
					<div 
						key={d} 
						style={{ 
							textAlign: 'center', 
							fontWeight: 'var(--font-weight-bold)', 
							padding: `var(--space-sm)`, 
							color: 'var(--text)', 
							fontSize: `var(--font-size-sm)` 
						}}
					>
						{d}
					</div>
				))}
				{days.map((d, i) => {
					const key = getDateKeyFromDate(d);
					const dayTasks = tasksByDay.get(key) || [];
					const isCurrentMonth = d.getMonth() === currentMonth.getMonth();
					const today = new Date();
					const dayKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
					const todayKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
					const isToday = dayKey === todayKey;
					const isWeekend = isWeekendDay(d, settings.excludedWeekends || [], settings.customWeekends || [], settings.holidays || []);
					const holidays = getHolidaysForDay(d, settings.holidays || []);
					const holiday = holidays.length > 0 ? holidays[0] : null;

					return (
						<CalendarDayCell
							key={`${key}-${i}`}
							day={d}
							index={i}
							dayTasks={dayTasks}
							isCurrentMonth={isCurrentMonth}
							isToday={isToday}
							isWeekend={isWeekend}
							holidays={holidays}
							holiday={holiday}
							customers={customers}
							onDayClick={handleDayClick}
							viewportKey={viewportVersion}
						/>
					);
				})}
			</div>
			) : (
				<ExtraWorkCalendar 
					extraWorks={extraWorks}
					currentMonth={currentMonth}
					onAddExtraWork={handleAddExtraWork}
					onUpdateExtraWork={handleUpdateExtraWork}
					onRemoveExtraWork={handleRemoveExtraWork}
				/>
			)}

			{selectedDay && activeTab === 'main' && (
				<Modal 
					open={!!selectedDay} 
					onClose={closeDayModal} 
					title={selectedDay.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' })} 
					width={MODAL_WIDTH_LG}
				>
					{(() => {
						const dateKey = getDateKeyFromDate(selectedDay);
						const isStandardWeekend = selectedDay.getDay() === 0 || selectedDay.getDay() === 6;
						const isExcluded = settings.excludedWeekends?.includes(dateKey) || false;
						const isCustomWeekend = settings.customWeekends?.includes(dateKey) || false;
						const isWeekend = (isStandardWeekend && !isExcluded) || isCustomWeekend;

						return (
							<div style={{ 
								marginBottom: `var(--space-lg)`, 
								padding: `var(--space-md)`, 
								background: 'var(--bg)', 
								borderRadius: 'var(--radius-md)', 
								border: 'var(--border-default)' 
							}}>
								<div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
									<span style={{ fontWeight: 'var(--font-weight-semibold)', color: 'var(--text)' }}>
										{isWeekend ? 'Выходной' : 'Рабочий'}
									</span>
									<div
										onClick={handleToggleDayWeekendClick}
										style={{
											width: TOGGLE_WIDTH,
											height: TOGGLE_HEIGHT,
											borderRadius: 'var(--radius-lg)',
											background: isWeekend ? 'var(--accent)' : 'var(--border)',
											position: 'relative',
											cursor: 'pointer',
											transition: 'var(--transition-base)',
										}}
									>
										<div
											style={{
												width: TOGGLE_THUMB_SIZE,
												height: TOGGLE_THUMB_SIZE,
												borderRadius: '50%',
												background: 'var(--white)',
												position: 'absolute',
												top: TOGGLE_THUMB_OFFSET,
												left: isWeekend ? TOGGLE_THUMB_ACTIVE_OFFSET : TOGGLE_THUMB_OFFSET,
												transition: 'var(--transition-base)',
												boxShadow: 'var(--shadow-sm)',
											}}
										/>
									</div>
								</div>
							</div>
						);
					})()}
					{(() => {
						const dateKey = getDateKeyFromDate(selectedDay);
						const isStandardWeekend = selectedDay.getDay() === 0 || selectedDay.getDay() === 6;
						const isExcluded = settings.excludedWeekends?.includes(dateKey) || false;
						const isCustomWeekend = settings.customWeekends?.includes(dateKey) || false;
						const isWeekend = (isStandardWeekend && !isExcluded) || isCustomWeekend;

						if (isWeekend) {
							if (selectedDayTasks.length === 0) {
								return (
									<div style={{ 
										marginBottom: `var(--space-lg)`, 
										padding: `var(--space-md)`, 
										background: 'var(--bg)', 
										borderRadius: 'var(--radius-md)', 
										border: 'var(--border-default)' 
									}}>
										<p style={{ margin: 0, color: 'var(--muted)', marginBottom: `var(--space-md)` }}>
											Нет задач, которые могли бы попасть на эту дату. Вы можете добавить задачу.
										</p>
										<Button 
											onClick={handleCreateTaskForSelectedDay}
											variant="primary"
										>
											<PlusIcon size={iconSizeSm} color="currentColor" />
											<span>Добавить задачу</span>
										</Button>
									</div>
								);
							}

							return (
								<div style={{ 
									marginBottom: `var(--space-lg)`, 
									padding: `var(--space-md)`, 
									background: 'var(--bg)', 
									borderRadius: 'var(--radius-md)', 
									border: 'var(--border-default)' 
								}}>
									<p style={{ 
										margin: 0, 
										color: 'var(--muted)', 
										fontSize: `var(--font-size-sm)`, 
										marginBottom: `var(--space-md)` 
									}}>
										Выберите задачи, которые вы хотите сделать:
									</p>
									<div style={{ display: 'flex', flexDirection: 'column', gap: `var(--space-sm)` }}>
										{selectedDayTasks.map((t) => {
											const isSelected = selectedWeekendTasks.includes(t.id);
											const customer = customers.find((c) => c.id === t.customerId);
											return (
												<div
													key={t.id}
													onClick={() => toggleWeekendTask(t.id)}
													style={{
														padding: `var(--space-md)`,
														background: isSelected ? 'var(--accent)' : 'var(--panel)',
														border: `2px solid ${isSelected ? 'var(--accent)' : 'var(--border)'}`,
														borderRadius: 'var(--radius-md)',
														cursor: 'pointer',
														transition: 'var(--transition-base)',
														display: 'flex',
														alignItems: 'center',
														gap: `var(--space-md)`,
													}}
												>
													<div
														style={{
															width: WEEKEND_TASK_CHECKBOX_SIZE,
															height: WEEKEND_TASK_CHECKBOX_SIZE,
															borderRadius: 'var(--radius-md)',
															border: `2px solid ${isSelected ? 'var(--white)' : 'var(--border)'}`,
															background: isSelected ? 'var(--white)' : 'transparent',
															display: 'flex',
															alignItems: 'center',
															justifyContent: 'center',
															flexShrink: 0,
														}}
													>
														{isSelected && (
															<svg width={iconSizeXs} height={iconSizeXs} viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
																<polyline points="20 6 9 17 4 12" />
															</svg>
														)}
													</div>
													<div style={{ flex: 1, minWidth: 0 }}>
														<div style={{ 
															fontWeight: 'var(--font-weight-semibold)', 
															color: isSelected ? 'var(--white)' : 'var(--text)', 
															marginBottom: `var(--space-xs)` 
														}}>
															{t.title}
														</div>
														<div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-xs)' }}>
															{customer && (
																<div style={{ 
																	fontSize: `var(--font-size-xs)`, 
																	color: isSelected ? 'color-mix(in srgb, var(--white) 80%, transparent)' : 'var(--muted)' 
																}}>
																	{customer.name}
																</div>
															)}
															{t.amount && (
																<div style={{ 
																	fontSize: `var(--font-size-xs)`, 
																	color: isSelected ? 'color-mix(in srgb, var(--white) 80%, transparent)' : 'var(--muted)' 
																}}>
																	Бюджет: {formatCurrencyRub(t.amount)}
																</div>
															)}
														</div>
													</div>
												</div>
											);
										})}
									</div>
								</div>
							);
						}

						if (selectedDayTasks.length === 0) {
							return (
								<div style={{ 
									marginBottom: `var(--space-lg)`, 
									padding: `var(--space-md)`, 
									background: 'var(--bg)', 
									borderRadius: 'var(--radius-md)', 
									border: 'var(--border-default)' 
								}}>
									<p style={{ margin: 0, color: 'var(--muted)', marginBottom: `var(--space-md)` }}>
										На этот день нет задач. Вы можете добавить задачу.
									</p>
									<Button 
										onClick={handleCreateTaskForSelectedDay}
										variant="primary"
									>
										<svg width={iconSizeSm} height={iconSizeSm} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
											<line x1="12" y1="5" x2="12" y2="19" />
											<line x1="5" y1="12" x2="19" y2="12" />
										</svg>
										<span>Добавить задачу</span>
									</Button>
								</div>
							);
						}

						return null;
					})()}
					{(() => {
						const dateKey = getDateKeyFromDate(selectedDay);
						const isStandardWeekend = selectedDay.getDay() === 0 || selectedDay.getDay() === 6;
						const isExcluded = settings.excludedWeekends?.includes(dateKey) || false;
						const isCustomWeekend = settings.customWeekends?.includes(dateKey) || false;
						const isWeekend = (isStandardWeekend && !isExcluded) || isCustomWeekend;

						const tasksToShow = isWeekend 
							? selectedDayTasks.filter((t) => selectedWeekendTasks.includes(t.id))
							: selectedDayTasks;

						if (tasksToShow.length === 0) return null;

						return (
							<div style={{ display: 'flex', flexDirection: 'column', gap: `var(--space-md)` }}>
								{tasksToShow.map((t) => {
									const customer = customers.find((c) => c.id === t.customerId);
									return (
										<TaskModalCard
											key={t.id}
											task={t}
											customer={customer}
											onEdit={handleEditTask}
											showPriority={true}
											showEditButton={true}
										/>
									);
								})}
							</div>
						);
					})()}
				</Modal>
			)}

			<TaskFormModal 
				open={showTaskForm} 
				initial={editingTask} 
				onClose={handleTaskFormClose} 
			/>

			{showHolidaysModal && (
				<HolidaysModal 
					holidays={settings.holidays || []}
					onClose={handleCloseHolidaysModal}
					onSave={handleSaveHolidays}
				/>
			)}
		</div>
	);
}
