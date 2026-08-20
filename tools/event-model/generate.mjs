#!/usr/bin/env node
// Builds the event-model webpage: an event model (in Martin Dilger's sense —
// vertical slices of commands, events, read models and automations on a
// timeline) derived from the system's own tests and declared seams, never
// hand-maintained. Sources of truth, in order:
//
//   test/src/market-days/<slice>/          one directory per slice; the specs give
//                                          each slice its title, Given/When/Then
//                                          lines, asserted events with example
//                                          payloads, rejected errors, stream ids
//   packages/market-days/src/*/events/     which aggregate each event belongs to
//   packages/market-days/src/*.projection  which events feed each read model
//   packages/market-days/src (processors)  eventTypes() consumed / commands dispatched
//   packages/market-days/src find-*.handler which read models each query reads
//   apps/api .../market-days/*.controller  which actor issues each command/query
//
// Output: tmp/event-model/index.html — self-contained, bare Node, no npm ci —
// same contract as tools/test-map. The spec tokenizer is a copy of test-map's
// (each tool stays self-contained so its Render build filter covers it).
import { readFileSync, writeFileSync, mkdirSync, readdirSync, statSync } from 'node:fs';
import { dirname, resolve, join, basename } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, '../..');
const SLICES_DIR = resolve(ROOT, 'test/src/market-days');
const DOMAIN_DIR = resolve(ROOT, 'packages/market-days/src');
const CONTROLLERS_DIR = resolve(ROOT, 'apps/api/src/app/market-days');

const warnings = [];
const warn = (msg) => { warnings.push(msg); console.warn(`WARNING — ${msg}`); };

/* ---------- spec tokenizer (copied from tools/test-map/generate.mjs, plus
   source offsets so each test's body can be inspected) ---------- */
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
      const m = /^(describe|it|test)((?:\.(?:each|skip|only|todo|concurrent|fails|skipIf|runIf)(?:\([^)]*\))*)*)\s*\(/.exec(src.slice(i, i + 4000));
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
          calls.push({ type: m[1], mods: m[2] || '', name, depth, start: i });
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

// The source of one test = from its call to the next describe/it call (or EOF).
// Close enough to classify a spec line as a rejection by what it asserts.
function testsWithBodies(src) {
  const calls = parseSpecs(src);
  const tests = [];
  const stack = [];
  for (let k = 0; k < calls.length; k++) {
    const c = calls[k];
    while (stack.length && stack[stack.length - 1].depth >= c.depth) stack.pop();
    if (c.type === 'describe') { stack.push({ name: c.name, depth: c.depth }); continue; }
    const end = k + 1 < calls.length ? calls[k + 1].start : src.length;
    tests.push({ name: c.name, mods: c.mods, body: src.slice(c.start, end) });
  }
  return { tests, describeTitle: calls.find(c => c.type === 'describe')?.name ?? null };
}

/* ---------- small text utilities ---------- */
const pascal = (kebab) => kebab.split('-').map(w => w[0].toUpperCase() + w.slice(1)).join('');
const words = (name) => name.split(/(?=[A-Z])/).map(w => w.toLowerCase()).filter(Boolean);
const FILLER = new Set(['as', 'to', 'a', 'an', 'the']);

// Loose stemming, just enough to pair a command with its past-tense event:
// Publish/Published, Cancel/Cancelled, Revise/Revised, Set/Set, Add/Added.
function stems(w) {
  const out = new Set([w]);
  if (w.endsWith('e')) out.add(w.slice(0, -1));
  if (w.endsWith('ed')) {
    const bare = w.slice(0, -2);
    out.add(bare);
    if (bare.length > 3 && bare[bare.length - 1] === bare[bare.length - 2]) out.add(bare.slice(0, -1));
  }
  return out;
}
const wordsMatch = (a, b) => [...stems(a)].some(s => stems(b).has(s));

// A command and its event share the same significant words, reordered and
// re-tensed (ADR 0009: one event per command keeps this 1:1).
function commandEmits(command, eventTypes) {
  const cw = words(command).filter(w => !FILLER.has(w));
  const hits = eventTypes.filter(ev => {
    const ew = words(ev).filter(w => !FILLER.has(w));
    if (ew.length !== cw.length) return false;
    const left = [...ew];
    for (const w of cw) {
      const i = left.findIndex(x => wordsMatch(w, x));
      if (i < 0) return false;
      left.splice(i, 1);
    }
    return true;
  });
  return hits;
}

// The {...} object literal starting at src[open] (assumed '{'), braces balanced.
function balancedBraces(src, open) {
  let d = 0;
  for (let i = open; i < src.length; i++) {
    if (src[i] === '{') d++;
    else if (src[i] === '}') { d--; if (d === 0) return src.slice(open, i + 1); }
  }
  return null;
}

function* walk(dir) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) yield* walk(p);
    else yield p;
  }
}
const read = (p) => readFileSync(p, 'utf8');
const rel = (p) => p.slice(ROOT.length + 1);

/* ---------- declared seams in the domain package ---------- */
// Event -> aggregate (the stream lane it lives on), from where the event type
// is declared: packages/market-days/src/<aggregate>/events/*.ts
const eventAggregate = {};
for (const f of walk(DOMAIN_DIR)) {
  const m = /\/src\/([^/]+)\/events\/[^/]+\.ts$/.exec(f);
  if (!m) continue;
  const src = read(f);
  for (const d of src.matchAll(/DomainEvent<\s*'(\w+)'/g)) eventAggregate[d[1]] = m[1];
}
const EVENT_TYPES = Object.keys(eventAggregate);

// Read models: each *.projection.ts declares the events it consumes as its
// handler-map keys.
const projections = {};   // slice dir name -> { consumes, file }
for (const f of walk(DOMAIN_DIR)) {
  if (!f.endsWith('.projection.ts')) continue;
  const src = read(f);
  const body = /handlers\(\)[^{]*\{([\s\S]*?)\n  \}/.exec(src);
  const consumes = body ? [...body[1].matchAll(/^\s*(\w+):/gm)].map(m => m[1]).filter(e => eventAggregate[e]) : [];
  if (!consumes.length) { warn(`no handler-map events found in ${rel(f)}`); continue; }
  projections[basename(dirname(f))] = { consumes, file: rel(f) };
}

// Automations: each @CheckpointedProcessor declares eventTypes() and
// dispatches commands through the gateway.
const processors = {};    // slice dir name -> { consumes, dispatches, file }
for (const f of walk(DOMAIN_DIR)) {
  if (!f.endsWith('.ts') || f.endsWith('.spec.ts')) continue;
  const src = read(f);
  if (!src.includes('@CheckpointedProcessor')) continue;
  const types = /eventTypes\(\)[\s\S]{0,200}?return\s*\[([^\]]*)\]/.exec(src);
  const consumes = types ? [...types[1].matchAll(/'(\w+)'/g)].map(m => m[1]) : [];
  const dispatches = [...src.matchAll(/\.execute\(\s*new (\w+)\(/g)].map(m => m[1]);
  processors[basename(dirname(f))] = { consumes, dispatches, file: rel(f) };
}

// Queries: find-*.handler.ts names the query and the read-model interfaces it
// reads (ADR 0016); FooBarViews lives in the foo-bar-view slice.
const viewSliceOfInterface = (iface) =>
  iface.replace(/Views$/, 'View').replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase();
const queries = [];       // { query, reads: [view slice dirs], file }
for (const f of walk(DOMAIN_DIR)) {
  if (!/\/find-[^/]+\.handler\.ts$/.test(f)) continue;
  const src = read(f);
  const cls = /class (Find\w+)Handler/.exec(src);
  if (!cls) continue;
  const reads = [...new Set([...src.matchAll(/:\s*(\w+)Views\b/g)].map(m => viewSliceOfInterface(m[1] + 'Views')))];
  queries.push({ query: cls[1], reads, file: rel(f) });
}

/* ---------- actors, from the API controllers ---------- */
// public-* controllers serve the customer storefront; the rest sit behind the
// vendor app's auth guard.
const actorOf = {};       // command/query class -> 'vendor' | 'customer'
for (const f of walk(CONTROLLERS_DIR)) {
  if (!f.endsWith('.controller.ts')) continue;
  const actor = basename(f).startsWith('public-') ? 'customer' : 'vendor';
  for (const m of read(f).matchAll(/new ([A-Z]\w+)\(/g)) actorOf[m[1]] ??= actor;
}
for (const p of Object.values(processors)) for (const c of p.dispatches) actorOf[c] = 'automation';

/* ---------- the test harness: which helper drives which command ---------- */
const helperCommand = {}; // helper name -> command class
{
  const harness = read(join(SLICES_DIR, 'market-day-harness.ts'));
  for (const m of harness.matchAll(/(\w+):\s*\([^)]*\)[^=]*=>\s*\r?\n?\s*\w+\.execute\((?:new (\w+)\(|Test(\w+)\.)/g)) {
    helperCommand[m[1]] = m[2] || m[3];
  }
}

/* ---------- slices, from the packages suite ---------- */
const slices = [];
const skipped = [];
for (const dir of readdirSync(SLICES_DIR).sort()) {
  const path = join(SLICES_DIR, dir);
  if (!statSync(path).isDirectory()) continue;
  const specFiles = readdirSync(path).filter(f => f.endsWith('.spec.ts') && !f.includes('contract'));
  if (!specFiles.length) { skipped.push(`${dir} (contract/infrastructure specs only)`); continue; }
  const src = specFiles.map(f => read(join(path, f))).join('\n');
  const { tests, describeTitle } = testsWithBodies(src);
  const specs = tests.map(t => ({
    name: t.name,
    mods: t.mods,
    kind: /rejects\.|toThrow\(|toBeInstanceOf\(\s*[A-Z]/.test(t.body) ? 'rejection' : 'happy',
  }));
  const mentioned = [...new Set(EVENT_TYPES.filter(e => src.includes(`'${e}'`) || src.includes(`type: '${e}'`) || new RegExp(`\\b${e}\\b`).test(src)))];
  const errors = [...new Set(
    [...src.matchAll(/(?:toThrow|toBeInstanceOf)\(\s*([A-Z]\w+)/g)].map(m => m[1]).filter(e => e !== 'Error'),
  )];
  const base = {
    id: dir,
    title: describeTitle ?? pascal(dir),
    files: specFiles.map(f => rel(join(path, f))),
    specs,
    errors,
  };

  if (processors[dir]) {
    const p = processors[dir];
    slices.push({ ...base, kind: 'automation', consumes: p.consumes, dispatches: p.dispatches, sources: [p.file] });
    continue;
  }
  if (projections[dir]) {
    const readBy = queries.filter(q => q.reads.includes(dir))
      .map(q => ({ query: q.query, actor: actorOf[q.query] ?? 'vendor' }));
    // A view directory's specs cover several queries, each with its own describe;
    // the slice is named after the read model itself.
    const title = dir.split('-').map(w => w[0].toUpperCase() + w.slice(1)).join(' ');
    slices.push({ ...base, title, kind: 'view', consumes: projections[dir].consumes, readBy, sources: [projections[dir].file] });
    continue;
  }
  if (/store\.newEvents\(\)/.test(src)) {
    const command = pascal(dir);
    const emits = commandEmits(command, EVENT_TYPES);
    if (emits.length !== 1) warn(`command ${command}: expected exactly one matching event, got [${emits}]`);
    const own = emits[0] ?? null;
    // Example payload: the first asserted payload of the slice's own event.
    let payload = null, stream = null;
    if (own) {
      const at = src.indexOf(`type: '${own}'`);
      if (at >= 0) {
        const after = src.slice(at, at + 2000);
        const pm = /payload:\s*(?:expect\.objectContaining\()?\s*\{/.exec(after);
        if (pm) payload = balancedBraces(after, pm.index + pm[0].length - 1);
      }
    }
    const sm = /streamId[\s\S]{0,200}?[`'"]([\w-]+\/[^`'"]+)[`'"]/.exec(src);
    if (sm) stream = sm[1].replace(/\$\{[^}]+\}/g, '<' + '…>');
    const given = mentioned.filter(e => e !== own);
    const helpers = Object.keys(helperCommand).filter(h => new RegExp(`(?<![.\\w])${h}\\(`).test(src));
    const givenCommands = [...new Set([
      ...helpers.map(h => helperCommand[h]),
      ...[...src.matchAll(/\bnew (\w+)Handler\(/g)].map(m => m[1]),
      ...[...src.matchAll(/\bTest([A-Z]\w+)\.(?:valid|with)\b/g)].map(m => m[1]),
      ...(src.includes('marketDayHarness(') || src.includes('seedCatalogue(') ? ['AddItemToCatalogue'] : []),
    ])].filter(c => c !== command);
    slices.push({ ...base, kind: 'command', command, actor: actorOf[command] ?? null, emits: own ? [own] : [], given, givenCommands, payload, stream });
    if (!actorOf[command]) warn(`command ${command}: no actor found in controllers or processors`);
  } else {
    skipped.push(`${dir} (unclassified — not a command, view or automation spec)`);
  }
}

/* ---------- ordering: a topological pass over what each slice presupposes ---------- */
const producerOf = {};    // event type -> command slice id
for (const s of slices) if (s.kind === 'command') for (const e of s.emits) producerOf[e] = s.id;
const commandSlice = {};  // command class -> slice id
for (const s of slices) if (s.kind === 'command') commandSlice[s.command] = s.id;

for (const s of slices) {
  const deps = new Set();
  if (s.kind === 'command') {
    for (const e of s.given) if (producerOf[e]) deps.add(producerOf[e]);
    for (const c of s.givenCommands) if (commandSlice[c]) deps.add(commandSlice[c]);
  } else {
    for (const e of s.consumes) if (producerOf[e]) deps.add(producerOf[e]);
  }
  if (s.kind === 'automation') {
    // the automation precedes the commands it dispatches
    for (const c of s.dispatches) if (commandSlice[c]) deps.delete(commandSlice[c]);
  }
  deps.delete(s.id);
  s.deps = [...deps];
}
// An automation's dispatched command follows it.
for (const s of slices) if (s.kind === 'automation') {
  for (const c of s.dispatches) {
    const t = slices.find(x => x.id === commandSlice[c]);
    if (t && !t.deps.includes(s.id)) t.deps.push(s.id);
  }
}

// Each slice belongs to the chapter (aggregate) its events live on; an
// automation to the chapter of the command it dispatches, so it sits right
// before it on the timeline.
const byId = new Map(slices.map(s => [s.id, s]));
for (const s of slices) {
  const evs = s.kind === 'command' ? s.emits
    : s.kind === 'view' ? s.consumes
    : s.dispatches.map(c => byId.get(commandSlice[c])?.emits?.[0]).filter(Boolean);
  const tally = {};
  for (const e of evs) tally[eventAggregate[e]] = (tally[eventAggregate[e]] ?? 0) + 1;
  s.chapter = Object.entries(tally).sort((a, b) => b[1] - a[1])[0]?.[0] ?? 'other';
}

// Timeline order: a topological pass over chapters (a chapter waits for every
// chapter its slices presuppose), then over the slices within each chapter.
function topo(ids, depsOf, tiebreak) {
  const order = [];
  const pending = new Set(ids);
  while (pending.size) {
    const ready = [...pending].filter(id => depsOf(id).every(d => d === id || !pending.has(d))).sort(tiebreak);
    if (!ready.length) { warn(`dependency cycle among: ${[...pending]}`); ready.push([...pending][0]); }
    order.push(ready[0]);
    pending.delete(ready[0]);
  }
  return order;
}
const chapters = [...new Set(slices.map(s => s.chapter))];
const chapterDeps = (c) => [...new Set(
  slices.filter(s => s.chapter === c).flatMap(s => s.deps.map(d => byId.get(d).chapter)).filter(x => x !== c),
)];
const chapterOrder = topo(chapters, chapterDeps,
  (a, b) => (slices.filter(s => s.chapter === a).length - slices.filter(s => s.chapter === b).length) || a.localeCompare(b));
const sliceOrder = chapterOrder.flatMap(c => topo(
  slices.filter(s => s.chapter === c).map(s => s.id),
  (id) => byId.get(id).deps,
  (a, b) => {
    const sa = byId.get(a), sb = byId.get(b);
    const k = (s) => (s.kind === 'view' ? 1 : 0);      // views after the writes they read
    return (k(sa) - k(sb)) || (sa.deps.length - sb.deps.length) || a.localeCompare(b);
  },
));
slices.sort((a, b) => sliceOrder.indexOf(a.id) - sliceOrder.indexOf(b.id));

// Aggregate lanes, ordered by first appearance on the timeline.
const lanes = [];
for (const s of slices) for (const e of [...(s.emits ?? []), ...(s.consumes ?? [])]) {
  const a = eventAggregate[e];
  if (a && !lanes.includes(a)) lanes.push(a);
}

const counts = {
  slices: slices.length,
  commands: slices.filter(s => s.kind === 'command').length,
  events: EVENT_TYPES.filter(e => slices.some(s => (s.emits ?? []).includes(e))).length,
  views: slices.filter(s => s.kind === 'view').length,
  automations: slices.filter(s => s.kind === 'automation').length,
  specs: slices.reduce((n, s) => n + s.specs.length, 0),
};
const orphans = EVENT_TYPES.filter(e => !slices.some(s => (s.emits ?? []).includes(e)));
if (orphans.length) warn(`events with no producing slice on the model: ${orphans}`);

const data = { slices, lanes, eventAggregate, counts, skipped };
const generated = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
const html = read(resolve(HERE, 'template.html'))
  .replace('__DATA__', () => JSON.stringify(data))
  .replace('__GENERATED__', generated);

const OUT = resolve(ROOT, 'tmp/event-model');
mkdirSync(OUT, { recursive: true });
writeFileSync(resolve(OUT, 'index.html'), html);
console.log(`${counts.slices} slices (${counts.commands} commands, ${counts.views} read models, ` +
  `${counts.automations} automations), ${counts.events} events, ${counts.specs} specs → tmp/event-model/index.html`);
if (skipped.length) console.log(`off the model: ${skipped.join('; ')}`);
