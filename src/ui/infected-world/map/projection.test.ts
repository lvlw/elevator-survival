import { expect,it } from 'vitest'
import { knownGraph,mapLayer,uniqueTarget,type KnownMap } from './projection'
import { positions,corridor } from './layout'
const nodes=[{place:'医院',name:'同名入口',current:true,visited:true},{place:'酒店',name:'同名入口',current:false,visited:false},{place:'酒店',name:'安置点',current:false,visited:false}]
const route=(from:string,to:string,passable:boolean|'unknown'=true,observation:'current'|'last-observed'='current')=>({from,to,passable,observation})
const map:KnownMap={nodes,routes:[route('医院 / 同名入口','酒店 / 同名入口'),route('酒店 / 同名入口','医院 / 同名入口',false,'last-observed'),route('酒店 / 同名入口','酒店 / 安置点','unknown','last-observed')]}
it('layers filter rooms and internal edges, world uses only known cross-region routes without turning internal routes into self-loops',()=>{
 expect(mapLayer(map,'医院').nodes.map(n=>n.place)).toEqual(['医院'])
 expect(mapLayer(map,'酒店').nodes.map(n=>n.name)).toEqual(['同名入口','安置点'])
 expect(mapLayer(map,'医院').internal).toHaveLength(0);expect(mapLayer(map,'酒店').internal).toHaveLength(1)
 expect(mapLayer(map,'医院').cross).toHaveLength(2);expect(knownGraph(map).places).toEqual(['医院','酒店'])
 expect(mapLayer(map,'酒店').cross.map(r=>[r.passable,r.observation])).toEqual([[true,'current'],[false,'last-observed']])
})
it('full-name ambiguity and missing endpoints never choose first/last nodes; original route text remains available',()=>{
 const bad={nodes:[...nodes,{...nodes[0],current:false}],routes:[...map.routes,route('隐藏 / 缺失','医院 / 同名入口')]}
 expect(knownGraph(bad).resolved.map(r=>r.index)).toEqual([2]);expect(knownGraph(bad).unresolved).toBe(true)
 expect(uniqueTarget(bad,{place:'医院',name:'同名入口'})).toBe(false);expect(uniqueTarget(map,{place:'酒店',name:'同名入口'})).toBe(true)
 expect(bad.routes).toHaveLength(4)
})
it('finite room layout does not shuffle on current movement and every hospital channel avoids room interiors',()=>{
 const names=['电梯前室','大厅','药房','保安室','隔离走廊','冷藏室','值班休息室','后勤控制间','转运平台'];const p=positions(names,'医院')
 expect(positions([...names].reverse(),'医院').reverse()).toEqual(p)
 for(const [a,b] of [[0,1],[1,2],[1,3],[1,4],[1,7],[3,4],[3,6],[4,5],[6,7],[7,8]]){
  const d=corridor(p[a],p[b],p);expect(d).not.toBeNull()
  const vertices=d!.slice(2).split(' L ').map(s=>s.split(' ').map(Number))
  for(let i=1;i<vertices.length;i++) {const [x,y]=vertices[i-1],[xx,yy]=vertices[i];expect(x===xx||y===yy).toBe(true)
   for(const room of p){const crosses=x===xx?x>room.x-48&&x<room.x+48&&Math.max(y,yy)>room.y-22&&Math.min(y,yy)<room.y+22:y>room.y-22&&y<room.y+22&&Math.max(x,xx)>room.x-48&&Math.min(x,xx)<room.x+48;expect(crosses).toBe(false)}
  }
 }
})
