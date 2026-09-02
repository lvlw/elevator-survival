import { describe, expect, it } from 'vitest'
import { appMetadata } from './app-metadata'

describe('appMetadata', () => {
  it('provides the official application name', () => {
    expect(appMetadata.name).toBe('电梯求生')
  })

  it('identifies the current vertical slice version', () => {
    expect(appMetadata.verticalSliceVersion).toBe('v0.1')
  })

  it('describes the completed first playability review and pending second owner pass', () => {
    expect(appMetadata.stage).toBe('Owner Playability Review Round 1 已完成；首轮玩家信息与交互清晰度修复已完成；等待 Owner Round 2 复测')
    expect(appMetadata.stage).not.toContain('规则内核尚未实现')
    expect(appMetadata.stage).not.toContain('生产启动入口尚未接入')
    expect(appMetadata.stage).not.toContain('完整七日')
  })
})
