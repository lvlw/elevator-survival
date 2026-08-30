import { useEffect, useState } from 'react'
import type { StableRunStore } from '../state/run-store'
import {
  createStableRunUiInteractionModel,
  previewStableRunUiHubLoadoutDraft,
  previewStableRunUiHubCareCommand,
  previewStableRunUiPickupDraft,
  previewStableRunUiSceneInventoryDraft,
  previewStableRunUiTaskEventDraft,
  type StableRunUiAction,
  type StableRunUiActionPreviewViewModel,
  type StableRunUiPickupOpportunity,
  type StableRunUiInventoryOperation,
  type StableRunUiInventoryOpportunity,
  type StableRunUiTaskEventOpportunity,
  type StableRunUiHubLoadoutOperation,
  type StableRunUiHubLoadoutOpportunity,
} from './interaction'
import {
  createReturnSummaryViewModel,
  createCombatActionResultViewModel,
  createSceneBatteryResultViewModel,
  createSceneMedicalResultViewModel,
  createSceneInventoryResultViewModel,
  createStableRunPlayerViewModel,
  createTaskEventResultViewModel,
  createHubLoadoutResultViewModel,
  createHubMedicalResultViewModel,
  createHubSurvivalResultViewModel,
  type PlayerVisibleItemViewModel,
  type PlayerVisibleCombatViewModel,
  type PlayerVisibleLoadoutViewModel,
  type PlayerVisibleStatusBarViewModel,
  type ReturnSummaryViewModel,
  type CombatActionResultViewModel,
  type SceneBatteryResultViewModel,
  type SceneMedicalResultViewModel,
  type SceneInventoryResultViewModel,
  type TaskEventResultViewModel,
  type StableRunPlayerViewModel,
  type StableRunUiPresentationDependencies,
  type HubLoadoutResultViewModel,
  type HubMedicalResultViewModel,
  type HubSurvivalResultViewModel,
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
    condition.pendingInfectionExposures > 0
      ? `未结算感染暴露 ${condition.pendingInfectionExposures}`
      : null,
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

function woundKindName(kind: 'laceration' | 'puncture' | 'bite'): string {
  return kind === 'laceration' ? '撕裂伤' : kind === 'puncture' ? '穿刺伤' : '咬伤'
}

function enemyHealthStageName(
  stage: PlayerVisibleCombatViewModel['enemyHealthStage'],
): string {
  return stage === 'healthy'
    ? '完好'
    : stage === 'wounded'
      ? '受伤'
      : stage === 'severely-wounded'
        ? '重伤'
        : stage === 'critical'
          ? '濒危'
          : '失去能力'
}

function CombatLoadoutPanel({ loadout }: Readonly<{ loadout: PlayerVisibleLoadoutViewModel }>) {
  const slots = [
    ['武器', loadout.equipment.weapon],
    ['防具', loadout.equipment.armor],
  ] as const
  return <section className="console-panel" aria-labelledby="combat-loadout-heading">
    <h2 id="combat-loadout-heading">战斗携带状态</h2>
    <p>背包负重：<strong>{loadout.backpackWeight}</strong> · 负重状态：<strong>{loadTierName(loadout.loadTier)}</strong></p>
    <dl className="slot-list">{slots.map(([label, item]) => <div key={label}><dt>{label}</dt><dd>{item ? <>{item.name}{item.resource && ` · ${item.resource.kind} ${item.resource.current}`}</> : '空'}</dd></div>)}</dl>
    <h3>快捷栏</h3>
    <ol className="quick-slots">{loadout.quickSlots.map((item, index) => <li key={index}>{item ? `${item.name} ×${item.quantity}` : '空'}</li>)}</ol>
  </section>
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
  const occupiedByCell = new Map(
    grid.occupiedCells.map((cell) => [`${cell.x},${cell.y}`, cell]),
  )
  const cells = Array.from({ length: grid.width * grid.height }, (_, index) => ({
    x: index % grid.width,
    y: Math.floor(index / grid.width),
  }))
  return <div className="backpack-grid" style={{ gridTemplateColumns: `repeat(${grid.width}, minmax(0, 1fr))` }} aria-label={`背包网格 ${grid.width}×${grid.height}`}>
    {cells.map(({ x, y }) => {
      const occupied = occupiedByCell.get(`${x},${y}`)
      const label = occupied
        ? occupied.isAnchor
          ? `${occupied.name} ×${occupied.quantity}`
          : `${occupied.name} · 占用`
        : `格子 ${x + 1},${y + 1}`
      const className = [
        'grid-cell',
        occupied ? 'occupied-cell' : '',
        candidate.has(`${x},${y}`) ? 'candidate-cell' : '',
      ].filter(Boolean).join(' ')
      return onAnchor
        ? <button key={`${x},${y}`} type="button" className={className} data-occupied={occupied ? 'true' : 'false'} onClick={() => onAnchor(x, y)}>{label}</button>
        : <span key={`${x},${y}`} className={className} data-occupied={occupied ? 'true' : 'false'}>{label}</span>
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
  loadoutOpportunities,
  onLoadout,
}: Readonly<{
  model: Extract<StableRunPlayerViewModel, { kind: 'current-day-hub' }>
  actions: readonly StableRunUiAction[]
  onPreview(actionId: string): void
  loadoutOpportunities: readonly StableRunUiHubLoadoutOpportunity[]
  onLoadout(opportunityId: string): void
}>) {
  return <main className="console-layout">
    <StatusBar status={model.status} />
    <div className="console-grid">
      <LoadoutPanel loadout={model.loadout} />
      <section className="console-panel"><h2>电梯中枢</h2><p>已接入主要场景启动、显式整备、中枢医疗与生存补给；维护和结束本日将在后续 UI 任务接入。</p><dl className="slot-list"><div><dt>维护工时</dt><dd>{model.hub.maintenanceLaborRemaining}</dd></div></dl><h3>仓库</h3><ItemList items={model.hub.warehouse} empty="仓库为空" />{loadoutOpportunities.filter(({ container }) => container === 'warehouse').map((opportunity) => <button key={opportunity.id} type="button" className="action-button" onClick={() => onLoadout(opportunity.id)}>整备 {opportunity.sourceLabel}</button>)}<h3>任务储存区（只读）</h3><ItemList items={model.hub.taskStorage} empty="暂无任务物品" /></section>
      {loadoutOpportunities.some(({ container }) => container !== 'warehouse') && <section className="console-panel"><h2>当前携带物整理</h2>{loadoutOpportunities.filter(({ container }) => container !== 'warehouse').map((opportunity) => <button key={opportunity.id} type="button" className="action-button" onClick={() => onLoadout(opportunity.id)}>整备 {opportunity.sourceLabel}</button>)}</section>}
      <ActionPanel actions={actions} onPreview={onPreview} />
    </div>
  </main>
}

function CombatPanel({
  combat,
  condition,
}: Readonly<{
  combat: NonNullable<Extract<StableRunPlayerViewModel, { kind: 'scene-session' }>['scene']['combat']>
  condition: PlayerVisibleStatusBarViewModel['condition']
}>) {
  const category = combat.currentIntentCategory === 'basic-attack' ? '基础攻击' : '特殊攻击'
  const speed = combat.currentIntentRelativeSpeed === 'normal' ? '普通' : '缓慢'
  const danger = combat.currentIntentDirectDamageSeverity === 'medium'
    ? '中等直接伤害'
    : '高直接伤害'
  return <section className="console-panel combat-panel" aria-labelledby="combat-heading">
    <h2 id="combat-heading">战斗</h2>
    <p><strong>{combat.enemyName}</strong> · 相对生命：{enemyHealthStageName(combat.enemyHealthStage)}</p>
    <p>当前意图：<strong>{combat.currentIntent}</strong></p>
    <dl className="slot-list">
      <div><dt>类别</dt><dd>{category}</dd></div>
      <div><dt>相对速度</dt><dd>{speed}</dd></div>
      <div><dt>主要危险</dt><dd>{danger}</dd></div>
      <div><dt>可能造成伤势</dt><dd>{combat.currentIntentMayCauseInjury ? '是' : '否'}</dd></div>
      <div><dt>可能感染暴露</dt><dd>{combat.currentIntentMayCauseInfectionExposure ? '是' : '否'}</dd></div>
      <div><dt>可能控制／延后</dt><dd>{combat.currentIntentMayCauseControl ? '是' : '否'}</dd></div>
    </dl>
    <p>当前 CTB {combat.currentCtb} ／ 玩家下次行动 CTB {combat.playerNextActionCtb} ／ 敌人下次行动 CTB {combat.enemyNextActionCtb}</p>
    <p>当前 Scene 剩余时间：<strong>{combat.sceneRemainingTime}</strong></p>
    <p>若此刻结束，预计结算 Scene 时间：<strong>{combat.sceneTimeIfCombatEndedNow}</strong>（最低 {combat.minimumSceneTime}）</p>
    <p className="empty-copy">战斗实际 Scene 时间将在战斗结束时一次结算。</p>
    <h3>玩家伤势</h3>
    {condition.wounds.length === 0
      ? <p className="empty-copy">无开放伤口</p>
      : <ul className="item-list">{condition.wounds.map((wound) => <li key={`${wound.kind}-${wound.ordinal}`}>{woundKindName(wound.kind)} {wound.ordinal} · {wound.treatment === 'treated' ? '已处理' : '未处理'}</li>)}</ul>}
    <p>流血：{condition.bleeding ? '是' : '否'} · 轻度挫伤：{condition.minorContusions} · 镇痛：{condition.painkillerActive ? '生效' : '无'}</p>
    <p>未结算感染暴露：{condition.pendingInfectionExposures}</p>
  </section>
}

function SceneView({
  model,
  actions,
  onPreview,
  pickupOpportunities,
  onPickup,
  taskEventOpportunities,
  onTaskEvent,
  inventoryOpportunities,
  onInventory,
}: Readonly<{
  model: Extract<StableRunPlayerViewModel, { kind: 'scene-session' }>
  actions: readonly StableRunUiAction[]
  onPreview(actionId: string): void
  pickupOpportunities: readonly StableRunUiPickupOpportunity[]
  onPickup(opportunityId: string): void
  taskEventOpportunities: readonly StableRunUiTaskEventOpportunity[]
  onTaskEvent(opportunityId: string): void
  inventoryOpportunities: readonly StableRunUiInventoryOpportunity[]
  onInventory(opportunityId: string): void
}>) {
  const { scene } = model
  return <main className="console-layout">
    <StatusBar status={model.status} />
    <div className="console-grid">
      <section className="console-panel"><h2>场景导航</h2><p>当前位置：<strong>{scene.currentNodeName}</strong></p><p>剩余时间：<strong>{scene.remainingTime}</strong></p><p>预计返程：<strong>{scene.returnEstimate ?? '当前不可预览'}</strong></p><p>返程后预计剩余：<strong>{scene.returnAfterWithdrawalTime ?? '当前不可预览'}</strong></p>{scene.returnRisk === 'forced-returned' && <p className="preview-warning">当前返程将进入强制返程。</p>}{scene.returnRisk === 'dead' && <p className="preview-warning">当前返程将导致生命归零。</p>}<p>当前节点搜索：<strong>{scene.currentNodeSearchState}</strong></p><h3>当前可通行相邻节点</h3><ItemList items={scene.traversableAdjacentNodeNames.map((name) => ({ name, quantity: 1, resource: null }))} empty="暂无当前可通行相邻节点" /><h3>当前明显障碍</h3><ItemList items={scene.currentObstacles.map(({ name }) => ({ name, quantity: 1, resource: null }))} empty="当前没有需要处理的明显障碍" /><h3>当前节点地面物品</h3><ItemList items={scene.groundItems} empty="未发现地面物品" />{pickupOpportunities.map((opportunity) => <button key={opportunity.id} type="button" className="action-button" onClick={() => onPickup(opportunity.id)}>拾取 {opportunity.name}</button>)}{taskEventOpportunities.length > 0 && <><h3>任务事件</h3>{taskEventOpportunities.map((opportunity) => <button key={opportunity.id} type="button" className="action-button" onClick={() => onTaskEvent(opportunity.id)}>{opportunity.label}</button>)}</>}{inventoryOpportunities.length > 0 && <><h3>场景整理</h3>{inventoryOpportunities.map((opportunity) => <button key={opportunity.id} type="button" className="action-button" onClick={() => onInventory(opportunity.id)}>整理 {opportunity.sourceLabel}</button>)}</>}</section>
      {scene.status === 'combat'
        ? <CombatLoadoutPanel loadout={scene.loadout} />
        : <LoadoutPanel loadout={scene.loadout} />}
      <ActionPanel actions={actions} onPreview={onPreview} />
      {scene.combat && <CombatPanel combat={scene.combat} condition={model.status.condition} />}
      {scene.status !== 'active' && scene.status !== 'combat' && <section className="console-panel"><h2>场景终局状态</h2><p>{scene.status}</p><p className="empty-copy">请确认终局场景结算；该操作不会自动推进日期。</p></section>}
    </div>
  </main>
}

function TaskEventDialog({
  opportunity,
  loadout,
  preview,
  x,
  y,
  rotated,
  onRotate,
  onAnchor,
  onCancel,
  onConfirm,
}: Readonly<{
  opportunity: StableRunUiTaskEventOpportunity
  loadout: PlayerVisibleLoadoutViewModel
  preview: ReturnType<typeof previewStableRunUiTaskEventDraft>
  x: number | null
  y: number | null
  rotated: boolean
  onRotate(value: boolean): void
  onAnchor(x: number, y: number): void
  onCancel(): void
  onConfirm(): void
}>) {
  return <div className="preview-backdrop" role="presentation"><section className="preview-dialog" role="dialog" aria-modal="true" aria-labelledby="task-event-title">
    <h2 id="task-event-title">{opportunity.eventName} · {opportunity.label}</h2>
    <p>取得：<strong>{opportunity.outputName}</strong> · {opportunity.width}×{opportunity.height} · 重量 {opportunity.unitWeight}</p>
    {opportunity.canRotate && <label><input aria-label="旋转样本箱" type="checkbox" checked={rotated} onChange={(event) => onRotate(event.target.checked)} />旋转</label>}
    <p>目标格：{x === null || y === null ? '尚未选择' : `${x + 1}, ${y + 1}`}</p>
    <BackpackGrid grid={loadout.backpackGrid} candidateCells={preview?.candidateCells} onAnchor={onAnchor} />
    {preview?.canExecute && preview.preview
      ? <><dl className="preview-facts">{preview.preview.facts.map((fact) => <div key={fact.label}><dt>{fact.label}</dt><dd>{fact.value}</dd></div>)}</dl>{preview.preview.warnings.length > 0 && <ul className="preview-warnings">{preview.preview.warnings.map((warning) => <li key={warning}>{warning}</li>)}</ul>}</>
      : <p className="preview-warning">{x === null || y === null
        ? '请在背包网格中明确选择样本箱放置位置。'
        : preview?.rejection ?? '状态已变化，请重新选择。'}</p>}
    <div className="preview-controls"><button type="button" onClick={onCancel}>取消</button><button type="button" className="confirm-action" disabled={!preview?.canExecute} onClick={onConfirm}>确认提取</button></div>
  </section></div>
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

function inventoryOperationLabel(operation: StableRunUiInventoryOperation): string {
  return operation === 'move'
    ? '移动／旋转'
    : operation === 'split'
      ? '拆分堆叠'
      : operation === 'merge'
        ? '合并堆叠'
        : operation === 'backpack-to-quick-slot'
          ? '放入快捷栏'
          : operation === 'quick-slot-to-backpack'
            ? '放回背包'
            : '放到当前节点'
}

function SceneInventoryDialog({
  opportunity,
  opportunities,
  loadout,
  operation,
  quantity,
  targetOpportunityId,
  targetSlotIndex,
  x,
  y,
  rotated,
  preview,
  onOperation,
  onQuantity,
  onTargetOpportunity,
  onTargetSlot,
  onAnchor,
  onRotate,
  onCancel,
  onConfirm,
}: Readonly<{
  opportunity: StableRunUiInventoryOpportunity
  opportunities: readonly StableRunUiInventoryOpportunity[]
  loadout: PlayerVisibleLoadoutViewModel
  operation: StableRunUiInventoryOperation | null
  quantity: number | null
  targetOpportunityId: string | null
  targetSlotIndex: number | null
  x: number | null
  y: number | null
  rotated: boolean
  preview: ReturnType<typeof previewStableRunUiSceneInventoryDraft>
  onOperation(value: StableRunUiInventoryOperation): void
  onQuantity(value: number | null): void
  onTargetOpportunity(value: string): void
  onTargetSlot(value: number): void
  onAnchor(x: number, y: number): void
  onRotate(value: boolean): void
  onCancel(): void
  onConfirm(): void
}>) {
  const needsPlacement = operation === 'move' || operation === 'split' ||
    operation === 'quick-slot-to-backpack'
  const mergeTargets = opportunities.filter(
    (candidate) => candidate.container === 'backpack' && candidate.id !== opportunity.id,
  )
  return <div className="preview-backdrop" role="presentation"><section className="preview-dialog" role="dialog" aria-modal="true" aria-labelledby="scene-inventory-title">
    <h2 id="scene-inventory-title">场景整理</h2>
    <p>来源：<strong>{opportunity.sourceLabel}</strong></p>
    <div className="preview-controls" aria-label="整理操作">
      {opportunity.operations.map((candidate) => <button key={candidate} type="button" className={operation === candidate ? 'confirm-action' : ''} onClick={() => onOperation(candidate)}>{inventoryOperationLabel(candidate)}</button>)}
    </div>
    {(operation === 'split' || operation === 'merge') && <label>明确数量 <input aria-label="整理数量" type="number" min="1" value={quantity ?? ''} onChange={(event) => onQuantity(event.target.value === '' ? null : Number(event.target.value))} /></label>}
    {operation === 'merge' && <><h3>明确目标堆叠</h3><div className="preview-controls">{mergeTargets.map((target) => <button key={target.id} type="button" className={targetOpportunityId === target.id ? 'confirm-action' : ''} onClick={() => onTargetOpportunity(target.id)}>{target.sourceLabel}</button>)}</div></>}
    {operation === 'backpack-to-quick-slot' && <><h3>明确目标快捷栏</h3><div className="preview-controls">{loadout.quickSlots.map((slot, index) => <button key={index} type="button" className={targetSlotIndex === index ? 'confirm-action' : ''} onClick={() => onTargetSlot(index)}>快捷栏{index + 1} · {slot?.name ?? '空'}</button>)}</div></>}
    {needsPlacement && <>
      {opportunity.canRotate && <label><input aria-label="旋转整理物品" type="checkbox" checked={rotated} onChange={(event) => onRotate(event.target.checked)} />旋转</label>}
      <p>目标格：{x === null || y === null ? '尚未选择' : `${x + 1}, ${y + 1}`}</p>
      <BackpackGrid grid={loadout.backpackGrid} candidateCells={preview?.candidateCells} onAnchor={onAnchor} />
    </>}
    {operation === 'drop' && <p>本操作会把整个物品实例／整个堆叠放到当前节点，不会自动拆分。</p>}
    {preview?.canExecute && preview.preview
      ? <><dl className="preview-facts">{preview.preview.facts.map((fact) => <div key={fact.label}><dt>{fact.label}</dt><dd>{fact.value}</dd></div>)}</dl>{preview.preview.warnings.length > 0 && <ul className="preview-warnings">{preview.preview.warnings.map((warning) => <li key={warning}>{warning}</li>)}</ul>}</>
      : <p className="preview-warning">{operation === null
        ? '请明确选择一项整理操作。'
        : preview?.rejection ?? '请明确选择数量、目标快捷栏、目标堆叠或背包放置位置。'}</p>}
    <div className="preview-controls"><button type="button" onClick={onCancel}>取消</button><button type="button" className="confirm-action" disabled={!preview?.canExecute} onClick={onConfirm}>确认整理</button></div>
  </section></div>
}

function SceneInventoryResultDialog({
  result,
  onClose,
}: Readonly<{ result: SceneInventoryResultViewModel; onClose(): void }>) {
  return <div className="preview-backdrop" role="presentation"><section className="preview-dialog" role="dialog" aria-modal="true" aria-labelledby="scene-inventory-result-title">
    <h2 id="scene-inventory-result-title">场景整理结果</h2>
    <p><strong>{result.action}</strong></p>
    <dl className="preview-facts">
      <div><dt>物品</dt><dd>{result.itemName}</dd></div>
      <div><dt>来源</dt><dd>{result.source}</dd></div>
      <div><dt>目标</dt><dd>{result.target}</dd></div>
      <div><dt>转移数量</dt><dd>{result.quantityMoved}</dd></div>
      <div><dt>来源数量</dt><dd>{result.sourceQuantityBefore} → {result.sourceQuantityAfter}</dd></div>
      {result.targetQuantityBefore !== null && result.targetQuantityAfter !== null && <div><dt>目标数量</dt><dd>{result.targetQuantityBefore} → {result.targetQuantityAfter}</dd></div>}
      <div><dt>背包负重</dt><dd>{result.backpackWeightBefore} → {result.backpackWeightAfter}</dd></div>
      <div><dt>Scene 时间</dt><dd>{result.remainingTimeBefore} → {result.remainingTimeAfter}（不消耗）</dd></div>
      <div><dt>生命</dt><dd>{result.healthBefore} → {result.healthAfter}</dd></div>
      <div><dt>当前节点</dt><dd>{result.currentNodeName}</dd></div>
      <div><dt>整理后预计返程</dt><dd>{result.returnEstimateAfter ?? '当前不可预览'}</dd></div>
      <div><dt>整理后返程预计剩余</dt><dd>{result.returnRemainingAfter ?? '当前不可预览'}</dd></div>
    </dl>
    {result.questDrop && <p className="preview-warning">任务物品当前留在场景节点，尚未安全进入任务储存区。</p>}
    <div className="preview-controls"><button type="button" onClick={onClose}>关闭结果</button></div>
  </section></div>
}

function hubLoadoutOperationLabel(operation: StableRunUiHubLoadoutOperation): string {
  const labels: Record<StableRunUiHubLoadoutOperation, string> = {
    'warehouse-to-backpack': '取出至背包',
    'backpack-to-warehouse': '存入仓库',
    'move-backpack-item': '移动／旋转',
    'split-backpack-stack': '拆分堆叠',
    'merge-backpack-stacks': '合并堆叠',
    'equip-from-backpack': '装备',
    'unequip-to-backpack': '卸下至背包',
    'swap-backpack-equipped': '交换装备',
    'backpack-to-quick-slot': '放入快捷栏',
    'quick-slot-to-backpack': '放回背包',
    'move-quick-slot-item': '移动快捷栏物品',
    'swap-quick-slot-items': '交换快捷栏物品',
  }
  return labels[operation]
}

function HubLoadoutDialog({
  opportunity, opportunities, loadout, operation, quantity, targetOpportunityId,
  targetEquipmentSlot, targetQuickSlotIndex, x, y, rotated, preview,
  onOperation, onQuantity, onTargetOpportunity, onTargetEquipmentSlot,
  onTargetQuickSlotIndex, onAnchor, onRotate, onCancel, onConfirm,
}: Readonly<{
  opportunity: StableRunUiHubLoadoutOpportunity
  opportunities: readonly StableRunUiHubLoadoutOpportunity[]
  loadout: PlayerVisibleLoadoutViewModel
  operation: StableRunUiHubLoadoutOperation | null
  quantity: number | null
  targetOpportunityId: string | null
  targetEquipmentSlot: 'weapon' | 'armor' | 'utility' | null
  targetQuickSlotIndex: number | null
  x: number | null
  y: number | null
  rotated: boolean
  preview: ReturnType<typeof previewStableRunUiHubLoadoutDraft>
  onOperation(value: StableRunUiHubLoadoutOperation): void
  onQuantity(value: number | null): void
  onTargetOpportunity(value: string): void
  onTargetEquipmentSlot(value: 'weapon' | 'armor' | 'utility'): void
  onTargetQuickSlotIndex(value: number): void
  onAnchor(x: number, y: number): void
  onRotate(value: boolean): void
  onCancel(): void
  onConfirm(): void
}>) {
  const needsPlacement = operation === 'warehouse-to-backpack' || operation === 'move-backpack-item' ||
    operation === 'split-backpack-stack' || operation === 'unequip-to-backpack' ||
    operation === 'quick-slot-to-backpack' || operation === 'swap-backpack-equipped'
  const needsQuantity = operation === 'split-backpack-stack' || operation === 'merge-backpack-stacks'
  const backpackTargets = opportunities.filter((candidate) => candidate.container === 'backpack' && candidate.id !== opportunity.id)
  const equipmentTargets = opportunities.filter((candidate) => candidate.container === 'equipment')
  return <div className="preview-backdrop" role="presentation"><section className="preview-dialog" role="dialog" aria-modal="true" aria-labelledby="hub-loadout-title">
    <h2 id="hub-loadout-title">电梯中枢整备</h2>
    <p>来源：<strong>{opportunity.sourceLabel}</strong></p>
    <div className="preview-controls" aria-label="中枢整备操作">{opportunity.operations.map((candidate) => <button key={candidate} type="button" className={operation === candidate ? 'confirm-action' : ''} onClick={() => onOperation(candidate)}>{hubLoadoutOperationLabel(candidate)}</button>)}</div>
    {needsQuantity && <label>明确数量 <input aria-label="中枢整备数量" type="number" min="1" value={quantity ?? ''} onChange={(event) => onQuantity(event.target.value === '' ? null : Number(event.target.value))} /></label>}
    {operation === 'merge-backpack-stacks' && <><h3>明确目标堆叠</h3><div className="preview-controls">{backpackTargets.map((target) => <button key={target.id} type="button" className={targetOpportunityId === target.id ? 'confirm-action' : ''} onClick={() => onTargetOpportunity(target.id)}>{target.sourceLabel}</button>)}</div></>}
    {operation === 'equip-from-backpack' && <><h3>明确装备槽</h3><div className="preview-controls">{(['weapon', 'armor', 'utility'] as const).map((slot) => <button key={slot} type="button" className={targetEquipmentSlot === slot ? 'confirm-action' : ''} onClick={() => onTargetEquipmentSlot(slot)}>{slot === 'weapon' ? '武器位' : slot === 'armor' ? '防具位' : '实用装备位'}</button>)}</div></>}
    {operation === 'swap-backpack-equipped' && <><h3>明确被替换装备</h3><div className="preview-controls">{equipmentTargets.map((target) => <button key={target.id} type="button" className={targetOpportunityId === target.id ? 'confirm-action' : ''} onClick={() => onTargetOpportunity(target.id)}>{target.sourceLabel}</button>)}</div><p>下方选择的是被替换装备放回背包的位置。</p></>}
    {(operation === 'backpack-to-quick-slot' || operation === 'move-quick-slot-item' || operation === 'swap-quick-slot-items') && <><h3>明确目标快捷栏</h3><div className="preview-controls">{loadout.quickSlots.map((slot, index) => <button key={index} type="button" className={targetQuickSlotIndex === index ? 'confirm-action' : ''} onClick={() => onTargetQuickSlotIndex(index)}>快捷栏{index + 1} · {slot?.name ?? '空'}</button>)}</div></>}
    {needsPlacement && <>{opportunity.canRotate && <label><input aria-label="旋转中枢整备物品" type="checkbox" checked={rotated} onChange={(event) => onRotate(event.target.checked)} />旋转</label>}<p>目标格：{x === null || y === null ? '尚未选择' : `${x + 1}, ${y + 1}`}</p><BackpackGrid grid={loadout.backpackGrid} candidateCells={preview?.candidateCells} onAnchor={onAnchor} /></>}
    {preview?.canExecute ? <dl className="preview-facts">{preview.facts.map((fact) => <div key={fact.label}><dt>{fact.label}</dt><dd>{fact.value}</dd></div>)}</dl> : <p className="preview-warning">{operation === null ? '请明确选择一项整备操作。' : preview?.rejection ?? '请完整选择数量、目标槽位或背包位置。'}</p>}
    <div className="preview-controls"><button type="button" onClick={onCancel}>取消</button><button type="button" className="confirm-action" disabled={!preview?.canExecute} onClick={onConfirm}>确认整备</button></div>
  </section></div>
}

function HubLoadoutResultDialog({ result, onClose }: Readonly<{ result: HubLoadoutResultViewModel; onClose(): void }>) {
  return <div className="preview-backdrop" role="presentation"><section className="preview-dialog" role="dialog" aria-modal="true" aria-labelledby="hub-loadout-result-title">
    <h2 id="hub-loadout-result-title">中枢整备结果</h2><p><strong>{result.action}</strong></p>
    <dl className="preview-facts"><div><dt>物品</dt><dd>{result.itemName}</dd></div><div><dt>来源</dt><dd>{result.source}</dd></div><div><dt>目标</dt><dd>{result.target}</dd></div><div><dt>转移数量</dt><dd>{result.quantityMoved}</dd></div><div><dt>来源数量</dt><dd>{result.sourceQuantityBefore} → {result.sourceQuantityAfter}</dd></div>{result.targetQuantityBefore !== null && result.targetQuantityAfter !== null && <div><dt>目标数量</dt><dd>{result.targetQuantityBefore} → {result.targetQuantityAfter}</dd></div>}{result.displacedItemName && <div><dt>被替换／交换物品</dt><dd>{result.displacedItemName}</dd></div>}{result.displacedPath && <div><dt>被替换／交换路径</dt><dd>{result.displacedPath}</dd></div>}<div><dt>背包负重</dt><dd>{result.backpackWeightBefore} → {result.backpackWeightAfter}</dd></div><div><dt>负重状态</dt><dd>{loadTierName(result.loadTierBefore)} → {loadTierName(result.loadTierAfter)}</dd></div><div><dt>场景时间</dt><dd>0（不消耗）</dd></div>{result.resourceCurrent !== null && <div><dt>资源保持</dt><dd>{result.resourceCurrent}</dd></div>}</dl>
    <div className="preview-controls"><button type="button" onClick={onClose}>关闭结果</button></div>
  </section></div>
}

function ReturnSummaryDialog({ summary, onClose }: Readonly<{ summary: ReturnSummaryViewModel; onClose(): void }>) {
  const kind = summary.returnKind === 'safe' ? '安全' : '强制'
  return <div className="preview-backdrop" role="presentation"><section className="preview-dialog" role="dialog" aria-modal="true" aria-labelledby="return-summary-title">
    <h2 id="return-summary-title">返回摘要</h2><p>返回类型：<strong>{kind}</strong></p><p>剩余生命：<strong>{summary.remainingHealth}</strong></p><h3>带回普通／权限物品</h3><ItemList items={summary.warehouseItems} empty="无" /><h3>带回任务物品</h3><ItemList items={summary.taskItems} empty="无" />{summary.lostTaskItemCount > 0 && <p>遗失任务物品：{summary.lostTaskItemCount}</p>}<div className="preview-controls"><button type="button" onClick={onClose}>关闭摘要</button></div>
  </section></div>
}

function CombatActionResultDialog({
  result,
  onClose,
}: Readonly<{ result: CombatActionResultViewModel; onClose(): void }>) {
  const outcome = result.outcome === 'continue'
    ? '战斗继续'
    : result.outcome === 'victory'
      ? '胜利'
      : result.outcome === 'escaped'
        ? '成功逃跑'
        : result.outcome === 'forced-returned'
          ? '战斗结束并强制返程'
          : '战败'
  return <div className="preview-backdrop" role="presentation"><section className="preview-dialog" role="dialog" aria-modal="true" aria-labelledby="combat-result-title">
    <h2 id="combat-result-title">战斗行动结果</h2>
    <dl className="preview-facts">
      <div><dt>玩家行动</dt><dd>{result.playerAction}</dd></div>
      <div><dt>生命</dt><dd>{result.playerHealthBefore} → {result.playerHealthAfter}</dd></div>
      <div><dt>已发生敌人行动</dt><dd>{result.enemyActionsResolved}</dd></div>
      <div><dt>敌人相对生命</dt><dd>{enemyHealthStageName(result.enemyHealthStage)}</dd></div>
      <div><dt>结果</dt><dd>{outcome}</dd></div>
      {result.weaponResourceChange && <div><dt>武器资源</dt><dd>{result.weaponResourceChange}</dd></div>}
      {result.armorResourceChange && <div><dt>防具资源</dt><dd>{result.armorResourceChange}</dd></div>}
      {result.consumedQuickSlotCount > 0 && <div><dt>快捷物品消费</dt><dd>{result.consumedQuickSlotCount}</dd></div>}
      {result.infectionExposuresAdded > 0 && <div><dt>新增感染暴露</dt><dd>{result.infectionExposuresAdded}</dd></div>}
      {result.sceneTimeCost !== null && <div><dt>实际 Scene 时间结算</dt><dd>{result.sceneTimeCost}</dd></div>}
    </dl>
    {result.newWounds.length > 0 && <p>新增伤口：{result.newWounds.join('、')}</p>}
    {result.treatedWounds.length > 0 && <p>已处理伤口：{result.treatedWounds.join('、')}</p>}
    {result.bleedingChanged && <p>流血状态：{result.bleedingChanged === 'started' ? '开始流血' : '已止血'}</p>}
    <div className="preview-controls"><button type="button" onClick={onClose}>关闭结果</button></div>
  </section></div>
}

function TaskEventResultDialog({
  result,
  onClose,
}: Readonly<{ result: TaskEventResultViewModel; onClose(): void }>) {
  return <div className="preview-backdrop" role="presentation"><section className="preview-dialog" role="dialog" aria-modal="true" aria-labelledby="task-event-result-title">
    <h2 id="task-event-result-title">任务事件结果</h2>
    <dl className="preview-facts">
      <div><dt>处理方式</dt><dd>{result.action}</dd></div>
      <div><dt>样本箱</dt><dd>{result.taskItemName ? `${result.taskItemName} ×${result.taskItemQuantity} 已进入背包` : '本次未取得'}</dd></div>
      <div><dt>事件状态</dt><dd>{result.eventCompleted ? '提取已完成' : '仍可稍后重新选择'}</dd></div>
      <div><dt>实际新增感染暴露</dt><dd>{result.infectionExposuresAdded > 0 ? `+${result.infectionExposuresAdded}` : '0'}</dd></div>
      {result.armorResourceChange && <div><dt>外套完整度</dt><dd>{result.armorResourceChange}</dd></div>}
      <div><dt>样本来源情报</dt><dd>{result.originIntelRecorded ? '已记录' : '无新增'}</dd></div>
      <div><dt>Scene 时间</dt><dd>{result.remainingTimeBefore} → {result.remainingTimeAfter}</dd></div>
      <div><dt>背包负重</dt><dd>{result.backpackWeightBefore} → {result.backpackWeightAfter}</dd></div>
      <div><dt>当前 Scene 状态</dt><dd>{result.sceneStatus}</dd></div>
      <div><dt>安全入库</dt><dd>否；仍需安全返回并显式结算</dd></div>
    </dl>
    {result.sceneStatus === 'dead' && <p className="preview-warning">玩家已经死亡，样本箱不会安全入库。</p>}
    {result.sceneStatus === 'forced-returned' && <p className="preview-warning">已进入强制返程终局；下一步需显式完成返程结算。</p>}
    <div className="preview-controls"><button type="button" onClick={onClose}>关闭结果</button></div>
  </section></div>
}

function SceneMedicalResultDialog({
  result,
  onClose,
}: Readonly<{ result: SceneMedicalResultViewModel; onClose(): void }>) {
  return <div className="preview-backdrop" role="presentation"><section className="preview-dialog" role="dialog" aria-modal="true" aria-labelledby="scene-medical-result-title">
    <h2 id="scene-medical-result-title">场景医疗结果</h2>
    <dl className="preview-facts">
      <div><dt>行动</dt><dd>{result.action}</dd></div>
      <div><dt>来源</dt><dd>{result.source}</dd></div>
      <div><dt>消耗</dt><dd>{result.itemConsumed}</dd></div>
      <div><dt>生命（主要效果）</dt><dd>{result.healthBefore} → {result.healthAfterPrimaryEffect}</dd></div>
      <div><dt>实际恢复</dt><dd>{result.actualHealthRecovery}</dd></div>
      <div><dt>最终生命</dt><dd>{result.finalHealth}</dd></div>
      <div><dt>行动后流血损失</dt><dd>{result.postActionBleedingDamage}</dd></div>
      <div><dt>Scene 时间</dt><dd>{result.remainingTimeBefore} → {result.remainingTimeAfter}</dd></div>
      <div><dt>完成节点</dt><dd>{result.completionNodeName}</dd></div>
      <div><dt>当前节点</dt><dd>{result.finalNodeName}</dd></div>
      {result.returnEstimateAfterAction !== null && <div><dt>行动后预计返程</dt><dd>{result.returnEstimateAfterAction}</dd></div>}
      <div><dt>当前 Scene 状态</dt><dd>{result.sceneStatus}</dd></div>
      {result.forcedReturnDamage > 0 && <div><dt>强制返程总损耗</dt><dd>{result.forcedReturnDamage}</dd></div>}
      {result.infectionExposureBefore !== result.infectionExposureAfter && <div><dt>未结算感染暴露</dt><dd>{result.infectionExposureBefore} → {result.infectionExposureAfter}</dd></div>}
      {result.disinfectantUsesBefore !== result.disinfectantUsesAfter && <div><dt>今日消毒剂</dt><dd>{result.disinfectantUsesBefore} → {result.disinfectantUsesAfter}</dd></div>}
    </dl>
    {result.bleedingStopped && <p>流血：已停止</p>}
    {result.woundTreated && <p>已处理：{result.woundTreated}</p>}
    {result.woundRemoved && <p>已移除：{result.woundRemoved}</p>}
    {result.minorContusionRemoved && <p>已移除：轻度挫伤</p>}
    {result.painkillerActivated && <p>镇痛已生效</p>}
    {result.nextStep === 'continue-exploration' && <p>本次医疗完成后可继续探索。</p>}
    {result.sceneStatus === 'safe-returned' && <p className="preview-warning">当前为 safe-returned Scene Session；下一步需要显式完成返程结算。</p>}
    {result.sceneStatus === 'forced-returned' && <p className="preview-warning">当前为 forced-returned Scene Session；下一步需要显式完成返程结算。</p>}
    {result.sceneStatus === 'dead' && <p className="preview-warning">当前为 dead Scene Session；下一步需要显式结算战败。</p>}
    <div className="preview-controls"><button type="button" onClick={onClose}>关闭结果</button></div>
  </section></div>
}

function SceneBatteryResultDialog({
  result,
  onClose,
}: Readonly<{ result: SceneBatteryResultViewModel; onClose(): void }>) {
  const resource = result.resourceKind === 'charge'
    ? '电量'
    : result.resourceKind === 'durability'
      ? '耐久'
      : '完整度'
  return <div className="preview-backdrop" role="presentation"><section className="preview-dialog" role="dialog" aria-modal="true" aria-labelledby="scene-battery-result-title">
    <h2 id="scene-battery-result-title">场景充能结果</h2>
    <dl className="preview-facts">
      <div><dt>行动</dt><dd>{result.action}</dd></div>
      <div><dt>来源</dt><dd>{result.source}</dd></div>
      <div><dt>目标</dt><dd>{result.target}</dd></div>
      <div><dt>电池数量</dt><dd>{result.quantityBefore} → {result.quantityAfter}</dd></div>
      <div><dt>{resource}</dt><dd>{result.resourceBefore} → {result.resourceAfter}</dd></div>
      <div><dt>实际恢复</dt><dd>{result.actualRecovery}</dd></div>
      <div><dt>未使用恢复量</dt><dd>{result.unusedRecovery}</dd></div>
      <div><dt>Scene 时间</dt><dd>{result.remainingTimeBefore} → {result.remainingTimeAfter}</dd></div>
      <div><dt>行动后流血损失</dt><dd>{result.postActionBleedingDamage}</dd></div>
      <div><dt>最终生命</dt><dd>{result.finalHealth}</dd></div>
      <div><dt>完成节点</dt><dd>{result.completionNodeName}</dd></div>
      <div><dt>当前节点</dt><dd>{result.finalNodeName}</dd></div>
      {result.returnEstimateAfterAction !== null && <div><dt>行动后预计返程</dt><dd>{result.returnEstimateAfterAction}</dd></div>}
      {result.forcedReturnDamage > 0 && <div><dt>强制返程总损耗</dt><dd>{result.forcedReturnDamage}</dd></div>}
      <div><dt>当前 Scene 状态</dt><dd>{result.sceneStatus}</dd></div>
    </dl>
    {result.nextStep === 'continue-exploration' && <p>本次充能完成后可继续探索。</p>}
    {result.sceneStatus === 'safe-returned' && <p className="preview-warning">当前为 safe-returned Scene Session；下一步需要显式完成返程结算。</p>}
    {result.sceneStatus === 'forced-returned' && <p className="preview-warning">当前为 forced-returned Scene Session；下一步需要显式完成返程结算。</p>}
    {result.sceneStatus === 'dead' && <p className="preview-warning">当前为 dead Scene Session；下一步需要显式结算战败。</p>}
    <div className="preview-controls"><button type="button" onClick={onClose}>关闭结果</button></div>
  </section></div>
}

function hubSourceLabel(source: HubMedicalResultViewModel['source']): string {
  return source.container === 'warehouse'
    ? `仓库条目 ${source.ordinal}`
    : source.container === 'backpack'
      ? `背包格 ${source.column},${source.row}`
      : `快捷栏${source.slotNumber}`
}

function hubMedicalItemLabel(item: HubMedicalResultViewModel['medicalItem']): string {
  return item === 'bandage' ? '绷带' : item === 'painkiller' ? '止痛药' : item === 'disinfectant' ? '消毒剂' : '急救包'
}

function HubMedicalResultDialog({ result, onClose }: Readonly<{
  result: HubMedicalResultViewModel
  onClose(): void
}>) {
  return <div className="preview-backdrop" role="presentation"><section className="preview-dialog" role="dialog" aria-modal="true" aria-labelledby="hub-medical-result-title">
    <h2 id="hub-medical-result-title">中枢医疗结果</h2>
    <p><strong>{result.action}</strong></p>
    <dl className="preview-facts">
      <div><dt>物品</dt><dd>{hubMedicalItemLabel(result.medicalItem)}</dd></div>
      <div><dt>来源</dt><dd>{hubSourceLabel(result.source)}</dd></div>
      <div><dt>来源数量</dt><dd>{result.sourceQuantityBefore} → {result.sourceQuantityAfter}</dd></div>
      <div><dt>生命</dt><dd>{result.healthBefore} → {result.healthAfter}</dd></div>
      <div><dt>流血</dt><dd>{result.bleedingBefore ? '是' : '否'} → {result.bleedingAfter ? '是' : '否'}</dd></div>
      <div><dt>轻度挫伤</dt><dd>{result.minorContusionsBefore} → {result.minorContusionsAfter}</dd></div>
      <div><dt>镇痛</dt><dd>{result.painkillerBefore ? '生效' : '无'} → {result.painkillerAfter ? '生效' : '无'}</dd></div>
      <div><dt>未结算感染暴露</dt><dd>{result.infectionExposuresBefore} → {result.infectionExposuresAfter}</dd></div>
      <div><dt>当日消毒剂使用</dt><dd>{result.disinfectantUsesBefore} → {result.disinfectantUsesAfter}</dd></div>
      <div><dt>中枢场景时间</dt><dd>0</dd></div>
    </dl>
    <div className="preview-controls"><button type="button" onClick={onClose}>关闭结果</button></div>
  </section></div>
}

function HubSurvivalResultDialog({ result, onClose }: Readonly<{
  result: HubSurvivalResultViewModel
  onClose(): void
}>) {
  const ration = result.action === 'use-hub-ration'
  return <div className="preview-backdrop" role="presentation"><section className="preview-dialog" role="dialog" aria-modal="true" aria-labelledby="hub-survival-result-title">
    <h2 id="hub-survival-result-title">中枢生存补给结果</h2>
    <p><strong>{result.actionLabel}</strong></p>
    <dl className="preview-facts">
      <div><dt>来源</dt><dd>{hubSourceLabel(result.source)}</dd></div>
      <div><dt>来源数量</dt><dd>{result.sourceQuantityBefore} → {result.sourceQuantityAfter}</dd></div>
      {ration
        ? <><div><dt>饱食</dt><dd>{result.satietyBefore} → {result.satietyAfter}</dd></div><div><dt>实际恢复饱食</dt><dd>{result.satietyRestored}</dd></div></>
        : <><div><dt>当日抑制剂使用</dt><dd>{result.suppressionUsesBefore} → {result.suppressionUsesAfter}</dd></div><div><dt>当日威胁抑制量</dt><dd>{result.suppressionAmountBefore} → {result.suppressionAmountAfter}</dd></div><div><dt>未结算感染暴露</dt><dd>{result.infectionExposuresBefore} → {result.infectionExposuresAfter}</dd></div></>}
      <div><dt>中枢场景时间</dt><dd>0</dd></div>
    </dl>
    {!ration && <p className="preview-warning">抑制剂将在每日结算时减少当日感染增加；现有感染进展未被本次操作立即降低，暴露也未被清除。</p>}
    <div className="preview-controls"><button type="button" onClick={onClose}>关闭结果</button></div>
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
      {preview.branches.map((branch) => <section key={branch.title} className="preview-branch">
        <h3>{branch.title}</h3>
        <dl className="preview-facts">{branch.facts.map((fact) => <div key={fact.label}>
          <dt>{fact.label}</dt><dd>{fact.value}</dd>
        </div>)}</dl>
        {branch.warnings.length > 0 && <ul className="preview-warnings">
          {branch.warnings.map((warning) => <li key={warning}>{warning}</li>)}
        </ul>}
      </section>)}
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
  const [pendingTaskEventId, setPendingTaskEventId] = useState<string | null>(null)
  const [pendingInventoryId, setPendingInventoryId] = useState<string | null>(null)
  const [pendingHubLoadoutId, setPendingHubLoadoutId] = useState<string | null>(null)
  const [pickupQuantity, setPickupQuantity] = useState(1)
  const [pickupX, setPickupX] = useState(0)
  const [pickupY, setPickupY] = useState(0)
  const [pickupRotated, setPickupRotated] = useState(false)
  const [taskEventX, setTaskEventX] = useState<number | null>(null)
  const [taskEventY, setTaskEventY] = useState<number | null>(null)
  const [taskEventRotated, setTaskEventRotated] = useState(false)
  const [inventoryOperation, setInventoryOperation] = useState<StableRunUiInventoryOperation | null>(null)
  const [inventoryQuantity, setInventoryQuantity] = useState<number | null>(null)
  const [inventoryTargetId, setInventoryTargetId] = useState<string | null>(null)
  const [inventoryTargetSlot, setInventoryTargetSlot] = useState<number | null>(null)
  const [inventoryX, setInventoryX] = useState<number | null>(null)
  const [inventoryY, setInventoryY] = useState<number | null>(null)
  const [inventoryRotated, setInventoryRotated] = useState(false)
  const [hubLoadoutOperation, setHubLoadoutOperation] = useState<StableRunUiHubLoadoutOperation | null>(null)
  const [hubLoadoutQuantity, setHubLoadoutQuantity] = useState<number | null>(null)
  const [hubLoadoutTargetId, setHubLoadoutTargetId] = useState<string | null>(null)
  const [hubLoadoutEquipmentSlot, setHubLoadoutEquipmentSlot] = useState<'weapon' | 'armor' | 'utility' | null>(null)
  const [hubLoadoutQuickSlot, setHubLoadoutQuickSlot] = useState<number | null>(null)
  const [hubLoadoutX, setHubLoadoutX] = useState<number | null>(null)
  const [hubLoadoutY, setHubLoadoutY] = useState<number | null>(null)
  const [hubLoadoutRotated, setHubLoadoutRotated] = useState(false)
  const [returnSummary, setReturnSummary] = useState<ReturnSummaryViewModel | null>(null)
  const [combatActionResult, setCombatActionResult] = useState<CombatActionResultViewModel | null>(null)
  const [taskEventResult, setTaskEventResult] = useState<TaskEventResultViewModel | null>(null)
  const [sceneMedicalResult, setSceneMedicalResult] = useState<SceneMedicalResultViewModel | null>(null)
  const [sceneBatteryResult, setSceneBatteryResult] = useState<SceneBatteryResultViewModel | null>(null)
  const [sceneInventoryResult, setSceneInventoryResult] = useState<SceneInventoryResultViewModel | null>(null)
  const [hubLoadoutResult, setHubLoadoutResult] = useState<HubLoadoutResultViewModel | null>(null)
  const [hubMedicalResult, setHubMedicalResult] = useState<HubMedicalResultViewModel | null>(null)
  const [hubSurvivalResult, setHubSurvivalResult] = useState<HubSurvivalResultViewModel | null>(null)
  const [persistenceFeedback, setPersistenceFeedback] = useState<string | null>(null)
  const pendingAction = interaction.actions.find(({ id }) => id === pendingActionId) ?? null
  const pendingPickup = interaction.pickupOpportunities.find(({ id }) => id === pendingPickupId) ?? null
  const pendingTaskEvent = interaction.taskEventOpportunities.find(({ id }) => id === pendingTaskEventId) ?? null
  const pendingInventory = interaction.inventoryOpportunities.find(({ id }) => id === pendingInventoryId) ?? null
  const pendingHubLoadout = interaction.hubLoadoutOpportunities.find(({ id }) => id === pendingHubLoadoutId) ?? null
  const pickupPreview = pendingPickup === null ? null : previewStableRunUiPickupDraft(snapshot.phase, {
    opportunityId: pendingPickup.id,
    quantity: pickupQuantity,
    x: pickupX,
    y: pickupY,
    rotated: pickupRotated,
  }, presentationDependencies)
  const taskEventPreview = pendingTaskEvent === null || taskEventX === null || taskEventY === null ? null : previewStableRunUiTaskEventDraft(snapshot.phase, {
    opportunityId: pendingTaskEvent.id,
    x: taskEventX,
    y: taskEventY,
    rotated: taskEventRotated,
  }, presentationDependencies)
  const inventoryPreview = pendingInventory === null || inventoryOperation === null
    ? null
    : previewStableRunUiSceneInventoryDraft(snapshot.phase, {
        opportunityId: pendingInventory.id,
        operation: inventoryOperation,
        quantity: inventoryQuantity,
        targetOpportunityId: inventoryTargetId,
        targetSlotIndex: inventoryTargetSlot,
        x: inventoryX,
        y: inventoryY,
        rotated: inventoryRotated,
      }, presentationDependencies)
  const hubLoadoutPreview = pendingHubLoadout === null || hubLoadoutOperation === null
    ? null
    : previewStableRunUiHubLoadoutDraft(snapshot.phase, {
        opportunityId: pendingHubLoadout.id,
        operation: hubLoadoutOperation,
        quantity: hubLoadoutQuantity,
        targetOpportunityId: hubLoadoutTargetId,
        targetEquipmentSlot: hubLoadoutEquipmentSlot,
        targetQuickSlotIndex: hubLoadoutQuickSlot,
        x: hubLoadoutX,
        y: hubLoadoutY,
        rotated: hubLoadoutRotated,
      }, presentationDependencies)

  useEffect(() => {
    if (pendingActionId !== null && pendingAction === null) setPendingActionId(null)
  }, [pendingAction, pendingActionId])

  useEffect(() => {
    if (pendingPickupId !== null && pendingPickup === null) setPendingPickupId(null)
  }, [pendingPickup, pendingPickupId])

  useEffect(() => {
    if (pendingTaskEventId !== null && pendingTaskEvent === null) setPendingTaskEventId(null)
  }, [pendingTaskEvent, pendingTaskEventId])

  useEffect(() => {
    if (pendingInventoryId !== null && pendingInventory === null) setPendingInventoryId(null)
  }, [pendingInventory, pendingInventoryId])

  useEffect(() => {
    if (pendingHubLoadoutId !== null && pendingHubLoadout === null) setPendingHubLoadoutId(null)
  }, [pendingHubLoadout, pendingHubLoadoutId])

  const confirm = () => {
    if (!pendingAction) return
    const beforePhase = snapshot.phase
    const hubCarePreview = pendingAction.kind === 'hub-medical' || pendingAction.kind === 'hub-survival'
      ? previewStableRunUiHubCareCommand(
          beforePhase,
          pendingAction.command,
          presentationDependencies,
        )
      : null
    if ((pendingAction.kind === 'hub-medical' || pendingAction.kind === 'hub-survival') && !hubCarePreview) {
      setPendingActionId(null)
      return
    }
    const execution = store.dispatch(pendingAction.command)
    setPendingActionId(null)
    setPersistenceFeedback(execution.kind === 'executed'
      ? '✓ 操作已执行并保存'
      : '⚠ 保存失败：本次操作已在当前会话中生效，请勿刷新页面。')
    if (
      pendingAction.kind === 'scene-combat-action' &&
      beforePhase.kind === 'scene-session' &&
      execution.phase.kind === 'scene-session'
    ) {
      setCombatActionResult(createCombatActionResultViewModel(
        beforePhase,
        execution.phase,
        pendingAction.label,
        execution.result,
        presentationDependencies,
      ))
    }
    if (
      pendingAction.kind === 'scene-task-event' &&
      beforePhase.kind === 'scene-session' &&
      execution.phase.kind === 'scene-session'
    ) {
      setTaskEventResult(createTaskEventResultViewModel(
        beforePhase,
        execution.phase,
        pendingAction.label,
        presentationDependencies,
      ))
    }
    if (
      pendingAction.kind === 'scene-medical' &&
      beforePhase.kind === 'scene-session' &&
      execution.phase.kind === 'scene-session'
    ) {
      setSceneMedicalResult(createSceneMedicalResultViewModel(
        beforePhase,
        execution.phase,
        pendingAction.label,
        execution.result,
        presentationDependencies,
      ))
    }
    if (
      pendingAction.kind === 'scene-battery' &&
      beforePhase.kind === 'scene-session' &&
      execution.phase.kind === 'scene-session'
    ) {
      setSceneBatteryResult(createSceneBatteryResultViewModel(
        beforePhase,
        execution.phase,
        pendingAction.label,
        execution.result,
        presentationDependencies,
      ))
    }
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
    if (
      pendingAction.kind === 'hub-medical' &&
      hubCarePreview?.kind === 'hub-medical' &&
      execution.phase.kind === 'current-day-hub'
    ) {
      setHubMedicalResult(createHubMedicalResultViewModel(
        beforePhase,
        execution.phase,
        pendingAction.label,
        hubCarePreview.result,
      ))
    }
    if (
      pendingAction.kind === 'hub-survival' &&
      hubCarePreview?.kind === 'hub-survival' &&
      execution.phase.kind === 'current-day-hub'
    ) {
      setHubSurvivalResult(createHubSurvivalResultViewModel(
        beforePhase,
        execution.phase,
        pendingAction.label,
        hubCarePreview.result,
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
  const openTaskEvent = (opportunityId: string) => {
    const opportunity = interaction.taskEventOpportunities.find(({ id }) => id === opportunityId)
    if (!opportunity) return
    setPendingActionId(null)
    setPendingPickupId(null)
    setTaskEventX(null)
    setTaskEventY(null)
    setTaskEventRotated(false)
    setPendingTaskEventId(opportunityId)
  }
  const confirmTaskEvent = () => {
    if (!taskEventPreview?.canExecute || taskEventPreview.command === null || !pendingTaskEvent) return
    const beforePhase = snapshot.phase
    const execution = store.dispatch(taskEventPreview.command)
    setPendingTaskEventId(null)
    setPersistenceFeedback(execution.kind === 'executed'
      ? '✓ 操作已执行并保存'
      : '⚠ 保存失败：本次操作已在当前会话中生效，请勿刷新页面。')
    if (beforePhase.kind === 'scene-session' && execution.phase.kind === 'scene-session') {
      setTaskEventResult(createTaskEventResultViewModel(
        beforePhase,
        execution.phase,
        pendingTaskEvent.label,
        presentationDependencies,
      ))
    }
  }
  const openInventory = (opportunityId: string) => {
    const opportunity = interaction.inventoryOpportunities.find(({ id }) => id === opportunityId)
    if (!opportunity) return
    setPendingActionId(null)
    setPendingPickupId(null)
    setPendingTaskEventId(null)
    setInventoryOperation(null)
    setInventoryQuantity(null)
    setInventoryTargetId(null)
    setInventoryTargetSlot(null)
    setInventoryX(null)
    setInventoryY(null)
    setInventoryRotated(false)
    setPendingInventoryId(opportunityId)
  }
  const selectInventoryOperation = (operation: StableRunUiInventoryOperation) => {
    setInventoryOperation(operation)
    setInventoryQuantity(null)
    setInventoryTargetId(null)
    setInventoryTargetSlot(null)
    setInventoryX(null)
    setInventoryY(null)
    setInventoryRotated(false)
  }
  const confirmInventory = () => {
    if (
      !inventoryPreview?.canExecute ||
      inventoryPreview.command === null ||
      !pendingInventory ||
      inventoryOperation === null
    ) return
    const beforePhase = snapshot.phase
    const action = `${inventoryOperationLabel(inventoryOperation)} · ${pendingInventory.sourceLabel}`
    const execution = store.dispatch(inventoryPreview.command)
    setPendingInventoryId(null)
    setPersistenceFeedback(execution.kind === 'executed'
      ? '✓ 操作已执行并保存'
      : '⚠ 保存失败：本次操作已在当前会话中生效，请勿刷新页面。')
    if (beforePhase.kind === 'scene-session' && execution.phase.kind === 'scene-session') {
      setSceneInventoryResult(createSceneInventoryResultViewModel(
        beforePhase,
        execution.phase,
        action,
        execution.result,
        presentationDependencies,
      ))
    }
  }
  const openHubLoadout = (opportunityId: string) => {
    const opportunity = interaction.hubLoadoutOpportunities.find(({ id }) => id === opportunityId)
    if (!opportunity) return
    setPendingActionId(null)
    setHubLoadoutOperation(null)
    setHubLoadoutQuantity(null)
    setHubLoadoutTargetId(null)
    setHubLoadoutEquipmentSlot(null)
    setHubLoadoutQuickSlot(null)
    setHubLoadoutX(null)
    setHubLoadoutY(null)
    setHubLoadoutRotated(false)
    setPendingHubLoadoutId(opportunityId)
  }
  const selectHubLoadoutOperation = (operation: StableRunUiHubLoadoutOperation) => {
    setHubLoadoutOperation(operation)
    setHubLoadoutQuantity(null)
    setHubLoadoutTargetId(null)
    setHubLoadoutEquipmentSlot(null)
    setHubLoadoutQuickSlot(null)
    setHubLoadoutX(null)
    setHubLoadoutY(null)
    setHubLoadoutRotated(false)
  }
  const confirmHubLoadout = () => {
    if (!hubLoadoutPreview?.canExecute || !hubLoadoutPreview.command || !hubLoadoutPreview.safeResult || !pendingHubLoadout || !hubLoadoutOperation) return
    const action = `${hubLoadoutOperationLabel(hubLoadoutOperation)} · ${pendingHubLoadout.sourceLabel}`
    const safeResult = hubLoadoutPreview.safeResult
    const execution = store.dispatch(hubLoadoutPreview.command)
    setPendingHubLoadoutId(null)
    setPersistenceFeedback(execution.kind === 'executed' ? '✓ 操作已执行并保存' : '⚠ 保存失败：本次操作已在当前会话中生效，请勿刷新页面。')
    if (execution.phase.kind === 'current-day-hub') setHubLoadoutResult(createHubLoadoutResultViewModel(execution.phase, action, safeResult, presentationDependencies))
  }
  return <>
    {persistenceFeedback && <p className="persistence-feedback" role="status">{persistenceFeedback}</p>}
    {model.kind === 'current-day-hub' && <HubView model={model} actions={interaction.actions} onPreview={setPendingActionId} loadoutOpportunities={interaction.hubLoadoutOpportunities} onLoadout={openHubLoadout} />}
    {model.kind === 'scene-session' && <SceneView model={model} actions={interaction.actions} onPreview={setPendingActionId} pickupOpportunities={interaction.pickupOpportunities} onPickup={openPickup} taskEventOpportunities={interaction.taskEventOpportunities} onTaskEvent={openTaskEvent} inventoryOpportunities={interaction.inventoryOpportunities} onInventory={openInventory} />}
    {model.kind === 'run-failure' && <FailureView model={model} />}
    {pendingAction && <ActionPreviewDialog
      preview={pendingAction.preview}
      onCancel={() => setPendingActionId(null)}
      onConfirm={confirm}
    />}
    {pendingPickup && model.kind === 'scene-session' && <PickupDialog opportunity={pendingPickup} loadout={model.scene.loadout} preview={pickupPreview} quantity={pickupQuantity} x={pickupX} y={pickupY} rotated={pickupRotated} onQuantity={setPickupQuantity} onRotate={setPickupRotated} onAnchor={(x, y) => { setPickupX(x); setPickupY(y) }} onCancel={() => setPendingPickupId(null)} onConfirm={confirmPickup} />}
    {pendingTaskEvent && model.kind === 'scene-session' && <TaskEventDialog opportunity={pendingTaskEvent} loadout={model.scene.loadout} preview={taskEventPreview} x={taskEventX} y={taskEventY} rotated={taskEventRotated} onRotate={setTaskEventRotated} onAnchor={(x, y) => { setTaskEventX(x); setTaskEventY(y) }} onCancel={() => setPendingTaskEventId(null)} onConfirm={confirmTaskEvent} />}
    {pendingInventory && model.kind === 'scene-session' && <SceneInventoryDialog opportunity={pendingInventory} opportunities={interaction.inventoryOpportunities} loadout={model.scene.loadout} operation={inventoryOperation} quantity={inventoryQuantity} targetOpportunityId={inventoryTargetId} targetSlotIndex={inventoryTargetSlot} x={inventoryX} y={inventoryY} rotated={inventoryRotated} preview={inventoryPreview} onOperation={selectInventoryOperation} onQuantity={setInventoryQuantity} onTargetOpportunity={setInventoryTargetId} onTargetSlot={setInventoryTargetSlot} onAnchor={(x, y) => { setInventoryX(x); setInventoryY(y) }} onRotate={setInventoryRotated} onCancel={() => setPendingInventoryId(null)} onConfirm={confirmInventory} />}
    {pendingHubLoadout && model.kind === 'current-day-hub' && <HubLoadoutDialog opportunity={pendingHubLoadout} opportunities={interaction.hubLoadoutOpportunities} loadout={model.loadout} operation={hubLoadoutOperation} quantity={hubLoadoutQuantity} targetOpportunityId={hubLoadoutTargetId} targetEquipmentSlot={hubLoadoutEquipmentSlot} targetQuickSlotIndex={hubLoadoutQuickSlot} x={hubLoadoutX} y={hubLoadoutY} rotated={hubLoadoutRotated} preview={hubLoadoutPreview} onOperation={selectHubLoadoutOperation} onQuantity={setHubLoadoutQuantity} onTargetOpportunity={setHubLoadoutTargetId} onTargetEquipmentSlot={setHubLoadoutEquipmentSlot} onTargetQuickSlotIndex={setHubLoadoutQuickSlot} onAnchor={(x, y) => { setHubLoadoutX(x); setHubLoadoutY(y) }} onRotate={setHubLoadoutRotated} onCancel={() => setPendingHubLoadoutId(null)} onConfirm={confirmHubLoadout} />}
    {returnSummary && <ReturnSummaryDialog summary={returnSummary} onClose={() => setReturnSummary(null)} />}
    {combatActionResult && <CombatActionResultDialog result={combatActionResult} onClose={() => setCombatActionResult(null)} />}
    {taskEventResult && <TaskEventResultDialog result={taskEventResult} onClose={() => setTaskEventResult(null)} />}
    {sceneMedicalResult && <SceneMedicalResultDialog result={sceneMedicalResult} onClose={() => setSceneMedicalResult(null)} />}
    {sceneBatteryResult && <SceneBatteryResultDialog result={sceneBatteryResult} onClose={() => setSceneBatteryResult(null)} />}
    {sceneInventoryResult && <SceneInventoryResultDialog result={sceneInventoryResult} onClose={() => setSceneInventoryResult(null)} />}
    {hubLoadoutResult && <HubLoadoutResultDialog result={hubLoadoutResult} onClose={() => setHubLoadoutResult(null)} />}
    {hubMedicalResult && <HubMedicalResultDialog result={hubMedicalResult} onClose={() => setHubMedicalResult(null)} />}
    {hubSurvivalResult && <HubSurvivalResultDialog result={hubSurvivalResult} onClose={() => setHubSurvivalResult(null)} />}
    {import.meta.env.DEV && <DevInspector phase={snapshot.phase} />}
  </>
}
