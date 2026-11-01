import { defineConfig } from 'vitest/config'
import original from '../../../../vite.config.ts'
export default defineConfig({ ...original, test: { ...original.test, include: ['docs/engineering/world-integration/presentation-c2-001/browser-records.probe.ts'] } })
