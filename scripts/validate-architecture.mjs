import { execFileSync } from 'node:child_process'
import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { extname, join, relative, resolve } from 'node:path'
import process from 'node:process'

const root = resolve(import.meta.dirname, '..')
const failures = []

function fail(file, rule, detail) {
  failures.push(`${relative(root, file)}: ${rule}: ${detail}`)
}

function walk(directory) {
  if (!existsSync(directory)) return []
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name)
    return entry.isDirectory() ? walk(path) : [path]
  })
}

const decisionsPath = join(root, 'docs', '05-design-decisions.md')
const decisions = readFileSync(decisionsPath, 'utf8')
const numbers = [...decisions.matchAll(/^## DEC-(\d{3})：/gm)].map((match) =>
  Number(match[1]),
)
if (numbers.includes(0)) fail(decisionsPath, 'DEC_NUMBERING', 'DEC-000 is forbidden')
if (numbers[0] !== 1) fail(decisionsPath, 'DEC_NUMBERING', 'numbering must start at DEC-001')
for (let index = 0; index < numbers.length; index += 1) {
  if (numbers[index] !== index + 1) {
    fail(
      decisionsPath,
      'DEC_NUMBERING',
      `expected DEC-${String(index + 1).padStart(3, '0')}, found DEC-${String(numbers[index]).padStart(3, '0')}`,
    )
    break
  }
}
if (new Set(numbers).size !== numbers.length) {
  fail(decisionsPath, 'DEC_NUMBERING', 'duplicate DEC number')
}
if ((numbers.at(-1) ?? 0) < 39) {
  fail(decisionsPath, 'DEC_NUMBERING', 'current maximum must be at least DEC-039')
}

const coreFiles = walk(join(root, 'src', 'core')).filter(
  (file) => extname(file) === '.ts',
)
const productionCoreFiles = coreFiles.filter(
  (file) => !file.endsWith('.test.ts'),
)
const forbiddenImports = [
  [/(?:from\s+|import\s*\()['"][^'"]*(?:\/content(?:\/|['"])|hospital-v0\.1)/, 'core must not import content'],
  [/(?:from\s+|import\s*\()['"](?:react|react-dom)(?:\/[^'"]*)?['"]/, 'core must not import React'],
  [/(?:from\s+|import\s*\()['"]zustand(?:\/[^'"]*)?['"]/, 'core must not import Zustand'],
  [/(?:from\s+|import\s*\()['"][^'"]*\/(?:ui|state)(?:\/|['"])/, 'core must not import UI or application state'],
]
const nondeterministicSources = [
  ['Math.random', /\bMath\.random\b/],
  ['Date.now', /\bDate\.now\b/],
  ['performance.now', /\bperformance\.now\b/],
  ['crypto.randomUUID', /\bcrypto\.randomUUID\b/],
  ['getRandomValues', /\bgetRandomValues\b/],
]
for (const file of productionCoreFiles) {
  const text = readFileSync(file, 'utf8')
  for (const [pattern, rule] of forbiddenImports) {
    if (pattern.test(text)) fail(file, 'CORE_DEPENDENCY', rule)
  }
  for (const [name, pattern] of nondeterministicSources) {
    if (pattern.test(text)) fail(file, 'NONDETERMINISM', `forbidden ${name}`)
  }
}

for (const file of walk(join(root, 'src'))) {
  if (extname(file) === '.js') {
    fail(file, 'BUILD_ARTIFACT', 'compiled JavaScript must not be mixed into src')
  }
}

const tracked = execFileSync('git', ['ls-files'], {
  cwd: root,
  encoding: 'utf8',
}).split(/\r?\n/)
for (const path of tracked) {
  if (
    /^(?:dist|coverage|\.cache|\.vite)\//.test(path) ||
    /(?:^|\/)(?:coverage|dist)(?:\/|$)/.test(path)
  ) {
    fail(join(root, path), 'BUILD_ARTIFACT', 'generated output must not be tracked')
  }
}

if (failures.length > 0) {
  console.error('Architecture validation failed:')
  for (const failure of failures) console.error(`- ${failure}`)
  process.exit(1)
}

console.log(
  `Architecture validation passed: ${numbers.length} DEC entries and ${productionCoreFiles.length} core production files checked.`,
)
