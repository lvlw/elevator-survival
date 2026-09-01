import { describe, expect, it } from 'vitest'
import { appMetadata } from './app-metadata'

describe('appMetadata', () => {
  it('provides the official application name', () => {
    expect(appMetadata.name).toBe('电梯求生')
  })

  it('identifies the current vertical slice version', () => {
    expect(appMetadata.verticalSliceVersion).toBe('v0.1')
  })

  it('describes the Headless New Run and remaining React Setup boundary', () => {
    expect(appMetadata.stage).toBe('医院一日规则与正式交互闭环已实现，Headless New Run 已接入，New Run Setup UI 尚未接入')
    expect(appMetadata.stage).not.toContain('规则内核尚未实现')
    expect(appMetadata.stage).not.toContain('生产启动入口尚未接入')
  })
})
