import type { CSSProperties } from 'react'
import type { PlayerItem } from '../../../state/residence-session/player-types'
import { ItemPicture, useItemInspection } from './item-inspection'
import { resourceName, publicItemName } from '../labels'

export function ItemTile({ item, style, onMenu }: { item: PlayerItem; style?: CSSProperties;
  onMenu?: (item: PlayerItem, x: number, y: number, trigger: HTMLButtonElement) => void }) {
  const description = `${publicItemName(item.name)}${item.quantity > 1 ? ` ×${item.quantity}` : ''} · ${item.width}×${item.height} · 单位重量 ${item.unitWeight}` +
    (item.resource.kind === 'none' ? '' : ` · ${resourceName(item.resource.kind)} ${item.resource.current}/${item.resource.maximum}`)
  const inspect = useItemInspection()
  return <button type="button" className={`iw-item${item.placement?.rotated ? ' iw-item--rotated' : ''}`} style={style} aria-label={description} title={description}
    onClick={event => inspect?.(item, event.currentTarget)}
    aria-haspopup={onMenu ? 'menu' : undefined} onContextMenu={event => {
      if (onMenu) { event.preventDefault(); onMenu(item, event.clientX, event.clientY, event.currentTarget) }
    }} onKeyDown={event => {
      if (onMenu && (event.key === 'ContextMenu' || (event.shiftKey && event.key === 'F10'))) {
        event.preventDefault(); const box = event.currentTarget.getBoundingClientRect(); onMenu(item, box.left, box.bottom, event.currentTarget)
      }
    }}>
    <ItemPicture name={item.name} />
    {item.quantity > 1 && <span className="iw-item-quantity">{item.quantity}</span>}
    {item.resource.kind !== 'none' && <meter className="iw-item-resource" aria-label={`${publicItemName(item.name)} ${resourceName(item.resource.kind)}`} min={0} max={item.resource.maximum} value={item.resource.current} />}
  </button>
}
