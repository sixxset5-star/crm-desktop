import React, { useState, useMemo, useCallback } from 'react';
import { useCustomersStore } from '../store/customers';
import type { Customer } from '@/types';
import { useBoardStore } from '../store/board';
import { PlusIcon } from '@/shared/components/Icons';
import { useShallowSelector } from '@/shared/hooks/useStoreSelectors';
import { Button, TextInput } from '@/shared/ui';
import { Modal, ModalFooter } from '@/shared/ui/Modal';
import { useUIStore } from '@/store/ui';
import { UI_TEXTS } from '@/shared/constants/ui-texts';
import { CustomerCard, CustomerFormModal, CustomerProfileModal, VirtualizedCustomerGridContainer } from './customers/components';
import { calculateCustomerStats, hasFormChanges, getInitialFormValues } from './customers/utils';
import { getToken } from '@/shared/lib/tokens';
import {
	CUSTOMERS_GRID_GAP,
	CUSTOMERS_GRID_MIN_COLUMN_WIDTH,
	EMPTY_STATE_PADDING,
} from './customers/utils/constants';
import { 
	VIRTUALIZATION_THRESHOLD, 
	VIEWPORT_OFFSET_FOR_HEIGHT, 
	MIN_CONTAINER_HEIGHT,
	GRID_MIN_COLUMN_WIDTH 
} from '@/shared/constants/numeric-constants';

export function Customers(): React.ReactElement {
	const customers = useShallowSelector(useCustomersStore, (s) => s.customers);
	const addCustomer = useCustomersStore((s) => s.addCustomer);
	const updateCustomer = useCustomersStore((s) => s.updateCustomer);
	const removeCustomer = useCustomersStore((s) => s.removeCustomer);
	const tasks = useShallowSelector(useBoardStore, (s) => s.tasks);

	const [editing, setEditing] = useState<Customer | null>(null);
	const [showForm, setShowForm] = useState(false);
	const [viewingProfile, setViewingProfile] = useState<Customer | null>(null);
	const [name, setName] = useState('');
	const [contacts, setContacts] = useState<Array<{ type: string; value: string }>>([]);
	const [comment, setComment] = useState('');
	const [avatar, setAvatar] = useState('');
	const [showConfirmClose, setShowConfirmClose] = React.useState(false);
	const [pendingClose, setPendingClose] = React.useState<(() => void) | null>(null);
	const [searchQuery, setSearchQuery] = useState('');

	// Мемоизируем значения токенов
	const modalWidth = useMemo(() => getToken('--modal-width', 400), []);
	const iconSizeMd = useMemo(() => getToken('--icon-size-md', 20), []);
	const gridMinColumnWidth = useMemo(() => getToken('--customer-grid-min-column-width', GRID_MIN_COLUMN_WIDTH), []);
	const emptyStatePadding = useMemo(() => getToken('--customer-empty-state-padding', 48), []);

	// Загружаем данные при монтировании компонента
	// Используем getState() напрямую, так как функция из Zustand store стабильна
	React.useEffect(() => {
		useCustomersStore.getState().loadFromDisk().catch(() => {});
	}, []); // Пустой массив - выполнится только при монтировании

	const customerStats = useMemo(() => calculateCustomerStats(customers, tasks), [customers, tasks]);
	
	const filteredCustomers = useMemo(() => {
		if (!searchQuery.trim()) {
			return customers;
		}
		const query = searchQuery.toLowerCase().trim();
		return customers.filter((c) => {
			const nameMatch = c.name.toLowerCase().includes(query);
			const contactMatch = c.contact?.toLowerCase().includes(query) || 
				c.contacts?.some(contact => contact.value.toLowerCase().includes(query));
			const commentMatch = c.comment?.toLowerCase().includes(query);
			return nameMatch || contactMatch || commentMatch;
		});
	}, [customers, searchQuery]);

	const formHasChanges = useMemo(() => 
		hasFormChanges(editing, name, contacts, comment, avatar),
		[editing, name, contacts, comment, avatar]
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
		if (editing) {
			updateCustomer(editing.id, { 
				name: name.trim(), 
				contacts: validContacts.length > 0 ? validContacts : undefined,
				comment: commentValue,
				avatar: avatarValue 
			});
		} else {
			// Для обратной совместимости с addCustomer
			const firstContact = validContacts.length > 0 ? validContacts[0].value : undefined;
			const newCustomer = addCustomer(name.trim(), firstContact, avatarValue);
			const updates: Partial<Omit<Customer, 'id'>> = {};
			if (validContacts.length > 1) {
				updates.contacts = validContacts;
			}
			if (commentValue) {
				updates.comment = commentValue;
			}
			if (Object.keys(updates).length > 0) {
				updateCustomer(newCustomer.id, updates);
			}
		}
		resetForm();
	}

	function resetForm() {
		setName('');
		setContacts([]);
		setComment('');
		setAvatar('');
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

	const handleEdit = useCallback((customer: Customer) => {
		const initial = getInitialFormValues(customer);
		setEditing(customer);
		setName(initial.name);
		setContacts(initial.contacts);
		setComment(initial.comment);
		setAvatar(initial.avatar);
		setShowForm(true);
	}, []);

	const handleDelete = useCallback(async (id: string) => {
		const customer = customers.find((c) => c.id === id);
		const name = customer?.name || 'этого заказчика';
		const confirmed = await useUIStore.getState().showConfirm({
			message: UI_TEXTS.DELETE_CUSTOMER(name),
			variant: 'danger',
			confirmText: UI_TEXTS.DELETE,
			cancelText: UI_TEXTS.CANCEL,
		});
		if (confirmed) {
			removeCustomer(id);
		}
	}, [removeCustomer]);

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

	const handleViewProfile = useCallback((customer: Customer) => {
		setViewingProfile(customer);
	}, []);

	const handleCloseViewingProfile = useCallback(() => {
		setViewingProfile(null);
	}, []);

	const handleCloseConfirmModal = useCallback(() => {
		setShowConfirmClose(false);
		setPendingClose(null);
	}, []);

	return (
		<div className="page">
			<div style={{ 
				display: 'flex', 
				justifyContent: 'space-between', 
				alignItems: 'center' 
			}}>
				<div>
					<h1 className="page-title">Заказчики</h1>
					<p className="page-subtitle">Управление клиентской базой</p>
				</div>
				<Button onClick={handleAddNew} variant="primary">
					<span style={{ 
						display: 'inline-flex', 
						alignItems: 'center', 
						gap: 'var(--space-sm)' 
					}}>
						<PlusIcon size={iconSizeMd} color="currentColor" />
						<span>Добавить заказчика</span>
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
				<CustomerFormModal
					editing={editing}
					name={name}
					contacts={contacts}
					comment={comment}
					avatar={avatar}
					onNameChange={setName}
					onContactsChange={setContacts}
					onCommentChange={setComment}
					onAvatarChange={setAvatar}
					onSubmit={handleSubmit}
					onCancel={handleFormClose}
					onClose={handleFormClose}
				/>
			)}

			{viewingProfile && (
				<CustomerProfileModal
					customer={viewingProfile}
					onClose={handleCloseViewingProfile}
				/>
			)}

			<div style={{ marginTop: 'var(--space-lg)' }}>
				<TextInput 
					size="xs"
					value={searchQuery} 
					onChange={(e) => setSearchQuery((e.target as HTMLInputElement).value)} 
					placeholder="Поиск заказчиков..." 
					style={{ width: '100%' }} 
				/>
			</div>
			
			{/* Виртуализируем только для больших списков (>50 элементов) */}
			{filteredCustomers.length > VIRTUALIZATION_THRESHOLD ? (
				<div style={{ 
					marginTop: 'var(--space-lg)',
					height: `calc(100vh - ${VIEWPORT_OFFSET_FOR_HEIGHT}px)`, // Вычисляем высоту динамически
					minHeight: MIN_CONTAINER_HEIGHT
				}}>
					<VirtualizedCustomerGridContainer
						customers={filteredCustomers}
						customerStats={customerStats}
						onEdit={handleEdit}
						onDelete={handleDelete}
						onViewProfile={handleViewProfile}
					/>
				</div>
			) : (
				<div style={{ 
					display: 'grid', 
					gridTemplateColumns: `repeat(auto-fill, minmax(${gridMinColumnWidth}px, 1fr))`, 
					gap: CUSTOMERS_GRID_GAP, 
					marginTop: 'var(--space-lg)' 
				}}>
					{customers.length === 0 ? (
						<div style={{ 
							gridColumn: '1 / -1', 
							textAlign: 'center', 
							padding: `${emptyStatePadding}px`, 
							color: 'var(--muted)' 
						}}>
							Заказчиков пока нет. Добавьте первого!
						</div>
					) : filteredCustomers.length === 0 ? (
						<div style={{ 
							gridColumn: '1 / -1', 
							textAlign: 'center', 
							padding: `${emptyStatePadding}px`, 
							color: 'var(--muted)' 
						}}>
							Ничего не найдено
						</div>
					) : (
						filteredCustomers.map((customer) => {
							const stats = customerStats.get(customer.id) || { 
								tasks: 0, 
								totalAmount: 0, 
								paidAmount: 0, 
								remaining: 0, 
								expenses: 0, 
								profit: 0 
							};
							return (
								<CustomerCard 
									key={customer.id} 
									customer={customer} 
									stats={stats} 
									onEdit={handleEdit} 
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
