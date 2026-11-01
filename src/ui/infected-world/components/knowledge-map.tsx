import type { PlayerReadyView } from '../../../state/residence-session/player-types'
export function KnowledgeMap({ map, compact = true }: { map: PlayerReadyView['map']; compact?: boolean }) {
  const current = map.nodes.find(node => node.current)
  const currentName = current ? `${current.place} / ${current.name}` : null
  const adjacent = new Set(map.routes.flatMap(route => route.from === currentName ? [route.to] : route.to === currentName ? [route.from] : []))
  const nodes = compact ? map.nodes.filter(node => node.current || adjacent.has(`${node.place} / ${node.name}`)) : map.nodes
  const columns = compact ? 2 : Math.max(1, Math.ceil(Math.sqrt(nodes.length)))
  const positions = nodes.map((node, index) => ({ node, x: 75 + index % columns * 150, y: 30 + Math.floor(index / columns) * 95 }))
  const find = (name: string) => positions.find(p => `${p.node.place} / ${p.node.name}` === name)
  return <section className="iw-known-map"><svg className="iw-minimap" viewBox={`0 0 ${columns * 150} ${Math.max(1, Math.ceil(nodes.length / columns)) * 95}`} role="img" aria-label="已知地点拓扑，只读">
    {map.routes.map((route, index) => {
      const from = find(route.from), to = find(route.to)
      return from && to ? <line key={index} x1={from.x} y1={from.y} x2={to.x} y2={to.y} className={route.passable === true ? 'iw-map-line' : 'iw-map-line iw-map-line--uncertain'} /> : null
    })}
    {positions.map(({ node, x, y }, index) => <g key={index}><circle cx={x} cy={y} r={node.current ? 7 : 5} className={node.current ? 'iw-map-dot iw-map-current' : 'iw-map-dot'} /><text x={x} y={y + 29} textAnchor="middle"><tspan x={x}>{node.name.slice(0, 5)}</tspan>{node.name.length > 5 && <tspan x={x} dy="25">{node.name.slice(5)}</tspan>}</text></g>)}
    {!nodes.length && <text x="150" y="54" textAnchor="middle">尚无已知地点</text>}
  </svg><details className="iw-map"><summary>已知地图 <small>只读</small></summary><div className="iw-map-content">
    <ul className="iw-map-nodes" aria-label="已知地点">{map.nodes.map((node, index) => <li key={index} className={node.current ? 'iw-map-current' : ''}>
      <span aria-hidden="true">{node.current ? '◉' : node.visited ? '●' : '○'}</span> {node.place} / {node.name}<small>{node.current ? '当前' : node.visited ? '已到达' : '已知'}</small></li>)}</ul>
    <ul className="iw-map-routes" aria-label="已知路线">{map.routes.map((route, index) => <li key={index}>{route.from} — {route.to}<small>
      {route.passable === 'unknown' ? '通行未知' : route.passable ? '已知可通行' : '已知受阻'} · {route.observation === 'current' ? '当前观察' : '上次观察'}</small></li>)}</ul>
  </div></details></section>
}
