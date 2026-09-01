import { describe, expect, it } from 'vitest'
import { appMetadata } from './app-metadata'

describe('appMetadata', () => {
  it('provides the official application name', () => {
    expect(appMetadata.name).toBe('电梯求生')
  })

  it('identifies the current vertical slice version', () => {
    expect(appMetadata.verticalSliceVersion).toBe('v0.1')
  })

  it('describes the production New Run and Playability Review boundary', () => {
    expect(appMetadata.stage).toBe('生产冷启动与医院一日 New Run 已接入，准备进行 Playability Review')
    expect(appMetadata.stage).not.toContain('规则内核尚未实现')
    expect(appMetadata.stage).not.toContain('生产启动入口尚未接入')
    expect(appMetadata.stage).not.toContain('完整七日')
  })
})
