import { create } from 'zustand';
import type { ConfirmDialogOptions } from '@/shared/ui/ConfirmDialog';
import type { AlertDialogOptions } from '@/shared/ui/AlertDialog';
import { generateShortId } from '@/shared/utils/id';

type MessageType = 'error' | 'success' | 'info';

export type ResultToastType = 'success' | 'info' | 'warning';

export type ResultToast = {
	id: string;
	type: ResultToastType;
	title: string;
	subtitle?: string;
};

type UIState = {
	loading: boolean;
	error: string | null;
	messageType: MessageType | null;
	bannerVisible: boolean;
	bannerTitle: string;
	progressPercent: number | null;
	toasts: ResultToast[];
	// Confirm dialog state
	confirmDialog: ConfirmDialogOptions | null;
	confirmDialogResolve: ((value: boolean) => void) | null;
	// Alert dialog state
	alertDialog: AlertDialogOptions | null;
	alertDialogResolve: (() => void) | null;
	showError: (message: string) => void;
	showSuccess: (message: string) => void;
	showInfo: (message: string) => void;
	showBanner: (title: string) => void;
	updateProgress: (value: number | null) => void;
	hideBanner: () => void;
	clearError: () => void;
	setLoading: (loading: boolean) => void;
	showResultToast: (toast: Omit<ResultToast, 'id'>) => void;
	removeToast: (id: string) => void;
	// Dialog methods
	showConfirm: (options: ConfirmDialogOptions) => Promise<boolean>;
	showAlert: (options: AlertDialogOptions) => Promise<void>;
};

function generateToastId(): string {
	return `${Date.now()}-${generateShortId()}`;
}

export const useUIStore = create<UIState>((set, get) => ({
	loading: false,
	error: null,
	messageType: null,
	bannerVisible: false,
	bannerTitle: '',
	progressPercent: null,
	toasts: [],
	confirmDialog: null,
	confirmDialogResolve: null,
	alertDialog: null,
	alertDialogResolve: null,
	showError: (message: string) => set({ error: message, messageType: 'error' }),
	showSuccess: (message: string) => set({ error: message, messageType: 'success' }),
	showInfo: (message: string) => set({ error: message, messageType: 'info' }),
	showBanner: (title: string) => set({ bannerVisible: true, bannerTitle: title, progressPercent: null }),
	updateProgress: (value: number | null) => set({ progressPercent: value }),
	hideBanner: () => set({ bannerVisible: false, bannerTitle: '', progressPercent: null }),
	clearError: () => set({ error: null, messageType: null }),
	setLoading: (loading: boolean) => set({ loading }),
	showResultToast: (toast: Omit<ResultToast, 'id'>) =>
		set((state) => ({
			toasts: [...state.toasts, { id: generateToastId(), ...toast }],
		})),
	removeToast: (id: string) =>
		set((state) => ({
			toasts: state.toasts.filter((t) => t.id !== id),
		})),
	showConfirm: (options: ConfirmDialogOptions) => {
		return new Promise<boolean>((resolve) => {
			set({
				confirmDialog: options,
				confirmDialogResolve: resolve,
			});
		});
	},
	showAlert: (options: AlertDialogOptions) => {
		return new Promise<void>((resolve) => {
			set({
				alertDialog: options,
				alertDialogResolve: resolve,
			});
		});
	},
}));

