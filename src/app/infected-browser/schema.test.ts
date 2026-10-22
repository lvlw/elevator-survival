import { expect, it } from 'vitest'
import { choicesSchema, readRecord } from './schema'
it.each([{tool:'crow',specialty:'unknown'},{tool:'crow',specialty:'scout',extra:1},null,[]])('strict setup %j',v=>expect(()=>readRecord(choicesSchema,v)).toThrow())
it('does not execute accessors or freeze caller-owned input',()=>{
  let calls=0;const bad={get tool(){calls++;return 'crow'},specialty:'engineer'};expect(()=>readRecord(choicesSchema,bad)).toThrow();expect(calls).toBe(0)
  const raw={tool:'crow',specialty:'engineer'},out=readRecord(choicesSchema,raw);expect(out).toEqual(raw);expect(Object.isFrozen(raw)).toBe(false);expect(Object.isFrozen(out)).toBe(true)
})
