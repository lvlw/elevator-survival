import type { CSSProperties } from 'react'
import type { PlayerItem } from '../../../state/residence-session/player-types'
import { itemImage, itemPlaceholder } from '../assets'
import { resourceName, publicItemName } from '../labels'

export function ItemTile({ item, style, onMenu }: { item: PlayerItem; style?: CSSProperties;
  onMenu?: (item: PlayerItem, x: number, y: number, trigger: HTMLButtonElement) => void }) {
  const description = `${publicItemName(item.name)}${item.quantity > 1 ? ` ×${item.quantity}` : ''} · ${item.width}×${item.height} · 单位重量 ${item.unitWeight}` +
    (item.resource.kind === 'none' ? '' : ` · ${resourceName(item.resource.kind)} ${item.resource.current}/${item.resource.maximum}`)
  return <button type="button" className="iw-item" style={style} aria-label={description} title={description}
    aria-haspopup={onMenu ? 'menu' : undefined} onContextMenu={event => {
      if (onMenu) { event.preventDefault(); onMenu(item, event.clientX, event.clientY, event.currentTarget) }
    }} onKeyDown={event => {
      if (onMenu && (event.key === 'ContextMenu' || (event.shiftKey && event.key === 'F10') || event.key === 'Enter')) {
        event.preventDefault(); const box = event.currentTarget.getBoundingClientRect(); onMenu(item, box.left, box.bottom, event.currentTarget)
      }
    }}>
    <img src={itemImage(item.name)} alt="" aria-hidden="true" onError={event => { if (event.currentTarget.src !== itemPlaceholder) event.currentTarget.src = itemPlaceholder }} />
    {item.quantity > 1 && <span className="iw-item-quantity">{item.quantity}</span>}
    {item.resource.kind !== 'none' && <meter className="iw-item-resource" aria-label={`${publicItemName(item.name)} ${resourceName(item.resource.kind)}`} min={0} max={item.resource.maximum} value={item.resource.current} />}
  </button>
}
