import { useEffect, useRef, useState } from 'react'
import type { PlayerReadyView } from '../../../state/residence-session/player-types'

type MapView = PlayerReadyView['map']
const nameOf = (node: MapView['nodes'][number]) => `${node.place} / ${node.name}`
const passage = (value: boolean | 'unknown') => value === 'unknown' ? '通行未知' : value ? '已知可通行' : '已知受阻'
const observed = (value: 'current' | 'last-observed') => value === 'current' ? '当前观察' : '上次观察'
const nodeState = (node: MapView['nodes'][number]) => node.current ? '当前位置' : node.visited ? '已到达' : '已知未到达'

/** Both sizes use every node and every directed route of the same safe projection.
 * Layout positions are UI only. No spanning-tree reduction, catalog lookup or move command. */
export function KnowledgeMap({ map, compact = true }: { map: MapView; compact?: boolean }) {
  const [selected, setSelected] = useState<string | null>(null)
  const viewport = useRef<HTMLDivElement>(null), currentElement = useRef<SVGGElement>(null)
  const columns = compact ? 2 : Math.max(2, Math.min(4, Math.ceil(Math.sqrt(map.nodes.length))))
  const width = columns * 170, height = Math.max(1, Math.ceil(map.nodes.length / columns)) * 100
  const positions = map.nodes.map((node, index) => ({ node, x: 85 + index % columns * 170, y: 50 + Math.floor(index / columns) * 100 }))
  const byName = new Map(positions.map(position => [nameOf(position.node), position]))
  const current = map.nodes.find(node => node.current), chosen = map.nodes.find(node => nameOf(node) === selected)
  const marker = compact ? 'iw-map-mini-arrow' : 'iw-map-expanded-arrow'
  useEffect(() => {
    const center = () => {
      const port = viewport.current, element = currentElement.current
      if (!port || !element) return
      const a = port.getBoundingClientRect(), b = element.getBoundingClientRect()
      port.scrollLeft += b.x + b.width / 2 - a.x - port.clientWidth / 2
      port.scrollTop += b.y + b.height / 2 - a.y - port.clientHeight / 2
    }
    center(); window.addEventListener('resize', center)
    return () => window.removeEventListener('resize', center)
  }, [current?.name, current?.place, compact, width, height])
  return <section className="iw-known-map">
    {current && <p className="iw-map-help">当前位置：{nameOf(current)}</p>}
    <p className="iw-map-help">节点只查看；移动使用现场“前往”。图内可滚动。</p>
    <div className={`iw-map-viewport${compact ? '' : ' iw-map-viewport--expanded'}`} ref={viewport} tabIndex={0} aria-label="已知地图画布，可滚动">
      <svg className="iw-minimap iw-map-canvas" style={{ width, height }} viewBox={`0 0 ${width} ${height}`} role="group" aria-label="已知地点拓扑，只读">
        <defs><marker id={marker} markerWidth="10" markerHeight="10" refX="9" refY="5" orient="auto" markerUnits="userSpaceOnUse"><path d="M 0 1 L 9 5 L 0 9 Z" fill="#c5cecc" /></marker></defs>
        {map.routes.map((route, index) => {
          const from = byName.get(route.from), to = byName.get(route.to)
          if (!from || !to) return null
          const dx = to.x - from.x, dy = to.y - from.y, length = Math.hypot(dx, dy) || 1
          const inset = Math.min(dx ? 72 / Math.abs(dx) : Infinity, dy ? 29 / Math.abs(dy) : Infinity, 0.4)
          const start = { x: from.x + dx * inset, y: from.y + dy * inset }, end = { x: to.x - dx * inset, y: to.y - dy * inset }
          const curve = { x: (start.x + end.x) / 2 - dy / length * 24, y: (start.y + end.y) / 2 + dx / length * 24 }
          return <path key={index} data-map-route={index} data-passage={String(route.passable)} data-observation={route.observation} d={`M ${start.x} ${start.y} Q ${curve.x} ${curve.y} ${end.x} ${end.y}`} className="iw-map-edge" markerEnd={`url(#${marker})`}><title>{route.from} → {route.to} · {passage(route.passable)} · {observed(route.observation)}</title></path>
        })}
        {positions.map(({ node, x, y }, index) => <g key={index} ref={node.current ? currentElement : undefined} role="button" tabIndex={0} aria-label={`查看${nameOf(node)} · ${nodeState(node)}`} className="iw-map-node" data-current={node.current} data-visited={node.visited} onClick={() => setSelected(nameOf(node))} onKeyDown={event => {
          if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); setSelected(nameOf(node)) }
        }}>
          <rect x={x - 68} y={y - 26} width="136" height="52" rx="3" />
          <circle cx={x - 54} cy={y} r="4" /><text x={x + 5} y={node.name.length > 5 ? y - 3 : y + 5} textAnchor="middle"><tspan x={x + 5}>{node.name.slice(0, 5)}</tspan>{node.name.length > 5 && <tspan x={x + 5} dy="18">{node.name.slice(5)}</tspan>}</text>
        </g>)}
        {!map.nodes.length && <text x={width / 2} y="54" textAnchor="middle">尚无已知地点</text>}
      </svg>
    </div>
    <div className="iw-map-legend"><span>金边：当前位置</span><span>实点已到达 · 空点已知未到达</span><span>箭头为方向</span><span>实线可通行 · 虚线受阻/未知</span><span>淡线为上次观察</span></div>
    {chosen && <p className="iw-map-selection" role="status">{nameOf(chosen)} · {nodeState(chosen)}。{map.routes.filter(route => route.from === nameOf(chosen)).map(route => `${route.to}：${passage(route.passable)}，${observed(route.observation)}`).join('；')}</p>}
    <details className="iw-map"><summary>已知地图 <small>只读记录</small></summary><div className="iw-map-content">
      <ul className="iw-map-nodes" aria-label="已知地点">{map.nodes.map((node, index) => <li key={index}>{nameOf(node)}<small>{nodeState(node)}</small></li>)}</ul>
      <ul className="iw-map-routes" aria-label="已知路线">{map.routes.map((route, index) => <li key={index}>{route.from} → {route.to}<small>{passage(route.passable)} · {observed(route.observation)}</small></li>)}</ul>
    </div></details>
  </section>
}
