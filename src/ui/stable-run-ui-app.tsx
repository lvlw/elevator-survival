import { useState } from 'react'
import type { StableRunStore } from '../state/run-store'
import {
  createStableRunUiInteractionModel,
  type StableRunUiAction,
  type StableRunUiActionPreviewViewModel,
} from './interaction'
import {
  createStableRunPlayerViewModel,
  type PlayerVisibleItemViewModel,
  type PlayerVisibleLoadoutViewModel,
  type PlayerVisibleStatusBarViewModel,
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
    <ItemList items={loadout.backpack} empty="背包为空" />
  </section>
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
      <section className="console-panel"><h2>电梯中枢</h2><p>当前为只读策略控制台。中枢操作将在后续 UI 任务接入。</p><dl className="slot-list"><div><dt>维护工时</dt><dd>{model.hub.maintenanceLaborRemaining}</dd></div></dl><h3>仓库</h3><ItemList items={model.hub.warehouse} empty="仓库为空" /><h3>任务储存区</h3><ItemList items={model.hub.taskStorage} empty="暂无任务物品" /></section>
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
}: Readonly<{
  model: Extract<StableRunPlayerViewModel, { kind: 'scene-session' }>
  actions: readonly StableRunUiAction[]
  onPreview(actionId: string): void
}>) {
  const { scene } = model
  return <main className="console-layout">
    <StatusBar status={model.status} />
    <div className="console-grid">
      <section className="console-panel"><h2>场景导航</h2><p>当前位置：<strong>{scene.currentNodeName}</strong></p><p>剩余时间：<strong>{scene.remainingTime}</strong></p><p>预计返程：<strong>{scene.returnEstimate ?? '当前不可预览'}</strong></p><p>当前节点搜索：<strong>{scene.currentNodeSearchState}</strong></p><h3>当前可通行相邻节点</h3><ItemList items={scene.traversableAdjacentNodeNames.map((name) => ({ name, quantity: 1, resource: null }))} empty="暂无当前可通行相邻节点" /><p className="empty-copy">此列表不是场景路线总览；阻挡路线与障碍等待正式玩家可见导航查询接入。</p><h3>当前节点地面物品</h3><ItemList items={scene.groundItems} empty="未发现地面物品" /></section>
      <LoadoutPanel loadout={scene.loadout} />
      <ActionPanel actions={actions} onPreview={onPreview} />
      {scene.combat && <CombatPanel combat={scene.combat} />}
      {scene.status !== 'active' && <section className="console-panel"><h2>场景终局状态</h2><p>{scene.status}</p><p className="empty-copy">终局场景结算命令尚未由 UI 发出。</p></section>}
    </div>
  </main>
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
  const [persistenceFeedback, setPersistenceFeedback] = useState<string | null>(null)
  const pendingAction = interaction.actions.find(({ id }) => id === pendingActionId) ?? null

  const confirm = () => {
    if (!pendingAction) return
    const execution = store.dispatch(pendingAction.command)
    setPendingActionId(null)
    setPersistenceFeedback(execution.kind === 'executed'
      ? '✓ 操作已执行并保存'
      : '⚠ 保存失败：本次操作已在当前会话中生效，请勿刷新页面。')
  }
  return <>
    {persistenceFeedback && <p className="persistence-feedback" role="status">{persistenceFeedback}</p>}
    {model.kind === 'current-day-hub' && <HubView model={model} actions={interaction.actions} onPreview={setPendingActionId} />}
    {model.kind === 'scene-session' && <SceneView model={model} actions={interaction.actions} onPreview={setPendingActionId} />}
    {model.kind === 'run-failure' && <FailureView model={model} />}
    {pendingAction && <ActionPreviewDialog
      preview={pendingAction.preview}
      onCancel={() => setPendingActionId(null)}
      onConfirm={confirm}
    />}
    {import.meta.env.DEV && <DevInspector phase={snapshot.phase} />}
  </>
}
