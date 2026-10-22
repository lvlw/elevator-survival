import { expect, it } from 'vitest'
import { readBrowserIdentity, generateBrowserIdentity } from './identity-materials'
it('environment entropy produces strictly validated identities, not a gameplay random call',()=>{
  const m=generateBrowserIdentity();expect(Object.isFrozen(m)).toBe(true);expect(Object.keys(m).sort()).toEqual(['characterId','generation','runId','seed'])
  expect(new Set(Object.values(m)).size).toBe(4)
})
it.each([null,{}, {characterId:'x',runId:'x',seed:'x',generation:'x',extra:1},{characterId:'x',runId:'x',seed:' x',generation:'x'},Promise.resolve('x')])('rejects malformed identity %j',v=>{expect(()=>readBrowserIdentity(v)).toThrow()})
