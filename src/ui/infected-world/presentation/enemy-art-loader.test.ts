import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { approvedEnemyArt } from './approved-enemy-art'
import { prepareEnemyArt, ENEMY_ART_TIMEOUT_MS } from './enemy-art-loader'
import { installEnemyArtImages } from '../enemy-art-test-fixtures'

let images: ReturnType<typeof installEnemyArtImages>
const disposals: (() => void)[] = []
beforeEach(() => { images = installEnemyArtImages(); vi.useFakeTimers() })
afterEach(() => { for (const cancel of disposals.splice(0)) cancel(); images.restore(); vi.useRealTimers(); vi.unstubAllGlobals() })
function start() { const ready = vi.fn(), failed = vi.fn(), p = prepareEnemyArt(approvedEnemyArt['infected-orderly'], ready, failed); disposals.push(p.cancel); return { ...p, ready, failed } }
describe('C2 bounded five-native-image preparation', () => {
  it('prepares only this group and waits for all five successful decodes, not first/fourth success', async () => {
    const h = start(); expect(images.requests).toHaveLength(5)
    expect(images.requests.every(i => i.src.includes('enemy_infected_orderly'))).toBe(true)
    await images.finish(images.requests.slice(0, 1)); expect(h.ready).not.toHaveBeenCalled()
    await images.finish(images.requests.slice(1, 4)); expect(h.ready).not.toHaveBeenCalled()
    images.requests[4].load(); await Promise.resolve(); expect(h.ready).not.toHaveBeenCalled()
    images.requests[4].resolveDecode(); await Promise.resolve(); expect(h.ready).toHaveBeenCalledTimes(1)
    expect(h.failed).not.toHaveBeenCalled(); expect(vi.getTimerCount()).toBe(0)
    expect(images.requests.every(i => !i.onload && !i.onerror)).toBe(true)
  })
  it.each([0, 1, 2, 3, 4])('one member %i load failure makes the whole generation terminal', async index => {
    const h = start(), stale = images.requests.map(i => i.onload)
    images.requests[index].onerror!(); await images.finish()
    for (const callback of stale) callback?.()
    expect(h.failed).toHaveBeenCalledTimes(1); expect(h.ready).not.toHaveBeenCalled(); expect(vi.getTimerCount()).toBe(0)
  })
  it('native decode rejection fails all five and never leaks a rejected promise', async () => {
    const h = start(); images.requests[2].load(); images.requests[2].rejectDecode(Error('TEST decode')); await Promise.resolve()
    await images.finish(); expect(h.failed).toHaveBeenCalledTimes(1); expect(h.ready).not.toHaveBeenCalled()
  })
  it.each(['before-decode', 'after-decode'] as const)('rejects incorrect native dimensions %s', async when => {
    const h = start(), image = images.requests[1]
    image.load(when === 'before-decode' ? 1 : undefined)
    if (when === 'after-decode') image.naturalHeight = 1
    image.resolveDecode(); await Promise.resolve(); expect(h.failed).toHaveBeenCalledTimes(1); expect(h.ready).not.toHaveBeenCalled()
  })
  it('has one fixed 10,000ms group deadline including hung decode; late successes cannot revive it', async () => {
    const h = start(), oldTimeout = images.requests[0].onerror!
    images.requests[0].load(); await images.finish(images.requests.slice(1))
    vi.advanceTimersByTime(ENEMY_ART_TIMEOUT_MS - 1); expect(h.failed).not.toHaveBeenCalled()
    vi.advanceTimersByTime(1); expect(h.failed).toHaveBeenCalledTimes(1)
    images.requests[0].resolveDecode(); oldTimeout(); await Promise.resolve()
    expect(h.ready).not.toHaveBeenCalled(); expect(h.failed).toHaveBeenCalledTimes(1); expect(vi.getTimerCount()).toBe(0)
  })
  it('cancel detaches all handlers/timer; captured late callbacks and decode do not write back', async () => {
    const h = start(), load = images.requests[0].onload!, error = images.requests[1].onerror!
    images.requests[0].load(); h.cancel(); load(); error(); await images.finish(); vi.advanceTimersByTime(20_000)
    expect(h.ready).not.toHaveBeenCalled(); expect(h.failed).not.toHaveBeenCalled()
    expect(images.requests.every(i => !i.onload && !i.onerror)).toBe(true)
  })
  it('does not decode duplicate captured load events more than once', async () => {
    const h = start(), callback = images.requests[0].onload!
    images.requests[0].load(); callback(); callback(); await images.finish()
    expect(images.requests[0].decode).toHaveBeenCalledTimes(1); expect(h.ready).toHaveBeenCalledTimes(1)
  })
  it.each(['Image', 'decode'])('missing %s conservatively fails without extra groups or timers', capability => {
    if (capability === 'Image') vi.stubGlobal('Image', undefined)
    else vi.stubGlobal('Image', class { decode = undefined })
    const h = start(); expect(h.failed).toHaveBeenCalledTimes(1); expect(h.ready).not.toHaveBeenCalled(); expect(vi.getTimerCount()).toBe(0)
  })
})
