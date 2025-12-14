import React from 'react';
import { TextInput, Avatar } from '@/shared/ui';
import { ClearButton } from './ClearButton';
import { getToken } from '@/shared/lib/tokens';
import type { Customer } from '@/types';

type CustomerPickerProps = {
	value: string;
	search: string;
	customers: Customer[];
	filteredCustomers: Customer[];
	showPicker: boolean;
	onChange: (value: string) => void;
	onSearchChange: (value: string) => void;
	onClear: () => void;
	onFocus: () => void;
	onBlur: () => void;
	onSelect: (customerId: string) => void;
	onDoubleClick?: (e: React.MouseEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
	delayShort: number;
};

export function CustomerPicker({
	value,
	search,
	customers,
	filteredCustomers,
	showPicker,
	onChange,
	onSearchChange,
	onFocus,
	onBlur,
	onSelect,
	onClear,
	onDoubleClick,
	delayShort,
}: CustomerPickerProps): React.ReactElement {
	const iconSizeXl = React.useMemo(() => getToken('--icon-size-xl', 32), []);
	
	return (
		<div style={{ position: 'relative', width: '100%' }}>
			<TextInput
				value={value && customers ? (customers.find((c) => c.id === value)?.name || '') : search}
				onChange={(e) => { onSearchChange((e.target as HTMLInputElement).value); }}
				onDoubleClick={onDoubleClick}
				onFocus={onFocus}
				onBlur={() => setTimeout(onBlur, delayShort)}
				placeholder="Поиск или выберите заказчика"
				style={{ width: '100%', paddingRight: value ? 'var(--space-lg)' : 'var(--space-sm)', boxSizing: 'border-box' }}
			/>
			{value && <ClearButton onClick={onClear} />}
			{showPicker && (
				<div style={{
					position: 'absolute',
					top: '100%',
					left: 0,
					right: 0,
					background: 'var(--white)',
					border: 'var(--border-width) solid var(--border)',
					borderRadius: 'var(--radius-md)',
					marginTop: 'var(--space-xs)',
					maxHeight: 'calc(var(--space-xxl) * 3)',
					overflowY: 'auto',
					zIndex: 'var(--z-index-modal)',
					boxShadow: 'var(--shadow-sm)',
				}}>
					{filteredCustomers.length === 0 ? (
						<div style={{ padding: 'var(--space-sm)', color: 'var(--muted)' }}>Не найдено</div>
					) : (
						filteredCustomers.map((c) => (
							<div
								key={c.id}
								onClick={() => onSelect(c.id)}
								style={{
									padding: 'var(--space-sm)',
									cursor: 'pointer',
									display: 'flex',
									alignItems: 'center',
									gap: 'var(--space-sm)',
									borderBottom: 'var(--border-width) solid var(--border)',
								}}
								onMouseEnter={(e: React.MouseEvent<Element>) => {
									(e.currentTarget as HTMLElement).style.background = 'var(--bg)';
								}}
								onMouseLeave={(e: React.MouseEvent<Element>) => {
									(e.currentTarget as HTMLElement).style.background = '';
								}}
							>
								<Avatar src={c.avatar} alt={c.name} size={iconSizeXl} />
								<div>
									<div style={{ fontWeight: 'var(--font-weight-medium)' }}>{c.name}</div>
									{c.contact && <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--muted)' }}>{c.contact}</div>}
								</div>
							</div>
						))
					)}
				</div>
			)}
		</div>
	);
}

