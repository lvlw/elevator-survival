import { afterEach, describe, expect, it, vi } from 'vitest'
import { browserFixture, setup, ready, send, cold, actions } from './test-fixtures'
import { CHECKPOINT_KEY } from './schema'
import { READING_KEY } from './narrative-entry/reading'
import { observeBrowser } from './test-observers'
import * as projection from '../../state/residence-session/narrative-entry/receipt'
import { storyText } from '../../content/infected-world-v0.1/narrative-entry/content'
afterEach(() => vi.restoreAllMocks())

describe('narrative entry owner boundary', () => {
  it('arriving at H7, previewing and canceling do not reveal the signed workorder', async () => {
    const h = browserFixture(), c = await setup(h)
    send(h.owner, 'depart', '进入封锁区'); send(h.owner, 'move', '大厅'); send(h.owner, 'move', '后勤控制间')
    expect(ready(h.owner).narrative?.known).not.toContain('H07')
    expect(storyText('H07', ready(h.owner).narrative!)).toBeNull()
    const action = actions(h.owner).find(a => a.family === 'task' && a.label === '调查停用工单')!
    expect(action).toBeTruthy()
    c.preview({ action: action.selector }); c.cancel()
    expect(ready(h.owner).narrative?.workorder).toBe(false)
    const r = send(h.owner, 'task', '调查停用工单')
    expect(r.exploration?.receipt).toMatchObject({ kind: 'workorder', story: 'H07' })
    expect(ready(h.owner).narrative?.known).toContain('H07')
    h.owner.dispose()
  })
  it('a real lit search reports same-tool consumption and a distinct one-time token', async () => {
    const h = browserFixture(), c = await setup(h, 'lamp')
    send(h.owner, 'depart', '进入封锁区'); send(h.owner, 'move', '大厅')
    const tool = ready(h.owner).carried.find(i => i.container === 'utility')!
    const before = tool.resource
    const r = send(h.owner, 'source', '大厅搜索', { item: tool.selector }, 'lit')
    const after = ready(h.owner).carried.find(i => i.container === 'utility')!.resource
    expect(before.kind).toBe('charge'); expect(after.kind).toBe('charge')
    if (before.kind !== 'none' && after.kind !== 'none') expect(r.exploration?.receipt.resource).toEqual({ kind: 'charge', spent: before.current - after.current })
    expect(r.exploration?.receipt).toMatchObject({ kind: 'search', story: 'H03', revealed: ready(h.owner).ground.length })
    expect(c.retrySave().exploration).toBeUndefined()
    expect(JSON.stringify(r.exploration?.receipt)).not.toMatch(/instanceId|runId|seed|drawIndex|enemyHealth/)
    h.owner.dispose()
  })
  it('auxiliary projection failure keeps the real commit and save, without a false rejection', async () => {
    const observer = observeBrowser(), h = browserFixture(); await setup(h)
    observer.clear(); h.setItem.mockClear()
    vi.spyOn(projection, 'explorationReceipt').mockImplementation(() => { throw new Error('TEST projection defect') })
    const r = send(h.owner, 'depart', '进入封锁区')
    expect(r.explorationDiagnostic).toBe('projection-unavailable')
    expect(ready(h.owner).phase).toBe('active-world')
    expect(observer.counts()).toMatchObject({ dispatch: 1, current: 1, notices: 1 })
    expect(h.setItem.mock.calls.filter(([k]) => k === CHECKPOINT_KEY)).toHaveLength(1)
    h.owner.dispose()
  })
  it('only actual commits emit receipts; query/save retry/restore never replay them', async () => {
    const h = browserFixture(), c = await setup(h, 'lamp', 'scout')
    expect(ready(h.owner).narrative?.known).not.toContain('H07')
    expect(ready(h.owner).narrative?.workorder).toBe(false)
    const r = send(h.owner, 'depart', '进入封锁区')
    expect(r.exploration?.receipt).toMatchObject({ kind: 'departure', story: 'H01' })
    expect(c.retrySave().exploration).toBeUndefined()
    const restored = await cold(h)
    expect(restored.getSnapshot().preplay?.feed).toEqual([])
    expect(restored.controls()!.synchronize().exploration).toBeUndefined()
    restored.dispose()
  })
  it('explicit reading writes a subordinate key without advancing or writing current; old controls cannot acknowledge', async () => {
    const h = browserFixture(), c = await setup(h)
    const checkpoint = h.disk.get(CHECKPOINT_KEY), writes = h.setItem.mock.calls.filter(([k]) => k === CHECKPOINT_KEY).length
    expect(h.disk.has(READING_KEY)).toBe(false)
    expect(c.getReading().marks).toEqual([])
    c.acknowledgeReading([{ key: 'P01', state: 'read' }, { key: 'H07', state: 'read' }])
    expect(c.getReading().marks).toEqual([{ key: 'P01', state: 'read' }])
    expect(h.disk.get(CHECKPOINT_KEY)).toBe(checkpoint)
    expect(h.setItem.mock.calls.filter(([k]) => k === CHECKPOINT_KEY)).toHaveLength(writes)
    const record = h.disk.get(READING_KEY)
    h.owner.suspend()
    expect(() => c.acknowledgeReading([{ key: 'P02', state: 'read' }])).toThrow()
    expect(h.disk.get(READING_KEY)).toBe(record)
    h.owner.dispose()
  })
  it('lost-owner acknowledgement leaves the subordinate record byte-identical', async () => {
    const h = browserFixture(), c = await setup(h)
    c.acknowledgeReading([{ key: 'P01', state: 'read' }])
    const record = h.disk.get(READING_KEY), writes = h.setItem.mock.calls.length
    h.owner.suspend()
    try { c.acknowledgeReading([{ key: 'P02', state: 'read' }]) } catch { /* Expected stale-control refusal. */ }
    expect(h.disk.get(READING_KEY)).toBe(record)
    expect(h.setItem).toHaveBeenCalledTimes(writes)
    h.owner.dispose()
  })
  it.each(['generation', 'character', 'execution', 'versions', 'storyVersion'] as const)('mismatched reading %s is ignored without changing gameplay', async field => {
    const h = browserFixture(), c = await setup(h)
    c.acknowledgeReading([{ key: 'P01', state: 'read' }])
    const bad = JSON.parse(h.disk.get(READING_KEY)!)
    if (field === 'storyVersion') bad.storyVersion = 'unknown'
    else bad.binding[field] = 'another-owner'
    h.disk.set(READING_KEY, JSON.stringify(bad))
    const checkpoint = h.disk.get(CHECKPOINT_KEY), owner = await cold(h)
    expect(owner.controls()!.getReading().marks).toEqual([])
    expect(ready(owner).narrative?.workorder).toBe(false)
    expect(h.disk.get(CHECKPOINT_KEY)).toBe(checkpoint)
    owner.dispose()
  })
  it('future and unknown-fact marks are ignored; saved gameplay survives a sidecar write failure', async () => {
    const h = browserFixture(), c = await setup(h)
    c.acknowledgeReading([{ key: 'P01', state: 'read' }])
    const record = JSON.parse(h.disk.get(READING_KEY)!)
    record.marks = [{ key: 'P02', state: 'read', revision: 999 }, { key: 'H07', state: 'read', revision: 0 }]
    h.disk.set(READING_KEY, JSON.stringify(record))
    const owner = await cold(h), controls = owner.controls()!
    expect(controls.getReading().marks).toEqual([])
    const checkpoint = h.disk.get(CHECKPOINT_KEY)
    h.setItem.mockImplementation((key, text) => { if (key === READING_KEY) throw new Error('TEST bookmark disk fault'); h.disk.set(key, text) })
    expect(() => controls.acknowledgeReading([{ key: 'P02', state: 'skipped' }])).not.toThrow()
    expect(controls.getReading().warning).toContain('阅读记录暂未保存')
    expect(ready(owner).persistence.feedback).not.toBe('save-failed')
    expect(h.disk.get(CHECKPOINT_KEY)).toBe(checkpoint)
    owner.dispose()
  })
  it('a second same-origin owner cannot acknowledge under the existing exclusive lock', async () => {
    const h = browserFixture(); await setup(h)
    const other = h.make(), record = h.disk.get(READING_KEY)
    expect((await other.acquire()).status).toBe('occupied')
    expect(other.controls()).toBeNull(); expect(h.disk.get(READING_KEY)).toBe(record)
    other.dispose(); h.owner.dispose()
  })
  it('save-failed marks stay in memory; explicit retry flushes once without an action receipt', async () => {
    const h = browserFixture(), c = await setup(h)
    h.faults.checkpoint = true
    send(h.owner, 'depart', '进入封锁区')
    c.acknowledgeReading([{ key: 'H01', state: 'dismissed' }])
    expect(c.getReading().marks).toContainEqual({ key: 'H01', state: 'dismissed' })
    expect(h.disk.has(READING_KEY)).toBe(false)
    h.faults.checkpoint = false
    expect(c.retrySave().exploration).toBeUndefined()
    expect(h.disk.has(READING_KEY)).toBe(true)
    const writes = h.setItem.mock.calls.filter(([k]) => k === READING_KEY).length
    c.retrySave()
    expect(h.setItem.mock.calls.filter(([k]) => k === READING_KEY)).toHaveLength(writes)
    h.owner.dispose()
  })
  it.each(['{', 'null', '{"version":99}'])('corrupt reading %s cannot block, clear or unlock gameplay', async raw => {
    const h = browserFixture(); await setup(h)
    const before = h.disk.get(CHECKPOINT_KEY)
    h.disk.set(READING_KEY, raw)
    const owner = await cold(h)
    expect(ready(owner).phase).toBe('first-hub')
    expect(ready(owner).narrative?.workorder).toBe(false)
    expect(owner.controls()!.getReading().warning).toBeTruthy()
    expect(h.disk.get(CHECKPOINT_KEY)).toBe(before)
    owner.dispose()
  })
})
