import type { PlayerReadyView } from '../../../state/residence-session/player-types'
export function KnowledgeMap({ map }: { map: PlayerReadyView['map'] }) {
  return <details className="iw-map"><summary>已知地图 <small>只读</small></summary><div className="iw-map-content">
    <ul className="iw-map-nodes" aria-label="已知地点">{map.nodes.map((node, index) => <li key={index} className={node.current ? 'iw-map-current' : ''}>
      <span aria-hidden="true">{node.current ? '◉' : node.visited ? '●' : '○'}</span> {node.place} / {node.name}<small>{node.current ? '当前' : node.visited ? '已到达' : '已知'}</small></li>)}</ul>
    <ul className="iw-map-routes" aria-label="已知路线">{map.routes.map((route, index) => <li key={index}>{route.from} — {route.to}<small>
      {route.passable === 'unknown' ? '通行未知' : route.passable ? '已知可通行' : '已知受阻'} · {route.observation === 'current' ? '当前观察' : '上次观察'}</small></li>)}</ul>
  </div></details>
}
