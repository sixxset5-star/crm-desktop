import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Button } from '@/shared/ui';
import { createLogger } from '@/shared/lib/logger';

const log = createLogger('ErrorBoundary');

interface Props {
	children: ReactNode;
	fallback?: ReactNode;
	onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
	hasError: boolean;
	error?: Error;
	errorInfo?: ErrorInfo;
}

/**
 * Error Boundary компонент для обработки ошибок React
 * Используется для изоляции ошибок в отдельных частях приложения
 */
export class ErrorBoundary extends Component<Props, State> {
	constructor(props: Props) {
		super(props);
		this.state = { hasError: false };
	}

	static getDerivedStateFromError(error: Error): State {
		return { hasError: true, error };
	}

	componentDidCatch(error: Error, errorInfo: ErrorInfo) {
		log.error('Error caught by boundary', { error, errorInfo });
		
		// Сохраняем детали ошибки для отображения
		this.setState({ errorInfo });
		
		// Вызываем callback, если передан
		if (this.props.onError) {
			this.props.onError(error, errorInfo);
		}
	}

	handleReset = () => {
		this.setState({ hasError: false, error: undefined, errorInfo: undefined });
	};

	render() {
		if (this.state.hasError) {
			// Если передан кастомный fallback, используем его
			if (this.props.fallback) {
				return this.props.fallback;
			}

			// Стандартный UI ошибки
			return (
				<div style={{
					padding: 'var(--space-xl)',
					fontFamily: 'system-ui',
					color: 'var(--red)',
					maxWidth: '800px',
					margin: '0 auto'
				}}>
					<h1 style={{ marginBottom: 'var(--space-md)' }}>Произошла ошибка</h1>
					<p style={{ marginBottom: 'var(--space-lg)', color: 'var(--text)' }}>
						{this.state.error?.message || 'Неизвестная ошибка'}
					</p>
					<div style={{ display: 'flex', gap: 'var(--space-sm)', marginBottom: 'var(--space-lg)' }}>
						<Button onClick={this.handleReset} variant="primary">
							Попробовать снова
						</Button>
						<Button onClick={() => window.location.reload()} variant="secondary">
							Обновить страницу
						</Button>
					</div>
					{process.env.NODE_ENV === 'development' && this.state.errorInfo && (
						<details style={{ marginTop: 'var(--space-xl)' }}>
							<summary style={{ cursor: 'pointer', marginBottom: 'var(--space-sm)' }}>
								Детали ошибки (только в dev режиме)
							</summary>
							<pre style={{
								background: 'var(--panel-muted)',
								padding: 'var(--space-sm)',
								borderRadius: 'var(--radius-md)',
								overflow: 'auto',
								fontSize: '12px',
								lineHeight: '1.5'
							}}>
								{this.state.error?.stack}
								{'\n\n'}
								{this.state.errorInfo.componentStack}
							</pre>
						</details>
					)}
				</div>
			);
		}

		return this.props.children;
	}
}





