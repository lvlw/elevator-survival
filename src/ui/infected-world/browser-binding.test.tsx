import { expect, it } from 'vitest'
import { mountUi } from './test-fixtures'

it('a pointer double-click second event cannot become a fresh action after the first current has rendered',async()=>{
  const h=await mountUi()
  try{
    await h.d.setup();await h.d.send('进入封锁区')
    const before=h.setItem.mock.calls.length
    const b=()=>[...h.host.querySelectorAll<HTMLButtonElement>('button')].find(b=>b.textContent==='原位休整')!
    await h.flush(()=>b().dispatchEvent(new MouseEvent('click',{bubbles:true,detail:1})))
    const day=h.view().taskDay
    await h.flush(()=>b().dispatchEvent(new MouseEvent('click',{bubbles:true,detail:2})))
    expect(h.view().taskDay).toBe(day);expect(h.setItem).toHaveBeenCalledTimes(before+1)
  }finally{await h.unmount()}
})
it('StrictMode remount retires contexts and never creates a second live writer',async()=>{
  const h=await mountUi('E03-A-seed-01',true)
  try{
    expect(h.owner().getSnapshot().status).toBe('setup')
    expect(h.entropy).not.toHaveBeenCalled();expect(h.setItem).not.toHaveBeenCalled()
    await h.remount();expect(h.owner().getSnapshot().status).toBe('setup')
    await h.d.setup();expect(h.entropy).toHaveBeenCalledTimes(1);expect(h.view().point).toBe('first-hub')
  }finally{await h.unmount()}
})
it('a lock granted after React unmount releases without reading, identity generation or first stock',async()=>{
  let grant:(()=>void)|undefined
  const h=await mountUi('late-lock',false,fixture=>{
    fixture.locks.request.mockImplementation((name,_options,callback)=>new Promise(resolve=>{
      grant=()=>resolve(callback({name,mode:'exclusive'}))
    }))
  })
  expect(h.owner().getSnapshot().status).toBe('acquiring')
  await h.unmount()
  await h.flush(()=>grant!())
  expect(h.owner().getSnapshot().status).toBe('disposed')
  expect(h.getItem).not.toHaveBeenCalled();expect(h.setItem).not.toHaveBeenCalled();expect(h.entropy).not.toHaveBeenCalled()
})
