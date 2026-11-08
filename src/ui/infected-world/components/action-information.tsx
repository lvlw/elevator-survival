import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import type { BrowserControls } from '../../../app/infected-browser/types'
import { BrowserOwnerError } from '../../../app/infected-browser/errors'
import { isPlayerBusinessError } from '../../../state/residence-session/player-errors'
import type { PlayerAction, PlayerItem, PlayerReadyView } from '../../../state/residence-session/player-types'
import { currentActions } from '../interaction'
import { actionName, publicItemName } from '../labels'
import { SafeFacts } from './confirmation-layer'
import { DetailsPopover } from './details-popover'
import { ShortHint, itemPurpose } from '../story-interaction/short-hint'
import { ActionGlyphImage } from '../asset-slots'
import { uniqueToolRequest } from '../story-interaction/unique-tool'

type Information = { action: PlayerAction; item?: PlayerItem; anchor: HTMLElement; controls: BrowserControls; focus: boolean; ordinal?: number }
const Context = createContext<{ show(action: PlayerAction, anchor: HTMLElement, focus: boolean, item?: PlayerItem): void;
  short(action: PlayerAction, anchor: HTMLElement, item?: PlayerItem): void; hideShort(): void; dismiss(restore?: boolean): void } | null>(null)
const fieldNames = { item: '实际物品', targetItem: '目标堆叠', quantity: '数量', placement: '格位与旋转', placements: '每件产物的格位与旋转',
  slot: '快捷位', wound: '适用时的伤口', target: '适用时的处理目标', materials: '实际材料与用量', allocations: '目标与总池分配' }

function InformationBody({ action, item, controls }: { action: PlayerAction; item?: PlayerItem; controls: BrowserControls }) {
  try {
    const inputs = controls.describeAction(action.selector)
    const complete = inputs.fields.length === 0 ? { action: action.selector } : uniqueToolRequest(action, inputs, item)
    return <><h2>{actionName(action)}{item ? ` · ${publicItemName(item.name)}` : ''}</h2>{complete ? <SafeFacts metadata={controls.preview(complete)} /> : <>
      <p>本动作需要明确选择：{inputs.fields.map(f => fieldNames[f]).join('、')}。输入齐备后再显示正式预览；不会自动填入。</p>
      {inputs.hints.map(text => <p key={text}>{text}</p>)}
      {inputs.items.length > 0 && <p>可选物品：{inputs.items.map(i => publicItemName(i.name)).join('、')}</p>}
      {inputs.materials.map((m, n) => <p key={n}>需要：{publicItemName(m.name)} ×{m.quantity}</p>)}
      {inputs.allocation && <p>机械维修共享总池：{inputs.allocation.pool}；分配需明确选择。</p>}
      {inputs.outputs.map((o, n) => <p key={n}>声明产物：{publicItemName(o.name)} ×{o.quantity}，{o.width}×{o.height}，单件重量{o.unitWeight}。</p>)}
    </>}</>
  } catch (error) {
    if (error instanceof BrowserOwnerError || isPlayerBusinessError(error)) return <p>说明对应的选择已失效，请重新选择。</p>
    throw error
  }
}

/** Session-local open reference only; facts are queried on render, never cached as a second truth. */
export function ActionInformationProvider({ view, controls, children }: { view: PlayerReadyView; controls: BrowserControls; children: ReactNode }) {
  const [selection, setSelection] = useState<Information | null>(null)
  const [hint, setHint] = useState<Information | null>(null)
  const informationOrdinal = useRef(0)
  const valid = selection && selection.controls === controls && currentActions(view).some(a => a.selector === selection.action.selector) &&
    (!selection.item || [...view.carried, ...view.ground].some(i => i.selector === selection.item!.selector))
  useEffect(() => { if (selection && !valid) setSelection(null) }, [selection, valid])
  const hintValid = hint && hint.controls === controls && currentActions(view).some(a => a.selector === hint.action.selector) &&
    (!hint.item || [...view.carried, ...view.ground].some(i => i.selector === hint.item!.selector))
  function dismiss(restore = true) {
    if (restore && selection?.anchor.isConnected) selection.anchor.focus({ preventScroll: true })
    setSelection(null)
    setHint(null)
  }
  return <Context.Provider value={{ show: (action, anchor, focus, item) => { setHint(null); setSelection({ action, item, anchor, focus, controls, ordinal: ++informationOrdinal.current }) },
    short: (action, anchor, item) => setHint({ action, item, anchor, focus: false, controls }), hideShort: () => setHint(null), dismiss }}>
    {hint && hintValid && !selection && <ShortHint anchor={hint.anchor}><BriefAction action={hint.action} item={hint.item} controls={controls} /></ShortHint>}
    {children}{selection && valid && <DetailsPopover key={selection.ordinal} anchor={selection.anchor} focusOnOpen={selection.focus} onClose={() => dismiss()}>
      <InformationBody action={selection.action} item={selection.item} controls={controls} />
    </DetailsPopover>}
  </Context.Provider>
}

function BriefAction({ action, item, controls }: { action: PlayerAction; item?: PlayerItem; controls: BrowserControls }) {
  try {
    const inputs = controls.describeAction(action.selector)
    const request = inputs.fields.length === 0 ? { action: action.selector } : uniqueToolRequest(action, inputs, item)
    const metadata = request ? controls.preview(request) : null
    return <><strong>{actionName(action)}</strong>{item && <p>{itemPurpose(item.name)}</p>}
      {metadata ? <><p>{metadata.qualification.cost === null ? '完整成本待确认' : `精力消耗：${metadata.qualification.cost}`}</p>
        {metadata.facts?.resources.map((r, n) => <p key={n}>{publicItemName(r.name)}：{r.before} → {r.after}（预览支付{r.consumed}）</p>)}
        <p>{metadata.qualification.kind === 'unavailable' ? '当前不能执行' : metadata.qualification.kind === 'unknown' ? '目标资格未知' : metadata.death.kind === 'guaranteed' ? '此行动必死，仍须正式保护确认' : '完整后果见 F1 说明'}</p></> : <p>需明确选择{inputs.fields.map(f => fieldNames[f]).join('、')}。</p>}
      <small>F1 查看完整说明 · 查看不执行</small></>
  } catch (error) {
    if (error instanceof BrowserOwnerError || isPlayerBusinessError(error)) return <p>选择已失效，请重新选择。</p>
    throw error
  }
}

export function ActionButton({ action, onAction, children, ariaLabel, item, className, compactCost = false }: { action: PlayerAction; onAction: () => void; children?: ReactNode; ariaLabel?: string; item?: PlayerItem; className?: string; compactCost?: boolean }) {
  const information = useContext(Context)
  return <span className="iw-action-entry"><button type="button" className={className} aria-label={ariaLabel}
    onMouseEnter={e => information?.short(action, e.currentTarget, item)} onMouseLeave={() => information?.hideShort()}
    onFocus={e => information?.short(action, e.currentTarget, item)} onBlur={() => information?.hideShort()}
    onKeyDown={event => { if (event.key === 'F1') { event.preventDefault(); information?.show(action, event.currentTarget, true, item) } }}
    onClick={() => { information?.dismiss(false); onAction() }}><ActionGlyphImage family={action.family} />{children ?? actionName(action)}
    {compactCost && action.cost !== null && <span className="iw-action-cost" title="精力消耗" aria-label={`精力消耗 ${action.cost}`}>{action.cost}</span>}</button>
  </span>
}
