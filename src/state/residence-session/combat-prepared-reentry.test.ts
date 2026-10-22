import { expect, it, vi } from 'vitest'
import { harness } from './combat-test-fixtures'
import { buildCombatSession } from './combat-session'
import { createResidenceSessionDomain } from './controlled'
it('prepared writer and original native listener cannot reenter commit or retry', () => {
  const h=harness(), codes:string[]=[]
  const reenter=()=>{for(const op of [owner.retrySave,owner.createFirst,owner.bootstrap])try{op()}catch(e){codes.push((e as {code:string}).code)}}
  const write=vi.fn(reenter), owner=buildCombatSession(createResidenceSessionDomain(),{...h.composition,storage:{mode:'prepared',read:()=>null,writePrepared:write}})
  owner.subscribe(reenter);owner.bootstrap();owner.createFirst()
  expect(codes).toEqual(Array(6).fill('BUSY'));expect(write).toHaveBeenCalledTimes(1)
})
