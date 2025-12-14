/**
 * useTaskFormUI - UI-состояние формы задачи
 * 
 * Только UI-state: видимость, раскрытие, редактирование, временные значения.
 * НИ ОДНОЙ бизнес-логики.
 */
import { useState, useCallback } from 'react';

export function useTaskFormUI() {
	// Видимость паролей
	const [passwordVisible, setPasswordVisible] = useState<Record<number, boolean>>({});

	// Показ пикера заказчика
	const [showCustomerPicker, setShowCustomerPicker] = useState(false);

	// Контекстное меню ссылок
	const [linkContextMenu, setLinkContextMenu] = useState<{
		x: number;
		y: number;
		linkIdx: number;
	} | null>(null);

	// Редактирование имени ссылки
	const [editingLinkName, setEditingLinkName] = useState<{
		idx: number;
		name: string;
	} | null>(null);

	// Модалка подтверждения закрытия
	const [showConfirmClose, setShowConfirmClose] = useState(false);
	const [pendingClose, setPendingClose] = useState<(() => void) | null>(null);

	// Запрос на закрытие с подтверждением
	const requestClose = useCallback((closeCallback: () => void) => {
		setPendingClose(() => closeCallback);
		setShowConfirmClose(true);
	}, []);

	// Временные значения для ввода (до подтверждения)
	const [newTag, setNewTag] = useState('');
	const [newLink, setNewLink] = useState('');
	const [newSubtask, setNewSubtask] = useState('');

	// Ошибки валидации (UI-уровень)
	const [linkError, setLinkError] = useState<string | null>(null);

	// Переключение видимости пароля
	const togglePasswordVisible = useCallback((idx: number) => {
		setPasswordVisible((prev) => ({ ...prev, [idx]: !prev[idx] }));
	}, []);

	// Обработка контекстного меню ссылок
	const handleLinkContextMenu = useCallback(
		(e: React.MouseEvent, linkIdx: number) => {
			e.preventDefault();
			e.stopPropagation();
			const x = e.pageX || e.clientX;
			const y = e.pageY || e.clientY;
			setLinkContextMenu({ x, y, linkIdx });
		},
		[]
	);

	// Закрытие контекстного меню
	const closeLinkContextMenu = useCallback(() => {
		setLinkContextMenu(null);
	}, []);

	// Начало редактирования имени ссылки
	const startEditingLinkName = useCallback((idx: number, currentName: string) => {
		setEditingLinkName({ idx, name: currentName || '' });
		setLinkContextMenu(null);
	}, []);

	// Отмена редактирования имени ссылки
	const cancelEditingLinkName = useCallback(() => {
		setEditingLinkName(null);
	}, []);

	// Подтверждение закрытия
	const confirmClose = useCallback(() => {
		if (pendingClose) {
			pendingClose();
			setPendingClose(null);
		}
		setShowConfirmClose(false);
	}, [pendingClose]);

	// Отмена закрытия
	const cancelClose = useCallback(() => {
		setShowConfirmClose(false);
		setPendingClose(null);
	}, []);

	return {
		// Состояние
		passwordVisible,
		showCustomerPicker,
		linkContextMenu,
		editingLinkName,
		showConfirmClose,
		pendingClose,
		newTag,
		newLink,
		newSubtask,
		linkError,

		// Сеттеры
		setShowCustomerPicker,
		setNewTag,
		setNewLink,
		setNewSubtask,
		setLinkError,
		setEditingLinkName,

		// Методы
		togglePasswordVisible,
		handleLinkContextMenu,
		closeLinkContextMenu,
		startEditingLinkName,
		cancelEditingLinkName,
		requestClose,
		confirmClose,
		cancelClose,
	};
}

