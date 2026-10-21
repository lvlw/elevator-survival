// Standalone TEST-only regression. Fixtures are external; never deletes directories.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { OutputPathError, isInsidePath, planProbeOutput, recheckOutputDirectory } from './output-path-guard.mjs';

const cases = [];
const run = (name, kind, body) => {
  try {
    body();
    cases.push({ name, kind, status: 'PASS' });
  } catch (error) {
    cases.push({ name, kind, status: 'FAIL', error: String(error), assertion: error instanceof assert.AssertionError });
  }
};
const reject = body => assert.throws(body, error => error instanceof OutputPathError);
for (const [name, paths, repo] of [['posix', path.posix, '/work/repo'], ['win32', path.win32, 'C:\\work\\repo']]) {
  for (const [label, output, inside] of [
    ['root', repo, true], ['child', paths.join(repo, 'child'), true],
    ['dotdot-prefixed-child', paths.join(repo, '..probe'), true],
    ['parent', paths.dirname(repo), false], ['sibling', paths.join(paths.dirname(repo), 'other'), false],
    ['same-prefix-sibling', `${repo}-other`, false],
  ]) run(`${name}/${label}`, 'path-calculation-not-OS-proof', () => assert.equal(isInsidePath(repo, output, paths), inside));
}

// Guard the fixture root too, before creating any fake repo.
const rootPlan = planProbeOutput(process.cwd(), undefined);
fs.mkdirSync(rootPlan.out);
recheckOutputDirectory(rootPlan);
const root = rootPlan.out;
const repo = path.join(root, 'repo');
const external = path.join(root, 'external');
fs.mkdirSync(repo);
fs.mkdirSync(external);
fs.mkdirSync(path.join(repo, '..probe'));
for (const [name, location] of [['root', repo], ['child', path.join(repo, 'child')], ['dotdot-prefixed-child', path.join(repo, '..probe')]]) {
  run(`filesystem/reject-${name}`, 'native-filesystem', () => reject(() => planProbeOutput(repo, location)));
}
for (const [name, location] of [
  ['parent', root], ['sibling', external], ['same-prefix-sibling', `${repo}-sibling`],
  ['missing-leaf', path.join(external, 'leaf')], ['missing-multilevel', path.join(external, 'a', 'b', 'c')],
]) run(`filesystem/allow-${name}`, 'native-filesystem', () => assert.equal(planProbeOutput(repo, location).out, location));
run('filesystem/missing-repo-fails-closed', 'native-filesystem', () => reject(() => planProbeOutput(path.join(root, 'missing-repo'), external)));
const file = path.join(external, 'file');
fs.writeFileSync(file, 'fixture\n');
run('filesystem/output-is-file', 'native-filesystem', () => reject(() => planProbeOutput(repo, file)));
run('filesystem/output-parent-is-file', 'native-filesystem', () => reject(() => planProbeOutput(repo, path.join(file, 'leaf'))));
run('default/inside-repo-no-creation', 'native-filesystem', () => {
  reject(() => planProbeOutput(repo, undefined, { tempRoot: repo, token: 'inside' }));
  assert.equal(fs.existsSync(path.join(repo, 'world-entry-native-inside')), false);
});
run('default/outside-no-creation-before-caller', 'native-filesystem', () => {
  const plan = planProbeOutput(repo, undefined, { tempRoot: external, token: 'outside' });
  assert.equal(fs.existsSync(plan.out), false);
  fs.mkdirSync(plan.out);
  assert.equal(recheckOutputDirectory(plan), fs.realpathSync(plan.out));
});
run('fault/lstat-permission-denied-fails-closed', 'injected-IO-not-OS-ACL-proof', () => {
  const io = { ...fs, lstatSync: () => { throw Object.assign(new Error('injected denial'), { code: 'EACCES' }); } };
  reject(() => planProbeOutput(repo, external, { io }));
});
run('fault/realpath-failure-fails-closed', 'injected-IO-not-OS-ACL-proof', () => {
  const io = { ...fs, realpathSync: location => {
    if (location === external) throw Object.assign(new Error('injected IO failure'), { code: 'EIO' });
    return fs.realpathSync(location);
  } };
  reject(() => planProbeOutput(repo, external, { io }));
});

const linkType = process.platform === 'win32' ? 'junction' : 'dir';
const withLink = (name, target, alias, body) => {
  try {
    fs.symlinkSync(target, alias, linkType);
  } catch (error) {
    cases.push({ name, kind: `native-${linkType}`, status: 'NOT RUN', error: String(error) });
    return;
  }
  run(name, `native-${linkType}`, () => body(alias));
};
withLink('link/repo-itself-is-alias', repo, path.join(root, 'repo-alias'), alias => {
  reject(() => planProbeOutput(alias, path.join(repo, 'new-leaf')));
  assert.equal(planProbeOutput(alias, external).realRepo, fs.realpathSync(repo));
});
withLink('link/external-alias-back-to-repo', repo, path.join(external, 'repo-link'), alias => reject(() => planProbeOutput(repo, path.join(alias, 'new', 'leaf'))));
withLink('link/external-alias-to-external', external, path.join(root, 'outside-link'), alias => assert.equal(planProbeOutput(repo, path.join(alias, 'new')).realOut, path.join(fs.realpathSync(external), 'new')));
withLink('link/lexically-inside-to-external-conservative', external, path.join(repo, 'outside-link'), alias => reject(() => planProbeOutput(repo, alias)));
withLink('link/dangling-leaf-and-ancestor', path.join(root, 'absent-target'), path.join(root, 'dangling-link'), alias => {
  reject(() => planProbeOutput(repo, alias));
  reject(() => planProbeOutput(repo, path.join(alias, 'child')));
});
withLink('default/temp-alias-back-to-repo-no-creation', repo, path.join(root, 'temp-link'), alias => {
  reject(() => planProbeOutput(repo, undefined, { tempRoot: alias, token: 'aliased' }));
  assert.equal(fs.existsSync(path.join(repo, 'world-entry-native-aliased')), false);
});
const changed = planProbeOutput(repo, path.join(root, 'changed-after-preflight'));
withLink('link/post-create-recheck-detects-changed-target', repo, changed.out, () => reject(() => recheckOutputDirectory(changed)));
run('filesystem/post-create-multilevel-compatible', 'native-filesystem', () => {
  const plan = planProbeOutput(repo, path.join(external, 'created', 'nested'));
  fs.mkdirSync(plan.out, { recursive: true });
  assert.equal(recheckOutputDirectory(plan), fs.realpathSync(plan.out));
});

const result = {
  task: 'DOC-WORLD-ENTRY-006/T01', runtime: process.version, platform: process.platform,
  fixture_root: root, cases,
  total: cases.length, passed: cases.filter(c => c.status === 'PASS').length,
  failed: cases.filter(c => c.status === 'FAIL').length, not_run: cases.filter(c => c.status === 'NOT RUN').length,
  limitations: ['No hostile concurrent-link-replacement sandbox guarantee', 'Injected permission failures are not actual Windows ACL tests', 'Pure win32 path calculations are separate from native filesystem junction evidence'],
};
console.log(JSON.stringify(result, null, 2));
process.exitCode = result.failed ? 1 : 0;
