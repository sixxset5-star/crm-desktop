import React, { useState, useRef, useEffect } from 'react';
import { HelpCircleIcon } from './Icons';

export function MetricCard({
	title,
	value,
	valueColor,
	explanation,
	border = true,
}: {
	title: string;
	value: React.ReactNode;
	valueColor?: string;
	explanation?: string;
	border?: boolean;
}): React.ReactElement {
	const [showTooltip, setShowTooltip] = useState(false);
	const tooltipRef = useRef<HTMLDivElement>(null);
	const buttonRef = useRef<HTMLButtonElement>(null);

	useEffect(() => {
		if (!showTooltip) return;

		function handleClickOutside(event: MouseEvent) {
			if (
				tooltipRef.current &&
				!tooltipRef.current.contains(event.target as Node) &&
				buttonRef.current &&
				!buttonRef.current.contains(event.target as Node)
			) {
				setShowTooltip(false);
			}
		}

		function handleEscape(event: KeyboardEvent) {
			if (event.key === 'Escape') {
				setShowTooltip(false);
			}
		}

		document.addEventListener('mousedown', handleClickOutside);
		document.addEventListener('keydown', handleEscape);

		return () => {
			document.removeEventListener('mousedown', handleClickOutside);
			document.removeEventListener('keydown', handleEscape);
		};
	}, [showTooltip]);

	if (!explanation) {
		return (
			<div className="kpi" style={{ border: border ? undefined : 'none' }}>
				<div className="kpi-title">{title}</div>
				<div className="kpi-value" style={{ color: valueColor }}>
					{value}
				</div>
			</div>
		);
	}

	return (
		<div className="kpi" style={{ border: border ? undefined : 'none', position: 'relative' }}>
			<div className="kpi-title" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
				<span>{title}</span>
				<button
					ref={buttonRef}
					type="button"
					onClick={(e) => {
						e.stopPropagation();
						setShowTooltip(!showTooltip);
					}}
					style={{
						background: 'transparent',
						border: 'none',
						padding: 0,
						cursor: 'pointer',
						display: 'flex',
						alignItems: 'center',
						color: 'var(--muted)',
						transition: 'color 0.2s',
					}}
					onMouseEnter={(e) => {
						e.currentTarget.style.color = 'var(--accent)';
					}}
					onMouseLeave={(e) => {
						e.currentTarget.style.color = 'var(--muted)';
					}}
					title="Как это вычисляется?"
				>
					<HelpCircleIcon size={14} color="currentColor" />
				</button>
			</div>
			<div className="kpi-value" style={{ color: valueColor }}>
				{value}
			</div>
			{showTooltip && (
				<div
					ref={tooltipRef}
					style={{
						position: 'absolute',
						top: '100%',
						left: 0,
						marginTop: 'var(--space-sm)',
						padding: 'var(--space-md)',
						background: 'var(--panel)',
						border: 'var(--border-width) solid var(--border)',
						borderRadius: 'var(--radius-md)',
						boxShadow: '0 4px 12px color-mix(in srgb, var(--black) 15%, transparent)',
						zIndex: 1000,
						minWidth: 280,
						maxWidth: 400,
						fontSize: 'var(--font-size-sm)',
						lineHeight: 1.5,
						color: 'var(--text)',
					}}
				>
					<div style={{ fontWeight: 600, marginBottom: 'var(--space-sm)', color: 'var(--text)' }}>
						{title}
					</div>
					<div style={{ color: 'var(--muted)' }}>{explanation}</div>
				</div>
			)}
		</div>
	);
}

