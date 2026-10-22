// TEST ONLY. This lock implementation is headless evidence, never a browser lock claim.
import { expect, vi } from 'vitest'
import { createInfectedBrowserOwner } from './owner'
import { RESERVATION_KEY, CHECKPOINT_KEY } from './schema'
import type { BrowserEnvironment, BrowserOwner, BrowserControls, BrowserStorage } from './types'
import type { PlayerReadyView, PlayerRequest } from '../../state/residence-session/player-types'
export function testLocks() {
  let held = false
  const request = vi.fn((_name: string, options: { ifAvailable: boolean; mode: string }, callback: (lock: unknown) => unknown) => {
    expect(options).toEqual({ mode: 'exclusive', ifAvailable: true })
    if (held) return Promise.resolve(callback(null))
    held = true
    return Promise.resolve(callback({ name: _name, mode: 'exclusive' })).finally(() => { held = false })
  })
  return { manager: { request } as unknown as Pick<LockManager, 'request'>, request, held: () => held }
}
export function browserFixture(seed = 'E03-A-seed-01') {
  const disk = new Map<string, string>(), faults = { read: false, reservation: false, checkpoint: false }
  const getItem = vi.fn((key: string) => { if (faults.read) throw new Error('TEST read'); return disk.get(key) ?? null })
  const setItem = vi.fn((key: string, text: string): void => {
    if (key === RESERVATION_KEY && faults.reservation || key === CHECKPOINT_KEY && faults.checkpoint) throw new Error('TEST write')
    disk.set(key, text)
  })
  const storage: BrowserStorage = { getItem, setItem }, locks = testLocks(), lifecycle = new EventTarget()
  const entropy = vi.fn(() => ({ characterId: 'E03-A-character', runId: 'E03-A-execution', seed, generation: 'TEST-generation' }))
  const environment: BrowserEnvironment = { secure: true, locks: locks.manager, storage: () => storage, entropy, lifecycle }
  const make = () => createInfectedBrowserOwner({ environment: () => environment })
  const owner = make()
  return { owner, make, disk, faults, storage, getItem, setItem, locks, entropy, environment, lifecycle }
}
export async function setup(h: ReturnType<typeof browserFixture>, tool = 'crow', specialty = 'engineer') {
  expect((await h.owner.acquire()).status).toBe('setup')
  expect(h.owner.controls()!.confirmSetup({ tool, specialty }).status).toBe('ready')
  return h.owner.controls()!
}
export function ready(owner: BrowserOwner): PlayerReadyView {
  const v = owner.getSnapshot().preplay?.view
  if (v?.status !== 'ready') throw new Error('TEST expected browser ready: '+JSON.stringify(owner.getSnapshot()))
  return v
}
export function actions(owner: BrowserOwner) {
  const v = ready(owner)
  return [...v.actions, ...v.move.options, ...v.tasks.choices, ...v.sources.flatMap(s => s.choices), ...(v.combat?.actions ?? [])]
}
export function choose(owner: BrowserOwner, family: string, label: string, method?: string) {
  const a = actions(owner).find(a => a.family === family && a.label === label && (method === undefined || a.method === method))
  if (!a) throw new Error('Missing public browser choice '+family+'/'+label+'/'+method)
  return a.selector
}
export function send(owner: BrowserOwner, family: string, label: string, fields: Omit<PlayerRequest, 'action'> = {}, method?: string) {
  const c = owner.controls()!, r = c.execute({ action: choose(owner, family, label, method), ...fields })
  const done = r.kind === 'confirmation-required' ? c.confirm(r.confirmation!) : r
  expect(done.kind).toBe('committed'); return done
}
export async function cold(h: ReturnType<typeof browserFixture>) {
  h.owner.dispose(); await Promise.resolve(); await Promise.resolve()
  const owner = h.make(); expect((await owner.acquire()).status).toBe('ready'); return owner
}
export function commitRequest(c: BrowserControls, request: PlayerRequest) {
  const r = c.execute(request); return r.kind === 'confirmation-required' ? c.confirm(r.confirmation!) : r
}
