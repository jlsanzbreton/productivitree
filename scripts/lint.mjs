import { readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const INCLUDE_DIRS = ['components', 'contexts', 'utils', 'services', 'netlify/functions'];
const INCLUDE_FILES = ['App.tsx', 'types.ts', 'constants.ts', 'index.tsx'];
const FORBIDDEN_PATTERNS = [
  { regex: /console\.log\(/, label: 'console.log' },
  { regex: /eslint-disable/, label: 'eslint-disable comment' },
];

const collectFiles = (dir) => {
  const absoluteDir = path.join(ROOT, dir);
  const entries = readdirSync(absoluteDir);
  return entries.flatMap((entry) => {
    const absolute = path.join(absoluteDir, entry);
    const relative = path.relative(ROOT, absolute);
    const stats = statSync(absolute);
    if (stats.isDirectory()) return collectFiles(relative);
    if (!/\.(ts|tsx|js)$/.test(entry)) return [];
    return [relative];
  });
};

const files = [
  ...INCLUDE_DIRS.flatMap((directory) => collectFiles(directory)),
  ...INCLUDE_FILES,
].filter((file, index, arr) => arr.indexOf(file) === index);

const issues = [];

files.forEach((file) => {
  const content = readFileSync(path.join(ROOT, file), 'utf-8');
  FORBIDDEN_PATTERNS.forEach((rule) => {
    if (rule.regex.test(content)) {
      issues.push(`${file}: contains forbidden ${rule.label}`);
    }
  });
});

if (issues.length > 0) {
  console.error('Custom lint failed:\n' + issues.map((issue) => `- ${issue}`).join('\n'));
  process.exit(1);
}

console.log(`Custom lint passed (${files.length} files checked).`);
