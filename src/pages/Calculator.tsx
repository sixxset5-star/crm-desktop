import React, { useMemo } from 'react';
import { PlusIcon, TrashIcon } from '@/shared/components/Icons';
import IconButton from '@/shared/components/IconButton';
import { formatDateWithSettings as formatDate } from '@/shared/lib/format';
import { getToken } from '@/shared/lib/tokens';
import { Button, TextInput, Radio, Switch } from '@/shared/ui';
import { parseQuantityInput } from '@/shared/lib/input-masks';
import { useUIStore } from '@/store/ui';
import { UI_TEXTS } from '@/shared/constants/ui-texts';
import { useCalculator } from './calculator/hooks/useCalculator';
import { TabButton, ReferenceCard, PriceCard, ModifierRow, FlagBadge } from './calculator/components';
import {
	formatCurrency,
	formatRoundingLabel,
	CALCULATOR_SCALE_THRESHOLD,
	CALCULATOR_PRICE_LARGE_FONT_SIZE,
	CALCULATOR_PRICE_MEDIUM_FONT_SIZE,
	ROUNDING_OPTIONS,
} from './calculator/utils';

export function Calculator(): React.ReactElement {
	const calc = useCalculator();
	const showConfirm = useUIStore((s) => s.showConfirm);
	const plusIconSize = useMemo(() => getToken('--icon-size-sm', 16), []);

	const handleDeleteCalculation = async (id: string) => {
		const confirmed = await showConfirm({
			message: UI_TEXTS.DELETE_CALCULATION,
			variant: 'danger',
			title: 'Подтверждение удаления',
			confirmText: UI_TEXTS.DELETE,
			cancelText: UI_TEXTS.CANCEL,
		});
		if (confirmed) {
			calc.removeCalculation(id);
		}
	};

	return (
		<div className="page">
			<div style={{ marginBottom: 'var(--space-lg)' }}>
				<h1 className="page-title">Калькулятор стоимости проекта</h1>
				<p className="page-subtitle">Расчет стоимости на основе референсных проектов</p>
			</div>

			{/* Вкладки */}
			<div style={{ display: 'flex', gap: 'var(--space-sm)', marginBottom: 'var(--space-lg)', borderBottom: 'var(--border-bottom-default)' }}>
				<TabButton active={calc.activeTab === 'new'} onClick={() => calc.setActiveTab('new')}>
					Новый расчет
				</TabButton>
				<TabButton active={calc.activeTab === 'history'} onClick={() => calc.setActiveTab('history')} count={calc.calculations.length}>
					История расчетов
				</TabButton>
			</div>

			{calc.activeTab === 'new' ? (
				<div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-lg)' }}>
					{/* Левая колонка: Референсы и параметры нового проекта */}
					<div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-lg)' }}>
						{/* Референсные проекты */}
						<section style={{ background: 'var(--panel)', border: 'var(--border-default)', borderRadius: 'var(--radius-l)', padding: 'var(--space-lg)' }}>
							<div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-md)' }}>
								<h3 style={{ margin: 0 }}>Референсные проекты</h3>
								<Button onClick={calc.addReference} variant="action">
									<span style={{ display: 'inline-flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
										<PlusIcon size={plusIconSize} />
										Добавить
									</span>
								</Button>
							</div>
							<div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
								{calc.references.length === 0 ? (
									<p style={{ color: 'var(--muted)', textAlign: 'center', padding: 'var(--space-lg)' }}>
										Добавьте референсные проекты для расчета
									</p>
								) : (
									calc.references.map((ref) => (
										<ReferenceCard
											key={ref.id}
											reference={ref}
											onUpdate={(updates) => calc.updateReference(ref.id, updates)}
											onRemove={() => calc.removeReference(ref.id)}
										/>
									))
								)}
							</div>
						</section>

						{/* Параметры нового проекта */}
						<section style={{ background: 'var(--panel)', border: 'var(--border-default)', borderRadius: 'var(--radius-l)', padding: 'var(--space-lg)' }}>
							<h3 style={{ margin: 0, marginBottom: 'var(--space-md)' }}>Параметры нового проекта</h3>
							<div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
								<label style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
									<span>Количество блоков</span>
									<TextInput
										mask="quantity"
										type="text"
										value={calc.newProject.blocks || ''}
										onChange={(e) => {
											const rawValue = (e.target as HTMLInputElement).value;
											const parsed = parseQuantityInput(rawValue);
											calc.setNewProject({ ...calc.newProject, blocks: parseInt(parsed) || 0 });
										}}
										placeholder="Например: 15"
									/>
								</label>
								<div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
									<div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-md)' }}>
										<span>Фотки есть</span>
										<Switch checked={calc.newProject.hasPhotos} onChange={(v) => calc.setNewProject({ ...calc.newProject, hasPhotos: v })} />
									</div>
									<div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-md)' }}>
										<span>Нужно верстать</span>
										<Switch
											checked={calc.newProject.needsLayout}
											onChange={(v) => {
												const needsLayout = v;
												calc.setNewProject({
													...calc.newProject,
													needsLayout,
													hasNonStandardFunctionality: needsLayout ? calc.newProject.hasNonStandardFunctionality : false,
												});
											}}
										/>
									</div>
									<div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-md)' }}>
										<span>Срочно</span>
										<Switch checked={calc.newProject.isUrgent} onChange={(v) => calc.setNewProject({ ...calc.newProject, isUrgent: v })} />
									</div>
									<div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-md)' }}>
										<span>Стиль уже есть</span>
										<Switch checked={calc.newProject.hasStyle} onChange={(v) => calc.setNewProject({ ...calc.newProject, hasStyle: v })} />
									</div>
									<div
										style={{
											display: 'flex',
											alignItems: 'center',
											gap: 'var(--space-md)',
											cursor: calc.newProject.needsLayout ? 'pointer' : 'not-allowed',
											opacity: calc.newProject.needsLayout ? 'var(--opacity-full)' : 'var(--opacity-inactive)',
										}}
									>
										<span>Нестандартный функционал</span>
										<Switch
											checked={calc.newProject.hasNonStandardFunctionality}
											onChange={(v) => {
												if (calc.newProject.needsLayout) {
													calc.setNewProject({ ...calc.newProject, hasNonStandardFunctionality: v });
												}
											}}
											disabled={!calc.newProject.needsLayout}
										/>
									</div>
									{!calc.newProject.needsLayout && calc.newProject.hasNonStandardFunctionality && (
										<div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--muted)', fontStyle: 'italic' }}>
											⚠️ Нестандартный функционал доступен только при включенной верстке
										</div>
									)}
								</div>
							</div>
						</section>

						{/* Округление */}
						<section style={{ background: 'var(--panel)', border: 'var(--border-default)', borderRadius: 'var(--radius-l)', padding: 'var(--space-lg)' }}>
							<h3 style={{ margin: 0, marginBottom: 'var(--space-md)' }}>Округление</h3>
							<div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
								<label style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)', cursor: 'pointer' }}>
									<Radio name="rounding" checked={calc.rounding === null} onChange={() => calc.setRounding(null)} />
									<span>Без округления</span>
								</label>
								<label style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)', cursor: 'pointer' }}>
									<Radio name="rounding" checked={calc.rounding === ROUNDING_OPTIONS.ONE_THOUSAND} onChange={() => calc.setRounding(ROUNDING_OPTIONS.ONE_THOUSAND)} />
									<span>До 1 000 ₽</span>
								</label>
								<label style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)', cursor: 'pointer' }}>
									<Radio name="rounding" checked={calc.rounding === ROUNDING_OPTIONS.FIVE_THOUSAND} onChange={() => calc.setRounding(ROUNDING_OPTIONS.FIVE_THOUSAND)} />
									<span>До 5 000 ₽</span>
								</label>
								<label style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)', cursor: 'pointer' }}>
									<Radio name="rounding" checked={calc.rounding === ROUNDING_OPTIONS.TEN_THOUSAND} onChange={() => calc.setRounding(ROUNDING_OPTIONS.TEN_THOUSAND)} />
									<span>До 10 000 ₽</span>
								</label>
							</div>
						</section>

						{/* Сохранение расчета */}
						<section style={{ background: 'var(--panel)', border: 'var(--border-default)', borderRadius: 'var(--radius-l)', padding: 'var(--space-lg)' }}>
							<h3 style={{ margin: 0, marginBottom: 'var(--space-md)' }}>Сохранение расчета</h3>
							<div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
								<label style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
									<span>Название расчета (необязательно)</span>
									<TextInput
										type="text"
										placeholder="Например: Проект для клиента X"
										value={calc.calculationName}
										onChange={(e) => calc.setCalculationName((e.target as HTMLInputElement).value)}
										style={{ width: '100%' }}
									/>
								</label>
								<Button onClick={calc.handleSaveCalculation} variant="primary" fullWidth>
									Сохранить расчет
								</Button>
							</div>
						</section>
					</div>

					{/* Правая колонка: Расчеты */}
					<div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-lg)' }}>
						{/* Детальная разбивка */}
						<section style={{ background: 'var(--panel)', border: 'var(--border-default)', borderRadius: 'var(--radius-l)', padding: 'var(--space-lg)' }}>
							<h3 style={{ margin: 0, marginBottom: 'var(--space-md)' }}>Детальная разбивка расчета</h3>

							{/* Референсы */}
							{calc.referencePrices.length > 0 && (
								<div style={{ marginBottom: 'var(--space-lg)' }}>
									<h4 style={{ fontSize: 'var(--font-size-sm)', fontWeight: 'var(--font-weight-semibold)', marginBottom: 'var(--space-md)', color: 'var(--muted)' }}>
										Цена за блок по референсам:
									</h4>
									<div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
										{calc.referencePrices.map((ref) => (
											<div
												key={ref.id}
												style={{
													display: 'flex',
													justifyContent: 'space-between',
													padding: 'var(--space-sm) var(--space-md)',
													background: 'var(--bg)',
													borderRadius: 'var(--radius-md)',
												}}
											>
												<div>
													<div style={{ fontWeight: 'var(--font-weight-semibold)', fontSize: 'var(--font-size-sm)' }}>{ref.name || 'Без названия'}</div>
													<div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--muted)' }}>
														{formatCurrency(ref.totalAmount)} ÷ {ref.blocks} блоков
													</div>
												</div>
												<div style={{ fontWeight: 'var(--font-weight-semibold)', fontSize: 'var(--font-size-sm)' }}>{formatCurrency(ref.pricePerBlock)}</div>
											</div>
										))}
									</div>
								</div>
							)}

							{/* Средняя цена за блок */}
							{calc.averagePricePerBlock > 0 && (
								<div style={{ marginBottom: 'var(--space-lg)' }}>
									<PriceCard
										label="Средняя цена за блок:"
										value={calc.averagePricePerBlock}
										explanation={`(${calc.referencePrices.length} ${
											calc.referencePrices.length === 1 ? 'референс' : calc.referencePrices.length < 5 ? 'референса' : 'референсов'
										})`}
										valueColor="var(--accent)"
										size="medium"
									/>
								</div>
							)}

							{/* Базовая сумма */}
							{calc.basePrice > 0 && (
								<div style={{ marginBottom: 'var(--space-lg)' }}>
									<PriceCard
										label="Базовая сумма:"
										value={calc.basePrice}
										explanation={`${formatCurrency(calc.averagePricePerBlock)} × ${calc.newProject.blocks} блоков`}
										size="medium"
									/>
								</div>
							)}

							{/* Модификаторы */}
							{(calc.newProject.blocks > CALCULATOR_SCALE_THRESHOLD ||
								calc.newProject.hasPhotos ||
								calc.newProject.isUrgent ||
								calc.newProject.hasStyle) && (
								<div style={{ marginBottom: 'var(--space-lg)' }}>
									<h4 style={{ fontSize: 'var(--font-size-sm)', fontWeight: 'var(--font-weight-semibold)', marginBottom: 'var(--space-md)', color: 'var(--muted)' }}>
										Применение модификаторов:
									</h4>
									<div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
										{calc.newProject.blocks > CALCULATOR_SCALE_THRESHOLD && (
											<ModifierRow
												label={`Эффект масштаба (более ${CALCULATOR_SCALE_THRESHOLD} блоков)`}
												value={calc.manualCoefficients.scaleMultiplier ?? calc.scaleMultiplier}
												defaultValue={calc.scaleMultiplier}
												onChange={(value) => calc.setManualCoefficients({ ...calc.manualCoefficients, scaleMultiplier: value })}
												onReset={() => calc.setManualCoefficients({ ...calc.manualCoefficients, scaleMultiplier: null })}
												isManuallySet={calc.manualCoefficients.scaleMultiplier !== null}
											/>
										)}
										{calc.newProject.hasPhotos && (
											<ModifierRow
												label="Фотки есть"
												value={calc.manualCoefficients.photoMultiplier ?? (calc.newProject.hasPhotos ? calc.photoMultiplier : 1)}
												defaultValue={calc.photoMultiplier}
												onChange={(value) => calc.setManualCoefficients({ ...calc.manualCoefficients, photoMultiplier: value })}
												onReset={() => calc.setManualCoefficients({ ...calc.manualCoefficients, photoMultiplier: null })}
												isManuallySet={calc.manualCoefficients.photoMultiplier !== null}
											/>
										)}
										{calc.newProject.isUrgent && (
											<ModifierRow
												label="Срочно"
												value={calc.manualCoefficients.urgentMultiplier ?? (calc.newProject.isUrgent ? calc.urgentMultiplier : 1)}
												defaultValue={calc.urgentMultiplier}
												onChange={(value) => calc.setManualCoefficients({ ...calc.manualCoefficients, urgentMultiplier: value })}
												onReset={() => calc.setManualCoefficients({ ...calc.manualCoefficients, urgentMultiplier: null })}
												isManuallySet={calc.manualCoefficients.urgentMultiplier !== null}
											/>
										)}
										{calc.newProject.hasStyle && (
											<ModifierRow
												label="Стиль уже есть"
												value={calc.manualCoefficients.styleMultiplier ?? calc.styleMultiplier}
												defaultValue={calc.styleMultiplier}
												onChange={(value) => calc.setManualCoefficients({ ...calc.manualCoefficients, styleMultiplier: value })}
												onReset={() => calc.setManualCoefficients({ ...calc.manualCoefficients, styleMultiplier: null })}
												isManuallySet={calc.manualCoefficients.styleMultiplier !== null}
											/>
										)}
									</div>
									{calc.priceAfterModifiers !== calc.basePrice && (
										<div style={{ marginTop: 'var(--space-md)' }}>
											<PriceCard
												label="Сумма после модификаторов:"
												value={calc.priceAfterModifiers}
												size="medium"
											/>
										</div>
									)}
								</div>
							)}

							{/* Верстка */}
							{calc.newProject.needsLayout && (
								<div style={{ marginBottom: 'var(--space-lg)' }}>
									<h4 style={{ fontSize: 'var(--font-size-sm)', fontWeight: 'var(--font-weight-semibold)', marginBottom: 'var(--space-md)', color: 'var(--muted)' }}>
										Верстка:
									</h4>
									<div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
										<ModifierRow
											label="Коэффициент верстки"
											value={calc.manualCoefficients.layoutMultiplier ?? (calc.newProject.needsLayout ? calc.layoutMultiplier : 1)}
											defaultValue={calc.layoutMultiplier}
											onChange={(value) => calc.setManualCoefficients({ ...calc.manualCoefficients, layoutMultiplier: value })}
											onReset={() => calc.setManualCoefficients({ ...calc.manualCoefficients, layoutMultiplier: null })}
											isManuallySet={calc.manualCoefficients.layoutMultiplier !== null}
										/>
										{calc.newProject.hasNonStandardFunctionality && (
											<ModifierRow
												label="Нестандартный функционал"
												value={calc.manualCoefficients.nonStandardMultiplier ?? calc.nonStandardMultiplier}
												defaultValue={calc.nonStandardMultiplier}
												onChange={(value) => calc.setManualCoefficients({ ...calc.manualCoefficients, nonStandardMultiplier: value })}
												onReset={() => calc.setManualCoefficients({ ...calc.manualCoefficients, nonStandardMultiplier: null })}
												isManuallySet={calc.manualCoefficients.nonStandardMultiplier !== null}
											/>
										)}
										<div
											style={{
												padding: 'var(--space-sm) var(--space-md)',
												background: 'var(--bg)',
												borderRadius: 'var(--radius-md)',
											}}
										>
											<div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--muted)' }}>
												{formatCurrency(calc.priceAfterModifiers)} × {calc.manualCoefficients.layoutMultiplier ?? calc.layoutMultiplier}
												{calc.newProject.hasNonStandardFunctionality &&
													` × ${calc.manualCoefficients.nonStandardMultiplier ?? calc.nonStandardMultiplier}`}
												{' = '}
												{formatCurrency(calc.finalPrice)}
											</div>
										</div>
									</div>
								</div>
							)}

							{/* Итоговая цена */}
							<PriceCard
								label="Итоговая стоимость:"
								value={calc.roundedPrice}
								explanation={calc.rounding && calc.roundedPrice !== calc.finalPrice ? `(округлено с ${formatCurrency(calc.finalPrice)})` : undefined}
								highlight
								size="large"
							/>
						</section>
					</div>
				</div>
			) : (
				/* История расчетов */
				<div>
					{calc.calculations.length === 0 ? (
						<div style={{ textAlign: 'center', padding: 'var(--space-xl)', color: 'var(--muted)' }}>
							<p>Нет сохраненных расчетов</p>
							<p style={{ fontSize: 'var(--font-size-sm)', marginTop: 'var(--space-sm)' }}>Создайте новый расчет и сохраните его</p>
						</div>
					) : (
						<div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
							{calc.calculations.map((calcItem) => (
								<div
									key={calcItem.id}
									style={{
										background: 'var(--panel)',
										border: 'var(--border-default)',
										borderRadius: 'var(--radius-s)',
										padding: 'var(--space-md)',
									}}
								>
									<div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 'var(--space-md)' }}>
										<div style={{ flex: 1 }}>
											<div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-md)', marginBottom: 'var(--space-sm)' }}>
												<h3 style={{ margin: 0, fontSize: 'var(--font-size-lg)' }}>{calcItem.name || 'Расчет без названия'}</h3>
												<span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--muted)' }}>{formatDate(calcItem.createdAt)}</span>
											</div>
											<div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 'var(--space-md)', marginBottom: 'var(--space-md)' }}>
												<div>
													<div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--muted)' }}>Референсов</div>
													<div style={{ fontSize: 'var(--font-size-md)', fontWeight: 'var(--font-weight-semibold)' }}>{calcItem.references.length}</div>
												</div>
												<div>
													<div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--muted)' }}>Блоков</div>
													<div style={{ fontSize: 'var(--font-size-md)', fontWeight: 'var(--font-weight-semibold)' }}>{calcItem.newProject.blocks}</div>
												</div>
												<div>
													<div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--muted)', marginBottom: 'var(--space-sm)' }}>Флаги</div>
													<div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-sm)' }}>
														{calcItem.newProject.hasPhotos && <FlagBadge icon="📷" label="Фотки есть" />}
														{calcItem.newProject.needsLayout && <FlagBadge icon="📐" label="Нужно верстать" />}
														{calcItem.newProject.isUrgent && <FlagBadge icon="⚡" label="Срочно" />}
														{calcItem.newProject.hasStyle && <FlagBadge icon="🎨" label="Стиль уже есть" />}
														{calcItem.newProject.hasNonStandardFunctionality && <FlagBadge icon="⚙️" label="Нестандартный функционал" />}
														{calcItem.newProject.blocks > CALCULATOR_SCALE_THRESHOLD && <FlagBadge icon="📊" label="Эффект масштаба" />}
														{!calcItem.newProject.hasPhotos &&
															!calcItem.newProject.needsLayout &&
															!calcItem.newProject.isUrgent &&
															!calcItem.newProject.hasStyle &&
															!calcItem.newProject.hasNonStandardFunctionality &&
															calcItem.newProject.blocks <= CALCULATOR_SCALE_THRESHOLD && (
																<span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--muted)' }}>—</span>
															)}
													</div>
												</div>
												<div>
													<div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--muted)' }}>Итоговая стоимость</div>
													<div style={{ fontSize: CALCULATOR_PRICE_MEDIUM_FONT_SIZE, fontWeight: 'var(--font-weight-bold)', color: 'var(--accent)' }}>
														{formatCurrency(calcItem.results.roundedPrice)}
													</div>
												</div>
											</div>
										</div>
										<div style={{ display: 'flex', gap: 'var(--space-sm)' }}>
											<Button onClick={() => calc.loadCalculationIntoForm(calcItem)} variant="primary" size="sm">
												Загрузить
											</Button>
											<IconButton
												icon={TrashIcon}
												title="Удалить"
												onClick={() => handleDeleteCalculation(calcItem.id)}
												hover="danger"
											/>
										</div>
									</div>
									{/* Детали расчета */}
									<details style={{ marginTop: 'var(--space-md)' }}>
										<summary style={{ cursor: 'pointer', color: 'var(--accent)', fontSize: 'var(--font-size-sm)', fontWeight: 'var(--font-weight-semibold)' }}>
											Показать детали расчета
										</summary>
										<div style={{ marginTop: 'var(--space-md)', padding: 'var(--space-md)', background: 'var(--bg)', borderRadius: 'var(--radius-md)' }}>
											<div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)', fontSize: 'var(--font-size-sm)' }}>
												<div>
													<span style={{ color: 'var(--muted)' }}>Средняя цена за блок: </span>
													<span style={{ fontWeight: 'var(--font-weight-semibold)' }}>{formatCurrency(calcItem.results.averagePricePerBlock)}</span>
												</div>
												<div>
													<span style={{ color: 'var(--muted)' }}>Базовая сумма: </span>
													<span style={{ fontWeight: 'var(--font-weight-semibold)' }}>{formatCurrency(calcItem.results.basePrice)}</span>
												</div>
												{calcItem.results.priceAfterModifiers !== calcItem.results.basePrice && (
													<div>
														<span style={{ color: 'var(--muted)' }}>После модификаторов: </span>
														<span style={{ fontWeight: 'var(--font-weight-semibold)' }}>{formatCurrency(calcItem.results.priceAfterModifiers)}</span>
													</div>
												)}
												{calcItem.newProject.needsLayout && (
													<div>
														<span style={{ color: 'var(--muted)' }}>С версткой: </span>
														<span style={{ fontWeight: 'var(--font-weight-semibold)' }}>{formatCurrency(calcItem.results.finalPrice)}</span>
													</div>
												)}
												{calcItem.rounding && (
													<div>
														<span style={{ color: 'var(--muted)' }}>Округление: </span>
														<span style={{ fontWeight: 'var(--font-weight-semibold)' }}>{formatRoundingLabel(calcItem.rounding)}</span>
													</div>
												)}
											</div>
										</div>
									</details>
								</div>
							))}
						</div>
					)}
				</div>
			)}
		</div>
	);
}
