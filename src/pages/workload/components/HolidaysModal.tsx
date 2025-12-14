import React, { useState, useMemo } from 'react';
import { Button, Modal, TextInput, Checkbox } from '@/shared/ui';
import IconButton from '@/shared/components/IconButton';
import { EditIcon, TrashIcon } from '@/shared/components/Icons';
import { getHolidayTheme, type StoredHoliday } from '../utils/holidayUtils';
import { MODAL_WIDTH_LG } from '../utils/constants';
import { getToken } from '@/shared/lib/tokens';
import { generateShortId } from '@/shared/utils/id';

type HolidaysModalProps = {
	holidays: StoredHoliday[];
	onClose: () => void;
	onSave: (holidays: StoredHoliday[]) => void;
};

export function HolidaysModal({ 
	holidays, 
	onClose, 
	onSave 
}: HolidaysModalProps): React.ReactElement {
	const [localHolidays, setLocalHolidays] = useState(holidays);
	const [editingHoliday, setEditingHoliday] = useState<StoredHoliday | null>(null);
	const [newHolidayDate, setNewHolidayDate] = useState('');
	const [newHolidayName, setNewHolidayName] = useState('');
	const [newHolidayRecurring, setNewHolidayRecurring] = useState(false);

	// Мемоизируем значения токенов
	const iconSizeSm = useMemo(() => getToken('--icon-size-sm', 16), []);

	function handleAddHoliday() {
		if (!newHolidayDate || !newHolidayName.trim()) return;
		const newHoliday: StoredHoliday = {
			id: generateShortId(),
			date: newHolidayDate,
			name: newHolidayName.trim(),
			recurring: newHolidayRecurring,
		};
		setLocalHolidays([...localHolidays, newHoliday]);
		setNewHolidayDate('');
		setNewHolidayName('');
		setNewHolidayRecurring(false);
	}

	function handleDeleteHoliday(id: string) {
		setLocalHolidays(localHolidays.filter(h => h.id !== id));
		if (editingHoliday?.id === id) {
			setEditingHoliday(null);
		}
	}

	function handleEditHoliday(holiday: StoredHoliday) {
		setEditingHoliday(holiday);
		setNewHolidayDate(holiday.date);
		setNewHolidayName(holiday.name);
		setNewHolidayRecurring(holiday.recurring || false);
	}

	function handleCancelEdit() {
		setEditingHoliday(null);
		setNewHolidayDate('');
		setNewHolidayName('');
		setNewHolidayRecurring(false);
	}

	function handleUpdateHoliday() {
		if (!editingHoliday || !newHolidayDate || !newHolidayName.trim()) return;
		setLocalHolidays(localHolidays.map(h => 
			h.id === editingHoliday.id 
				? { ...h, date: newHolidayDate, name: newHolidayName.trim(), recurring: newHolidayRecurring }
				: h
		));
		handleCancelEdit();
	}

	function handleSave() {
		onSave(localHolidays);
		onClose();
	}

	// Сортируем праздники по дате (по возрастанию)
	const sortedHolidays = useMemo(() => {
		return [...localHolidays].sort((a, b) => {
			const dateA = new Date(a.date).getTime();
			const dateB = new Date(b.date).getTime();
			return dateA - dateB;
		});
	}, [localHolidays]);

	return (
		<Modal open={true} onClose={onClose} title="Управление праздниками" width={MODAL_WIDTH_LG}>
			<div style={{ 
				marginBottom: `var(--space-lg)`, 
				padding: `var(--space-md)`, 
				background: 'var(--bg)', 
				borderRadius: 'var(--radius-md)', 
				border: 'var(--border-default)' 
			}}>
				<h4 style={{ 
					margin: '0 0 var(--space-md) 0', 
					fontSize: `var(--font-size-sm)`, 
					fontWeight: 'var(--font-weight-semibold)' 
				}}>
					{editingHoliday ? 'Редактировать праздник' : 'Добавить праздник'}
				</h4>
				<div style={{ display: 'flex', flexDirection: 'column', gap: `var(--space-md)` }}>
					<div>
						<label style={{ 
							display: 'block', 
							marginBottom: `var(--space-xs)`, 
							fontSize: `var(--font-size-xs)`, 
							fontWeight: 'var(--font-weight-semibold)', 
							color: 'var(--muted)' 
						}}>
							Дата
						</label>
						<TextInput
							type="date"
							value={newHolidayDate}
							onChange={(e) => setNewHolidayDate((e.target as HTMLInputElement).value)}
						/>
					</div>
					<div>
						<label style={{ 
							display: 'block', 
							marginBottom: `var(--space-xs)`, 
							fontSize: `var(--font-size-xs)`, 
							fontWeight: 'var(--font-weight-semibold)', 
							color: 'var(--muted)' 
						}}>
							Название
						</label>
						<TextInput
							type="text"
							value={newHolidayName}
							onChange={(e) => setNewHolidayName((e.target as HTMLInputElement).value)}
							placeholder="Название праздника"
						/>
					</div>
					<div style={{ display: 'flex', alignItems: 'center', gap: `var(--space-sm)` }}>
						<Checkbox
							checked={newHolidayRecurring}
							onChange={(e) => setNewHolidayRecurring((e.target as HTMLInputElement).checked)}
						/>
						<label style={{ 
							fontSize: `var(--font-size-sm)`, 
							color: 'var(--text)', 
							cursor: 'pointer' 
						}}>
							Ежегодный праздник
						</label>
					</div>
					<div style={{ display: 'flex', gap: `var(--space-sm)` }}>
						{editingHoliday ? (
							<>
								<Button onClick={handleUpdateHoliday} variant="primary">Сохранить изменения</Button>
								<Button onClick={handleCancelEdit} variant="secondary">Отмена</Button>
							</>
						) : (
							<Button onClick={handleAddHoliday} variant="primary" style={{ alignSelf: 'flex-start' }}>
								Добавить
							</Button>
						)}
					</div>
				</div>
			</div>

			<div style={{ marginBottom: `var(--space-lg)` }}>
				<h4 style={{ 
					margin: '0 0 var(--space-md) 0', 
					fontSize: `var(--font-size-sm)`, 
					fontWeight: 'var(--font-weight-semibold)' 
				}}>
					Список праздников
				</h4>
				{sortedHolidays.length === 0 ? (
					<p style={{ color: 'var(--muted)', fontSize: `var(--font-size-sm)` }}>
						Праздников пока нет
					</p>
				) : (
					<div style={{ display: 'flex', flexDirection: 'column', gap: `var(--space-sm)` }}>
						{sortedHolidays.map((h) => {
							const holidayDate = new Date(h.date);
							const theme = getHolidayTheme(h.name, h.date);
							return (
								<div 
									key={h.id} 
									style={{ 
										padding: `var(--space-md)`, 
										background: 'var(--bg)', 
										border: 'var(--border-default)', 
										borderRadius: 'var(--radius-md)',
										display: 'flex',
										justifyContent: 'space-between',
										alignItems: 'center',
									}}
								>
									<div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: `var(--space-sm)` }}>
										{theme.icon && (
											<span style={{ fontSize: `var(--font-size-lg)` }}>{theme.icon}</span>
										)}
										<div>
											<div style={{ fontWeight: 'var(--font-weight-semibold)', marginBottom: `var(--space-xs)` }}>
												{h.name}
											</div>
											<div style={{ fontSize: `var(--font-size-xs)`, color: 'var(--muted)' }}>
												{holidayDate.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' })}
												{h.recurring && ' (ежегодный)'}
											</div>
										</div>
									</div>
									<div style={{ display: 'flex', gap: `var(--space-xs)`, alignItems: 'center' }}>
										<IconButton 
											onClick={() => handleEditHoliday(h)} 
											icon={EditIcon}
											title="Редактировать"
										/>
										<IconButton 
											onClick={() => handleDeleteHoliday(h.id)} 
											icon={TrashIcon}
											title="Удалить"
										/>
									</div>
								</div>
							);
						})}
					</div>
				)}
			</div>

			<div style={{ display: 'flex', gap: `var(--space-md)`, justifyContent: 'flex-end' }}>
				<Button onClick={onClose} variant="secondary">Отмена</Button>
				<Button onClick={handleSave} variant="primary">Сохранить</Button>
			</div>
		</Modal>
	);
}

