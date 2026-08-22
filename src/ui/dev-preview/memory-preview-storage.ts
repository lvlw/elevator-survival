import type { RunSaveStorage } from '../../state/run-save'

/** Development-only storage sink. Preview setup never writes to it. */
export class MemoryPreviewStorage implements RunSaveStorage {
  public writes = 0
  private value: string | null = null

  public read(): string | null { return this.value }
  public write(serialized: string): void { this.writes += 1; this.value = serialized }
  public clear(): void { this.value = null }
}
