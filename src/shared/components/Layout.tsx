import React, { useState, useRef, useEffect } from 'react';
import { Sidebar } from '@/shared/components/Sidebar';
import { useBoardStore } from '@/store/board';
import { useSettingsStore } from '@/store/settings';
import { GlobalSearch } from '@/shared/components/GlobalSearch';
import { useShallowSelector } from '@/shared/hooks/useStoreSelectors';
import { useNavigate } from 'react-router-dom';
import { subscribeToEvent, requestInstallUpdate, requestUpdateCheck } from '@/shared/lib/electron-bridge';
import { useUIStore } from '@/store/ui';
import { LoadingSpinner, ErrorMessage } from '@/shared/components/Feedback';
import { ResultToastsContainer } from '@/shared/components/ResultToastsContainer';
import { AlertIcon, ClockIcon, XIcon } from '@/shared/components/Icons';

type LayoutProps = {
	children: React.ReactNode;
};

export function Layout({ children }: LayoutProps): React.ReactElement {
	const tasks = useShallowSelector(useBoardStore, (s) => s.tasks);
	const loading = useBoardStore((s) => s.loading);
	const settings = useShallowSelector(useSettingsStore, (s) => s.settings);
	const navigate = useNavigate();
	const [showGlobalSearch, setShowGlobalSearch] = useState(false);
	const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
	const updateTask = useBoardStore((s) => s.updateTask);
	const notifiedTasksRef = useRef<Set<string>>(new Set());
	const notifiedHolidaysRef = useRef<Set<string>>(new Set());
	const showInfo = useUIStore((s) => s.showInfo);
	const showSuccess = useUIStore((s) => s.showSuccess);
	const showError = useUIStore((s) => s.showError);
	const showBanner = useUIStore((s) => s.showBanner);
	const updateProgress = useUIStore((s) => s.updateProgress);
	
	// Уведомления отключены
	React.useEffect(() => {
		// No-op: keep to reset if notifications return
	}, [tasks, settings.holidays]);

	// Горячая клавиша для поиска (Ctrl+K или Cmd+K)
	React.useEffect(() => {
		function handleKeyDown(e: KeyboardEvent) {
			if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
				e.preventDefault();
				setShowGlobalSearch(true);
			}
			if (e.key === 'Escape' && showGlobalSearch) {
				setShowGlobalSearch(false);
			}
		}
		window.addEventListener('keydown', handleKeyDown);
		return () => window.removeEventListener('keydown', handleKeyDown);
	}, [showGlobalSearch]);

	useEffect(() => {
		const unsubscribeBanner = subscribeToEvent('ui:banner', (payload) => {
			if (!payload || typeof payload !== 'object') {
				return;
			}
			const data = payload as { type?: 'info' | 'success' | 'error'; message?: string };
			if (!data.message) {
				return;
			}
			if (data.type === 'success') {
				showSuccess(data.message);
			} else if (data.type === 'error') {
				showError(data.message);
			} else {
				showInfo(data.message);
			}
		});

		const unsubscribeReady = subscribeToEvent('updates:ready', () => {
			showBanner('Обновление скачано. Перезапускаем…');
			updateProgress(null);
			setTimeout(() => {
				requestInstallUpdate();
			}, 2000);
		});

		const unsubscribeProgress = subscribeToEvent('updates:download-progress', (payload) => {
			if (!payload || typeof payload !== 'object') {
				return;
			}
			const data = payload as { percent?: number };
			if (typeof data.percent === 'number') {
				updateProgress(data.percent);
			}
		});

		const unsubscribeAvailable = subscribeToEvent('updates:available', (payload) => {
			if (!payload || typeof payload !== 'object') {
				return;
			}
			const data = payload as { version?: string };
			showBanner(`Загружаем ${data.version || ''}`);
			updateProgress(0);
		});

		const unsubscribeNone = subscribeToEvent('updates:none', (payload) => {
			const data = (payload && typeof payload === 'object' ? (payload as { version?: string }) : undefined);
			const version = data?.version;
			showBanner(version ? `Версия ${version} уже установлена` : 'Вы уже на последней версии');
			updateProgress(null);
		});

		void requestUpdateCheck();

		return () => {
			unsubscribeBanner();
			unsubscribeReady();
			unsubscribeProgress();
			unsubscribeAvailable();
			unsubscribeNone();
		};
	}, [showInfo, showSuccess, showError, showBanner, updateProgress]);

	function handleTaskClick(taskId: string) {
		navigate('/');
		setTimeout(() => {
			const task = tasks.find((t) => t.id === taskId);
			if (task) {
				updateTask(taskId, {});
			}
		}, 100);
	}

	function handleCustomerClick(customerId: string) {
		navigate('/customers');
	}

	function handleGoalClick(goalId: string) {
		navigate('/goals');
	}
	
	return (
		<div className={`app-root${sidebarCollapsed ? ' sidebar-collapsed' : ''}`}>
			<Sidebar onCollapse={() => setSidebarCollapsed((prev) => !prev)} collapsed={sidebarCollapsed} />
			<main className="content">
				{showGlobalSearch && (
					<GlobalSearch
						onClose={() => setShowGlobalSearch(false)}
						onTaskClick={handleTaskClick}
						onCustomerClick={handleCustomerClick}
						onGoalClick={handleGoalClick}
					/>
				)}
				
				{loading && (
					<div style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', zIndex: 1000 }}>
						<LoadingSpinner size="large" />
					</div>
				)}
				<ErrorMessage />
				<ResultToastsContainer />
				{children}
			</main>
		</div>
	);
}


