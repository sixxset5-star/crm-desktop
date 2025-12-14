import React from 'react';
import type { Contractor } from '@/types';
import { formatCurrencyRub } from '@/shared/lib/format';
import { EditIcon, UsersIcon, ArchiveIcon, XIcon, CheckIcon } from '@/shared/components/Icons';
import IconButton from '@/shared/components/IconButton';
import { Avatar, colorFromName } from '@/shared/ui';
import { normalizeAvatarPath } from '../utils/avatarUtils';
import type { ContractorStats } from '../utils/contractorStats';
import { getToken } from '@/shared/lib/tokens';
import styles from './ContractorCard.module.css';
import {
	CONTRACTOR_CARD_HEADER_GAP,
	CONTRACTOR_CARD_HEADER_MARGIN_BOTTOM,
	CONTRACTOR_CARD_AVATAR_SIZE,
	CONTRACTOR_CARD_COMMENT_PADDING,
	CONTRACTOR_CARD_COMMENT_MARGIN_BOTTOM,
	CONTRACTOR_CARD_STATS_PADDING,
	CONTRACTOR_CARD_STATS_MARGIN_BOTTOM,
	CONTRACTOR_CARD_STATS_GRID_GAP,
} from '../utils/constants';

type ContractorCardProps = {
	contractor: Contractor;
	stats: ContractorStats;
	onEdit: (contractor: Contractor) => void;
	onDeactivate: (id: string) => void;
	onActivate: (id: string) => void;
	onDelete?: (id: string) => void;
	onViewProfile: (contractor: Contractor) => void;
};

/**
 * Компонент карточки подрядчика
 */
export function ContractorCard({ contractor, stats, onEdit, onDeactivate, onActivate, onDelete, onViewProfile }: ContractorCardProps): React.ReactElement {
	const iconSizeSm = React.useMemo(() => getToken('--icon-size-sm', 16), []);
	const avatarSize = React.useMemo(() => getToken('--avatar-size-md', 48), []);
	const hasContacts = !!(contractor.contacts && contractor.contacts.length > 0) || !!contractor.contact;
	const isInactive = !contractor.isActive;
	
	return (
		<div className="contractor-card">
			<div style={{ 
				display: 'flex', 
				alignItems: 'center', 
				gap: CONTRACTOR_CARD_HEADER_GAP, 
				marginBottom: CONTRACTOR_CARD_HEADER_MARGIN_BOTTOM 
			}}>
				<Avatar 
					src={normalizeAvatarPath(contractor.avatar)} 
					alt={contractor.name} 
					size={avatarSize} 
					backgroundColor={colorFromName(contractor.name)} 
				/>
				<div style={{ flex: 1, minWidth: 0 }}>
					<div style={{ 
						display: 'flex',
						alignItems: 'center',
						gap: 0
					}}>
						{contractor.isActive && (
							<span className={styles.time} style={{ 
								display: 'inline-block',
								verticalAlign: 'middle'
							}} />
						)}
						<div style={{ 
							fontWeight: 'var(--font-weight-semibold)'
						}}>
							{contractor.name}
						</div>
						{isInactive && (
							<span style={{ 
								fontSize: 'var(--font-size-xs)', 
								color: 'var(--muted)',
								padding: 'var(--space-xs) var(--space-sm)',
								background: 'var(--bg)',
								borderRadius: 'var(--radius-pill)',
								border: 'var(--border-default)',
								marginLeft: 'var(--space-xs)'
							}}>
								Неактивен
							</span>
						)}
					</div>
					{contractor.specialization && (
						<div style={{ 
							fontSize: 'var(--font-size-xs)', 
							color: 'var(--muted)',
							marginTop: 'var(--space-xs)'
						}}>
							{contractor.specialization}
						</div>
					)}
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
								onViewProfile(contractor);
							}} 
							hover="accent" 
						/>
					)}
					<IconButton 
						icon={EditIcon} 
						title="Редактировать" 
						onClick={() => onEdit(contractor)} 
						hover="accent" 
					/>
					{contractor.isActive ? (
						<IconButton 
							icon={ArchiveIcon} 
							title="Деактивировать" 
							onClick={() => onDeactivate(contractor.id)} 
							hover="danger" 
						/>
					) : (
						<IconButton 
							icon={CheckIcon} 
							title="Активировать" 
							onClick={() => onActivate(contractor.id)} 
							hover="accent" 
						/>
					)}
					{onDelete && stats.tasksCount === 0 && (
						<IconButton 
							icon={XIcon} 
							title="Удалить (нет задач)" 
							onClick={() => onDelete(contractor.id)} 
							hover="danger" 
						/>
					)}
				</div>
			</div>
			
			{(contractor.comment || contractor.rate || contractor.rating) && (
				<div style={{ 
					marginBottom: CONTRACTOR_CARD_COMMENT_MARGIN_BOTTOM, 
					padding: CONTRACTOR_CARD_COMMENT_PADDING, 
					background: 'var(--bg)', 
					borderRadius: 'var(--radius-md)', 
					border: 'var(--border-default)',
					display: 'flex',
					flexDirection: 'column',
					gap: 'var(--space-xs)'
				}}>
					{contractor.comment && (
						<div style={{ 
							fontSize: 'var(--font-size-xs)', 
							color: 'var(--muted)', 
							whiteSpace: 'pre-wrap', 
							lineHeight: 'var(--line-height-relaxed)' 
						}}>
							{contractor.comment}
						</div>
					)}
					{(contractor.rate || contractor.rating) && (
						<div style={{ 
							display: 'flex',
							gap: 'var(--space-md)',
							fontSize: 'var(--font-size-xs)',
							color: 'var(--muted)'
						}}>
							{contractor.rate && (
								<div>
									<span style={{ fontWeight: 'var(--font-weight-semibold)' }}>Ставка: </span>
									{typeof contractor.rate === 'number' ? formatCurrencyRub(contractor.rate) : contractor.rate}
								</div>
							)}
							{contractor.rating && (
								<div>
									<span style={{ fontWeight: 'var(--font-weight-semibold)' }}>Рейтинг: </span>
									{contractor.rating}/5
								</div>
							)}
						</div>
					)}
				</div>
			)}
			
			{stats.tasksCount > 0 && (
				<div style={{ 
					padding: CONTRACTOR_CARD_STATS_PADDING, 
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
						gap: CONTRACTOR_CARD_STATS_GRID_GAP, 
						fontSize: 'var(--font-size-sm)' 
					}}>
						<div>
							<div style={{ color: 'var(--muted)', fontSize: 'var(--font-size-xs)' }}>Задач</div>
							<div style={{ fontWeight: 'var(--font-weight-semibold)', color: 'var(--text)' }}>
								{stats.tasksCount}
							</div>
						</div>
						<div>
							<div style={{ color: 'var(--muted)', fontSize: 'var(--font-size-xs)' }}>Выполнено</div>
							<div style={{ fontWeight: 'var(--font-weight-semibold)', color: 'var(--green)' }}>
								{stats.completedTasksCount}
							</div>
						</div>
						<div>
							<div style={{ color: 'var(--muted)', fontSize: 'var(--font-size-xs)' }}>Выплаты</div>
							<div style={{ fontWeight: 'var(--font-weight-semibold)', color: 'var(--red)' }}>
								{formatCurrencyRub(stats.totalExpenses)}
							</div>
						</div>
						<div>
							<div style={{ color: 'var(--muted)', fontSize: 'var(--font-size-xs)' }}>Прибыль/убыток</div>
							<div style={{ 
								fontWeight: 'var(--font-weight-semibold)', 
								color: stats.totalProfitOrLoss >= 0 ? 'var(--green)' : 'var(--red)' 
							}}>
								{formatCurrencyRub(stats.totalProfitOrLoss)}
							</div>
						</div>
					</div>
				</div>
			)}
		</div>
	);
}
