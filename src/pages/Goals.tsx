import React, { useState } from 'react';
import { useGoalsStore, type Goal } from '../store/goals';
import { formatDateWithSettings as formatDate } from '@/shared/lib/format';
import { Button, TextInput, Checkbox, NotesField } from '@/shared/ui';
import { Modal, ModalFooter } from '@/shared/ui/Modal';
import { useUIStore } from '@/store/ui';
import { UI_TEXTS } from '@/shared/constants/ui-texts';
import { useShallowSelector } from '@/shared/hooks/useStoreSelectors';
import { MAX_PROGRESS_PERCENT } from '@/shared/constants/numeric-constants';

export function Goals(): React.ReactElement {
	const goals = useShallowSelector(useGoalsStore, (s) => s.goals);
	const addGoal = useGoalsStore((s) => s.addGoal);
	const updateGoal = useGoalsStore((s) => s.updateGoal);
	const removeGoal = useGoalsStore((s) => s.removeGoal);

	const [showForm, setShowForm] = useState(false);
	const [title, setTitle] = useState('');
	const [description, setDescription] = useState('');
	const [deadline, setDeadline] = useState('');

	// Загружаем данные при монтировании компонента
	// Используем getState() напрямую, так как функция из Zustand store стабильна
	React.useEffect(() => {
		useGoalsStore.getState().loadFromDisk().catch(() => {});
	}, []); // Пустой массив - выполнится только при монтировании

	function handleSubmit(e: React.FormEvent) {
		e.preventDefault();
		if (!title.trim()) return;
		addGoal(title.trim(), description.trim() || undefined, deadline || undefined);
		setTitle('');
		setDescription('');
		setDeadline('');
		setShowForm(false);
	}

	function toggleComplete(g: Goal) {
		updateGoal(g.id, { completed: !g.completed, progress: !g.completed ? MAX_PROGRESS_PERCENT : g.progress });
	}

	return (
		<div className="page">
			<div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
				<div>
					<h1 className="page-title">Цели и задачи</h1>
					<p className="page-subtitle">Управление личными целями</p>
				</div>
				<Button onClick={() => setShowForm(true)} variant="primary">Добавить цель</Button>
			</div>

			{showForm && (
				<Modal
					open={showForm}
					onClose={() => setShowForm(false)}
					title="Новая цель"
					width={480}
					footer={<ModalFooter onCancel={() => setShowForm(false)} onConfirm={() => (document.querySelector('form') as HTMLFormElement | null)?.requestSubmit()} confirmText="Добавить" cancelText="Отмена" />}
				>
						<form onSubmit={handleSubmit} className="form-grid">
							<label className="col-span">
								<span>Название</span>
							<TextInput value={title} onChange={(e) => setTitle((e.target as HTMLInputElement).value)} required />
							</label>
							<label className="col-span">
								<span>Описание</span>
								<NotesField rows={3} value={description} onChange={(e) => setDescription(e.target.value)} />
							</label>
							<label>
								<span>Дедлайн</span>
							<TextInput type="date" value={deadline} onChange={(e) => setDeadline((e.target as HTMLInputElement).value)} />
							</label>
						</form>
				</Modal>
			)}

			{/* Личные цели */}
			<div style={{ marginTop: 'var(--space-lg)' }}>
				<h2 style={{ marginBottom: 'var(--space-md)' }}>Личные цели</h2>
				<div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
					{goals.map((g) => (
						<div key={g.id} style={{ background: 'var(--panel)', border: 'var(--border-default)', borderRadius: 'var(--radius-md)', padding: 'var(--space-md)' }}>
							<div style={{ display: 'flex', alignItems: 'start', gap: 'var(--space-md)' }}>
								<Checkbox checked={g.completed} onChange={() => toggleComplete(g)} />
								<div style={{ flex: 1 }}>
									<div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-md)', marginBottom: 'var(--space-sm)' }}>
										<h3 style={{ margin: 0, textDecoration: g.completed ? 'line-through' : 'none', opacity: g.completed ? 'var(--opacity-disabled)' : 'var(--opacity-full)' }}>{g.title}</h3>
										{g.deadline && (
											<span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--muted)' }}>до {formatDate(g.deadline)}</span>
										)}
									</div>
									{g.description && (
										<p style={{ margin: '0 0 12px 0', color: 'var(--muted)' }}>{g.description}</p>
									)}
									<div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
										<div style={{ flex: 1, height: 8, background: 'var(--border)', borderRadius: 4, overflow: 'hidden' }}>
											<div style={{ width: `${g.progress}%`, height: '100%', background: g.completed ? 'var(--green)' : 'var(--accent)', transition: 'width 0.3s' }} />
										</div>
										<span style={{ fontSize: 14, fontWeight: 600, minWidth: 50, textAlign: 'right' }}>{g.progress}%</span>
										<input
											type="range"
											min="0"
											max={MAX_PROGRESS_PERCENT}
											value={g.progress}
											onChange={(e) => updateGoal(g.id, { progress: Number(e.target.value) })}
											style={{ width: 100 }}
										/>
										<Button onClick={async () => { 
											const confirmed = await useUIStore.getState().showConfirm({
												message: UI_TEXTS.DELETE_GOAL,
												variant: 'danger',
												confirmText: UI_TEXTS.DELETE,
												cancelText: UI_TEXTS.CANCEL,
											});
											if (confirmed) removeGoal(g.id);
										}} variant="danger" size="sm">{UI_TEXTS.DELETE}</Button>
									</div>
								</div>
							</div>
						</div>
					))}
					{goals.length === 0 && (
						<div style={{ textAlign: 'center', padding: 48, color: 'var(--muted)' }}>Нет целей. Добавьте первую!</div>
					)}
				</div>
			</div>
		</div>
	);
}
