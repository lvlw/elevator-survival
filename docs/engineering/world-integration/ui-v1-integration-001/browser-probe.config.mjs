import { defineConfig } from 'vitest/config'
import original from '../../../../vite.config.ts'
export default defineConfig({ ...original, test: { ...original.test, maxWorkers: 1, include: ['docs/engineering/world-integration/ui-v1-integration-001/browser-records.probe.ts'] } })
