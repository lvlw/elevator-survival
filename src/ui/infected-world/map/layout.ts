/** UI diagram coordinates, never knowledge. Only supplied public nodes are placed. */
export type Point={x:number;y:number}
export const diagramWidth=250, diagramHeight=320
const hospital:Record<string,Point>={电梯前室:{x:60,y:26},药房:{x:190,y:26},大厅:{x:60,y:90},保安室:{x:190,y:154},隔离走廊:{x:60,y:154},冷藏室:{x:60,y:218},值班休息室:{x:190,y:218},后勤控制间:{x:190,y:282},转运平台:{x:60,y:282}}
export function positions(names:readonly string[],place:string|null):Point[] {
 const slots=names.length<=3?[{x:125,y:65},{x:125,y:165},{x:125,y:270}]:names.map((_,i)=>({x:60+i%2*130,y:28+Math.floor(i/2)*64}))
 return names.map((name,i)=>place==='医院'&&names.every(n=>hospital[n])&&hospital[name]?hospital[name]:slots[i])
}
const inside=(p:Point,c:Point,pad=0)=>p.x>c.x-48-pad&&p.x<c.x+48+pad&&p.y>c.y-22-pad&&p.y<c.y+22+pad
const hit=(a:Point,b:Point,c:Point,pad=0)=>a.x===b.x ? a.x>c.x-48-pad&&a.x<c.x+48+pad&&Math.max(a.y,b.y)>c.y-22-pad&&Math.min(a.y,b.y)<c.y+22+pad : a.y>c.y-22-pad&&a.y<c.y+22+pad&&Math.max(a.x,b.x)>c.x-48-pad&&Math.min(a.x,b.x)<c.x+48+pad
/** Deterministic orthogonal shortest path around every public room rectangle. */
export function corridor(a:Point,b:Point,rooms:readonly Point[], bounds = { width: diagramWidth, height: diagramHeight }) {
 const horizontal=Math.abs(a.x-b.x)>Math.abs(a.y-b.y)
 const sign=horizontal?Math.sign(b.x-a.x):Math.sign(b.y-a.y)
 const start={x:a.x+(horizontal?sign*49:0),y:a.y+(horizontal?0:sign*23)},end={x:b.x-(horizontal?sign*49:0),y:b.y-(horizontal?0:sign*23)}
 const xs=[...new Set([2,bounds.width-2,start.x,end.x,...rooms.flatMap(p=>[p.x-58,p.x,p.x+58])])].filter(x=>x>=2&&x<=bounds.width-2).sort((a,b)=>a-b)
 const ys=[...new Set([3,bounds.height-3,start.y,end.y,...rooms.flatMap(p=>[p.y-32,p.y,p.y+32])])].filter(y=>y>=3&&y<=bounds.height-3).sort((a,b)=>a-b)
 const key=(p:Point)=>`${p.x},${p.y}`, queue=[start], costs=new Map([[key(start),0]]),previous=new Map<string,Point>()
 while(queue.length) {
  queue.sort((p,q)=>costs.get(key(p))!-costs.get(key(q))!);const p=queue.shift()!
  if(key(p)===key(end))break
  const ix=xs.indexOf(p.x),iy=ys.indexOf(p.y)
  for(const q of [{x:xs[ix-1],y:p.y},{x:xs[ix+1],y:p.y},{x:p.x,y:ys[iy-1]},{x:p.x,y:ys[iy+1]}]) {
   if(q.x===undefined||q.y===undefined||rooms.some(c=>{const pad=c===a||c===b?0:8;return inside(q,c,pad)||hit(p,q,c,pad)}))continue
   const n=costs.get(key(p))!+Math.abs(p.x-q.x)+Math.abs(p.y-q.y)
   if(n<(costs.get(key(q))??Infinity)){costs.set(key(q),n);previous.set(key(q),p);queue.push(q)}
  }
 }
 if(!costs.has(key(end)))return null
 const points=[end];let p=end
 while(key(p)!==key(start)){p=previous.get(key(p))!;points.unshift(p)}
 return 'M '+points.map(p=>`${p.x} ${p.y}`).join(' L ')
}
