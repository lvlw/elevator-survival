import { InfoCard } from './info-card'
import type {
  PlayerKnownMapNodeViewModel,
  PlayerKnownMapReturnViewModel,
  PlayerKnownMapRouteViewModel,
  PlayerKnownMapViewModel,
} from '../presentation/player-known-map-view-model'

function nodeStateLabel(node: PlayerKnownMapNodeViewModel): string {
  return node.state === 'current'
    ? '当前位置'
    : node.state === 'visited'
      ? '已到达'
      : '已发现·未到达'
}

function searchLabel(node: PlayerKnownMapNodeViewModel): string {
  return node.search === 'not-reached'
    ? '到达后可了解搜索状态'
    : node.search === 'not-available'
      ? '无主要搜索'
      : node.search === 'available'
        ? '可搜索'
        : '已搜索'
}

function routeStateLabel(route: PlayerKnownMapRouteViewModel): string {
  return route.traversal === 'traversable' ? '当前可通行' : '当前受阻'
}

function returnRiskLabel(risk: NonNullable<PlayerKnownMapReturnViewModel['risk']>): string {
  return risk === 'safe-returned'
    ? '当前可安全返程'
    : risk === 'forced-returned'
      ? '当前返程将进入强制返程'
      : '当前返程预计无法生还'
}

function returnRiskTone(risk: NonNullable<PlayerKnownMapReturnViewModel['risk']>): 'safe' | 'warning' | 'danger' {
  return risk === 'safe-returned' ? 'safe' : risk === 'forced-returned' ? 'warning' : 'danger'
}

function ReturnSummary({ value }: Readonly<{ value: PlayerKnownMapReturnViewModel }>) {
  if (value.status === 'combat-recalculate') {
    return <aside className="known-map-return known-map-return--unavailable" aria-label="返程信息">
      <strong>返程</strong><span>战斗结束后重算返程</span>
    </aside>
  }
  if (value.status === 'terminal') {
    return <aside className="known-map-return known-map-return--unavailable" aria-label="返程信息">
      <strong>返程</strong><span>本次探索已结束</span>
    </aside>
  }
  if (value.status === 'unavailable' || value.risk === null) {
    return <aside className="known-map-return known-map-return--unavailable" aria-label="返程信息">
      <strong>返程</strong><span>当前无法提供返程预估</span>
    </aside>
  }
  return <aside className={`known-map-return known-map-return--${returnRiskTone(value.risk)}`} aria-label="返程信息">
    <div><strong>返程</strong><span>{returnRiskLabel(value.risk)}</span></div>
    <dl>
      <div><dt>预计返程时间</dt><dd>{value.estimatedReturnTime}</dd></div>
      <div><dt>返程后预计剩余</dt><dd>{value.estimatedRemainingTimeAfterReturn}</dd></div>
    </dl>
    <p>返程路径：{value.routeNodeNames.join(' → ')}</p>
  </aside>
}

export function PlayerKnownMap({ map }: Readonly<{ map: PlayerKnownMapViewModel }>) {
  return <section className="known-map" aria-labelledby="known-map-heading">
    <header className="known-map__heading">
      <div><p className="panel-kicker">PLAYER-KNOWN MAP</p><h2 id="known-map-heading">已知场景地图</h2></div>
      <p>当前位置：<strong>{map.currentNodeName}</strong></p>
    </header>
    <div className="known-map__canvas">
      <svg className="known-map__routes" viewBox="0 0 100 100" role="img" aria-label="已知地图路线">
        {map.routes.map((route) => <line
          aria-hidden="true"
          className={`known-map__route known-map__route--${route.traversal}`}
          key={route.key}
          x1={route.from.x}
          y1={route.from.y}
          x2={route.to.x}
          y2={route.to.y}
          vectorEffect="non-scaling-stroke"
        />)}
      </svg>
      {map.routes.map((route) => <div
        className={`known-map__route-label known-map__route-label--${route.traversal}`}
        key={`${route.key}-label`}
        style={{ left: `${(route.from.x + route.to.x) / 2}%`, top: `${(route.from.y + route.to.y) / 2}%` }}
      >
        <span>{routeStateLabel(route)} · {route.movementTime}</span>
        <InfoCard
          label={`查看${route.endpointNames[0]}至${route.endpointNames[1]}路线说明`}
          title={`${route.endpointNames[0]} ↔ ${route.endpointNames[1]}`}
          summary={routeStateLabel(route)}
          details={[`移动耗时 ${route.movementTime}`, '路线受阻时不推测未公开的原因。']}
        />
      </div>)}
      {map.nodes.map((node) => <article
        className={`known-map__node known-map__node--${node.state}`}
        key={node.key}
        style={{ left: `${node.x}%`, top: `${node.y}%` }}
      >
        <span className="known-map__node-state">{nodeStateLabel(node)}</span>
        <strong>{node.name}</strong>
        <span>{searchLabel(node)}</span>
        <InfoCard
          label={`查看${node.name}地图节点说明`}
          title={node.name}
          summary={nodeStateLabel(node)}
          details={[searchLabel(node)]}
        />
      </article>)}
    </div>
    <div className="known-map__legend" aria-label="地图图例">
      <span><i className="known-map__legend-node known-map__legend-node--current" />当前位置</span>
      <span><i className="known-map__legend-node known-map__legend-node--visited" />已到达</span>
      <span><i className="known-map__legend-node known-map__legend-node--known" />已发现未到达</span>
      <span><i className="known-map__legend-route" />当前可通行</span>
      <span><i className="known-map__legend-route known-map__legend-route--blocked" />当前受阻</span>
    </div>
    <ReturnSummary value={map.return} />
  </section>
}
