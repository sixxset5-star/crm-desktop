/**
 * LinksSection - Секция для управления ссылками
 * 
 * Только UI-контейнер, без бизнес-логики.
 */
import React from 'react';
import type { TaskLink } from '@/types';
import { LinkItem } from './LinkItem';
import { LinkContextMenu } from './LinkContextMenu';
import { LinkAddInput } from './LinkAddInput';
import { LinkEditInput } from './LinkEditInput';

type LinksSectionProps = {
	links: TaskLink[];
	newLink: string;
	linkError: string | null;
	editingLinkName: { idx: number; name: string } | null;
	linkContextMenu: { x: number; y: number; linkIdx: number } | null;
	onAddLink: () => void;
	onRemoveLink: (idx: number) => void;
	onUpdateLinkName: (idx: number, name: string) => void;
	onNewLinkChange: (value: string) => void;
	onNewLinkValidate: (value: string) => { valid: boolean; error?: string };
	onSetLinkError: (error: string | null) => void;
	onSetEditingLinkName: (editing: { idx: number; name: string } | null) => void;
	onCancelEditingLinkName: () => void;
	onHandleLinkContextMenu: (e: React.MouseEvent, idx: number) => void;
	onCloseLinkContextMenu: () => void;
	onStartEditingLinkName: (idx: number, name: string) => void;
	onGoToLink: (url: string) => void;
	onGoToLinkExternal: (url: string) => Promise<void>;
	selectAllOnDoubleClick: (e: React.MouseEvent) => void;
};

export function LinksSection({
	links,
	newLink,
	linkError,
	editingLinkName,
	linkContextMenu,
	onAddLink,
	onRemoveLink,
	onUpdateLinkName,
	onNewLinkChange,
	onNewLinkValidate,
	onSetLinkError,
	onSetEditingLinkName,
	onCancelEditingLinkName,
	onHandleLinkContextMenu,
	onCloseLinkContextMenu,
	onStartEditingLinkName,
	onGoToLink,
	onGoToLinkExternal,
	selectAllOnDoubleClick,
}: LinksSectionProps) {
	return (
		<div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
			{links.map((link, idx) => (
				editingLinkName?.idx === idx ? (
					<LinkEditInput
						key={idx}
						value={editingLinkName.name}
						onChange={(val) => onSetEditingLinkName({ idx, name: val })}
						onSave={() => onUpdateLinkName(idx, editingLinkName.name)}
						onCancel={onCancelEditingLinkName}
					/>
				) : (
					<LinkItem
						key={idx}
						link={link}
						onContextMenu={(e: React.MouseEvent<Element>) => onHandleLinkContextMenu(e, idx)}
					/>
				)
			))}
			<LinkAddInput
				value={newLink}
				error={linkError}
				onChange={onNewLinkChange}
				onValidate={onNewLinkValidate}
				onSetError={onSetLinkError}
				onAdd={onAddLink}
				selectAllOnDoubleClick={selectAllOnDoubleClick}
			/>
			{linkContextMenu && (
				<LinkContextMenu
					x={linkContextMenu.x}
					y={linkContextMenu.y}
					onClose={onCloseLinkContextMenu}
					onGoTo={() => {
						onGoToLink(links[linkContextMenu.linkIdx].url);
						onCloseLinkContextMenu();
					}}
					onGoToExternal={async () => {
						await onGoToLinkExternal(links[linkContextMenu.linkIdx].url);
						onCloseLinkContextMenu();
					}}
					onEditName={() => {
						onStartEditingLinkName(linkContextMenu.linkIdx, links[linkContextMenu.linkIdx].name || '');
						onCloseLinkContextMenu();
					}}
					onDelete={() => {
						onRemoveLink(linkContextMenu.linkIdx);
						onCloseLinkContextMenu();
					}}
				/>
			)}
		</div>
	);
}
