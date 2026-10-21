// TEST-only filesystem boundary; no gameplay or persistence authority.
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { randomBytes } from 'node:crypto';

export class OutputPathError extends Error {
  constructor(message, cause) {
    super(message, { cause });
    this.name = 'OutputPathError';
    this.code = 'UNSAFE_PROBE_OUTPUT';
  }
}

export function isInsidePath(repo, output, paths = path) {
  const relative = paths.relative(repo, output);
  return relative === '' || (!paths.isAbsolute(relative) && relative.split(paths.sep)[0] !== '..');
}

function existingDirectory(location, io) {
  try {
    const real = io.realpathSync(location);
    if (!io.statSync(real).isDirectory()) throw new Error('Not a directory');
    return real;
  } catch (error) {
    throw new OutputPathError(`Cannot resolve directory: ${location}`, error);
  }
}

function resolveOutput(location, io) {
  let ancestor = location;
  const tail = [];
  for (;;) {
    try {
      // lstat distinguishes an absent leaf from an existing dangling link.
      io.lstatSync(ancestor);
      break;
    } catch (error) {
      if (error.code !== 'ENOENT') throw new OutputPathError(`Cannot inspect output: ${ancestor}`, error);
      const parent = path.dirname(ancestor);
      if (parent === ancestor) throw new OutputPathError('No resolvable output ancestor', error);
      tail.unshift(path.basename(ancestor));
      ancestor = parent;
    }
  }
  return path.join(existingDirectory(ancestor, io), ...tail);
}

export function planProbeOutput(repoInput, outputInput, { io = fs, tempRoot = os.tmpdir(), token } = {}) {
  const repo = path.resolve(repoInput);
  const realRepo = existingDirectory(repo, io);
  const suffix = token ?? randomBytes(12).toString('hex');
  if (!/^[a-zA-Z0-9-]+$/.test(suffix)) throw new OutputPathError('Invalid temporary output token');
  // Select a name without creating it: even a default temp root can alias repo.
  const out = path.resolve(outputInput ?? path.join(tempRoot, `world-entry-native-${suffix}`));
  if (isInsidePath(repo, out)) throw new OutputPathError('Probe output must be lexically outside repository');
  const realOut = resolveOutput(out, io);
  if (isInsidePath(realRepo, realOut)) throw new OutputPathError('Probe output resolves inside repository');
  return Object.freeze({ repo, out, realRepo, realOut });
}

export function recheckOutputDirectory(plan, { io = fs } = {}) {
  const realRepo = existingDirectory(plan.repo, io);
  const realOut = existingDirectory(plan.out, io);
  if (realRepo !== plan.realRepo || realOut !== plan.realOut || isInsidePath(realRepo, realOut)) {
    throw new OutputPathError('Probe output or repository changed after preflight');
  }
  return realOut;
}
