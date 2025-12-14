import React, { Suspense, lazy, useEffect } from 'react';
import { HashRouter, Routes, Route } from 'react-router-dom';
import { Layout } from '@/shared/components/Layout';
import { ErrorBoundary } from '@/shared/components/ErrorBoundary';
import { UI_TEXTS } from '@/shared/constants/ui-texts';
import { DialogManager } from '@/shared/components/DialogManager';
import { preloadLazy } from '@/shared/utils/preload';
import loadingStyles from '@/shared/components/LoadingFallback.module.css';

// Lazy load страниц для оптимизации начальной загрузки
const Dashboard = lazy(() => import('./pages/Dashboard').then(m => ({ default: m.Dashboard })));
const Reports = lazy(() => import('./pages/Reports').then(m => ({ default: m.Reports })));
const Workload = lazy(() => import('./pages/Workload').then(m => ({ default: m.Workload })));
const Customers = lazy(() => import('./pages/Customers').then(m => ({ default: m.Customers })));
const Contractors = lazy(() => import('./pages/Contractors').then(m => ({ default: m.Contractors })));
const Settings = lazy(() => import('./pages/Settings').then(m => ({ default: m.Settings })));
const Archive = lazy(() => import('./pages/Archive').then(m => ({ default: m.Archive })));
const FinancialModel = lazy(() => import('./pages/FinancialModel').then(m => ({ default: m.FinancialModel })));
const Calculator = lazy(() => import('./pages/Calculator').then(m => ({ default: m.Calculator })));
const Taxes = lazy(() => import('./pages/Taxes').then(m => ({ default: m.Taxes })));

// Fallback компонент для загрузки
const LoadingFallback = () => (
	<div className={loadingStyles.loadingFallback}>
		{UI_TEXTS.LOADING}
	</div>
);

// Компонент-обертка для страниц с Error Boundary
function PageWrapper({ children }: { children: React.ReactNode }) {
	return (
		<ErrorBoundary>
			{children}
		</ErrorBoundary>
	);
}

export function App(): React.ReactElement {
	// Preload критичных страниц после загрузки приложения
	useEffect(() => {
		const preloadCriticalPages = () => {
			// Используем requestIdleCallback для неблокирующего preloading
			if ('requestIdleCallback' in window && typeof window.requestIdleCallback === 'function') {
				window.requestIdleCallback(() => {
					preloadLazy(() => import('./pages/Dashboard'));
					preloadLazy(() => import('./pages/Customers'));
					preloadLazy(() => import('./pages/Contractors'));
				}, { timeout: 2000 });
			} else {
				// Fallback для браузеров без requestIdleCallback
				setTimeout(() => {
					preloadLazy(() => import('./pages/Dashboard'));
					preloadLazy(() => import('./pages/Customers'));
					preloadLazy(() => import('./pages/Contractors'));
				}, 1000);
			}
		};

		preloadCriticalPages();
	}, []);

	return (
		<HashRouter>
			<Layout>
				<Suspense fallback={<LoadingFallback />}>
					<Routes>
						<Route path="/" element={<PageWrapper><Dashboard /></PageWrapper>} />
						<Route path="/reports" element={<PageWrapper><Reports /></PageWrapper>} />
						<Route path="/workload" element={<PageWrapper><Workload /></PageWrapper>} />
						<Route path="/customers" element={<PageWrapper><Customers /></PageWrapper>} />
						<Route path="/contractors" element={<PageWrapper><Contractors /></PageWrapper>} />
						<Route path="/financial-model" element={<PageWrapper><FinancialModel /></PageWrapper>} />
						<Route path="/calculator" element={<PageWrapper><Calculator /></PageWrapper>} />
						<Route path="/taxes" element={<PageWrapper><Taxes /></PageWrapper>} />
						<Route path="/settings" element={<PageWrapper><Settings /></PageWrapper>} />
						<Route path="/archive" element={<PageWrapper><Archive /></PageWrapper>} />
					</Routes>
				</Suspense>
				<DialogManager />
			</Layout>
		</HashRouter>
	);
}


