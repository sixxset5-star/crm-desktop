import React, { useEffect, useMemo } from 'react';
import { useUIStore } from '@/store/ui';
import { getTokenString, getToken } from '@/shared/lib/tokens';

export function ErrorMessage(): React.ReactElement | null {
	const error = useUIStore((s) => s.error);
	const messageType = useUIStore((s) => s.messageType);
	const clearError = useUIStore((s) => s.clearError);
	
	useEffect(() => {
		if (error) {
			// Автоматически скрываем сообщение через заданное время
			const timeout = getTokenString('--notification-timeout', '5000ms');
			const timeoutMs = parseInt(timeout.replace('ms', ''), 10) || 5000;
			const timer = setTimeout(() => {
				clearError();
			}, timeoutMs);
			return () => clearTimeout(timer);
		}
	}, [error, clearError]);
	
	if (!error) return null;
	
	const backgroundColor = messageType === 'success' 
		? 'var(--green)' 
		: messageType === 'info'
		? 'var(--accent)'
		: 'var(--red)';
	
	// Для success-уведомлений показываем снизу посередине, для остальных - справа сверху
	const isSuccess = messageType === 'success';
	
	return (
		<div
			style={{
				position: 'fixed',
				...(isSuccess ? {
					bottom: 'var(--notification-position-offset)',
					left: '50%',
					transform: 'translateX(-50%)',
				} : {
					top: 'var(--notification-position-offset)',
					right: 'var(--notification-position-offset)',
				}),
				background: backgroundColor,
				color: 'var(--white)',
				padding: 'var(--notification-padding)',
				borderRadius: 'var(--radius-md)',
				boxShadow: 'var(--shadow-sm)',
				zIndex: 'var(--notification-z-index)',
				maxWidth: 'var(--notification-max-width)',
				wordBreak: 'break-word',
				display: 'flex',
				alignItems: 'flex-start',
				gap: 'var(--notification-gap)',
			}}
		>
			<div style={{ flex: 1, whiteSpace: 'pre-wrap' }}>{error}</div>
			<button
				onClick={clearError}
				style={{
					background: 'transparent',
					border: 'none',
					color: 'var(--white)',
					cursor: 'pointer',
					padding: 0,
					fontSize: 'var(--notification-close-font-size)',
					lineHeight: 1,
					opacity: 'var(--notification-close-opacity)',
					flexShrink: 0,
				}}
				title="Закрыть"
			>
				×
			</button>
		</div>
	);
}

export function LoadingSpinner({ size = 'medium' }: { size?: 'small' | 'medium' | 'large' | number }): React.ReactElement {
	const px = useMemo(() => {
		if (typeof size === 'number') return size;
		if (size === 'small') return getToken('--icon-size-sm', 16);
		if (size === 'large') return getToken('--icon-size-lg', 24);
		return getToken('--icon-size-md', 20);
	}, [size]);
	return (
		<div role="status" aria-live="polite" style={{ display: 'inline-block', width: px, height: px, borderRadius: '50%', border: '2px solid var(--border)', borderTopColor: 'var(--accent)', animation: 'spin 0.8s linear infinite' }}>
			<style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
		</div>
	);
}

type SectionHeaderProps = {
	title: string;
	marginTop?: number;
	marginBottom?: number;
};

export function SectionHeader({ title, marginTop, marginBottom }: SectionHeaderProps): React.ReactElement {
	return (
		<div className="section-header" style={{ marginTop: marginTop ?? 'var(--space-md)', marginBottom: marginBottom ?? 'var(--space-xs)' }}>
			<div
				style={{
					fontSize: 'var(--font-size-xs)',
					fontWeight: 'var(--font-weight-semibold)',
					color: 'var(--muted)',
					textTransform: 'uppercase',
					letterSpacing: '0.5px',
					padding: 'var(--space-sm) var(--space-md)',
				}}
			>
				{title}
			</div>
		</div>
	);
}




