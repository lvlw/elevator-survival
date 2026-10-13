import { afterEach, describe, expect, expectTypeOf, it, vi } from 'vitest'
import * as ordinary from './combat-index'
import * as controlled from './combat-controlled'
import { harness, start, current, request, reject } from './combat-test-fixtures'
import { enter } from './combat-test-routes'
import type { CombatSession } from './combat-types'
import {observe} from './combat-test-observers'
afterEach(()=>vi.restoreAllMocks())
describe('S12 explicit v4 owner and strict commands',()=>{
  it.each(['sparse','extra-array-key'] as const)('rejects %s nested inputs before authority or producer',mode=>{
    const h=harness();start(h);const inputs:unknown[]=[{instanceId:'x',quantity:1}]
    if(mode==='sparse')delete inputs[0];else Object.assign(inputs,{extra:true})
    const o=observe(h);o.clear()
    reject(h,request(h,'maintenance',{kind:'coat',instanceId:'x',inputs}),'INVALID_COMMAND')
    expect(o.counts()).toMatchObject({authority:0,maintenance:0,write:0,current:0})
  })
  it('has only controlled construction and no ordinary mutation escape',()=>{
    expect(Object.keys(ordinary).sort()).toEqual(['ResidenceSessionError'])
    expect(Object.keys(controlled).sort()).toEqual(['createCombatSession','createResidenceSessionDomain'])
    expectTypeOf<CombatSession>().not.toHaveProperty('setState'); expectTypeOf<CombatSession>().not.toHaveProperty('replace')
    const h=harness(); start(h)
    expect(Object.keys(h.owner).sort()).toEqual(['bootstrap','createFirst','dispatch','getState','queryCombat','queryTerminal','retryRead','retrySave','subscribe'])
    const before=current(h); expect(h.owner.queryCombat()).toBeNull(); expect(h.owner.queryTerminal()?.withdraw).toBe(true)
    expect(current(h)).toBe(before); expect(Object.isFrozen(h.owner.getState())).toBe(true)
  })
  it.each([null,[],{}, {kind:'move',command:{},nextState:{}},
    {kind:'move',command:{kind:'move',expectedRevision:true,edgeId:'x'}},
    {kind:'move',command:{kind:'move',expectedRevision:1.5,edgeId:'x'}},
    {kind:'move',command:{kind:'move',expectedRevision:1,edgeId:'x',roll:0}}])('strict malformed envelope %# never commits',bad=>{
    const h=harness(); start(h); reject(h,bad)
  })
  it('rejects nested getters without executing them or freezing caller data',()=>{
    const h=harness(); start(h); const getter=vi.fn(()=>1),command={kind:'move',edgeId:'H0-H1:forward'}
    Object.defineProperty(command,'expectedRevision',{get:getter,enumerable:true})
    reject(h,{kind:'move',command},'INVALID_COMMAND'); expect(getter).not.toHaveBeenCalled(); expect(Object.isFrozen(command)).toBe(false)
  })
  it('preserves submitted input and rejects stale revision before another operation',()=>{
    const h=harness(); start(h); const req=request(h,'move',{edgeId:'H0-H1:forward'}),copy=structuredClone(req)
    h.owner.dispatch(req); expect(req).toEqual(copy); expect(Object.isFrozen(req)).toBe(false); reject(h,req,'STALE_COMMAND')
  })
  it('battle query is read-only and no query performs a save',()=>{
    const h=harness(); enter(h); const before=current(h),writes=h.storage.write.mock.calls.length
    const query=h.owner.queryCombat(); expect(query?.actions.length).toBeGreaterThan(0); expect(Object.isFrozen(query)).toBe(true)
    expect(h.owner.queryTerminal()).toEqual({deliver:false,withdraw:false,deadline:false})
    expect(h.owner.queryCombat()).toEqual(query); expect(current(h)).toBe(before);expect(h.storage.write).toHaveBeenCalledTimes(writes)
  })
})
