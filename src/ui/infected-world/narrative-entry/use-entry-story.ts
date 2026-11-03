import { useRef, useState } from 'react'
import type { BrowserOwner, BrowserControls } from '../../../app/infected-browser/types'
import type { PreplayResult } from '../../../app/infected-preplay/types'
import type { PlayerReadyView } from '../../../state/residence-session/player-types'
import type { StoryKey } from '../../../state/residence-session/narrative-entry/types'
import { storyText } from '../../../content/infected-world-v0.1/narrative-entry/content'

type Selection = Readonly<{ key: StoryKey; text: string; controls: BrowserControls; place: string | null; location: string | null; manual: boolean }>
export function useEntryStory(owner: BrowserOwner | null, controls: BrowserControls | null, view: PlayerReadyView | null, onError: (error: unknown) => void) {
  const [selection, setSelection] = useState<Selection | null>(null)
  const current = useRef<Selection | null>(null), seen = useRef(new Set<StoryKey>())
  const last = useRef<{ scope: object; ordinal: number } | null>(null)
  const valid = selection && controls === selection.controls && view && view.phase !== 'dead' && view.phase !== 'living-hub' &&
    (view.location?.name ?? null) === selection.location && (view.location?.place ?? null) === selection.place &&
    (view.narrative?.known.includes(selection.key) || selection.key === 'H04')
  current.current = valid ? selection : null
  const cancel = () => { current.current = null; setSelection(null) }
  function install(key: StoryKey, text: string, c: BrowserControls, v: PlayerReadyView, manual: boolean) {
    const next = { key, text, controls: c, place: v.location?.place ?? null, location: v.location?.name ?? null, manual }
    current.current = next; setSelection(next)
  }
  function receive(result: PreplayResult, before: PlayerReadyView, c: BrowserControls) {
    cancel()
    const after = result.snapshot.view
    if (result.kind !== 'committed' || owner?.controls() !== c || after?.status !== 'ready' || after.phase !== 'active-world' || !after.narrative) return
    const token = result.exploration
    if (token) {
      if (last.current?.scope === token.scope && last.current.ordinal >= token.ordinal) return
      last.current = { scope: token.scope, ordinal: token.ordinal }
    }
    const encounter = !before.combat && after.combat?.opponent.visualKey === 'infected-orderly'
    const victory = result.presentation?.opponent.visualKey === 'infected-orderly' && result.presentation.stop === 'stable-active' && result.presentation.sequence[0].action !== 'retreat'
    const key = encounter || victory ? 'H06' : token?.receipt.story
    if (!key || !victory && (seen.current.has(key) || before.narrative?.known.includes(key))) return
    const text = victory ? '你握着武器又等了片刻，才稍稍松开手。' : storyText(key, after.narrative, token?.receipt)
    if (!text) return
    seen.current.add(key); install(key, text, c, after, false)
  }
  function open(key: StoryKey) {
    if (!view?.narrative || !controls || owner?.controls() !== controls) return
    const text = storyText(key, view.narrative)
    if (text) install(key, text, controls, view, true)
  }
  function acknowledge(state: 'read' | 'skipped' | 'dismissed') {
    const entry = current.current
    if (!entry || entry !== selection || owner?.controls() !== entry.controls) return
    cancel()
    try { entry.controls.acknowledgeReading([{ key: entry.key, state }]) } catch (error) { onError(error) }
  }
  return { selection: valid ? selection : null, cancel, receive, open, acknowledge }
}
