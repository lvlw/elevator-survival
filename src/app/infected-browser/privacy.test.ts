import { expect, it } from 'vitest'
import { browserFixture, setup } from './test-fixtures'
it('ordinary browser snapshot excludes reservation, expected, original text and identity fields',async()=>{
  const h=browserFixture();await setup(h);const serialized=JSON.stringify(h.owner.getSnapshot())
  for(const key of ['characterId','runId','seed','generation','expected','v4Text','origins','execution','riskPercent','drawIndex','streamId','pendingInfectionExposures'])expect(serialized).not.toContain('"'+key+'"')
  for(const secret of ['E03-A-character','E03-A-execution','E03-A-seed-01','TEST-generation'])expect(serialized).not.toContain(secret)
  h.owner.dispose()
})
