import { expect, it } from 'vitest'

import { boundaryRecord } from './record'
it('strict combat codec accepts the declared TEST-only inventory boundary',()=>{
  const record=boundaryRecord()
  expect(record.value.carried.backpack.items.length).toBeGreaterThan(10)
})
