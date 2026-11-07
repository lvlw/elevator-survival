import { useEffect, useId, useState, type KeyboardEvent } from 'react'
import { areaRoomName, fullName, mapLayer, observation, passage, uniqueTarget, type KnownMap, type MapTarget } from '../map/projection'
import { corridor, diagramHeight, diagramWidth, positions } from '../map/layout'

export type MapScope = { anchor: string | null; world: boolean; place: string | null; selected: string | null }
type Node = KnownMap['nodes'][number]
type Route = ReturnType<typeof mapLayer>['resolved'][number]
type Channel = { from: string; to: string; routes: Route[] }

export function KnowledgeMap({ map, compact = true, scope, onScope, target, onExpand }: {
  map: KnownMap; compact?: boolean; scope?: MapScope; onScope?(scope: MapScope): void
  target?: MapTarget | null; onExpand?(): void
}) {
  const current = map.nodes.find(node => node.current)
  const anchor = current?.place ?? null
  const [own, setOwn] = useState<MapScope>({ anchor, world: false, place: anchor, selected: null })
  const previous = scope ?? own
  const state = previous.anchor === anchor ? previous : { anchor, world: false, place: anchor, selected: null }
  const change = (patch: Partial<MapScope>) => {
    const next = { ...state, ...patch }
    if (onScope) onScope(next)
    else setOwn(next)
  }
  const place = state.place && map.nodes.some(node => node.place === state.place) ? state.place : anchor
  const layer = mapLayer(map, place)
  const world = state.world
  const routes = world ? layer.cross : [...layer.internal, ...layer.boundary]
  const external = new Map<string, { node: Node; local: Node }>()
  if (!world) for (const route of layer.boundary) {
    const [local, node] = route.fromNode.place === place ? [route.fromNode, route.toNode] : [route.toNode, route.fromNode]
    if (!external.has(fullName(node))) external.set(fullName(node), { node, local })
  }
  const names = world ? layer.places : layer.nodes.map(fullName)
  const localPoints = positions(world ? names : layer.nodes.map(node => node.name), world ? null : place)
  const height = Math.max(diagramHeight, ...localPoints.map(point => point.y + 26), external.size * 64 + 12)
  const rail = [...external.entries()].sort((a, b) => {
    const y = (entry: typeof a) => localPoints[names.indexOf(fullName(entry[1].local))]?.y ?? 0
    return y(a) - y(b) || a[0].localeCompare(b[0])
  })
  const width = rail.length ? 376 : diagramWidth
  const externalPoints = rail.map((entry, index) => ({
    x: 314,
    y: Math.max(26 + index * 64,
      Math.min(height - 26 - (rail.length - 1 - index) * 64, localPoints[names.indexOf(fullName(entry[1].local))]?.y ?? 26)),
  }))
  // Keep external markers apart even when multiple doors share the same local endpoint.
  for (let i = 1; i < externalPoints.length; i++) externalPoints[i].y = Math.max(externalPoints[i].y, externalPoints[i - 1].y + 64)
  const displayed = [...names, ...rail.map(([name]) => name)]
  const points = [...localPoints, ...externalPoints]
  const channels = new Map<string, Channel>()
  const fromKey = (route: Route) => world ? route.fromNode.place : route.from
  for (const route of routes) {
    const [from, to] = [fromKey(route), world ? route.toNode.place : route.to].sort()
    if (from === to) continue
    const key = 'routes:' + JSON.stringify([world ? 'world' : 'local', world ? null : place, from, to])
    const channel = channels.get(key) ?? { from, to, routes: [] }
    channel.routes.push(route)
    channels.set(key, channel)
  }

  // Selection identity is the public layer and endpoints, never a route array offset.
  const chosen = state.selected ? layer.byName.get(state.selected) : null
  const selectedChannel = channels.get(state.selected ?? '')
  const details = selectedChannel?.routes ?? (chosen ? routes.filter(route => route.from === fullName(chosen) || route.to === fullName(chosen)) : [])
  const marker = 'iw-map-arrow-' + useId()
  useEffect(() => { if (previous.anchor !== anchor) change({ world: false, place: anchor, selected: null }) }, [previous.anchor, anchor])
  useEffect(() => { if (state.selected && !chosen && !selectedChannel) change({ selected: null }) }, [state.selected, chosen, selectedChannel])
  const keyboard = (event: KeyboardEvent, select: () => void) => {
    if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); select() }
  }
  const status = (node: Node) => node.current ? '当前位置' : node.visited ? '已到达' : '已知未到达'
  const fullControls = !compact || !onExpand
  return <section className="iw-known-map" data-map-level={world ? 'world' : 'local'} data-map-place={world ? '' : place ?? ''}>
    <header className="iw-map-toolbar">
      <strong>{world ? '世界地图' : place ? `${place}内部` : '已知地图'}</strong>
      <div><button type="button" onClick={() => change({ world: !world, selected: null })}>{world ? '本地' : '世界'}</button>
        {onExpand && <button type="button" aria-label="展开已知区域" onClick={onExpand}>展开</button>}</div>
    </header>
    <p className="iw-map-current">{current ? `当前 · ${areaRoomName(current)}` : '当前不在活动建筑中'}</p>
    {!world && place !== anchor && <p className="iw-map-help">正在查看 {place}</p>}
    <div className={`iw-map-viewport${compact ? '' : ' iw-map-viewport--expanded'}`} aria-label="已知地图画布，只读">
      <svg className="iw-minimap iw-map-canvas" viewBox={`0 0 ${width} ${height}`} style={{ aspectRatio: `${width} / ${height}` }}
        role="group" aria-label="已知地点拓扑，只读">
        <defs><marker id={marker} markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto-start-reverse" markerUnits="userSpaceOnUse">
          <path d="M 0 0 L 5 3 L 0 6 Z" fill="#cfbe95" />
        </marker></defs>
        {[...channels.entries()].map(([key, channel], index) => {
          const a = displayed.indexOf(channel.from), b = displayed.indexOf(channel.to)
          if (a < 0 || b < 0) return null
          const d = corridor(points[a], points[b], points, { width, height })
          if (!d) return null
          const outside = external.has(channel.from) || external.has(channel.to)
          const rows = channel.routes
          const states = new Set(rows.map(route => route.passable))
          const select = () => change({ selected: key })
          return <g key={key} className="iw-map-channel" data-external={outside || undefined} role="button" tabIndex={0}
            aria-label={`查看联系 ${channel.from} 与 ${channel.to}`} onClick={select} onKeyDown={event => keyboard(event, select)}>
            <path d={d} className="iw-map-edge-gap" />
            <path d={d} data-map-channel={index} className="iw-map-edge"
              data-passage={states.size === 1 ? String(rows[0].passable) : 'mixed'}
              data-observation={rows.every(route => route.observation === 'last-observed') ? 'last-observed' : 'current'}
              markerStart={rows.some(route => fromKey(route) === channel.to) ? `url(#${marker})` : undefined}
              markerEnd={rows.some(route => fromKey(route) === channel.from) ? `url(#${marker})` : undefined} />
            {rows.map(route => <g key={route.index}
              {...(outside ? { 'data-map-exit-route': route.index } : { 'data-map-route': route.index })}
              data-passage={String(route.passable)} data-observation={route.observation}>
              <title>{route.from} → {route.to} · {passage(route.passable)} · {observation(route.observation)}</title>
            </g>)}
          </g>
        })}
        {displayed.map((name, index) => {
          const point = points[index]
          const outside = external.get(name)?.node
          const node = world ? undefined : outside ?? layer.nodes[index]
          const active = world ? name === anchor : !!node?.current
          const selected = target && (world ? target.place === name : uniqueTarget(map, target) && name === `${target.place} / ${target.name}`)
          const label = world ? name : outside ? areaRoomName(outside) : node!.name
          const aria = world ? `查看${name}内部` : outside ? `查看外部入口 ${label} · ${status(outside)}` : `查看${name} · ${status(node!)}`
          const select = () => world ? change({ world: false, place: name, selected: null }) :
            change({ selected: layer.byName.get(name) ? name : null })
          const split = label.length > 6
          return <g key={`${name}:${index}`} className={outside ? 'iw-map-external' : 'iw-map-node'}
            data-map-external={outside ? '' : undefined} data-current={active}
            data-visited={world ? map.nodes.some(entry => entry.place === name && entry.visited) : node?.visited}
            data-target={!!selected} role="button" tabIndex={0} aria-label={aria} onClick={select}
            onKeyDown={event => keyboard(event, select)}>
            <title>{aria}</title><rect x={point.x - 48} y={point.y - 22} width="96" height="44" rx="3" />
            {active && <path d={`M ${point.x + 37} ${point.y - 20} l 10 0 l 0 10 Z`} fill="#e2bf7a" />}
            <text x={point.x} y={split ? point.y - 3 : point.y + 5} textAnchor="middle">
              <tspan x={point.x}>{split ? label.slice(0, 6) : label}</tspan>
              {split && <tspan x={point.x} dy="17">{label.slice(6)}</tspan>}
            </text>
          </g>
        })}
        {!displayed.length && <text x="125" y="160" textAnchor="middle">尚无已知地点</text>}
      </svg>
    </div>
    <p className="iw-map-legend">◆ 当前　实框已到达　虚框待探索{rail.length > 0 && '　金边外部入口'}</p>
    {(fullControls || world || place !== anchor) && <div className="iw-map-tools">
      <button type="button" onClick={() => change({ world: false, place: anchor, selected: null })}>回当前位置</button>
      {fullControls && <details><summary>地图说明</summary>
        <p>地图只供查看，移动使用现场「前往」。箭头表示方向，虚线表示受阻或未知，淡线表示上次观察。双向状态可能不同，旧观察不保证现在能通行。交叉线不是路口，区域联系不证明内部连通。</p>
      </details>}
    </div>}
    {(chosen || selectedChannel) && <p className="iw-map-selection" role="status">
      {chosen ? `${fullName(chosen)} · ${status(chosen)}。` : '已知联系（只读）。'}
      {details.map(route => `${route.from} → ${route.to}：${passage(route.passable)}，${observation(route.observation)}`).join('；')}
      <button type="button" onClick={() => change({ selected: null })}>关闭地图详情</button>
    </p>}
    {layer.unresolved && <p className="iw-map-help">部分公开名称或路线端点不能唯一定位，请查看路线文字。</p>}
    {(fullControls || layer.unresolved) && <details className="iw-map">
      <summary>已知地图 <small>只读记录</small></summary>
      <div className="iw-map-content">
        <ul className="iw-map-nodes" aria-label="已知地点">{map.nodes.map((node, index) =>
          <li key={index}>{fullName(node)}<small>{status(node)}</small></li>)}</ul>
        <ul className="iw-map-routes" aria-label="已知路线">{map.routes.map((route, index) =>
          <li key={index}>{route.from} → {route.to}<small>{passage(route.passable)} · {observation(route.observation)}</small></li>)}</ul>
      </div>
    </details>}
  </section>
}
