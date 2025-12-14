import React from 'react';
import ReactDOM from 'react-dom';
import { Button } from './Controls';
import { useOverflowFade } from '@/shared/hooks/useOverflowFade';
import { UI_TEXTS } from '@/shared/constants/ui-texts';

export function Modal({
	open,
	onClose,
	title,
	children,
	width,
	footer,
}: {
	open: boolean;
	onClose: () => void;
	title?: React.ReactNode;
	children: React.ReactNode;
	width?: number;
	footer?: React.ReactNode;
}): React.ReactElement | null {
	const { ref: modalRef, isOverflowing } = useOverflowFade<HTMLDivElement>();
	if (!open) return null;
	const modalRoot = document.body;
	return ReactDOM.createPortal(
		<FocusTrap onClose={onClose}>
			<div className="modal-backdrop" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
				<div
					className="modal scroll-fade"
					data-scroll-active={isOverflowing ? 'true' : 'false'}
					onClick={(e) => e.stopPropagation()}
					ref={modalRef}
					style={{ maxWidth: width || 'var(--modal-default-width)', '--scroll-fade-to': 'var(--panel)' } as React.CSSProperties}
				>
					{title != null && <h3 style={{ marginTop: 0 }}>{title}</h3>}
					<div>{children}</div>
					{footer && (
						<div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-sm)', marginTop: 'var(--space-md)' }}>
							{footer}
						</div>
					)}
				</div>
			</div>
		</FocusTrap>,
		modalRoot
	);
}

export function ModalFooter({
	onCancel,
	onConfirm,
	confirmText = UI_TEXTS.SAVE,
	cancelText = UI_TEXTS.CANCEL,
}: {
	onCancel?: () => void;
	onConfirm: () => void;
	confirmText?: string;
	cancelText?: string;
}): React.ReactElement {
	return (
		<>
			{onCancel && <Button type="button" variant="secondary" onClick={onCancel}>{cancelText}</Button>}
			<Button type="button" variant="primary" onClick={onConfirm}>{confirmText}</Button>
		</>
	);
}

function FocusTrap({
	children,
	onClose,
}: {
	children: React.ReactNode;
	onClose: () => void;
}): React.ReactElement {
	const containerRef = React.useRef<HTMLDivElement>(null);
	React.useEffect(() => {
		const container = containerRef.current;
		if (!container) return;
		const previouslyFocused = document.activeElement as HTMLElement | null;
		// Focus first focusable
		const focusables = getFocusable(container);
		(focusables[0] || container).focus();
		function onKeyDown(e: KeyboardEvent) {
			if (e.key === 'Escape') {
				onClose();
				return;
			}
			if (e.key === 'Tab') {
				if (focusables.length === 0) {
					e.preventDefault();
					return;
				}
				const currentIndex = focusables.indexOf(document.activeElement as HTMLElement);
				if (e.shiftKey) {
					if (currentIndex <= 0) {
						e.preventDefault();
						focusables[focusables.length - 1].focus();
					}
				} else {
					if (currentIndex === focusables.length - 1) {
						e.preventDefault();
						focusables[0].focus();
					}
				}
			}
		}
		document.addEventListener('keydown', onKeyDown);
		return () => {
			document.removeEventListener('keydown', onKeyDown);
			previouslyFocused?.focus();
		};
	}, [onClose]);
	return <div ref={containerRef}>{children}</div>;
}

function getFocusable(root: HTMLElement): HTMLElement[] {
	const selectors = [
		'a[href]',
		'button:not([disabled])',
		'textarea:not([disabled])',
		'input:not([disabled])',
		'select:not([disabled])',
		'[tabindex]:not([tabindex="-1"])',
	].join(',');
	return Array.from(root.querySelectorAll<HTMLElement>(selectors))
		.filter((el) => !el.hasAttribute('disabled') && !el.getAttribute('aria-hidden'));
}


