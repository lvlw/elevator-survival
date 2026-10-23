import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import type { BrowserControls } from '../../../app/infected-browser/types'
import { BrowserOwnerError } from '../../../app/infected-browser/errors'
import { isPlayerBusinessError } from '../../../state/residence-session/player-errors'
import type { PlayerAction, PlayerItem, PlayerReadyView } from '../../../state/residence-session/player-types'
import { currentActions } from '../interaction'
import { actionName, publicItemName } from '../labels'
import { SafeFacts } from './confirmation-layer'
import { DetailsPopover } from './details-popover'

type Information = { action: PlayerAction; item?: PlayerItem; anchor: HTMLElement; controls: BrowserControls; focus: boolean }
const Context = createContext<{ show(action: PlayerAction, anchor: HTMLElement, focus: boolean, item?: PlayerItem): void; dismiss(restore?: boolean): void } | null>(null)
const fieldNames = { item: '实际物品', targetItem: '目标堆叠', quantity: '数量', placement: '格位与旋转', placements: '每件产物的格位与旋转',
  slot: '快捷位', wound: '适用时的伤口', target: '适用时的处理目标', materials: '实际材料与用量', allocations: '目标与总池分配' }

function InformationBody({ action, item, controls }: { action: PlayerAction; item?: PlayerItem; controls: BrowserControls }) {
  try {
    const inputs = controls.describeAction(action.selector)
    return <><h2>{actionName(action)}{item ? ` · ${publicItemName(item.name)}` : ''}</h2>{inputs.fields.length === 0 ? <SafeFacts metadata={controls.preview({ action: action.selector })} /> : <>
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
  const valid = selection && selection.controls === controls && currentActions(view).some(a => a.selector === selection.action.selector) &&
    (!selection.item || [...view.carried, ...view.ground].some(i => i.selector === selection.item!.selector))
  useEffect(() => { if (selection && !valid) setSelection(null) }, [selection, valid])
  function dismiss(restore = true) {
    if (restore && selection?.anchor.isConnected) selection.anchor.focus({ preventScroll: true })
    setSelection(null)
  }
  return <Context.Provider value={{ show: (action, anchor, focus, item) => setSelection({ action, item, anchor, focus, controls }), dismiss }}>
    {children}{selection && valid && <DetailsPopover anchor={selection.anchor} focusOnOpen={selection.focus} onClose={() => dismiss()}>
      <InformationBody action={selection.action} item={selection.item} controls={controls} />
    </DetailsPopover>}
  </Context.Provider>
}

export function ActionButton({ action, onAction, children, ariaLabel, item, className }: { action: PlayerAction; onAction: () => void; children?: ReactNode; ariaLabel?: string; item?: PlayerItem; className?: string }) {
  const information = useContext(Context)
  return <span className="iw-action-entry"><button type="button" className={className} aria-label={ariaLabel}
    onMouseEnter={e => information?.show(action, e.currentTarget, false, item)} onFocus={e => information?.show(action, e.currentTarget, false, item)}
    onClick={() => { information?.dismiss(false); onAction() }}>{children ?? actionName(action)}</button>
    <button className="iw-information-trigger" type="button" aria-label={`查看${actionName(action)}说明`} aria-haspopup="dialog"
      onMouseEnter={e => information?.show(action, e.currentTarget, false, item)} onFocus={e => information?.show(action, e.currentTarget, false, item)}
      onClick={e => information?.show(action, e.currentTarget, true, item)}>ⓘ</button>
  </span>
}
