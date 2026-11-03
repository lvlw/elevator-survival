import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import type { BrowserControls } from '../../../app/infected-browser/types'
import type { PlayerAction, PlayerHandle, PlayerItem, PlayerReadyView } from '../../../state/residence-session/player-types'
import { itemImage, itemPlaceholder } from '../assets'
import { actionName, publicItemName, resourceName } from '../labels'
import { ContentLayer } from './content-layer'
import { ActionButton } from './action-information'
import { itemPurpose } from '../story-interaction/short-hint'

const Inspect = createContext<((item: PlayerItem, trigger: HTMLElement) => void) | null>(null)
export const useItemInspection = () => useContext(Inspect)

/** One current public item image. Old errors cannot change a different URL's presentation. */
export function ItemPicture({ name, className }: { name: string; className?: string }) {
  const src = itemImage(name), [failed, setFailed] = useState<string | null>(null)
  const current = failed === src ? itemPlaceholder : src
  return <img key={src} className={className} src={current} alt="" aria-hidden="true" onError={() => { if (current !== itemPlaceholder) setFailed(src) }} />
}

export function ItemInspectionProvider({ view, describeAction, onAction, children }: {
  view: PlayerReadyView; describeAction: BrowserControls['describeAction'];
  onAction(action: PlayerAction, item?: PlayerItem): void; children: ReactNode
}) {
  const [selection, setSelection] = useState<{ selector: PlayerHandle; trigger: HTMLElement } | null>(null)
  const mayRestore = useRef(true)
  const item = selection ? [...view.carried, ...view.ground].find(candidate => candidate.selector === selection.selector) : null
  if (selection && !item) mayRestore.current = false
  useEffect(() => { if (selection && !item) setSelection(null) }, [selection, item])
  const actions = item ? view.actions.filter(action => ['inventory', 'task-transfer', 'medical', 'maintenance'].includes(action.family) &&
    describeAction(action.selector).items.some(candidate => candidate.selector === item.selector)) : []
  return <Inspect.Provider value={(item, trigger) => { mayRestore.current = true; setSelection({ selector: item.selector, trigger }) }}>
    {children}
    {selection && item && <ContentLayer title={`${publicItemName(item.name)} · 详情`} tier="detail" onClose={() => setSelection(null)} restoreFocus={() => mayRestore.current}>
      <div className="iw-item-details"><div className="iw-artwell"><ItemPicture name={item.name} /></div><div><h3>{publicItemName(item.name)}</h3><dl>
        <dt>数量</dt><dd>{item.quantity}</dd><dt>占格</dt><dd>{item.width}×{item.height}{item.placement?.rotated ? ' · 已旋转' : ''}</dd>
        <dt>单位重量</dt><dd>{item.unitWeight}</dd><dt>当前位置</dt><dd>{({ backpack: '背包', quick: '快捷位', ground: '当前地面', weapon: '武器', armor: '防具', utility: '实用装备' })[item.container]}</dd>
        {item.resource.kind !== 'none' && <><dt>{resourceName(item.resource.kind)}</dt><dd>{item.resource.current} / {item.resource.maximum}</dd></>}
      </dl><p>{itemPurpose(item.name)}</p><p className="iw-muted">操作绑定当前实际物品；查看不支付成本，不自动选择数量、材料或位置。</p></div></div>
      {actions.length > 0 && <div className="iw-actions iw-detail-actions">{actions.map((action, index) => <ActionButton key={index} action={action} item={item} onAction={() => onAction(action, item)}>{actionName(action)}</ActionButton>)}</div>}
    </ContentLayer>}
  </Inspect.Provider>
}
