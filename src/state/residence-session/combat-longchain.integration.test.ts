import { afterEach,describe,expect,it,vi } from 'vitest'
import { harness,current,coldSaved,quietDraw } from './combat-test-fixtures'
import { successRoute,enter,action,win,move,rest,repair,maintenanceEntry } from './combat-test-routes'
import { drawIntInclusive } from '../../core/random'
afterEach(()=>vi.restoreAllMocks())
describe('S04 S06 complete native session routes',()=>{
  it('read-null to three true CTB victories, real production/install/sample and H0 success uses only S',()=>{
    const h=harness({tool:'toolbox'}),result=successRoute(h),v=current(h)
    expect(result.current).toBe(v);expect(v.phase).toBe('living-hub');expect(v.receipts.at(-1)?.outcome).toBe('success')
    expect(v.balance).toBe(120);expect(v.battles.map(b=>b.outcome)).toEqual(['victory','victory','victory'])
    expect(v.battles.map(b=>b.entry.enemyId).sort()).toEqual(['orderly','porter','technician'])
    expect(v.productions.length).toBeGreaterThan(0);expect(v.dispositions.some(d=>d.kind==='installed')).toBe(true)
    expect(h.factory).toHaveBeenCalledTimes(1);expect(h.storage.read).toHaveBeenCalledTimes(1)
    expect(h.listener).toHaveBeenCalledTimes(h.storage.write.mock.calls.length)
    expect(current(coldSaved(h))).toEqual(v)
  },30_000)
  it.each(['orderly','porter','technician'] as const)('%s real retreat rest reentry victory preserves the original enemy',enemy=>{
    const h=harness();enter(h,enemy);const first=current(h).battle!.entry
    action(h,{kind:'escape'});const exit=current(h).battles.at(-1)!
    expect(exit.outcome).toBe('escaped');expect(current(h).site?.nodeId).toBe(first.from)
    rest(h);move(h,first.to);const entry=current(h).battle!.entry
    expect(entry.previouslyEncountered).toBe(true);expect(entry.enemyInstanceId).toBe(first.enemyInstanceId)
    expect(current(h).battle?.enemyNext).toBe(50);expect(entry.actionCount).toBeGreaterThanOrEqual(first.actionCount)
    win(h);expect(current(h).site?.enemies.find(e=>e.id===enemy)?.state.defeated).toBe(true)
    expect(current(coldSaved(h))).toEqual(current(h))
  })
  it('real pre-entry materials enable immediate retreat repair and reentry without a filler action',()=>{
    const h=harness({draw:(c,min,max)=>({...drawIntInclusive(c,min,max),value:c.streamId.includes('H1-random')?41:max})})
    maintenanceEntry(h);action(h,{kind:'metal-pipe-basic-attack'});action(h,{kind:'escape'})
    const before=current(h),id=before.carried.equipment.weapon!.instanceId
    repair(h);expect(current(h).character.revision).toBe(before.character.revision+1)
    expect(current(h).itemStates.states.find(s=>s.instanceId===id)).not.toEqual(before.itemStates.states.find(s=>s.instanceId===id))
    rest(h);move(h,'H4');win(h)
    expect(current(h).battles.map(b=>b.outcome)).toEqual(['escaped','victory']);expect(current(coldSaved(h))).toEqual(current(h))
  })
})
