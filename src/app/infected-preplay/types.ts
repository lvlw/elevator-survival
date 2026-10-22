import type { PlayerView, PlayerRequest, PlayerExecution, PlayerSession } from '../../state/residence-session/player-types'
import type { PlayerPreplay, PlayerIntentMetadata, PlayerActionInputs } from '../../state/residence-session/player-preplay-types'
import type { PlayerHandle } from '../../state/residence-session/player-types'

export type PreplayPorts = Readonly<{ player: PlayerSession; preplay: PlayerPreplay;
  bootstrap(): PlayerView; createFirst(): PlayerView; retryRead(): PlayerView; synchronize(): void }>
export type PreplayDraft = Readonly<{ draft: 'preplay' }>
export type PreplayConfirmation = Readonly<{ confirmation: 'preplay' }>
export type PreplayFeedEntry = Readonly<{ ordinal: number; kind: 'action' | 'recovery'; text: string }>
export type PreplayError = Readonly<{ kind: 'rejected' | 'projection' | 'execution-uncertain'; message: string }>
export type PreplaySnapshot = Readonly<{ status: 'stable' | 'busy' | 'projection-error'; view: PlayerView | null;
  error: PreplayError | null; draft: Readonly<{ token: PreplayDraft; request: PlayerRequest }> | null;
  feed: readonly PreplayFeedEntry[] }>
export type PreplayResult = Readonly<{ kind: 'committed' | 'rejected' | 'updated' | 'confirmation-required';
  snapshot: PreplaySnapshot; confirmation?: PreplayConfirmation; execution?: PlayerExecution['kind'] }>
export type PreplayController = Readonly<{
  getSnapshot(): PreplaySnapshot; subscribe(listener: () => void): () => void; listenerFailures(): number
  bootstrap(): PreplayResult; createFirst(): PreplayResult; retryRead(): PreplayResult; retrySave(): PreplayResult
  synchronize(): PreplayResult; preview(request: unknown): PlayerIntentMetadata
  describeAction(action: PlayerHandle): PlayerActionInputs
  beginDraft(request: unknown): PreplayDraft; cancel(): void; executeDraft(draft: PreplayDraft): PreplayResult
  execute(request: unknown): PreplayResult; confirm(token: PreplayConfirmation): PreplayResult
}>
