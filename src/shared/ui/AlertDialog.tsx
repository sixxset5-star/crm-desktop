import React from 'react';
import { Modal, ModalFooter } from './Modal';
import { UI_TEXTS } from '@/shared/constants/ui-texts';

export type AlertDialogOptions = {
	title?: string;
	message: string;
	buttonText?: string;
};

type AlertDialogProps = {
	open: boolean;
	options: AlertDialogOptions | null;
	onClose: () => void;
};

export function AlertDialog({
	open,
	options,
	onClose,
}: AlertDialogProps): React.ReactElement | null {
	if (!open || !options) return null;

	const {
		title = UI_TEXTS.NOTIFICATION,
		message,
		buttonText = UI_TEXTS.OK,
	} = options;

	return (
		<Modal
			open={open}
			onClose={onClose}
			title={title}
			width={400}
			footer={
				<div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-sm)' }}>
					<ModalFooter
						onConfirm={onClose}
						confirmText={buttonText}
					/>
				</div>
			}
		>
			<p style={{ margin: 0, color: 'var(--text)', whiteSpace: 'pre-line' }}>
				{message}
			</p>
		</Modal>
	);
}

