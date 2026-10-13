import { afterEach, describe, expect, it, vi } from 'vitest'
import { createCombatSession,createResidenceSessionDomain } from './combat-controlled'
import { createResidenceSession } from './controlled'
import { createTerminalResidenceSession } from './terminal-controlled'
import { createSupplySession } from './supply-controlled'
import { firstHarness as v1 } from './test-fixtures'
import { firstHarness as v2 } from './terminal-test-fixtures'
import { harness as v3 } from './supply-test-fixtures'
import { harness,start } from './combat-test-fixtures'
import type { CombatSessionComposition } from './combat-types'
import type { ResidenceDomain } from './types'
afterEach(()=>vi.restoreAllMocks())
describe('S01 four-version shared writer domain',()=>{
  it.each([1,2,3,4].flatMap(a=>[1,2,3,4].map(b=>[a,b])))('%i then %i cannot claim another writer',(a,b)=>{
    const one=v1(),two=v2(),three=v3(),four=harness(),domain=[one,two,three,four][a-1].domain
    const create=()=>b===1?createResidenceSession(domain,one.composition):b===2?createTerminalResidenceSession(domain,two.composition):
      b===3?createSupplySession(domain,three.composition):createCombatSession(domain,four.composition)
    expect(create).toThrowError(expect.objectContaining({code:'DOMAIN_CLAIMED'}));expect(four.storage.read).not.toHaveBeenCalled()
  })
  it.each(['extra','getter','port-getter','policy','async-read','async-write','generator','initial','cold','startup','function-tag'])(
    'invalid %s composition leaves the issued domain available',mode=>{
      const h=harness(),domain=createResidenceSessionDomain(),c:Record<string,unknown>={...h.composition},getter=vi.fn(()=>h.policy)
      if(mode==='extra')c.supported=true
      if(mode==='getter')Object.defineProperty(c,'policy',{enumerable:true,get:getter})
      if(mode==='port-getter'){const port={write:h.storage.write};Object.defineProperty(port,'read',{enumerable:true,get:getter});c.storage=port}
      if(mode==='policy')c.policy={...h.policy}
      if(mode==='async-read')c.storage={...h.storage,read:async()=>null}
      if(mode==='async-write')c.storage={...h.storage,write:async()=>{}}
      if(mode==='generator')c.provideInitialMaterials=function*(){yield h.materials}
      if(mode==='initial')c.provideInitialMaterials=async()=>h.materials
      if(mode==='cold')c.provideColdExpectation=async()=>null
      if(mode==='startup')c.startup='guess'
      if(mode==='function-tag'){const fn=()=>null;Object.defineProperty(fn,Symbol.toStringTag,{get:getter});c.storage={read:fn,write:h.storage.write}}
      expect(()=>createCombatSession(domain,c as CombatSessionComposition)).toThrow()
      expect(()=>createCombatSession(domain,h.composition)).not.toThrow()
      expect(getter).not.toHaveBeenCalled();expect(h.factory).not.toHaveBeenCalled()
    })
  it('rejects cloned domains and captures unfrozen caller ports',()=>{
    const h=harness()
    for(const fake of [{},{...h.domain},structuredClone(h.domain)])expect(()=>createCombatSession(fake as ResidenceDomain,h.composition))
      .toThrowError(expect.objectContaining({code:'INVALID_DOMAIN'}))
    expect(Object.isFrozen(h.composition)).toBe(false);expect(Object.isFrozen(h.storage)).toBe(false)
    h.storage.read=vi.fn(()=>{throw new Error('replaced shell')});start(h);expect(h.storage.read).not.toHaveBeenCalled()
  })
})
