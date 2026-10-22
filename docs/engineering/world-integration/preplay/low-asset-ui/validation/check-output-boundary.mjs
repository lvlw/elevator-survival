// Standalone TEST-only T02 regression; external fixtures, no browser or gameplay.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import {
  isInsidePath, planProbeOutput, recheckOutputDirectory,
} from '../../../../../design-drafts/world-infected-001/entry-006/validation/output-path-guard.mjs';

if (!process.argv[2]) throw new Error('Provide an absolute evidence directory outside the repository');
const outputPlan = planProbeOutput(process.cwd(), process.argv[2]);
fs.mkdirSync(outputPlan.out, { recursive: true });
recheckOutputDirectory(outputPlan);
const fixture = fs.mkdtempSync(path.join(outputPlan.out, 'boundary-fixtures-'));
const repository = path.join(fixture, 'repository');
const external = path.join(fixture, 'outside');
fs.mkdirSync(repository);
fs.mkdirSync(external);
const sourcePath = process.env.T02_RUNNER_SOURCE ?? fileURLToPath(new URL('../../browser-owner/validation/run-browser-checks.mjs', import.meta.url));
const sourceBytes = fs.readFileSync(sourcePath);
const source = sourceBytes.toString('utf8');
const firstMkdir = source.indexOf('fs.mkdirSync(out');
assert.ok(firstMkdir > 0, 'The inspected runner must retain its output mkdir boundary');
const preflightSource = source.slice(0, firstMkdir).replace(/^import .+;\r?\n/gm, '');
const browserStart = sourceBytes.indexOf(Buffer.from('const exe='));
assert.ok(browserStart > 0, 'The inspected runner must retain its browser program boundary');
const cases = [];
const run = (name, kind, body) => {
  try {
    body();
    cases.push({ name, kind, status: 'PASS' });
  } catch (error) {
    cases.push({ name, kind, status: 'FAIL', error: String(error), assertion: error instanceof assert.AssertionError });
  }
};
const rejects = body => assert.throws(body, error => error?.code === 'UNSAFE_PROBE_OUTPUT');
const preflight = output => vm.runInNewContext(preflightSource, {
  fs, path, planProbeOutput, recheckOutputDirectory,
  process: { cwd: () => repository, argv: [process.execPath, sourcePath, output] },
});
for (const [name, output] of [
  ['repository-itself', repository],
  ['direct-child', path.join(repository, 'child')],
  ['dotdot-prefix-child', path.join(repository, '..probe')],
]) run(`runner/reject-${name}`, 'native-filesystem-preflight-only', () => {
  assert.throws(() => preflight(output));
  assert.deepEqual(fs.readdirSync(repository), []);
});
run('runner/allow-real-external', 'native-filesystem-preflight-only', () => preflight(external));
run('runner/allow-missing-multilevel', 'native-filesystem-preflight-only', () => preflight(path.join(external, 'not-created', 'nested')));
run('runner/preflight-before-side-effects-and-post-create-recheck', 'source-contract', () => {
  const precheck = source.indexOf('planProbeOutput(process.cwd(),process.argv[2])');
  assert.ok(precheck >= 0 && precheck < firstMkdir);
  const recheck = source.indexOf('recheckOutputDirectory(outputPlan);');
  assert.ok(recheck > firstMkdir);
  assert.ok(recheck < source.indexOf("fs.mkdtempSync(path.join(out,'profile-'))"));
});
for (const [name, paths, base] of [
  ['posix', path.posix, '/work/repository'],
  ['win32', path.win32, 'C:\\work\\repository'],
]) for (const [label, output, expected] of [
  ['root', base, true],
  ['child', paths.join(base, 'child'), true],
  ['dotdot-prefix-child', paths.join(base, '..probe'), true],
  ['parent', paths.dirname(base), false],
  ['same-prefix-sibling', `${base}-other`, false],
]) run(`calculation/${name}/${label}`, 'pure-path-calculation-not-OS-proof', () => assert.equal(isInsidePath(base, output, paths), expected));
run('helper/create-missing-multilevel-and-recheck', 'native-filesystem', () => {
  const plan = planProbeOutput(repository, path.join(external, 'created', 'nested'));
  assert.equal(fs.existsSync(plan.out), false);
  fs.mkdirSync(plan.out, { recursive: true });
  assert.equal(recheckOutputDirectory(plan), fs.realpathSync(plan.out));
});
run('helper/resolution-permission-denied', 'injected-IO-not-OS-ACL-proof', () => {
  const io = { ...fs, lstatSync: () => { throw Object.assign(new Error('injected permission denial'), { code: 'EACCES' }); } };
  rejects(() => planProbeOutput(repository, external, { io }));
});
run('helper/realpath-failure', 'injected-IO-not-OS-ACL-proof', () => {
  const io = { ...fs, realpathSync: location => {
    if (location === external) throw Object.assign(new Error('injected resolution failure'), { code: 'EIO' });
    return fs.realpathSync(location);
  } };
  rejects(() => planProbeOutput(repository, external, { io }));
});
const linkType = process.platform === 'win32' ? 'junction' : 'dir';
const link = (name, target, alias, body) => {
  try {
    fs.symlinkSync(target, alias, linkType);
  } catch (error) {
    cases.push({ name, kind: `native-${linkType}`, status: 'NOT RUN', error: String(error) });
    return;
  }
  run(name, `native-${linkType}`, () => body(alias));
};
link('runner/external-alias-back-to-repository', repository, path.join(external, 'repository-link'), alias => {
  // Assert the actual runner preflight, not just an independently tested helper.
  assert.throws(() => preflight(path.join(alias, 'must-not-be-created')), error => error?.code === 'UNSAFE_PROBE_OUTPUT');
  assert.deepEqual(fs.readdirSync(repository), []);
});
link('runner/external-alias-to-external', external, path.join(fixture, 'external-link'), alias => preflight(path.join(alias, 'missing')));
link('runner/dangling-link', path.join(fixture, 'absent-target'), path.join(fixture, 'dangling-link'), alias => {
  assert.throws(() => preflight(alias), error => error?.code === 'UNSAFE_PROBE_OUTPUT');
  assert.throws(() => preflight(path.join(alias, 'child')), error => error?.code === 'UNSAFE_PROBE_OUTPUT');
});
const changedPlan = planProbeOutput(repository, path.join(fixture, 'changed-after-preflight'));
link('helper/post-create-recheck-detects-new-repository-alias', repository, changedPlan.out, () => rejects(() => recheckOutputDirectory(changedPlan)));
run('helper/post-create-recheck-resolution-failure', 'injected-IO-not-OS-ACL-proof', () => {
  const plan = planProbeOutput(repository, external);
  const io = { ...fs, realpathSync: () => { throw Object.assign(new Error('injected post-create failure'), { code: 'EACCES' }); } };
  rejects(() => recheckOutputDirectory(plan, { io }));
});
const result = {
  task: 'ENG-WORLD-LOW-ASSET-UI-001/T02', runtime: process.version,
  platform: process.platform, fixture_root: fixture, source_path: sourcePath,
  source_sha256: createHash('sha256').update(sourceBytes).digest('hex'),
  browser_suffix_sha256: createHash('sha256').update(sourceBytes.subarray(browserStart)).digest('hex'),
  cases, total: cases.length, passed: cases.filter(c => c.status === 'PASS').length,
  failed: cases.filter(c => c.status === 'FAIL').length,
  not_run: cases.filter(c => c.status === 'NOT RUN').length,
  limitations: [
    'No browser, gameplay or test-suite execution; T02 is not a new production test',
    'Fixtures are external stand-in repositories; actual repository contents are not written',
    'Injected permission failures are not actual Windows ACL failure evidence',
    'Pure POSIX/win32 path calculations are separate from native filesystem evidence',
    'No guarantee against hostile concurrent link replacement',
  ],
};
fs.writeFileSync(path.join(outputPlan.out, 'output-boundary-results.json'), JSON.stringify(result, null, 2) + '\n');
console.log(JSON.stringify(result, null, 2));
process.exitCode = result.failed ? 1 : 0;
