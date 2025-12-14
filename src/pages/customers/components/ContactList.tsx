import React from 'react';
import type { Contact } from '@/store/customers';
import { ContactChip } from '@/shared/ui';
import { 
	EXPAND_BUTTON_FONT_SIZE, 
	EXPAND_BUTTON_PADDING, 
	EXPAND_BUTTON_BORDER_RADIUS, 
	EXPAND_BUTTON_LINE_HEIGHT,
	CONTACT_LIST_GAP, 
	CONTACT_LIST_MARGIN_TOP 
} from '../utils/constants';

type ContactListProps = {
	contacts: Contact[];
	maxVisible?: number;
};

/**
 * Компонент для отображения списка контактов с возможностью раскрытия
 */
export function ContactList({ contacts, maxVisible = 2 }: ContactListProps): React.ReactElement {
	const [expanded, setExpanded] = React.useState(false);
	const hasMore = contacts.length > maxVisible;
	const visibleContacts = expanded ? contacts : contacts.slice(0, maxVisible);
	const hiddenCount = contacts.length - maxVisible;

	const toggleButtonStyle: React.CSSProperties = {
		fontSize: EXPAND_BUTTON_FONT_SIZE,
		padding: EXPAND_BUTTON_PADDING,
		borderRadius: EXPAND_BUTTON_BORDER_RADIUS,
		background: 'var(--bg)',
		border: 'var(--border-default)',
		color: 'var(--muted)',
		cursor: 'pointer',
		display: 'inline-flex',
		alignItems: 'center',
		fontWeight: 'var(--font-weight-medium)',
		transition: 'all var(--transition-base)',
		lineHeight: EXPAND_BUTTON_LINE_HEIGHT,
	};

	const handleMouseEnter = (e: React.MouseEvent<HTMLButtonElement>) => {
		const target = e.currentTarget as HTMLElement;
		target.style.background = 'var(--accent)';
		target.style.color = 'var(--white)';
		target.style.borderColor = 'var(--accent)';
	};

	const handleMouseLeave = (e: React.MouseEvent<HTMLButtonElement>) => {
		const target = e.currentTarget as HTMLElement;
		target.style.background = 'var(--bg)';
		target.style.color = 'var(--muted)';
		target.style.borderColor = 'var(--border)';
	};

	return (
		<div style={{ 
			display: 'flex', 
			flexWrap: 'wrap', 
			gap: CONTACT_LIST_GAP, 
			marginTop: CONTACT_LIST_MARGIN_TOP,
			alignItems: 'center',
			alignContent: 'center',
		}}>
			{visibleContacts.map((contact, idx) => (
				<ContactChip key={idx} type={contact.type} value={contact.value} />
			))}
			{hasMore && !expanded && (
				<button
					type="button"
					onClick={(e) => {
						e.stopPropagation();
						setExpanded(true);
					}}
					style={toggleButtonStyle}
					onMouseEnter={handleMouseEnter}
					onMouseLeave={handleMouseLeave}
				>
					+{hiddenCount} еще
				</button>
			)}
			{hasMore && expanded && (
				<button
					type="button"
					onClick={(e) => {
						e.stopPropagation();
						setExpanded(false);
					}}
					style={toggleButtonStyle}
					onMouseEnter={handleMouseEnter}
					onMouseLeave={handleMouseLeave}
				>
					Свернуть
				</button>
			)}
		</div>
	);
}

