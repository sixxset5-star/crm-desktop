/**
 * FilesSection - Секция для управления файлами
 * 
 * Только UI-контейнер, без бизнес-логики.
 */
import React from 'react';
import { FileItem } from './FileItem';
import { FileAddButton } from './FileAddButton';

type FilesSectionProps = {
	files: string[];
	onAddFiles: () => void;
	onRemoveFile: (idx: number) => void;
	onRenameFile: (idx: number, newFileName: string) => void;
};

export function FilesSection({
	files,
	onAddFiles,
	onRemoveFile,
	onRenameFile,
}: FilesSectionProps) {
	return (
		<div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
			{files.map((file, idx) => {
				const fileName = file.split(/[/\\]/).pop() || file;
				return (
					<FileItem
						key={`file-${idx}-${file}`}
						file={file}
						fileName={fileName}
						onRemove={() => onRemoveFile(idx)}
						onRename={onRenameFile ? (newFileName) => onRenameFile(idx, newFileName) : undefined}
					/>
				);
			})}
			<FileAddButton
				onClick={(e: React.MouseEvent<HTMLButtonElement>) => {
					e.preventDefault();
					e.stopPropagation();
					onAddFiles();
				}}
			/>
		</div>
	);
}

