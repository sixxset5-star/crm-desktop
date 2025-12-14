/**
 * ContractorSelect - Компактный селект подрядчика/заказчика с чипами (аватарка + имя)
 */
import React from 'react';
import { CustomerChip } from '@/shared/ui/Elements';
import { normalizeAvatarPath } from '@/pages/contractors/utils/avatarUtils';

type SelectableItem = {
	id: string;
	name: string;
	isActive?: boolean; // Опционально для заказчиков
	avatar?: string;
};

type ContractorSelectProps = {
	value?: string;
	contractors: SelectableItem[];
	onChange: (itemId: string | undefined) => void;
	filterByActive?: boolean; // Фильтровать по isActive (для подрядчиков)
	normalizeAvatar?: boolean; // Нормализовать путь аватара (для подрядчиков)
	minHeight?: string; // Минимальная высота для пустого значения и чипа
};

export function ContractorSelect({
	value,
	contractors,
	onChange,
	filterByActive = true,
	normalizeAvatar = true,
	minHeight,
}: ContractorSelectProps): React.ReactElement {
	const [isOpen, setIsOpen] = React.useState(false);
	const containerRef = React.useRef<HTMLDivElement>(null);
	const filteredItems = filterByActive ? contractors.filter(c => c.isActive !== false) : contractors;
	const selectedItem = value ? filteredItems.find(c => c.id === value) : null;

	React.useEffect(() => {
		function handleClickOutside(event: MouseEvent) {
			if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
				setIsOpen(false);
			}
		}

		if (isOpen) {
			document.addEventListener('mousedown', handleClickOutside);
			return () => document.removeEventListener('mousedown', handleClickOutside);
		}
	}, [isOpen]);

	function handleSelect(itemId: string | undefined) {
		if (value === itemId) {
			onChange(undefined);
		} else {
			onChange(itemId);
		}
		setIsOpen(false);
	}

	function getAvatarUrl(avatar?: string): string | undefined {
		if (!avatar) return undefined;
		return normalizeAvatar ? normalizeAvatarPath(avatar) || undefined : avatar;
	}

	function handleToggle() {
		setIsOpen(!isOpen);
	}

	return (
		<div ref={containerRef} style={{ position: 'relative', minWidth: 'fit-content', maxWidth: '100%' }}>
			<div
				onClick={handleToggle}
				style={{
					display: 'inline-flex',
					alignItems: 'center',
					cursor: 'pointer',
					gap: 'var(--space-xs)',
					maxWidth: '100%',
				}}
			>
				{selectedItem ? (
					<div
						onClick={(e) => {
							e.stopPropagation();
							handleToggle();
						}}
						style={{ 
							cursor: 'pointer',
							display: 'flex',
							alignItems: 'center',
						}}
					>
						<CustomerChip
							name={selectedItem.name}
							avatarUrl={getAvatarUrl(selectedItem.avatar)}
							minHeight={minHeight}
						/>
					</div>
				) : (
					<div
						onClick={(e) => {
							e.stopPropagation();
							handleToggle();
						}}
						style={{ 
							cursor: 'pointer',
							display: 'inline-flex',
							alignItems: 'center',
							justifyContent: 'center',
							minHeight: minHeight || 'var(--control-sm-height)',
							padding: 'var(--chip-padding-y) var(--chip-padding-x)',
							borderRadius: 'var(--radius-pill)',
							background: 'var(--panel)',
							border: '1px solid var(--border)',
							color: 'var(--muted)',
							fontSize: 'var(--font-size-xs)',
							fontWeight: 500,
							...(minHeight ? { minWidth: `calc(${minHeight} * 1.5)` } : {}),
						}}
					>
						-
					</div>
				)}
			</div>
			{isOpen && filteredItems.length > 0 && (
				<div
					style={{
						position: 'absolute',
						top: '100%',
						left: 0,
						marginTop: 'var(--space-xs)',
						background: 'var(--white)',
						border: 'var(--border-default)',
						borderRadius: 'var(--radius-md)',
						boxShadow: 'var(--shadow-sm)',
						zIndex: 'var(--z-index-modal)',
						minWidth: 'max-content',
						maxHeight: '200px',
						overflowY: 'auto',
					}}
				>
					<div
						onClick={() => handleSelect(undefined)}
						style={{
							padding: 'var(--space-xs) var(--space-sm)',
							cursor: 'pointer',
							borderBottom: 'var(--border-width) solid var(--border)',
							background: !value ? 'var(--panel-hover)' : undefined,
						}}
						onMouseEnter={(e) => {
							(e.currentTarget as HTMLElement).style.background = 'var(--panel-hover)';
						}}
						onMouseLeave={(e) => {
							(e.currentTarget as HTMLElement).style.background = !value ? 'var(--panel-hover)' : '';
						}}
					>
						<div style={{ 
							display: 'inline-flex',
							alignItems: 'center',
							padding: 'var(--chip-padding-y) var(--chip-padding-x)',
							borderRadius: 'var(--radius-pill)',
							background: !value ? 'var(--accent)' : 'var(--panel)',
							border: '1px solid var(--border)',
							color: !value ? 'var(--white)' : 'var(--muted)',
							fontSize: 'var(--font-size-xs)',
							fontWeight: 500,
						}}>
							-
						</div>
					</div>
					{filteredItems.map((item) => {
						const isSelected = value === item.id;
						return (
							<div
								key={item.id}
								onClick={() => handleSelect(item.id)}
								style={{
									padding: 'var(--space-xs) var(--space-sm)',
									cursor: 'pointer',
									borderBottom: item.id === filteredItems[filteredItems.length - 1].id ? 'none' : 'var(--border-width) solid var(--border)',
									background: isSelected ? 'var(--panel-hover)' : undefined,
								}}
								onMouseEnter={(e) => {
									(e.currentTarget as HTMLElement).style.background = 'var(--panel-hover)';
								}}
								onMouseLeave={(e) => {
									(e.currentTarget as HTMLElement).style.background = isSelected ? 'var(--panel-hover)' : '';
								}}
							>
								<CustomerChip
									name={item.name}
									avatarUrl={getAvatarUrl(item.avatar)}
								/>
							</div>
						);
					})}
				</div>
			)}
		</div>
	);
}


