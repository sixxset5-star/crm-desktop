import React from 'react';
import type { Contractor, Contact, Task, Customer } from '@/types';
import { XIcon, StarIcon } from '@/shared/components/Icons';
import IconButton from '@/shared/components/IconButton';
import { Avatar, colorFromName } from '@/shared/ui';
import { normalizeAvatarPath } from '../utils/avatarUtils';
import { formatContactValue, getContactLink, formatCurrencyRub } from '@/shared/lib/format';
import { getToken } from '@/shared/lib/tokens';
import { ContractorTaskHistorySection } from './ContractorTaskHistorySection';
import { TaskModalCard } from '@/shared/components';
import { getTaskPaymentInfo } from '@/domain/task';
import { useCustomersStore } from '@/store/customers';
import { useShallowSelector } from '@/shared/hooks/useStoreSelectors';
import styles from './ContractorCard.module.css';

type ContractorProfileModalProps = {
	contractor: Contractor;
	tasks?: Task[]; // Задачи для отображения активных задач подрядчика
	stats?: { 
		totalExpenses: number; 
		totalProfitOrLoss: number; 
		totalEarned?: number;
		tasksCount?: number;
		completedTasksCount?: number;
	}; // Статистика подрядчика
	onClose: () => void;
};

/**
 * Иконка для типа контакта
 */
function ContactIcon({ type, size = 16 }: { type: string; size?: number }) {
	const iconStyle: React.CSSProperties = {
		width: size,
		height: size,
		flexShrink: 0,
	};

	switch (type) {
		case 'Telegram':
			return (
				<svg style={iconStyle} viewBox="0 0 24 24" fill="currentColor">
					<path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
				</svg>
			);
		case 'WhatsApp':
			return (
				<svg style={iconStyle} viewBox="0 0 24 24" fill="currentColor">
					<path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
				</svg>
			);
		case 'Email':
			return (
				<svg style={iconStyle} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
					<path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
					<polyline points="22,6 12,13 2,6" />
				</svg>
			);
		case 'Телефон':
			return (
				<svg style={iconStyle} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
					<path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
				</svg>
			);
		default:
			return (
				<svg style={iconStyle} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
					<circle cx="12" cy="12" r="10" />
					<line x1="12" y1="8" x2="12" y2="12" />
					<line x1="12" y1="16" x2="12.01" y2="16" />
				</svg>
			);
	}
}

/**
 * Компонент модального окна профиля подрядчика (только просмотр)
 */
export function ContractorProfileModal({ contractor, tasks = [], stats, onClose }: ContractorProfileModalProps): React.ReactElement {
	const modalWidth = React.useMemo(() => getToken('--modal-width-lg', 700), []);
	const avatarSize = React.useMemo(() => getToken('--avatar-size-xl', 120), []);
	const contacts = contractor.contacts || (contractor.contact ? [{ type: 'Другое', value: contractor.contact }] : []);
	const customers = useShallowSelector(useCustomersStore, (s) => s.customers);
	
	// Активные задачи подрядчика (незавершенные) - оптимизировано
	const activeTasks = React.useMemo(() => {
		if (!tasks || tasks.length === 0 || !contractor.isActive) return [];
		const unfinishedColumns = ['clients', 'unprocessed', 'notstarted', 'inwork', 'paused'];
		return tasks
			.filter(t => 
				t.contractorId === contractor.id && 
				unfinishedColumns.includes(t.columnId)
			)
			.slice(0, 10); // Ограничиваем для производительности
	}, [tasks, contractor.id, contractor.isActive]);

	return (
		<>
			<div className="modal-backdrop" onClick={onClose}>
				<div 
					className="modal" 
					onClick={(e) => e.stopPropagation()} 
					style={{ maxWidth: modalWidth }}
				>
				<div style={{ 
					display: 'flex', 
					justifyContent: 'space-between', 
					alignItems: 'flex-start',
					marginBottom: 'var(--space-lg)'
				}}>
					<div style={{ flex: 1 }}>
						<div style={{ 
							display: 'flex',
							alignItems: 'center',
							gap: 'var(--space-xs)',
							marginBottom: 'var(--space-xs)'
						}}>
							{contractor.isActive && (
								<span className={styles.time} style={{ 
									display: 'inline-block',
									verticalAlign: 'middle'
								}} />
							)}
							<h3 style={{ marginTop: 0, marginBottom: 0 }}>{contractor.name}</h3>
						</div>
						{contractor.specialization && (
							<div style={{ 
								fontSize: 'var(--font-size-sm)', 
								color: 'var(--muted)',
								marginBottom: 'var(--space-xs)'
							}}>
								{contractor.specialization}
							</div>
						)}
						{!contractor.isActive && (
							<span style={{ 
								fontSize: 'var(--font-size-xs)', 
								color: 'var(--muted)',
								padding: 'var(--space-xs) var(--space-sm)',
								background: 'var(--bg)',
								borderRadius: 'var(--radius-pill)',
								border: 'var(--border-default)',
								display: 'inline-block'
							}}>
								Неактивен
							</span>
						)}
					</div>
					<IconButton
						onClick={onClose}
						title="Закрыть"
						icon={XIcon}
						type="button"
						iconSize={20}
					/>
				</div>

				<div style={{ 
					display: 'flex', 
					flexDirection: 'column', 
					alignItems: 'center',
					gap: 'var(--space-lg)',
					paddingTop: 'var(--space-lg)'
				}}>
					<Avatar
						src={normalizeAvatarPath(contractor.avatar)}
						alt={contractor.name}
						size={avatarSize}
						backgroundColor={colorFromName(contractor.name)}
					/>

					{stats && (
						<div style={{ 
							width: '100%',
							display: 'grid',
							gridTemplateColumns: '1fr 1fr',
							gap: 'var(--space-md)',
							padding: 'var(--space-lg)',
							background: 'var(--bg)',
							borderRadius: 'var(--radius-md)',
							border: 'var(--border-default)'
						}}>
							<div style={{ textAlign: 'center' }}>
								<div style={{ 
									fontSize: 'var(--font-size-xs)', 
									color: 'var(--muted)',
									marginBottom: 'var(--space-sm)',
									fontWeight: 'var(--font-weight-medium)'
								}}>
									Заработал
								</div>
								<div style={{ 
									fontSize: 'var(--font-size-2xl)', 
									fontWeight: 'var(--font-weight-bold)',
									color: 'var(--green)'
								}}>
									{formatCurrencyRub(stats.totalEarned || 0)}
								</div>
							</div>
							<div style={{ textAlign: 'center' }}>
								<div style={{ 
									fontSize: 'var(--font-size-xs)', 
									color: 'var(--muted)',
									marginBottom: 'var(--space-sm)',
									fontWeight: 'var(--font-weight-medium)'
								}}>
									Получил
								</div>
								<div style={{ 
									fontSize: 'var(--font-size-2xl)', 
									fontWeight: 'var(--font-weight-bold)',
									color: 'var(--red)'
								}}>
									{formatCurrencyRub(stats.totalExpenses)}
								</div>
							</div>
						</div>
					)}

					{(contractor.rate || contractor.rating) && (
						<div style={{ 
							width: '100%',
							display: 'flex',
							gap: 'var(--space-md)',
							justifyContent: 'center',
							padding: 'var(--space-md)',
							background: 'var(--bg)',
							borderRadius: 'var(--radius-md)',
							border: 'var(--border-default)'
						}}>
							{contractor.rate && (
								<div style={{ textAlign: 'center' }}>
									<div style={{ 
										fontSize: 'var(--font-size-xs)', 
										color: 'var(--muted)',
										marginBottom: 'var(--space-xs)'
									}}>
										Ставка
									</div>
									<div style={{ 
										fontSize: 'var(--font-size-md)', 
										fontWeight: 'var(--font-weight-semibold)'
									}}>
										{typeof contractor.rate === 'number' ? formatCurrencyRub(contractor.rate) : contractor.rate}
									</div>
								</div>
							)}
							{contractor.rating && (
								<div style={{ textAlign: 'center' }}>
									<div style={{ 
										fontSize: 'var(--font-size-xs)', 
										color: 'var(--muted)',
										marginBottom: 'var(--space-xs)',
										display: 'flex',
										alignItems: 'center',
										justifyContent: 'center',
										gap: 'var(--space-xs)'
									}}>
										<span>Рейтинг</span>
										<StarIcon size={14} color="var(--muted)" />
									</div>
									<div style={{ 
										fontSize: 'var(--font-size-md)', 
										fontWeight: 'var(--font-weight-semibold)'
									}}>
										{contractor.rating}/5
									</div>
								</div>
							)}
						</div>
					)}

					{contacts.length > 0 && (
						<div style={{ 
							width: '100%',
							display: 'grid',
							gridTemplateColumns: '1fr 1fr',
							gap: 'var(--space-md)'
						}}>
							{contacts.map((contact, idx) => {
								const link = getContactLink(contact.type, contact.value);
								const displayValue = formatContactValue(contact.type, contact.value);
								const ContactItem = link ? 'a' : 'div';

								return (
									<ContactItem
										key={idx}
										href={link || undefined}
										onClick={(e: React.MouseEvent) => {
											if (link) {
												e.stopPropagation();
											}
										}}
										target={link && link.startsWith('http') ? '_blank' : undefined}
										rel={link && link.startsWith('http') ? 'noopener noreferrer' : undefined}
										style={{
											display: 'flex',
											alignItems: 'center',
											gap: 'var(--space-md)',
											padding: 'var(--space-md)',
											background: link ? 'var(--bg)' : 'transparent',
											border: 'var(--border-default)',
											borderRadius: 'var(--radius-md)',
											textDecoration: 'none',
											color: 'var(--text)',
											cursor: link ? 'pointer' : 'default',
											transition: 'all var(--transition-base)',
										}}
										onMouseEnter={(e) => {
											if (link) {
												const target = e.currentTarget as HTMLElement;
												target.style.background = 'var(--accent)';
												target.style.borderColor = 'var(--accent)';
												target.style.color = 'var(--white)';
												const iconContainer = target.querySelector('[data-contact-icon]') as HTMLElement;
												if (iconContainer) {
													iconContainer.style.color = 'var(--white)';
												}
											}
										}}
										onMouseLeave={(e) => {
											if (link) {
												const target = e.currentTarget as HTMLElement;
												target.style.background = 'var(--bg)';
												target.style.borderColor = 'var(--border)';
												target.style.color = 'var(--text)';
												const iconContainer = target.querySelector('[data-contact-icon]') as HTMLElement;
												if (iconContainer) {
													iconContainer.style.color = 'var(--accent)';
												}
											}
										}}
									>
										<div 
											data-contact-icon
											style={{ 
												width: 24, 
												height: 24, 
												display: 'flex', 
												alignItems: 'center', 
												justifyContent: 'center',
												color: link ? 'var(--accent)' : 'var(--muted)',
												transition: 'color var(--transition-base)',
											}}
										>
											<ContactIcon type={contact.type} size={24} />
										</div>
										<div style={{ flex: 1 }}>
											<div style={{ 
												fontSize: 'var(--font-size-xs)', 
												color: 'var(--muted)',
												marginBottom: 'var(--space-xs)'
											}}>
												{contact.type}
											</div>
											<div style={{ 
												fontSize: 'var(--font-size-md)', 
												fontWeight: 'var(--font-weight-medium)'
											}}>
												{displayValue}
											</div>
										</div>
									</ContactItem>
								);
							})}
						</div>
					)}

					{activeTasks.length > 0 && (
						<div style={{ 
							width: '100%',
							padding: 'var(--space-md)',
							background: 'var(--bg)',
							borderRadius: 'var(--radius-md)',
							border: 'var(--border-default)'
						}}>
							<div style={{ 
								fontSize: 'var(--font-size-xs)', 
								color: 'var(--muted)',
								marginBottom: 'var(--space-sm)',
								fontWeight: 'var(--font-weight-medium)'
							}}>
								Активные задачи ({activeTasks.length})
							</div>
							<div style={{ 
								display: 'flex',
								flexDirection: 'column',
								gap: 'var(--space-sm)'
							}}>
								{activeTasks.map((task) => {
									const customer = customers.find((c) => c.id === task.customerId);
									const paymentInfo = getTaskPaymentInfo(task);
									return (
										<TaskModalCard
											key={task.id}
											task={{
												id: task.id,
												title: task.title,
												amount: task.amount,
												deadline: task.deadline,
												startDate: task.startDate,
												priority: task.priority,
												customerId: task.customerId,
											}}
											customer={customer}
											showPriority={true}
											showEditButton={false}
											totalPaid={paymentInfo.totalPaid > 0 ? paymentInfo.totalPaid : undefined}
											background="var(--white)"
										/>
									);
								})}
							</div>
						</div>
					)}

					<ContractorTaskHistorySection contractorId={contractor.id} />

					{contractor.comment && (
						<div style={{ 
							width: '100%',
							padding: 'var(--space-md)',
							background: 'var(--bg)',
							borderRadius: 'var(--radius-md)',
							border: 'var(--border-default)'
						}}>
							<div style={{ 
								fontSize: 'var(--font-size-xs)', 
								color: 'var(--muted)',
								marginBottom: 'var(--space-sm)',
								fontWeight: 'var(--font-weight-medium)'
							}}>
								Заметка
							</div>
							<div style={{ 
								fontSize: 'var(--font-size-sm)', 
								color: 'var(--text)',
								whiteSpace: 'pre-wrap',
								lineHeight: 'var(--line-height-relaxed)'
							}}>
								{contractor.comment}
							</div>
						</div>
					)}
				</div>
				</div>
			</div>
		</>
	);
}
