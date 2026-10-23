import { useEffect, useState } from 'react'
import type { PlayerAction, PlayerItem, PlayerReadyView } from '../../../state/residence-session/player-types'
import { ContextMenu } from './context-menu'
import { ItemTile } from './item-tile'
import { loadName, publicItemName } from '../labels'
import type { BrowserControls } from '../../../app/infected-browser/types'
import { itemMenuActions } from '../menu-options'

type Menu = { item: PlayerItem; x: number; y: number; trigger: HTMLButtonElement }
export function InventoryPanel({ view, onAction, describeAction }: { view: PlayerReadyView; onAction: (action: PlayerAction, item?: PlayerItem) => void;
  describeAction: BrowserControls['describeAction'] }) {
  const [tab, setTab] = useState<'equipment' | 'backpack'>('backpack')
  const [menu, setMenu] = useState<Menu | null>(null)
  useEffect(() => { setMenu(null) }, [view])
  const closeMenu = () => { menu?.trigger.focus(); setMenu(null) }
  const showMenu = (item: PlayerItem, x: number, y: number, trigger: HTMLButtonElement) => setMenu({ item, x, y, trigger })
  const menuActions = (item: PlayerItem) => itemMenuActions(view, item, describeAction)
  return <aside className="iw-inventory" aria-label="装备与背包"><header><h2>携带</h2><span>{loadName(view.backpack.load)} · 重量 {view.backpack.weight}</span></header>
    <div className="iw-quick" aria-label="快捷栏">{[0, 1].map(slot => {
      const item = view.carried.find(item => item.container === 'quick' && item.slot === slot)
      return <div key={slot}><span>快捷 {slot + 1}</span>{item ? <ItemTile item={item} onMenu={menuActions(item).length ? showMenu : undefined} /> : <span className="iw-empty-slot">空</span>}</div>
    })}</div>
    <div className="iw-tabs" role="tablist" aria-label="携带视图"><button role="tab" aria-selected={tab === 'backpack'} type="button" onClick={() => setTab('backpack')}>背包</button><button role="tab" aria-selected={tab === 'equipment'} type="button" onClick={() => setTab('equipment')}>装备</button></div>
    <div className="iw-inventory-content">{tab === 'backpack' ? <section role="tabpanel" aria-label="背包">
      <p className="iw-muted">{view.backpack.width}×{view.backpack.height} · 右键物品 / 菜单键查看操作</p>
      <div className="iw-grid" aria-label="背包格位" style={{ gridTemplateColumns: `repeat(${view.backpack.width}, minmax(0, 1fr))`, gridTemplateRows: `repeat(${view.backpack.height}, minmax(0, 1fr))` }}>
        {Array.from({ length: view.backpack.width * view.backpack.height }, (_, index) => <span key={`cell-${index}`} className="iw-grid-cell" aria-hidden="true" style={{ gridColumn: index % view.backpack.width + 1, gridRow: Math.floor(index / view.backpack.width) + 1 }} />)}
        {view.carried.filter(item => item.container === 'backpack').map((item, index) => {
          const xs = item.footprint.map(cell => cell.x), ys = item.footprint.map(cell => cell.y)
          return <ItemTile key={index} item={item} onMenu={menuActions(item).length ? showMenu : undefined} style={{
            gridColumn: `${Math.min(...xs) + 1} / ${Math.max(...xs) + 2}`, gridRow: `${Math.min(...ys) + 1} / ${Math.max(...ys) + 2}`,
          }} />
        })}
      </div>
    </section> : <section className="iw-equipment" role="tabpanel" aria-label="装备">{(['weapon', 'armor', 'utility'] as const).map((container, index) => {
      const item = view.carried.find(item => item.container === container)
      return <div key={container}><strong>{['武器', '防具', '实用装备'][index]}</strong>{item ? <><ItemTile item={item} /><span>{publicItemName(item.name)}</span></> : <span className="iw-empty-slot">未装备</span>}</div>
    })}</section>}
      {view.point === 'battle-decision' && <p className="iw-muted">战斗中携带区只读；快捷用药请使用舞台行动。</p>}
      {view.body.wounds.length > 0 && <details><summary>当前伤口</summary><ul>{view.body.wounds.map(wound => <li key={wound.ordinal}>伤口 {wound.ordinal} · {wound.kind === 'scratch' ? '抓伤' : wound.kind === 'bite' ? '咬伤' : '开放伤口'} · {wound.treatment === 'treated' ? '已处理' : '未处理'}</li>)}</ul></details>}
    </div>
    {menu && <ContextMenu name={publicItemName(menu.item.name)} actions={menuActions(menu.item)} x={menu.x} y={menu.y} onClose={closeMenu} onAction={action => { const item = menu.item; setMenu(null); onAction(action, item) }} />}
  </aside>
}
