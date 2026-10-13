// TEST ONLY. Opt-in external evidence output; ordinary CI never dirties tracked files.
declare const process: { env: Record<string, string | undefined>; cwd(): string }
// Small typed TEST IO port: the app intentionally has no Node type dependency.
export async function emitReport(id: string, value: unknown) {
  const directory = process.env.E03_REPORT_DIR
  if (!directory) return
  if (!/^[A-Za-z0-9-]+$/.test(id)) throw new Error('Invalid TEST report name')
  const fsModule = 'node:fs', pathModule = 'node:path'
  const fs = await import(fsModule) as { writeFileSync(path: string, text: string, encoding: 'utf8'): void }
  const path = await import(pathModule) as { resolve(...parts: string[]): string; relative(from: string, to: string): string }
  const root = path.resolve(directory), fromRepo = path.relative(process.cwd(), root)
  if (!fromRepo.startsWith('..') && !fromRepo.includes(':')) throw new Error('Evidence must be outside repository')
  fs.writeFileSync(path.resolve(root, id + '.json'), JSON.stringify(value, null, 2) + '\n', 'utf8')
}
