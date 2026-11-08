import { afterEach, expect, it, vi } from 'vitest'
import { boundaryRecords } from '../../../docs/engineering/world-integration/preplay/browser-owner/validation/browser-cases'
import { CHECKPOINT_KEY, RESERVATION_KEY } from './schema'
import { READING_KEY } from './narrative-entry/reading'
import { browserFixture, cold, ready, send, setup } from './test-fixtures'
import { observeBrowser } from './test-observers'

const choices = { tool: 'crow', specialty: 'engineer' }
const newIdentity = { characterId: 'replacement-character', runId: 'replacement-run', seed: 'replacement-seed', generation: 'replacement-generation' }
afterEach(() => vi.restoreAllMocks())

async function death(fail = false) {
  const h = browserFixture()
  const records = boundaryRecords('alive-enemy')
  h.disk.set(RESERVATION_KEY, records.reservation)
  h.disk.set(CHECKPOINT_KEY, records.checkpoint)
  await h.owner.acquire()
  h.faults.checkpoint = fail
  send(h.owner, 'combat', '防御')
  expect(ready(h.owner).phase).toBe('dead')
  h.entropy.mockReturnValue(newIdentity)
  h.setItem.mockClear()
  return h
}

it('rejects replacement outside dead and permits a zero-write, zero-entropy cancel in a cold legacy death', async () => {
  const living = browserFixture()
  const controls = await setup(living)
  expect(() => controls.beginNewAttempt()).toThrow()
  living.owner.dispose()

  const h = await death()
  const owner = await cold(h)
  const dead = owner.controls()!
  const before = [...h.disk]
  dead.beginNewAttempt()
  dead.cancelNewAttempt()
  expect(() => dead.confirmNewAttempt(choices)).toThrow()
  expect(h.setItem).not.toHaveBeenCalled()
  expect(h.entropy).not.toHaveBeenCalled()
  expect([...h.disk]).toEqual(before)
  owner.dispose()
})

it('requires the original death save and only replaces after a successful save-only retry', async () => {
  const h = await death(true)
  const old = h.owner.controls()!
  expect(() => old.beginNewAttempt()).toThrow()
  expect(h.entropy).not.toHaveBeenCalled()
  expect(h.setItem).not.toHaveBeenCalled()
  h.faults.checkpoint = false
  old.retrySave()
  expect(ready(h.owner).phase).toBe('dead')
  expect(JSON.parse(h.disk.get(CHECKPOINT_KEY)!).expected.phase).toBe('dead')
  h.setItem.mockClear()
  old.beginNewAttempt()
  expect(old.confirmNewAttempt(choices)).toBe('saved')
  expect(h.setItem).toHaveBeenCalledTimes(1)
  expect(ready(h.owner).point).toBe('first-hub')
  expect(() => old.retryNewAttempt()).toThrow()
  expect(() => old.getSnapshot()).toThrow()
  expect(h.entropy).toHaveBeenCalledOnce()
  h.owner.dispose()
})

it('retains the exact old records at prewrite faults and reuses one strictly prepared initial on retry', async () => {
  const h = await death()
  const observed = observeBrowser()
  const old = h.owner.controls()!
  h.disk.set(READING_KEY, 'TEST old reading bytes')
  const before = [...h.disk]
  old.beginNewAttempt()
  h.faults.read = true
  expect(old.confirmNewAttempt(choices)).toBe('save-failed')
  expect(h.setItem).not.toHaveBeenCalled()
  expect([...h.disk]).toEqual(before)
  h.faults.read = false
  h.faults.checkpoint = true
  expect(old.retryNewAttempt()).toBe('save-failed')
  expect([...h.disk]).toEqual(before)
  expect(() => old.confirmNewAttempt(choices)).toThrow()
  h.faults.checkpoint = false
  expect(old.retryNewAttempt()).toBe('saved')
  expect(observed.counts()).toMatchObject({ initial: 1, dispatch: 0 })
  expect(h.entropy).toHaveBeenCalledOnce()
  const disk = JSON.parse(h.disk.get(CHECKPOINT_KEY)!)
  expect(disk.reservation).toMatchObject({ generation: newIdentity.generation, characterId: newIdentity.characterId })
  expect(disk.checkpoint).toMatchObject({ generation: newIdentity.generation, expected: { phase: 'first-hub' } })
  expect(h.disk.get(RESERVATION_KEY)).toBe(before.find(([key]) => key === RESERVATION_KEY)?.[1])
  const fresh = h.owner.controls()!
  expect(fresh.getReading()).toEqual({ marks: [], warning: null })
  fresh.acknowledgeReading([{ key: 'P01', state: 'skipped' }])
  expect(fresh.getReading().marks).toContainEqual({ key: 'P01', state: 'skipped' })
  expect(h.disk.get(READING_KEY)).toBe('TEST old reading bytes')
  expect(h.disk.has(READING_KEY + '.' + newIdentity.generation)).toBe(true)
  send(h.owner, 'depart', '进入封锁区')
  expect(JSON.parse(h.disk.get(CHECKPOINT_KEY)!).checkpoint.expected.phase).toBe('active-world')
  h.setItem.mockClear()
  const reload = await cold(h)
  expect(ready(reload).point).toBe('stable-active')
  expect(h.setItem).not.toHaveBeenCalled()
  expect(reload.controls()!.getReading().marks).toContainEqual({ key: 'P01', state: 'skipped' })
  reload.dispose()
})

it.each(['before', 'after'] as const)('cold restore at interruption %s the single commit', async at => {
  const h = await death()
  const old = h.owner.controls()!
  const legacy = h.disk.get(CHECKPOINT_KEY)
  old.beginNewAttempt()
  if (at === 'before') {
    const read = h.getItem.getMockImplementation()!
    h.getItem.mockImplementationOnce(key => { const value = read(key); h.owner.suspend(); return value })
  } else {
    const write = h.setItem.getMockImplementation()!
    h.setItem.mockImplementationOnce((key, text) => { write(key, text); h.owner.suspend() })
  }
  expect(old.confirmNewAttempt(choices)).toBe(at === 'before' ? 'save-failed' : 'saved')
  expect(() => old.retryNewAttempt()).toThrow()
  expect(h.disk.get(CHECKPOINT_KEY) === legacy).toBe(at === 'before')
  h.setItem.mockClear()
  const owner = await cold(h)
  expect(ready(owner).point).toBe(at === 'before' ? 'dead' : 'first-hub')
  expect(h.setItem).not.toHaveBeenCalled()
  expect(h.entropy).toHaveBeenCalledOnce()
  owner.dispose()
})
