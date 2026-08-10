#!/usr/bin/env node
// Runs every suite (including the Docker-backed container specs) and prints
// aggregate pass/fail counts plus coverage. `nx scenario api` stays out: it is
// run by hand, not in a sweep.
import { spawnSync } from 'node:child_process';
import { mkdirSync, readFileSync, existsSync } from 'node:fs';

const OUT = 'tmp/test-all';
mkdirSync(OUT, { recursive: true });

const vitestCoverage = (dir) => [
  '--coverage',
  '--coverage.reporter=json-summary',
  '--coverage.reporter=html',
  `--coverage.reportsDirectory=${dir}`,
];
const angularCoverage = ['--coverage', '--coverage-reporters=json-summary', '--coverage-reporters=html'];

const suites = [
  { name: 'packages', args: ['test:coverage', 'test'], pass: vitestCoverage('coverage/test'), coverage: 'coverage/test' },
  { name: 'container', args: ['test:container', 'test'] },
  { name: 'api', args: ['test', 'api'], pass: vitestCoverage('coverage/api'), coverage: 'coverage/api' },
  { name: 'admin-api', args: ['test', 'admin-api'], pass: ['--run', ...vitestCoverage('coverage/admin-api')], coverage: 'coverage/admin-api' },
  { name: 'vendor-frontend', args: ['test', 'vendor-frontend'], angular: true, coverage: 'coverage/vendor-frontend' },
  { name: 'customer-frontend', args: ['test', 'customer-frontend'], angular: true, coverage: 'coverage/customer-frontend' },
  { name: 'admin-frontend', args: ['test', 'admin-frontend'], angular: true, coverage: 'coverage/admin-frontend' },
];

const results = [];
for (const suite of suites) {
  const report = `${OUT}/${suite.name}.json`;
  const reporter = suite.angular
    ? ['--reporters=json', `--outputFile=${report}`, ...angularCoverage]
    : ['--reporter=json', `--outputFile=${report}`, ...(suite.pass ?? [])];
  // Angular's builder takes its options as nx flags; run-commands/vitest targets need `--`.
  const argv = suite.angular
    ? [...suite.args, '--skip-nx-cache', ...reporter]
    : [...suite.args, '--skip-nx-cache', '--', ...reporter];

  console.log(`\n=== ${suite.name} ===`);
  const run = spawnSync('npx', ['nx', ...argv], { stdio: 'inherit', shell: false });
  const json = existsSync(report) ? JSON.parse(readFileSync(report, 'utf8')) : null;
  results.push({ ...suite, exitCode: run.status ?? 1, json });
}

const pct = (covered, total) => (total === 0 ? 100 : (100 * covered) / total).toFixed(2);
const metrics = ['lines', 'statements', 'functions', 'branches'];
const totals = { passed: 0, failed: 0, skipped: 0, tests: 0 };
const combined = Object.fromEntries(metrics.map((m) => [m, { covered: 0, total: 0 }]));

console.log('\n\n=== summary ===');
for (const r of results) {
  const j = r.json;
  if (j) {
    totals.passed += j.numPassedTests;
    totals.failed += j.numFailedTests;
    totals.skipped += j.numPendingTests + j.numTodoTests;
    totals.tests += j.numTotalTests;
  }
  const summaryFile = r.coverage && `${r.coverage}/coverage-summary.json`;
  let cov = '';
  if (summaryFile && existsSync(summaryFile)) {
    const total = JSON.parse(readFileSync(summaryFile, 'utf8')).total;
    for (const m of metrics) {
      combined[m].covered += total[m].covered;
      combined[m].total += total[m].total;
    }
    cov = `  lines ${total.lines.pct}%  branches ${total.branches.pct}%`;
  }
  const counts = j ? `${j.numPassedTests} passed, ${j.numFailedTests} failed` : 'NO REPORT';
  console.log(`${r.exitCode === 0 ? '✓' : '✗'} ${r.name.padEnd(18)} ${counts.padEnd(24)}${cov}`);
}

console.log(
  `\ntests: ${totals.tests} total, ${totals.passed} passed, ${totals.failed} failed, ${totals.skipped} skipped`
);
console.log(
  'coverage (all scopes): ' +
    metrics.map((m) => `${m} ${pct(combined[m].covered, combined[m].total)}%`).join('  ')
);

const failed = results.filter((r) => r.exitCode !== 0);
if (failed.length) {
  console.log(`\nfailing suites: ${failed.map((r) => r.name).join(', ')}`);
  process.exit(1);
}
