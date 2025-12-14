import React from 'react';
import { TextInput } from '@/shared/ui';
import IconButton from '@/shared/components/IconButton';
import { XIcon } from '@/shared/components/Icons';
import { CALCULATOR_INPUT_COEFFICIENT_WIDTH } from '../utils/constants';

type ModifierRowProps = {
	label: string;
	value: number;
	defaultValue: number;
	onChange: (value: number | null) => void;
	onReset: () => void;
	isManuallySet: boolean;
};

/**
 * Строка модификатора с возможностью ручной настройки
 */
export function ModifierRow({
	label,
	value,
	defaultValue,
	onChange,
	onReset,
	isManuallySet,
}: ModifierRowProps): React.ReactElement {
	return (
		<div
			style={{
				padding: 'var(--space-sm) var(--space-md)',
				background: 'var(--bg)',
				borderRadius: 'var(--radius-md)',
			}}
		>
			<div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-xs)' }}>
				<span style={{ fontSize: 'var(--font-size-sm)', lineHeight: 1.2 }}>{label}</span>
				<div style={{ position: 'relative', display: 'inline-block' }}>
					<TextInput
						type="number"
						step="0.1"
						value={value}
						onChange={(e) => {
							const val = parseFloat((e.target as HTMLInputElement).value);
							onChange(isNaN(val) ? null : (val !== defaultValue ? val : null));
						}}
						style={{
							width: CALCULATOR_INPUT_COEFFICIENT_WIDTH,
							fontSize: 'var(--font-size-sm)',
							textAlign: 'center',
							minWidth: CALCULATOR_INPUT_COEFFICIENT_WIDTH,
							height: 'auto !important',
							minHeight: 'unset !important',
							padding: 'var(--space-xs) var(--space-sm) !important',
							paddingRight: isManuallySet ? 'var(--space-lg)' : 'var(--space-sm)',
							lineHeight: 1.2,
							margin: 0,
							borderRadius: 'var(--radius-md)',
							boxSizing: 'border-box',
						}}
					/>
					{isManuallySet && (
						<div
							style={{
								position: 'absolute',
								right: 'var(--space-sm)',
								top: '50%',
								transform: 'translateY(-50%)',
							}}
						>
							<IconButton
								icon={XIcon}
								title="Сбросить"
								onClick={(e) => {
									e.preventDefault();
									e.stopPropagation();
									onReset();
								}}
							/>
						</div>
					)}
				</div>
			</div>
		</div>
	);
}

