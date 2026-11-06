import { useEffect, useId, useState } from 'react'
import { mapLayer, fullName, passage, observation, uniqueTarget, type KnownMap, type MapTarget } from '../map/projection'
import { corridor, positions } from '../map/layout'
export type MapScope={anchor:string|null;world:boolean;place:string|null;selected:string|null}
export function KnowledgeMap({map,compact=true,scope,onScope,target}:{map:KnownMap;compact?:boolean;scope?:MapScope;onScope?(scope:MapScope):void;target?:MapTarget|null}) {
 const current=map.nodes.find(n=>n.current),anchor=current?.place??null
 const [own,setOwn]=useState<MapScope>({anchor,world:false,place:anchor,selected:null})
 const old=scope??own, state=old.anchor===anchor?old:{anchor,world:false,place:anchor,selected:null}
 const change=(s:Partial<MapScope>)=>{const next={...state,...s};if(onScope)onScope(next);else setOwn(next)}
 const graph=mapLayer(map,state.place),world=state.world
 const validPlace=state.place&&graph.places.includes(state.place)?state.place:anchor
 const layer=mapLayer(map,validPlace)
 const roomNames=layer.nodes.map(fullName),names=world?graph.places:roomNames
 const points=positions(world?names:layer.nodes.map(n=>n.name),world?null:validPlace)
 const chosen=state.selected?graph.byName.get(state.selected):null
 const selectedRoutes=state.selected?.startsWith('routes:')?state.selected.slice(7).split(',').map(Number):[]
 const routesValid=selectedRoutes.length>0&&selectedRoutes.every(i=>graph.resolved.some(r=>r.index===i))
 useEffect(()=>{if(old.anchor!==anchor)change({world:false,place:anchor,selected:null})},[old.anchor,anchor])
 useEffect(()=>{if(state.selected&&!chosen&&!routesValid)change({selected:null})},[state.selected,chosen,routesValid])
 const marker='iw-map-'+useId().replace(/:/g,'')
 const routes=world?layer.cross:layer.internal
 const channels=new Map<string,{from:string;to:string;indexes:number[]}>()
 for(const r of routes){const pair=[world?r.fromNode.place:r.from,world?r.toNode.place:r.to].sort();if(pair[0]===pair[1])continue;const key=JSON.stringify(pair);const c=channels.get(key)??{from:pair[0],to:pair[1],indexes:[]};c.indexes.push(r.index);channels.set(key,c)}
 const status=(node:KnownMap['nodes'][number])=>node.current?'当前位置':node.visited?'已到达':'已知未到达'
 const details=routesValid?map.routes.filter((_,i)=>selectedRoutes.includes(i)):chosen?map.routes.filter(r=>r.from===fullName(chosen)||r.to===fullName(chosen)):[]
 return <section className="iw-known-map" data-map-level={world?'world':'local'} data-map-place={world?'':validPlace??''}>
 <header className="iw-map-toolbar"><strong>{world?'世界地图':validPlace?`${validPlace}内部`:'已知地图'}</strong><button onClick={()=>change({world:!world,selected:null})}>{world?'本地':'世界'}</button></header>
 <p className="iw-map-current">{current?`当前：${fullName(current)}`:'当前不在活动建筑中'}</p>
 {!world&&validPlace!==anchor&&<p className="iw-map-help">正在查看：{validPlace}（没有移动）</p>}
 <div className={`iw-map-viewport${compact?'':' iw-map-viewport--expanded'}`} aria-label="已知地图画布，只读">
 <svg className="iw-minimap iw-map-canvas" viewBox="0 0 250 320" role="group" aria-label="已知地点拓扑，只读">
 <defs><marker id={marker} markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto-start-reverse" markerUnits="userSpaceOnUse"><path d="M 0 0 L 5 3 L 0 6 Z" fill="#cfbe95"/></marker></defs>
 {[...channels.values()].map((c,i)=>{
  const ia=names.indexOf(c.from),ib=names.indexOf(c.to);if(ia<0||ib<0)return null
  const d=corridor(points[ia],points[ib],points);if(!d)return null
  const rows=c.indexes.map(index=>map.routes[index]),states=new Set(rows.map(r=>r.passable))
  return <g key={i} className="iw-map-channel" role="button" tabIndex={0} aria-label={`查看联系 ${c.from} 与 ${c.to}`} onClick={()=>change({selected:`routes:${c.indexes.join(',')}`})} onKeyDown={e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();change({selected:`routes:${c.indexes.join(',')}`})}}} ><path d={d} className="iw-map-edge-gap"/><path d={d} data-map-channel={i} className="iw-map-edge" data-passage={states.size===1?String(rows[0].passable):'mixed'} data-observation={rows.every(r=>r.observation==='last-observed')?'last-observed':'current'} markerStart={rows.some(r=>(world?graph.byName.get(r.from)?.place:r.from)===c.to)?`url(#${marker})`:undefined} markerEnd={rows.some(r=>(world?graph.byName.get(r.from)?.place:r.from)===c.from)?`url(#${marker})`:undefined}/>{c.indexes.map(index=><g key={index} data-map-route={index} data-passage={String(map.routes[index].passable)} data-observation={map.routes[index].observation}><title>{map.routes[index].from} → {map.routes[index].to} · {passage(map.routes[index].passable)} · {observation(map.routes[index].observation)}</title></g>)}</g>
 })}
 {names.map((name,i)=>{const p=points[i],node=world?undefined:layer.nodes[i],currentNode=world?name===anchor:node?.current,selected=target&&(world?target.place===name:uniqueTarget(map,target)&&name===`${target.place} / ${target.name}`),label=world?name:node!.name
  const click=()=>world?change({world:false,place:name,selected:null}):change({selected:graph.byName.get(name)?name:null})
  return <g key={i} className="iw-map-node" data-current={currentNode} data-visited={world?map.nodes.some(n=>n.place===name&&n.visited):node?.visited} data-target={!!selected} role="button" tabIndex={0} aria-label={world?`查看${name}内部`:`查看${name} · ${status(node!)}`} onClick={click} onKeyDown={e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();click()}}}><title>{world?`${name} · ${currentNode?'当前区域':'已发现入口'}（只查看）`:`${name} · ${status(node!)}`}</title><rect x={p.x-48} y={p.y-22} width="96" height="44" rx="3"/>{currentNode&&<path d={`M ${p.x+37} ${p.y-20} l 10 0 l 0 10 Z`} fill="#e2bf7a"/>}<text x={p.x} y={label.length>5?p.y-3:p.y+5} textAnchor="middle"><tspan x={p.x}>{label.slice(0,5)}</tspan>{label.length>5&&<tspan x={p.x} dy="17">{label.slice(5,10)}</tspan>}</text></g>
 })}
 {!names.length&&<text x="125" y="160" textAnchor="middle">尚无已知地点</text>}
 </svg></div>
 <p className="iw-map-legend">◆ 当前　实框已到达　虚框待探索</p>
 {!world&&layer.exits.length>0&&<div className="iw-map-exits" aria-label="已知对外出口">{[...new Set(layer.exits.map(r=>r.from))].map(from=><details key={from}><summary>{graph.byName.get(from)!.name} ↗ {[...new Set(layer.exits.filter(r=>r.from===from).map(r=>r.toNode.place))].join(' / ')}</summary>{layer.exits.filter(r=>r.from===from).map(r=><p key={r.index}>{r.from} → {r.to} · {passage(r.passable)} · {observation(r.observation)}</p>)}</details>)}</div>}
 <div className="iw-map-tools"><button onClick={()=>change({world:false,place:anchor,selected:null})}>回当前位置</button><details><summary>地图说明</summary><p>节点和切层只查看；移动使用现场“前往”。箭头保留方向，虚线为受阻/未知，淡线是上次观察。双向状态可能不同，旧观察不保证现在能走；交叉线不是路口。区域联系不证明内部连通。</p></details></div>
 {(chosen||routesValid)&&<p className="iw-map-selection" role="status">{chosen?`${fullName(chosen)} · ${status(chosen)}。`:'已知联系（只读，非移动）。'}{details.map(r=>`${r.from} → ${r.to}：${passage(r.passable)}，${observation(r.observation)}`).join('；')}<button onClick={()=>change({selected:null})}>关闭地图详情</button></p>}
 {graph.unresolved&&<p className="iw-map-help">部分公开名称或路线端点不能唯一定位；保留路线文字，不猜测连线。</p>}
 <details className="iw-map"><summary>已知地图 <small>只读记录</small></summary><div className="iw-map-content"><ul className="iw-map-nodes" aria-label="已知地点">{map.nodes.map((n,i)=><li key={i}>{fullName(n)}<small>{status(n)}</small></li>)}</ul><ul className="iw-map-routes" aria-label="已知路线">{map.routes.map((r,i)=><li key={i}>{r.from} → {r.to}<small>{passage(r.passable)} · {observation(r.observation)}</small></li>)}</ul></div></details>
 </section>
}
