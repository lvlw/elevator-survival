import { defineConfig } from 'vitest/config'
import { fileURLToPath } from 'node:url'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
export default defineConfig({
  root: fileURLToPath(new URL('../../../../../', import.meta.url)),
  cacheDir: join(tmpdir(), 'world-entry-005-vite-cache'),
  test: { environment: 'node', include: ['docs/design-drafts/world-infected-001/entry-005/validation/native-probe.test.ts'],
    fileParallelism: false, maxWorkers: 1, restoreMocks: true },
})
