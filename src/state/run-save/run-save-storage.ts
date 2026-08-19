import { RunSaveError } from './run-save-errors'
import type {
  BrowserStringStorage,
  RunSaveStorage,
} from './run-save-types'

export const DEFAULT_BROWSER_RUN_SAVE_KEY = 'elevator-survival:active-run'

export class MemoryRunSaveStorage implements RunSaveStorage {
  #value: string | null
  #nextWriteFailure: Error | null = null

  public constructor(initialValue: string | null = null) {
    this.#value = initialValue
  }

  public read(): string | null {
    return this.#value
  }

  public write(serialized: string): void {
    if (this.#nextWriteFailure) {
      const failure = this.#nextWriteFailure
      this.#nextWriteFailure = null
      throw failure
    }
    this.#value = serialized
  }

  public clear(): void {
    this.#value = null
  }

  public failNextWrite(error: Error = new Error('memory write failed')): void {
    this.#nextWriteFailure = error
  }
}

export function createBrowserRunSaveStorage(
  storage: BrowserStringStorage,
  key = DEFAULT_BROWSER_RUN_SAVE_KEY,
): RunSaveStorage {
  if (!storage || typeof key !== 'string' || !key.trim()) {
    throw new RunSaveError('INVALID_ENVELOPE', '浏览器Run存档适配器参数无效')
  }
  return Object.freeze({
    read: () => storage.getItem(key),
    write: (serialized: string) => storage.setItem(key, serialized),
    clear: () => storage.removeItem(key),
  })
}
