import type { PreplayController, PreplaySnapshot } from '../infected-preplay/types'
export type SetupChoices = Readonly<{ tool: 'crow' | 'lamp' | 'toolbox'; specialty: 'scout' | 'engineer' | 'survival' }>
export type IdentityMaterials = Readonly<{ characterId: string; runId: string; seed: string; generation: string }>
export type BrowserStorage = Readonly<{ getItem(key: string): string | null; setItem(key: string, value: string): void }>
export type BrowserEnvironment = Readonly<{ secure: boolean; locks: Pick<LockManager, 'request'> | null;
  storage(): BrowserStorage; entropy(): unknown; lifecycle?: EventTarget }>
export type BrowserOptions = Readonly<{ environment?: () => BrowserEnvironment }>
export type BrowserSnapshot = Readonly<{ status: 'idle' | 'acquiring' | 'occupied' | 'unsupported' | 'setup' |
  'loading' | 'read-error' | 'blocked' | 'reservation-failed' | 'ready' | 'suspended' | 'disposed';
  setup: Readonly<{ tools: readonly string[]; specialties: readonly string[] }> | null;
  preplay: PreplaySnapshot | null; message: string | null }>
export type BrowserControls = Readonly<Pick<PreplayController, 'getSnapshot' | 'execute' | 'confirm' | 'preview' |
  'beginDraft' | 'cancel' | 'executeDraft' | 'retrySave' | 'synchronize'> & {
  confirmSetup(choices: unknown): BrowserSnapshot; retryRead(): BrowserSnapshot }>
export type BrowserOwner = Readonly<{ getSnapshot(): BrowserSnapshot; subscribe(listener: () => void): () => void;
  controls(): BrowserControls | null; acquire(): Promise<BrowserSnapshot>; suspend(): void; dispose(): void }>
