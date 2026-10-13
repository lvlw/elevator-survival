import {afterEach,describe,expect,it,vi} from 'vitest'
import {fixture,coldRecord,harness,current} from './combat-test-fixtures'
import {firstHarness as v1} from './test-fixtures'
import {firstHarness as v2} from './terminal-test-fixtures'
import {harness as v3,expectation as expected3} from './supply-test-fixtures'
import {deserializeResidenceSave} from '../residence-save/codec'
import {deserializeTerminalResidenceSave} from '../residence-save/terminal-codec'
import {deserializeSupplyResidenceSave} from '../residence-save/supply-codec'
afterEach(()=>vi.restoreAllMocks())
describe('S12 old format and protocol protection',()=>{
  it.each([1,2,3])('v4 owner rejects version %i and null retry never creates a character',version=>{
    const f=fixture(),h=coldRecord(f.initial,f.deps),wire=JSON.parse(h.disk()!)
    wire.formatVersion=version;h.setDisk(JSON.stringify(wire))
    expect(h.owner.bootstrap()).toMatchObject({status:'blocked',diagnostic:'UNKNOWN_VERSION'})
    h.setDisk(null);expect(h.owner.retryRead().status).toBe('blocked');expect(h.owner.createFirst).toThrow()
    expect(h.factory).not.toHaveBeenCalled();expect(h.storage.write).not.toHaveBeenCalled()
  })
  it.each([1,2,3])('unchanged version %i decoder rejects complete v4 bytes',version=>{
    const h=harness();h.owner.bootstrap();h.owner.createFirst();const text=h.disk()!
    const one=v1(),two=v2(),three=v3();three.owner.bootstrap();three.owner.createFirst()
    const run=()=>version===1?deserializeResidenceSave(text,one.policy):version===2?deserializeTerminalResidenceSave(text,two.policy):
      deserializeSupplyResidenceSave(text,expected3(three.owner.getState().current!,three.deps),three.policy)
    expect(run).toThrow();expect(current(h).phase).toBe('first-hub')
  })
})
