// Централизованные типы для всего приложения
// Экспортируем все типы из отдельных модулей для удобного импорта

// ID тип - можно заменить на ULID в будущем
export type Id = string;

// Task types
export type ColumnId =
	| 'clients'
	| 'unprocessed'
	| 'notstarted'
	| 'inwork'
	| 'completed'
	| 'closed'
	| 'cancelled'
	| 'paused';

export type TaskPriority = 'high' | 'medium' | 'low';

export type SubTask = {
	id: Id;
	title: string;
	done: boolean;
	amount?: number; // Сумма оплаты для задачи
	date?: string; // Дата оплаты (ISO date)
};

export type TaskLink = {
	url: string;
	name?: string;
};

export type TaskPayment = {
	title?: string;
	date?: string;
	amount?: number;
	qty?: number;
	price?: number;
	paid?: boolean;
	taxRate?: number;
	calcEnabled?: boolean;
};

export type TaskExpenseEntry = {
	id: Id;
	title: string;
	amount: number;
	date?: string;
	contractorId?: Id; // Ссылка на подрядчика, которому относится этот расход
};

export type TaskPausedRange = {
	from: string;
	to: string;
};

export type Task = {
	id: Id;
	title: string;
	amount?: number;
	expenses?: number;
	paidAmount?: number; // Сколько уже оплачено (для обратной совместимости)
	payments?: TaskPayment[];
	expensesEntries?: TaskExpenseEntry[];
	pausedRanges?: TaskPausedRange[];
	taxRate?: number; // Процент налога (например, 6 для 6%)
	startDate?: string;
	deadline?: string; // ISO date
	subtasks?: SubTask[];
	tags?: string[];
	notes?: string;
	customerId?: Id;
	contractorId?: Id; // Ссылка на подрядчика-исполнителя задачи; если отсутствует, задача считается "моей"
	links?: string[] | TaskLink[]; // URLs (поддержка старого формата string[] и нового TaskLink[])
	files?: string[];
	calculatorQuantity?: number;
	calculatorPricePerUnit?: number;
	priority?: TaskPriority;
	accesses?: Access[]; // доступы к платформам (логин/пароль)
	columnId: ColumnId;
	pausedFromColumnId?: ColumnId; // Исходный статус задачи до постановки на паузу (для подсчетов)
	createdAt?: string;
	updatedAt?: string;
};

// Customer types
export type Contact = {
	type: string;
	value: string;
};

export type Access = {
	label: string;
	login: string;
	password: string;
};

export type Customer = {
	id: Id;
	name: string;
	contact?: string; // для обратной совместимости
	contacts?: Contact[]; // новый формат
	avatar?: string;
	comment?: string; // комментарий о заказчике
	accesses?: Access[]; // доступы к платформам (тип + значение)
};

// Contractor types
export type Contractor = {
	id: Id;
	name: string;
	contact?: string; // для обратной совместимости
	contacts?: Contact[]; // новый формат
	avatar?: string;
	comment?: string; // комментарий о подрядчике
	specialization?: string; // тип работ (например, "дизайн", "верстка")
	rate?: number | string; // ставка за задачу/час
	rating?: number | null; // оценка качества, от 1 до 5
	isActive: boolean; // true — активен, false — деактивирован/архивный
	createdAt?: string;
	updatedAt?: string;
};

// Income types
export type Income = {
	id: Id;
	title: string; // Название дохода (например, "Подработка на стройке", "Деньги от жены", "Подарок")
	amount: number; // Сумма дохода
	date: string; // ISO date - дата получения дохода
	taxRate?: number; // Процент налога (опционально)
	notes?: string; // Заметки
	createdAt?: string;
	updatedAt?: string;
};

// Task Assignee History types
export type TaskAssigneeHistory = {
	id: Id;
	taskId: Id;
	oldContractorId?: Id | null; // null означает, что исполнитель был снят
	newContractorId?: Id | null; // null означает, что исполнитель был снят
	changedAt: string; // ISO date
};




