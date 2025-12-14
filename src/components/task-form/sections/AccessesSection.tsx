/**
 * AccessesSection - Секция для управления доступами (логин/пароль)
 * 
 * Только UI, без бизнес-логики.
 */
import React from 'react';
import type { Access } from '@/types';
import { TextInput, Button } from '@/shared/ui';
import IconButton from '@/shared/components/IconButton';
import { PlusIcon, XIcon, CopyIcon, EyeIcon, EyeOffIcon } from '@/shared/components/Icons';

type AccessesSectionProps = {
	accesses: Access[];
	onAdd: () => void;
	onChange: (index: number, patch: Partial<Access>) => void;
	onRemove: (index: number) => void;
	passwordVisible: Record<number, boolean>;
	onTogglePassword: (index: number) => void;
	onCopy?: (text: string) => void;
};

export function AccessesSection({
	accesses,
	onAdd,
	onChange,
	onRemove,
	passwordVisible,
	onTogglePassword,
	onCopy,
}: AccessesSectionProps) {
	const handleCopy = (text: string) => {
		if (onCopy) {
			onCopy(text);
		} else {
			navigator.clipboard.writeText(text).then(() => {
				// Без обратной связи, если onCopy не передан
			}).catch(() => {});
		}
	};

	return (
		<div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
			{accesses.map((access, idx) => (
				<div key={idx} style={{ display: 'flex', gap: 'var(--space-md)', alignItems: 'flex-start' }}>
					<TextInput
						value={access.label}
						onChange={(e) => {
							onChange(idx, { label: (e.target as HTMLInputElement).value });
						}}
						placeholder="Например: Доступ к Tilda"
						style={{ width: 'auto', minWidth: 160, maxWidth: 200, flexShrink: 0 }}
					/>
					<div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)', flex: 1, minWidth: 0, position: 'relative' }}>
						<div style={{ position: 'relative', width: '100%' }}>
							<TextInput
								type="text"
								value={access.login}
								onChange={(e) => {
									onChange(idx, { login: (e.target as HTMLInputElement).value });
								}}
								placeholder="Логин"
								style={{ width: '100%', paddingRight: 'var(--space-lg)' }}
							/>
							{access.login && (
								<div
									style={{
										position: 'absolute',
										right: 'var(--space-sm)',
										top: '50%',
										transform: 'translateY(-50%)',
									}}
								>
									<IconButton
										icon={CopyIcon}
										title="Скопировать логин"
										onClick={() => handleCopy(access.login)}
									/>
								</div>
							)}
						</div>
						<div style={{ position: 'relative', width: '100%' }}>
							<TextInput
								type={passwordVisible[idx] ? 'text' : 'password'}
								value={access.password}
								onChange={(e) => {
									onChange(idx, { password: (e.target as HTMLInputElement).value });
								}}
								placeholder="Пароль"
								style={{ width: '100%', paddingRight: 'var(--space-xl)' }}
							/>
							{access.password && (
								<>
									<div
										style={{
											position: 'absolute',
											right: 36, // Специфичное позиционирование между кнопками
											top: '50%',
											transform: 'translateY(-50%)',
										}}
									>
										<IconButton
											icon={CopyIcon}
											title="Скопировать пароль"
											onClick={() => handleCopy(access.password)}
										/>
									</div>
									<button
										type="button"
										onClick={() => onTogglePassword(idx)}
										style={{
											position: 'absolute',
											right: 'var(--space-sm)',
											top: '50%',
											transform: 'translateY(-50%)',
											background: 'transparent',
											border: 'none',
											cursor: 'pointer',
											padding: 'var(--space-xs)',
											display: 'flex',
											alignItems: 'center',
											justifyContent: 'center',
											borderRadius: 'var(--radius-md)',
											opacity: 'var(--opacity-disabled)',
											transition: 'opacity 0.2s',
										}}
										onMouseEnter={(e) => {
											(e.currentTarget as HTMLElement).style.opacity = '1';
										}}
										onMouseLeave={(e) => {
											(e.currentTarget as HTMLElement).style.opacity = 'var(--opacity-disabled)';
										}}
										title={passwordVisible[idx] ? 'Скрыть пароль' : 'Показать пароль'}
									>
										{passwordVisible[idx] ? (
											<EyeOffIcon size={16} color="var(--muted)" />
										) : (
											<EyeIcon size={16} color="var(--muted)" />
										)}
									</button>
								</>
							)}
						</div>
						<div
							style={{
								position: 'absolute',
								right: 'var(--space-sm)',
								top: 'var(--space-sm)',
							}}
						>
							<IconButton
								onClick={() => onRemove(idx)}
								title="Удалить доступ"
								icon={XIcon}
								type="close"
							/>
						</div>
					</div>
				</div>
			))}
			<Button
				type="button"
				variant="action"
				onClick={onAdd}
				title="Добавить доступ"
				style={{ alignSelf: 'flex-start' }}
			>
				<span style={{ display: 'inline-flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
					<PlusIcon size={18} color="currentColor" />
					<span>Добавить доступ</span>
				</span>
			</Button>
		</div>
	);
}

