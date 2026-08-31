import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, expect, it, vi } from 'vitest'
import App from './App'

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true })

const roots: ReturnType<typeof createRoot>[] = []
afterEach(() => {
  act(() => { while (roots.length > 0) roots.pop()!.unmount() })
  vi.unstubAllEnvs()
})

it('uses the development-only preview harness when no Store is injected', async () => {
  const container = document.createElement('div')
  const root = createRoot(container); roots.push(root)
  await import('./ui/dev-preview/development-ui-preview')
  await act(async () => {
    root.render(<App />)
    await Promise.resolve()
  })
  expect(container.textContent).toContain('开发预览')
  expect(container.textContent).toContain('不是活动 Run')
  expect(container.textContent).not.toContain('当前没有已接入的活动 Run')
})

it('keeps the production entry honest when no StableRunStore is injected', async () => {
  vi.stubEnv('DEV', false)
  vi.resetModules()
  const { default: ProductionApp } = await import('./App')
  const container = document.createElement('div')
  const root = createRoot(container); roots.push(root)
  act(() => { root.render(<ProductionApp />) })
  expect(container.textContent).toContain('当前没有已接入的活动 Run')
  expect(container.textContent).toContain('New Run bootstrap 与 React 启动接线尚未实现')
  expect(container.textContent).not.toContain('规则内核尚未实现')
})
