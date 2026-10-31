import { useLayoutEffect, useRef, useState } from 'react'
import type { BrowserOwner, BrowserControls, BrowserSnapshot } from '../../../app/infected-browser/types'
import type { PreplayResult } from '../../../app/infected-preplay/types'
import type { PlayerView } from '../../../state/residence-session/player-types'
import { createCommittedConsumer } from './committed-consumer'
import { CUE_MILLISECONDS, type ActionCue } from './presentation-types'

type Session = {
  owner: BrowserOwner; controls: BrowserControls; consumer: ReturnType<typeof createCommittedConsumer>
  live: boolean; inCommand: boolean; timer: ReturnType<typeof setTimeout> | null; viewAtCue: PlayerView | null
}
const ready = (snapshot: BrowserSnapshot) => snapshot.status === 'ready' && snapshot.preplay?.status === 'stable' && snapshot.preplay.view?.status === 'ready'

/** Direct-result consumer. The existing hook still owns the sole BrowserOwner. */
export function useCommittedPresentation(owner: BrowserOwner | null, controls: BrowserControls | null,
  snapshot: BrowserSnapshot, onError: (error: unknown) => void) {
  const session = useRef<Session | null>(null), failure = useRef(onError)
  const [cue, setCue] = useState<ActionCue | null>(null), [localReduced, setLocalReduced] = useState(false)
  const [media] = useState(() => typeof window.matchMedia === 'function' ? window.matchMedia('(prefers-reduced-motion: reduce)') : null)
  const [osReduced, setOsReduced] = useState(media?.matches ?? false)
  const reduced = localReduced || osReduced
  useLayoutEffect(() => { failure.current = onError })
  function clearTimer(s: Session) { if (s.timer !== null) { clearTimeout(s.timer); s.timer = null } }
  function cancelSession(s: Session) { clearTimer(s); s.consumer.cancel(); s.viewAtCue = null; setCue(null) }
  function usable(s: Session) { return s.live && session.current === s && s.owner.controls() === s.controls && ready(s.owner.getSnapshot()) }
  function cancel() { if (session.current) cancelSession(session.current) }
  function skip() {
    const s = session.current
    if (!s) return
    clearTimer(s); s.consumer.skip(); setCue(s.consumer.state().cue)
  }
  useLayoutEffect(() => {
    if (!owner || !controls) { setCue(null); return }
    const s: Session = { owner, controls, consumer: createCommittedConsumer(), live: true,
      inCommand: false, timer: null, viewAtCue: null }
    session.current = s; setCue(null)
    const unsubscribe = owner.subscribe(() => {
      if (!s.live || session.current !== s) return
      try {
        const current = owner.getSnapshot()
        // Normal own-command busy/stable publications do not change the lifetime or ticket.
        if (current.status === 'ready' && current.preplay?.status === 'busy' && s.inCommand && owner.controls() === controls) return
        if (!usable(s) || !s.inCommand && s.viewAtCue && current.preplay!.view !== s.viewAtCue) cancelSession(s)
      } catch (error) { cancelSession(s); failure.current(error) }
    })
    return () => {
      s.live = false; clearTimer(s); s.consumer.dispose(); s.viewAtCue = null; unsubscribe()
      if (session.current === s) session.current = null
    }
  }, [owner, controls])
  useLayoutEffect(() => {
    if (!media) return
    const change = () => setOsReduced(media.matches)
    media.addEventListener('change', change); change()
    return () => media.removeEventListener('change', change)
  }, [media])
  useLayoutEffect(() => { if (reduced) skip() }, [reduced])
  function perform(original: () => PreplayResult): PreplayResult {
    const s = session.current
    const current = s?.owner === owner && s.controls === controls && usable(s) ? s : null
    if (current) cancelSession(current)
    const ticket = current?.consumer.state().generation
    if (current) current.inCommand = true
    let result: PreplayResult
    try { result = original() }
    catch (error) { if (current) cancelSession(current); throw error }
    finally { if (current) current.inCommand = false }
    if (!current || !usable(current) || ticket !== current.consumer.state().generation || result.kind !== 'committed' ||
        !result.presentation || result.snapshot.status !== 'stable' || current.owner.getSnapshot().preplay!.view !== result.snapshot.view) return result
    try {
      const epoch = current.consumer.accept(result.presentation)
      if (epoch === null) return result
      current.viewAtCue = result.snapshot.view
      if (reduced) current.consumer.settle(epoch)
      setCue(current.consumer.state().cue)
      if (!reduced) {
        const timer = setTimeout(() => {
          // A queued old callback cannot clear a newer timer handle or touch a retired UI.
          if (!current.live || session.current !== current || current.timer !== timer) return
          current.timer = null
          try {
            if (!usable(current)) { cancelSession(current); return }
            if (current.consumer.settle(epoch)) setCue(current.consumer.state().cue)
          } catch (error) { cancelSession(current); failure.current(error) }
        }, CUE_MILLISECONDS)
        current.timer = timer
      }
    } catch (error) { cancelSession(current); throw error }
    return result
  }
  return { cue: ready(snapshot) && owner === session.current?.owner && controls === session.current?.controls ? cue : null,
    reduced, localReduced, setLocalReduced, skip, cancel, perform }
}
