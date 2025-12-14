import React from 'react';

export function BoardIcon({ size = 18, color = 'currentColor' }: { size?: number; color?: string }) {
	return (
		<svg width={size} height={size} viewBox="0 0 24 24" preserveAspectRatio="xMidYMid meet" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
			<rect x="3" y="3" width="7" height="7" rx="1" />
			<rect x="14" y="3" width="7" height="7" rx="1" />
			<rect x="3" y="14" width="7" height="7" rx="1" />
			<rect x="14" y="14" width="7" height="7" rx="1" />
		</svg>
	);
}

export function CalendarIcon({ size = 18, color = 'currentColor' }: { size?: number; color?: string }) {
	return (
		<svg width={size} height={size} viewBox="0 0 24 24" preserveAspectRatio="xMidYMid meet" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
			<rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
			<line x1="16" y1="2" x2="16" y2="6" />
			<line x1="8" y1="2" x2="8" y2="6" />
			<line x1="3" y1="10" x2="21" y2="10" />
		</svg>
	);
}

export function UsersIcon({ size = 18, color = 'currentColor' }: { size?: number; color?: string }) {
	return (
		<svg width={size} height={size} viewBox="0 0 24 24" preserveAspectRatio="xMidYMid meet" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
			<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
			<circle cx="9" cy="7" r="4" />
			<path d="M23 21v-2a4 4 0 0 0-3-3.87" />
			<path d="M16 3.13a4 4 0 0 1 0 7.75" />
		</svg>
	);
}

export function DollarIcon({ size = 18, color = 'currentColor' }: { size?: number; color?: string }) {
	return (
		<svg width={size} height={size} viewBox="0 0 24 24" preserveAspectRatio="xMidYMid meet" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
			<line x1="12" y1="1" x2="12" y2="23" />
			<path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
		</svg>
	);
}

export function ChartIcon({ size = 18, color = 'currentColor' }: { size?: number; color?: string }) {
	return (
		<svg width={size} height={size} viewBox="0 0 24 24" preserveAspectRatio="xMidYMid meet" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
			<line x1="18" y1="20" x2="18" y2="10" />
			<line x1="12" y1="20" x2="12" y2="4" />
			<line x1="6" y1="20" x2="6" y2="14" />
		</svg>
	);
}

export function ArchiveIcon({ size = 18, color = 'currentColor' }: { size?: number; color?: string }) {
	return (
		<svg width={size} height={size} viewBox="0 0 24 24" preserveAspectRatio="xMidYMid meet" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
			<rect x="3" y="4" width="18" height="4" rx="1" />
			<path d="M4 8h16v11a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8z" />
			<line x1="9" y1="12" x2="15" y2="12" />
		</svg>
	);
}

export function SettingsIcon({ size = 18, color = 'currentColor' }: { size?: number; color?: string }) {
	return (
		<svg width={size} height={size} viewBox="0 0 24 24" preserveAspectRatio="xMidYMid meet" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
			<circle cx="12" cy="12" r="3" />
			<path d="M12 1v6m0 6v6M5.64 5.64l4.24 4.24m4.24 4.24l4.24 4.24M1 12h6m6 0h6M5.64 18.36l4.24-4.24m4.24-4.24l4.24-4.24" />
		</svg>
	);
}

export function AlertIcon({ size = 18, color = 'currentColor' }: { size?: number; color?: string }) {
	return (
		<svg width={size} height={size} viewBox="0 0 24 24" preserveAspectRatio="xMidYMid meet" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
			<path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
			<line x1="12" y1="9" x2="12" y2="13" />
			<line x1="12" y1="17" x2="12.01" y2="17" />
		</svg>
	);
}

export function ListIcon({ size = 14, color = 'currentColor' }: { size?: number; color?: string }) {
	return (
		<svg width={size} height={size} viewBox="0 0 24 24" preserveAspectRatio="xMidYMid meet" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
			<line x1="8" y1="6" x2="21" y2="6" />
			<line x1="8" y1="12" x2="21" y2="12" />
			<line x1="8" y1="18" x2="21" y2="18" />
			<line x1="3" y1="6" x2="3.01" y2="6" />
			<line x1="3" y1="12" x2="3.01" y2="12" />
			<line x1="3" y1="18" x2="3.01" y2="18" />
		</svg>
	);
}

export function LinkIcon({ size = 14, color = 'currentColor' }: { size?: number; color?: string }) {
	return (
		<svg width={size} height={size} viewBox="0 0 24 24" preserveAspectRatio="xMidYMid meet" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
			<path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
			<path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
		</svg>
	);
}

export function ClockIcon({ size = 14, color = 'currentColor' }: { size?: number; color?: string }) {
	return (
		<svg width={size} height={size} viewBox="0 0 24 24" preserveAspectRatio="xMidYMid meet" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
			<circle cx="12" cy="12" r="10" />
			<polyline points="12 6 12 12 16 14" />
		</svg>
	);
}

export function PaperclipIcon({ size = 16, color = 'currentColor' }: { size?: number; color?: string }) {
	return (
		<svg width={size} height={size} viewBox="0 0 24 24" preserveAspectRatio="xMidYMid meet" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
			<path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" />
		</svg>
	);
}

export function XIcon({ size = 16, color = 'currentColor' }: { size?: number; color?: string }) {
	return (
		<svg width={size} height={size} viewBox="0 0 24 24" preserveAspectRatio="xMidYMid meet" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
			<line x1="18" y1="6" x2="6" y2="18" />
			<line x1="6" y1="6" x2="18" y2="18" />
		</svg>
	);
}

export function TargetIcon({ size = 18, color = 'currentColor' }: { size?: number; color?: string }) {
	return (
		<svg width={size} height={size} viewBox="0 0 24 24" preserveAspectRatio="xMidYMid meet" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
			<circle cx="12" cy="12" r="10" />
			<circle cx="12" cy="12" r="6" />
			<circle cx="12" cy="12" r="2" />
		</svg>
	);
}

export function LightbulbIcon({ size = 16, color = 'currentColor' }: { size?: number; color?: string }) {
	return (
		<svg width={size} height={size} viewBox="0 0 24 24" preserveAspectRatio="xMidYMid meet" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
			<path d="M9 21h6" />
			<path d="M12 3a6 6 0 0 0 6 6c0 2.5-1.5 4.5-3 6" />
			<path d="M12 3a6 6 0 0 1-6 6c0 2.5 1.5 4.5 3 6" />
			<path d="M12 9v6" />
			<path d="M9 15h6" />
		</svg>
	);
}

export function TrashIcon({ size = 16, color = 'currentColor' }: { size?: number; color?: string }) {
	return (
		<svg width={size} height={size} viewBox="0 0 24 24" preserveAspectRatio="xMidYMid meet" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
			<path d="M3 6h18" />
			<path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
			<path d="M5 8v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8" />
			<path d="M10 11v6" />
			<path d="M14 11v6" />
		</svg>
	);
}

export function EditIcon({ size = 16, color = 'currentColor' }: { size?: number; color?: string }) {
	return (
		<svg width={size} height={size} viewBox="0 0 24 24" preserveAspectRatio="xMidYMid meet" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
			<path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
			<path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
		</svg>
	);
}

export function PlusIcon({ size = 16, color = 'currentColor' }: { size?: number; color?: string }) {
	return (
		<svg width={size} height={size} viewBox="0 0 24 24" preserveAspectRatio="xMidYMid meet" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
			<line x1="12" y1="5" x2="12" y2="19" />
			<line x1="5" y1="12" x2="19" y2="12" />
		</svg>
	);
}

export function ChevronLeftIcon({ size = 16, color = 'currentColor' }: { size?: number; color?: string }) {
	return (
		<svg width={size} height={size} viewBox="0 0 24 24" preserveAspectRatio="xMidYMid meet" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
			<polyline points="15 18 9 12 15 6" />
		</svg>
	);
}

export function ChevronRightIcon({ size = 16, color = 'currentColor' }: { size?: number; color?: string }) {
	return (
		<svg width={size} height={size} viewBox="0 0 24 24" preserveAspectRatio="xMidYMid meet" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
			<polyline points="9 18 15 12 9 6" />
		</svg>
	);
}

export function CopyIcon({ size = 16, color = 'currentColor' }: { size?: number; color?: string }) {
	return (
		<svg width={size} height={size} viewBox="0 0 24 24" preserveAspectRatio="xMidYMid meet" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
			<rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
			<path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
		</svg>
	);
}

export function MoreVerticalIcon({ size = 16, color = 'currentColor' }: { size?: number; color?: string }) {
	return (
		<svg width={size} height={size} viewBox="0 0 24 24" preserveAspectRatio="xMidYMid meet" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
			<circle cx="12" cy="12" r="1" />
			<circle cx="12" cy="5" r="1" />
			<circle cx="12" cy="19" r="1" />
		</svg>
	);
}

export function DownloadIcon({ size = 16, color = 'currentColor' }: { size?: number; color?: string }) {
	return (
		<svg width={size} height={size} viewBox="0 0 24 24" preserveAspectRatio="xMidYMid meet" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
			<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
			<polyline points="7 10 12 15 17 10" />
			<line x1="12" y1="15" x2="12" y2="3" />
		</svg>
	);
}

export function CalculatorIcon({ size = 18, color = 'currentColor' }: { size?: number; color?: string }) {
	return (
		<svg width={size} height={size} viewBox="0 0 24 24" preserveAspectRatio="xMidYMid meet" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
			<rect x="4" y="2" width="16" height="20" rx="2" />
			<line x1="8" y1="6" x2="16" y2="6" />
			<line x1="8" y1="10" x2="16" y2="10" />
			<line x1="8" y1="14" x2="12" y2="14" />
			<line x1="8" y1="18" x2="12" y2="18" />
			<circle cx="16" cy="14" r="1.5" />
			<circle cx="16" cy="18" r="1.5" />
		</svg>
	);
}

export function TaxIcon({ size = 18, color = 'currentColor' }: { size?: number; color?: string }) {
	return (
		<svg width={size} height={size} viewBox="0 0 24 24" preserveAspectRatio="xMidYMid meet" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
			<rect x="3" y="3" width="18" height="18" rx="2" />
			<line x1="9" y1="8" x2="15" y2="8" />
			<line x1="9" y1="12" x2="12" y2="12" />
			<line x1="9" y1="16" x2="10" y2="16" />
			<line x1="14" y1="16" x2="15" y2="16" />
			<circle cx="14.5" cy="12.5" r="2.5" />
			<path d="M12 15l4-4" />
		</svg>
	);
}

export function CheckIcon({ size = 16, color = 'currentColor' }: { size?: number; color?: string }) {
	return (
		<svg width={size} height={size} viewBox="0 0 24 24" preserveAspectRatio="xMidYMid meet" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
			<polyline points="20 6 9 17 4 12" />
		</svg>
	);
}

export function EyeIcon({ size = 16, color = 'currentColor' }: { size?: number; color?: string }) {
	return (
		<svg width={size} height={size} viewBox="0 0 24 24" preserveAspectRatio="xMidYMid meet" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
			<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
			<circle cx="12" cy="12" r="3" />
		</svg>
	);
}

export function EyeOffIcon({ size = 16, color = 'currentColor' }: { size?: number; color?: string }) {
	return (
		<svg width={size} height={size} viewBox="0 0 24 24" preserveAspectRatio="xMidYMid meet" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
			<path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
			<line x1="1" y1="1" x2="23" y2="23" />
		</svg>
	);
}

export function HelpCircleIcon({ size = 16, color = 'currentColor' }: { size?: number; color?: string }) {
	return (
		<svg width={size} height={size} viewBox="0 0 24 24" preserveAspectRatio="xMidYMid meet" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
			<circle cx="12" cy="12" r="10" />
			<path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
			<line x1="12" y1="17" x2="12.01" y2="17" />
		</svg>
	);
}

export function StarIcon({ size = 16, color = 'currentColor', filled = false }: { size?: number; color?: string; filled?: boolean }) {
	return (
		<svg width={size} height={size} viewBox="0 0 24 24" preserveAspectRatio="xMidYMid meet" fill={filled ? color : 'none'} stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
			<polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
		</svg>
	);
}

export function PaletteIcon({ size = 18, color = 'currentColor' }: { size?: number; color?: string }) {
	return (
		<svg width={size} height={size} viewBox="0 0 24 24" preserveAspectRatio="xMidYMid meet" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
			<circle cx="13.5" cy="6.5" r=".5" fill="currentColor" />
			<circle cx="17.5" cy="10.5" r=".5" fill="currentColor" />
			<circle cx="8.5" cy="7.5" r=".5" fill="currentColor" />
			<circle cx="6.5" cy="12.5" r=".5" fill="currentColor" />
			<path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125 0-.87.695-1.562 1.562-1.562 1.102 0 2.062-.96 2.062-2.062 0-.926-.746-1.648-1.688-1.648H12z" />
		</svg>
	);
}


