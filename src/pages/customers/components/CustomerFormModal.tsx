import React, { useState } from 'react';
import type { Customer, Contact } from '@/store/customers';
import { selectAvatarFile } from '@/shared/lib/electron-bridge';
import { PlusIcon, XIcon, PaperclipIcon } from '@/shared/components/Icons';
import IconButton from '@/shared/components/IconButton';
import { Button, TextInput, TextArea, Select, Avatar, colorFromName, NotesField } from '@/shared/ui';
import { normalizeAvatarPath } from '../utils/avatarUtils';
import { getToken } from '@/shared/lib/tokens';
import { UI_TEXTS } from '@/shared/constants/ui-texts';
import { validateText } from '@/shared/utils/text-validation';
import { validateEmail } from '@/shared/utils/text-validation';
import { useUIStore } from '@/store/ui';
import { 
	CUSTOMER_FORM_MODAL_MAX_WIDTH,
	CONTACT_SELECT_MIN_WIDTH,
	CONTACT_SELECT_MAX_WIDTH,
	CONTACT_FORM_GAP,
	CONTACT_ITEM_GAP,
	AVATAR_PICKER_GAP,
} from '../utils/constants';

type CustomerFormModalProps = {
	editing: Customer | null;
	name: string;
	contacts: Contact[];
	comment: string;
	avatar: string;
	onNameChange: (value: string) => void;
	onContactsChange: (contacts: Contact[]) => void;
	onCommentChange: (value: string) => void;
	onAvatarChange: (value: string) => void;
	onSubmit: (e: React.FormEvent) => void;
	onCancel: () => void;
	onClose: () => void;
};

/**
 * Компонент модального окна формы заказчика
 */
export function CustomerFormModal({
	editing,
	name,
	contacts,
	comment,
	avatar,
	onNameChange,
	onContactsChange,
	onCommentChange,
	onAvatarChange,
	onSubmit,
	onCancel,
	onClose,
}: CustomerFormModalProps): React.ReactElement {
	const avatarPreviewSize = React.useMemo(() => getToken('--avatar-size-lg', 64), []);
	const modalMaxWidth = React.useMemo(() => getToken('--customer-form-modal-max-width', 480), []);
	const contactSelectMinWidth = React.useMemo(() => getToken('--customer-contact-select-min-width', 140), []);
	const contactSelectMaxWidth = React.useMemo(() => getToken('--customer-contact-select-max-width', 180), []);
	
	// Состояния для ошибок валидации
	const [nameError, setNameError] = useState<string | null>(null);
	const [contactErrors, setContactErrors] = useState<Map<number, string>>(new Map());

	const handleNameBlur = () => {
		const validation = validateText(name, {
			required: true,
			fieldName: 'Имя',
		});
		if (!validation.valid) {
			setNameError(validation.error || null);
		} else {
			setNameError(null);
		}
	};

	const handleContactBlur = (idx: number, contact: Contact) => {
		if (contact.value.trim()) {
			let error: string | null = null;
			if (contact.type === 'Email') {
				const emailValidation = validateEmail(contact.value, {
					required: true,
					fieldName: 'Email',
				});
				if (!emailValidation.valid) {
					error = emailValidation.error || null;
				}
			} else {
				// Для других типов контактов проверяем только наличие значения
				const textValidation = validateText(contact.value, {
					required: true,
					fieldName: 'Контакт',
				});
				if (!textValidation.valid) {
					error = textValidation.error || null;
				}
			}
			
			if (error) {
				setContactErrors((prev) => {
					const next = new Map(prev);
					next.set(idx, error!);
					return next;
				});
			} else {
				setContactErrors((prev) => {
					const next = new Map(prev);
					next.delete(idx);
					return next;
				});
			}
		} else {
			setContactErrors((prev) => {
				const next = new Map(prev);
				next.delete(idx);
				return next;
			});
		}
	};

	const handleFormSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		
		// Валидация имени
		const nameValidation = validateText(name, {
			required: true,
			fieldName: 'Имя',
		});
		if (!nameValidation.valid) {
			setNameError(nameValidation.error || null);
			await useUIStore.getState().showAlert({
				title: UI_TEXTS.VALIDATION_ERROR,
				message: nameValidation.error || 'Некорректное имя',
			});
			return;
		}

		// Валидация контактов
		const errors = new Map<number, string>();
		for (let i = 0; i < contacts.length; i++) {
			const contact = contacts[i];
			if (contact.value.trim()) {
				if (contact.type === 'Email') {
					const emailValidation = validateEmail(contact.value, {
						required: true,
						fieldName: 'Email',
					});
					if (!emailValidation.valid) {
						errors.set(i, emailValidation.error || 'Некорректный email');
					}
				} else {
					const textValidation = validateText(contact.value, {
						required: true,
						fieldName: 'Контакт',
					});
					if (!textValidation.valid) {
						errors.set(i, textValidation.error || 'Некорректный контакт');
					}
				}
			}
		}

		if (errors.size > 0) {
			setContactErrors(errors);
			const firstError = Array.from(errors.values())[0];
			await useUIStore.getState().showAlert({
				title: UI_TEXTS.VALIDATION_ERROR,
				message: firstError,
			});
			return;
		}

		// Все валидации пройдены
		onSubmit(e);
	};
	
	const handleContactTypeChange = (idx: number, type: string) => {
		const updated = [...contacts];
		updated[idx] = { ...updated[idx], type };
		onContactsChange(updated);
	};

	const handleContactValueChange = (idx: number, value: string) => {
		const updated = [...contacts];
		updated[idx] = { ...updated[idx], value };
		onContactsChange(updated);
	};

	const handleRemoveContact = (idx: number) => {
		onContactsChange(contacts.filter((_, i) => i !== idx));
	};

	const handleAddContact = () => {
		onContactsChange([...contacts, { type: 'Другое', value: '' }]);
	};

	const handleAvatarSelect = async (e: React.MouseEvent<HTMLButtonElement>) => {
		try {
			if (!window.crm) {
				const { useUIStore } = await import('@/store/ui');
				useUIStore.getState().showError('Ошибка: window.crm не доступен. Убедитесь, что приложение запущено в Electron.');
				return;
			}
			const button = e.currentTarget;
			button.disabled = true;
			try {
				const filePath = await selectAvatarFile();
				if (filePath) {
					onAvatarChange('');
					setTimeout(() => {
						onAvatarChange(filePath);
					}, 10);
				}
			} catch (error) {
				const { useUIStore } = await import('@/store/ui');
				useUIStore.getState().showError('Ошибка при выборе файла: ' + (error instanceof Error ? error.message : String(error)));
			} finally {
				button.disabled = false;
			}
		} catch (error) {
			const { useUIStore } = await import('@/store/ui');
			useUIStore.getState().showError('Ошибка при выборе файла: ' + (error instanceof Error ? error.message : String(error)));
		}
	};


	return (
		<div className="modal-backdrop" onClick={onClose}>
			<div 
				className="modal" 
				onClick={(e) => e.stopPropagation()} 
				style={{ maxWidth: `${modalMaxWidth}px` }}
			>
				<h3 style={{ marginTop: 0 }}>{editing ? UI_TEXTS.EDIT_CUSTOMER : UI_TEXTS.NEW_CUSTOMER}</h3>
				<form onSubmit={handleFormSubmit} className="form-grid">
					<label className="col-span">
						<span>Имя</span>
						<TextInput 
							value={name} 
							onChange={(e) => {
								onNameChange((e.target as HTMLInputElement).value);
								if (nameError) setNameError(null);
							}} 
							onBlur={handleNameBlur}
							error={!!nameError}
							required 
						/>
						{nameError && <span style={{ color: 'var(--red)', fontSize: 'var(--font-size-sm)', marginTop: 'var(--space-xs)' }}>{nameError}</span>}
					</label>
					<label className="col-span">
						<span>Контакты</span>
						<div style={{ display: 'flex', flexDirection: 'column', gap: CONTACT_FORM_GAP }}>
							{contacts.map((contact, idx) => (
								<div key={idx} style={{ display: 'flex', gap: CONTACT_ITEM_GAP, alignItems: 'center' }}>
									<div style={{ 
										minWidth: `${contactSelectMinWidth}px`, 
										maxWidth: `${contactSelectMaxWidth}px`, 
										flexShrink: 0,
										width: 'auto'
									}}>
										<Select
											value={contact.type}
											onChange={(e) => handleContactTypeChange(idx, (e.target as HTMLSelectElement).value)}
										>
											<option value="WhatsApp">WhatsApp</option>
											<option value="Telegram">Telegram</option>
											<option value="Email">Email</option>
											<option value="Телефон">Телефон</option>
											<option value="Другое">Другое</option>
										</Select>
									</div>
									<div style={{ position: 'relative', flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
										<TextInput
											mask={contact.type === 'Телефон' ? 'phone' : undefined}
											value={contact.value}
											onChange={(e) => {
												handleContactValueChange(idx, (e.target as HTMLInputElement).value);
												if (contactErrors.has(idx)) {
													setContactErrors((prev) => {
														const next = new Map(prev);
														next.delete(idx);
														return next;
													});
												}
											}}
											onBlur={() => handleContactBlur(idx, contact)}
											error={!!contactErrors.get(idx)}
											placeholder={contact.type === 'Телефон' ? "+7 (999) 123-45-67" : "Номер, email и т.д."}
											style={{ 
												width: '100%', 
												paddingRight: 'var(--space-lg)',
												boxSizing: 'border-box'
											}}
										/>
										{contactErrors.get(idx) && (
											<span style={{ color: 'var(--red)', fontSize: 'var(--font-size-sm)', marginTop: 'var(--space-xs)' }}>
												{contactErrors.get(idx)}
											</span>
										)}
										<div
											style={{
												position: 'absolute',
												right: 'var(--space-sm)',
												top: '50%',
												transform: 'translateY(-50%)',
											}}
										>
											<IconButton
												icon={XIcon}
												title={UI_TEXTS.DELETE_CONTACT}
												onClick={() => {
													handleRemoveContact(idx);
													setContactErrors((prev) => {
														const next = new Map(prev);
														next.delete(idx);
														return next;
													});
												}}
											/>
										</div>
									</div>
								</div>
							))}
							<Button
								type="button"
								variant="action"
								onClick={handleAddContact}
								title="Добавить контакт"
								style={{ alignSelf: 'flex-start' }}
							>
								<span style={{ display: 'inline-flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
									<PlusIcon size={18} color="currentColor" />
									<span>Добавить контакт</span>
								</span>
							</Button>
						</div>
					</label>
					<label className="col-span">
						<span>Комментарий</span>
						<NotesField 
							value={comment} 
							onChange={(e) => onCommentChange(e.target.value)} 
							placeholder="Заметки о заказчике..."
							rows={3}
						/>
					</label>
					<label className="col-span">
						<span>Аватарка</span>
						<div style={{ display: 'flex', gap: AVATAR_PICKER_GAP, alignItems: 'center' }}>
							{avatar && (
								<Avatar
									key={avatar}
									src={normalizeAvatarPath(avatar)}
									alt="Preview"
									size={avatarPreviewSize}
									backgroundColor={colorFromName(editing?.name || '')}
								/>
							)}
							<IconButton
								icon={PaperclipIcon}
								title="Выбрать файл"
								onClick={handleAvatarSelect}
								iconSize={20}
							/>
						</div>
					</label>
					<div style={{ 
						display: 'flex', 
						gap: 'var(--space-sm)', 
						justifyContent: 'flex-end' 
					}} className="col-span">
						<Button type="button" variant="secondary" onClick={onCancel}>
							{UI_TEXTS.CANCEL}
						</Button>
						<Button type="submit" variant="primary">
							{UI_TEXTS.SAVE}
						</Button>
					</div>
				</form>
			</div>
		</div>
	);
}

