import { useEffect, useState } from 'react'
import type { PlayerAction, PlayerItem, PlayerReadyView } from '../../../state/residence-session/player-types'
import type { BrowserControls } from '../../../app/infected-browser/types'
import { ContextMenu } from './context-menu'
import { ItemTile } from './item-tile'
import { loadName, publicItemName, resourceName } from '../labels'
import { itemMenuActions } from '../menu-options'
import { ItemHint } from '../story-interaction/short-hint'
import { bagOccupancy } from '../owner-playtest-ux/bag-occupancy'

type Menu = { view: PlayerReadyView; item: PlayerItem; x: number; y: number; trigger: HTMLButtonElement }
const equipment = [['weapon', '武器'], ['armor', '防具'], ['utility', '实用装备']] as const

export function InventoryPanel({ view, onAction, describeAction }: {
  view: PlayerReadyView; onAction(action: PlayerAction, item?: PlayerItem): void; describeAction: BrowserControls['describeAction']
}) {
  const [menu, setMenu] = useState<Menu | null>(null)
  const activeMenu = menu?.view === view ? menu : null
  useEffect(() => { setMenu(null) }, [view])
  const closeMenu = () => { activeMenu?.trigger.focus(); setMenu(null) }
  const showMenu = (item: PlayerItem, x: number, y: number, trigger: HTMLButtonElement) => setMenu({ view, item, x, y, trigger })
  const menuActions = (item: PlayerItem) => itemMenuActions(view, item, describeAction)
  const { width, height, load, weight } = view.backpack
  const bagItems = view.carried.filter(item => item.container === 'backpack')

  return <aside className="iw-inventory" aria-label="装备与背包">
    <header><h2>携带</h2><span>重量 {weight} · {loadName(load)}</span></header>
    <section className="iw-equipped-area" aria-label="装备">
      <h3>装备</h3>
      <div className="iw-equipment">{equipment.map(([container, label]) => {
        const item = view.carried.find(candidate => candidate.container === container)
        return <div key={container}>
          <strong>{label}</strong>
          {item ? <>
            <ItemHint item={item}><ItemTile item={item} /></ItemHint>
            <span className="iw-equipped-name">{publicItemName(item.name)}</span>
            {item.resource.kind !== 'none' && <small className="iw-equipped-resource">
              {resourceName(item.resource.kind)} {item.resource.current} / {item.resource.maximum}
            </small>}
          </> : <span className="iw-empty-slot">未装备</span>}
        </div>
      })}</div>
    </section>
    <section className="iw-bag-area" aria-label="背包">
      <header><h3>背包</h3><span className="iw-bag-capacity">格位 {bagOccupancy(bagItems)} / {width * height}</span></header>
      <div className="iw-grid" aria-label="背包格位" style={{
        gridTemplateColumns: `repeat(${width}, minmax(0, 1fr))`,
        gridTemplateRows: `repeat(${height}, minmax(0, 1fr))`, aspectRatio: `${width} / ${height}`,
      }}>
        {Array.from({ length: width * height }, (_, index) => <span key={`cell-${index}`} className="iw-grid-cell" aria-hidden="true"
          style={{ gridColumn: index % width + 1, gridRow: Math.floor(index / width) + 1 }} />)}
        {bagItems.map((item, index) => {
          const xs = item.footprint.map(cell => cell.x), ys = item.footprint.map(cell => cell.y)
          return <ItemHint key={index} item={item}><ItemTile item={item} onMenu={menuActions(item).length ? showMenu : undefined} style={{
            gridColumn: `${Math.min(...xs) + 1} / ${Math.max(...xs) + 2}`,
            gridRow: `${Math.min(...ys) + 1} / ${Math.max(...ys) + 2}`,
          }} /></ItemHint>
        })}
      </div>
      <p className="iw-carry-hint">{view.point === 'battle-decision' ? '战斗中只读，快捷用药请使用舞台行动。' :
        view.phase === 'active-world' ? '点击查看物品。右键或 Shift+F10 整理。' : '点击物品可查看用途和状态。'}</p>
    </section>
    <section className="iw-quick-area" aria-label="快捷位">
      <h3>快捷位</h3>
      <div className="iw-quick" aria-label="快捷栏">{[0, 1].map(slot => {
        const item = view.carried.find(candidate => candidate.container === 'quick' && candidate.slot === slot)
        return <div key={slot}><span>快捷 {slot + 1}</span>{item ? <>
          <ItemHint item={item}><ItemTile item={item} onMenu={menuActions(item).length ? showMenu : undefined} /></ItemHint>
          <small>{publicItemName(item.name)} ×{item.quantity}</small>
        </> : <span className="iw-empty-slot">空</span>}</div>
      })}</div>
    </section>
    {activeMenu && <ContextMenu name={publicItemName(activeMenu.item.name)} actions={menuActions(activeMenu.item)}
      x={activeMenu.x} y={activeMenu.y} onClose={closeMenu}
      onAction={action => { setMenu(null); onAction(action, activeMenu.item) }} />}
  </aside>
}
