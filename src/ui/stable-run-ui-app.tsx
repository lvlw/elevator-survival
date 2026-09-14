import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import type { StableRunStore } from '../state/run-store'
import {
  createStableRunUiInteractionModel,
  actionExecutionLevel,
  previewStableRunUiEndDay,
  previewStableRunUiHubLoadoutDraft,
  previewStableRunUiHubCareCommand,
  previewStableRunUiHubMaintenanceDraft,
  previewStableRunUiPickupDraft,
  firstFitUnrotatedNodePickup,
  previewStableRunUiSceneInventoryDraft,
  previewStableRunUiTaskEventDraft,
  createStableRunUiTaskEventDraftAction,
  type StableRunUiAction,
  type StableRunUiActionPreviewViewModel,
  type StableRunUiGhostPreview,
  type StableRunUiCombatGhostPreview,
  type StableRunUiPickupOpportunity,
  type StableRunUiInventoryOperation,
  type StableRunUiInventoryOpportunity,
  type StableRunUiTaskEventOpportunity,
  type StableRunUiHubLoadoutOperation,
  type StableRunUiHubLoadoutOpportunity,
  type StableRunUiHubMaintenanceOpportunity,
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
  createHubMaintenanceResultViewModel,
  createDailySettlementResultViewModel,
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
  type HubMaintenanceResultViewModel,
  type DailySettlementResultViewModel,
  type PresentationVisualKey,
  presentationVisualAssetUrl,
  playPresentationAudioCue,
  projectActivityFeedEntry,
  type ActivityFeedEntry,
  type ActivityFeedCategory,
  projectStableRunPresentationCues,
  uiSelectionCueForCategory,
} from './presentation'
import { useStableRunStoreSnapshot } from './run-store/use-stable-run-store-snapshot'
import { InfoCard } from './components/info-card'
import { PlayerKnownMap } from './components/player-known-map'
import { AnchoredGhostPreview, SceneTimeBudget } from './components/scene-time-budget'
import { BattleStage } from './components/battle-stage'
import { ActivityFeed } from './components/activity-feed'
import { positionFloating } from './components/floating-position'
import itemPlaceholderUrl from './assets/item-placeholder.svg'

export interface StableRunUiAppProps {
  readonly store: StableRunStore
  readonly presentationDependencies: StableRunUiPresentationDependencies
  readonly onRequestNewRunSetup?: () => void
}

/** Session-local only: the player must reconfirm if the safe preview changes. */
interface PendingTaskEventProtection {
  readonly opportunityId: string
  readonly x: number
  readonly y: number
  readonly rotated: boolean
  readonly fingerprint: string
}

function taskEventProtectionFingerprint(action: StableRunUiAction): string {
  return JSON.stringify({
    deathCertainty: action.deathCertainty,
    preview: action.preview,
  })
}

function itemResourceText(item: PlayerVisibleItemViewModel): string | null {
  return item.resource
    ? `${item.resource.label} ${item.resource.current} / ${item.resource.maximum}`
    : null
}

function sceneStatusName(
  status: Extract<StableRunPlayerViewModel, { kind: 'scene-session' }>['scene']['status'],
): string {
  return status === 'active'
    ? '探索中'
    : status === 'combat'
      ? '战斗中'
      : status === 'safe-returned'
        ? '安全返回'
        : status === 'forced-returned'
          ? '强制返程'
          : '已死亡'
}

function searchStateName(
  state: Extract<StableRunPlayerViewModel, { kind: 'scene-session' }>['scene']['currentNodeSearchState'],
): string {
  return state === 'not-available'
    ? '此处无主要搜索'
    : state === 'available-unsearched'
      ? '可以搜索'
      : '已经搜索'
}

function ResourceBar({
  label,
  current,
  maximum,
  tone,
  help,
}: Readonly<{
  label: string
  current: number
  maximum: number
  tone: 'health' | 'satiety'
  help: Readonly<{ title: string; summary: string; details?: readonly string[] }>
}>) {
  const percent = maximum === 0 ? 0 : Math.max(0, Math.min(100, (current / maximum) * 100))
  return <div className={`hud-resource hud-resource--${tone}`}>
    <div className="hud-resource__label">
      <span>{label}</span>
      <InfoCard label={`查看${label}说明`} title={help.title} summary={help.summary} details={help.details} />
      <strong>{current} / {maximum}</strong>
    </div>
    <div
      className="resource-meter"
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={maximum}
      aria-valuenow={current}
      aria-valuetext={`${current} / ${maximum}`}
    >
      <span className="resource-meter__fill" style={{ width: `${percent}%` }} />
    </div>
  </div>
}

function ConditionChips({ status }: Readonly<{ status: PlayerVisibleStatusBarViewModel }>) {
  const condition = status.condition
  const wounds = condition.untreatedOpenWounds + condition.treatedOpenWounds
  const chips = [
    { label: condition.bleeding ? '流血' : '未流血', active: condition.bleeding },
    { label: wounds > 0 ? `开放伤口 ${wounds}` : '无开放伤口', active: wounds > 0 },
    { label: `轻度挫伤 ${condition.minorContusions}`, active: condition.minorContusions > 0 },
    { label: condition.painkillerActive ? '镇痛中' : '未镇痛', active: condition.painkillerActive },
    { label: `未结算感染暴露 ${condition.pendingInfectionExposures}`, active: condition.pendingInfectionExposures > 0 },
  ]
  return <div className="condition-strip" aria-label="玩家状态">
    <span className="condition-strip__title">状态</span>
    {chips.map(({ label, active }) => <span className={`status-chip${active ? ' status-chip--active' : ''}`} key={label}>{label}</span>)}
    <InfoCard
      label="查看玩家状态说明"
      title="玩家状态"
      summary="流血、伤口、挫伤与镇痛会影响当前行动和后续结算。"
      details={['未结算感染暴露会在日结算中推动感染恶化。', '具体处理资格与结果以正式行动预览为准。']}
    />
  </div>
}

function StatusBar({ status }: Readonly<{ status: PlayerVisibleStatusBarViewModel }>) {
  return <header className="run-status-bar core-hud" aria-label="本局状态">
    <div className="hud-day"><span>当前日期</span><strong>第 {status.currentDay} 日</strong></div>
    <ResourceBar
      label="生命"
      current={status.condition.currentHealth}
      maximum={status.condition.maximumHealth}
      tone="health"
      help={{ title: '生命', summary: '生命降至0会导致本局失败。', details: ['治疗资格和恢复量以正式行动预览为准。'] }}
    />
    <ResourceBar
      label="饱食"
      current={status.satiety}
      maximum={status.maximumSatiety}
      tone="satiety"
      help={{ title: '饱食', summary: '饱食主要在每日结算中消耗。', details: ['饱食不足会降低恢复，严重不足还会损失生命。'] }}
    />
    <div className="hud-stage">
      <span>世界威胁</span>
      <span className="threat-badge">{status.worldThreatStage}</span>
      <InfoCard
        label="查看世界威胁与感染说明"
        title="世界威胁与感染"
        summary="感染暴露会在日结算中推动感染恶化，终末阶段会导致本局失败。"
        details={['消毒剂处理未结算暴露。', '感染抑制剂作用于当日感染增加。', '内部精确进展不会向普通玩家公开。']}
      />
    </div>
    <div className="hud-mission"><span>主场景</span><strong>{status.mainSceneUsedToday ? '今日已进入' : '尚未进入'}</strong></div>
    <ConditionChips status={status} />
  </header>
}

function ItemCard({ item, actionLabel, actionText = '操作', onAction, menuActions = [], iconOnly = false }: Readonly<{
  item: PlayerVisibleItemViewModel
  actionLabel?: string
  actionText?: string
  onAction?: () => void
  menuActions?: readonly Readonly<{ label: string; onClick(): void }>[]
  iconOnly?: boolean
}>) {
  const [menuOpen, setMenuOpen] = useState(false)
  const [itemAnchor, setItemAnchor] = useState<HTMLElement | null>(null)
  const contextActions = menuActions.length > 0 ? menuActions : onAction ? [{ label: actionText, onClick: onAction }] : []
  return <span className={`item-card-local${iconOnly ? ' item-card-local--icon-only' : ''}${menuOpen ? ' item-card-local--menu-open' : ''}`}
    aria-label={iconOnly ? actionLabel : undefined}
    onContextMenu={iconOnly && contextActions.length > 0 ? (event) => {
      event.preventDefault()
      setItemAnchor(event.currentTarget)
      setMenuOpen(true)
    } : undefined}
    onKeyDown={iconOnly && contextActions.length > 0 ? (event) => {
      if (event.key === 'Escape') { setMenuOpen(false); return }
      if (event.key === 'ContextMenu' || (event.shiftKey && event.key === 'F10')) {
        event.preventDefault()
        setItemAnchor(event.currentTarget)
        setMenuOpen(true)
      }
    } : undefined}>
    <InfoCard
      label={`查看${item.name}说明`}
      title={item.name}
      summary={`${item.help.role}。${item.help.summary}`}
      details={[
        ...item.help.usageHints,
        ...(item.resource ? [`当前${item.resource.label}：${item.resource.current} / ${item.resource.maximum}`] : []),
      ]}
      onActivate={!iconOnly && (onAction || menuActions.length > 0) ? (element) => {
        if (menuActions.length > 0) { setItemAnchor(element); setMenuOpen((value) => !value) }
        else onAction?.()
      } : undefined}
    ><span className="item-card-copy">
      <img className="item-card-icon" src={item.visualKey ? presentationVisualAssetUrl(item.visualKey) : itemPlaceholderUrl} alt="" aria-hidden="true" onError={(event) => { if (event.currentTarget.src !== itemPlaceholderUrl) event.currentTarget.src = itemPlaceholderUrl }} />
      {iconOnly ? item.quantity > 1 && <span className="item-card-quantity">{item.quantity}</span> : <><span><strong>{item.name}</strong> ×{item.quantity}</span>{item.resource && <em>{itemResourceText(item)}</em>}</>}
    </span></InfoCard>
    {!iconOnly && onAction && <button type="button" className="item-local-action" aria-label={actionLabel ?? `${actionText} ${item.name}`} title={actionLabel ?? `${actionText} ${item.name}`} onClick={onAction}>{actionText}</button>}
    {iconOnly && contextActions.length > 0
      ? <ItemContextMenu actions={contextActions} open={menuOpen} anchor={itemAnchor} onOpenChange={setMenuOpen} />
      : !iconOnly && menuActions.length > 0 && <ItemActionMenu itemName={item.name} actionLabel={actionLabel} actions={menuActions} open={menuOpen} anchor={itemAnchor} onOpenChange={setMenuOpen} />}
  </span>
}

function ItemContextMenu({ actions, open, anchor, onOpenChange }: Readonly<{
  actions: readonly Readonly<{ label: string; onClick(): void }>[]
  open: boolean
  anchor: HTMLElement | null
  onOpenChange(open: boolean): void
}>) {
  const panelRef = useRef<HTMLDivElement>(null)
  const [position, setPosition] = useState<Readonly<{ left: number; top: number }> | null>(null)
  useLayoutEffect(() => {
    if (!open || !anchor || !panelRef.current) return
    const panel = panelRef.current
    const update = () => setPosition(positionFloating(anchor.getBoundingClientRect(), {
      width: panel.offsetWidth, height: panel.offsetHeight,
    }, { width: window.innerWidth, height: window.innerHeight }))
    update()
    const dismiss = (event: PointerEvent) => {
      if (!panel.contains(event.target as Node) && !anchor.contains(event.target as Node)) onOpenChange(false)
    }
    const dismissKey = (event: KeyboardEvent) => { if (event.key === 'Escape') onOpenChange(false) }
    document.addEventListener('pointerdown', dismiss)
    document.addEventListener('keydown', dismissKey)
    window.addEventListener('resize', update)
    window.addEventListener('scroll', update, true)
    return () => {
      document.removeEventListener('pointerdown', dismiss)
      document.removeEventListener('keydown', dismissKey)
      window.removeEventListener('resize', update)
      window.removeEventListener('scroll', update, true)
    }
  }, [open, anchor, onOpenChange])
  return open && <div ref={panelRef} className="item-local-menu__panel item-context-menu" role="menu" style={position ?? { visibility: 'hidden' }}>
    {actions.map((action) => <button key={action.label} type="button" role="menuitem" onClick={() => { onOpenChange(false); action.onClick() }}>{action.label}</button>)}
  </div>
}

function ItemActionMenu({ itemName, actionLabel, actions, open, anchor, onOpenChange }: Readonly<{
  itemName: string
  actionLabel?: string
  actions: readonly Readonly<{ label: string; onClick(): void }>[]
  open: boolean
  anchor: HTMLElement | null
  onOpenChange(open: boolean): void
}>) {
  const detailsRef = useRef<HTMLDetailsElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const [position, setPosition] = useState<Readonly<{ left: number; top: number }> | null>(null)
  const update = () => {
    const anchorElement = anchor ?? detailsRef.current?.querySelector('summary')
    const panel = panelRef.current
    if (!anchorElement || !panel) return
    setPosition(positionFloating(anchorElement.getBoundingClientRect(), {
      width: panel.offsetWidth,
      height: panel.offsetHeight,
    }, { width: window.innerWidth, height: window.innerHeight }))
  }
  useLayoutEffect(() => {
    if (!detailsRef.current?.open) return
    update()
    window.addEventListener('resize', update)
    window.addEventListener('scroll', update, true)
    return () => {
      window.removeEventListener('resize', update)
      window.removeEventListener('scroll', update, true)
    }
  }, [open, anchor])
  return <details ref={detailsRef} open={open} className="item-local-menu" onToggle={(event) => {
    onOpenChange(event.currentTarget.open)
    if (event.currentTarget.open) update()
    else setPosition(null)
  }}><summary aria-label={actionLabel ?? `可用动作 ${itemName}`}>⋯</summary><div ref={panelRef} className="item-local-menu__panel" style={position ?? { visibility: 'hidden' }}>{actions.map((action) => <button key={action.label} type="button" onClick={() => { onOpenChange(false); action.onClick() }}>{action.label}</button>)}</div></details>
}

function ItemList({ items, empty = '无' }: Readonly<{ items: readonly PlayerVisibleItemViewModel[]; empty?: string }>) {
  if (items.length === 0) return <p className="empty-copy">{empty}</p>
  return <ul className="item-list">{items.map((item, index) => <li key={`${item.name}-${index}`}><ItemCard item={item} /></li>)}</ul>
}

function EquipmentSlot({ label, item, actionLabel, actionText, onAction, menuActions }: Readonly<{ label: string; item: PlayerVisibleItemViewModel | null; actionLabel?: string; actionText?: string; onAction?: () => void; menuActions?: readonly Readonly<{ label: string; onClick(): void }>[] }>) {
  return <article className={`carry-slot equipment-slot${item ? ' carry-slot--filled' : ''}`}>
    <span className="carry-slot__label">{label}</span>
    {item ? <ItemCard item={item} actionLabel={actionLabel} actionText={actionText} onAction={onAction} menuActions={menuActions} /> : <span className="carry-slot__empty">空装备槽</span>}
  </article>
}

function QuickSlot({ item, index, actionLabel, actionText, onAction, menuActions }: Readonly<{ item: PlayerVisibleItemViewModel | null; index: number; actionLabel?: string; actionText?: string; onAction?: () => void; menuActions?: readonly Readonly<{ label: string; onClick(): void }>[] }>) {
  return <article className={`carry-slot quick-slot${item ? ' carry-slot--filled' : ''}`}>
    <span className="carry-slot__label">快捷 {index + 1}</span>
    {item ? <ItemCard item={item} actionLabel={actionLabel} actionText={actionText} onAction={onAction} menuActions={menuActions} iconOnly /> : <span className="carry-slot__empty">空快捷位</span>}
  </article>
}

function LoadoutPanel({ loadout, opportunities = [], onLoadout, inventoryOpportunities = [], onInventory }: Readonly<{
  loadout: PlayerVisibleLoadoutViewModel
  opportunities?: readonly StableRunUiHubLoadoutOpportunity[]
  onLoadout?: (opportunityId: string, operation: StableRunUiHubLoadoutOperation) => void
  inventoryOpportunities?: readonly StableRunUiInventoryOpportunity[]
  onInventory?: (opportunityId: string, operation: StableRunUiInventoryOperation) => void
}>) {
  const [tab, setTab] = useState<'equipment' | 'backpack'>('equipment')
  const slots = [
    ['武器', 'weapon', loadout.equipment.weapon],
    ['防具', 'armor', loadout.equipment.armor],
    ['实用装备', 'utility', loadout.equipment.utility],
  ] as const
  const equipmentAction = (slot: 'weapon' | 'armor' | 'utility') => opportunities.find((entry) => entry.container === 'equipment' && entry.equipmentSlot === slot)
  const quickAction = (index: number) => opportunities.find((entry) => entry.container === 'quick-slot' && entry.quickSlotIndex === index)
  const sceneQuickAction = (index: number) => inventoryOpportunities.find((entry) => entry.container === 'quick-slot' && entry.sourceSlotIndex === index)
  const backpackAction = (x: number, y: number) => opportunities.find((entry) => entry.container === 'backpack' && entry.backpackPosition?.x === x && entry.backpackPosition.y === y)
  const sceneBackpackAction = (x: number, y: number) => inventoryOpportunities.find((entry) => entry.container === 'backpack' && entry.backpackPosition?.x === x && entry.backpackPosition.y === y)
  const hubItemActions = (opportunity: StableRunUiHubLoadoutOpportunity | undefined) => {
    if (!opportunity || !onLoadout || opportunity.operations.length === 0) return null
    const actions = opportunity.operations.map((operation) => ({ label: hubLoadoutOperationLabel(operation), onClick: () => onLoadout(opportunity.id, operation) }))
    return { label: `整备 ${opportunity.sourceLabel}`, text: actions.length === 1 ? actions[0].label : '操作', onClick: actions.length === 1 ? actions[0].onClick : undefined, menuActions: actions.length > 1 ? actions : [] }
  }
  const sceneItemActions = (opportunity: StableRunUiInventoryOpportunity | undefined) => {
    if (!opportunity || !onInventory || opportunity.operations.length === 0) return null
    const actions = opportunity.operations.map((operation) => ({ label: inventoryOperationLabel(operation), onClick: () => onInventory(opportunity.id, operation) }))
    return { label: `整理 ${opportunity.sourceLabel}`, text: actions.length === 1 ? actions[0].label : '操作', onClick: actions.length === 1 ? actions[0].onClick : undefined, menuActions: actions.length > 1 ? actions : [] }
  }
  return <section className="console-panel carry-panel" aria-labelledby="loadout-heading">
    <header className="panel-heading"><div><p className="panel-kicker">角色携带</p><h2 id="loadout-heading">装备与背包</h2></div><span className={`load-tier-badge load-tier-badge--${loadout.loadTier}`}>{loadTierName(loadout.loadTier)}</span></header>
    <div className="quick-slot-rack" aria-label="快捷栏">{loadout.quickSlots.map((item, index) => {
      const hub = quickAction(index)
      const scene = sceneQuickAction(index)
      const action = hubItemActions(hub) ?? sceneItemActions(scene)
      return <QuickSlot item={item} index={index} key={index} actionLabel={action?.label} actionText={action?.text} onAction={action?.onClick} menuActions={action?.menuActions} />
    })}</div>
    <div className="carry-weight"><span>背包负重</span><strong>{loadout.backpackWeight}</strong><span>负重状态：{loadTierName(loadout.loadTier)}</span></div>
    <div className="carry-tabs" role="tablist" aria-label="携带物视图">
      <button type="button" role="tab" aria-selected={tab === 'equipment'} onClick={() => setTab('equipment')}>装备</button>
      <button type="button" role="tab" aria-selected={tab === 'backpack'} onClick={() => setTab('backpack')}>背包</button>
    </div>
    <div className="carry-panel__details">
    {tab === 'equipment' && <div className="equipment-rack" role="tabpanel" aria-label="装备">{slots.map(([label, slot, item]) => {
      const action = equipmentAction(slot)
      const local = hubItemActions(action)
      return <EquipmentSlot key={label} label={label} item={item} actionLabel={local?.label} actionText={local?.text} onAction={local?.onClick} menuActions={local?.menuActions} />
    })}</div>}
    {tab === 'backpack' && <div className="backpack-compartment" role="tabpanel" aria-label="背包">
      <div className="section-heading"><div><span>6×4</span><h3>背包</h3></div><span>{loadout.backpack.length} 件物品</span></div>
      <BackpackGrid grid={loadout.backpackGrid} itemAction={(x, y) => {
        const hub = backpackAction(x, y)
        const scene = sceneBackpackAction(x, y)
        return hubItemActions(hub) ?? sceneItemActions(scene)
      }} />
      {loadout.backpack.length === 0 && <p className="empty-copy">背包为空</p>}
    </div>}
    </div>
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

function BackpackGrid({
  grid,
  onAnchor,
  itemAction,
  candidateCells = [],
  selectedFootprintCells = [],
  selectedAnchor = null,
  placementValid = null,
}: Readonly<{
  grid: PlayerVisibleLoadoutViewModel['backpackGrid']
  onAnchor?: (x: number, y: number) => void
  itemAction?: (x: number, y: number) => Readonly<{ label: string; text?: string; onClick?: () => void; menuActions?: readonly Readonly<{ label: string; onClick(): void }>[] }> | null
  candidateCells?: readonly Readonly<{ x: number; y: number }>[]
  selectedFootprintCells?: readonly Readonly<{ x: number; y: number }>[]
  selectedAnchor?: Readonly<{ x: number; y: number }> | null
  placementValid?: boolean | null
}>) {
  const candidate = new Set(candidateCells.map(({ x, y }) => `${x},${y}`))
  const selectedFootprint = new Set(selectedFootprintCells.map(({ x, y }) => `${x},${y}`))
  const occupiedByCell = new Map(
    grid.occupiedCells.map((cell) => [`${cell.x},${cell.y}`, cell]),
  )
  const cells = Array.from({ length: grid.width * grid.height }, (_, index) => ({
    x: index % grid.width,
    y: Math.floor(index / grid.width),
  }))
  return <div className={`backpack-grid${onAnchor ? ' backpack-grid--draft' : ' backpack-grid--display'}`} style={{ gridTemplateColumns: `repeat(${grid.width}, minmax(0, 1fr))` }} aria-label={`背包网格 ${grid.width}×${grid.height}`}>
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
        selectedFootprint.has(`${x},${y}`) ? 'selected-footprint-cell' : '',
        selectedAnchor?.x === x && selectedAnchor.y === y ? 'selected-anchor-cell' : '',
        selectedAnchor?.x === x && selectedAnchor.y === y && placementValid === false
          ? 'invalid-placement-cell'
          : '',
      ].filter(Boolean).join(' ')
      return onAnchor
        ? <button key={`${x},${y}`} type="button" className={className} data-occupied={occupied ? 'true' : 'false'} onClick={() => onAnchor(x, y)}>{label}</button>
        : <span key={`${x},${y}`} className={className} data-occupied={occupied ? 'true' : 'false'} aria-label={label}>{occupied ? '' : ''}</span>
    })}
    {!onAnchor && <div className="backpack-grid__items" style={{ gridTemplateColumns: `repeat(${grid.width}, minmax(0, 1fr))`, gridTemplateRows: `repeat(${grid.height}, minmax(0, 1fr))` }}>
      {grid.items.map((entry, index) => {
        const action = itemAction?.(entry.x, entry.y)
        return <span className="backpack-grid__item" key={`${entry.name}-${index}`} style={{ gridColumn: `${entry.x + 1} / span ${entry.width}`, gridRow: `${entry.y + 1} / span ${entry.height}` }}>
          <ItemCard item={entry.item} actionLabel={action?.label} actionText={action?.text} onAction={action?.onClick} menuActions={action?.menuActions} iconOnly />
        </span>
      })}
    </div>}
  </div>
}

function actionIcon(kind: StableRunUiAction['kind']): string {
  return ({
    'launch-main-scene': '↗', 'end-day': '◷', 'scene-move': '➜', 'scene-main-search': '⌕',
    'scene-obstacle': '◇', 'scene-task-event': '◆', 'scene-medical': '✚', 'scene-battery': 'ϟ',
    'scene-inventory': '▦', 'scene-combat-action': '⚔', 'scene-withdraw': '↩',
    'settle-terminal-scene': '↩', 'hub-medical': '✚', 'hub-survival': '◈',
  })[kind]
}

function shortActionLabel(action: StableRunUiAction): string {
  return action.kind === 'scene-battery' ? '充能'
    : action.kind === 'scene-main-search'
    ? action.label.replace('主要搜索 · 使用手电筒', '手电搜索').replace('主要搜索 · 无照明', '无照明搜索')
    : action.kind === 'scene-obstacle'
      ? action.label.split(' · ').at(-1) ?? action.label
      : action.kind === 'scene-combat-action' || action.kind === 'scene-medical' || action.kind === 'hub-medical' || action.kind === 'hub-survival'
        ? action.label.split(' · ')[0]
        : action.label
}

function ActionChip({ action, onPreview, onGhostEnter, onGhostLeave }: Readonly<{
  action: StableRunUiAction
  onPreview(actionId: string): void
  onGhostEnter?(actionId: string, source: 'mouse' | 'keyboard', anchor: HTMLElement): void
  onGhostLeave?(actionId: string, source: 'mouse' | 'keyboard'): void
}>) {
  return <button type="button"
    className={`action-button action-chip${action.ghost || action.combatGhost ? ' action-button--ghostable' : ''}`}
    aria-label={action.label}
    title={action.label}
    onMouseEnter={(event) => onGhostEnter?.(action.id, 'mouse', event.currentTarget)}
    onMouseLeave={() => onGhostLeave?.(action.id, 'mouse')}
    onFocus={(event) => onGhostEnter?.(action.id, 'keyboard', event.currentTarget)}
    onBlur={() => onGhostLeave?.(action.id, 'keyboard')}
    onClick={() => onPreview(action.id)}
  ><span className="action-icon" aria-hidden="true">{actionIcon(action.kind)}</span><span>{shortActionLabel(action)}</span></button>
}

function ActionPanel({
  actions,
  onPreview,
  onGhostEnter = () => undefined,
  onGhostLeave = () => undefined,
  extraActions,
}: Readonly<{
  actions: readonly StableRunUiAction[]
  onPreview(actionId: string): void
  onGhostEnter?(actionId: string, source: 'mouse' | 'keyboard', anchor: HTMLElement): void
  onGhostLeave?(actionId: string, source: 'mouse' | 'keyboard'): void
  extraActions?: ReactNode
}>) {
  if (actions.length === 0 && !extraActions) return null
  const groups = [
    { title: '本日流程', kinds: ['launch-main-scene', 'end-day'] },
    { title: '移动与返程', kinds: ['scene-move', 'scene-withdraw', 'settle-terminal-scene'] },
    { title: '战斗行动', kinds: ['scene-combat-action'] },
    { title: '搜索与任务', kinds: ['scene-main-search', 'scene-obstacle', 'scene-task-event'] },
    { title: '医疗与补给', kinds: ['scene-medical', 'scene-battery', 'hub-medical', 'hub-survival'] },
  ] as const
  const grouped = groups.map((group) => ({
    ...group,
    actions: actions.filter((action) => group.kinds.some((kind) => kind === action.kind)),
  })).filter(({ actions: entries }) => entries.length > 0)
  return <section className="console-panel action-panel game-actions" aria-labelledby="actions-heading">
    <header className="panel-heading"><div><p className="panel-kicker">下一步</p><h2 id="actions-heading">可执行行动</h2></div></header>
    {grouped.map((group) => <section className="action-group" key={group.title}>
      <h3>{group.title}</h3>
      <div className="action-list">{group.actions.map((action) => <div className="action-entry" key={action.id}>
        <ActionChip action={action} onPreview={onPreview} onGhostEnter={onGhostEnter} onGhostLeave={onGhostLeave} />
        {action.contextNote && <small>{action.contextNote}</small>}
      </div>)}</div>
    </section>)}
    {extraActions}
  </section>
}

function HubView({
  model,
  backgroundKey,
  actions,
  onPreview,
  loadoutOpportunities,
  onLoadout,
  maintenanceOpportunities,
  onMaintenance,
  activityEntries,
  returnSummaryAvailable,
  onViewReturnSummary,
  detailsAvailable,
  onViewDetails,
}: Readonly<{
  model: Extract<StableRunPlayerViewModel, { kind: 'current-day-hub' }>
  backgroundKey?: PresentationVisualKey | null
  actions: readonly StableRunUiAction[]
  onPreview(actionId: string): void
  loadoutOpportunities: readonly StableRunUiHubLoadoutOpportunity[]
  onLoadout(opportunityId: string, operation: StableRunUiHubLoadoutOperation): void
  maintenanceOpportunities: readonly StableRunUiHubMaintenanceOpportunity[]
  onMaintenance(operation: StableRunUiHubMaintenanceOpportunity['operation']): void
  activityEntries: readonly ActivityFeedEntry[]
  returnSummaryAvailable: boolean
  onViewReturnSummary(): void
  detailsAvailable: boolean
  onViewDetails(): void
}>) {
  return <main className="console-layout game-shell-layout">
    <StatusBar status={model.status} />
    <div className="console-grid">
      <section className="console-panel game-stage hub-stage">{backgroundKey && <div className="presentation-background presentation-background--hub" style={{ backgroundImage: `url(${presentationVisualAssetUrl(backgroundKey)})` }} aria-hidden="true" />}
        <header className="stage-heading"><p className="panel-kicker">电梯中枢</p><h1>今日整备</h1></header>
        <div className="hub-stage__content">
          {returnSummaryAvailable && <button type="button" className="action-button action-chip" onClick={onViewReturnSummary}>查看返程摘要</button>}
          <div className="mission-briefing"><span className="panel-kicker">当前任务</span><strong>{model.hub.mission.objective}</strong><details><summary>任务说明</summary><p>{model.hub.mission.completion}</p></details></div>
          {model.hub.dayScopeNotice && <details className="hub-stage__scope"><summary>当前版本范围</summary><p>{model.hub.dayScopeNotice}</p></details>}
          <div className="hub-stage__resources"><strong>今日基础维修点：{model.hub.maintenanceLaborRemaining} / {model.hub.maintenanceLaborTotal}</strong><InfoCard label="查看基础维修说明" title="基础维修" summary="每使用1点，恢复指定基础装备1点对应资源。今日未用点数不累积。" /></div>
          {maintenanceOpportunities.length > 0 && <section className="hub-stage__station"><h2>维护台</h2><div className="action-list">{maintenanceOpportunities.map((opportunity) => <button key={opportunity.id} type="button" className="action-button action-chip" aria-label={opportunity.label} title={opportunity.label} onClick={() => onMaintenance(opportunity.operation)}><span className="action-icon" aria-hidden="true">⚙</span><span>{opportunity.label.split(' · ')[0]}</span></button>)}</div></section>}
          <section className="hub-stage__station"><h2>仓库</h2>{model.hub.warehouse.length === 0 ? <p className="empty-copy">仓库为空</p> : <ul className="item-list">{model.hub.warehouse.map((item, index) => {
            const opportunity = loadoutOpportunities.filter(({ container }) => container === 'warehouse')[index]
            const actions = opportunity?.operations.map((operation) => ({ label: hubLoadoutOperationLabel(operation), onClick: () => onLoadout(opportunity.id, operation) })) ?? []
            return <li key={`${item.name}-${index}`}><ItemCard item={item} actionLabel={opportunity ? `整备 ${opportunity.sourceLabel}` : undefined} actionText={actions.length === 1 ? actions[0].label : undefined} onAction={actions.length === 1 ? actions[0].onClick : undefined} menuActions={actions.length > 1 ? actions : []} /></li>
          })}</ul>}</section>
          <details className="hub-stage__task-storage"><summary>任务储存区</summary><ItemList items={model.hub.taskStorage} empty="暂无任务物品" /></details>
          <ActionPanel actions={actions} onPreview={onPreview} />
        </div>
        <ActivityFeed entries={activityEntries} />
        {detailsAvailable && <button type="button" className="stage-detail-button" onClick={onViewDetails}>查看最近行动详情</button>}
      </section>
      <LoadoutPanel loadout={model.loadout} opportunities={loadoutOpportunities.filter(({ container }) => container !== 'warehouse')} onLoadout={onLoadout} />
    </div>
  </main>
}

function SceneView({
  model,
  actions,
  ghost,
  combatGhost,
  combatActionResult,
  onCloseCombatResult,
  onPreview,
  onGhostEnter,
  onGhostLeave,
  pickupOpportunities,
  onPickup,
  taskEventOpportunities,
  onTaskEvent,
  inventoryOpportunities,
  onInventory,
  activityEntries,
  pendingWithdrawal,
  onCancelWithdrawal,
  onConfirmWithdrawal,
  autoOpenSearchResultNode,
  detailsAvailable,
  onViewDetails,
}: Readonly<{
  model: Extract<StableRunPlayerViewModel, { kind: 'scene-session' }>
  actions: readonly StableRunUiAction[]
  ghost: StableRunUiGhostPreview | null
  combatGhost: StableRunUiCombatGhostPreview | null
  combatActionResult: CombatActionResultViewModel | null
  onCloseCombatResult(): void
  onPreview(actionId: string): void
  onGhostEnter(actionId: string, source: 'mouse' | 'keyboard', anchor: HTMLElement): void
  onGhostLeave(actionId: string, source: 'mouse' | 'keyboard'): void
  pickupOpportunities: readonly StableRunUiPickupOpportunity[]
  onPickup(opportunityId: string): void
  taskEventOpportunities: readonly StableRunUiTaskEventOpportunity[]
  onTaskEvent(opportunityId: string): void
  inventoryOpportunities: readonly StableRunUiInventoryOpportunity[]
  onInventory(opportunityId: string, operation: StableRunUiInventoryOperation): void
  activityEntries: readonly ActivityFeedEntry[]
  pendingWithdrawal: StableRunUiAction | null
  onCancelWithdrawal(): void
  onConfirmWithdrawal(): void
  autoOpenSearchResultNode: string | null
  detailsAvailable: boolean
  onViewDetails(): void
}>) {
  const { scene } = model
  const [openResultNode, setOpenResultNode] = useState<string | null>(null)
  useEffect(() => {
    if (autoOpenSearchResultNode) setOpenResultNode(autoOpenSearchResultNode)
  }, [autoOpenSearchResultNode])
  const moveActions = actions.filter((action) => action.kind === 'scene-move')
  const searchActions = actions.filter((action) => action.kind === 'scene-main-search')
  const obstacleActions = actions.filter((action) => action.kind === 'scene-obstacle')
  const combatActions = actions.filter((action) => action.kind === 'scene-combat-action')
  const withdrawalAction = actions.find((action) => action.kind === 'scene-withdraw')
  const supportActions = actions.filter((action) => ['scene-medical', 'scene-battery', 'settle-terminal-scene'].includes(action.kind))
  const searchResultsOpen = scene.currentNodeSearchState === 'searched' && openResultNode === scene.currentNodeName
  if (scene.combat) return <main className="console-layout game-shell-layout game-shell-layout--battle">
    <StatusBar status={model.status} />
    <div className="console-grid console-grid--battle"><section className="console-panel game-stage scene-stage scene-stage--combat" aria-label="战斗主舞台">
      <BattleStage combat={scene.combat} condition={model.status.condition} ghost={combatGhost} latestResult={combatActionResult}
        actionBar={<ActionPanel actions={combatActions} onPreview={onPreview} onGhostEnter={onGhostEnter} onGhostLeave={onGhostLeave} />}
        combatLog={<ActivityFeed entries={activityEntries} combatOnly />} />
    </section></div>
  </main>
  return <main className="console-layout game-shell-layout">
    <StatusBar status={model.status} />
    <div className="console-grid">
      <section className={`console-panel game-stage scene-stage${scene.combat ? ' scene-stage--combat' : ''}`}>
        {scene.currentNodeVisualKey && <div className="presentation-background presentation-background--room" style={{ backgroundImage: `url(${presentationVisualAssetUrl(scene.currentNodeVisualKey)})` }} aria-hidden="true" />}
        <header className="stage-heading"><p className="panel-kicker">当前地点 · {sceneStatusName(scene.status)}</p><h1>{scene.currentNodeName}</h1></header>
        <div className="scene-stage__primary">
          <SceneTimeBudget budget={scene.timeBudget} ghost={ghost} />
          {combatActionResult && combatActionResult.outcome !== 'continue' && <CombatTerminalResult result={combatActionResult} onClose={onCloseCombatResult} />}
          {scene.status === 'active' && <div className="scene-stage__objects">
            <section className="stage-object" aria-label="当前位置搜索"><div className="stage-object__heading"><span className="action-icon" aria-hidden="true">⌕</span><div><strong>主要搜索</strong><small>当前节点搜索：{searchStateName(scene.currentNodeSearchState)}</small></div></div>
              {searchActions.length > 0 && <div className="action-list">{searchActions.map((action) => <ActionChip key={action.id} action={action} onPreview={onPreview} onGhostEnter={onGhostEnter} onGhostLeave={onGhostLeave} />)}</div>}
              {scene.currentNodeSearchState === 'searched' && <button type="button" className="action-button action-chip" aria-label="查看搜索结果" onClick={() => setOpenResultNode(searchResultsOpen ? null : scene.currentNodeName)}><span className="action-icon" aria-hidden="true">▣</span>查看搜索结果</button>}
        {searchResultsOpen && <section className="stage-result-panel" role="dialog" aria-modal="false" aria-label="搜索结果"><div className="stage-result-panel__heading"><div><span className="panel-kicker">{scene.currentNodeName}</span><h2>搜索结果</h2></div><button type="button" onClick={() => setOpenResultNode(null)}>关闭</button></div><p>已完成搜索。当前留在节点的物品：</p>{scene.groundItems.length === 0 ? <p className="empty-copy">无可拾取物品</p> : <ul className="item-list">{scene.groundItems.map((item, index) => <li key={`${item.name}-${index}`}><ItemCard item={item} actionLabel={`拾取 ${item.name}`} actionText="拾取" onAction={pickupOpportunities[index] ? () => onPickup(pickupOpportunities[index].id) : undefined} /></li>)}</ul>}</section>}
            </section>
            {scene.currentObstacles.length > 0 && <section className="stage-object obstacle-block"><div className="stage-object__heading"><span className="action-icon" aria-hidden="true">◇</span><strong>当前明显障碍</strong></div><div className="stage-object__art">{scene.currentObstacles.map(({ name, visualKey }) => <span key={name}>{visualKey && <img className="obstacle-art" src={presentationVisualAssetUrl(visualKey)} alt="" aria-hidden="true" />}{name}</span>)}</div><div className="action-list">{obstacleActions.map((action) => <ActionChip key={action.id} action={action} onPreview={onPreview} onGhostEnter={onGhostEnter} onGhostLeave={onGhostLeave} />)}</div></section>}
            {taskEventOpportunities.length > 0 && <section className="stage-object task-event-comparison" aria-labelledby="task-event-methods-heading"><div className="stage-object__heading"><span className="action-icon" aria-hidden="true">◆</span><strong id="task-event-methods-heading">密封病原样本箱</strong></div><p>比较提取方式，再明确选择背包位置。</p><div className="task-event-methods">{taskEventOpportunities.map((opportunity) => <article className="task-event-method" key={opportunity.id}><strong>{opportunity.label}</strong><small>{opportunity.comparisonFacts.slice(0, 3).map((fact) => `${fact.label} ${fact.value}`).join(' · ')}</small>{opportunity.comparisonFacts.length > 3 && <details><summary>详细后果</summary><small>{opportunity.comparisonFacts.slice(3).map((fact) => `${fact.label}${fact.value}`).join(' · ')}</small></details>}<button type="button" className="action-button action-chip" aria-label={opportunity.label} onMouseEnter={(event) => onGhostEnter(opportunity.id, 'mouse', event.currentTarget)} onMouseLeave={() => onGhostLeave(opportunity.id, 'mouse')} onFocus={(event) => onGhostEnter(opportunity.id, 'keyboard', event.currentTarget)} onBlur={() => onGhostLeave(opportunity.id, 'keyboard')} onClick={() => onTaskEvent(opportunity.id)}>选择</button></article>)}</div></section>}
            {scene.groundItems.length > 0 && scene.currentNodeSearchState !== 'searched' && <section className="stage-object"><div className="stage-object__heading"><span className="action-icon" aria-hidden="true">▦</span><strong>当前节点地面物品</strong></div><ul className="item-list">{scene.groundItems.map((item, index) => <li key={`${item.name}-${index}`}><ItemCard item={item} actionLabel={`拾取 ${item.name}`} actionText="拾取" onAction={pickupOpportunities[index] ? () => onPickup(pickupOpportunities[index].id) : undefined} /></li>)}</ul></section>}
          </div>}
          {scene.status !== 'active' && <section className="stage-object terminal-stage-message"><h2>场景结果 · {sceneStatusName(scene.status)}</h2><p>下一步由你显式结算；不会自动进入中枢或推进日期。</p></section>}
        </div>
        {scene.status === 'active' && <nav className="scene-stage__routes" aria-label="当前可去方向"><strong>可去方向</strong><div className="action-list">{moveActions.length === 0 ? <span className="empty-copy">当前没有可通行的相邻方向</span> : moveActions.map((action) => <ActionChip key={action.id} action={action} onPreview={onPreview} onGhostEnter={onGhostEnter} onGhostLeave={onGhostLeave} />)}</div>{withdrawalAction && <div className="scene-stage__return"><ActionChip action={withdrawalAction} onPreview={onPreview} onGhostEnter={onGhostEnter} onGhostLeave={onGhostLeave} />{pendingWithdrawal && <section className="scene-stage__return-preview" role="dialog" aria-label="确认主动返程"><h2>本次返程</h2><dl className="preview-facts">{pendingWithdrawal.preview.facts.filter(({ label }) => ['返程路线', '预计返程时间', '返程后生命', '预计结果'].includes(label)).map((fact) => <div key={fact.label}><dt>{fact.label}</dt><dd>{fact.value}</dd></div>)}</dl>{pendingWithdrawal.preview.warnings.map((warning) => <p className="preview-warning" key={warning}>{warning}</p>)}<div className="preview-controls"><button type="button" onClick={onCancelWithdrawal}>继续探索</button><button type="button" className="confirm-action" onClick={onConfirmWithdrawal}>确认返程</button></div></section>}</div>}</nav>}
        {supportActions.length > 0 && <div className="scene-stage__support"><ActionPanel actions={supportActions} onPreview={onPreview} onGhostEnter={onGhostEnter} onGhostLeave={onGhostLeave} /></div>}
        <ActivityFeed entries={activityEntries} />
        {detailsAvailable && <button type="button" className="stage-detail-button" onClick={onViewDetails}>查看最近行动详情</button>}
        <div className="scene-map-dock"><PlayerKnownMap map={scene.navigationMap} /></div>
      </section>
      <LoadoutPanel loadout={scene.loadout} inventoryOpportunities={inventoryOpportunities} onInventory={onInventory} />
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
  return <div className="draft-surface" role="presentation"><section className="preview-dialog" role="dialog" aria-modal="false" aria-labelledby="task-event-title">
    <h2 id="task-event-title">{opportunity.eventName} · {opportunity.label}</h2>
    {opportunity.visualKey && <img className="preview-art" src={presentationVisualAssetUrl(opportunity.visualKey)} alt="密封病原样本箱" />}
    <p>取得：<strong>{opportunity.outputName}</strong> · {opportunity.width}×{opportunity.height} · 重量 {opportunity.unitWeight}</p>
    {opportunity.canRotate && <label><input aria-label="旋转样本箱" type="checkbox" checked={rotated} onChange={(event) => onRotate(event.target.checked)} />旋转</label>}
    <p>目标格：{x === null || y === null ? '尚未选择' : `${x + 1}, ${y + 1}`}</p>
    <BackpackGrid grid={loadout.backpackGrid} candidateCells={preview?.candidateCells} selectedFootprintCells={preview?.selectedFootprintCells} selectedAnchor={x === null || y === null ? null : { x, y }} placementValid={preview?.canExecute ?? false} onAnchor={onAnchor} />
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
  placementSelected,
  rotated,
  onQuantity,
  onRotate,
  onAnchor,
  onAutoPlace,
  onCancel,
}: Readonly<{
  opportunity: StableRunUiPickupOpportunity
  loadout: PlayerVisibleLoadoutViewModel
  preview: ReturnType<typeof previewStableRunUiPickupDraft>
  quantity: number
  x: number
  y: number
  placementSelected: boolean
  rotated: boolean
  onQuantity(value: number): void
  onRotate(value: boolean): void
  onAnchor(x: number, y: number): void
  onAutoPlace(): void
  onCancel(): void
}>) {
  return <div className="draft-surface" role="presentation"><section className="preview-dialog" role="dialog" aria-modal="false" aria-labelledby="pickup-title">
    <h2 id="pickup-title">拾取 {opportunity.name}</h2>
    <p>地面剩余数量：<strong>{opportunity.groundQuantity}</strong></p>
    <label>本次拾取数量 <input aria-label="本次拾取数量" type="number" min="1" max={opportunity.groundQuantity} value={quantity} onChange={(event) => onQuantity(Number(event.target.value))} /></label>
    {opportunity.canRotate && <label><input aria-label="旋转物品" type="checkbox" checked={rotated} onChange={(event) => onRotate(event.target.checked)} />旋转</label>}
    <p>目标格：{placementSelected ? `${x + 1}, ${y + 1}` : '尚未选择'}</p>
    <BackpackGrid grid={loadout.backpackGrid} candidateCells={preview?.candidateCells} selectedFootprintCells={placementSelected ? preview?.selectedFootprintCells : []} selectedAnchor={placementSelected ? { x, y } : null} placementValid={placementSelected && (preview?.canExecute ?? false)} onAnchor={onAnchor} />
    <p className="preview-warning">{preview?.canExecute ? '点击合法格子即正式拾取；也可按当前数量尝试未旋转的自动放置。' : preview?.rejection ?? '无可用位置时可旋转并手动选择；状态变化后请重新选择。'}</p>
    <button type="button" onClick={onAutoPlace}>按此数量拾取（自动放置）</button>
    <div className="preview-controls"><button type="button" onClick={onCancel}>取消</button></div>
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
  onQuantity,
  onTargetOpportunity,
  onTargetSlot,
  onAnchor,
  onRotate,
  onCancel,
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
  onQuantity(value: number | null): void
  onTargetOpportunity(value: string): void
  onTargetSlot(value: number): void
  onAnchor(x: number, y: number): void
  onRotate(value: boolean): void
  onCancel(): void
}>) {
  const needsPlacement = operation === 'move' || operation === 'split' ||
    operation === 'quick-slot-to-backpack'
  const mergeTargets = opportunities.filter(
    (candidate) => candidate.container === 'backpack' && candidate.id !== opportunity.id,
  )
  return <div className="draft-surface" role="presentation"><section className="preview-dialog" role="dialog" aria-modal="false" aria-labelledby="scene-inventory-title">
    <h2 id="scene-inventory-title">{operation ? inventoryOperationLabel(operation) : '场景整理'}</h2>
    <p>来源：<strong>{opportunity.sourceLabel}</strong></p>
    {(operation === 'split' || operation === 'merge') && <label>明确数量 <input aria-label="整理数量" type="number" min="1" value={quantity ?? ''} onChange={(event) => onQuantity(event.target.value === '' ? null : Number(event.target.value))} /></label>}
    {operation === 'merge' && <><h3>明确目标堆叠</h3><div className="preview-controls">{mergeTargets.map((target) => <button key={target.id} type="button" className={targetOpportunityId === target.id ? 'confirm-action' : ''} onClick={() => onTargetOpportunity(target.id)}>{target.sourceLabel}</button>)}</div></>}
    {operation === 'backpack-to-quick-slot' && <><h3>明确目标快捷栏</h3><div className="preview-controls">{loadout.quickSlots.map((slot, index) => <button key={index} type="button" className={targetSlotIndex === index ? 'confirm-action' : ''} onClick={() => onTargetSlot(index)}>快捷栏{index + 1} · {slot?.name ?? '空'}</button>)}</div></>}
    {needsPlacement && <>
      {opportunity.canRotate && <label><input aria-label="旋转整理物品" type="checkbox" checked={rotated} onChange={(event) => onRotate(event.target.checked)} />旋转</label>}
      <p>目标格：{x === null || y === null ? '尚未选择' : `${x + 1}, ${y + 1}`}</p>
      <BackpackGrid grid={loadout.backpackGrid} candidateCells={preview?.candidateCells} selectedFootprintCells={preview?.selectedFootprintCells} selectedAnchor={x === null || y === null ? null : { x, y }} placementValid={preview?.canExecute ?? false} onAnchor={onAnchor} />
    </>}
    {operation === 'drop' && <p>本操作会把整个物品实例／整个堆叠放到当前节点，不会自动拆分。</p>}
    {preview?.canExecute && preview.preview
      ? <><dl className="preview-facts">{preview.preview.facts.map((fact) => <div key={fact.label}><dt>{fact.label}</dt><dd>{fact.value}</dd></div>)}</dl>{preview.preview.warnings.length > 0 && <ul className="preview-warnings">{preview.preview.warnings.map((warning) => <li key={warning}>{warning}</li>)}</ul>}</>
      : <p className="preview-warning">{operation === null
        ? '请明确选择一项整理操作。'
        : preview?.rejection ?? '请明确选择数量、目标快捷栏、目标堆叠或背包放置位置。'}</p>}
    <div className="preview-controls"><button type="button" onClick={onCancel}>取消</button></div>
  </section></div>
}

function SceneInventoryResultDialog({
  result,
  onClose,
}: Readonly<{ result: SceneInventoryResultViewModel; onClose(): void }>) {
  return <div className="result-surface" role="presentation"><section className="preview-dialog" role="dialog" aria-modal="false" aria-labelledby="scene-inventory-result-title">
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
      <div><dt>场景时间</dt><dd>{result.remainingTimeBefore} → {result.remainingTimeAfter}（不消耗）</dd></div>
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
    'warehouse-to-backpack': '取出',
    'backpack-to-warehouse': '存入仓库',
    'move-backpack-item': '移动／旋转',
    'split-backpack-stack': '拆分堆叠',
    'merge-backpack-stacks': '合并堆叠',
    'equip-from-backpack': '装备到槽位',
    'unequip-to-backpack': '卸下',
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
  onQuantity, onTargetOpportunity, onTargetEquipmentSlot,
  onTargetQuickSlotIndex, onAnchor, onRotate, onCancel,
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
  onQuantity(value: number | null): void
  onTargetOpportunity(value: string): void
  onTargetEquipmentSlot(value: 'weapon' | 'armor' | 'utility'): void
  onTargetQuickSlotIndex(value: number): void
  onAnchor(x: number, y: number): void
  onRotate(value: boolean): void
  onCancel(): void
}>) {
  const needsPlacement = operation === 'warehouse-to-backpack' || operation === 'move-backpack-item' ||
    operation === 'split-backpack-stack' || operation === 'unequip-to-backpack' ||
    operation === 'quick-slot-to-backpack' || operation === 'swap-backpack-equipped'
  const needsQuantity = operation === 'split-backpack-stack' || operation === 'merge-backpack-stacks'
  const backpackTargets = opportunities.filter((candidate) => candidate.container === 'backpack' && candidate.id !== opportunity.id)
  const equipmentTargets = opportunities.filter((candidate) => candidate.container === 'equipment')
  return <div className="draft-surface" role="presentation"><section className="preview-dialog" role="dialog" aria-modal="false" aria-labelledby="hub-loadout-title">
    <h2 id="hub-loadout-title">{operation ? hubLoadoutOperationLabel(operation) : '电梯中枢整备'}</h2>
    <p>来源：<strong>{opportunity.sourceLabel}</strong></p>
    {needsQuantity && <label>明确数量 <input aria-label="中枢整备数量" type="number" min="1" value={quantity ?? ''} onChange={(event) => onQuantity(event.target.value === '' ? null : Number(event.target.value))} /></label>}
    {operation === 'merge-backpack-stacks' && <><h3>明确目标堆叠</h3><div className="preview-controls">{backpackTargets.map((target) => <button key={target.id} type="button" className={targetOpportunityId === target.id ? 'confirm-action' : ''} onClick={() => onTargetOpportunity(target.id)}>{target.sourceLabel}</button>)}</div></>}
    {operation === 'equip-from-backpack' && <><h3>明确装备槽</h3><div className="preview-controls">{(['weapon', 'armor', 'utility'] as const).map((slot) => <button key={slot} type="button" className={targetEquipmentSlot === slot ? 'confirm-action' : ''} onClick={() => onTargetEquipmentSlot(slot)}>{slot === 'weapon' ? '武器位' : slot === 'armor' ? '防具位' : '实用装备位'}</button>)}</div></>}
    {operation === 'swap-backpack-equipped' && <><h3>明确被替换装备</h3><div className="preview-controls">{equipmentTargets.map((target) => <button key={target.id} type="button" className={targetOpportunityId === target.id ? 'confirm-action' : ''} onClick={() => onTargetOpportunity(target.id)}>{target.sourceLabel}</button>)}</div><p>下方选择的是被替换装备放回背包的位置。</p></>}
    {(operation === 'backpack-to-quick-slot' || operation === 'move-quick-slot-item' || operation === 'swap-quick-slot-items') && <><h3>明确目标快捷栏</h3><div className="preview-controls">{loadout.quickSlots.map((slot, index) => <button key={index} type="button" className={targetQuickSlotIndex === index ? 'confirm-action' : ''} onClick={() => onTargetQuickSlotIndex(index)}>快捷栏{index + 1} · {slot?.name ?? '空'}</button>)}</div></>}
    {needsPlacement && <>{opportunity.canRotate && <label><input aria-label="旋转中枢整备物品" type="checkbox" checked={rotated} onChange={(event) => onRotate(event.target.checked)} />旋转</label>}<p>目标格：{x === null || y === null ? '尚未选择' : `${x + 1}, ${y + 1}`}</p><BackpackGrid grid={loadout.backpackGrid} candidateCells={preview?.candidateCells} selectedFootprintCells={preview?.selectedFootprintCells} selectedAnchor={x === null || y === null ? null : { x, y }} placementValid={preview?.canExecute ?? false} onAnchor={onAnchor} /></>}
    {preview?.canExecute ? <dl className="preview-facts">{preview.facts.map((fact) => <div key={fact.label}><dt>{fact.label}</dt><dd>{fact.value}</dd></div>)}</dl> : <p className="preview-warning">{operation === null ? '请明确选择一项整备操作。' : preview?.rejection ?? '请完整选择数量、目标槽位或背包位置。'}</p>}
    <div className="preview-controls"><button type="button" onClick={onCancel}>取消</button></div>
  </section></div>
}

function HubLoadoutResultDialog({ result, onClose }: Readonly<{ result: HubLoadoutResultViewModel; onClose(): void }>) {
  return <div className="result-surface" role="presentation"><section className="preview-dialog" role="dialog" aria-modal="false" aria-labelledby="hub-loadout-result-title">
    <h2 id="hub-loadout-result-title">中枢整备结果</h2><p><strong>{result.action}</strong></p>
    <dl className="preview-facts"><div><dt>物品</dt><dd>{result.itemName}</dd></div><div><dt>来源</dt><dd>{result.source}</dd></div><div><dt>目标</dt><dd>{result.target}</dd></div><div><dt>转移数量</dt><dd>{result.quantityMoved}</dd></div><div><dt>来源数量</dt><dd>{result.sourceQuantityBefore} → {result.sourceQuantityAfter}</dd></div>{result.targetQuantityBefore !== null && result.targetQuantityAfter !== null && <div><dt>目标数量</dt><dd>{result.targetQuantityBefore} → {result.targetQuantityAfter}</dd></div>}{result.displacedItemName && <div><dt>被替换／交换物品</dt><dd>{result.displacedItemName}</dd></div>}{result.displacedPath && <div><dt>被替换／交换路径</dt><dd>{result.displacedPath}</dd></div>}<div><dt>背包负重</dt><dd>{result.backpackWeightBefore} → {result.backpackWeightAfter}</dd></div><div><dt>负重状态</dt><dd>{loadTierName(result.loadTierBefore)} → {loadTierName(result.loadTierAfter)}</dd></div><div><dt>场景时间</dt><dd>0（不消耗）</dd></div>{result.resourceCurrent !== null && <div><dt>资源保持</dt><dd>{result.resourceCurrent}</dd></div>}</dl>
    <div className="preview-controls"><button type="button" onClick={onClose}>关闭结果</button></div>
  </section></div>
}

function HubMaintenanceDialog({
  opportunity, allocations, targetId, materialSourceId, secondaryMaterialSourceId,
  preview, onAllocation, onTarget, onMaterialSource, onSecondaryMaterialSource,
  onCancel, onConfirm,
}: Readonly<{
  opportunity: StableRunUiHubMaintenanceOpportunity
  allocations: Readonly<Record<string, number>>
  targetId: string | null
  materialSourceId: string | null
  secondaryMaterialSourceId: string | null
  preview: ReturnType<typeof previewStableRunUiHubMaintenanceDraft>
  onAllocation(targetId: string, points: number): void
  onTarget(targetId: string): void
  onMaterialSource(sourceId: string): void
  onSecondaryMaterialSource(sourceId: string): void
  onCancel(): void
  onConfirm(): void
}>) {
  const usesAllocations = opportunity.operation === 'allocate-base-maintenance-labor' || opportunity.operation === 'repair-with-metal-parts'
  const needsMaterial = opportunity.operation !== 'allocate-base-maintenance-labor'
  const needsSecondMaterial = opportunity.operation === 'repair-toolkit'
  const primarySources = needsSecondMaterial
    ? opportunity.sources.filter(({ material }) => material === 'metal-parts')
    : opportunity.sources
  const secondarySources = opportunity.sources.filter(({ material }) => material === 'electronic-components')
  return <div className="draft-surface" role="presentation"><section className="preview-dialog" role="dialog" aria-modal="false" aria-labelledby="hub-maintenance-title">
    <h2 id="hub-maintenance-title">{opportunity.label}</h2>
    {opportunity.operation === 'allocate-base-maintenance-labor' && <p>今日剩余维修点：<strong>{opportunity.maintenanceLaborRemaining}</strong>。每个目标必须显式分配正整数点数，且不能产生浪费。</p>}
    {opportunity.generatedRepair !== null && <p>本次材料／操作可生成维修量：<strong>{opportunity.generatedRepair}</strong></p>}
    <h3>{usesAllocations ? '明确目标与分配' : '明确维护目标'}</h3>
    <div className="maintenance-target-list">{opportunity.targets.map((target) => <div key={target.id}>
      {usesAllocations
        ? <label>{target.name} · {target.locationLabel} · {target.resourceKind === 'durability' ? '耐久' : target.resourceKind === 'integrity' ? '完整度' : '电量'} {target.current}/{target.maximum} <input aria-label={`分配 ${target.name} ${target.locationLabel}`} type="number" min="0" value={allocations[target.id] ?? 0} onChange={(event) => onAllocation(target.id, Number(event.target.value))} /></label>
        : <button type="button" className={targetId === target.id ? 'confirm-action' : 'action-button'} onClick={() => onTarget(target.id)}>{target.name} · {target.locationLabel} · {target.resourceKind === 'durability' ? '耐久' : target.resourceKind === 'integrity' ? '完整度' : '电量'} {target.current}/{target.maximum}</button>}
    </div>)}</div>
    {needsMaterial && <><h3>明确材料来源</h3><div className="preview-controls">{primarySources.map((source) => <button key={source.id} type="button" className={materialSourceId === source.id ? 'confirm-action' : ''} onClick={() => onMaterialSource(source.id)}>{source.name} ×{source.quantity} · {source.locationLabel}</button>)}</div></>}
    {needsSecondMaterial && <><h3>明确电子元件来源</h3><div className="preview-controls">{secondarySources.map((source) => <button key={source.id} type="button" className={secondaryMaterialSourceId === source.id ? 'confirm-action' : ''} onClick={() => onSecondaryMaterialSource(source.id)}>{source.name} ×{source.quantity} · {source.locationLabel}</button>)}</div></>}
    {preview?.canExecute
      ? <><dl className="preview-facts">{preview.facts.map((fact) => <div key={fact.label}><dt>{fact.label}</dt><dd>{fact.value}</dd></div>)}</dl>{preview.warnings.length > 0 && <ul className="preview-warnings">{preview.warnings.map((warning) => <li key={warning}>{warning}</li>)}</ul>}</>
      : <p className="preview-warning">{preview?.rejection ?? '请完整选择维护目标、分配和材料来源。'}</p>}
    <div className="preview-controls"><button type="button" onClick={onCancel}>取消</button><button type="button" className="confirm-action" disabled={!preview?.canExecute} onClick={onConfirm}>确认维护</button></div>
  </section></div>
}

function HubMaintenanceResultDialog({ result, onClose }: Readonly<{ result: HubMaintenanceResultViewModel; onClose(): void }>) {
  return <div className="result-surface" role="presentation"><section className="preview-dialog" role="dialog" aria-modal="false" aria-labelledby="hub-maintenance-result-title">
    <h2 id="hub-maintenance-result-title">{result.title}</h2>
    <dl className="preview-facts">{result.facts.map((fact) => <div key={fact.label}><dt>{fact.label}</dt><dd>{fact.value}</dd></div>)}</dl>
    {result.warnings.length > 0 && <ul className="preview-warnings">{result.warnings.map((warning) => <li key={warning}>{warning}</li>)}</ul>}
    <div className="preview-controls"><button type="button" onClick={onClose}>关闭结果</button></div>
  </section></div>
}

function ReturnSummaryDialog({ summary, onClose }: Readonly<{ summary: ReturnSummaryViewModel; onClose(): void }>) {
  const kind = summary.returnKind === 'safe' ? '安全' : '强制'
  return <div className="result-surface" role="presentation"><section className="preview-dialog" role="dialog" aria-modal="false" aria-labelledby="return-summary-title">
    <h2 id="return-summary-title">返回摘要</h2><p>返回类型：<strong>{kind}</strong></p>{summary.voluntarilyStarted && summary.returnKind === 'forced' && <p className="preview-warning">你主动开始返程，但由于剩余时间不足，最终按强制返程规则完成。</p>}<p>剩余生命：<strong>{summary.remainingHealth}</strong></p><h3>带回普通／权限物品</h3><ItemList items={summary.warehouseItems} empty="无" /><h3>带回任务物品</h3><ItemList items={summary.taskItems} empty="无" />{summary.lostTaskItemCount > 0 && <p>遗失任务物品：{summary.lostTaskItemCount}</p>}<div className="preview-controls"><button type="button" onClick={onClose}>关闭摘要</button></div>
  </section></div>
}

function CombatTerminalResult({
  result,
  onClose,
}: Readonly<{ result: CombatActionResultViewModel; onClose(): void }>) {
  const outcome = result.outcome === 'victory'
      ? '胜利'
      : result.outcome === 'escaped'
        ? '成功逃跑'
        : result.outcome === 'forced-returned'
          ? '战斗结束并强制返程'
          : '战败'
  return <section className="stage-object combat-terminal-result" role="status" aria-labelledby="combat-result-title">
    <h2 id="combat-result-title">战斗结局 · {outcome}</h2>
    <p className="result-glance">{result.playerAction} · 生命 {result.playerHealthBefore} → {result.playerHealthAfter} · 敌人{enemyHealthStageName(result.enemyHealthStage)}</p>
    <details className="result-details"><summary>查看本次行动详情</summary>
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
      {result.sceneTimeCost !== null && <div><dt>实际场景时间结算</dt><dd>{result.sceneTimeCost}</dd></div>}
    </dl>
    {result.newWounds.length > 0 && <p>新增伤口：{result.newWounds.join('、')}</p>}
    {result.treatedWounds.length > 0 && <p>已处理伤口：{result.treatedWounds.join('、')}</p>}
    {result.bleedingChanged && <p>流血状态：{result.bleedingChanged === 'started' ? '开始流血' : '已止血'}</p>}
    </details>
    {result.weaponBecameBroken && <p className="preview-warning">{result.weaponName ?? '当前武器'}已损坏。武器攻击已不可用。{result.temporaryAttackAvailable ? '临时攻击现已可用。' : ''}</p>}
    <div className="preview-controls"><button type="button" onClick={onClose}>关闭结果</button></div>
  </section>
}

function TaskEventResultDialog({
  result,
  onClose,
}: Readonly<{ result: TaskEventResultViewModel; onClose(): void }>) {
  return <div className="result-surface" role="presentation"><section className="preview-dialog" role="dialog" aria-modal="false" aria-labelledby="task-event-result-title">
    <h2 id="task-event-result-title">任务事件结果</h2>
    <dl className="preview-facts">
      <div><dt>处理方式</dt><dd>{result.action}</dd></div>
      <div><dt>样本箱</dt><dd>{result.taskItemName ? `${result.taskItemName} ×${result.taskItemQuantity} 已进入背包` : '本次未取得'}</dd></div>
      <div><dt>事件状态</dt><dd>{result.eventCompleted ? '提取已完成' : '仍可稍后重新选择'}</dd></div>
      <div><dt>实际新增感染暴露</dt><dd>{result.infectionExposuresAdded > 0 ? `+${result.infectionExposuresAdded}` : '0'}</dd></div>
      {result.armorResourceChange && <div><dt>外套完整度</dt><dd>{result.armorResourceChange}</dd></div>}
      <div><dt>样本来源情报</dt><dd>{result.originIntelRecorded ? '已记录' : '无新增'}</dd></div>
      <div><dt>场景时间</dt><dd>{result.remainingTimeBefore} → {result.remainingTimeAfter}</dd></div>
      <div><dt>背包负重</dt><dd>{result.backpackWeightBefore} → {result.backpackWeightAfter}</dd></div>
      <div><dt>当前场景状态</dt><dd>{sceneStatusName(result.sceneStatus)}</dd></div>
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
  return <div className="result-surface" role="presentation"><section className="preview-dialog" role="dialog" aria-modal="false" aria-labelledby="scene-medical-result-title">
    <h2 id="scene-medical-result-title">场景医疗结果</h2>
    <dl className="preview-facts">
      <div><dt>行动</dt><dd>{result.action}</dd></div>
      <div><dt>来源</dt><dd>{result.source}</dd></div>
      <div><dt>消耗</dt><dd>{result.itemConsumed}</dd></div>
      <div><dt>生命（主要效果）</dt><dd>{result.healthBefore} → {result.healthAfterPrimaryEffect}</dd></div>
      <div><dt>实际恢复</dt><dd>{result.actualHealthRecovery}</dd></div>
      <div><dt>最终生命</dt><dd>{result.finalHealth}</dd></div>
      <div><dt>行动后流血损失</dt><dd>{result.postActionBleedingDamage}</dd></div>
      <div><dt>场景时间</dt><dd>{result.remainingTimeBefore} → {result.remainingTimeAfter}</dd></div>
      <div><dt>完成节点</dt><dd>{result.completionNodeName}</dd></div>
      <div><dt>当前节点</dt><dd>{result.finalNodeName}</dd></div>
      {result.returnEstimateAfterAction !== null && <div><dt>行动后预计返程</dt><dd>{result.returnEstimateAfterAction}</dd></div>}
      <div><dt>当前场景状态</dt><dd>{sceneStatusName(result.sceneStatus)}</dd></div>
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
    {result.sceneStatus === 'safe-returned' && <p className="preview-warning">已安全回到电梯前室；下一步需要显式完成返程结算。</p>}
    {result.sceneStatus === 'forced-returned' && <p className="preview-warning">已完成强制返程；下一步需要显式完成返程结算。</p>}
    {result.sceneStatus === 'dead' && <p className="preview-warning">玩家已死亡；下一步需要显式结算本局战败。</p>}
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
  return <div className="result-surface" role="presentation"><section className="preview-dialog" role="dialog" aria-modal="false" aria-labelledby="scene-battery-result-title">
    <h2 id="scene-battery-result-title">场景充能结果</h2>
    <dl className="preview-facts">
      <div><dt>行动</dt><dd>{result.action}</dd></div>
      <div><dt>来源</dt><dd>{result.source}</dd></div>
      <div><dt>目标</dt><dd>{result.target}</dd></div>
      <div><dt>电池数量</dt><dd>{result.quantityBefore} → {result.quantityAfter}</dd></div>
      <div><dt>{resource}</dt><dd>{result.resourceBefore} → {result.resourceAfter}</dd></div>
      <div><dt>实际恢复</dt><dd>{result.actualRecovery}</dd></div>
      <div><dt>未使用恢复量</dt><dd>{result.unusedRecovery}</dd></div>
      <div><dt>场景时间</dt><dd>{result.remainingTimeBefore} → {result.remainingTimeAfter}</dd></div>
      <div><dt>行动后流血损失</dt><dd>{result.postActionBleedingDamage}</dd></div>
      <div><dt>最终生命</dt><dd>{result.finalHealth}</dd></div>
      <div><dt>完成节点</dt><dd>{result.completionNodeName}</dd></div>
      <div><dt>当前节点</dt><dd>{result.finalNodeName}</dd></div>
      {result.returnEstimateAfterAction !== null && <div><dt>行动后预计返程</dt><dd>{result.returnEstimateAfterAction}</dd></div>}
      {result.forcedReturnDamage > 0 && <div><dt>强制返程总损耗</dt><dd>{result.forcedReturnDamage}</dd></div>}
      <div><dt>当前场景状态</dt><dd>{sceneStatusName(result.sceneStatus)}</dd></div>
    </dl>
    {result.nextStep === 'continue-exploration' && <p>本次充能完成后可继续探索。</p>}
    {result.sceneStatus === 'safe-returned' && <p className="preview-warning">已安全回到电梯前室；下一步需要显式完成返程结算。</p>}
    {result.sceneStatus === 'forced-returned' && <p className="preview-warning">已完成强制返程；下一步需要显式完成返程结算。</p>}
    {result.sceneStatus === 'dead' && <p className="preview-warning">玩家已死亡；下一步需要显式结算本局战败。</p>}
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
  return <div className="result-surface" role="presentation"><section className="preview-dialog" role="dialog" aria-modal="false" aria-labelledby="hub-medical-result-title">
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
  return <div className="result-surface" role="presentation"><section className="preview-dialog" role="dialog" aria-modal="false" aria-labelledby="hub-survival-result-title">
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

function DailySettlementResultDialog({ result, onClose }: Readonly<{
  result: DailySettlementResultViewModel
  onClose(): void
}>) {
  return <div className="result-surface" role="presentation"><section className="preview-dialog" role="dialog" aria-modal="false" aria-labelledby="daily-settlement-result-title">
    <h2 id="daily-settlement-result-title">{result.title}</h2>
    <p className="result-glance">第 {result.currentDay} 日{result.nextDay === null ? '结束' : ` → 第 ${result.nextDay} 日`} · 生命 {result.healthBefore} → {result.healthAfter}</p>
    <details className="result-details"><summary>查看完整日结算</summary>
    <dl className="preview-facts">
      <div><dt>日期</dt><dd>{result.nextDay === null ? `第 ${result.currentDay} 日终止` : `第 ${result.currentDay} 日 → 第 ${result.nextDay} 日`}</dd></div>
      <div><dt>生命</dt><dd>{result.healthBefore} → {result.healthAfter}</dd></div>
      <div><dt>持续危险损失</dt><dd>{result.continuousDangerHealthLoss}</dd></div>
      {result.worldThreatStageBefore !== null && <div><dt>世界威胁阶段</dt><dd>{result.worldThreatStageBefore} → {result.worldThreatStageAfter}</dd></div>}
      {result.pendingExposuresBefore !== null && <div><dt>未结算感染暴露</dt><dd>{result.pendingExposuresBefore} → {result.pendingExposuresAfter}</dd></div>}
      {result.suppressionApplied !== null && <div><dt>当日威胁抑制</dt><dd>{result.suppressionApplied}</dd></div>}
      {result.satietyBefore !== null && <div><dt>饱食</dt><dd>{result.satietyBefore} → {result.satietyAfter}</dd></div>}
      {result.deprivationHealthLoss !== null && <div><dt>匮乏损失</dt><dd>{result.deprivationHealthLoss}</dd></div>}
      {result.recoveryActual !== null && <div><dt>当日生命恢复</dt><dd>{result.recoveryBlockedByBleeding ? '被未处理流血阻断' : `+${result.recoveryActual}`}</dd></div>}
      {result.minorContusionsBefore !== null && <div><dt>轻度挫伤</dt><dd>{result.minorContusionsBefore} → {result.minorContusionsAfter}</dd></div>}
      {result.treatedOpenWoundsRemoved !== null && <div><dt>已处理伤口移除</dt><dd>{result.treatedOpenWoundsRemoved}</dd></div>}
      {result.untreatedOpenWoundsRetained !== null && <div><dt>未处理伤口保留</dt><dd>{result.untreatedOpenWoundsRetained}</dd></div>}
      {result.painkillerBefore !== null && <div><dt>镇痛</dt><dd>{result.painkillerBefore ? '生效' : '无'} → {result.painkillerAfter ? '生效' : '无'}</dd></div>}
      {result.disinfectantUsesBefore !== null && <div><dt>消毒剂日使用次数</dt><dd>{result.disinfectantUsesBefore} → {result.disinfectantUsesAfter}</dd></div>}
      {result.threatSuppressionUsesBefore !== null && <div><dt>抑制剂日使用次数</dt><dd>{result.threatSuppressionUsesBefore} → {result.threatSuppressionUsesAfter}</dd></div>}
      {result.maintenanceLaborBefore !== null && <div><dt>今日剩余维修点</dt><dd>{result.maintenanceLaborBefore} → {result.maintenanceLaborAfter}</dd></div>}
      {result.mainSceneUsedAfter !== null && <div><dt>次日主要场景</dt><dd>{result.mainSceneUsedAfter ? '已使用' : '尚未进入'}</dd></div>}
    </dl>
    </details>
    {result.outcome === 'health-depleted' && <p className="preview-warning">生命在日结算中耗尽，本局已结束。</p>}
    {result.outcome === 'world-threat-terminal' && <p className="preview-warning">世界威胁进入终末阶段，本局已结束。</p>}
    <div className="preview-controls"><button type="button" onClick={onClose}>关闭结果</button></div>
  </section></div>
}

function ActionPreviewDialog({
  preview,
  visualKey,
  protective,
  rescueAlternative,
  compactUnchanged,
  confirmLabel,
  onCancel,
  onConfirm,
}: Readonly<{
  preview: StableRunUiActionPreviewViewModel
  visualKey?: import('./presentation').PresentationVisualKey | null
  protective: boolean
  rescueAlternative: boolean
  compactUnchanged: boolean
  confirmLabel: string
  onCancel(): void
  onConfirm(): void
}>) {
  const facts = compactUnchanged ? preview.facts.filter(({ label, value }) => {
    const change = value.split(' → ')
    if (change.length === 2 && change[0] === change[1]) return false
    return !(value === '0' && (label === '当日威胁抑制' || label === '已处理伤口移除')) &&
      !(label === '持续危险' && value === '无生命损失') &&
      !(label === '匮乏损失' && value === '无')
  }) : preview.facts
  return <div className={protective ? 'protective-surface' : 'draft-surface'} role="presentation">
    <section className={`preview-dialog${compactUnchanged ? ' preview-dialog--end-day' : ''}`} role="dialog" aria-modal="false" aria-labelledby="action-preview-title">
      {(visualKey ?? preview.visualKey) && <img className="preview-art" src={presentationVisualAssetUrl((visualKey ?? preview.visualKey)!)} alt="" aria-hidden="true" />}
      <h2 id="action-preview-title">{preview.title}</h2>
      {rescueAlternative && <p className="preview-warning">该行动将在本次结算中导致死亡；目前仍有其他不会保证死亡的正式行动。</p>}
      <dl className="preview-facts">{facts.map((fact) => <div key={fact.label}>
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
        <button type="button" className="confirm-action" onClick={onConfirm}>{confirmLabel}</button>
      </div>
    </section>
  </div>
}

function FailureView({
  model,
  onRequestNewRunSetup,
}: Readonly<{
  model: Extract<StableRunPlayerViewModel, { kind: 'run-failure' }>
  onRequestNewRunSetup?: () => void
}>) {
  return <main className="console-layout game-shell-layout failure-shell"><section className="console-panel terminal-panel failure-stage"><p className="panel-kicker">本局已终止</p><h1>行动失败</h1><p className="failure-reason">第 {model.failure.currentDay} 日 · {model.failure.reason}</p><p>电梯中枢已失去本次行动连续性。此终局为只读状态，不能继续当前进度。</p>{onRequestNewRunSetup && <button type="button" className="action-button" onClick={onRequestNewRunSetup}>开始新一局</button>}</section></main>
}

function DevInspector({ phase }: Readonly<{ phase: unknown }>) {
  const [open, setOpen] = useState(false)
  return <aside className="dev-inspector">
    <button type="button" onClick={() => setOpen((value) => !value)}>{open ? '隐藏开发检查器' : '显示开发检查器'}</button>
    {open && <pre>{JSON.stringify(phase, null, 2)}</pre>}
  </aside>
}

export function StableRunUiApp({
  store,
  presentationDependencies,
  onRequestNewRunSetup,
}: StableRunUiAppProps) {
  const snapshot = useStableRunStoreSnapshot(store)
  const model = createStableRunPlayerViewModel(snapshot.phase, presentationDependencies)
  const interaction = createStableRunUiInteractionModel(snapshot.phase, presentationDependencies)
  const [pendingActionId, setPendingActionId] = useState<string | null>(null)
  const [hoveredGhostActionId, setHoveredGhostActionId] = useState<string | null>(null)
  const [focusedGhostActionId, setFocusedGhostActionId] = useState<string | null>(null)
  const [hoveredGhostAnchor, setHoveredGhostAnchor] = useState<HTMLElement | null>(null)
  const [focusedGhostAnchor, setFocusedGhostAnchor] = useState<HTMLElement | null>(null)
  const voluntaryReturnStarted = useRef(false)
  const [pendingPickupId, setPendingPickupId] = useState<string | null>(null)
  const [pendingTaskEventId, setPendingTaskEventId] = useState<string | null>(null)
  const [pendingTaskEventProtection, setPendingTaskEventProtection] = useState<PendingTaskEventProtection | null>(null)
  const [pendingInventoryId, setPendingInventoryId] = useState<string | null>(null)
  const [pendingHubLoadoutId, setPendingHubLoadoutId] = useState<string | null>(null)
  const [pendingHubMaintenanceOperation, setPendingHubMaintenanceOperation] = useState<StableRunUiHubMaintenanceOpportunity['operation'] | null>(null)
  const [pickupQuantity, setPickupQuantity] = useState(1)
  const [pickupX, setPickupX] = useState(0)
  const [pickupY, setPickupY] = useState(0)
  const [pickupPlacementSelected, setPickupPlacementSelected] = useState(false)
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
  const [pendingQuestDropConfirmation, setPendingQuestDropConfirmation] = useState(false)
  const [hubLoadoutOperation, setHubLoadoutOperation] = useState<StableRunUiHubLoadoutOperation | null>(null)
  const [hubLoadoutQuantity, setHubLoadoutQuantity] = useState<number | null>(null)
  const [hubLoadoutTargetId, setHubLoadoutTargetId] = useState<string | null>(null)
  const [hubLoadoutEquipmentSlot, setHubLoadoutEquipmentSlot] = useState<'weapon' | 'armor' | 'utility' | null>(null)
  const [hubLoadoutQuickSlot, setHubLoadoutQuickSlot] = useState<number | null>(null)
  const [hubLoadoutX, setHubLoadoutX] = useState<number | null>(null)
  const [hubLoadoutY, setHubLoadoutY] = useState<number | null>(null)
  const [hubLoadoutRotated, setHubLoadoutRotated] = useState(false)
  const [hubMaintenanceAllocations, setHubMaintenanceAllocations] = useState<Readonly<Record<string, number>>>({})
  const [hubMaintenanceTargetId, setHubMaintenanceTargetId] = useState<string | null>(null)
  const [hubMaintenanceMaterialSourceId, setHubMaintenanceMaterialSourceId] = useState<string | null>(null)
  const [hubMaintenanceSecondarySourceId, setHubMaintenanceSecondarySourceId] = useState<string | null>(null)
  const [returnSummary, setReturnSummary] = useState<ReturnSummaryViewModel | null>(null)
  const [returnSummaryOpen, setReturnSummaryOpen] = useState(false)
  const [combatActionResult, setCombatActionResult] = useState<CombatActionResultViewModel | null>(null)
  const [taskEventResult, setTaskEventResult] = useState<TaskEventResultViewModel | null>(null)
  const [sceneMedicalResult, setSceneMedicalResult] = useState<SceneMedicalResultViewModel | null>(null)
  const [sceneBatteryResult, setSceneBatteryResult] = useState<SceneBatteryResultViewModel | null>(null)
  const [sceneInventoryResult, setSceneInventoryResult] = useState<SceneInventoryResultViewModel | null>(null)
  const [hubLoadoutResult, setHubLoadoutResult] = useState<HubLoadoutResultViewModel | null>(null)
  const [hubMedicalResult, setHubMedicalResult] = useState<HubMedicalResultViewModel | null>(null)
  const [hubSurvivalResult, setHubSurvivalResult] = useState<HubSurvivalResultViewModel | null>(null)
  const [hubMaintenanceResult, setHubMaintenanceResult] = useState<HubMaintenanceResultViewModel | null>(null)
  const [dailySettlementResult, setDailySettlementResult] = useState<DailySettlementResultViewModel | null>(null)
  const [persistenceFeedback, setPersistenceFeedback] = useState<string | null>(null)
  const [activityEntries, setActivityEntries] = useState<readonly ActivityFeedEntry[]>([])
  const [autoOpenSearchResultNode, setAutoOpenSearchResultNode] = useState<string | null>(null)
  const [resultDetailsOpen, setResultDetailsOpen] = useState(false)
  const audioTimers = useRef<ReturnType<typeof setTimeout>[]>([])
  const pendingAction = interaction.actions.find(({ id }) => id === pendingActionId) ?? null
  const pendingPickup = interaction.pickupOpportunities.find(({ id }) => id === pendingPickupId) ?? null
  const pendingTaskEvent = interaction.taskEventOpportunities.find(({ id }) => id === pendingTaskEventId) ?? null
  const pendingInventory = interaction.inventoryOpportunities.find(({ id }) => id === pendingInventoryId) ?? null
  const pendingHubLoadout = interaction.hubLoadoutOpportunities.find(({ id }) => id === pendingHubLoadoutId) ?? null
  const pendingHubMaintenance = interaction.hubMaintenanceOpportunities.find(({ operation }) => operation === pendingHubMaintenanceOperation) ?? null
  const ghostActionId = focusedGhostActionId ?? hoveredGhostActionId
  const ghostAnchor = focusedGhostActionId ? focusedGhostAnchor : hoveredGhostAnchor
  const activeGhost = ghostActionId === null
    ? null
    : interaction.actions.find(({ id }) => id === ghostActionId)?.ghost ??
      interaction.taskEventOpportunities.find(({ id }) => id === ghostActionId)?.ghost ??
      null
  const activeCombatGhost = ghostActionId === null
    ? null
    : interaction.actions.find(({ id }) => id === ghostActionId)?.combatGhost ?? null
  const pickupPreview = pendingPickup === null ? null : previewStableRunUiPickupDraft(snapshot.phase, {
    opportunityId: pendingPickup.id,
    quantity: pickupQuantity,
    x: pickupX,
    y: pickupY,
    rotated: pickupRotated,
  }, presentationDependencies)
  const taskEventPreview = pendingTaskEvent === null ? null : previewStableRunUiTaskEventDraft(snapshot.phase, {
    opportunityId: pendingTaskEvent.id,
    x: taskEventX,
    y: taskEventY,
    rotated: taskEventRotated,
  }, presentationDependencies)
  const protectedTaskEventOpportunity = pendingTaskEventProtection === null
    ? null
    : interaction.taskEventOpportunities.find(
        ({ id }) => id === pendingTaskEventProtection.opportunityId,
      ) ?? null
  const protectedTaskEventPreview = pendingTaskEventProtection === null || protectedTaskEventOpportunity === null
    ? null
    : previewStableRunUiTaskEventDraft(snapshot.phase, {
        opportunityId: pendingTaskEventProtection.opportunityId,
        x: pendingTaskEventProtection.x,
        y: pendingTaskEventProtection.y,
        rotated: pendingTaskEventProtection.rotated,
      }, presentationDependencies)
  const protectedTaskEventAction = protectedTaskEventOpportunity === null || protectedTaskEventPreview === null
    ? null
    : createStableRunUiTaskEventDraftAction(
        protectedTaskEventOpportunity,
        protectedTaskEventPreview,
      )
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
  const hubMaintenancePreview = pendingHubMaintenance === null
    ? null
    : previewStableRunUiHubMaintenanceDraft(snapshot.phase, {
        operation: pendingHubMaintenance.operation,
        allocations: Object.entries(hubMaintenanceAllocations).map(([targetId, points]) => ({ targetId, points })),
        targetId: hubMaintenanceTargetId,
        materialSourceId: hubMaintenanceMaterialSourceId,
        secondaryMaterialSourceId: hubMaintenanceSecondarySourceId,
      }, presentationDependencies)

  useEffect(() => {
    setPendingActionId(null)
    setHoveredGhostActionId(null)
    setFocusedGhostActionId(null)
    setHoveredGhostAnchor(null)
    setFocusedGhostAnchor(null)
    setPendingPickupId(null)
    setPendingTaskEventId(null)
    setPendingTaskEventProtection(null)
    setPendingInventoryId(null)
    setPendingQuestDropConfirmation(false)
    setPendingHubLoadoutId(null)
    setPendingHubMaintenanceOperation(null)
    setReturnSummary(null)
    setReturnSummaryOpen(false)
    setCombatActionResult(null)
    setTaskEventResult(null)
    setSceneMedicalResult(null)
    setSceneBatteryResult(null)
    setSceneInventoryResult(null)
    setHubLoadoutResult(null)
    setHubMedicalResult(null)
    setHubSurvivalResult(null)
    setHubMaintenanceResult(null)
    setDailySettlementResult(null)
    setPersistenceFeedback(null)
    setActivityEntries([])
    setAutoOpenSearchResultNode(null)
    setResultDetailsOpen(false)
    voluntaryReturnStarted.current = false
  }, [store])

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
    if (pendingTaskEventProtection === null) return
    if (protectedTaskEventOpportunity === null || protectedTaskEventAction === null) {
      setPendingTaskEventProtection(null)
      return
    }
    if (
      taskEventProtectionFingerprint(protectedTaskEventAction) !==
      pendingTaskEventProtection.fingerprint
    ) {
      setPendingTaskEventProtection(null)
      setTaskEventX(pendingTaskEventProtection.x)
      setTaskEventY(pendingTaskEventProtection.y)
      setTaskEventRotated(pendingTaskEventProtection.rotated)
      setPendingTaskEventId(protectedTaskEventOpportunity.id)
    }
  }, [pendingTaskEventProtection, protectedTaskEventAction, protectedTaskEventOpportunity])

  useEffect(() => {
    if (pendingInventoryId !== null && pendingInventory === null) setPendingInventoryId(null)
  }, [pendingInventory, pendingInventoryId])

  useEffect(() => {
    if (pendingInventory === null || inventoryOperation !== 'drop' || !inventoryPreview?.questDropWarning) {
      setPendingQuestDropConfirmation(false)
    }
  }, [pendingInventory, inventoryOperation, inventoryPreview?.questDropWarning])

  useEffect(() => {
    if (pendingHubLoadoutId !== null && pendingHubLoadout === null) setPendingHubLoadoutId(null)
  }, [pendingHubLoadout, pendingHubLoadoutId])

  useEffect(() => {
    if (pendingHubMaintenanceOperation !== null && pendingHubMaintenance === null) setPendingHubMaintenanceOperation(null)
  }, [pendingHubMaintenance, pendingHubMaintenanceOperation])

  useEffect(() => {
    if (hoveredGhostActionId !== null && !interaction.actions.some(({ id }) => id === hoveredGhostActionId) && !interaction.taskEventOpportunities.some(({ id }) => id === hoveredGhostActionId)) {
      setHoveredGhostActionId(null)
    }
    if (focusedGhostActionId !== null && !interaction.actions.some(({ id }) => id === focusedGhostActionId) && !interaction.taskEventOpportunities.some(({ id }) => id === focusedGhostActionId)) {
      setFocusedGhostActionId(null)
    }
  }, [focusedGhostActionId, hoveredGhostActionId, interaction.actions, interaction.taskEventOpportunities])

  useEffect(() => () => {
    audioTimers.current.forEach((timer) => clearTimeout(timer))
    audioTimers.current = []
  }, [])

  const playCommittedCues = (
    beforePhase: Parameters<typeof projectStableRunPresentationCues>[0]['beforePhase'],
    action: StableRunUiAction,
    execution: Parameters<typeof projectStableRunPresentationCues>[0]['execution'],
  ) => {
    const player = presentationDependencies.audioPlayer
    if (!player) return
    const cues = projectStableRunPresentationCues({
      beforePhase,
      action,
      execution,
      assets: presentationDependencies.assets,
    })
    cues.forEach((cue, index) => {
      const play = () => playPresentationAudioCue(player, cue)
      if (index === 0) play()
      else audioTimers.current.push(setTimeout(play, 80 * index))
    })
  }

  const playUiSelection = (
    category: 'radio' | 'operation' | 'placement' | 'target',
  ) => {
    if (presentationDependencies.audioPlayer) {
      playPresentationAudioCue(
        presentationDependencies.audioPlayer,
        uiSelectionCueForCategory(category),
      )
    }
  }

  const applyDraftSelection = (
    changed: boolean,
    category: 'radio' | 'operation' | 'placement' | 'target',
    apply: () => void,
  ) => {
    if (changed) playUiSelection(category)
    apply()
  }

  const selectPickupQuantity = (value: number) => applyDraftSelection(
    value !== pickupQuantity,
    'operation',
    () => setPickupQuantity(value),
  )
  const selectPickupRotation = (value: boolean) => applyDraftSelection(
    value !== pickupRotated,
    'placement',
    () => setPickupRotated(value),
  )
  const selectPickupAnchor = (x: number, y: number) => applyDraftSelection(
    x !== pickupX || y !== pickupY,
    'placement',
    () => { setPickupX(x); setPickupY(y); setPickupPlacementSelected(true) },
  )
  const selectTaskEventRotation = (value: boolean) => applyDraftSelection(
    value !== taskEventRotated,
    'placement',
    () => setTaskEventRotated(value),
  )
  const selectTaskEventAnchor = (x: number, y: number) => applyDraftSelection(
    x !== taskEventX || y !== taskEventY,
    'placement',
    () => { setTaskEventX(x); setTaskEventY(y) },
  )
  const selectInventoryQuantity = (value: number | null) => applyDraftSelection(
    value !== inventoryQuantity,
    'operation',
    () => setInventoryQuantity(value),
  )
  const selectInventoryTarget = (value: string) => applyDraftSelection(
    value !== inventoryTargetId,
    'target',
    () => setInventoryTargetId(value),
  )
  const selectInventorySlot = (value: number) => applyDraftSelection(
    value !== inventoryTargetSlot,
    'target',
    () => setInventoryTargetSlot(value),
  )
  const selectInventoryRotation = (value: boolean) => applyDraftSelection(
    value !== inventoryRotated,
    'placement',
    () => setInventoryRotated(value),
  )
  const selectInventoryAnchor = (x: number, y: number) => applyDraftSelection(
    x !== inventoryX || y !== inventoryY,
    'placement',
    () => { setInventoryX(x); setInventoryY(y) },
  )
  const selectHubLoadoutQuantity = (value: number | null) => applyDraftSelection(
    value !== hubLoadoutQuantity,
    'operation',
    () => setHubLoadoutQuantity(value),
  )
  const selectHubLoadoutTarget = (value: string) => applyDraftSelection(
    value !== hubLoadoutTargetId,
    'target',
    () => setHubLoadoutTargetId(value),
  )
  const selectHubLoadoutEquipmentSlot = (value: 'weapon' | 'armor' | 'utility') => applyDraftSelection(
    value !== hubLoadoutEquipmentSlot,
    'target',
    () => setHubLoadoutEquipmentSlot(value),
  )
  const selectHubLoadoutQuickSlot = (value: number) => applyDraftSelection(
    value !== hubLoadoutQuickSlot,
    'target',
    () => setHubLoadoutQuickSlot(value),
  )
  const selectHubLoadoutRotation = (value: boolean) => applyDraftSelection(
    value !== hubLoadoutRotated,
    'placement',
    () => setHubLoadoutRotated(value),
  )
  const selectHubLoadoutAnchor = (x: number, y: number) => applyDraftSelection(
    x !== hubLoadoutX || y !== hubLoadoutY,
    'placement',
    () => { setHubLoadoutX(x); setHubLoadoutY(y) },
  )

  const showGhost = (actionId: string, source: 'mouse' | 'keyboard', anchor: HTMLElement) => {
    if (source === 'mouse') { setHoveredGhostActionId(actionId); setHoveredGhostAnchor(anchor) }
    else { setFocusedGhostActionId(actionId); setFocusedGhostAnchor(anchor) }
  }
  const hideGhost = (actionId: string, source: 'mouse' | 'keyboard') => {
    if (source === 'mouse') { setHoveredGhostActionId((current) => current === actionId ? null : current); setHoveredGhostAnchor(null) }
    else { setFocusedGhostActionId((current) => current === actionId ? null : current); setFocusedGhostAnchor(null) }
  }

  const dispatchAndRecord = (
    command: unknown,
    actionLabel: string,
    category: ActivityFeedCategory,
    beforePhase: typeof snapshot.phase,
  ) => {
    const execution = store.dispatch(command)
    setPendingActionId(null)
    setPendingPickupId(null)
    setPendingTaskEventId(null)
    setPendingTaskEventProtection(null)
    setPendingInventoryId(null)
    setPendingQuestDropConfirmation(false)
    setPendingHubLoadoutId(null)
    setPendingHubMaintenanceOperation(null)
    setHoveredGhostActionId(null)
    setFocusedGhostActionId(null)
    setHoveredGhostAnchor(null)
    setFocusedGhostAnchor(null)
    setReturnSummary(null)
    setReturnSummaryOpen(false)
    setCombatActionResult(null)
    setTaskEventResult(null)
    setSceneMedicalResult(null)
    setSceneBatteryResult(null)
    setSceneInventoryResult(null)
    setHubLoadoutResult(null)
    setHubMedicalResult(null)
    setHubSurvivalResult(null)
    setHubMaintenanceResult(null)
    setDailySettlementResult(null)
    setResultDetailsOpen(false)
    const before = createStableRunPlayerViewModel(beforePhase, presentationDependencies)
    const after = createStableRunPlayerViewModel(execution.phase, presentationDependencies)
    setActivityEntries((current) => [...current.slice(-29), projectActivityFeedEntry({
      sequence: (current.at(-1)?.sequence ?? 0) + 1,
      category,
      action: actionLabel,
      before,
      after,
    })])
    setPersistenceFeedback(execution.kind === 'executed'
      ? '✓ 操作已执行并保存'
      : '⚠ 保存失败：本次操作已在当前会话中生效，请勿刷新页面。')
    return execution
  }

  const executeAction = (actionId: string) => {
    const beforePhase = store.getState().phase
    const current = createStableRunUiInteractionModel(beforePhase, presentationDependencies)
    const action = current.actions.find(({ id }) => id === actionId)
    if (!action) {
      setPendingActionId(null)
      return
    }
    const hubCarePreview = action.kind === 'hub-medical' || action.kind === 'hub-survival'
      ? previewStableRunUiHubCareCommand(
          beforePhase,
          action.command,
          presentationDependencies,
        )
      : null
    const endDayPreview = action.kind === 'end-day'
      ? previewStableRunUiEndDay(beforePhase, presentationDependencies)
      : null
    if ((action.kind === 'hub-medical' || action.kind === 'hub-survival') && !hubCarePreview) {
      setPendingActionId(null)
      return
    }
    if (action.kind === 'end-day' && (!endDayPreview || !endDayPreview.canExecute)) {
      setPendingActionId(null)
      return
    }
    if (action.kind === 'scene-withdraw') voluntaryReturnStarted.current = true
    else if (action.kind !== 'settle-terminal-scene' && beforePhase.kind === 'scene-session') {
      voluntaryReturnStarted.current = false
    }
    const category: ActivityFeedCategory = action.kind === 'scene-combat-action' ? 'combat'
      : action.kind === 'scene-inventory' ? 'inventory'
      : action.kind === 'launch-main-scene' || action.kind === 'settle-terminal-scene' || action.kind === 'end-day' ? 'lifecycle'
      : action.kind.startsWith('hub-') ? 'hub' : 'scene'
    const execution = dispatchAndRecord(action.command, action.label, category, beforePhase)
    playCommittedCues(beforePhase, action, execution)
    setPendingActionId(null)
    if (action.kind === 'scene-main-search' && execution.phase.kind === 'scene-session') {
      const result = createStableRunPlayerViewModel(execution.phase, presentationDependencies)
      if (result.kind === 'scene-session' && result.scene.currentNodeSearchState === 'searched') {
        setAutoOpenSearchResultNode(result.scene.currentNodeName)
      }
    }
    if (
      action.kind === 'scene-combat-action' &&
      beforePhase.kind === 'scene-session' &&
      execution.phase.kind === 'scene-session'
    ) {
      setCombatActionResult(createCombatActionResultViewModel(
        beforePhase,
        execution.phase,
        action.label,
        execution.result,
        presentationDependencies,
      ))
    }
    if (
      action.kind === 'scene-task-event' &&
      beforePhase.kind === 'scene-session' &&
      execution.phase.kind === 'scene-session'
    ) {
      setTaskEventResult(createTaskEventResultViewModel(
        beforePhase,
        execution.phase,
        action.label,
        presentationDependencies,
      ))
    }
    if (
      action.kind === 'scene-medical' &&
      beforePhase.kind === 'scene-session' &&
      execution.phase.kind === 'scene-session'
    ) {
      setSceneMedicalResult(createSceneMedicalResultViewModel(
        beforePhase,
        execution.phase,
        action.label,
        execution.result,
        presentationDependencies,
      ))
    }
    if (
      action.kind === 'scene-battery' &&
      beforePhase.kind === 'scene-session' &&
      execution.phase.kind === 'scene-session'
    ) {
      setSceneBatteryResult(createSceneBatteryResultViewModel(
        beforePhase,
        execution.phase,
        action.label,
        execution.result,
        presentationDependencies,
      ))
    }
    if (
      action.kind === 'settle-terminal-scene' &&
      execution.phase.kind === 'current-day-hub' &&
      'runReturn' in execution.result
    ) {
      setReturnSummary(createReturnSummaryViewModel(
        execution.result.runReturn.summary,
        execution.phase,
        presentationDependencies,
        voluntaryReturnStarted.current,
      ))
      voluntaryReturnStarted.current = false
    }
    if (
      action.kind === 'hub-medical' &&
      hubCarePreview?.kind === 'hub-medical' &&
      execution.phase.kind === 'current-day-hub'
    ) {
      setHubMedicalResult(createHubMedicalResultViewModel(
        beforePhase,
        execution.phase,
        action.label,
        hubCarePreview.result,
      ))
    }
    if (
      action.kind === 'hub-survival' &&
      hubCarePreview?.kind === 'hub-survival' &&
      execution.phase.kind === 'current-day-hub'
    ) {
      setHubSurvivalResult(createHubSurvivalResultViewModel(
        beforePhase,
        execution.phase,
        action.label,
        hubCarePreview.result,
      ))
    }
    if (action.kind === 'end-day' && endDayPreview?.canExecute) {
      setDailySettlementResult(createDailySettlementResultViewModel(
        beforePhase,
        execution.phase,
        endDayPreview.result,
        presentationDependencies,
      ))
    }
  }
  const openAction = (actionId: string) => {
    const current = createStableRunUiInteractionModel(store.getState().phase, presentationDependencies)
    const action = current.actions.find(({ id }) => id === actionId)
    if (!action) return
    setSceneInventoryResult(null)
    setHubLoadoutResult(null)
    if (actionExecutionLevel(action, current.actions) !== 'direct') {
      setPendingActionId(actionId)
    } else {
      executeAction(actionId)
    }
  }
  const confirm = () => {
    if (pendingAction) executeAction(pendingAction.id)
  }
  const tryAutoPickup = (opportunityId: string, quantity: number) => {
    const beforePhase = store.getState().phase
    const opportunity = createStableRunUiInteractionModel(beforePhase, presentationDependencies).pickupOpportunities.find(({ id }) => id === opportunityId)
    if (!opportunity) { setPendingPickupId(null); return }
    const firstFit = firstFitUnrotatedNodePickup(beforePhase, opportunityId, quantity, presentationDependencies)
    if (firstFit?.canExecute && firstFit.command) {
      dispatchAndRecord(firstFit.command, `拾取 ${opportunity.name}`, 'inventory', beforePhase)
      return
    }
    setPickupQuantity(quantity)
    setPickupX(0)
    setPickupY(0)
    setPickupPlacementSelected(false)
    setPickupRotated(false)
    setPendingPickupId(opportunityId)
  }
  const openPickup = (opportunityId: string) => {
    const opportunity = createStableRunUiInteractionModel(store.getState().phase, presentationDependencies).pickupOpportunities.find(({ id }) => id === opportunityId)
    if (!opportunity) return
    setSceneInventoryResult(null)
    setPendingActionId(null)
    if (opportunity.groundQuantity === 1) { tryAutoPickup(opportunityId, 1); return }
    setPickupQuantity(1)
    setPickupX(0)
    setPickupY(0)
    setPickupPlacementSelected(false)
    setPickupRotated(false)
    setPendingPickupId(opportunityId)
  }
  const confirmPickup = (placement: Readonly<{ x: number; y: number }>) => {
    if (!pendingPickup) return
    const beforePhase = store.getState().phase
    const currentPreview = previewStableRunUiPickupDraft(beforePhase, {
      opportunityId: pendingPickup.id,
      quantity: pickupQuantity,
      x: placement.x,
      y: placement.y,
      rotated: pickupRotated,
    }, presentationDependencies)
    if (!currentPreview?.canExecute || currentPreview.command === null) return
    dispatchAndRecord(currentPreview.command, `拾取 ${pendingPickup.name}`, 'inventory', beforePhase)
    setPendingPickupId(null)
  }
  const openTaskEvent = (opportunityId: string) => {
    const opportunity = interaction.taskEventOpportunities.find(({ id }) => id === opportunityId)
    if (!opportunity) return
    if (!opportunity.requiresBackpackPlacement && opportunity.actionId !== null) {
      setPendingPickupId(null)
      setPendingTaskEventId(null)
      openAction(opportunity.actionId)
      return
    }
    setPendingActionId(null)
    setPendingPickupId(null)
    setPendingTaskEventProtection(null)
    setTaskEventX(null)
    setTaskEventY(null)
    setTaskEventRotated(false)
    setPendingTaskEventId(opportunityId)
  }
  const commitTaskEvent = (
    action: StableRunUiAction,
    beforePhase: typeof snapshot.phase,
  ) => {
    const execution = dispatchAndRecord(action.command, action.label, 'scene', beforePhase)
    if (beforePhase.kind === 'scene-session' && execution.phase.kind === 'scene-session') {
      setTaskEventResult(createTaskEventResultViewModel(
        beforePhase,
        execution.phase,
        action.label,
        presentationDependencies,
      ))
    }
  }
  const confirmTaskEvent = () => {
    if (!pendingTaskEvent) return
    const beforePhase = store.getState().phase
    const current = createStableRunUiInteractionModel(beforePhase, presentationDependencies)
    const opportunity = current.taskEventOpportunities.find(({ id }) => id === pendingTaskEvent.id)
    if (!opportunity) {
      setPendingTaskEventId(null)
      return
    }
    const currentPreview = previewStableRunUiTaskEventDraft(beforePhase, {
      opportunityId: opportunity.id,
      x: taskEventX,
      y: taskEventY,
      rotated: taskEventRotated,
    }, presentationDependencies)
    if (!currentPreview?.canExecute || currentPreview.command === null) {
      setPendingTaskEventId(null)
      return
    }
    const action = createStableRunUiTaskEventDraftAction(opportunity, currentPreview)
    if (action === null) {
      setPendingTaskEventId(null)
      return
    }
    if (actionExecutionLevel(action, current.actions) === 'protective-confirmation') {
      if (taskEventX === null || taskEventY === null) {
        setPendingTaskEventId(null)
        return
      }
      setPendingTaskEventProtection({
        opportunityId: opportunity.id,
        x: taskEventX,
        y: taskEventY,
        rotated: taskEventRotated,
        fingerprint: taskEventProtectionFingerprint(action),
      })
      setPendingTaskEventId(null)
      return
    }
    commitTaskEvent(action, beforePhase)
  }
  const confirmTaskEventProtection = () => {
    if (!pendingTaskEventProtection) return
    const beforePhase = store.getState().phase
    const current = createStableRunUiInteractionModel(beforePhase, presentationDependencies)
    const opportunity = current.taskEventOpportunities.find(
      ({ id }) => id === pendingTaskEventProtection.opportunityId,
    )
    const currentPreview = opportunity === undefined
      ? null
      : previewStableRunUiTaskEventDraft(beforePhase, {
          opportunityId: pendingTaskEventProtection.opportunityId,
          x: pendingTaskEventProtection.x,
          y: pendingTaskEventProtection.y,
          rotated: pendingTaskEventProtection.rotated,
        }, presentationDependencies)
    const action = opportunity === undefined || currentPreview === null
      ? null
      : createStableRunUiTaskEventDraftAction(opportunity, currentPreview)
    if (
      action === null ||
      taskEventProtectionFingerprint(action) !== pendingTaskEventProtection.fingerprint ||
      actionExecutionLevel(action, current.actions) !== 'protective-confirmation'
    ) {
      setPendingTaskEventProtection(null)
      if (opportunity !== undefined) {
        setTaskEventX(pendingTaskEventProtection.x)
        setTaskEventY(pendingTaskEventProtection.y)
        setTaskEventRotated(pendingTaskEventProtection.rotated)
        setPendingTaskEventId(opportunity.id)
      }
      return
    }
    commitTaskEvent(action, beforePhase)
  }
  const openInventory = (opportunityId: string, operation: StableRunUiInventoryOperation) => {
    const opportunity = interaction.inventoryOpportunities.find(({ id }) => id === opportunityId)
    if (!opportunity || !opportunity.operations.includes(operation)) return
    setSceneInventoryResult(null)
    setPendingActionId(null)
    setPendingPickupId(null)
    setPendingTaskEventId(null)
    setInventoryOperation(operation)
    setInventoryQuantity(null)
    setInventoryTargetId(null)
    setInventoryTargetSlot(null)
    setInventoryX(null)
    setInventoryY(null)
    setInventoryRotated(false)
    setPendingQuestDropConfirmation(false)
    if (operation === 'drop') {
      const beforePhase = store.getState().phase
      const preview = previewStableRunUiSceneInventoryDraft(beforePhase, { opportunityId, operation, quantity: null, targetOpportunityId: null, targetSlotIndex: null, x: null, y: null, rotated: false }, presentationDependencies)
      if (!preview?.canExecute || !preview.command) return
      if (!preview.questDropWarning) {
        dispatchAndRecord(preview.command, `${inventoryOperationLabel(operation)} · ${opportunity.sourceLabel}`, 'inventory', beforePhase)
        return
      }
      setPendingQuestDropConfirmation(true)
    }
    setPendingInventoryId(opportunityId)
  }
  const confirmInventory = (overrides: Readonly<{ x?: number; y?: number; targetSlotIndex?: number; targetOpportunityId?: string }> = {}) => {
    if (!pendingInventory || inventoryOperation === null) return
    const currentPreview = previewStableRunUiSceneInventoryDraft(store.getState().phase, {
      opportunityId: pendingInventory.id,
      operation: inventoryOperation,
      quantity: inventoryQuantity,
      targetOpportunityId: overrides.targetOpportunityId ?? inventoryTargetId,
      targetSlotIndex: overrides.targetSlotIndex ?? inventoryTargetSlot,
      x: overrides.x ?? inventoryX,
      y: overrides.y ?? inventoryY,
      rotated: inventoryRotated,
    }, presentationDependencies)
    if (!currentPreview || !currentPreview.canExecute || currentPreview.command === null) {
      return
    }
    if (currentPreview.questDropWarning && !pendingQuestDropConfirmation) {
      setPendingQuestDropConfirmation(true)
      return
    }
    const beforePhase = store.getState().phase
    const action = `${inventoryOperationLabel(inventoryOperation)} · ${pendingInventory.sourceLabel}`
    const execution = dispatchAndRecord(currentPreview.command, action, 'inventory', beforePhase)
    setPendingInventoryId(null)
    setPendingQuestDropConfirmation(false)
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
  const openHubLoadout = (opportunityId: string, operation: StableRunUiHubLoadoutOperation) => {
    const opportunity = interaction.hubLoadoutOpportunities.find(({ id }) => id === opportunityId)
    if (!opportunity || !opportunity.operations.includes(operation)) return
    setHubLoadoutResult(null)
    setPendingActionId(null)
    const beforePhase = store.getState().phase
    const directPreview = previewStableRunUiHubLoadoutDraft(beforePhase, { opportunityId, operation, quantity: null, targetOpportunityId: null, targetEquipmentSlot: null, targetQuickSlotIndex: null, x: null, y: null, rotated: false }, presentationDependencies)
    if (directPreview?.canExecute && directPreview.command && directPreview.safeResult) {
      dispatchAndRecord(directPreview.command, `${hubLoadoutOperationLabel(operation)} · ${opportunity.sourceLabel}`, 'inventory', beforePhase)
      return
    }
    setHubLoadoutOperation(operation)
    setHubLoadoutQuantity(null)
    setHubLoadoutTargetId(null)
    setHubLoadoutEquipmentSlot(null)
    setHubLoadoutQuickSlot(null)
    setHubLoadoutX(null)
    setHubLoadoutY(null)
    setHubLoadoutRotated(false)
    setPendingHubLoadoutId(opportunityId)
  }
  const confirmHubLoadout = (overrides: Readonly<{ x?: number; y?: number; targetOpportunityId?: string; targetEquipmentSlot?: 'weapon' | 'armor' | 'utility'; targetQuickSlotIndex?: number }> = {}) => {
    if (!pendingHubLoadout || !hubLoadoutOperation) return
    const beforePhase = store.getState().phase
    const currentPreview = previewStableRunUiHubLoadoutDraft(beforePhase, {
      opportunityId: pendingHubLoadout.id,
      operation: hubLoadoutOperation,
      quantity: hubLoadoutQuantity,
      targetOpportunityId: overrides.targetOpportunityId ?? hubLoadoutTargetId,
      targetEquipmentSlot: overrides.targetEquipmentSlot ?? hubLoadoutEquipmentSlot,
      targetQuickSlotIndex: overrides.targetQuickSlotIndex ?? hubLoadoutQuickSlot,
      x: overrides.x ?? hubLoadoutX,
      y: overrides.y ?? hubLoadoutY,
      rotated: hubLoadoutRotated,
    }, presentationDependencies)
    if (!currentPreview?.canExecute || !currentPreview.command || !currentPreview.safeResult) {
      return
    }
    const action = `${hubLoadoutOperationLabel(hubLoadoutOperation)} · ${pendingHubLoadout.sourceLabel}`
    const safeResult = currentPreview.safeResult
    const execution = dispatchAndRecord(currentPreview.command, action, 'inventory', beforePhase)
    setPendingHubLoadoutId(null)
    if (execution.phase.kind === 'current-day-hub') setHubLoadoutResult(createHubLoadoutResultViewModel(execution.phase, action, safeResult, presentationDependencies))
  }
  const openHubMaintenance = (operation: StableRunUiHubMaintenanceOpportunity['operation']) => {
    if (!interaction.hubMaintenanceOpportunities.some((candidate) => candidate.operation === operation)) return
    setPendingActionId(null)
    setPendingHubLoadoutId(null)
    setHubMaintenanceAllocations({})
    setHubMaintenanceTargetId(null)
    setHubMaintenanceMaterialSourceId(null)
    setHubMaintenanceSecondarySourceId(null)
    setPendingHubMaintenanceOperation(operation)
  }
  const confirmHubMaintenance = () => {
    if (!pendingHubMaintenance) return
    const beforePhase = store.getState().phase
    const currentPreview = previewStableRunUiHubMaintenanceDraft(beforePhase, {
      operation: pendingHubMaintenance.operation,
      allocations: Object.entries(hubMaintenanceAllocations).map(([targetId, points]) => ({ targetId, points })),
      targetId: hubMaintenanceTargetId,
      materialSourceId: hubMaintenanceMaterialSourceId,
      secondaryMaterialSourceId: hubMaintenanceSecondarySourceId,
    }, presentationDependencies)
    if (!currentPreview?.canExecute || !currentPreview.command || !currentPreview.safeResult) {
      setPendingHubMaintenanceOperation(null)
      return
    }
    const execution = dispatchAndRecord(currentPreview.command, pendingHubMaintenance.label, 'hub', beforePhase)
    setPendingHubMaintenanceOperation(null)
    if (execution.phase.kind === 'current-day-hub') {
      setHubMaintenanceResult(createHubMaintenanceResultViewModel(beforePhase, execution.phase, currentPreview.safeResult, presentationDependencies))
    }
  }
  return <>
    {persistenceFeedback && <p className="persistence-feedback" role="status">{persistenceFeedback}</p>}
    {model.kind === 'current-day-hub' && <HubView model={model} backgroundKey={presentationDependencies.assets?.hubBackgroundKey ?? null} actions={interaction.actions} onPreview={openAction} loadoutOpportunities={interaction.hubLoadoutOpportunities} onLoadout={openHubLoadout} maintenanceOpportunities={interaction.hubMaintenanceOpportunities} onMaintenance={openHubMaintenance} activityEntries={activityEntries} returnSummaryAvailable={returnSummary !== null} onViewReturnSummary={() => setReturnSummaryOpen(true)} detailsAvailable={!!(hubLoadoutResult || hubMedicalResult || hubSurvivalResult || hubMaintenanceResult)} onViewDetails={() => setResultDetailsOpen(true)} />}
    {model.kind === 'scene-session' && <SceneView model={model} actions={interaction.actions} ghost={activeGhost} combatGhost={activeCombatGhost} combatActionResult={combatActionResult} onCloseCombatResult={() => setCombatActionResult(null)} onPreview={openAction} onGhostEnter={showGhost} onGhostLeave={hideGhost} pickupOpportunities={interaction.pickupOpportunities} onPickup={openPickup} taskEventOpportunities={interaction.taskEventOpportunities} onTaskEvent={openTaskEvent} inventoryOpportunities={interaction.inventoryOpportunities} onInventory={openInventory} activityEntries={activityEntries} pendingWithdrawal={pendingAction?.kind === 'scene-withdraw' ? pendingAction : null} onCancelWithdrawal={() => setPendingActionId(null)} onConfirmWithdrawal={confirm} autoOpenSearchResultNode={autoOpenSearchResultNode} detailsAvailable={!!(sceneMedicalResult || sceneBatteryResult || sceneInventoryResult)} onViewDetails={() => setResultDetailsOpen(true)} />}
    {activeGhost && ghostAnchor && <AnchoredGhostPreview ghost={activeGhost} anchor={ghostAnchor} />}
    {model.kind === 'run-failure' && <FailureView
      model={model}
      onRequestNewRunSetup={onRequestNewRunSetup}
    />}
    {pendingAction && pendingAction.kind !== 'scene-withdraw' && <ActionPreviewDialog
      preview={pendingAction.preview}
      visualKey={pendingAction.visualKey}
      protective={actionExecutionLevel(pendingAction, interaction.actions) === 'protective-confirmation'}
      rescueAlternative={pendingAction.kind !== 'end-day' && actionExecutionLevel(pendingAction, interaction.actions) === 'protective-confirmation'}
      compactUnchanged={pendingAction.kind === 'end-day'}
      confirmLabel={pendingAction.kind === 'end-day' ? '确认结束本日' : actionExecutionLevel(pendingAction, interaction.actions) === 'protective-confirmation' ? '仍然执行' : '执行'}
      onCancel={() => setPendingActionId(null)}
      onConfirm={confirm}
    />}
    {pendingTaskEventProtection && protectedTaskEventAction && <ActionPreviewDialog
      preview={protectedTaskEventAction.preview}
      protective
      rescueAlternative
      compactUnchanged={false}
      confirmLabel="仍然执行"
      onCancel={() => setPendingTaskEventProtection(null)}
      onConfirm={confirmTaskEventProtection}
    />}
    {pendingPickup && model.kind === 'scene-session' && <PickupDialog opportunity={pendingPickup} loadout={model.scene.loadout} preview={pickupPreview} quantity={pickupQuantity} x={pickupX} y={pickupY} placementSelected={pickupPlacementSelected} rotated={pickupRotated} onQuantity={selectPickupQuantity} onRotate={selectPickupRotation} onAnchor={(x, y) => { selectPickupAnchor(x, y); confirmPickup({ x, y }) }} onAutoPlace={() => tryAutoPickup(pendingPickup.id, pickupQuantity)} onCancel={() => setPendingPickupId(null)} />}
    {pendingTaskEvent && model.kind === 'scene-session' && <TaskEventDialog opportunity={pendingTaskEvent} loadout={model.scene.loadout} preview={taskEventPreview} x={taskEventX} y={taskEventY} rotated={taskEventRotated} onRotate={selectTaskEventRotation} onAnchor={selectTaskEventAnchor} onCancel={() => setPendingTaskEventId(null)} onConfirm={confirmTaskEvent} />}
    {pendingInventory && model.kind === 'scene-session' && <SceneInventoryDialog opportunity={pendingInventory} opportunities={interaction.inventoryOpportunities} loadout={model.scene.loadout} operation={inventoryOperation} quantity={inventoryQuantity} targetOpportunityId={inventoryTargetId} targetSlotIndex={inventoryTargetSlot} x={inventoryX} y={inventoryY} rotated={inventoryRotated} preview={inventoryPreview} onQuantity={selectInventoryQuantity} onTargetOpportunity={(id) => { selectInventoryTarget(id); confirmInventory({ targetOpportunityId: id }) }} onTargetSlot={(index) => { selectInventorySlot(index); confirmInventory({ targetSlotIndex: index }) }} onAnchor={(x, y) => { selectInventoryAnchor(x, y); confirmInventory({ x, y }) }} onRotate={selectInventoryRotation} onCancel={() => setPendingInventoryId(null)} />}
    {pendingQuestDropConfirmation && pendingInventory && inventoryPreview?.questDropWarning && <div className="protective-surface" role="presentation"><section className="preview-dialog" role="dialog" aria-modal="false" aria-label="任务物丢弃确认"><h2>确认丢弃任务关键物</h2><p className="preview-warning">{pendingInventory.sourceLabel}将留在当前节点，不会自动进入任务储存区。</p><div className="preview-controls"><button type="button" onClick={() => setPendingQuestDropConfirmation(false)}>返回选择</button><button type="button" className="confirm-action" onClick={() => confirmInventory()}>仍然丢弃</button></div></section></div>}
    {pendingHubLoadout && model.kind === 'current-day-hub' && <HubLoadoutDialog opportunity={pendingHubLoadout} opportunities={interaction.hubLoadoutOpportunities} loadout={model.loadout} operation={hubLoadoutOperation} quantity={hubLoadoutQuantity} targetOpportunityId={hubLoadoutTargetId} targetEquipmentSlot={hubLoadoutEquipmentSlot} targetQuickSlotIndex={hubLoadoutQuickSlot} x={hubLoadoutX} y={hubLoadoutY} rotated={hubLoadoutRotated} preview={hubLoadoutPreview} onQuantity={selectHubLoadoutQuantity} onTargetOpportunity={(id) => { selectHubLoadoutTarget(id); if (hubLoadoutOperation === 'merge-backpack-stacks') confirmHubLoadout({ targetOpportunityId: id }) }} onTargetEquipmentSlot={(slot) => { selectHubLoadoutEquipmentSlot(slot); confirmHubLoadout({ targetEquipmentSlot: slot }) }} onTargetQuickSlotIndex={(index) => { selectHubLoadoutQuickSlot(index); confirmHubLoadout({ targetQuickSlotIndex: index }) }} onAnchor={(x, y) => { selectHubLoadoutAnchor(x, y); confirmHubLoadout({ x, y }) }} onRotate={selectHubLoadoutRotation} onCancel={() => setPendingHubLoadoutId(null)} />}
    {pendingHubMaintenance && model.kind === 'current-day-hub' && <HubMaintenanceDialog opportunity={pendingHubMaintenance} allocations={hubMaintenanceAllocations} targetId={hubMaintenanceTargetId} materialSourceId={hubMaintenanceMaterialSourceId} secondaryMaterialSourceId={hubMaintenanceSecondarySourceId} preview={hubMaintenancePreview} onAllocation={(targetId, points) => setHubMaintenanceAllocations((current) => ({ ...current, [targetId]: points }))} onTarget={setHubMaintenanceTargetId} onMaterialSource={setHubMaintenanceMaterialSourceId} onSecondaryMaterialSource={setHubMaintenanceSecondarySourceId} onCancel={() => setPendingHubMaintenanceOperation(null)} onConfirm={confirmHubMaintenance} />}
    {returnSummary && returnSummaryOpen && <ReturnSummaryDialog summary={returnSummary} onClose={() => setReturnSummaryOpen(false)} />}
    {taskEventResult && <TaskEventResultDialog result={taskEventResult} onClose={() => setTaskEventResult(null)} />}
    {resultDetailsOpen && sceneMedicalResult && <SceneMedicalResultDialog result={sceneMedicalResult} onClose={() => setResultDetailsOpen(false)} />}
    {resultDetailsOpen && sceneBatteryResult && <SceneBatteryResultDialog result={sceneBatteryResult} onClose={() => setResultDetailsOpen(false)} />}
    {resultDetailsOpen && sceneInventoryResult && <SceneInventoryResultDialog result={sceneInventoryResult} onClose={() => setResultDetailsOpen(false)} />}
    {resultDetailsOpen && hubLoadoutResult && <HubLoadoutResultDialog result={hubLoadoutResult} onClose={() => setResultDetailsOpen(false)} />}
    {resultDetailsOpen && hubMedicalResult && <HubMedicalResultDialog result={hubMedicalResult} onClose={() => setResultDetailsOpen(false)} />}
    {resultDetailsOpen && hubSurvivalResult && <HubSurvivalResultDialog result={hubSurvivalResult} onClose={() => setResultDetailsOpen(false)} />}
    {resultDetailsOpen && hubMaintenanceResult && <HubMaintenanceResultDialog result={hubMaintenanceResult} onClose={() => setResultDetailsOpen(false)} />}
    {dailySettlementResult && <DailySettlementResultDialog result={dailySettlementResult} onClose={() => setDailySettlementResult(null)} />}
    {import.meta.env.DEV && <DevInspector phase={snapshot.phase} />}
  </>
}
