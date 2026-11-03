import { useId, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import type { PlayerItem } from '../../../state/residence-session/player-types'
import { infectedWorldUiCatalog } from '../../../content/infected-world-v0.1/player-ui-catalog'
import { publicItemName, resourceName } from '../labels'

export function itemPurpose(name: string) {
  return infectedWorldUiCatalog.itemDescriptions[name as keyof typeof infectedWorldUiCatalog.itemDescriptions] ?? '查看占格、重量和实际容器，携带与使用由当前正式操作决定。'
}
export function ShortHint({ anchor, children, id }: { anchor: HTMLElement; children: ReactNode; id?: string }) {
  if (!anchor.isConnected) return null
  const r = anchor.getBoundingClientRect(), width = Math.min(350, window.innerWidth - 24)
  const left = Math.max(12, Math.min(r.left, window.innerWidth - width - 12))
  const top = r.bottom + 185 < window.innerHeight ? r.bottom + 8 : Math.max(12, r.top - 180)
  return createPortal(<div role="tooltip" id={id} className="iw-short-hint" style={{ left, top, width }}>{children}</div>, document.body)
}
/** display:contents preserves real grid item placement; it adds no inventory owner. */
export function ItemHint({ item, children }: { item: PlayerItem; children: ReactNode }) {
  const [hint, setHint] = useState<{ anchor: HTMLElement; selector: PlayerItem['selector'] } | null>(null), id = useId()
  const setAnchor = (anchor: HTMLElement | null) => setHint(anchor ? { anchor, selector: item.selector } : null)
  const open = (target: EventTarget) => { if (target instanceof HTMLElement) setAnchor(target.closest('button') ?? target) }
  return <span className="iw-item-hint" style={{ display: 'contents' }} onMouseOver={e => open(e.target)} onMouseOut={() => setAnchor(null)}
    onFocus={e => open(e.target)} onBlur={() => setAnchor(null)} onClick={() => setAnchor(null)} onContextMenu={() => setAnchor(null)}>
    {children}{hint?.selector === item.selector && <ShortHint anchor={hint.anchor} id={id}><strong>{publicItemName(item.name)}</strong><p>{itemPurpose(item.name)}</p><small>{item.width}×{item.height} · 单位重量 {item.unitWeight}{item.resource.kind !== 'none' ? ` · ${resourceName(item.resource.kind)} ${item.resource.current}/${item.resource.maximum}` : ''}</small></ShortHint>}
  </span>
}
