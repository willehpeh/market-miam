#!/usr/bin/env node
// Builds the interactive test-map webpage: scans every *.spec.ts, extracts the
// describe/it hierarchy (following shared *.contract.ts suites to each caller),
// assigns each file a domain theme, and injects the result into template.html.
// Output: tmp/test-map/index.html — a self-contained page, no dependencies
// beyond Node built-ins, so the Render static site builds with a bare `node`.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, '../..');

const files = execSync(
  `find ${ROOT} -name "*.spec.ts" -not -path "*/node_modules/*" | sort`,
  { encoding: 'utf8' }
).trim().split('\n');

// Tokenizes just enough TypeScript to find describe/it/test calls and their
// brace depth, skipping strings, template literals, and comments. Depth is what
// rebuilds the nesting: a call's parent chain is every describe still open at a
// shallower depth.
function parseSpecs(src) {
  const calls = [];
  let i = 0, depth = 0;
  const n = src.length;
  while (i < n) {
    const c = src[i];
    if (c === '/' && src[i + 1] === '/') { while (i < n && src[i] !== '\n') i++; continue; }
    if (c === '/' && src[i + 1] === '*') { i += 2; while (i < n && !(src[i] === '*' && src[i + 1] === '/')) i++; i += 2; continue; }
    if (c === "'" || c === '"') {
      i++; while (i < n && src[i] !== c) { if (src[i] === '\\') i++; i++; } i++; continue;
    }
    if (c === '`') {
      i++;
      while (i < n && src[i] !== '`') {
        if (src[i] === '\\') { i += 2; continue; }
        if (src[i] === '$' && src[i + 1] === '{') {
          i += 2; let d = 1;
          while (i < n && d > 0) { if (src[i] === '{') d++; else if (src[i] === '}') d--; i++; }
          continue;
        }
        i++;
      }
      i++; continue;
    }
    if (c === '{') { depth++; i++; continue; }
    if (c === '}') { depth--; i++; continue; }
    if (/[A-Za-z_]/.test(c)) {
      // The 4000-char window must cover the longest it.each table between the
      // keyword and the test title.
      const m = /^(describe|it|test)((?:\.(?:each|skip|only|todo|concurrent|fails|skipIf|runIf)(?:\([^)]*\))?)*)\s*\(/.exec(src.slice(i, i + 4000));
      if (m) {
        let j = i + m[0].length;
        while (j < n && /\s/.test(src[j])) j++;
        const q = src[j];
        let name = null;
        if (q === "'" || q === '"' || q === '`') {
          let k = j + 1, buf = '';
          while (k < n && src[k] !== q) {
            if (src[k] === '\\') { buf += src[k + 1]; k += 2; continue; }
            buf += src[k]; k++;
          }
          name = buf;
        }
        if (name !== null) {
          calls.push({ type: m[1], mods: m[2] || '', name, depth });
          i = j; continue;
        }
      }
      while (i < n && /[A-Za-z0-9_$.]/.test(src[i])) i++;
      continue;
    }
    i++;
  }
  return calls;
}

function testsFromCalls(calls) {
  const stack = [];
  const tests = [];
  for (const c of calls) {
    while (stack.length && stack[stack.length - 1].depth >= c.depth) stack.pop();
    if (c.type === 'describe') stack.push({ name: c.name, depth: c.depth });
    else tests.push({ name: c.name, suite: stack.map(s => s.name), mods: c.mods });
  }
  return tests;
}

// Shared contract suites: the describe/it blocks live in a *.contract.ts file
// whose exported function is called once per implementation. Each call site
// gets the contract's tests, with template placeholders in titles replaced by
// the implementation name passed at the call.
const contractCache = new Map();
function contractTests(specPath, src) {
  const results = [];
  const callRe = /\b(\w+Contract)\s*\(\s*(['"`])((?:\\.|(?!\2).)*)\2/g;
  for (const m of src.matchAll(callRe)) {
    const fnName = m[1], instanceName = m[3];
    const imp = new RegExp(`import\\s*\\{[^}]*\\b${fnName}\\b[^}]*\\}\\s*from\\s*['"]([^'"]+)['"]`).exec(src);
    if (!imp || !imp[1].startsWith('.')) continue;
    const contractFile = resolve(dirname(specPath), imp[1]) + '.ts';
    if (!contractCache.has(contractFile)) {
      try {
        contractCache.set(contractFile, testsFromCalls(parseSpecs(readFileSync(contractFile, 'utf8'))));
      } catch { contractCache.set(contractFile, []); }
    }
    for (const t of contractCache.get(contractFile)) {
      results.push({
        name: t.name.replace(/\$\{[^}]+\}/g, instanceName),
        suite: t.suite.map(s => s.replace(/\$\{[^}]+\}/g, instanceName)),
        mods: t.mods,
        contract: true,
      });
    }
  }
  return results;
}

// Themes group by the domain concept a spec protects, not where it lives; the
// same concept spans api, frontends, and the packages suite. Rules match the
// basename first (order matters — "dish" must win over "guard"), then fall back
// to the directory.
const THEME_RULES = [
  ['Media & Uploads', /cloudinary|photo|signed-upload/],
  ['Storefront', /storefront/],
  ['Catalogue & Dishes', /catalogue|dish/],
  ['Menus', /menu|carte/],
  ['Markets & Schedules', /market-schedule|market-day|markets-list|add-schedule|editable-schedule|upcoming|scenario/],
  ['Vendors & Onboarding', /vendor|onboarding|welcome|landing|dashboard/],
  ['Auth & Identity', /\bauth|auth0|token-verifier|authenticated|users|dev-auth/],
  ['Event Sourcing & Persistence', /event-sourc|event-store|persistence|postgres|subscription|checkpoint|lineage|tracing|keyring|polling|notifications?\.spec|unit-of-work|concurrency|consumer|command-gateway|query-gateway|poll-schedule|dev-seed|data-keys|events\.contract|seeding/],
  ['Core Primitives', /date|time|email|phone|url\.spec|instant|clock|image-reference|local-|source-code-url/],
];
function themeFor(relPath) {
  const base = relPath.split('/').pop();
  for (const [theme, re] of THEME_RULES) if (re.test(base)) return theme;
  if (/\/event-sourcing\//.test(relPath)) return 'Event Sourcing & Persistence';
  if (/\/market-days\//.test(relPath)) return 'Markets & Schedules';
  if (/\/common\/|\/shared-kernel\//.test(relPath)) return 'Core Primitives';
  if (/\/auth\//.test(relPath)) return 'Auth & Identity';
  return 'App Shell & Misc';
}

function layerFor(relPath) {
  const m = /^apps\/([^/]+)\//.exec(relPath);
  if (m) return m[1];
  if (relPath.startsWith('test/')) return 'test (packages suite)';
  const p = /^packages\/([^/]+)\//.exec(relPath);
  if (p) return `packages/${p[1]}`;
  return 'other';
}

const data = [];
let totalTests = 0;
for (const f of files) {
  const rel = f.slice(ROOT.length + 1);
  const src = readFileSync(f, 'utf8');
  const tests = [...testsFromCalls(parseSpecs(src)), ...contractTests(f, src)];
  totalTests += tests.length;
  data.push({ file: rel, theme: themeFor(rel), layer: layerFor(rel), lines: src.split('\n').length, tests });
}

const generated = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
const html = readFileSync(resolve(HERE, 'template.html'), 'utf8')
  .replace('__DATA__', () => JSON.stringify(data))
  .replace('__GENERATED__', generated);

const OUT = resolve(ROOT, 'tmp/test-map');
mkdirSync(OUT, { recursive: true });
writeFileSync(resolve(OUT, 'index.html'), html);

const empty = data.filter(f => f.tests.length === 0);
console.log(`${data.length} spec files, ${totalTests} tests → tmp/test-map/index.html`);
if (empty.length) {
  console.warn(`WARNING — parsed no tests from (parser gap or dead spec):`);
  for (const f of empty) console.warn(`  ${f.file}`);
}
