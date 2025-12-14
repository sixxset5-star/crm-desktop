import React, { useMemo, useState } from 'react';
import { NavLink } from 'react-router-dom';
import { useBoardStore } from '@/store/board';
import { useCustomersStore } from '@/store/customers';
import { useSettingsStore } from '@/store/settings';
import { BoardIcon, CalendarIcon, UsersIcon, DollarIcon, ChartIcon, ArchiveIcon, SettingsIcon, AlertIcon, CalculatorIcon, TaxIcon } from '@/shared/components/Icons';
import { useShallowSelector } from '@/shared/hooks/useStoreSelectors';
import { formatDateWithSettings as formatDate } from '@/shared/lib/format';
import { Modal } from '@/shared/ui';
import { Button } from '@/shared/ui';
import { SectionHeader } from '@/shared/components/Feedback';
import { Avatar } from '@/shared/ui';
import { useOverflowFade } from '@/shared/hooks/useOverflowFade';
import { useUIStore } from '@/store/ui';
import { preloadLazy } from '@/shared/utils/preload';

type SidebarProps = {
	onCollapse?: () => void;
	collapsed?: boolean;
	logo?: React.ReactNode;
};

export function Sidebar({ onCollapse, collapsed = false, logo }: SidebarProps): React.ReactElement {
	const tasks = useShallowSelector(useBoardStore, (s) => s.tasks);
	const customers = useShallowSelector(useCustomersStore, (s) => s.customers);
	const settings = useShallowSelector(useSettingsStore, (s) => s.settings);
	const updateBanner = useShallowSelector(useUIStore, (s) => ({
		visible: s.bannerVisible,
		title: s.bannerTitle,
		progress: s.progressPercent,
		hide: s.hideBanner,
	}));
	const [showDeadlinesModal, setShowDeadlinesModal] = useState(false);
	const { ref: navRef, isOverflowing: navHasOverflow } = useOverflowFade<HTMLDivElement>();
	
	const upcomingDeadlinesData = useMemo(() => {
		const today = new Date();
		today.setHours(0, 0, 0, 0);
		const threeDaysLater = new Date(today);
		threeDaysLater.setDate(today.getDate() + 3);
		
		return tasks.filter((t) => {
			if (!t.deadline) return false;
			const deadline = new Date(t.deadline);
			deadline.setHours(0, 0, 0, 0);
			return deadline >= today && deadline <= threeDaysLater && t.columnId !== 'completed' && t.columnId !== 'closed' && t.columnId !== 'cancelled';
		}).sort((a, b) => {
			if (!a.deadline || !b.deadline) return 0;
			return new Date(a.deadline).getTime() - new Date(b.deadline).getTime();
		});
	}, [tasks]);
	
	const upcomingHolidaysData = useMemo(() => {
		const today = new Date();
		today.setHours(0, 0, 0, 0);
		const threeDaysLater = new Date(today);
		threeDaysLater.setDate(today.getDate() + 3);
		const holidays = settings.holidays || [];
		
		return holidays.filter((h) => {
			let holidayDate: Date;
			if (h.recurring) {
				const originalDate = new Date(h.date);
				holidayDate = new Date(today.getFullYear(), originalDate.getMonth(), originalDate.getDate());
			} else {
				holidayDate = new Date(h.date);
			}
			holidayDate.setHours(0, 0, 0, 0);
			return holidayDate >= today && holidayDate <= threeDaysLater;
		}).sort((a, b) => {
			let dateA: Date, dateB: Date;
			if (a.recurring) {
				const originalDateA = new Date(a.date);
				dateA = new Date(today.getFullYear(), originalDateA.getMonth(), originalDateA.getDate());
			} else {
				dateA = new Date(a.date);
			}
			if (b.recurring) {
				const originalDateB = new Date(b.date);
				dateB = new Date(today.getFullYear(), originalDateB.getMonth(), originalDateB.getDate());
			} else {
				dateB = new Date(b.date);
			}
			return dateA.getTime() - dateB.getTime();
		});
	}, [settings.holidays]);
	
	const upcomingDeadlines = upcomingDeadlinesData.length;
	const upcomingHolidays = upcomingHolidaysData.length;
	const totalNotifications = upcomingDeadlines + upcomingHolidays;
	const hasUpdateNotification = updateBanner.visible && !!updateBanner.title;
	
	// Функция для preloading страниц при наведении
	const handlePreload = (path: string) => {
		switch (path) {
			case '/':
				preloadLazy(() => import('@/pages/Dashboard'));
				break;
			case '/workload':
				preloadLazy(() => import('@/pages/Workload'));
				break;
			case '/customers':
				preloadLazy(() => import('@/pages/Customers'));
				break;
			case '/contractors':
				preloadLazy(() => import('@/pages/Contractors'));
				break;
			case '/financial-model':
				preloadLazy(() => import('@/pages/FinancialModel'));
				break;
			case '/calculator':
				preloadLazy(() => import('@/pages/Calculator'));
				break;
			case '/taxes':
				preloadLazy(() => import('@/pages/Taxes'));
				break;
			case '/reports':
				preloadLazy(() => import('@/pages/Reports'));
				break;
			case '/archive':
				preloadLazy(() => import('@/pages/Archive'));
				break;
			case '/settings':
				preloadLazy(() => import('@/pages/Settings'));
				break;
		}
	};
	
	return (
		<aside className={`sidebar${collapsed ? ' collapsed' : ''}`}>
			<div className="sidebar-content">
				<div className="sidebar-header">
					<div className="sidebar-brand">
						<div className="sidebar-logo-dot" aria-hidden="true">
							{logo || 'CRM'}
						</div>
						<div className="sidebar-brand-copy">
							<span className="sidebar-brand-title">MansurovCRM</span>
							<span className="sidebar-brand-tagline">Operations desk</span>
						</div>
					</div>
					{onCollapse && (
						<button
							type="button"
							className="sidebar-toggle"
							onClick={onCollapse}
							title={collapsed ? 'Показать меню' : 'Скрыть меню'}
							aria-label={collapsed ? 'Показать меню' : 'Скрыть меню'}
							aria-expanded={!collapsed}
						>
							<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
								{collapsed ? (
									<>
										<line x1="5" y1="12" x2="19" y2="12" />
										<polyline points="12 5 19 12 12 19" />
									</>
								) : (
									<>
										<line x1="18" y1="6" x2="6" y2="18" />
										<line x1="6" y1="6" x2="18" y2="18" />
									</>
								)}
							</svg>
						</button>
					)}
				</div>
				<nav
					ref={navRef}
					className="nav scroll-fade"
					data-scroll-active={navHasOverflow ? 'true' : 'false'}
					style={{ '--scroll-fade-to': 'var(--panel)' } as React.CSSProperties}
				>
					{!collapsed && <SectionHeader title="Работа" marginTop={8} />}
					<NavLink 
						end 
						className={({ isActive }) => isActive ? 'nav-item active' : 'nav-item'} 
						to="/" 
						title={collapsed ? 'Доска' : undefined}
						onMouseEnter={() => handlePreload('/')}
					>
						<BoardIcon size={18} />
						<span className="nav-label">Доска</span>
					</NavLink>
					<NavLink 
						className={({ isActive }) => isActive ? 'nav-item active' : 'nav-item'} 
						to="/workload" 
						title={collapsed ? 'Загруженность' : undefined}
						onMouseEnter={() => handlePreload('/workload')}
					>
						<CalendarIcon size={18} />
						<span className="nav-label">Загруженность</span>
					</NavLink>
					<NavLink 
						className={({ isActive }) => isActive ? 'nav-item active' : 'nav-item'} 
						to="/customers" 
						title={collapsed ? 'Заказчики' : undefined}
						onMouseEnter={() => handlePreload('/customers')}
					>
						<UsersIcon size={18} />
						<span className="nav-label">Заказчики</span>
					</NavLink>
					<NavLink 
						className={({ isActive }) => isActive ? 'nav-item active' : 'nav-item'} 
						to="/contractors" 
						title={collapsed ? 'Подрядчики' : undefined}
						onMouseEnter={() => handlePreload('/contractors')}
					>
						<UsersIcon size={18} />
						<span className="nav-label">Подрядчики</span>
					</NavLink>
					
					{!collapsed && <SectionHeader title="Планирование" />}
					<NavLink 
						className={({ isActive }) => isActive ? 'nav-item active' : 'nav-item'} 
						to="/financial-model" 
						title={collapsed ? 'Финансовая модель' : undefined}
						onMouseEnter={() => handlePreload('/financial-model')}
					>
						<DollarIcon size={18} />
						<span className="nav-label">Финансовая модель</span>
					</NavLink>
					<NavLink 
						className={({ isActive }) => isActive ? 'nav-item active' : 'nav-item'} 
						to="/calculator" 
						title={collapsed ? 'Калькулятор' : undefined}
						onMouseEnter={() => handlePreload('/calculator')}
					>
						<CalculatorIcon size={18} />
						<span className="nav-label">Калькулятор</span>
					</NavLink>
					<NavLink 
						className={({ isActive }) => isActive ? 'nav-item active' : 'nav-item'} 
						to="/taxes" 
						title={collapsed ? 'Налоги' : undefined}
						onMouseEnter={() => handlePreload('/taxes')}
					>
						<TaxIcon size={18} />
						<span className="nav-label">Налоги</span>
					</NavLink>
					
					{!collapsed && <SectionHeader title="Отчёты" />}
					<NavLink 
						className={({ isActive }) => isActive ? 'nav-item active' : 'nav-item'} 
						to="/reports" 
						title={collapsed ? 'Отчёт по месяцам' : undefined}
						onMouseEnter={() => handlePreload('/reports')}
					>
						<ChartIcon size={18} />
						<span className="nav-label">Отчёт по месяцам</span>
					</NavLink>
					<NavLink 
						className={({ isActive }) => isActive ? 'nav-item active' : 'nav-item'} 
						to="/archive" 
						title={collapsed ? 'Архив' : undefined}
						onMouseEnter={() => handlePreload('/archive')}
					>
						<ArchiveIcon size={18} />
						<span className="nav-label">Архив</span>
					</NavLink>
					
					{!collapsed && <SectionHeader title="Система" />}
					<NavLink 
						className={({ isActive }) => isActive ? 'nav-item active' : 'nav-item'} 
						to="/settings" 
						title={collapsed ? 'Настройки' : undefined}
						onMouseEnter={() => handlePreload('/settings')}
					>
						<SettingsIcon size={18} />
						<span className="nav-label">Настройки</span>
					</NavLink>
				</nav>
			</div>
			{!collapsed && (totalNotifications > 0 || hasUpdateNotification) && (
				<>
					<div 
						className="sidebar-notifications"
						onClick={() => setShowDeadlinesModal(true)}
					>
						<div className="sidebar-notifications-header">
							<AlertIcon size={16} color="var(--red)" />
							<span>Уведомления</span>
						</div>
						<div className="sidebar-notifications-content">
							{upcomingDeadlines > 0 && (
								<span>{upcomingDeadlines} {upcomingDeadlines === 1 ? 'дедлайн' : upcomingDeadlines < 5 ? 'дедлайна' : 'дедлайнов'} в ближайшие 3 дня</span>
							)}
							{upcomingHolidays > 0 && (
								<span>{upcomingHolidays} {upcomingHolidays === 1 ? 'праздник' : upcomingHolidays < 5 ? 'праздника' : 'праздников'} в ближайшие 3 дня</span>
							)}
							{hasUpdateNotification && (
								<div
									onClick={(e) => {
										e.stopPropagation();
									}}
									style={{
										marginTop: 'var(--space-md)',
										padding: 'var(--space-md)',
										borderRadius: 'var(--radius-m)',
										background: 'var(--panel-muted)',
										border: '1px solid var(--border-strong)',
										display: 'flex',
										flexDirection: 'column',
										gap: 'var(--space-sm)',
									}}
								>
									<div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 'var(--space-sm)' }}>
										<span style={{ fontSize: 'var(--font-size-xs)', fontWeight: 600, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--text)' }}>Обновление</span>
										<button
											type="button"
											onClick={(e) => {
												e.stopPropagation();
												updateBanner.hide();
											}}
											style={{
												border: 'none',
												background: 'transparent',
												color: 'var(--text)',
												cursor: 'pointer',
												fontSize: 'var(--font-size-lg)',
												lineHeight: 1,
												opacity: 'var(--opacity-disabled)',
											}}
											title="Скрыть плашку"
										>
											×
										</button>
									</div>
									<div style={{ fontWeight: 600, color: 'var(--text)' }}>{updateBanner.title}</div>
									{typeof updateBanner.progress === 'number' && (
										<div style={{ width: '100%', background: 'color-mix(in srgb, var(--text) 12%, transparent)', height: 6, borderRadius: 999 }}>
											<div
												style={{
													width: `${Math.min(100, Math.max(0, updateBanner.progress))}%`,
													height: '100%',
													background: 'linear-gradient(90deg, var(--text), var(--accent-soft))',
													borderRadius: 999,
													transition: 'width 200ms ease',
												}}
											/>
										</div>
									)}
									{updateBanner.progress === null && (
										<div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--muted)' }}>Можно закрыть, когда убедитесь, что всё ок.</div>
									)}
								</div>
							)}
						</div>
					</div>
					{showDeadlinesModal && (
						<Modal open={showDeadlinesModal} onClose={() => setShowDeadlinesModal(false)} title="Уведомления" width={600}>
								{upcomingDeadlinesData.length > 0 && (
									<>
										<h4 style={{ margin: '0 0 12px 0', fontSize: 14, fontWeight: 600 }}>Дедлайны в ближайшие 3 дня</h4>
										<div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)', marginBottom: 'var(--space-lg)' }}>
											{upcomingDeadlinesData.map((t) => {
										const customer = customers.find((c) => c.id === t.customerId);
										return (
											<div key={t.id} style={{ 
												padding: 'var(--space-md)', 
												background: 'var(--bg)', 
												border: 'var(--border-default)', 
												borderRadius: 'var(--radius-m)',
												display: 'flex',
												flexDirection: 'column',
												gap: 'var(--space-sm)',
											}}>
												<div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
													{customer && <Avatar src={customer.avatar} alt={customer.name} size={32} />}
													<div style={{ flex: 1 }}>
														<div style={{ fontWeight: 600, fontSize: 16 }}>{t.title}</div>
														{customer && (
															<div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--muted)' }}>{customer.name}</div>
														)}
													</div>
												</div>
												{t.deadline && (
													<div style={{ fontSize: 13, color: 'var(--muted)' }}>
														<span style={{ fontWeight: 600, color: 'var(--text)' }}>Дедлайн:</span> {formatDate(t.deadline)}
													</div>
												)}
											</div>
										);
									})}
										</div>
									</>
								)}
								{upcomingHolidaysData.length > 0 && (
									<>
										<h4 style={{ margin: '0 0 12px 0', fontSize: 14, fontWeight: 600 }}>Праздники в ближайшие 3 дня</h4>
										<div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
											{upcomingHolidaysData.map((h) => {
												let holidayDate: Date;
												const today = new Date();
												today.setHours(0, 0, 0, 0);
												if (h.recurring) {
													const originalDate = new Date(h.date);
													holidayDate = new Date(today.getFullYear(), originalDate.getMonth(), originalDate.getDate());
												} else {
													holidayDate = new Date(h.date);
												}
												holidayDate.setHours(0, 0, 0, 0);
												const daysUntil = Math.ceil((holidayDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
												
												return (
													<div key={h.id} style={{ 
														padding: 'var(--space-md)', 
														background: 'var(--bg)', 
														border: 'var(--border-default)', 
														borderRadius: 'var(--radius-m)',
														display: 'flex',
														flexDirection: 'column',
														gap: 'var(--space-sm)',
													}}>
														<div style={{ fontWeight: 600, fontSize: 16, color: 'var(--red)' }}>{h.name}</div>
														<div style={{ fontSize: 13, color: 'var(--muted)' }}>
															<span style={{ fontWeight: 600, color: 'var(--text)' }}>Дата:</span> {holidayDate.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' })}
															{h.recurring && ' (ежегодный)'}
														</div>
														<div style={{ fontSize: 13, color: 'var(--muted)' }}>
															<span style={{ fontWeight: 600, color: 'var(--text)' }}>Через:</span> {daysUntil} {daysUntil === 1 ? 'день' : daysUntil < 5 ? 'дня' : 'дней'}
														</div>
													</div>
												);
											})}
										</div>
									</>
								)}
							<div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 'var(--space-md)' }}>
								<Button type="button" variant="secondary" onClick={() => setShowDeadlinesModal(false)}>Закрыть</Button>
							</div>
						</Modal>
					)}
				</>
			)}
		</aside>
	);
}


