import React from 'react';
import { TD, Checkbox } from '@/shared/ui';
import { formatCurrencyRub, formatDateWithSettings as formatDate } from '@/shared/lib/format';
import type { DerivedTax } from '../utils/taxCalculations';

type TaxTableRowProps = {
	tax: DerivedTax;
	onPaidChange: (key: string, paid: boolean) => void;
};

export function TaxTableRow({ tax, onPaidChange }: TaxTableRowProps): React.ReactElement {
	return (
		<tr key={tax.key} data-paid={tax.paid ? 'true' : 'false'}>
			<TD className="taxes-table__td taxes-table__td--status">
				<label className="taxes-checkbox" data-paid={tax.paid ? 'true' : 'false'}>
					<Checkbox
						checked={tax.paid}
						onChange={(e) => onPaidChange(tax.key, (e.target as HTMLInputElement).checked)}
						title="Налог оплачен"
					/>
					<span>{tax.paid ? 'Оплачено' : 'К оплате'}</span>
				</label>
			</TD>
			<TD className="taxes-table__td">
				<div className="taxes-task-title">{tax.title}</div>
			</TD>
			<TD className="taxes-table__td">
				<div className="taxes-payment-title">{tax.paymentTitle}</div>
			</TD>
			<TD className="taxes-table__td">
				<span className="taxes-rate-badge">{tax.taxRate}%</span>
			</TD>
			<TD className="taxes-table__td taxes-table__td--number">{formatCurrencyRub(tax.taxAmount)}</TD>
			<TD className="taxes-table__td taxes-table__td--number">{formatCurrencyRub(tax.paymentAmount)}</TD>
			<TD className="taxes-table__td">
				<span className="taxes-date">{tax.date ? formatDate(tax.date) : '—'}</span>
			</TD>
		</tr>
	);
}






