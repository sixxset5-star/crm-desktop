import React from 'react';
import { useUIStore } from '@/store/ui';
import { useShallowSelector } from '@/shared/hooks/useStoreSelectors';
import { ConfirmDialog } from '@/shared/ui/ConfirmDialog';
import { AlertDialog } from '@/shared/ui/AlertDialog';

/**
 * Глобальный менеджер диалогов, который рендерит confirm и alert диалоги
 * на основе состояния UI store
 */
export function DialogManager(): React.ReactElement {
	const confirmDialog = useShallowSelector(useUIStore, (s) => s.confirmDialog);
	const alertDialog = useShallowSelector(useUIStore, (s) => s.alertDialog);
	const confirmDialogResolve = useUIStore((s) => s.confirmDialogResolve);
	const alertDialogResolve = useUIStore((s) => s.alertDialogResolve);

	const handleConfirm = () => {
		if (confirmDialogResolve) {
			confirmDialogResolve(true);
			useUIStore.setState({ confirmDialog: null, confirmDialogResolve: null });
		}
	};

	const handleCancel = () => {
		if (confirmDialogResolve) {
			confirmDialogResolve(false);
			useUIStore.setState({ confirmDialog: null, confirmDialogResolve: null });
		}
	};

	const handleAlertClose = () => {
		if (alertDialogResolve) {
			alertDialogResolve();
			useUIStore.setState({ alertDialog: null, alertDialogResolve: null });
		}
	};

	return (
		<>
			<ConfirmDialog
				open={!!confirmDialog}
				options={confirmDialog}
				onConfirm={handleConfirm}
				onCancel={handleCancel}
			/>
			<AlertDialog
				open={!!alertDialog}
				options={alertDialog}
				onClose={handleAlertClose}
			/>
		</>
	);
}


