import React from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import '@/shared/styles/styles.css';
import { ErrorBoundary } from '@/shared/components/ErrorBoundary';
import { loadAllStores } from './store';
import { createLogger } from '@/shared/lib/logger';

const log = createLogger('Main');

const container = document.getElementById('root');
if (!container) {
	throw new Error('Root container with id="root" not found');
}

const root = createRoot(container);
function Bootstrap() {
	// Сбрасываем флаги загрузки при обновлении страницы
	React.useEffect(() => {
		// При монтировании компонента (обновлении страницы) всегда загружаем данные
		loadAllStores().catch((error) => {
			log.error('Error loading data', error);
		});
	}, []);
	
	return <App />;
}

root.render(
    <React.StrictMode>
		<ErrorBoundary>
			<Bootstrap />
		</ErrorBoundary>
    </React.StrictMode>
);


