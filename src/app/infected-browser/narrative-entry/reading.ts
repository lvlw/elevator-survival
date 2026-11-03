import { z } from 'zod'
import { LOCK_NAME, NAMESPACE, SLOT, readJSON, type Reservation } from '../schema'
import type { BrowserStorage } from '../types'
import { storyKeys, type StoryKey } from '../../../state/residence-session/narrative-entry/types'

export const READING_KEY = `${NAMESPACE}.${SLOT}.narrative-entry.reading`
export const STORY_VERSION = 'hospital-entry-v0.2.1'
export type ReadingMark = Readonly<{ key: StoryKey; state: 'read' | 'skipped' | 'dismissed' }>
export type ReadingView = Readonly<{ marks: readonly ReadingMark[]; warning: string | null }>
type Current = Readonly<{ revision: number; persistedRevision: number; known: readonly StoryKey[]; saved: boolean }>
const mark = z.strictObject({ key: z.enum(storyKeys), state: z.enum(['read', 'skipped', 'dismissed']), revision: z.number().int().nonnegative().safe() })
const schema = z.strictObject({ format: z.literal('infected-narrative-reading'), version: z.literal(1), storyVersion: z.literal(STORY_VERSION),
  binding: z.strictObject({ generation: z.string(), character: z.string(), execution: z.string(), versions: z.string(), lock: z.literal(LOCK_NAME) }),
  marks: z.array(mark).max(storyKeys.length) })

/** A subordinate record, not a save, lease, task fact or replay log. */
export function createReadingRecord(storage: BrowserStorage, reservation: Reservation, active: () => boolean, current: () => Current | null) {
  const binding = Object.freeze({ generation: reservation.generation, character: reservation.characterId,
    execution: JSON.stringify(reservation.execution), versions: JSON.stringify(reservation.versions), lock: LOCK_NAME })
  let marks: z.infer<typeof mark>[] = [], dirty = false, warning: string | null = null
  const valid = () => { if (!active()) throw new Error('Reading owner is no longer active'); return current() }
  try {
    const c = valid(), raw = storage.getItem(READING_KEY)
    if (raw !== null) {
      if (raw.length > 24000) throw new Error('Oversized record')
      const record = readJSON(schema, raw)
      if (JSON.stringify(record.binding) !== JSON.stringify(binding) || new Set(record.marks.map(m => m.key)).size !== record.marks.length) throw new Error('Different reading binding')
      marks = record.marks.filter(m => c && m.revision <= c.persistedRevision && c.known.includes(m.key))
    }
  } catch { warning = '阅读记录无法使用，已忽略；游戏进度保持原样。' }
  function query(): ReadingView {
    const c = valid()
    return Object.freeze({ marks: Object.freeze(marks.filter(m => c?.known.includes(m.key) && m.revision <= c.revision).map(({ key, state }) => Object.freeze({ key, state }))), warning })
  }
  function flush() {
    const c = valid()
    if (!dirty || !c?.saved || marks.some(m => m.revision > c.persistedRevision)) return query()
    try {
      const text = JSON.stringify({ format: 'infected-narrative-reading', version: 1, storyVersion: STORY_VERSION, binding, marks })
      valid(); storage.setItem(READING_KEY, text); dirty = false
    } catch { warning = '阅读记录暂未保存；游戏行动不会重发。' }
    return query()
  }
  function acknowledge(input: readonly ReadingMark[]) {
    const c = valid()
    if (!c || input.length > storyKeys.length) return query()
    const parsed = z.array(mark.omit({ revision: true })).max(storyKeys.length).safeParse(input)
    if (!parsed.success) return query()
    for (const m of parsed.data) if (c.known.includes(m.key)) {
      marks = marks.filter(old => old.key !== m.key); marks.push({ ...m, revision: c.revision }); dirty = true
    }
    return flush()
  }
  return Object.freeze({ query, acknowledge, flush })
}
