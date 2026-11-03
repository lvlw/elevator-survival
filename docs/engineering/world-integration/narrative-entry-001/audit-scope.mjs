// Read-only delivery audit against the attached allowlist and exact BASE.
import { execFileSync } from 'node:child_process'
import { readFileSync, writeFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createHash } from 'node:crypto'
import assert from 'node:assert/strict'
const out = dirname(fileURLToPath(import.meta.url)), root = resolve(out, '../../../..')
const input = resolve(out, 'task-inputs'), scope = JSON.parse(readFileSync(resolve(input, 'SCOPE.json'), 'utf8'))
const git = (...args) => execFileSync('git', args, { cwd: root })
const paths = [...new Set([...git('diff', '--name-only', '-z', scope.base).toString('utf8').split('\0'),
  ...git('ls-files', '--others', '--exclude-standard', '-z').toString('utf8').split('\0')])].filter(Boolean).sort()
const tests = /^(src\/(state\/residence-session|app\/infected-preplay|app\/infected-browser)\/[^/]+\.test\.ts|src\/ui\/infected-world\/.+\.test\.tsx?)$/
const failures = paths.filter(path => !scope.allow_existing_production.includes(path) && !scope.allow_new_prefixes.some(prefix => path.startsWith(prefix)) &&
  !scope.allow_existing_test_helpers_if_present.includes(path) && !scope.allow_document_append_only.includes(path) && !tests.test(path))
assert.deepEqual(failures, [])
for (const path of scope.allow_document_append_only.filter(path => paths.includes(path))) {
  const before = git('show', `${scope.base}:${path}`), after = readFileSync(resolve(root, path))
  assert(after.subarray(0, before.length).equals(before), `${path}: changed historical bytes`)
}
const manifest = JSON.parse(readFileSync(resolve(input, 'PACKAGE-MANIFEST.json'), 'utf8'))
for (const f of manifest.files) {
  const raw = readFileSync(resolve(input, f.path))
  assert.equal(raw.length, f.bytes, f.path)
  assert.equal(createHash('sha256').update(raw).digest('hex'), f.sha256, f.path)
}
const result = { base: scope.base, branch: git('branch', '--show-current').toString().trim(),
  allowed: true, paths, source_inputs_hash_verified: manifest.files.length, append_only_documents: true }
assert.equal(result.branch, scope.branch)
writeFileSync(resolve(out, 'scope-audit.json'), JSON.stringify(result, null, 2))
console.log(JSON.stringify({ allowed: true, paths: paths.length, source_inputs: manifest.files.length }))
