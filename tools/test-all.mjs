#!/usr/bin/env node
// Runs every suite (including the Docker-backed container specs) and prints
// aggregate pass/fail counts plus coverage. `nx scenario api` stays out: it is
// run by hand, not in a sweep.
import { spawnSync, execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync, existsSync, rmSync } from 'node:fs';
import { resolve } from 'node:path';
// ponytail: istanbul-lib-coverage comes in with @vitest/coverage-v8; declare it
// directly if that ever stops being true.
import istanbul from 'istanbul-lib-coverage';
const { createCoverageMap } = istanbul;

const OUT = resolve('tmp/test-all');
mkdirSync(OUT, { recursive: true });

// Every suite runs in its own cwd, so paths handed to a runner must be absolute.
// `json` as well as `json-summary`: the per-file map is what the union needs.
const vitestCoverage = (dir) => [
  '--coverage.enabled=true',
  '--coverage.reporter=json-summary',
  '--coverage.reporter=json',
  '--coverage.reporter=html',
  `--coverage.reportsDirectory=${resolve(dir)}`,
];
const angularCoverage = [
  '--coverage',
  '--coverage-reporters=json-summary',
  '--coverage-reporters=json',
  '--coverage-reporters=html',
];

const suites = [
  { name: 'packages', args: ['test:coverage', 'test'], pass: vitestCoverage('coverage/test'), coverage: 'coverage/test' },
  // partial: v8 counts every module the specs import, so this suite's own
  // percentage reads far lower than what it actually drives. It only means
  // something merged with the rest.
  { name: 'container', args: ['test:container', 'test'], pass: vitestCoverage('coverage/test-container'), coverage: 'coverage/test-container', partial: true },
  { name: 'api', args: ['test', 'api'], pass: vitestCoverage('coverage/api'), coverage: 'coverage/api' },
  // The api specs drive plenty of `packages/**`, but the project's own report
  // deliberately stays scoped to `src/**` with `all: true`. So run them a second
  // time purely to measure what they reach in packages: `allowExternal` because
  // those files sit outside the api root (without it v8 discards every one), and
  // the include has to be written `**/packages/...` — `../../packages/...`
  // matches nothing. Tests aren't counted twice; only the coverage is merged.
  {
    name: 'api-packages',
    args: ['test', 'api'],
    pass: [
      ...vitestCoverage('coverage/api-packages'),
      '--coverage.allowExternal=true',
      '--coverage.all=false',
      '--coverage.include=**/packages/**/src/**/*.ts',
    ],
    coverage: 'coverage/api-packages',
    partial: true,
    coverageOnly: true,
  },
  { name: 'admin-api', args: ['test', 'admin-api'], pass: ['--run', ...vitestCoverage('coverage/admin-api')], coverage: 'coverage/admin-api' },
  { name: 'vendor-frontend', args: ['test', 'vendor-frontend'], angular: true, coverage: 'coverage/vendor-frontend' },
  { name: 'customer-frontend', args: ['test', 'customer-frontend'], angular: true, coverage: 'coverage/customer-frontend' },
  { name: 'admin-frontend', args: ['test', 'admin-frontend'], angular: true, coverage: 'coverage/admin-frontend' },
];

// A project added to the workspace but not to the table above would just be
// missing from the sweep, silently — the one failure mode that doesn't announce
// itself. Deliberately absent from this list: `scenario` (run by hand), `e2e`
// (playwright), `test-ci` (Nx-Cloud-only alias of `test`) and the watch variants.
// Checked per project, not per target: @nx/vitest infers a `test` target for the
// `test` project too, which the table deliberately runs as `test:coverage`. The
// limit that buys — a second, separate suite on a project already listed here
// (another `test:container`, say) won't be noticed.
const RUN_TARGETS = ['test', 'test:coverage', 'test:container'];
const declared = new Set(
  RUN_TARGETS.flatMap((target) =>
    JSON.parse(
      execFileSync('npx', ['nx', 'show', 'projects', '--json', '--with-target', target], { encoding: 'utf8' })
    )
  )
);
const covered = new Set(suites.map((s) => s.args[1]));
const missing = [...declared].filter((project) => !covered.has(project));
if (missing.length) {
  console.error(`Not in the sweep — add them to tools/test-all.mjs: ${missing.join(', ')}`);
  process.exit(1);
}

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
  // A suite that dies before writing must not be scored off a previous run's file.
  rmSync(report, { force: true });
  if (suite.coverage) rmSync(`${suite.coverage}/coverage-summary.json`, { force: true });
  const run = spawnSync('npx', ['nx', ...argv], { stdio: 'inherit', shell: false });
  const json = existsSync(report) ? JSON.parse(readFileSync(report, 'utf8')) : null;
  results.push({ ...suite, exitCode: run.status ?? 1, json });
}

const metrics = ['lines', 'statements', 'functions', 'branches'];
const totals = { passed: 0, failed: 0, skipped: 0, tests: 0 };
// A file can be driven by more than one suite (packages code runs in the unit
// suite, the container suite and the api suite), so the whole-repo number is a
// union of the per-file maps — summing suite totals would count it twice.
const union = createCoverageMap({});

console.log('\n\n=== summary ===');
for (const r of results) {
  const j = r.json;
  if (j && !r.coverageOnly) {
    totals.passed += j.numPassedTests;
    totals.failed += j.numFailedTests;
    totals.skipped += j.numPendingTests + j.numTodoTests;
    totals.tests += j.numTotalTests;
  }
  const summaryFile = r.coverage && `${r.coverage}/coverage-summary.json`;
  let cov = '';
  if (r.partial) {
    cov = '  folded into union';
  } else if (summaryFile && existsSync(summaryFile)) {
    const total = JSON.parse(readFileSync(summaryFile, 'utf8')).total;
    cov = `  lines ${total.lines.pct}%  branches ${total.branches.pct}%`;
  }
  const finalFile = r.coverage && `${r.coverage}/coverage-final.json`;
  if (finalFile && existsSync(finalFile)) union.merge(JSON.parse(readFileSync(finalFile, 'utf8')));
  const counts = r.coverageOnly
    ? 'coverage pass'
    : j
      ? `${j.numPassedTests} passed, ${j.numFailedTests} failed`
      : 'NO REPORT';
  console.log(`${r.exitCode === 0 ? '✓' : '✗'} ${r.name.padEnd(18)} ${counts.padEnd(24)}${cov}`);
}

console.log(
  `\ntests: ${totals.tests} total, ${totals.passed} passed, ${totals.failed} failed, ${totals.skipped} skipped`
);
const merged = union.getCoverageSummary();
console.log('coverage (union of all suites): ' + metrics.map((m) => `${m} ${merged[m].pct}%`).join('  '));

const failed = results.filter((r) => r.exitCode !== 0);
if (failed.length) {
  console.log(`\nfailing suites: ${failed.map((r) => r.name).join(', ')}`);
  process.exit(1);
}
