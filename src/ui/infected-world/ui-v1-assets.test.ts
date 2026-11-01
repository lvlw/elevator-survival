import { describe, expect, it } from 'vitest'
import manifest from '../../../docs/engineering/world-integration/ui-v1-integration-001/adopted-assets.json'
import { itemImage, itemPlaceholder, sceneArt, hubImage } from './assets'
const fsModule: string = 'node:fs', cryptoModule: string = 'node:crypto'
const { readFileSync } = await import(fsModule), { createHash } = await import(cryptoModule)

describe('UI v1 exact existing art admission and public bindings', () => {
  it('admits the authorized 46 assets, 19 items, 24 locations and unchanged 15 enemy PNGs', () => {
    expect(manifest.assets).toHaveLength(46)
    expect(manifest.assets.filter(a => a.usage === 'item')).toHaveLength(19)
    expect(manifest.locationBindings).toHaveLength(24)
    expect(manifest.unchangedEnemies).toHaveLength(15)
  })
  it.each(manifest.assets)('$key keeps exact bytes, native pixels and its original source', row => {
    const bytes = readFileSync(new URL('../../../' + row.runtimePath, import.meta.url))
    const source = readFileSync(new URL('../../../' + row.repositoryPath, import.meta.url))
    expect(bytes.equals(source)).toBe(true)
    expect(createHash('sha256').update(bytes).digest('hex')).toBe(row.sha256)
    expect(bytes.length).toBe(row.bytes)
    expect(bytes.subarray(0, 8).toString('hex')).toBe('89504e470d0a1a0a')
    expect([bytes.readUInt32BE(16), bytes.readUInt32BE(20)]).toEqual(row.nativePixels)
    for (const name of row.publicItemNames) expect(itemImage(name).split('?')[0].endsWith(row.runtimePath.split('/').at(-1)!)).toBe(true)
  })
  it.each(manifest.locationBindings)('$publicLocation.name selects only its current public place and exact focal', row => {
    const selected = sceneArt(row.publicLocation, 'stable-active')
    const asset = manifest.assets.find(a => a.key === row.assetKey)!
    expect(selected?.src.split('?')[0].endsWith(asset.runtimePath.split('/').at(-1)!)).toBe(true)
    expect(selected?.focal).toEqual(row.focal)
  })
  it('does not infer scene identity from a room name or confuse the hospital anteroom with the hub', () => {
    expect(sceneArt({ place: '未知', name: '大厅' }, 'stable-active')).toBeNull()
    expect(sceneArt(null, 'dead')).toBeNull()
    expect(sceneArt(null, 'first-hub')?.src).toBe(hubImage)
    expect(sceneArt({ place: '医院', name: '电梯前室' }, 'stable-active')?.src).not.toBe(hubImage)
    for (const name of ['constructor', '__proto__', 'toString', '未知物品']) expect(itemImage(name)).toBe(itemPlaceholder)
  })
  it.each(manifest.unchangedEnemies)('$visualKey/$enemyStage remains byte identical', row => {
    const bytes = readFileSync(new URL('../../../' + row.destinationPath, import.meta.url))
    expect(createHash('sha256').update(bytes).digest('hex')).toBe(row.sha256)
  })
})
