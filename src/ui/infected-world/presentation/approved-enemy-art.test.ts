import { describe, expect, it } from 'vitest'
import { approvedEnemyArt, enemyArtStages, selectEnemyArt, type EnemyArtKey } from './approved-enemy-art'
import type { PlayerOpponentPresentation } from '../../../state/residence-session/player-types'
import input from '../../../../docs/engineering/world-integration/presentation-c2-001/inputs/APPROVED-ASSETS.json'

// A dedicated TEST copy: negative-control corruption must fail admission, never touch source PNGs.
const approved = structuredClone(input)
const fsModule: string = 'node:fs', cryptoModule: string = 'node:crypto'
const { readFileSync } = await import(fsModule), { createHash } = await import(cryptoModule)
const known = (key: string) => ({ kind: 'known', visualKey: key, name: '当前对手' }) as unknown as PlayerOpponentPresentation
describe('C2 exact approved-byte admission, independent of Git history or network', () => {
  it('admits exactly three own-property groups and five own-property stages', () => {
    expect(Object.keys(approvedEnemyArt)).toEqual(approved.groups.map(g => g.visualKey))
    for (const group of Object.values(approvedEnemyArt)) expect(Object.keys(group.stages)).toEqual(approved.stages)
    expect(approved.assets).toHaveLength(15)
    expect(approved.assets.reduce((n, a) => n + a.bytes, 0)).toBe(13_907_305)
  })
  it.each(approved.assets)('$visualKey/$enemyStage is the exact approved PNG, native dimensions and registration pairing', row => {
    const group = approvedEnemyArt[row.visualKey as EnemyArtKey], stage = row.enemyStage as typeof enemyArtStages[number]
    const member = group.stages[stage], bytes = readFileSync(new URL('../../../../' + row.destinationPath, import.meta.url))
    expect(createHash('sha256').update(bytes).digest('hex'), 'approved PNG SHA-256 binding').toBe(row.sha256)
    expect(bytes.length).toBe(row.bytes); expect(bytes.subarray(0, 8).toString('hex')).toBe('89504e470d0a1a0a')
    expect([bytes.readUInt32BE(16), bytes.readUInt32BE(20)]).toEqual(row.nativePixels)
    expect([member.width, member.height]).toEqual(row.nativePixels)
    expect(member.src.split('?')[0].endsWith(row.destinationPath.split('/').at(-1)!)).toBe(true)
    expect(member.placement).toEqual(row.registration.imageCss)
    expect(row.registration.canvas).toEqual([1536, 1920]); expect(row.registration.pixelRewrite).toBe(false)
    expect(selectEnemyArt(known(row.visualKey), stage)).toBe(group)
  })
  it.each(['constructor', 'toString', '__proto__', 'infected-stranger', '隔离走廊', ''])('rejects unapproved identity %s without prototype/default inference', key => {
    expect(selectEnemyArt(known(key), 'healthy')).toBeNull()
  })
  it.each(['constructor', 'toString', '__proto__', 'dead', '', undefined, null])('rejects illegal stage %s', stage => {
    expect(selectEnemyArt(known('infected-orderly'), stage)).toBeNull()
  })
  it('unknown cannot acquire art even when supplied a known-looking key', () => {
    expect(selectEnemyArt({ kind: 'unknown', visualKey: 'infected-orderly', name: '当前对手' } as unknown as PlayerOpponentPresentation, 'healthy')).toBeNull()
  })
})
