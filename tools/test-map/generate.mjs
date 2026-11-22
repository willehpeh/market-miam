#!/usr/bin/env node
// Builds the interactive test-map webpage: scans every test file, extracts the
// describe/it hierarchy (following shared *.contract.ts suites to each caller),
// files each one under a bounded context, a kind of test and an app, and injects
// the result into template.html.
// Output: tmp/test-map/index.html — a self-contained page, no dependencies
// beyond Node built-ins, so the Render static site builds with a bare `node`.
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, '../..');

// git, not find: respects .gitignore, so tool sandboxes (.stryker-tmp) aren't
// mapped as duplicate specs. existsSync drops tracked files deleted locally.
const gitFiles = (...patterns) => execSync(
  `git -C ${ROOT} ls-files --cached --others --exclude-standard ${patterns.map(p => `'${p}'`).join(' ')}`,
  { encoding: 'utf8' }
).trim().split('\n').filter(Boolean).map(f => resolve(ROOT, f)).filter(existsSync).sort();

// Specs, plus the api's suites run by hand or nightly rather than in CI: the
// scenarios (`nx scenario api`) and the Auth0 test tenant (`nx run api:test:tenant`).
const files = gitFiles('*.spec.ts', '*.scenario.ts', '*.tenant.ts');

// Each test links to its lines on GitHub at the commit the page was built from.
const REPO_URL = 'https://github.com/willehpeh/market-miam';
const commit = execSync(`git -C ${ROOT} rev-parse HEAD`, { encoding: 'utf8' }).trim();

// Skips the comment or literal starting at `i` — comment, string, template, or
// a regex where an operand may start — and returns the index just past it, or
// -1 if none starts there. `prev` is the last significant character before `i`,
// which is what tells a regex from a division.
function skipLiteral(src, i, prev) {
  const n = src.length, c = src[i];
  if (c === '/' && src[i + 1] === '/') { while (i < n && src[i] !== '\n') i++; return i; }
  if (c === '/' && src[i + 1] === '*') { i += 2; while (i < n && !(src[i] === '*' && src[i + 1] === '/')) i++; return i + 2; }
  if (c === "'" || c === '"') { i++; while (i < n && src[i] !== c) { if (src[i] === '\\') i++; i++; } return i + 1; }
  if (c === '`') {
    i++;
    while (i < n && src[i] !== '`') {
      if (src[i] === '\\') { i += 2; continue; }
      if (src[i] === '$' && src[i + 1] === '{') {
        i += 2;
        let d = 1, p = '{';
        while (i < n && d > 0) {
          const after = skipLiteral(src, i, p);
          if (after >= 0) { i = after; p = ')'; continue; }
          if (src[i] === '{') d++; else if (src[i] === '}') d--;
          if (!/\s/.test(src[i])) p = src[i];
          i++;
        }
        continue;
      }
      i++;
    }
    return i + 1;
  }
  if (c === '/' && (prev === '' || /[(,=:[!&|?{};+\-*%<>~^]/.test(prev))) {
    let k = i + 1, inClass = false;
    while (k < n && src[k] !== '\n') {
      if (src[k] === '\\') { k += 2; continue; }
      if (src[k] === '[') inClass = true;
      else if (src[k] === ']') inClass = false;
      else if (src[k] === '/' && !inClass) { k++; while (k < n && /[a-z]/.test(src[k])) k++; return k; }
      k++;
    }
  }
  return -1;
}
const isComment = (src, i) => src[i] === '/' && (src[i + 1] === '/' || src[i + 1] === '*');

// The index just past the bracket that closes the one at `open`.
function closeOf(src, open) {
  let d = 0, prev = '';
  for (let i = open; i < src.length;) {
    const after = skipLiteral(src, i, prev);
    if (after >= 0) { if (!isComment(src, i)) prev = ')'; i = after; continue; }
    const c = src[i];
    if (c === '(' || c === '[' || c === '{') d++;
    else if (c === ')' || c === ']' || c === '}') { d--; if (d === 0) return i + 1; }
    if (!/\s/.test(c)) prev = c;
    i++;
  }
  return src.length;
}

// Tokenizes just enough TypeScript to find describe/it/test calls, their brace
// depth and where each starts and ends. Depth is what rebuilds the nesting: a
// call's parent chain is every describe still open at a shallower depth. The
// offsets are what the page folds and highlights the code by.
function parseSpecs(src) {
  const calls = [];
  let i = 0, depth = 0, prev = '';
  const n = src.length;
  while (i < n) {
    const after = skipLiteral(src, i, prev);
    if (after >= 0) { if (!isComment(src, i)) prev = ')'; i = after; continue; }
    const c = src[i];
    if (c === '{') { depth++; prev = c; i++; continue; }
    if (c === '}') { depth--; prev = c; i++; continue; }
    if (/[A-Za-z_$]/.test(c)) {
      // The 4000-char window must cover the longest it.each table between the
      // keyword and the test title.
      const m = /^(describe|it|test)((?:\.(?:each|skip|only|todo|concurrent|fails|skipIf|runIf)(?:\([^)]*\))?)*)\s*\(/.exec(src.slice(i, i + 4000));
      if (m && !/[\w$.]/.test(src[i - 1] ?? '')) {
        let j = i + m[0].length;
        while (j < n && /\s/.test(src[j])) j++;
        const q = src[j];
        if (q === "'" || q === '"' || q === '`') {
          let k = j + 1, name = '';
          while (k < n && src[k] !== q) {
            if (src[k] === '\\') { name += src[k + 1]; k += 2; continue; }
            name += src[k]; k++;
          }
          calls.push({
            type: m[1], mods: m[2] || '', name, depth,
            start: i, titleStart: j, titleEnd: k + 1, end: closeOf(src, i + m[0].length - 1),
          });
          prev = q; i = k + 1; continue;
        }
      }
      while (i < n && /[A-Za-z0-9_$.]/.test(src[i])) i++;
      prev = 'a';
      continue;
    }
    if (!/\s/.test(c)) prev = c;
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
    else tests.push({ name: c.name, suite: stack.map(s => s.name), mods: c.mods, start: c.start, end: c.end });
  }
  return tests;
}

// Every file the page can show code from, parsed once: the specs, and the
// contract suites they expand. Its text goes to sources.js, not the page.
const sources = new Map();
function load(absPath) {
  if (!sources.has(absPath)) {
    const text = readFileSync(absPath, 'utf8');
    const calls = parseSpecs(text);
    const lineStarts = [0];
    for (let i = 0; i < text.length; i++) if (text[i] === '\n') lineStarts.push(i + 1);
    const lineAt = offset => {
      let lo = 0, hi = lineStarts.length - 1;
      while (lo < hi) { const mid = (lo + hi + 1) >> 1; if (lineStarts[mid] <= offset) lo = mid; else hi = mid - 1; }
      return lo + 1;
    };
    const tests = testsFromCalls(calls).map(({ start, end, ...t }) => ({
      ...t, start, line: lineAt(start), endLine: lineAt(end - 1),
    }));
    sources.set(absPath, { rel: absPath.slice(ROOT.length + 1), text, calls, tests });
  }
  return sources.get(absPath);
}

// The run of import statements at the top of a file, which the page folds.
function importBlock(text) {
  const first = /^import\b/m.exec(text);
  if (!first) return null;
  let pos = first.index, end = pos;
  while (text.startsWith('import', pos)) {
    const semi = text.indexOf(';', pos);
    if (semi < 0) break;
    const eol = text.indexOf('\n', semi);
    end = eol < 0 ? text.length : eol;
    pos = end;
    while (pos < text.length && /\s/.test(text[pos])) pos++;
  }
  return text.slice(first.index, end).includes('\n') ? [first.index, end] : null;
}

// Shared contract suites: the describe/it blocks live in a *.contract.ts file
// whose exported function is called once per implementation. Each call site
// gets the contract's tests, with template placeholders in titles replaced by
// the implementation name passed at the call. A relative import names the file;
// one through a package alias (`@market-miam/testing`) is found by the name the
// contract file exports.
const contractByName = new Map();
for (const f of gitFiles('*.contract.ts')) {
  for (const m of readFileSync(f, 'utf8').matchAll(/export\s+(?:async\s+)?function\s+(\w+Contract)\b/g)) {
    contractByName.set(m[1], f);
  }
}
function contractTests(specPath, src) {
  const results = [];
  const callRe = /\b(\w+Contract)\s*\(\s*(['"`])((?:\\.|(?!\2).)*)\2/g;
  for (const m of src.matchAll(callRe)) {
    const fnName = m[1], instanceName = m[3];
    const imp = new RegExp(String.raw`import\s*\{[^}]*\b${fnName}\b[^}]*}\s*from\s*['"]([^'"]+)['"]`).exec(src);
    if (!imp) continue;
    const contractFile = imp[1].startsWith('.')
      ? resolve(dirname(specPath), imp[1]) + '.ts'
      : contractByName.get(fnName);
    if (!contractFile || !existsSync(contractFile)) continue;
    const contract = load(contractFile);
    for (const t of contract.tests) {
      results.push({
        ...t,
        name: t.name.replace(/\$\{[^}]+}/g, instanceName),
        suite: t.suite.map(s => s.replace(/\$\{[^}]+}/g, instanceName)),
        contract: true,
        src: contract.rel,
      });
    }
  }
  return results;
}

// Every test is filed three levels deep: the bounded context it protects, the
// kind of test it is, and the app it lives in.
//
// Context comes from the directory a test sits under — `test/src/<dir>`,
// `apps/api/src/app/<dir>`, `packages/<dir>`, or any folder of a frontend's
// `src/app` — never from its name. The bounded contexts are ADRs 0004, 0048 and 0066's; the supporting
// areas are what every context leans on. Tests at an app's root, in a frontend's
// `core`, or spanning contexts are Cross-cutting. A directory in neither list is
// filed there too, with a warning, so a new one is added here rather than
// mapped by accident.
const CONTEXTS = [
  { name: 'Market Days', dirs: ['market-days', 'signed-uploads'] },
  { name: 'Ordering', dirs: ['ordering'] },
];
const SUPPORTING = [
  { name: 'Event Sourcing', dirs: ['event-sourcing', 'persistence', 'lineage'] },
  { name: 'Auth', dirs: ['auth'] },
  { name: 'Common & Shared Kernel', dirs: ['common', 'shared-kernel'] },
  { name: 'Operations', dirs: ['ops'] },
];
const CROSS_CUTTING = 'Cross-cutting';
const AREA_OF_DIR = new Map([...CONTEXTS, ...SUPPORTING].flatMap(a => a.dirs.map(d => [d, a.name])));

// A frontend folder that names no context belongs to the context the app
// serves; its `core` holds the app's shell. A screen for another context goes
// in a folder named after it (`src/app/ordering/`), as the api's do.
const FRONTEND_AREA = {
  'vendor-frontend': 'Market Days',
  'customer-frontend': 'Market Days',
  'admin-frontend': 'Operations',
};

const unmapped = new Set();
function contextFor(relPath) {
  const front = /^apps\/([^/]+-frontend)\/src\/app\/(.*)$/.exec(relPath);
  if (front) {
    const dirs = front[2].split('/').slice(0, -1);
    const named = dirs.map(d => AREA_OF_DIR.get(d)).find(Boolean);
    if (named) return named;
    if (dirs.length === 0 || dirs[0] === 'core') return CROSS_CUTTING;
    return FRONTEND_AREA[front[1]] ?? CROSS_CUTTING;
  }
  const back = /^(test\/src|apps\/api\/src\/app|packages)\/(.*)$/.exec(relPath);
  const dirs = back ? back[2].split('/').slice(0, -1) : [];
  if (dirs.length === 0) return CROSS_CUTTING;
  const area = AREA_OF_DIR.get(dirs[0]);
  if (!area) unmapped.add(`${back[1]}/${dirs[0]}`);
  return area ?? CROSS_CUTTING;
}

// Kind comes from what a test drives, read from its imports: the api's specs
// also count what their `testing/` helpers import, since that is where
// supertest and the local fake servers live (ADR 0064). Production modules
// aren't followed: importing one that holds a Pool isn't connecting to
// Postgres. The line between Unit and Integration is real I/O, not wiring: a
// spec that boots Nest or Angular's DI over in-memory adapters and faked
// backends is still a unit test.
//   E2E          the production app on real Postgres, a whole lifecycle (*.scenario.ts)
//   API          the api booted in memory, called over HTTP
//   Integration  across real I/O: Postgres in Docker (*.container.spec.ts), a local
//                server (*.integration.spec.ts, the fake Auth0), the Auth0 test tenant
//                (*.tenant.ts)
//   Component    a frontend component rendered and driven through its page object
//   Unit         in-process against fakes or in-memory adapters; in the packages
//                suite these are sociable, driven through use cases (test/README.md)
const KINDS = ['Unit', 'Component', 'Integration', 'API', 'E2E'];
const importsOf = src => [...src.matchAll(/^import\s+(?!type\b)[^;]*?from\s+['"]([^'"]+)['"]/gm)].map(m => m[1]);
const helperCache = new Map();
function reachedImports(absPath, src) {
  const reached = importsOf(src);
  for (const spec of reached.filter(s => s.startsWith('.'))) {
    const helper = resolve(dirname(absPath), spec) + '.ts';
    if (!helper.includes('/testing/')) continue;
    if (!helperCache.has(helper)) {
      helperCache.set(helper, existsSync(helper) ? importsOf(readFileSync(helper, 'utf8')) : []);
    }
    reached.push(...helperCache.get(helper));
  }
  return reached;
}
function kindFor(relPath, absPath, src) {
  if (/\.scenario\.ts$/.test(relPath)) return 'E2E';
  if (/\.(tenant|container\.spec|integration\.spec)\.ts$/.test(relPath)) return 'Integration';
  if (relPath.startsWith('apps/api/')) {
    const reached = reachedImports(absPath, src);
    if (reached.includes('supertest')) return 'API';
    if (reached.some(i => ['node:http', 'node:net', 'pg'].includes(i))) return 'Integration';
    return 'Unit';
  }
  if (/^apps\/[^/]+-frontend\//.test(relPath)) {
    return /\brender\s*\(|\.createComponent\s*\(/.test(src) ? 'Component' : 'Unit';
  }
  return 'Unit';
}

function layerFor(relPath) {
  const m = /^apps\/([^/]+)\//.exec(relPath);
  if (m) return m[1];
  if (relPath.startsWith('test/')) return 'test (packages suite)';
  const p = /^packages\/([^/]+)\//.exec(relPath);
  if (p) return `packages/${p[1]}`;
  return 'other';
}

// What a spec exercises, read from its imports by the repo's own naming. A
// reading aid, not a proof: a name the conventions miss lands nowhere.
//   stand-ins  InMemory*, Fake*, Recording*, Handling*, Static*, the fixed clock
//              — unless the spec is named after it, as an adapter's own spec is
//   through    the page or api object it drives (ADRs 0062, 0064), or supertest
//   real       code under test it constructs, renders, provides or calls
// Test data (Test*, test*) and framework imports are none of these.
const STAND_IN = /^(?:InMemory|Fake|Recording|Handling|Static|Stub|Spy)[A-Z]|^(?:fake|fixed|stub)[A-Z]/;
const TEST_DATA = /^(?:Test|test)[A-Z]/;
function importedNames(src) {
  const names = [];
  for (const m of src.matchAll(/^import\s+(?!type\b)([\s\S]*?)\s+from\s+['"]([^'"]+)['"]/gm)) {
    const [, clause, from] = m;
    const braced = /\{([^}]*)\}/.exec(clause);
    const bare = clause.replace(/\{[^}]*\}/, '').replace(/,/g, ' ').trim();
    for (const part of braced ? braced[1].split(',') : []) {
      const name = part.trim().replace(/^type\s+/, '').split(/\s+as\s+/).pop().trim();
      if (name && !/^type\s/.test(part.trim())) names.push({ name, from });
    }
    if (bare && !bare.startsWith('*')) names.push({ name: bare, from });
  }
  return names;
}
const kebab = name => name.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase();
function rolesOf(absPath, src) {
  const roles = { real: [], through: [], standIns: [] };
  const subject = absPath.split('/').pop().split('.')[0];
  for (const { name, from } of importedNames(src)) {
    if (from === 'supertest') { roles.through.push('supertest'); continue; }
    if (STAND_IN.test(name)) { (kebab(name) === subject ? roles.real : roles.standIns).push(name); continue; }
    if (TEST_DATA.test(name) || !/^[A-Za-z][a-z]/.test(name)) continue;
    const local = from.startsWith('.') ? resolve(dirname(absPath), from) : null;
    const helper = local && local.includes('/testing/') ? local + '.ts' : null;
    if (/\.page-object$/.test(from) || (helper && existsSync(helper) &&
        importsOf(readFileSync(helper, 'utf8')).includes('supertest'))) {
      roles.through.push(name);
      continue;
    }
    const underTest = local
      ? !local.startsWith(resolve(ROOT, 'test') + '/') && !/\/testing\/|\/fake[.-]|test-data/.test(local)
      : from.startsWith('@market-miam/') && from !== '@market-miam/testing';
    if (!underTest) continue;
    // A class counts once the spec makes or mounts one, not when it only
    // names it as a type; a function, once the spec calls it.
    const n = name.replace(/\$/g, '\\$');
    const used = /^[A-Z]/.test(name)
      ? String.raw`new\s+${n}\b|\b${n}\.\w+\(|\b(?:render|createComponent)\(\s*${n}\b|useClass:\s*${n}\b|provideEffects\([^)]*\b${n}\b`
      : String.raw`(?<![\w.])${n}\s*\(`;
    if (new RegExp(used).test(src)) roles.real.push(name);
  }
  return roles;
}

const data = [];
let totalTests = 0;
for (const f of files) {
  const { rel, text, tests: own } = load(f);
  const tests = [...own, ...contractTests(f, text)];
  totalTests += tests.length;
  data.push({
    file: rel, context: contextFor(rel), kind: kindFor(rel, f, text), layer: layerFor(rel),
    lines: text.split('\n').length, roles: rolesOf(f, text), tests,
  });
}

// The code the page shows sits in sources.js, loaded once the map has drawn,
// so the map stays as quick to open as it was. A script rather than a fetch,
// so the page still works opened straight from disk.
const sourceFiles = {};
for (const { rel, text, calls } of sources.values()) {
  sourceFiles[rel] = {
    text,
    imports: importBlock(text),
    // [describe?, start, titleStart, titleEnd, end] for every describe/it/test
    spans: calls.map(c => [c.type === 'describe' ? 1 : 0, c.start, c.titleStart, c.titleEnd, c.end]),
  };
}

const model = {
  contexts: [
    ...CONTEXTS.map(c => ({ name: c.name, supporting: false })),
    ...SUPPORTING.map(c => ({ name: c.name, supporting: true })),
    { name: CROSS_CUTTING, supporting: true },
  ],
  kinds: KINDS,
  files: data,
  repo: REPO_URL,
  commit,
};
const generated = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
const html = readFileSync(resolve(HERE, 'template.html'), 'utf8')
  .replace('__DATA__', () => JSON.stringify(model))
  .replace('__SOURCES_VERSION__', commit.slice(0, 12))
  .replace('__GENERATED__', generated);

const OUT = resolve(ROOT, 'tmp/test-map');
mkdirSync(OUT, { recursive: true });
writeFileSync(resolve(OUT, 'index.html'), html);
writeFileSync(resolve(OUT, 'sources.js'), `window.TEST_SOURCES = ${JSON.stringify(sourceFiles)};\n`);

const empty = data.filter(f => f.tests.length === 0);
console.log(`${data.length} test files, ${totalTests} tests → tmp/test-map/index.html`);
if (empty.length) {
  console.warn(`WARNING — parsed no tests from (parser gap or dead spec):`);
  for (const f of empty) console.warn(`  ${f.file}`);
}
if (unmapped.size) {
  console.warn(`WARNING — no context for these directories, filed under ${CROSS_CUTTING} (add them to CONTEXTS or SUPPORTING):`);
  for (const d of unmapped) console.warn(`  ${d}`);
}
