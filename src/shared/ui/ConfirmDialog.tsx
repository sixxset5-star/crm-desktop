import React from 'react';
import { Modal, ModalFooter } from './Modal';
import { Button } from './Controls';
import { UI_TEXTS } from '@/shared/constants/ui-texts';

export type ConfirmDialogOptions = {
	title?: string;
	message: string;
	confirmText?: string;
	cancelText?: string;
	variant?: 'danger' | 'primary';
};

type ConfirmDialogProps = {
	open: boolean;
	options: ConfirmDialogOptions | null;
	onConfirm: () => void;
	onCancel: () => void;
};

export function ConfirmDialog({
	open,
	options,
	onConfirm,
	onCancel,
}: ConfirmDialogProps): React.ReactElement | null {
	if (!open || !options) return null;

	const {
		title = UI_TEXTS.CONFIRMATION,
		message,
		confirmText = UI_TEXTS.CONFIRM,
		cancelText = UI_TEXTS.CANCEL,
		variant = 'primary',
	} = options;

	return (
		<Modal
			open={open}
			onClose={onCancel}
			title={title}
			width={400}
			footer={
				<div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-sm)' }}>
					<Button type="button" variant="secondary" onClick={onCancel}>
						{cancelText}
					</Button>
					<Button type="button" variant={variant === 'danger' ? 'danger' : 'primary'} onClick={onConfirm}>
						{confirmText}
					</Button>
				</div>
			}
		>
			<p style={{ margin: 0, color: 'var(--text)', whiteSpace: 'pre-line' }}>
				{message}
			</p>
		</Modal>
	);
}

