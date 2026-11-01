import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import type { PlayerOpponentPresentation } from '../../../state/residence-session/player-types'
import { approvedEnemyArt, enemyArtStages, type EnemyArtKey } from '../presentation/approved-enemy-art'
import { installEnemyArtImages } from '../enemy-art-test-fixtures'
import { EnemyArt } from './enemy-art'
const labels = { healthy: '完好', wounded: '受伤', 'severely-wounded': '重伤', critical: '濒危', incapacitated: '失去能力' }
let images: ReturnType<typeof installEnemyArtImages>, root: Root, host: HTMLDivElement
beforeEach(() => { images = installEnemyArtImages(); host = document.createElement('div'); document.body.append(host); root = createRoot(host) })
afterEach(async () => { await act(async () => root.unmount()); host.remove(); images.restore() })
const opponents = {
  'infected-orderly': { kind: 'known', visualKey: 'infected-orderly', name: '感染护工' },
  'infected-porter': { kind: 'known', visualKey: 'infected-porter', name: '感染装卸工' },
  'infected-technician': { kind: 'known', visualKey: 'infected-technician', name: '感染技术员' },
} as const
const known = (key: EnemyArtKey): PlayerOpponentPresentation => opponents[key]
async function render(opponent: PlayerOpponentPresentation, stage: unknown) {
  await act(async () => root.render(<EnemyArt opponent={opponent} stage={stage} stageText={typeof stage === 'string' && Object.hasOwn(labels, stage) ? labels[stage as keyof typeof labels] : '公开生命阶段'} />))
}
describe('C2 passive registered enemy layer (renderer slots, not native reachability)', () => {
  it.each(Object.keys(approvedEnemyArt) as EnemyArtKey[])('%s renders all five exact public stage slots after one group preparation', async key => {
    const opponent = known(key)
    await render(opponent, 'healthy'); expect(host.querySelector('img')).toBeNull(); expect(host.textContent).toContain(opponent.name)
    await images.finish(); expect(images.requests).toHaveLength(5)
    for (const stage of enemyArtStages) {
      await render(opponent, stage)
      const img = host.querySelector('img')!, member = approvedEnemyArt[key].stages[stage]
      expect(img).not.toBeNull(); expect(img.getAttribute('src')).toBe(member.src)
      expect(img.style.left).toBe(member.placement.left + '%'); expect(img.style.top).toBe(member.placement.top + '%'); expect(img.style.width).toBe(member.placement.width + '%')
      expect(host.querySelector('[role="img"]')?.getAttribute('aria-label')).toBe(opponent.name + ' · ' + labels[stage])
      expect(img.alt).toBe(''); expect(img.draggable).toBe(false); expect(img.hasAttribute('tabindex')).toBe(false)
      expect(host.querySelector('button,a,[tabindex]')).toBeNull(); expect(host.textContent).not.toMatch(/死亡|胜利/)
      expect(images.requests).toHaveLength(5)
    }
  })
  it('unknown/legal-stage, known/illegal-stage and prototype keys stay neutral without resource requests', async () => {
    for (const stage of enemyArtStages) await render({ kind: 'unknown', visualKey: null, name: '当前对手' }, stage)
    for (const stage of ['constructor', '__proto__', 'dead']) await render(known('infected-orderly'), stage)
    await render({ kind: 'known', visualKey: 'constructor', name: '当前对手' } as unknown as PlayerOpponentPresentation, 'healthy')
    expect(host.querySelector('img')).toBeNull(); expect(images.requests).toHaveLength(0)
  })
  it('captured previous-stage DOM error cannot fail the new stage; current member error fails the whole group', async () => {
    await render(known('infected-porter'), 'healthy'); await images.finish()
    const old = host.querySelector('img')!, stale = old.onerror!
    await render(known('infected-porter'), 'wounded'); const current = host.querySelector('img')!
    await act(async () => { stale.call(old, new Event('error')) })
    expect(host.querySelector('img')).toBe(current)
    await act(async () => { current.dispatchEvent(new Event('error')) })
    expect(host.querySelector('img')).toBeNull(); expect(host.textContent).toContain('受伤')
    await render(known('infected-porter'), 'critical'); expect(host.querySelector('img')).toBeNull(); expect(images.requests).toHaveLength(5)
  })
  it('stage changes during pending and terminal failure do not reload or secretly become ready', async () => {
    await render(known('infected-technician'), 'healthy'); await images.finish(images.requests.slice(0, 4))
    await render(known('infected-technician'), 'critical'); expect(host.querySelector('img')).toBeNull()
    await act(async () => images.requests[4].onerror!()); await render(known('infected-technician'), 'incapacitated'); await images.finish()
    expect(host.querySelector('img')).toBeNull(); expect(host.textContent).toContain('失去能力'); expect(images.requests).toHaveLength(5)
  })
})
