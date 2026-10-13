import { afterEach,describe,expect,it,vi } from 'vitest'
import * as p from '../../core/residence-combat/initial'
import { harness,current,depart,start,mutable,fixture,coldRecord } from './combat-test-fixtures'
import { enter } from './combat-test-routes'
afterEach(()=>vi.restoreAllMocks())
describe('S02 true read-null and monotonic initialization',()=>{
  it('read-null establishes real stock, departs once and enters actual CTB',()=>{
    const h=harness(),initial=vi.spyOn(p,'establishCombatInitial')
    expect(h.owner.bootstrap().status).toBe('no-save');expect(h.storage.read).toHaveBeenCalledTimes(1)
    h.owner.createFirst();const before=current(h);expect(before.phase).toBe('first-hub')
    expect(before.carried.equipment.weapon).not.toBeNull();expect(before.carried.quickSlots.slots[0]?.quantity).toBe(1)
    depart(h);expect(current(h).missions[0].status).toBe('active');expect(initial).toHaveBeenCalledTimes(1)
    expect(h.owner.createFirst).toThrow();expect(h.owner.bootstrap).toThrow();expect(h.owner.retryRead).toThrow()
    expect(h.storage.read).toHaveBeenCalledTimes(1);expect(current(h).origins).toEqual(before.origins)
  })
  it('all initial/launch/entry writes may fail without refiring the initial factory',()=>{
    const h=harness();h.faults.write=true;enter(h)
    expect(current(h).battle?.entry.previouslyEncountered).toBe(false);expect(h.factory).toHaveBeenCalledTimes(1)
    expect(h.owner.getState().persistence).toBe('save-failed');expect(h.listener).toHaveBeenCalledTimes(5)
    h.faults.write=false;h.owner.retrySave();expect(h.factory).toHaveBeenCalledTimes(1);expect(h.listener).toHaveBeenCalledTimes(5)
  })
  it('read errors are not absence; retry can use a genuine null only before progress evidence',()=>{
    const h=harness();h.faults.read=true;expect(h.owner.bootstrap().status).toBe('read-error');expect(h.owner.createFirst).toThrow()
    h.faults.read=false;expect(h.owner.retryRead().status).toBe('no-save');h.owner.createFirst();expect(current(h).phase).toBe('first-hub')
  })
  it.each([undefined,false,[],{then(){}},Promise.resolve(null),'{bad',''])('invalid read %# never reopens first creation',bad=>{
    const h=harness();h.storage.read.mockReturnValueOnce(bad as unknown as null)
    expect(['blocked','read-error']).toContain(h.owner.bootstrap().status);expect(h.owner.createFirst).toThrow()
    expect(h.owner.retryRead().status).toBe('blocked');expect(h.factory).not.toHaveBeenCalled();expect(h.storage.write).not.toHaveBeenCalled()
  })
  it('already active material irrevocably blocks recreation',()=>{
    const f=fixture(),h=harness({materials:{character:f.value.character,mission:f.value.missions[0],
      execution:{runId:'combat-test-execution',seed:'combat-seed',rulesVersion:f.deps.supply.residence.rulesVersion},tool:'crow',specialty:'engineer'}})
    h.owner.bootstrap();expect(h.owner.createFirst).toThrow();expect(h.owner.getState().status).toBe('blocked')
    expect(h.owner.retryRead().status).toBe('blocked');expect(h.owner.createFirst).toThrow();expect(h.storage.write).not.toHaveBeenCalled()
  })
  it('existing startup with independent facts but no bytes is blocked, never first',()=>{
    const f=fixture(),h=coldRecord(f.initial,f.deps);h.setDisk(null)
    expect(h.owner.bootstrap().status).toBe('blocked');expect(h.owner.createFirst).toThrow();expect(h.factory).not.toHaveBeenCalled()
  })
  it('malformed or getter factory results do not produce stock',()=>{
    const h=harness();h.owner.bootstrap();const bad=mutable(h.materials as Record<string,unknown>),getter=vi.fn(()=>h.materials)
    Object.defineProperty(bad,'character',{enumerable:true,get:getter});h.factory.mockReturnValueOnce(bad)
    expect(h.owner.createFirst).toThrow();expect(getter).not.toHaveBeenCalled();expect(h.owner.getState().current).toBeNull()
    expect(h.storage.write).not.toHaveBeenCalled();expect(h.listener).not.toHaveBeenCalled()
  })
})
