import { describe, expect, it } from 'vitest'
import { actionExecutionLevel } from './action-execution-level'
import type { StableRunUiAction } from './stable-run-ui-actions'

const action = (id: string, kind: StableRunUiAction['kind'], guaranteedDeath = false): StableRunUiAction => ({
  id,
  kind,
  label: id,
  guaranteedDeath,
  command: { kind: 'lifecycle', command: { kind: 'settle-terminal-scene' } },
  preview: { title: id, facts: [], warnings: [], branches: [] },
})

describe('UIR-015 action execution policy', () => {
  it('directly executes a complete ordinary action and terminal settlement', () => {
    expect(actionExecutionLevel(action('move', 'scene-move'), [action('move', 'scene-move')])).toBe('direct')
    expect(actionExecutionLevel(action('settle', 'settle-terminal-scene'), [action('settle', 'settle-terminal-scene')])).toBe('direct')
  })

  it('keeps parameterized and protective actions distinct', () => {
    expect(actionExecutionLevel(action('medical', 'scene-medical'), [action('medical', 'scene-medical')])).toBe('parameterized')
    expect(actionExecutionLevel(action('withdraw', 'scene-withdraw'), [action('withdraw', 'scene-withdraw')])).toBe('protective-confirmation')
    expect(actionExecutionLevel(action('end-day', 'end-day'), [action('end-day', 'end-day')])).toBe('protective-confirmation')
  })

  it('confirms guaranteed death only when another formal action is not guaranteed death', () => {
    const fatal = action('fatal', 'scene-combat-action', true)
    const rescue = action('rescue', 'scene-combat-action')
    expect(actionExecutionLevel(fatal, [fatal, rescue])).toBe('protective-confirmation')
    expect(actionExecutionLevel(fatal, [fatal, action('other-fatal', 'scene-combat-action', true)])).toBe('direct')
    expect(actionExecutionLevel(rescue, [fatal, rescue])).toBe('direct')
  })

  it('does not mistake a possible death branch for guaranteed death', () => {
    const possible = {
      ...action('possible', 'scene-combat-action'),
      ghost: {
        title: 'possible', actionTime: 10,
        timeAfter: { kind: 'unavailable' as const, reason: 'combat' },
        returnReserveAfter: { kind: 'unavailable' as const, reason: 'combat' },
        safeMarginAfter: { kind: 'unavailable' as const, reason: 'combat' },
        healthAfter: { kind: 'unavailable' as const, reason: 'combat' },
        outcomes: ['continue', 'death'] as const,
        consequences: [], tone: 'warning' as const,
      },
    }
    const rescue = action('rescue', 'scene-combat-action')
    expect(actionExecutionLevel(possible, [possible, rescue])).toBe('direct')
  })
})
