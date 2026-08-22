import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, expect, it } from 'vitest'
import App from './App'

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true })

const roots: ReturnType<typeof createRoot>[] = []
afterEach(() => { act(() => { while (roots.length > 0) roots.pop()!.unmount() }) })

it('honestly reports that no active Run is connected by default', () => {
  const container = document.createElement('div')
  const root = createRoot(container); roots.push(root)
  act(() => { root.render(<App />) })
  expect(container.textContent).toContain('当前没有已接入的活动 Run')
  expect(container.querySelector('button')).toBeNull()
})
