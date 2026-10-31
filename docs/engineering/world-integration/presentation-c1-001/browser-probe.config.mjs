import base from '../../../../vite.config.ts'
import { fileURLToPath } from 'node:url'
// Replace include explicitly; mergeConfig concatenates include arrays and would also run the whole src corpus.
const probe = fileURLToPath(new URL('./browser-records.probe.ts', import.meta.url)).replaceAll('\\', '/')
export default { ...base, test: { ...base.test, include: [probe] } }
