import React from 'react';
import cardStyles from './Card.module.css';
import tableStyles from './Table.module.css';
import tabsStyles from './Tabs.module.css';

export function Card({
	children,
	className,
}: {
	children: React.ReactNode;
	className?: string;
}): React.ReactElement {
	return <div className={[cardStyles.card, className || ''].join(' ').trim()}>{children}</div>;
}

export function CardHeader({
	title,
	actions,
	className,
}: {
	title?: React.ReactNode;
	actions?: React.ReactNode;
	className?: string;
}): React.ReactElement {
	return (
		<div className={[cardStyles.header, className || ''].join(' ').trim()}>
			{title != null ? <div className={cardStyles.title}>{title}</div> : <div />}
			{actions}
		</div>
	);
}

export function CardContent({
	children,
	className,
}: {
	children: React.ReactNode;
	className?: string;
}): React.ReactElement {
	return <div className={[cardStyles.content, className || ''].join(' ').trim()}>{children}</div>;
}

export function CardFooter({
	children,
	className,
}: {
	children: React.ReactNode;
	className?: string;
}): React.ReactElement {
	return <div className={[cardStyles.footer, className || ''].join(' ').trim()}>{children}</div>;
}

export function Table({ children, className }: { children: React.ReactNode; className?: string }): React.ReactElement {
	return <table className={[tableStyles.table, className || ''].join(' ').trim()}>{children}</table>;
}

export function THead({ children }: { children: React.ReactNode }): React.ReactElement {
	return <thead>{children}</thead>;
}

export function TBody({ children }: { children: React.ReactNode }): React.ReactElement {
	return <tbody>{children}</tbody>;
}

export function TH({ children, align = 'left', className }: { children?: React.ReactNode; align?: 'left' | 'right' | 'center'; className?: string }): React.ReactElement {
	return <th className={[className || ''].join(' ').trim()} style={{ textAlign: align }}>{children ?? null}</th>;
}

export function TD({ children, align = 'left', className }: { children?: React.ReactNode; align?: 'left' | 'right' | 'center'; className?: string }): React.ReactElement {
	return <td className={[className || ''].join(' ').trim()} style={{ textAlign: align }}>{children ?? null}</td>;
}

export function EmptyRow({ colSpan = 1, children }: { colSpan?: number; children: React.ReactNode }): React.ReactElement {
	return (
		<tr>
			<td colSpan={colSpan} className={tableStyles.emptyRow}>
				{children}
			</td>
		</tr>
	);
}

export type Tab = { id: string; title: string };

export function Tabs({
	tabs,
	activeId,
	onChange,
}: {
	tabs: Tab[];
	activeId: string;
	onChange: (id: string) => void;
}): React.ReactElement {
	return (
		<div className={tabsStyles.tabs}>
			{tabs.map((t) => (
				<button
					key={t.id}
					type="button"
					onClick={() => onChange(t.id)}
					className={[tabsStyles.tab, t.id === activeId ? tabsStyles.active : ''].join(' ').trim()}
				>
					{t.title}
				</button>
			))}
		</div>
	);
}


