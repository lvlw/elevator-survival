// TEST ONLY tooling. Real producers and strict codecs; no browser/prototype state emulation.
import { it, expect } from 'vitest'
import { writeFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { caseRecords } from '../../../../src/ui/infected-world/committed-presentation-test-fixtures'
import { RESERVATION_KEY, CHECKPOINT_KEY } from '../../../../src/app/infected-browser/schema'
it('prepares four genuine legal checkpoints with independent producer materials before browser use', () => {
  const cases = Object.fromEntries((['defend', 'death', 'victory', 'retreat'] as const).map(id => [id, caseRecords(id)]))
  expect(process.env.C1_BROWSER_RECORDS).toBeTruthy()
  writeFileSync(process.env.C1_BROWSER_RECORDS!, JSON.stringify({ reservationKey: RESERVATION_KEY, checkpointKey: CHECKPOINT_KEY, cases }))
  console.log('C1-BROWSER-RECORDS '+JSON.stringify(Object.entries(cases).map(([id, record]) => ({ id,
    reservationSHA256: createHash('sha256').update(record.reservation).digest('hex'), checkpointSHA256: createHash('sha256').update(record.checkpoint).digest('hex') }))))
})
