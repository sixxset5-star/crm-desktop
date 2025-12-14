import React, { useEffect, useState } from 'react';
import { useUIStore, type ResultToast } from '@/store/ui';
import { useShallowSelector } from '@/shared/hooks/useStoreSelectors';
import { CheckIcon, HelpCircleIcon, AlertIcon, XIcon } from '@/shared/components/Icons';
import styles from './ResultToastsContainer.module.css';

type ToastItemProps = {
	toast: ResultToast;
	onRemove: (id: string) => void;
};

function ToastItem({ toast, onRemove }: ToastItemProps): React.ReactElement {
	const [isVisible, setIsVisible] = useState(false);
	const [isExiting, setIsExiting] = useState(false);

	useEffect(() => {
		// Анимация появления
		requestAnimationFrame(() => {
			setIsVisible(true);
		});

		// Автоматическое удаление через 4 секунды
		const timer = setTimeout(() => {
			setIsExiting(true);
			setTimeout(() => {
				onRemove(toast.id);
			}, 300); // Время на fade out
		}, 4000);

		return () => clearTimeout(timer);
	}, [toast.id, onRemove]);

	const handleClose = (e: React.MouseEvent) => {
		e.stopPropagation();
		setIsExiting(true);
		setTimeout(() => {
			onRemove(toast.id);
		}, 300);
	};

	const getIcon = () => {
		const iconSize = 20;
		switch (toast.type) {
			case 'success':
				return <CheckIcon size={iconSize} />;
			case 'warning':
				return <AlertIcon size={iconSize} />;
			case 'info':
			default:
				return <HelpCircleIcon size={iconSize} />;
		}
	};

	const getTypeClass = () => {
		switch (toast.type) {
			case 'success':
				return styles.toastSuccess;
			case 'warning':
				return styles.toastWarning;
			case 'info':
			default:
				return styles.toastInfo;
		}
	};

	return (
		<div
			className={`${styles.toastItem} ${getTypeClass()} ${isVisible && !isExiting ? styles.visible : ''} ${isExiting ? styles.exiting : ''}`}
			onClick={handleClose}
		>
			<div className={styles.toastIcon}>{getIcon()}</div>
			<div className={styles.toastContent}>
				<div className={styles.toastTitle}>{toast.title}</div>
				{toast.subtitle && (
					<div className={styles.toastSubtitle}>{toast.subtitle}</div>
				)}
			</div>
			<button
				className={styles.toastClose}
				onClick={handleClose}
				aria-label="Закрыть уведомление"
			>
				<XIcon size={14} />
			</button>
		</div>
	);
}

export function ResultToastsContainer(): React.ReactElement {
	const toasts = useShallowSelector(useUIStore, (s) => s.toasts);
	const removeToast = useUIStore((s) => s.removeToast);

	if (toasts.length === 0) return <></>;

	return (
		<div className={styles.container}>
			{toasts.map((toast) => (
				<ToastItem key={toast.id} toast={toast} onRemove={removeToast} />
			))}
		</div>
	);
}
