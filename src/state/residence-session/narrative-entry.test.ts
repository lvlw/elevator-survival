import { afterEach, expect, it, vi } from 'vitest'
import { browserFixture, setup, send, ready } from '../../app/infected-browser/test-fixtures'
import { observeBrowser } from '../../app/infected-browser/test-observers'
import { explorationReceipt } from './narrative-entry/receipt'
import { storyText } from '../../content/infected-world-v0.1/narrative-entry/content'
afterEach(() => vi.restoreAllMocks())

it('synthetic receipt vectors preserve truncated 1→0 and zero tool use, rejecting wrong-instance and stale bindings', async () => {
  const o = observeBrowser(), h = browserFixture(); await setup(h)
  try {
    send(h.owner, 'depart', '进入封锁区'); send(h.owner, 'move', '大厅')
    const session = o.owners.at(-1)!, before = session.getState().current!, tool = before.carried.equipment.utility!
    const publicTool = ready(h.owner).carried.find(i => i.container === 'utility')!
    send(h.owner, 'task', '隔离防火门', { item: publicTool.selector }, 'crow')
    const after = session.getState().current!
    const command = { kind: 'task' as const, command: { kind: 'task' as const, expectedRevision: before.character.revision,
      actionId: 'fire-door', method: 'crow' as const, toolInstanceId: tool.instanceId } }
    const withTool = (value: typeof before, current: number) => ({ ...value, itemStates: { states: value.itemStates.states.map(s => s.instanceId === tool.instanceId && s.resource.kind !== 'none' ? { ...s, resource: { ...s.resource, current } } : s) } })
    expect(explorationReceipt(withTool(before, 1), withTool(after, 0), command)?.resource).toEqual({ kind: 'durability', spent: 1 })
    expect(explorationReceipt(withTool(before, 0), withTool(after, 0), command)?.resource).toEqual({ kind: 'durability', spent: 0 })
    expect(explorationReceipt(before, after, { ...command, command: { ...command.command, toolInstanceId: 'not-the-tool' } })).toBeNull()
    expect(explorationReceipt(before, after, { ...command, command: { ...command.command, expectedRevision: before.character.revision + 1 } })).toBeNull()
    expect(ready(h.owner).narrative?.doorParts).toBe(false)
    expect(storyText('H05', ready(h.owner).narrative!)).not.toContain('电子材料')
  } finally { h.owner.dispose() }
})

it('real search branches display only their actual contents; opening the known text cannot draw or grant', async () => {
  const branches = new Set<string>()
  for (let n = 0; n < 16 && branches.size < 2; n++) {
    const h = browserFixture(`narrative-two-branches-${n}`); await setup(h, 'lamp')
    try {
      send(h.owner, 'depart', '进入封锁区'); send(h.owner, 'move', '大厅'); send(h.owner, 'move', '药房')
      const item = ready(h.owner).carried.find(i => i.container === 'utility')!
      const result = send(h.owner, 'source', '药房搜索', { item: item.selector }, 'lit')
      const view = ready(h.owner), before = h.disk.size, writes = h.setItem.mock.calls.length
      branches.add(view.ground.map(i => i.name).sort().join('|'))
      expect(result.exploration?.receipt.revealed).toBe(view.ground.length)
      expect(storyText('H03', view.narrative!, result.exploration?.receipt)).toContain('光束扫过台面')
      for (let i = 0; i < 3; i++) storyText('H03', view.narrative!)
      expect(ready(h.owner)).toBe(view); expect(h.disk.size).toBe(before); expect(h.setItem).toHaveBeenCalledTimes(writes)
    } finally { h.owner.dispose() }
  }
  expect(branches.size).toBe(2)
})

it('power survey before the workorder selects the factual isolation reaction without requiring a route', async () => {
  const h = browserFixture(); await setup(h)
  try {
    send(h.owner, 'depart', '进入封锁区')
    for (const label of ['大厅', '后勤控制间', '岗亭', '配线廊', '转运支路柜']) send(h.owner, 'move', label)
    send(h.owner, 'task', '调查供电')
    for (const label of ['配线廊', '岗亭', '后勤控制间']) send(h.owner, 'move', label)
    expect(storyText('H07', ready(h.owner).narrative!)).toBeNull()
    send(h.owner, 'task', '现场互动')
    expect(storyText('H07', ready(h.owner).narrative!)).toContain('供电柜上的隔离，就是这份停用令')
    expect(storyText('H07', ready(h.owner).narrative!)).not.toContain('亲口')
    expect(ready(h.owner).move.options.length).toBeGreaterThan(0)
  } finally { h.owner.dispose() }
})
