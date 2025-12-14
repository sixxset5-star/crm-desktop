import React, { useState, useMemo, useCallback } from 'react';
import { useContractorsStore } from '../store/contractors';
import type { Contractor } from '@/types';
import { useBoardStore } from '../store/board';
import { PlusIcon } from '@/shared/components/Icons';
import { useShallowSelector } from '@/shared/hooks/useStoreSelectors';
import { Button, TextInput } from '@/shared/ui';
import { Modal, ModalFooter } from '@/shared/ui/Modal';
import { useUIStore } from '@/store/ui';
import { UI_TEXTS } from '@/shared/constants/ui-texts';
import { ContractorCard, ContractorFormModal, ContractorProfileModal, VirtualizedContractorGridContainer } from './contractors/components';
import { calculateContractorStats, hasFormChanges, getInitialFormValues } from './contractors/utils';
import { getToken } from '@/shared/lib/tokens';
import {
	CONTRACTORS_GRID_GAP,
	CONTRACTORS_GRID_MIN_COLUMN_WIDTH,
	EMPTY_STATE_PADDING,
} from './contractors/utils/constants';
import { createLogger } from '@/shared/lib/logger';
import { 
	VIRTUALIZATION_THRESHOLD, 
	VIEWPORT_OFFSET_FOR_HEIGHT, 
	MIN_CONTAINER_HEIGHT,
	GRID_MIN_COLUMN_WIDTH 
} from '@/shared/constants/numeric-constants';

const log = createLogger('Contractors');

export function Contractors(): React.ReactElement {
	const contractors = useShallowSelector(useContractorsStore, (s) => s.contractors);
	const addContractor = useContractorsStore((s) => s.addContractor);
	const updateContractor = useContractorsStore((s) => s.updateContractor);
	const deactivateContractor = useContractorsStore((s) => s.deactivateContractor);
	const deleteContractor = useContractorsStore((s) => s.deleteContractor);
	const tasks = useShallowSelector(useBoardStore, (s) => s.tasks);

	const [editing, setEditing] = useState<Contractor | null>(null);
	const [showForm, setShowForm] = useState(false);
	const [viewingProfile, setViewingProfile] = useState<Contractor | null>(null);
	const [name, setName] = useState('');
	const [contacts, setContacts] = useState<Array<{ type: string; value: string }>>([]);
	const [comment, setComment] = useState('');
	const [avatar, setAvatar] = useState('');
	const [specialization, setSpecialization] = useState('');
	const [rate, setRate] = useState('');
	const [rating, setRating] = useState('');
	const [showConfirmClose, setShowConfirmClose] = React.useState(false);
	const [pendingClose, setPendingClose] = React.useState<(() => void) | null>(null);
	const [searchQuery, setSearchQuery] = useState('');

	// Мемоизируем значения токенов
	const modalWidth = useMemo(() => getToken('--modal-width', 400), []);
	const iconSizeMd = useMemo(() => getToken('--icon-size-md', 20), []);
	const gridMinColumnWidth = useMemo(() => getToken('--customer-grid-min-column-width', GRID_MIN_COLUMN_WIDTH), []);

	// Загружаем подрядчиков при монтировании компонента
	// Используем getState() напрямую, так как функция из Zustand store стабильна
	React.useEffect(() => {
		log.debug('Component mounted, loading contractors');
		useContractorsStore.getState().loadFromDisk().catch((error) => {
			log.error('Failed to load contractors on mount', error);
		});
	}, []); // Пустой массив - выполнится только при монтировании

	const contractorStats = useMemo(() => calculateContractorStats(contractors, tasks), [contractors, tasks]);
	
	const filteredContractors = useMemo(() => {
		let result = contractors;
		
		// Фильтрация по поисковому запросу
		if (searchQuery.trim()) {
			const query = searchQuery.toLowerCase().trim();
			result = result.filter((c) => {
				const nameMatch = c.name.toLowerCase().includes(query);
				const contactMatch = c.contact?.toLowerCase().includes(query) || 
					c.contacts?.some(contact => contact.value.toLowerCase().includes(query));
				const commentMatch = c.comment?.toLowerCase().includes(query);
				const specializationMatch = c.specialization?.toLowerCase().includes(query);
				return nameMatch || contactMatch || commentMatch || specializationMatch;
			});
		}
		
		// Сортировка: активные вверх, затем по имени
		return result.sort((a, b) => {
			// Сначала по активности (активные вверх)
			if (a.isActive !== b.isActive) {
				return a.isActive ? -1 : 1;
			}
			// Затем по имени
			return a.name.localeCompare(b.name, 'ru');
		});
	}, [contractors, searchQuery]);

	const formHasChanges = useMemo(() => 
		hasFormChanges(editing, name, contacts, comment, avatar, specialization, rate, rating),
		[editing, name, contacts, comment, avatar, specialization, rate, rating]
	);

	const handleClose = React.useCallback((closeCallback: () => void) => {
		if (formHasChanges) {
			setPendingClose(() => closeCallback);
			setShowConfirmClose(true);
		} else {
			closeCallback();
		}
	}, [formHasChanges]);

	function handleSubmit(e: React.FormEvent) {
		e.preventDefault();
		const avatarValue = avatar.trim() || undefined;
		const validContacts = contacts.filter(c => c.type.trim() && c.value.trim());
		const commentValue = comment.trim() || undefined;
		const specializationValue = specialization.trim() || undefined;
		const rateValue = rate.trim() ? (isNaN(Number(rate)) ? rate : Number(rate)) : undefined;
		const ratingValue = rating.trim() ? Number(rating) : undefined;
		
		if (editing) {
			updateContractor(editing.id, { 
				name: name.trim(), 
				contacts: validContacts.length > 0 ? validContacts : undefined,
				comment: commentValue,
				avatar: avatarValue,
				specialization: specializationValue,
				rate: rateValue,
				rating: ratingValue !== undefined ? (ratingValue >= 1 && ratingValue <= 5 ? ratingValue : null) : undefined,
				isActive: editing.isActive !== undefined ? editing.isActive : true // Сохраняем текущее значение isActive, по умолчанию активен
			});
		} else {
			const newContractor = addContractor({
				name: name.trim(),
				contacts: validContacts.length > 0 ? validContacts : undefined,
				comment: commentValue,
				avatar: avatarValue,
				specialization: specializationValue,
				rate: rateValue,
				rating: ratingValue !== undefined ? (ratingValue >= 1 && ratingValue <= 5 ? ratingValue : null) : undefined,
				isActive: true
			});
		}
		resetForm();
	}

	function resetForm() {
		setName('');
		setContacts([]);
		setComment('');
		setAvatar('');
		setSpecialization('');
		setRate('');
		setRating('');
		setShowForm(false);
		setEditing(null);
		setShowConfirmClose(false);
		setPendingClose(null);
	}

	const handleConfirmClose = () => {
		if (pendingClose) {
			pendingClose();
			setPendingClose(null);
		}
		setShowConfirmClose(false);
	};

	const handleSaveAndClose = () => {
		const form = document.querySelector('form');
		if (form) {
			const submitButton = form.querySelector('button[type="submit"]') as HTMLButtonElement;
			if (submitButton) {
				submitButton.click();
			}
		}
		setShowConfirmClose(false);
		setPendingClose(null);
	};

	const handleEdit = useCallback((contractor: Contractor) => {
		const initial = getInitialFormValues(contractor);
		setEditing(contractor);
		setName(initial.name);
		setContacts(initial.contacts);
		setComment(initial.comment);
		setAvatar(initial.avatar);
		setSpecialization(initial.specialization);
		setRate(initial.rate);
		setRating(initial.rating);
		setShowForm(true);
	}, []);

	const handleViewProfile = useCallback((contractor: Contractor) => {
		setViewingProfile(contractor);
	}, []);

	const handleCloseViewingProfile = useCallback(() => {
		setViewingProfile(null);
	}, []);

	const handleCloseConfirmModal = useCallback(() => {
		setShowConfirmClose(false);
		setPendingClose(null);
	}, []);

	const handleDeactivate = useCallback(async (id: string) => {
		const contractor = contractors.find((c) => c.id === id);
		const name = contractor?.name || 'этого подрядчика';
		const confirmed = await useUIStore.getState().showConfirm({
			message: UI_TEXTS.DEACTIVATE_CONTRACTOR(name),
			variant: 'primary',
			confirmText: UI_TEXTS.DEACTIVATE,
			cancelText: UI_TEXTS.CANCEL,
		});
		if (confirmed) {
			const tasksReturned = await deactivateContractor(id);
			if (tasksReturned > 0) {
				useUIStore.getState().showSuccess(
					`${name} деактивирован. ${tasksReturned} ${tasksReturned === 1 ? 'задача вернулась' : tasksReturned < 5 ? 'задачи вернулись' : 'задач вернулось'} вам.`
				);
			} else {
				useUIStore.getState().showSuccess(`${name} деактивирован.`);
			}
		}
	}, [contractors, deactivateContractor]);

	const handleActivate = useCallback(async (id: string) => {
		const contractor = contractors.find((c) => c.id === id);
		const name = contractor?.name || 'этого подрядчика';
		updateContractor(id, { isActive: true });
		useUIStore.getState().showSuccess(`${name} активирован.`);
	}, [contractors, updateContractor]);

	const handleDelete = useCallback(async (id: string) => {
		const contractor = contractors.find((c) => c.id === id);
		const name = contractor?.name || 'этого подрядчика';
		const stats = contractorStats.get(id);
		if (stats && stats.tasksCount > 0) {
			useUIStore.getState().showError(`Нельзя удалить подрядчика "${name}": у него есть задачи. Используйте деактивацию.`);
			return;
		}
		const confirmed = await useUIStore.getState().showConfirm({
			message: UI_TEXTS.DELETE_CONTRACTOR(name),
			variant: 'danger',
			confirmText: UI_TEXTS.DELETE,
			cancelText: UI_TEXTS.CANCEL,
		});
		if (confirmed) {
			try {
				await deleteContractor(id);
				useUIStore.getState().showSuccess(`${name} удалён.`);
			} catch (error) {
				useUIStore.getState().showError(error instanceof Error ? error.message : 'Не удалось удалить подрядчика.');
			}
		}
	}, [contractors, contractorStats, deleteContractor]);

	const handleAddNew = useCallback(() => {
		setEditing(null);
		resetForm();
		setShowForm(true);
	}, []);

	const handleFormClose = useCallback(() => {
		handleClose(() => {
			setShowForm(false);
			setEditing(null);
		});
	}, [handleClose]);

	return (
		<div className="page">
			<div style={{ 
				display: 'flex', 
				justifyContent: 'space-between', 
				alignItems: 'center' 
			}}>
				<div>
					<h1 className="page-title">Подрядчики</h1>
					<p className="page-subtitle">Управление исполнителями задач</p>
				</div>
				<Button onClick={handleAddNew} variant="primary">
					<span style={{ 
						display: 'inline-flex', 
						alignItems: 'center', 
						gap: 'var(--space-sm)' 
					}}>
						<PlusIcon size={iconSizeMd} color="currentColor" />
						<span>Добавить подрядчика</span>
					</span>
				</Button>
			</div>

			{showConfirmClose && (
				<Modal
					open={showConfirmClose}
					onClose={handleCloseConfirmModal}
					title="Вы точно хотите закрыть без сохранения?"
					width={modalWidth}
					footer={
						<ModalFooter 
							onCancel={handleConfirmClose} 
							onConfirm={handleSaveAndClose} 
							confirmText="Сохранить и закрыть" 
							cancelText="Закрыть" 
						/>
					}
				>
					<p style={{ color: 'var(--muted)', marginBottom: 0 }}>
						Внесенные изменения будут потеряны.
					</p>
				</Modal>
			)}
			
			{showForm && (
				<ContractorFormModal
					editing={editing}
					name={name}
					contacts={contacts}
					comment={comment}
					avatar={avatar}
					specialization={specialization}
					rate={rate}
					rating={rating}
					onNameChange={setName}
					onContactsChange={setContacts}
					onCommentChange={setComment}
					onAvatarChange={setAvatar}
					onSpecializationChange={setSpecialization}
					onRateChange={setRate}
					onRatingChange={setRating}
					onSubmit={handleSubmit}
					onCancel={handleFormClose}
					onClose={handleFormClose}
				/>
			)}

			{viewingProfile && (
				<ContractorProfileModal
					contractor={viewingProfile}
					tasks={tasks}
					stats={contractorStats.get(viewingProfile.id)}
					onClose={handleCloseViewingProfile}
				/>
			)}

			<div style={{ marginTop: 'var(--space-lg)' }}>
				<TextInput 
					size="xs"
					value={searchQuery} 
					onChange={(e) => setSearchQuery((e.target as HTMLInputElement).value)} 
					placeholder="Поиск подрядчиков..." 
					style={{ width: '100%' }} 
				/>
			</div>
			
			{/* Виртуализируем только для больших списков (>50 элементов) */}
			{filteredContractors.length > VIRTUALIZATION_THRESHOLD ? (
				<div style={{ 
					marginTop: 'var(--space-lg)',
					height: `calc(100vh - ${VIEWPORT_OFFSET_FOR_HEIGHT}px)`, // Вычисляем высоту динамически
					minHeight: MIN_CONTAINER_HEIGHT
				}}>
					<VirtualizedContractorGridContainer
						contractors={filteredContractors}
						contractorStats={contractorStats}
						onEdit={handleEdit}
						onDeactivate={handleDeactivate}
						onActivate={handleActivate}
						onDelete={handleDelete}
						onViewProfile={handleViewProfile}
					/>
				</div>
			) : (
				<div style={{ 
					display: 'grid', 
					gridTemplateColumns: `repeat(auto-fill, minmax(${gridMinColumnWidth}px, 1fr))`, 
					gap: CONTRACTORS_GRID_GAP, 
					marginTop: 'var(--space-lg)' 
				}}>
					{contractors.length === 0 ? (
						<div style={{ 
							gridColumn: '1 / -1', 
							textAlign: 'center', 
							padding: `${EMPTY_STATE_PADDING}px`, 
							color: 'var(--muted)' 
						}}>
							Подрядчиков пока нет. Добавьте первого!
						</div>
					) : filteredContractors.length === 0 ? (
						<div style={{ 
							gridColumn: '1 / -1', 
							textAlign: 'center', 
							padding: `${EMPTY_STATE_PADDING}px`, 
							color: 'var(--muted)' 
						}}>
							Ничего не найдено
						</div>
					) : (
						filteredContractors.map((contractor) => {
							const stats = contractorStats.get(contractor.id) || { 
								tasksCount: 0, 
								completedTasksCount: 0, 
								totalExpenses: 0, 
								totalProfitOrLoss: 0,
								totalEarned: 0
							};
							return (
								<ContractorCard 
									key={contractor.id} 
									contractor={contractor} 
									stats={stats} 
									onEdit={handleEdit} 
									onDeactivate={handleDeactivate}
									onActivate={handleActivate}
									onDelete={handleDelete}
									onViewProfile={handleViewProfile}
								/>
							);
						})
					)}
				</div>
			)}
		</div>
	);
}
