import { readFileSync } from 'node:fs';
import { relative, resolve } from 'node:path';

const report = JSON.parse(readFileSync(resolve('coverage/coverage-final.json'), 'utf8'));
const criticalFiles = new Map([
  ['parseMarkdown.ts', { lines: 90, branches: 85 }],
  ['changeEngine.ts', { lines: 90, branches: 85 }],
  ['reviewService.ts', { lines: 90, branches: 85 }],
  ['historyService.ts', { lines: 90, branches: 85 }],
]);
const failures = [];

for (const [file, record] of Object.entries(report)) {
  const lines = new Map();
  for (const [id, span] of Object.entries(record.statementMap)) {
    for (let line = span.start.line; line <= span.end.line; line += 1) {
      lines.set(line, Boolean(record.s[id]) || lines.get(line) === true);
    }
  }
  if (lines.size === 0) continue;
  const lineRate = (100 * [...lines.values()].filter(Boolean).length) / lines.size;
  const branches = Object.values(record.b).flat();
  const branchRate = branches.length
    ? (100 * branches.filter((count) => count > 0).length) / branches.length
    : 100;
  const name = relative(process.cwd(), file);
  const critical = criticalFiles.get(file.split(/[\\/]/).at(-1));
  const lineFloor = critical?.lines ?? (lines.size > 10 ? 60 : 0);
  const branchFloor = critical?.branches ?? 0;
  if (lineRate < lineFloor || branchRate < branchFloor) {
    failures.push(
      `${name}: lines ${lineRate.toFixed(1)}%/${lineFloor}%, branches ${branchRate.toFixed(1)}%/${branchFloor}%`,
    );
  }
}

if (failures.length) {
  process.stderr.write(`Per-file coverage floors failed:\n${failures.join('\n')}\n`);
  process.exitCode = 1;
} else {
  process.stdout.write('Per-file coverage floors passed.\n');
}
