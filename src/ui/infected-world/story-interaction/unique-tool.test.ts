import { expect, it } from 'vitest'
import { browserFixture, setup, send, ready } from '../../../app/infected-browser/test-fixtures'
import { uniqueToolRequest } from './unique-tool'
it('only one explicit method and one item-only public candidate can complete the original request', async () => {
  const h = browserFixture(), c = await setup(h, 'lamp')
  try {
    send(h.owner, 'depart', '进入封锁区'); send(h.owner, 'move', '大厅')
    const a = ready(h.owner).sources.flatMap(s => s.choices).find(a => a.method === 'lit')!, inputs = c.describeAction(a.selector)
    expect(uniqueToolRequest(a, inputs)).toEqual({ action: a.selector, item: inputs.items[0].selector })
    expect(uniqueToolRequest(a, { ...inputs, items: [] })).toBeNull()
    expect(uniqueToolRequest(a, { ...inputs, items: [...inputs.items, { ...inputs.items[0], selector: Object.freeze({ selection: 'opaque' }) }] })).toBeNull()
    expect(uniqueToolRequest(a, { ...inputs, fields: ['item', 'placement'] })).toBeNull()
    expect(uniqueToolRequest({ ...a, method: null }, inputs)).toBeNull()
    expect(uniqueToolRequest({ ...a, family: 'medical' }, inputs)).toBeNull()
    expect(uniqueToolRequest(a, inputs, { ...ready(h.owner).carried[0], selector: Object.freeze({ selection: 'opaque' }) })).toBeNull()
  } finally { h.owner.dispose() }
})
