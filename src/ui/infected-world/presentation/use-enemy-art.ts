import { useLayoutEffect, useRef, useState } from 'react'
import type { EnemyArtGroup } from './approved-enemy-art'
import { prepareEnemyArt, type EnemyArtPreparation } from './enemy-art-loader'

type Generation = { group: EnemyArtGroup; live: boolean; preparation?: EnemyArtPreparation }
type State = { generation: Generation; status: 'ready' | 'failed' }
export function useEnemyArt(group: EnemyArtGroup | null) {
  const current = useRef<Generation | null>(null)
  const [state, setState] = useState<State | null>(null)
  useLayoutEffect(() => {
    if (!group) { current.current = null; return }
    const generation: Generation = { group, live: true }
    current.current = generation
    const isCurrent = () => generation.live && current.current === generation
    generation.preparation = prepareEnemyArt(group,
      () => { if (isCurrent()) setState({ generation, status: 'ready' }) },
      () => { if (isCurrent()) setState({ generation, status: 'failed' }) })
    return () => { generation.live = false; generation.preparation?.cancel(); if (current.current === generation) current.current = null }
  }, [group])
  // Render-time key check is essential: an effect has not retired the old group yet.
  const prepared = state?.status === 'ready' && state.generation.live && current.current === state.generation && state.generation.group === group ? state.generation : null
  const failDisplay = () => {
    if (!prepared || !prepared.live || current.current !== prepared) return
    prepared.preparation?.cancel()
    setState({ generation: prepared, status: 'failed' })
  }
  return { prepared, failDisplay }
}
