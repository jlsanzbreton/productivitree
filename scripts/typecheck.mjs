import { accessSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const cwd = process.cwd();

const candidates = [
  path.join(cwd, 'node_modules', '.bin', 'tsc'),
  path.join(cwd, 'node_modules', 'typescript', 'lib', 'tsc.js'),
];

const dotNodeModules = path.join(cwd, 'node_modules');
let dynamicCandidate = null;
try {
  const entries = readdirSync(dotNodeModules).filter((entry) => entry.startsWith('.typescript-'));
  if (entries[0]) {
    dynamicCandidate = path.join(dotNodeModules, entries[0], 'lib', 'tsc.js');
  }
} catch (_error) {
  // No-op.
}

if (dynamicCandidate) candidates.push(dynamicCandidate);

const executable = candidates.find((candidate) => {
  try {
    accessSync(candidate);
    return true;
  } catch (_error) {
    return false;
  }
});

if (!executable) {
  console.error('TypeScript compiler not found. Install dependencies with npm install.');
  process.exit(1);
}

const command = executable.endsWith('.js') ? process.execPath : executable;
const args = executable.endsWith('.js') ? [executable, '--noEmit'] : ['--noEmit'];

const result = spawnSync(command, args, {
  stdio: 'inherit',
  cwd,
});

process.exit(result.status ?? 1);
