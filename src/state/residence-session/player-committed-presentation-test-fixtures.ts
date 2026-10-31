// TEST ONLY. Same deterministic case setup as the pre-edit, external exact-base capture.
import { expect } from 'vitest'
import { entered, fixture } from './combat-test-fixtures'
import { fromValue, ready, allActions } from './player-test-fixtures'
import { readCombatValue } from '../../core/residence-combat/validation'
import { simultaneous } from '../residence-save/combat-review-simultaneous-fixtures'

// TEST-only narrow Node builtin adapter; project TS exposes browser types, so no Node typings/config dependency is added.
const cryptoSpecifier: string = 'node:crypto'
const { createHash } = await import(/* @vite-ignore */ cryptoSpecifier) as {
  createHash(algorithm: 'sha256'): { update(value: string): { digest(encoding: 'hex'): string } }
}

export const compatibilityCases = ['basic', 'signature', 'defend', 'retreat', 'quick', 'temporary', 'two-responses',
  'last-durability', 'victory', 'death', 'both-zero', 'move-enters-battle', 'save-failed'] as const
export type CompatibilityCase = typeof compatibilityCases[number]
export const digest = (v: unknown) => createHash('sha256').update(typeof v === 'string' ? v : JSON.stringify(v)).digest('hex')
export function committedCase(id: CompatibilityCase) {
  const pair = id === 'both-zero' ? simultaneous() : null
  const f = pair?.h ?? (id === 'move-enters-battle' ? fixture() : entered(id === 'two-responses' ? 'technician' : 'orderly',
    id === 'quick' ? { hp: 10 } : id === 'death' ? { hp: 1 } : {}))
  let value = pair?.beforeLast ?? f.value
  if (['temporary', 'two-responses', 'last-durability'].includes(id)) {
    const weapon = value.carried.equipment.weapon!.instanceId
    // Existing legal TEST resource boundary, never fake CTB, damage or enemy HP.
    value = readCombatValue({ ...value, itemStates: { states: value.itemStates.states.map(s => s.instanceId === weapon ?
      { ...s, resource: { kind: 'durability', current: id === 'last-durability' ? 1 : 0 } } : s) } }, f.deps)
  }
  if (id === 'two-responses') for (let n = 0; n < 8; n++) value = f.action(value, { kind: 'defend' }).snapshot
  if (id === 'victory') for (const kind of ['metal-pipe-charged-strike', 'metal-pipe-basic-attack'] as const) value = f.action(value, { kind }).snapshot
  const h = fromValue(value, f.deps)
  const label = id === 'signature' || id === 'last-durability' ? '蓄力打击' : id === 'defend' || id === 'death' ? '防御' :
    id === 'retreat' ? '退却' : id === 'temporary' || id === 'two-responses' ? '临时攻击' : id === 'quick' ? '使用快捷物品' :
      id === 'move-enters-battle' ? '大厅' : '金属管攻击'
  const action = allActions(ready(h.player)).find(a => a.family === (id === 'move-enters-battle' ? 'move' : 'combat') && a.label.startsWith(label))!
  expect(action).toBeDefined()
  return { h, request: { action: action.selector } }
}
