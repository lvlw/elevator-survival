import { expect, it, vi } from 'vitest'
import { mountUi } from './test-fixtures'
import { domRouteA, domRouteB } from './route-test-fixtures'
import { observeBrowser } from '../../app/infected-browser/test-observers'

it('A actual React DOM controls from read-null, three enemies, real material installation and carried sample to H0 success',async()=>{
  const watch=observeBrowser(),h=await mountUi()
  try {await h.d.setup();for(let stage=0;stage<6;stage++)await domRouteA(h.d,stage)
    expect(h.view()).toMatchObject({point:'living-hub',terminal:{result:{outcome:'success'}}})
    expect(document.body.textContent).toContain('委托完成')
    const c=watch.counts();expect(c.dispatch).toBeGreaterThan(50);expect(c.current).toBe(c.dispatch+1);expect(c.notices).toBe(c.current)
  }finally{await h.unmount();vi.restoreAllMocks()}
},30000)
it('B actual DOM retreat, immediate paid maintenance, medical, rest, cold continuation and stop loss without rule replay',async()=>{
  const watch=observeBrowser(),h=await mountUi()
  try{await h.d.setup();await domRouteB(h.d,0);h.faults.checkpoint=true;await domRouteB(h.d,1)
    expect(document.body.textContent).toContain('操作已生效，尚未保存')
    const before=watch.counts();h.faults.checkpoint=false;await h.d.button('重试保存');const after=watch.counts()
    for(const key of ['dispatch','current','notices','combat','medical','maintenance','draw','g1Cycle'])expect(after[key]).toBe(before[key])
    await h.remount();await domRouteB(h.d,2);expect(['living-hub','dead']).toContain(h.view().point)
  }finally{await h.unmount();vi.restoreAllMocks()}
},30000)
