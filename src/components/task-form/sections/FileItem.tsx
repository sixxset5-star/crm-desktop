/**
 * FileItem - Компонент элемента файла
 */
import React from 'react';
import { TextInput } from '@/shared/ui';
import IconButton from '@/shared/components/IconButton';
import { EditIcon, DownloadIcon, XIcon, CheckIcon } from '@/shared/components/Icons';
import { getTaskFilesDir, getFileSize, openFile, downloadFile, renameFile } from '@/shared/lib/electron-bridge';
import { createLogger } from '@/shared/lib/logger';

const log = createLogger('FileItem');

type FileItemProps = {
	file: string;
	fileName: string;
	onRemove: () => void;
	onRename?: (newFileName: string) => void;
};

export function FileItem({ file, fileName, onRemove, onRename }: FileItemProps) {
	const isWebUrl = file.startsWith('http://') || file.startsWith('https://');
	const fileExt = fileName.split('.').pop()?.toLowerCase() || '';
	const isImage = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'svg'].includes(fileExt);
	const isPdf = fileExt === 'pdf';
	const isDocument = ['doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'txt', 'rtf'].includes(fileExt);
	const [imageError, setImageError] = React.useState(false);
	const [imageLoading, setImageLoading] = React.useState(true);
	const [fileSize, setFileSize] = React.useState<number | null>(null);
	const [isRenaming, setIsRenaming] = React.useState(false);
	const [editFileName, setEditFileName] = React.useState(fileName);
	
	// Получаем размер файла
	React.useEffect(() => {
		async function loadFileSize() {
			if (isWebUrl) {
				try {
					const response = await fetch(file, { method: 'HEAD' });
					const contentLength = response.headers.get('content-length');
					if (contentLength) {
						setFileSize(parseInt(contentLength, 10));
					}
				} catch (error) {
					log.warn('Could not get file size for web URL', { file });
				}
				return;
			}
			
			if (file.startsWith('crm://')) {
				const url = file.replace('crm://', '');
				let decodedUrl: string;
				try {
					decodedUrl = decodeURIComponent(url);
				} catch {
					decodedUrl = url;
				}
				if (decodedUrl.startsWith('task-files/')) {
					const pathParts = decodedUrl.replace('task-files/', '').split('/');
					const taskId = pathParts[0];
					const fileName = pathParts.slice(1).join('/');
					const taskFilesDir = await getTaskFilesDir(taskId);
					if (taskFilesDir) {
						const filePath = `${taskFilesDir}/${fileName}`;
						const size = await getFileSize(filePath);
						if (size !== null) {
							setFileSize(size);
						}
					}
				}
			} else if (file.startsWith('file://')) {
				const filePath = file.replace('file://', '');
				const size = await getFileSize(filePath);
				if (size !== null) {
					setFileSize(size);
				}
			}
		}
		loadFileSize();
	}, [file, isWebUrl]);
	
	const formatFileSize = (bytes: number | null): string => {
		if (!bytes) return '';
		if (bytes < 1024) return `${bytes} Б`;
		if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} КБ`;
		if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} МБ`;
		return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} ГБ`;
	};
	
	const getImageSrc = () => {
		if (isWebUrl) return file;
		if (file.startsWith('crm://')) return file;
		if (file.startsWith('file://')) {
			const filePath = file.replace('file://', '');
			const match = filePath.match(/task-files[\/\\]([^\/\\]+)[\/\\](.+)$/);
			if (match) {
				const taskId = match[1];
				const fileName = match[2].replace(/\\/g, '/');
				const encodedFileName = encodeURIComponent(fileName).replace(/%2F/g, '/');
				return `crm://task-files/${taskId}/${encodedFileName}`;
			}
		}
		return file;
	};
	
	const imageSrc = getImageSrc();
	
	const getFilePath = async (): Promise<string | null> => {
		if (isWebUrl) return null;
		if (file.startsWith('crm://')) {
			const url = file.replace('crm://', '');
			const decodedUrl = decodeURIComponent(url);
			if (decodedUrl.startsWith('task-files/')) {
				const pathParts = decodedUrl.replace('task-files/', '').split('/');
				const taskId = pathParts[0];
				const fileName = pathParts.slice(1).join('/');
				const taskFilesDir = await getTaskFilesDir(taskId);
				if (taskFilesDir) {
					return `${taskFilesDir}/${fileName}`;
				}
			}
		} else if (file.startsWith('file://')) {
			return file.replace('file://', '');
		}
		return null;
	};
	
	const handleDownload = async () => {
		const filePath = await getFilePath();
		if (filePath) {
			const result = await downloadFile(filePath, fileName);
			if (!result.ok) {
				const { useUIStore } = await import('@/store/ui');
				useUIStore.getState().showError('Ошибка при скачивании файла: ' + (result.error || 'Неизвестная ошибка'));
			}
		} else if (isWebUrl) {
			window.open(file, '_blank');
		}
	};
	
	const handleRename = async () => {
		if (!onRename) return;
		const filePath = await getFilePath();
		if (filePath && editFileName.trim() && editFileName !== fileName) {
			const result = await renameFile(filePath, editFileName.trim());
			if (result.ok && result.path) {
				onRename(editFileName.trim());
				setIsRenaming(false);
			} else {
				const { useUIStore } = await import('@/store/ui');
				useUIStore.getState().showError('Ошибка при переименовании: ' + (result.error || 'Неизвестная ошибка'));
			}
		} else {
			setIsRenaming(false);
			setEditFileName(fileName);
		}
	};
	
	const getPreviewIcon = () => {
		if (isPdf) return '📄';
		if (isDocument) return '📝';
		return '📎';
	};
	
	return (
		<div 
			style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}
			onClick={(e: React.MouseEvent<HTMLDivElement>) => e.stopPropagation()}
		>
			<div style={{ 
				display: 'flex', 
				gap: 'var(--space-md)', 
				alignItems: 'center',
				padding: 'var(--space-sm)',
				background: 'var(--bg)',
				borderRadius: 'var(--radius-md)',
				border: 'var(--border-default)',
			}}
			onClick={(e: React.MouseEvent<HTMLDivElement>) => e.stopPropagation()}
			>
				{/* Превью файла */}
				{isImage ? (
					<div 
						style={{ position: 'relative', flexShrink: 0 }}
						onClick={(e: React.MouseEvent<HTMLDivElement>) => e.stopPropagation()}
					>
						{imageLoading && (
							<div style={{ 
								position: 'absolute',
								width: 80, 
								height: 80, 
								borderRadius: 'var(--radius-md)', 
								border: 'var(--border-default)',
								background: 'var(--bg)',
								display: 'flex',
								alignItems: 'center',
								justifyContent: 'center',
								fontSize: 'var(--font-size-lg)',
								color: 'var(--muted)',
							}}>
								📷
							</div>
						)}
						<img 
							src={imageSrc} 
							alt={fileName}
							style={{ 
								width: 80, 
								height: 80, 
								objectFit: 'cover', 
								borderRadius: 'var(--radius-md)', 
								border: 'var(--border-default)',
								cursor: 'pointer',
								boxShadow: '0 2px 4px color-mix(in srgb, var(--black) 10%, transparent)',
								transition: 'transform 0.2s, box-shadow 0.2s',
								display: imageLoading ? 'none' : 'block',
							}}
							onClick={async (e) => {
								e.preventDefault();
								e.stopPropagation();
								const filePath = await getFilePath();
								if (filePath) {
									await openFile(filePath);
								}
							}}
							onLoad={() => setImageLoading(false)}
							onMouseEnter={(e: React.MouseEvent<Element>) => {
								(e.currentTarget as HTMLElement).style.transform = 'scale(1.05)';
								(e.currentTarget as HTMLElement).style.boxShadow = '0 4px 8px color-mix(in srgb, var(--black) 15%, transparent)';
							}}
							onMouseLeave={(e: React.MouseEvent<Element>) => {
								(e.currentTarget as HTMLElement).style.transform = 'scale(1)';
								(e.currentTarget as HTMLElement).style.boxShadow = '0 2px 4px color-mix(in srgb, var(--black) 10%, transparent)';
							}}
							onError={() => {
								setImageError(true);
								setImageLoading(false);
							}}
						/>
					</div>
				) : (
					<div style={{ 
						width: 80, 
						height: 80, 
						borderRadius: 'var(--radius-md)', 
						border: 'var(--border-default)',
						background: 'var(--panel)',
						display: 'flex',
						alignItems: 'center',
						justifyContent: 'center',
						fontSize: 'var(--font-size-lg)',
						flexShrink: 0,
						cursor: 'pointer',
					}}
					onClick={(e: React.MouseEvent<HTMLDivElement>) => {
						e.stopPropagation();
						if (isPdf || isDocument) {
							getFilePath().then(path => {
								if (path) {
									openFile(path);
								}
							});
						}
					}}
					>
						{getPreviewIcon()}
					</div>
				)}
				
				{/* Информация о файле */}
				<div 
					style={{ 
						display: 'flex',
						flexDirection: 'column',
						gap: 'var(--space-xs)',
						flex: 1,
						minWidth: 0,
					}}
					onClick={(e: React.MouseEvent<HTMLDivElement>) => {
						e.preventDefault();
						e.stopPropagation();
					}}
					onMouseDown={(e: React.MouseEvent<HTMLDivElement>) => {
						e.preventDefault();
						e.stopPropagation();
					}}
				>
					{isRenaming ? (
						<div 
							style={{ display: 'flex', gap: 'var(--space-xs)', alignItems: 'center' }}
							onClick={(e: React.MouseEvent<HTMLDivElement>) => {
								e.preventDefault();
								e.stopPropagation();
							}}
						>
							<TextInput
								type="text"
								value={editFileName}
								onChange={(e) => setEditFileName((e.target as HTMLInputElement).value)}
								onKeyDown={(e) => {
									e.stopPropagation();
									if (e.key === 'Enter') {
										e.preventDefault();
										handleRename();
									} else if (e.key === 'Escape') {
										e.preventDefault();
										setIsRenaming(false);
										setEditFileName(fileName);
									}
								}}
								style={{ flex: 1, fontSize: 'var(--font-size-md)' }}
								autoFocus
								onClick={(e: React.MouseEvent<HTMLInputElement>) => {
									e.preventDefault();
									e.stopPropagation();
								}}
							/>
							<IconButton
								onClick={handleRename}
								title="Сохранить"
								icon={CheckIcon}
								type="default"
							/>
							<IconButton
								onClick={() => {
									setIsRenaming(false);
									setEditFileName(fileName);
								}}
								title="Отмена"
								icon={XIcon}
								type="close"
							/>
						</div>
					) : (
						<>
							<div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
								{isWebUrl ? (
									<a 
										href={file} 
										target="_blank" 
										rel="noopener noreferrer"
										style={{ 
											fontSize: 'var(--font-size-md)',
											color: 'var(--accent)',
											textDecoration: 'none',
											flex: 1,
											minWidth: 0,
											overflow: 'hidden',
											textOverflow: 'ellipsis',
											whiteSpace: 'nowrap',
										}}
										title={fileName}
									>
										{fileName}
									</a>
								) : (
									<div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-md)', flex: 1, minWidth: 0 }}>
										<span 
											style={{ 
												fontSize: 'var(--font-size-md)',
												color: 'var(--text)',
												wordBreak: 'break-word',
												lineHeight: 1.4,
												flex: 1,
												minWidth: 0,
												overflow: 'hidden',
												textOverflow: 'ellipsis',
												whiteSpace: 'nowrap',
											}}
											title={fileName}
										>
											{fileName}
										</span>
										{onRename && (
											<IconButton
												onClick={() => setIsRenaming(true)}
												title="Переименовать файл"
												icon={EditIcon}
												type="default"
											/>
										)}
									</div>
								)}
							</div>
							{fileSize !== null && (
								<span style={{ 
									fontSize: 'var(--font-size-xs)',
									color: 'var(--muted)',
								}}>
									{formatFileSize(fileSize)}
								</span>
							)}
						</>
					)}
				</div>
			
				{/* Кнопки действий */}
				<div 
					style={{ display: 'flex', gap: 'var(--space-xs)', alignItems: 'center', flexShrink: 0 }}
					onClick={(e: React.MouseEvent<HTMLDivElement>) => e.stopPropagation()}
				>
					{!isWebUrl && (
						<IconButton
							onClick={handleDownload}
							title="Скачать файл"
							icon={DownloadIcon}
							type="default"
							alignSelf="center"
						/>
					)}
					<IconButton
						onClick={onRemove}
						title="Удалить файл"
						icon={XIcon}
						type="close"
						alignSelf="flex-start"
					/>
				</div>
			</div>
		</div>
	);
}

