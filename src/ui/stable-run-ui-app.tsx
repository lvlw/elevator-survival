import { useEffect, useState } from 'react'
import type { StableRunStore } from '../state/run-store'
import {
  createStableRunUiInteractionModel,
  previewStableRunUiPickupDraft,
  type StableRunUiAction,
  type StableRunUiActionPreviewViewModel,
  type StableRunUiPickupOpportunity,
} from './interaction'
import {
  createReturnSummaryViewModel,
  createStableRunPlayerViewModel,
  type PlayerVisibleItemViewModel,
  type PlayerVisibleLoadoutViewModel,
  type PlayerVisibleStatusBarViewModel,
  type ReturnSummaryViewModel,
  type StableRunPlayerViewModel,
  type StableRunUiPresentationDependencies,
} from './presentation'
import { useStableRunStoreSnapshot } from './run-store/use-stable-run-store-snapshot'

export interface StableRunUiAppProps {
  readonly store: StableRunStore
  readonly presentationDependencies: StableRunUiPresentationDependencies
}

function conditionSummary(status: PlayerVisibleStatusBarViewModel): string {
  const condition = status.condition
  const wounds = condition.untreatedOpenWounds + condition.treatedOpenWounds
  return [
    condition.bleeding ? '流血' : '未流血',
    wounds > 0 ? `开放伤口 ${wounds}` : '无开放伤口',
    condition.minorContusions > 0 ? '轻度挫伤' : null,
    condition.painkillerActive ? '镇痛中' : null,
  ].filter((entry): entry is string => entry !== null).join(' · ')
}

function StatusBar({ status }: Readonly<{ status: PlayerVisibleStatusBarViewModel }>) {
  return (
    <header className="run-status-bar" aria-label="Run 状态">
      <div><span>第 {status.currentDay} 日</span><strong>{status.condition.currentHealth} / {status.condition.maximumHealth} HP</strong></div>
      <div><span>状态</span><strong>{conditionSummary(status)}</strong></div>
      <div><span>世界威胁</span><strong>{status.worldThreatStage}</strong></div>
      <div><span>饱食</span><strong>{status.satiety}</strong></div>
      <div><span>主场景</span><strong>{status.mainSceneUsedToday ? '今日已进入' : '尚未进入'}</strong></div>
    </header>
  )
}

function ItemList({ items, empty = '无' }: Readonly<{ items: readonly PlayerVisibleItemViewModel[]; empty?: string }>) {
  if (items.length === 0) return <p className="empty-copy">{empty}</p>
  return <ul className="item-list">{items.map((item, index) => (
    <li key={`${item.name}-${index}`}><span>{item.name} ×{item.quantity}</span>{item.resource && <em>{item.resource.kind} {item.resource.current}</em>}</li>
  ))}</ul>
}

function LoadoutPanel({ loadout }: Readonly<{ loadout: PlayerVisibleLoadoutViewModel }>) {
  const slots = [
    ['武器', loadout.equipment.weapon],
    ['防具', loadout.equipment.armor],
    ['实用装备', loadout.equipment.utility],
  ] as const
  return <section className="console-panel" aria-labelledby="loadout-heading">
    <h2 id="loadout-heading">携带与装备</h2>
    <dl className="slot-list">{slots.map(([label, item]) => <div key={label}><dt>{label}</dt><dd>{item ? <>{item.name}{item.resource && ` · ${item.resource.kind} ${item.resource.current}`}</> : '空'}</dd></div>)}</dl>
    <h3>快捷栏</h3>
    <ol className="quick-slots">{loadout.quickSlots.map((item, index) => <li key={index}>{item ? `${item.name} ×${item.quantity}` : '空'}</li>)}</ol>
    <h3>背包</h3>
    <p>背包负重：<strong>{loadout.backpackWeight}</strong> · 负重状态：<strong>{loadTierName(loadout.loadTier)}</strong></p>
    <BackpackGrid grid={loadout.backpackGrid} />
    <ItemList items={loadout.backpack} empty="背包为空" />
  </section>
}

function loadTierName(tier: PlayerVisibleLoadoutViewModel['loadTier']): string {
  return tier === 'normal' ? '正常' : tier === 'loaded' ? '负载' : tier === 'overloaded' ? '超载' : '无法携带'
}

function BackpackGrid({
  grid,
  onAnchor,
  candidateCells = [],
}: Readonly<{
  grid: PlayerVisibleLoadoutViewModel['backpackGrid']
  onAnchor?: (x: number, y: number) => void
  candidateCells?: readonly Readonly<{ x: number; y: number }>[]
}>) {
  const candidate = new Set(candidateCells.map(({ x, y }) => `${x},${y}`))
  const anchorItems = new Map(grid.items.map((item) => [`${item.x},${item.y}`, item]))
  const cells = Array.from({ length: grid.width * grid.height }, (_, index) => ({
    x: index % grid.width,
    y: Math.floor(index / grid.width),
  }))
  return <div className="backpack-grid" style={{ gridTemplateColumns: `repeat(${grid.width}, minmax(0, 1fr))` }} aria-label={`背包网格 ${grid.width}×${grid.height}`}>
    {cells.map(({ x, y }) => {
      const item = anchorItems.get(`${x},${y}`)
      const label = item ? `${item.name} ×${item.quantity}` : `格子 ${x + 1},${y + 1}`
      return onAnchor
        ? <button key={`${x},${y}`} type="button" className={candidate.has(`${x},${y}`) ? 'grid-cell candidate-cell' : 'grid-cell'} onClick={() => onAnchor(x, y)}>{label}</button>
        : <span key={`${x},${y}`} className={candidate.has(`${x},${y}`) ? 'grid-cell candidate-cell' : 'grid-cell'}>{label}</span>
    })}
  </div>
}

function ActionPanel({
  actions,
  onPreview,
}: Readonly<{
  actions: readonly StableRunUiAction[]
  onPreview(actionId: string): void
}>) {
  if (actions.length === 0) return null
  return <section className="console-panel action-panel" aria-labelledby="actions-heading">
    <h2 id="actions-heading">可执行行动</h2>
    <div className="action-list">{actions.map((action) => <button
      key={action.id}
      type="button"
      className="action-button"
      onClick={() => onPreview(action.id)}
    >{action.label}</button>)}</div>
  </section>
}

function HubView({
  model,
  actions,
  onPreview,
}: Readonly<{
  model: Extract<StableRunPlayerViewModel, { kind: 'current-day-hub' }>
  actions: readonly StableRunUiAction[]
  onPreview(actionId: string): void
}>) {
  return <main className="console-layout">
    <StatusBar status={model.status} />
    <div className="console-grid">
      <LoadoutPanel loadout={model.loadout} />
      <section className="console-panel"><h2>电梯中枢</h2><p>已接入主要场景启动；其他中枢操作将在后续 UI 任务接入。</p><dl className="slot-list"><div><dt>维护工时</dt><dd>{model.hub.maintenanceLaborRemaining}</dd></div></dl><h3>仓库</h3><ItemList items={model.hub.warehouse} empty="仓库为空" /><h3>任务储存区</h3><ItemList items={model.hub.taskStorage} empty="暂无任务物品" /></section>
      <ActionPanel actions={actions} onPreview={onPreview} />
    </div>
  </main>
}

function CombatPanel({ combat }: Readonly<{ combat: NonNullable<Extract<StableRunPlayerViewModel, { kind: 'scene-session' }>['scene']['combat']> }>) {
  return <section className="console-panel combat-panel" aria-labelledby="combat-heading">
    <h2 id="combat-heading">战斗</h2>
    <p><strong>{combat.enemyName}</strong> · 相对生命：{combat.enemyHealthStage}</p>
    <p>当前意图：<strong>{combat.currentIntent}</strong></p>
    <p>行动顺序：玩家 CTB {combat.playerNextActionCtb} ／ 敌人 CTB {combat.enemyNextActionCtb}</p>
    <p className="empty-copy">战斗命令尚未接入此展示层。</p>
  </section>
}

function SceneView({
  model,
  actions,
  onPreview,
  pickupOpportunities,
  onPickup,
}: Readonly<{
  model: Extract<StableRunPlayerViewModel, { kind: 'scene-session' }>
  actions: readonly StableRunUiAction[]
  onPreview(actionId: string): void
  pickupOpportunities: readonly StableRunUiPickupOpportunity[]
  onPickup(opportunityId: string): void
}>) {
  const { scene } = model
  return <main className="console-layout">
    <StatusBar status={model.status} />
    <div className="console-grid">
      <section className="console-panel"><h2>场景导航</h2><p>当前位置：<strong>{scene.currentNodeName}</strong></p><p>剩余时间：<strong>{scene.remainingTime}</strong></p><p>预计返程：<strong>{scene.returnEstimate ?? '当前不可预览'}</strong></p><p>返程后预计剩余：<strong>{scene.returnAfterWithdrawalTime ?? '当前不可预览'}</strong></p>{scene.returnRisk === 'forced-returned' && <p className="preview-warning">当前返程将进入强制返程。</p>}{scene.returnRisk === 'dead' && <p className="preview-warning">当前返程将导致生命归零。</p>}<p>当前节点搜索：<strong>{scene.currentNodeSearchState}</strong></p><h3>当前可通行相邻节点</h3><ItemList items={scene.traversableAdjacentNodeNames.map((name) => ({ name, quantity: 1, resource: null }))} empty="暂无当前可通行相邻节点" /><p className="empty-copy">此列表不是场景路线总览；阻挡路线与障碍等待正式玩家可见导航查询接入。</p><h3>当前节点地面物品</h3><ItemList items={scene.groundItems} empty="未发现地面物品" />{pickupOpportunities.map((opportunity) => <button key={opportunity.id} type="button" className="action-button" onClick={() => onPickup(opportunity.id)}>拾取 {opportunity.name}</button>)}</section>
      <LoadoutPanel loadout={scene.loadout} />
      <ActionPanel actions={actions} onPreview={onPreview} />
      {scene.combat && <CombatPanel combat={scene.combat} />}
      {scene.status !== 'active' && <section className="console-panel"><h2>场景终局状态</h2><p>{scene.status}</p><p className="empty-copy">请确认终局场景结算；该操作不会自动推进日期。</p></section>}
    </div>
  </main>
}

function PickupDialog({
  opportunity,
  loadout,
  preview,
  quantity,
  x,
  y,
  rotated,
  onQuantity,
  onRotate,
  onAnchor,
  onCancel,
  onConfirm,
}: Readonly<{
  opportunity: StableRunUiPickupOpportunity
  loadout: PlayerVisibleLoadoutViewModel
  preview: ReturnType<typeof previewStableRunUiPickupDraft>
  quantity: number
  x: number
  y: number
  rotated: boolean
  onQuantity(value: number): void
  onRotate(value: boolean): void
  onAnchor(x: number, y: number): void
  onCancel(): void
  onConfirm(): void
}>) {
  return <div className="preview-backdrop" role="presentation"><section className="preview-dialog" role="dialog" aria-modal="true" aria-labelledby="pickup-title">
    <h2 id="pickup-title">拾取 {opportunity.name}</h2>
    <p>地面剩余数量：<strong>{opportunity.groundQuantity}</strong></p>
    <label>本次拾取数量 <input aria-label="本次拾取数量" type="number" min="1" max={opportunity.groundQuantity} value={quantity} onChange={(event) => onQuantity(Number(event.target.value))} /></label>
    {opportunity.canRotate && <label><input aria-label="旋转物品" type="checkbox" checked={rotated} onChange={(event) => onRotate(event.target.checked)} />旋转</label>}
    <p>目标格：{x + 1}, {y + 1}</p>
    <BackpackGrid grid={loadout.backpackGrid} candidateCells={preview?.candidateCells} onAnchor={onAnchor} />
    {preview?.canExecute ? <dl className="preview-facts">{preview.facts.map((fact) => <div key={fact.label}><dt>{fact.label}</dt><dd>{fact.value}</dd></div>)}</dl> : <p className="preview-warning">{preview?.rejection ?? '状态已变化，请重新选择。'}</p>}
    <div className="preview-controls"><button type="button" onClick={onCancel}>取消</button><button type="button" className="confirm-action" disabled={!preview?.canExecute} onClick={onConfirm}>确认拾取</button></div>
  </section></div>
}

function ReturnSummaryDialog({ summary, onClose }: Readonly<{ summary: ReturnSummaryViewModel; onClose(): void }>) {
  const kind = summary.returnKind === 'safe' ? '安全' : '强制'
  return <div className="preview-backdrop" role="presentation"><section className="preview-dialog" role="dialog" aria-modal="true" aria-labelledby="return-summary-title">
    <h2 id="return-summary-title">返回摘要</h2><p>返回类型：<strong>{kind}</strong></p><p>剩余生命：<strong>{summary.remainingHealth}</strong></p><h3>带回普通／权限物品</h3><ItemList items={summary.warehouseItems} empty="无" /><h3>带回任务物品</h3><ItemList items={summary.taskItems} empty="无" />{summary.lostTaskItemCount > 0 && <p>遗失任务物品：{summary.lostTaskItemCount}</p>}<div className="preview-controls"><button type="button" onClick={onClose}>关闭摘要</button></div>
  </section></div>
}

function ActionPreviewDialog({
  preview,
  onCancel,
  onConfirm,
}: Readonly<{
  preview: StableRunUiActionPreviewViewModel
  onCancel(): void
  onConfirm(): void
}>) {
  return <div className="preview-backdrop" role="presentation">
    <section className="preview-dialog" role="dialog" aria-modal="true" aria-labelledby="action-preview-title">
      <h2 id="action-preview-title">{preview.title}</h2>
      <dl className="preview-facts">{preview.facts.map((fact) => <div key={fact.label}>
        <dt>{fact.label}</dt><dd>{fact.value}</dd>
      </div>)}</dl>
      {preview.warnings.length > 0 && <ul className="preview-warnings">
        {preview.warnings.map((warning) => <li key={warning}>{warning}</li>)}
      </ul>}
      <div className="preview-controls">
        <button type="button" onClick={onCancel}>取消</button>
        <button type="button" className="confirm-action" onClick={onConfirm}>确认执行</button>
      </div>
    </section>
  </div>
}

function FailureView({ model }: Readonly<{ model: Extract<StableRunPlayerViewModel, { kind: 'run-failure' }> }>) {
  return <main className="console-layout"><section className="console-panel terminal-panel"><p className="eyebrow">Run 已终止</p><h1>失败</h1><p>第 {model.failure.currentDay} 日 · {model.failure.reason}</p><p>此终局为只读状态，尚未接入新 Run 或 Profile 流程。</p></section></main>
}

function DevInspector({ phase }: Readonly<{ phase: unknown }>) {
  const [open, setOpen] = useState(false)
  return <aside className="dev-inspector">
    <button type="button" onClick={() => setOpen((value) => !value)}>{open ? '隐藏开发检查器' : '显示开发检查器'}</button>
    {open && <pre>{JSON.stringify(phase, null, 2)}</pre>}
  </aside>
}

export function StableRunUiApp({ store, presentationDependencies }: StableRunUiAppProps) {
  const snapshot = useStableRunStoreSnapshot(store)
  const model = createStableRunPlayerViewModel(snapshot.phase, presentationDependencies)
  const interaction = createStableRunUiInteractionModel(snapshot.phase, presentationDependencies)
  const [pendingActionId, setPendingActionId] = useState<string | null>(null)
  const [pendingPickupId, setPendingPickupId] = useState<string | null>(null)
  const [pickupQuantity, setPickupQuantity] = useState(1)
  const [pickupX, setPickupX] = useState(0)
  const [pickupY, setPickupY] = useState(0)
  const [pickupRotated, setPickupRotated] = useState(false)
  const [returnSummary, setReturnSummary] = useState<ReturnSummaryViewModel | null>(null)
  const [persistenceFeedback, setPersistenceFeedback] = useState<string | null>(null)
  const pendingAction = interaction.actions.find(({ id }) => id === pendingActionId) ?? null
  const pendingPickup = interaction.pickupOpportunities.find(({ id }) => id === pendingPickupId) ?? null
  const pickupPreview = pendingPickup === null ? null : previewStableRunUiPickupDraft(snapshot.phase, {
    opportunityId: pendingPickup.id,
    quantity: pickupQuantity,
    x: pickupX,
    y: pickupY,
    rotated: pickupRotated,
  }, presentationDependencies)

  useEffect(() => {
    if (pendingPickupId !== null && pendingPickup === null) setPendingPickupId(null)
  }, [pendingPickup, pendingPickupId])

  const confirm = () => {
    if (!pendingAction) return
    const execution = store.dispatch(pendingAction.command)
    setPendingActionId(null)
    setPersistenceFeedback(execution.kind === 'executed'
      ? '✓ 操作已执行并保存'
      : '⚠ 保存失败：本次操作已在当前会话中生效，请勿刷新页面。')
    if (
      pendingAction.kind === 'settle-terminal-scene' &&
      execution.phase.kind === 'current-day-hub' &&
      'runReturn' in execution.result
    ) {
      setReturnSummary(createReturnSummaryViewModel(
        execution.result.runReturn.summary,
        execution.phase,
        presentationDependencies,
      ))
    }
  }
  const openPickup = (opportunityId: string) => {
    const opportunity = interaction.pickupOpportunities.find(({ id }) => id === opportunityId)
    if (!opportunity) return
    setPendingActionId(null)
    setPickupQuantity(opportunity.groundQuantity)
    setPickupX(0)
    setPickupY(0)
    setPickupRotated(false)
    setPendingPickupId(opportunityId)
  }
  const confirmPickup = () => {
    if (!pickupPreview?.canExecute || pickupPreview.command === null) return
    const execution = store.dispatch(pickupPreview.command)
    setPendingPickupId(null)
    setPersistenceFeedback(execution.kind === 'executed'
      ? '✓ 操作已执行并保存'
      : '⚠ 保存失败：本次操作已在当前会话中生效，请勿刷新页面。')
  }
  return <>
    {persistenceFeedback && <p className="persistence-feedback" role="status">{persistenceFeedback}</p>}
    {model.kind === 'current-day-hub' && <HubView model={model} actions={interaction.actions} onPreview={setPendingActionId} />}
    {model.kind === 'scene-session' && <SceneView model={model} actions={interaction.actions} onPreview={setPendingActionId} pickupOpportunities={interaction.pickupOpportunities} onPickup={openPickup} />}
    {model.kind === 'run-failure' && <FailureView model={model} />}
    {pendingAction && <ActionPreviewDialog
      preview={pendingAction.preview}
      onCancel={() => setPendingActionId(null)}
      onConfirm={confirm}
    />}
    {pendingPickup && model.kind === 'scene-session' && <PickupDialog opportunity={pendingPickup} loadout={model.scene.loadout} preview={pickupPreview} quantity={pickupQuantity} x={pickupX} y={pickupY} rotated={pickupRotated} onQuantity={setPickupQuantity} onRotate={setPickupRotated} onAnchor={(x, y) => { setPickupX(x); setPickupY(y) }} onCancel={() => setPendingPickupId(null)} onConfirm={confirmPickup} />}
    {returnSummary && <ReturnSummaryDialog summary={returnSummary} onClose={() => setReturnSummary(null)} />}
    {import.meta.env.DEV && <DevInspector phase={snapshot.phase} />}
  </>
}
