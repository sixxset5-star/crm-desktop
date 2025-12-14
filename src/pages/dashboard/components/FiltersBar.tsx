import React from 'react';
import type { ColumnId, TaskPriority } from '@/types';
import type { Customer, Contractor } from '@/types';
import { Button, Select, TextInput, TagChip, Checkbox } from '@/shared/ui';

type FiltersBarProps = {
	searchInput: string;
	onSearchInputChange: (value: string) => void;
	filterCustomer: string;
	onCustomerChange: (value: string) => void;
	filterContractor: string;
	onContractorChange: (value: string) => void;
	filterStatus: ColumnId | 'all';
	onStatusChange: (value: ColumnId | 'all') => void;
	filterPriority: TaskPriority | 'all';
	onPriorityChange: (value: TaskPriority | 'all') => void;
	filterTags: string;
	onTagsChange: (value: string) => void;
	filterStartDate: string;
	filterEndDate: string;
	onDateChange: (range: { start: string; end: string }) => void;
	filterAssigneeChanged: boolean;
	onAssigneeChangedChange: (value: boolean) => void;
	onReset: () => void;
	hasActiveFilters: boolean;
	customers: Customer[];
	contractors: Contractor[];
	statusOptions: Array<{ id: ColumnId | 'all'; label: string }>;
	availableTags: string[];
};

export function FiltersBar({
	searchInput,
	onSearchInputChange,
	filterCustomer,
	onCustomerChange,
	filterContractor,
	onContractorChange,
	filterStatus,
	onStatusChange,
	filterPriority,
	onPriorityChange,
	filterTags,
	onTagsChange,
	filterStartDate,
	filterEndDate,
	onDateChange,
	filterAssigneeChanged,
	onAssigneeChangedChange,
	onReset,
	hasActiveFilters,
	customers,
	contractors,
	statusOptions,
	availableTags,
}: FiltersBarProps): React.ReactElement {
	const [advancedOpen, setAdvancedOpen] = React.useState(false);
	const selectedTags = React.useMemo(() => {
		return filterTags
			.split(',')
			.map((tag) => tag.trim())
			.filter((tag) => tag.length > 0);
	}, [filterTags]);

	function toggleTag(tag: string) {
		const normalized = tag.trim();
		if (!normalized) return;
		const next = selectedTags.includes(normalized)
			? selectedTags.filter((t) => t !== normalized)
			: [...selectedTags, normalized];
		onTagsChange(next.join(','));
	}

	React.useEffect(() => {
		if (hasActiveFilters) {
			setAdvancedOpen(true);
		}
	}, [hasActiveFilters]);

	return (
		<div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)', marginBottom: 'var(--space-md)' }}>
			<div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
				<TextInput
					size="sm"
					value={searchInput}
					onChange={(e) => onSearchInputChange((e.target as HTMLInputElement).value)}
					placeholder="Поиск по названию или заметкам"
					style={{ flex: '1 1 260px', minWidth: 200 }}
				/>
				<Button
					variant="action"
					size="sm"
					onClick={() => setAdvancedOpen((prev) => !prev)}
					style={{
						display: 'inline-flex',
						alignItems: 'center',
						gap: 8,
					}}
				>
					{advancedOpen ? 'Скрыть фильтры' : 'Доп. фильтры'}
					{hasActiveFilters && <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--accent)' }} />}
				</Button>
			</div>

			{advancedOpen && (
				<div style={{ 
					display: 'grid', 
					gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', 
					gap: 'var(--space-sm)',
					alignItems: 'flex-start'
				}}>
					<Field label="Заказчик">
						<Select size="xs" value={filterCustomer} onChange={(e) => onCustomerChange((e.target as HTMLSelectElement).value)}>
							<option value="all">Все заказчики</option>
							{customers.map((c) => (
								<option key={c.id} value={c.id}>{c.name}</option>
							))}
						</Select>
					</Field>
					<Field label="Исполнитель">
						<Select size="xs" value={filterContractor} onChange={(e) => onContractorChange((e.target as HTMLSelectElement).value)}>
							<option value="all">Все</option>
							<option value="none">Без исполнителя</option>
							{contractors.map((c) => (
								<option key={c.id} value={c.id}>{c.name}</option>
							))}
						</Select>
					</Field>
					<Field label="Статус">
						<Select size="xs" value={filterStatus} onChange={(e) => onStatusChange((e.target as HTMLSelectElement).value as ColumnId | 'all')}>
							{statusOptions.map((status) => (
								<option key={status.id} value={status.id}>{status.label}</option>
							))}
						</Select>
					</Field>
					<Field label="Приоритет">
						<Select size="xs" value={filterPriority} onChange={(e) => onPriorityChange((e.target as HTMLSelectElement).value as TaskPriority | 'all')}>
							<option value="all">Все приоритеты</option>
							<option value="high">Высокий</option>
							<option value="medium">Средний</option>
							<option value="low">Низкий</option>
						</Select>
					</Field>
					<div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-xs)' }}>
						<label style={{ fontSize: 'var(--font-size-xs)', color: 'var(--muted)', fontWeight: 500 }}>Теги</label>
						{availableTags.length === 0 ? (
							<span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--muted)' }}>Теги появятся, когда вы добавите их к задачам</span>
						) : (
							<div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
								{availableTags.map((tag) => {
									const isActive = selectedTags.includes(tag);
									return (
										<TagChip
											key={tag}
											label={tag}
											variant={isActive ? 'accent' : 'ghost'}
											onClick={(e) => {
												e.stopPropagation();
												toggleTag(tag);
											}}
										/>
									);
								})}
								{selectedTags.length > 0 && (
									<Button 
										variant="action" 
										size="xs" 
										type="button"
										onClick={(e) => {
											e.preventDefault();
											e.stopPropagation();
											onTagsChange('');
										}}
									>
										Очистить
									</Button>
								)}
							</div>
						)}
					</div>
					<Field label="Период с">
						<TextInput
							size="xs"
							type="date"
							value={filterStartDate}
							onChange={(e) => onDateChange({ start: (e.target as HTMLInputElement).value, end: filterEndDate })}
							placeholder="С даты"
						/>
					</Field>
					<Field label="Период до">
						<TextInput
							size="xs"
							type="date"
							value={filterEndDate}
							onChange={(e) => onDateChange({ start: filterStartDate, end: (e.target as HTMLInputElement).value })}
							placeholder="До даты"
						/>
					</Field>
					<Field label="">
						<label style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-xs)', cursor: 'pointer' }}>
							<Checkbox
								checked={filterAssigneeChanged}
								onChange={(e) => onAssigneeChangedChange((e.target as HTMLInputElement).checked)}
							/>
							<span style={{ fontSize: 'var(--font-size-sm)' }}>Только задачи с изменённым исполнителем</span>
						</label>
					</Field>
					{hasActiveFilters && (
						<div style={{ display: 'flex', alignItems: 'flex-end' }}>
							<Button onClick={onReset} variant="action" size="sm">
								Сбросить фильтры
							</Button>
						</div>
					)}
				</div>
			)}
		</div>
	);
}

function Field({ label, children }: { label: string; children: React.ReactNode }): React.ReactElement {
	return (
		<label style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-xs)', fontSize: 'var(--font-size-xs)', color: 'var(--muted)', fontWeight: 500 }}>
			<span>{label}</span>
			{children}
		</label>
	);
}


