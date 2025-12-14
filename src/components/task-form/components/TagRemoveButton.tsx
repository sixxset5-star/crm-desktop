import React from 'react';
import { XIcon } from '@/shared/components/Icons';
import IconButton from '@/shared/components/IconButton';
import { getToken } from '@/shared/lib/tokens';

type TagRemoveButtonProps = {
	onClick: () => void;
};

export function TagRemoveButton({ onClick }: TagRemoveButtonProps): React.ReactElement {
	const iconSize = React.useMemo(() => getToken('--icon-size-xs', 11), []);
	
	return (
		<IconButton
			icon={XIcon}
			title="Удалить тег"
			onClick={onClick}
			iconSize={iconSize}
			hover="accent"
		/>
	);
}






