import React from 'react';
import type { Customer } from '@/store/customers';
import { formatCurrencyRub } from '@/shared/lib/format';
import { TrashIcon, EditIcon, UsersIcon } from '@/shared/components/Icons';
import IconButton from '@/shared/components/IconButton';
import { Avatar, colorFromName } from '@/shared/ui';
import { normalizeAvatarPath } from '../utils/avatarUtils';
import type { CustomerStats } from '../utils/customerStats';
import { getToken } from '@/shared/lib/tokens';
import {
	CUSTOMER_CARD_HEADER_GAP,
	CUSTOMER_CARD_HEADER_MARGIN_BOTTOM,
	CUSTOMER_CARD_AVATAR_SIZE,
	CUSTOMER_CARD_COMMENT_PADDING,
	CUSTOMER_CARD_COMMENT_MARGIN_BOTTOM,
	CUSTOMER_CARD_STATS_PADDING,
	CUSTOMER_CARD_STATS_MARGIN_BOTTOM,
	CUSTOMER_CARD_STATS_GRID_GAP,
} from '../utils/constants';

type CustomerCardProps = {
	customer: Customer;
	stats: CustomerStats;
	onEdit: (customer: Customer) => void;
	onDelete: (id: string) => void;
	onViewProfile: (customer: Customer) => void;
};

/**
 * Компонент карточки заказчика
 */
export function CustomerCard({ customer, stats, onEdit, onDelete, onViewProfile }: CustomerCardProps): React.ReactElement {
	const iconSizeSm = React.useMemo(() => getToken('--icon-size-sm', 16), []);
	const avatarSize = React.useMemo(() => getToken('--avatar-size-md', 48), []);
	const hasContacts = !!(customer.contacts && customer.contacts.length > 0) || !!customer.contact;
	return (
		<div className="customer-card">
			<div style={{ 
				display: 'flex', 
				alignItems: 'center', 
				gap: CUSTOMER_CARD_HEADER_GAP, 
				marginBottom: CUSTOMER_CARD_HEADER_MARGIN_BOTTOM 
			}}>
				<Avatar 
					src={normalizeAvatarPath(customer.avatar)} 
					alt={customer.name} 
					size={avatarSize} 
					backgroundColor={colorFromName(customer.name)} 
				/>
				<div style={{ flex: 1, minWidth: 0 }}>
					<div style={{ 
						fontWeight: 'var(--font-weight-semibold)'
					}}>
						{customer.name}
					</div>
				</div>
				<div style={{ 
					display: 'flex', 
					gap: 'var(--space-xs)', 
					alignItems: 'center', 
					marginRight: 'calc(var(--space-xs) * -1)' 
				}}>
					{hasContacts && (
						<IconButton 
							icon={UsersIcon} 
							title="Контакты" 
							onClick={(e) => {
								e.stopPropagation();
								onViewProfile(customer);
							}} 
							hover="accent" 
						/>
					)}
					<IconButton 
						icon={EditIcon} 
						title="Редактировать" 
						onClick={() => onEdit(customer)} 
						hover="accent" 
					/>
					<IconButton 
						icon={TrashIcon} 
						title="Удалить" 
						onClick={() => onDelete(customer.id)} 
						hover="danger" 
					/>
				</div>
			</div>
			
			{customer.comment && (
				<div style={{ 
					marginBottom: CUSTOMER_CARD_COMMENT_MARGIN_BOTTOM, 
					padding: CUSTOMER_CARD_COMMENT_PADDING, 
					background: 'var(--bg)', 
					borderRadius: 'var(--radius-md)', 
					border: 'var(--border-default)' 
				}}>
					<div style={{ 
						fontSize: 'var(--font-size-xs)', 
						color: 'var(--muted)', 
						whiteSpace: 'pre-wrap', 
						lineHeight: 'var(--line-height-relaxed)' 
					}}>
						{customer.comment}
					</div>
				</div>
			)}
			
			{stats.tasks > 0 && (
				<div style={{ 
					padding: CUSTOMER_CARD_STATS_PADDING, 
					background: 'var(--bg)', 
					borderRadius: 'var(--radius-md)', 
					border: 'var(--border-default)' 
				}}>
					<div style={{ 
						fontSize: 'var(--font-size-sm)', 
						fontWeight: 'var(--font-weight-semibold)', 
						color: 'var(--muted)', 
						marginBottom: 'var(--space-sm)' 
					}}>
						Статистика
					</div>
					<div style={{ 
						display: 'grid', 
						gridTemplateColumns: '1fr 1fr', 
						gap: CUSTOMER_CARD_STATS_GRID_GAP, 
						fontSize: 'var(--font-size-sm)' 
					}}>
						<div>
							<div style={{ color: 'var(--muted)', fontSize: 'var(--font-size-xs)' }}>Задач</div>
							<div style={{ fontWeight: 'var(--font-weight-semibold)', color: 'var(--text)' }}>
								{stats.tasks}
							</div>
						</div>
						<div>
							<div style={{ color: 'var(--muted)', fontSize: 'var(--font-size-xs)' }}>Оплачено</div>
							<div style={{ fontWeight: 'var(--font-weight-semibold)', color: 'var(--green)' }}>
								{formatCurrencyRub(stats.paidAmount)}
							</div>
						</div>
						<div>
							<div style={{ color: 'var(--muted)', fontSize: 'var(--font-size-xs)' }}>Ожидается</div>
							<div style={{ fontWeight: 'var(--font-weight-semibold)', color: 'var(--accent)' }}>
								{formatCurrencyRub(stats.remaining)}
							</div>
						</div>
						<div>
							<div style={{ color: 'var(--muted)', fontSize: 'var(--font-size-xs)' }}>Расходы</div>
							<div style={{ fontWeight: 'var(--font-weight-semibold)', color: 'var(--red)' }}>
								{formatCurrencyRub(stats.expenses)}
							</div>
						</div>
						<div>
							<div style={{ color: 'var(--muted)', fontSize: 'var(--font-size-xs)' }}>Прибыль</div>
							<div style={{ 
								fontWeight: 'var(--font-weight-semibold)', 
								color: stats.profit >= 0 ? 'var(--green)' : 'var(--red)' 
							}}>
								{formatCurrencyRub(stats.profit)}
							</div>
						</div>
					</div>
				</div>
			)}
		</div>
	);
}

