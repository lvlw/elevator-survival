import { expect, it } from 'vitest'
import { firstFit } from './first-fit'
import { browserFixture, setup, ready, send, choose } from '../../app/infected-browser/test-fixtures'

it('ordinary first-fit queries row-major unrotated positions and returns only the first formal legal anchor', async () => {
  const h=browserFixture();await setup(h)
  try {
    send(h.owner,'depart','进入封锁区');send(h.owner,'move','大厅');send(h.owner,'source','大厅搜索',{},'dark')
    const view=ready(h.owner), item=view.ground.find(i=>i.name==='金属零件')!, before=h.owner.getSnapshot(), writes=h.setItem.mock.calls.length
    const calls:unknown[]=[]
    const p=firstFit(view.backpack.width,view.backpack.height,{action:choose(h.owner,'inventory','拾取'),item:item.selector},request=>{
      calls.push(request.placement);return h.owner.controls()!.preview(request)
    })
    expect(p).toEqual({x:0,y:0,rotated:false});expect(calls).toEqual([p]);expect(h.owner.getSnapshot()).toBe(before);expect(h.setItem).toHaveBeenCalledTimes(writes)
  }finally{h.owner.dispose()}
})
it('no formal legal anchor returns null after all cells without fallback rotation, sorting, merging or execution',()=>{
  const calls:unknown[]=[]
  const p=firstFit(6,4,{action:Object.freeze({selection:'opaque'})},request=>{
    calls.push(request.placement);return {qualification:{kind:'unavailable',cost:null},death:{kind:'unknown',basis:'invalid-request'},facts:null,confirmation:{kind:'none',reason:null},hasProvenAlternative:false}
  })
  expect(p).toBeNull();expect(calls).toHaveLength(24)
  expect(calls.slice(0,7)).toEqual([{x:0,y:0,rotated:false},{x:1,y:0,rotated:false},{x:2,y:0,rotated:false},{x:3,y:0,rotated:false},{x:4,y:0,rotated:false},{x:5,y:0,rotated:false},{x:0,y:1,rotated:false}])
})
