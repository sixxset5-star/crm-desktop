import React, { useState, useEffect, useMemo } from 'react';
import { useSettingsStore, LEGACY_LOW_PRIORITY_COLOR, LOW_PRIORITY_NEUTRAL } from '../store/settings';
import { getToken } from '@/shared/lib/tokens';
import { useBoardStore } from '../store/board';
import { useCustomersStore } from '../store/customers';
import { useContractorsStore } from '../store/contractors';
import { useGoalsStore } from '../store/goals';
import { useShallowSelector } from '@/shared/hooks/useStoreSelectors';
import { XIcon } from '@/shared/components/Icons';
import { Button, TextInput, Select, Switch, Labeled } from '@/shared/ui';
import { Modal, ModalFooter } from '@/shared/ui/Modal';
import { SettingsSection, ImportExportSection } from './settings/components';
import { useSettingsForm } from './settings/hooks/useSettingsForm';
import { invokeIpc } from '@/shared/lib/ipc-client';
import { LoadingSpinner } from '@/shared/components/Feedback';
import { useUIStore } from '@/store/ui';
import { UI_TEXTS } from '@/shared/constants/ui-texts';
import contractorStyles from './contractors/components/ContractorCard.module.css';
import {
	exportTasksToFile,
	exportCustomersToFile,
	exportCreditsToFile,
	importTasksFromFile,
	importCustomersFromFile,
	importCreditsFromFile,
	exportToJSON,
} from './settings/utils';
import {
	DEFAULT_NOTIFICATION_DAYS,
	DEFAULT_ARCHIVE_DAYS,
	DEFAULT_TASK_FILTER_MONTHS,
	DEFAULT_CALCULATOR_PHOTO_MULTIPLIER,
	DEFAULT_CALCULATOR_URGENT_MULTIPLIER,
	COLOR_PICKER_SIZE,
	COLOR_DISPLAY_MIN_WIDTH,
} from './settings/utils/constants';
import {
	DAYS_IN_MONTH,
	DAYS_IN_YEAR,
	MONTHS_IN_YEAR,
	MULTIPLIER_STEP,
	MULTIPLIER_MIN,
} from '@/shared/constants/numeric-constants';

export function Settings(): React.ReactElement {
	const tasks = useShallowSelector(useBoardStore, (s) => s.tasks);
	const addTask = useBoardStore((s) => s.addTask);
	const updateTask = useBoardStore((s) => s.updateTask);
	const customers = useShallowSelector(useCustomersStore, (s) => s.customers);
	const addCustomer = useCustomersStore((s) => s.addCustomer);
	const updateCustomer = useCustomersStore((s) => s.updateCustomer);
	const credits = useShallowSelector(useGoalsStore, (s) => s.credits);
	const addCredit = useGoalsStore((s) => s.addCredit);
	const updateCredit = useGoalsStore((s) => s.updateCredit);
	const goals = useShallowSelector(useGoalsStore, (s) => s.goals);
	
	const { localSettings, hasChanges, handleUpdateSettings, handleSave, handleReload } = useSettingsForm();
	const [showConfirmClose, setShowConfirmClose] = useState(false);
	const [avatarSyncStatus, setAvatarSyncStatus] = useState<'idle' | 'syncing' | 'success' | 'error'>('idle');
	const [avatarSyncMessage, setAvatarSyncMessage] = useState<string>('');
	
	// Мемоизируем значения токенов
	const modalWidth = useMemo(() => getToken('--modal-width', 400), []);
	const iconSizeSm = useMemo(() => getToken('--icon-size-sm', 16), []);
	
	const handleConfirmClose = () => {
		handleReload();
		setShowConfirmClose(false);
	};
	
	const handleSaveAndClose = () => {
		handleSave();
		setShowConfirmClose(false);
	};
	
	// Исправляем старый синий цвет низкого приоритета на серый (только при загрузке)
	React.useEffect(() => {
		if (localSettings.priorityColors?.low === LEGACY_LOW_PRIORITY_COLOR) {
			handleUpdateSettings({ priorityColors: { ...localSettings.priorityColors, low: LOW_PRIORITY_NEUTRAL } });
		}
	}, []); // Только при монтировании

	const handleExportJSON = () => {
		const currentSettings = useSettingsStore.getState().settings;
		exportToJSON({ tasks, customers, goals, settings: currentSettings });
	};

	const handleExportTasks = () => exportTasksToFile(tasks);
	const handleExportCustomers = () => exportCustomersToFile(customers);
	const handleExportCredits = () => exportCreditsToFile(credits);
	const handleImportTasks = () => importTasksFromFile(tasks, addTask, updateTask);
	const handleImportCustomers = () => importCustomersFromFile(customers, addCustomer, updateCustomer);
	const handleImportCredits = () => importCreditsFromFile(credits, addCredit, updateCredit);

	const handleSyncAvatars = async () => {
		if (!localSettings.telegramBotToken) {
			setAvatarSyncStatus('error');
			setAvatarSyncMessage('Токен не указан');
			return;
		}

		setAvatarSyncStatus('syncing');
		setAvatarSyncMessage('Синхронизация...');

		try {
			const result = await invokeIpc('avatars:syncAll', undefined);
			
			if (result.ok && result.data) {
				const { totalUpdated, totalFailed, errors, message, stats } = result.data;
				
				if (message) {
					setAvatarSyncStatus('success');
					setAvatarSyncMessage(message);
				} else if (totalFailed > 0) {
					setAvatarSyncStatus('error');
					setAvatarSyncMessage(`Обновлено: ${totalUpdated}, Ошибок: ${totalFailed}`);
				} else if (totalUpdated > 0) {
					setAvatarSyncStatus('success');
					setAvatarSyncMessage(`Успешно обновлено ${totalUpdated} аватаров`);
					
					// Перезагружаем заказчиков и подрядчиков, чтобы увидеть новые аватары
					useCustomersStore.getState().loadFromDisk();
					useContractorsStore.getState().loadFromDisk();
				} else {
					setAvatarSyncStatus('success');
					let msg = 'Нет аватаров для обновления';
					if (stats) {
						msg += ` (Найдено: ${stats.customersWithTelegram} заказчиков, ${stats.contractorsWithTelegram} подрядчиков с Telegram)`;
					}
					setAvatarSyncMessage(msg);
				}
			} else if (!result.ok) {
				setAvatarSyncStatus('error');
				setAvatarSyncMessage(result.message || 'Ошибка синхронизации');
			} else {
				setAvatarSyncStatus('error');
				setAvatarSyncMessage('Ошибка синхронизации');
			}
		} catch (error) {
			setAvatarSyncStatus('error');
			setAvatarSyncMessage(error instanceof Error ? error.message : 'Неизвестная ошибка');
		}

		// Сбрасываем статус через 3 секунды
		setTimeout(() => {
			setAvatarSyncStatus('idle');
			setAvatarSyncMessage('');
		}, 3000);
	};

	return (
		<div className="page">
			{showConfirmClose && (
				<Modal
					open={showConfirmClose}
					onClose={() => setShowConfirmClose(false)}
					title="Вы точно хотите выйти без сохранения?"
					width={modalWidth}
					footer={<ModalFooter onCancel={handleConfirmClose} onConfirm={handleSaveAndClose} confirmText="Сохранить и выйти" cancelText="Отменить" />}
				>
					<p style={{ color: 'var(--muted)', marginBottom: 'var(--space-none)' }}>Внесенные изменения будут потеряны.</p>
				</Modal>
			)}
			<div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-md)' }}>
				<div>
					<h1 className="page-title">Настройки</h1>
					<p className="page-subtitle">Конфигурация приложения</p>
				</div>
				<div style={{ display: 'flex', gap: 'var(--space-sm)' }}>
					<Button onClick={handleSave} variant="primary" disabled={!hasChanges}>Сохранить</Button>
					<Button
						onClick={async () => { 
							await handleReload();
							await useUIStore.getState().showAlert({
								title: UI_TEXTS.SUCCESS,
								message: UI_TEXTS.SETTINGS_RELOADED,
							});
						}}
						variant="secondary"
					>
						Перезагрузить
					</Button>
				</div>
			</div>

			<div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 'var(--space-lg)', marginTop: 'var(--space-lg)' }}>
				<SettingsSection title="Общие">
					<Labeled label="Валюта">
							<Select size="xs" value={localSettings.currency} onChange={(e) => handleUpdateSettings({ currency: (e.target as HTMLSelectElement).value })}>
								<option value="RUB">₽ RUB</option>
								<option value="USD">$ USD</option>
								<option value="EUR">€ EUR</option>
							</Select>
					</Labeled>
					<Labeled label="Формат даты">
							<Select size="xs" value={localSettings.dateFormat} onChange={(e) => handleUpdateSettings({ dateFormat: (e.target as HTMLSelectElement).value })}>
								<option value="ru-RU">Русский (DD.MM.YYYY)</option>
								<option value="en-US">Английский (MM/DD/YYYY)</option>
								<option value="en-GB">Британский (DD/MM/YYYY)</option>
							</Select>
					</Labeled>
					<Labeled label="Логика доходов">
							<Select size="xs" value={localSettings.incomeLogic} onChange={(e) => handleUpdateSettings({ incomeLogic: (e.target as HTMLSelectElement).value as 'all' | 'done' })}>
								<option value="done">Только завершённые</option>
								<option value="all">Все задачи</option>
							</Select>
					</Labeled>
				</SettingsSection>

				<SettingsSection title="Уведомления">
					<div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 'var(--space-sm)' }}>
							<span>Включить уведомления о дедлайнах</span>
						<Switch
								checked={localSettings.notificationsEnabled ?? true}
							onChange={(checked) => handleUpdateSettings({ notificationsEnabled: checked })}
								/>
							</div>
					<Labeled label="Напоминать за (дней)">
							<TextInput
								type="number"
							size="xs"
								min="0"
								max={DAYS_IN_MONTH}
								value={localSettings.notificationDaysBefore ?? DEFAULT_NOTIFICATION_DAYS}
								onChange={(e) => handleUpdateSettings({ notificationDaysBefore: parseInt((e.target as HTMLInputElement).value) || DEFAULT_NOTIFICATION_DAYS })}
							/>
					</Labeled>
				</SettingsSection>

				<SettingsSection title="Архивация">
					<div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 'var(--space-sm)' }}>
							<span>Автоматически скрывать завершённые задачи</span>
						<Switch
								checked={localSettings.autoArchiveEnabled ?? true}
							onChange={(checked) => handleUpdateSettings({ autoArchiveEnabled: checked })}
								/>
							</div>
					<Labeled label="Скрывать задачи старше (дней)">
							<TextInput
								type="number"
							size="xs"
								min="1"
								max={DAYS_IN_YEAR}
								value={localSettings.autoArchiveDays ?? DEFAULT_ARCHIVE_DAYS}
								onChange={(e) => handleUpdateSettings({ autoArchiveDays: parseInt((e.target as HTMLInputElement).value) || DEFAULT_ARCHIVE_DAYS })}
							/>
					</Labeled>
				</SettingsSection>

				<SettingsSection title="Отображение">
					<div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 'var(--space-sm)' }}>
							<span>Компактный режим карточек</span>
						<Switch
								checked={localSettings.compactMode ?? false}
							onChange={(checked) => handleUpdateSettings({ compactMode: checked })}
								/>
							</div>
					<div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 'var(--space-sm)' }}>
							<span>Показывать прогресс выполнения задач</span>
						<Switch
								checked={localSettings.showTaskProgress ?? true}
							onChange={(checked) => handleUpdateSettings({ showTaskProgress: checked })}
								/>
							</div>
					<Labeled label="Показывать задачи на (месяцев вперёд)">
							<TextInput
								type="number"
							size="xs"
								min="1"
								max={MONTHS_IN_YEAR}
								value={localSettings.taskFilterMonths ?? DEFAULT_TASK_FILTER_MONTHS}
								onChange={(e) => handleUpdateSettings({ taskFilterMonths: parseInt((e.target as HTMLInputElement).value) || DEFAULT_TASK_FILTER_MONTHS })}
							/>
					</Labeled>
				</SettingsSection>

				<SettingsSection title="Приоритеты">
					<div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
						{[
							{ key: 'high' as const, label: 'Высокий приоритет', color: localSettings.priorityColors?.high || 'var(--red)' },
							{ key: 'medium' as const, label: 'Средний приоритет', color: localSettings.priorityColors?.medium || 'var(--warning)' },
							{ key: 'low' as const, label: 'Низкий приоритет', color: localSettings.priorityColors?.low || LOW_PRIORITY_NEUTRAL },
						].map(({ key, label, color }) => (
							<div key={key} style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
								<div style={{ flex: 1 }}>
									<div style={{ fontSize: 'var(--font-size-sm)', fontWeight: 'var(--font-weight-semibold)', color: 'var(--text)', marginBottom: 'var(--space-xs)' }}>{label}</div>
									<div style={{ 
										display: 'inline-block',
										padding: 'var(--space-xs) var(--space-sm)',
										borderRadius: 'var(--radius-md)',
										background: color,
										color: 'var(--white)',
										fontSize: 'var(--font-size-sm)',
										fontWeight: 'var(--font-weight-semibold)',
										boxShadow: 'var(--shadow-sm)',
									}}>
										{key === 'high' ? 'Высокий' : key === 'medium' ? 'Средний' : 'Низкий'}
									</div>
								</div>
								<div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
									<div style={{
										width: COLOR_PICKER_SIZE,
										height: COLOR_PICKER_SIZE,
										borderRadius: 'var(--radius-md)',
										background: color,
										border: 'var(--border-width) solid var(--border)',
										boxShadow: 'var(--shadow-md)',
										cursor: 'pointer',
										position: 'relative',
										overflow: 'hidden',
									}}>
										<input
											type="color"
											value={color}
											onChange={(e) => handleUpdateSettings({ priorityColors: { 
												high: localSettings.priorityColors?.high || 'var(--red)',
												medium: localSettings.priorityColors?.medium || 'var(--warning)',
												low: localSettings.priorityColors?.low || LOW_PRIORITY_NEUTRAL,
												[key]: e.target.value 
											} })}
											style={{
												position: 'absolute',
												top: 0,
												left: 0,
												width: '100%',
												height: '100%',
												border: 'none',
												cursor: 'pointer',
												opacity: 0,
											}}
										/>
									</div>
									<div style={{
										padding: 'var(--space-sm) var(--space-sm)',
										background: 'var(--bg)',
										border: 'var(--border-default)',
										borderRadius: 'var(--radius-md)',
										fontSize: 'var(--font-size-sm)',
										fontFamily: 'monospace',
										color: 'var(--text)',
										minWidth: COLOR_DISPLAY_MIN_WIDTH,
										textAlign: 'center',
									}}>
										{color.toUpperCase()}
									</div>
									<button
										type="button"
										onClick={(e) => {
											e.stopPropagation();
											const defaultColors = {
												high: 'var(--red)',
												medium: 'var(--warning)',
												low: LOW_PRIORITY_NEUTRAL,
											};
											handleUpdateSettings({ priorityColors: { 
												high: localSettings.priorityColors?.high || defaultColors.high,
												medium: localSettings.priorityColors?.medium || defaultColors.medium,
												low: localSettings.priorityColors?.low || defaultColors.low,
												[key]: defaultColors[key]
											} });
										}}
										style={{
											background: 'transparent',
											border: 'none',
											cursor: 'pointer',
											padding: 'var(--space-xs)',
											display: 'flex',
											alignItems: 'center',
											justifyContent: 'center',
											borderRadius: 'var(--space-xs)',
											opacity: 'var(--opacity-disabled)',
											transition: 'opacity 0.2s',
										}}
										onMouseEnter={(e) => {
											(e.currentTarget as HTMLElement).style.opacity = '1';
											(e.currentTarget as HTMLElement).style.background = 'var(--bg)';
										}}
										onMouseLeave={(e) => {
											(e.currentTarget as HTMLElement).style.opacity = 'var(--opacity-disabled)';
											(e.currentTarget as HTMLElement).style.background = 'transparent';
										}}
										title="Сбросить на значение по умолчанию"
									>
										<XIcon size={iconSizeSm} color="var(--muted)" />
									</button>
								</div>
							</div>
						))}
					</div>
				</SettingsSection>

				<SettingsSection title="Telegram">
					<Labeled label="Токен Telegram бота">
						<TextInput
							type="password"
							size="xs"
							value={localSettings.telegramBotToken || ''}
							onChange={(e) => handleUpdateSettings({ telegramBotToken: (e.target as HTMLInputElement).value })}
							placeholder="Введите токен бота от @BotFather"
						/>
						<small style={{ fontSize: 'var(--font-size-sm)', color: 'var(--muted)' }}>
							Токен используется для автоматической синхронизации аватаров заказчиков и подрядчиков из Telegram профилей (раз в день)
						</small>
					</Labeled>
					<Labeled label="Chat ID для уведомлений">
						<div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
							<TextInput
								type="text"
								size="xs"
								value={localSettings.telegramChatId || ''}
								onChange={(e) => handleUpdateSettings({ telegramChatId: (e.target as HTMLInputElement).value })}
								placeholder="Ваш Chat ID"
								style={{ flex: 1 }}
							/>
							<Button 
								size="xs" 
								variant="secondary"
								onClick={async () => {
									if (!localSettings.telegramBotToken) {
										await useUIStore.getState().showAlert({
											title: UI_TEXTS.ERROR,
											message: UI_TEXTS.TELEGRAM_BOT_TOKEN_REQUIRED,
										});
										return;
									}
									try {
										const result = await invokeIpc('avatars:getChatId', undefined);
										if (result.ok && result.data) {
											const chatId = result.data.chatId;
											if (chatId) {
												handleUpdateSettings({ telegramChatId: chatId });
												await useUIStore.getState().showAlert({
													title: UI_TEXTS.CHAT_ID_RECEIVED,
													message: UI_TEXTS.CHAT_ID_RECEIVED_MESSAGE(chatId),
												});
											} else {
												await useUIStore.getState().showAlert({
													title: UI_TEXTS.ERROR,
													message: UI_TEXTS.CHAT_ID_ERROR,
												});
											}
										} else {
											await useUIStore.getState().showAlert({
												title: UI_TEXTS.ERROR,
												message: !result.ok ? result.message : UI_TEXTS.CHAT_ID_ERROR,
											});
										}
									} catch (error) {
										const errorMessage = error instanceof Error ? error.message : 'Неизвестная ошибка';
										await useUIStore.getState().showAlert({
											title: UI_TEXTS.ERROR,
											message: UI_TEXTS.TELEGRAM_ERROR(errorMessage),
										});
									}
								}}
								disabled={!localSettings.telegramBotToken}
							>
								Получить Chat ID
							</Button>
						</div>
						<small style={{ fontSize: 'var(--font-size-sm)', color: 'var(--muted)' }}>
							Chat ID нужен для отправки уведомлений о процессе синхронизации. Напишите боту /start в Telegram, затем нажмите "Получить Chat ID"
						</small>
					</Labeled>
					<div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)', marginTop: 'var(--space-md)' }}>
						<Button 
							size="xs" 
							variant="secondary"
							onClick={handleSyncAvatars}
							disabled={avatarSyncStatus === 'syncing' || !localSettings.telegramBotToken}
						>
							{avatarSyncStatus === 'syncing' ? 'Синхронизация...' : 'Синхронизировать сейчас'}
						</Button>
						{avatarSyncStatus === 'syncing' && (
							<LoadingSpinner size="small" />
						)}
						{avatarSyncStatus === 'success' && (
							<span className={contractorStyles.time} style={{ 
								display: 'inline-block',
								verticalAlign: 'middle'
							}} />
						)}
						{avatarSyncStatus === 'error' && (
							<div style={{
								width: '12px',
								height: '12px',
								borderRadius: '50%',
								background: 'var(--red)',
							}} />
						)}
					</div>
					{avatarSyncMessage && (
						<div style={{ 
							marginTop: 'var(--space-xs)', 
							fontSize: 'var(--font-size-sm)',
							color: avatarSyncStatus === 'error' ? 'var(--red)' : avatarSyncStatus === 'success' ? 'var(--success)' : 'var(--text)'
						}}>
							{avatarSyncMessage}
						</div>
					)}
				</SettingsSection>

				<SettingsSection title="Калькулятор">
					<Labeled label='Множитель для "фотки есть"'>
							<TextInput
								type="number"
							size="xs"
								step={MULTIPLIER_STEP}
								min={MULTIPLIER_MIN}
								max="2"
							value={localSettings.calculatorPhotoMultiplier ?? DEFAULT_CALCULATOR_PHOTO_MULTIPLIER}
							onChange={(e) => handleUpdateSettings({ calculatorPhotoMultiplier: parseFloat((e.target as HTMLInputElement).value) || DEFAULT_CALCULATOR_PHOTO_MULTIPLIER })}
							/>
						<small style={{ fontSize: 'var(--font-size-sm)', color: 'var(--muted)' }}>Применяется когда у проекта есть фотографии (по умолчанию 0.8)</small>
					</Labeled>
					<Labeled label='Множитель для "срочно"'>
							<TextInput
								type="number"
							size="xs"
								step={MULTIPLIER_STEP}
								min="1"
								max="3"
							value={localSettings.calculatorUrgentMultiplier ?? DEFAULT_CALCULATOR_URGENT_MULTIPLIER}
							onChange={(e) => handleUpdateSettings({ calculatorUrgentMultiplier: parseFloat((e.target as HTMLInputElement).value) || DEFAULT_CALCULATOR_URGENT_MULTIPLIER })}
							/>
						<small style={{ fontSize: 'var(--font-size-sm)', color: 'var(--muted)' }}>Применяется для срочных проектов (по умолчанию 1.5)</small>
					</Labeled>
				</SettingsSection>

				<ImportExportSection
					onExportTasks={handleExportTasks}
					onImportTasks={handleImportTasks}
					onExportCustomers={handleExportCustomers}
					onImportCustomers={handleImportCustomers}
					onExportCredits={handleExportCredits}
					onImportCredits={handleImportCredits}
					onExportJSON={handleExportJSON}
				/>
			</div>
		</div>
	);
}





