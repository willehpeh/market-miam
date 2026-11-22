#!/usr/bin/env node
// Builds the event-model webpage: an event model (in Martin Dilger's sense —
// vertical slices of commands, events, read models and automations on a
// timeline) derived from the system's own tests and declared seams, never
// hand-maintained. Each bounded context (CONTEXTS below) is read from the same
// places, <context> standing for its directory name. Sources of truth, in order:
//
//   test/src/<context>/<slice>/            one directory per slice; the specs give
//                                          each slice its title, Given/When/Then
//                                          lines, the event the command emits (the
//                                          type asserted on store.newEvents()),
//                                          example payloads, rejected errors,
//                                          stream ids. A directory with only
//                                          find-*.spec.ts is a read model computed
//                                          at query time from the views it reads
//   packages/<context>/src/*/events/       which aggregate each event belongs to
//   packages/<context>/src/*.projection    which events feed each read model
//   packages/<context>/src (processors)    eventTypes() consumed / commands dispatched
//   packages/<context>/src find-*.handler  which read models each query reads
//   apps/api/src/app (controllers, ops/)   which actor issues each command/query
//
// Output: tmp/event-model/index.html — self-contained, bare Node, no npm ci —
// same contract as tools/test-map. The spec tokenizer is a copy of test-map's
// (each tool stays self-contained so its Render build filter covers it).
//
// The board's timeline is the vendor's lifecycle, in the order kept by hand in
// story.mjs; everything on it is still derived. A slice missing from the story
// is shown under Unsorted, with a warning, and the story is checked against
// what each slice presupposes (docs/EVENT-MODEL-PLAN.md). Within a context,
// slices are also sorted topologically by aggregate, the order dependencies are
// checked against.
import { readFileSync, writeFileSync, mkdirSync, readdirSync, statSync } from 'node:fs';
import { dirname, resolve, join, basename } from 'node:path';
import { fileURLToPath } from 'node:url';
import { STORY } from './story.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, '../..');
// The bounded contexts (ADRs 0004, 0048, 0066), each with its story order.
const CONTEXTS = [
  { id: 'market-days', name: 'Market Days', story: ['vendor', 'storefront', 'catalogue', 'calendar', 'market-day'] },
  { id: 'ordering', name: 'Ordering', story: ['merchant', 'payment-account-notices', 'order'] },
].map(c => ({ ...c, slicesDir: resolve(ROOT, 'test/src', c.id), domainDir: resolve(ROOT, 'packages', c.id, 'src') }));
const API_DIR = resolve(ROOT, 'apps/api/src/app');

const warnings = [];
const warn = (msg) => { warnings.push(msg); console.warn(`WARNING — ${msg}`); };

/* ---------- spec tokenizer (copied from tools/test-map/generate.mjs, keeping
   only each call's start offset, which is how each test's body is cut out) ---------- */
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

// The index just past the bracket group opening at src[open], strings and
// comments skipped; -1 if it never closes.
function closeBracket(src, open) {
  let d = 0, prev = '(';
  for (let i = open; i < src.length;) {
    const after = skipLiteral(src, i, prev);
    if (after >= 0) { i = after; prev = ')'; continue; }
    const c = src[i];
    if ('([{'.includes(c)) d++;
    else if (')]}'.includes(c) && --d === 0) return i + 1;
    if (!/\s/.test(c)) prev = c;
    i++;
  }
  return -1;
}

// A describe/it/test call starting at src[i]: its keyword, its modifiers and
// the index just past the parenthesis its title follows. A table given to
// .each — an array of any depth or a template — and a condition given to
// .skipIf or .runIf are stepped over whole.
function callHead(src, i) {
  const k = /^(describe|it|test)\b/.exec(src.slice(i, i + 9));
  if (!k) return null;
  let j = i + k[1].length, mods = '';
  while (src[j] === '.') {
    const m = /^\.(each|skip|only|todo|concurrent|fails|skipIf|runIf)\b/.exec(src.slice(j, j + 12));
    if (!m) return null;
    mods += m[0]; j += m[0].length;
    if (!['each', 'skipIf', 'runIf'].includes(m[1])) continue;
    while (/\s/.test(src[j] ?? '')) j++;
    if (src[j] === '`') j = skipLiteral(src, j, '(');
    else if (src[j] === '(') j = closeBracket(src, j);
    if (j < 0) return null;
  }
  while (/\s/.test(src[j] ?? '')) j++;
  return src[j] === '(' ? { type: k[1], mods, end: j + 1 } : null;
}

// Finds describe/it/test calls, their brace depth and where each starts.
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
      const m = !/[\w$.]/.test(src[i - 1] ?? '') && callHead(src, i);
      if (m) {
        let j = m.end;
        while (j < n && /\s/.test(src[j])) j++;
        const q = src[j];
        if (q === "'" || q === '"' || q === '`') {
          let k = j + 1, name = '';
          while (k < n && src[k] !== q) {
            if (src[k] === '\\') { name += src[k + 1]; k += 2; continue; }
            name += src[k]; k++;
          }
          calls.push({ type: m.type, mods: m.mods, name, depth, start: i });
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

// The source of one test = from its call to the next describe/it call (or EOF).
// Close enough to classify a spec line as a rejection by what it asserts.
// Everything outside the tests — imports, beforeEach, shared helpers — is the
// setup every test shares.
function testsWithBodies(src) {
  const calls = parseSpecs(src);
  const tests = [];
  const stack = [];
  for (let k = 0; k < calls.length; k++) {
    const c = calls[k];
    while (stack.length && stack[stack.length - 1].depth >= c.depth) stack.pop();
    if (c.type === 'describe') { stack.push({ name: c.name, depth: c.depth }); continue; }
    const end = k + 1 < calls.length ? calls[k + 1].start : src.length;
    tests.push({ name: c.name, mods: c.mods, start: c.start, body: src.slice(c.start, end) });
  }
  let setup = '', at = 0;
  for (const t of tests) { setup += src.slice(at, t.start); at = t.start + t.body.length; }
  setup += src.slice(at);
  return { tests, setup, describeTitle: calls.find(c => c.type === 'describe')?.name ?? null };
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

/* ---------- declared seams in each context's domain package ---------- */
// Event -> aggregate (the stream lane it lives on), from where the event type
// is declared: packages/<context>/src/<aggregate>/events/*.ts
const eventAggregate = {};
const eventContext = {};
for (const ctx of CONTEXTS) for (const f of walk(ctx.domainDir)) {
  const m = /\/src\/([^/]+)\/events\/[^/]+\.ts$/.exec(f);
  if (!m) continue;
  const src = read(f);
  for (const d of src.matchAll(/DomainEvent<\s*'(\w+)'/g)) { eventAggregate[d[1]] = m[1]; eventContext[d[1]] = ctx.id; }
}
const EVENT_TYPES = Object.keys(eventAggregate);

// Read models: each *.projection.ts declares the events it consumes as its
// handler-map keys.
const projections = {};   // slice dir name -> { consumes, file }
for (const ctx of CONTEXTS) for (const f of walk(ctx.domainDir)) {
  if (!f.endsWith('.projection.ts')) continue;
  const src = read(f);
  const body = /handlers\(\)[^{]*\{([\s\S]*?)\n {2}\}/.exec(src);
  const consumes = body ? [...body[1].matchAll(/^\s*(\w+):/gm)].map(m => m[1]).filter(e => eventAggregate[e]) : [];
  if (!consumes.length) { warn(`no handler-map events found in ${rel(f)}`); continue; }
  projections[basename(dirname(f))] = { consumes, file: rel(f) };
}

// Automations: each @CheckpointedProcessor declares eventTypes() and
// dispatches commands through the gateway.
const processors = {};    // slice dir name -> { consumes, dispatches, file }
for (const ctx of CONTEXTS) for (const f of walk(ctx.domainDir)) {
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
for (const ctx of CONTEXTS) for (const f of walk(ctx.domainDir)) {
  if (!/\/find-[^/]+\.handler\.ts$/.test(f)) continue;
  const src = read(f);
  const cls = /class (Find\w+)Handler/.exec(src);
  if (!cls) continue;
  const reads = [...new Set([...src.matchAll(/:\s*(\w+)Views\b/g)].map(m => viewSliceOfInterface(m[1] + 'Views')))];
  queries.push({ query: cls[1], reads, file: rel(f), dir: basename(dirname(f)) });
}

/* ---------- actors, from where the api builds each command and query ---------- */
// The operator console's routes and services (ops/, ADR 0059), Stripe's
// webhooks, the customer storefront (public-* controllers), and otherwise the
// vendor app behind its auth guard. A command more than one of them issues
// keeps all of them.
function actorOfFile(f) {
  if (/\/ops\//.test(f)) return 'operator';
  if (/\/stripe\/|webhook/.test(f)) return 'stripe';
  if (basename(f).startsWith('public-')) return 'customer';
  return 'vendor';
}
const actorsOf = {};      // command/query class -> Set of actors
for (const f of walk(API_DIR)) {
  if (!f.endsWith('.ts') || /\.(spec|scenario|tenant)\.ts$/.test(f) || f.includes('/testing/')) continue;
  if (!f.endsWith('.controller.ts') && !/\/ops\//.test(f)) continue;
  for (const m of read(f).matchAll(/new ([A-Z]\w+)\(/g)) (actorsOf[m[1]] ??= new Set()).add(actorOfFile(f));
}
for (const p of Object.values(processors)) for (const c of p.dispatches) (actorsOf[c] ??= new Set()).add('automation');
const actorList = (cls) => actorsOf[cls] ? [...actorsOf[cls]].sort() : [];

/* ---------- the test harnesses: which helper drives which command ---------- */
// Any *-harness.ts at a suite's root, e.g. test/src/market-days/market-day-harness.ts.
const helperCommand = {}; // helper name -> command class
for (const ctx of CONTEXTS) for (const f of readdirSync(ctx.slicesDir)) {
  if (!f.endsWith('-harness.ts')) continue;
  for (const m of read(join(ctx.slicesDir, f)).matchAll(/(\w+):\s*\([^)]*\)[^=]*=>\s*\r?\n?\s*\w+\.execute\((?:new (\w+)\(|Test(\w+)\.)/g)) {
    helperCommand[m[1]] = m[2] || m[3];
  }
}

/* ---------- the event builders: which helper seeds which event ---------- */
// Any exported const at a suite's root whose body names an event type, e.g.
// `export const menuSet = (...): MarketDayMenuSet => ({ type: 'MarketDayMenuSet', ... })`,
// and the stream-id helpers beside them, e.g.
// `export const merchantStream = (vendorId = …): string => `ordering-merchant-${vendorId}``.
const helperEvent = {};   // context -> builder name -> event type
const helperEventSrc = {};// context -> event type -> the builder's source, from its type on
const helperStream = {};  // context -> helper name -> stream id template
for (const ctx of CONTEXTS) {
  helperEvent[ctx.id] = {};
  helperEventSrc[ctx.id] = {};
  helperStream[ctx.id] = {};
  for (const f of readdirSync(ctx.slicesDir)) {
    if (!f.endsWith('.ts') || f.endsWith('.spec.ts') || f.endsWith('.contract.ts')) continue;
    const src = read(join(ctx.slicesDir, f));
    for (const m of src.matchAll(/export const (\w+) = [^;]*?type: '(\w+)'/g)) {
      if (!eventAggregate[m[2]]) continue;
      helperEvent[ctx.id][m[1]] = m[2];
      const at = src.indexOf(`type: '${m[2]}'`, m.index);
      helperEventSrc[ctx.id][m[2]] ??= src.slice(at, at + 2000);
    }
    for (const m of src.matchAll(/export const (\w+) = \([^)]*\)[^=;]*=>\s*`([^`]+)`/g)) helperStream[ctx.id][m[1]] = m[2];
  }
}
// A call to a suite helper, plain or spread (`...orderPlaced()`), not a method.
const callsHelper = (src, helper) => new RegExp(`(?:^|[^\\w$.]|\\.\\.\\.)${helper}\\(`).test(src);

/* ---------- slices, from each context's packages suite ---------- */
const slices = [];
const skipped = [];
for (const ctx of CONTEXTS) for (const dir of readdirSync(ctx.slicesDir).sort()) {
  const path = join(ctx.slicesDir, dir);
  if (!statSync(path).isDirectory()) continue;
  const specFiles = readdirSync(path).filter(f => f.endsWith('.spec.ts') && !f.includes('contract') && !f.endsWith('.container.spec.ts'));
  if (!specFiles.length) { skipped.push(`${ctx.id}/${dir} (contract/infrastructure specs only)`); continue; }
  if (slices.some(s => s.id === dir)) warn(`slice ${dir} appears in more than one context`);
  const src = specFiles.map(f => read(join(path, f))).join('\n');
  const { tests, setup, describeTitle } = testsWithBodies(src);
  const isRejection = (body) => /rejects\.|toThrow\(|toBeInstanceOf\(\s*[A-Z]/.test(body);
  const builders = Object.entries(helperEvent[ctx.id]);
  const mentionedIn = (text) => [...new Set([
    ...EVENT_TYPES.filter(e => text.includes(`'${e}'`) || text.includes(`type: '${e}'`) || new RegExp(`\\b${e}\\b`).test(text)),
    ...builders.filter(([h]) => callsHelper(text, h)).map(([, e]) => e),
    // seedCatalogue seeds the two catalogue items as events; the harness calls it.
    ...(text.includes('marketDayHarness(') || text.includes('seedCatalogue(') ? ['ItemAddedToCatalogue'] : []),
  ])];
  // Each spec's Given / When / Then, read off its own body: what it asserts was
  // recorded (or that nothing was), the error it expects, the commands an
  // automation's spec expects sent; every event it mentions elsewhere, and every
  // command it runs through a harness helper, is its Given.
  const assertions = /expect\(\s*(?:store\.newEvents\(\)|gateway\.dispatched)\s*\)[\s\S]*?;/g;
  // The spec file's own helpers (`given(registered())`, `await invite()`), so a
  // spec that sets its history up through one is read as giving what the helper
  // records. A helper that asserts is a Then, not a Given, and is left out.
  const commandsRunIn = (text) => [
    ...Object.keys(helperCommand).filter(h => callsHelper(text, h)).map(h => helperCommand[h]),
    ...[...text.matchAll(/\bnew (\w+)Handler\(/g)].map(m => m[1]),
    ...[...text.matchAll(/\bTest([A-Z]\w+)\.(?:valid|with)\b/g)].map(m => m[1]),
  ];
  // Read from the whole file: a helper written after the last test sits in that
  // test's cut-out source, which ends where the first such helper starts.
  const helperDefs = [...src.matchAll(/^[ \t]*(?:(?:const|let)\s+(\w+)\s*=\s*(?:async\s*)?(?:\([^)]*\)|\w+)\s*(?::[^=;]*)?=>|(?:async\s+)?function\s+(\w+)\s*\()/gm)]
    .map((m, i, all) => {
      const end = Math.min(all[i + 1]?.index ?? src.length, ...tests.map(t => t.start).filter(at => at > m.index), m.index + 1500);
      return { name: m[1] || m[2], at: m.index, body: src.slice(m.index, end) };
    });
  const localHelpers = helperDefs.filter(h => !/\bexpect\(/.test(h.body));
  for (const t of tests) {
    const cut = helperDefs.find(h => h.at > t.start && h.at < t.start + t.body.length);
    if (cut) t.body = t.body.slice(0, cut.at - t.start);
  }
  const givenIn = (text, seen = new Set()) => {
    const events = new Set(mentionedIn(text)), commands = new Set(commandsRunIn(text));
    for (const h of localHelpers) {
      if (seen.has(h.name) || !callsHelper(text, h.name)) continue;
      seen.add(h.name);
      const inner = givenIn(h.body, seen);
      inner.events.forEach(e => events.add(e)); inner.commands.forEach(c => commands.add(c));
    }
    return { events: [...events], commands: [...commands] };
  };
  // What every spec in the file is given: the history its beforeEach blocks set up.
  const shared = [...setup.matchAll(/\bbeforeEach\(/g)].map(m => {
    const open = setup.indexOf('{', m.index);
    const close = open < 0 ? -1 : closeBracket(setup, open);
    return close < 0 ? '' : setup.slice(open, close);
  }).join('\n');
  const sharedGiven = givenIn(shared);
  const specs = tests.map(t => {
    const then = { events: new Set(), errors: [], sent: [], nothing: false };
    for (const m of t.body.matchAll(/newEvents\(\)\)([\s\S]*?);/g)) {
      for (const e of m[1].matchAll(/type:\s*'(\w+)'/g)) if (eventAggregate[e[1]]) then.events.add(e[1]);
      for (const [h, e] of builders) if (callsHelper(m[1], h)) then.events.add(e);
      if (/^\s*\.\s*(?:toEqual\(\s*\[\s*\]\s*\)|toHaveLength\(\s*0\s*\))/.test(m[1])) then.nothing = true;
    }
    for (const m of t.body.matchAll(/dispatched\s*\)\s*\.\s*toEqual\(\s*\[([\s\S]*?)\]\s*\)/g)) {
      const sent = [...m[1].matchAll(/new (\w+)\(/g)].map(x => x[1]);
      if (sent.length) then.sent.push(...sent); else then.nothing = true;
    }
    then.errors = [...new Set([...t.body.matchAll(/(?:toThrow|toBeInstanceOf)\(\s*([A-Z]\w+)/g)].map(m => m[1]).filter(e => e !== 'Error'))];
    const givenText = t.body.replace(assertions, '');
    return {
      name: t.name, mods: t.mods, kind: isRejection(t.body) ? 'rejection' : 'happy',
      ...(({ events, commands }) => ({
        given: [...new Set([...sharedGiven.events, ...events])],
        givenCommands: [...new Set([...sharedGiven.commands, ...commands])],
      }))(givenIn(givenText)),
      then: { events: [...then.events], errors: then.errors, sent: [...new Set(then.sent)], nothing: then.nothing },
    };
  });
  const mentioned = mentionedIn(src);
  // The slice's main scenario: the shared setup and its first test that isn't a
  // rejection. Where the slice sits on the timeline follows what that scenario
  // presupposes; the specs that refuse a command once something has happened,
  // or let it happen again after, don't move it.
  const story = setup + (tests.find(t => !isRejection(t.body))?.body ?? '');
  const errors = [...new Set(
    [...src.matchAll(/(?:toThrow|toBeInstanceOf)\(\s*([A-Z]\w+)/g)].map(m => m[1]).filter(e => e !== 'Error'),
  )];
  const base = {
    id: dir,
    context: ctx.id,
    title: describeTitle ?? pascal(dir),
    files: specFiles.map(f => rel(join(path, f))),
    specs,
    errors,
  };
  const readers = (q) => ({ query: q.query, actors: actorList(q.query).length ? actorList(q.query) : ['vendor'] });

  if (processors[dir]) {
    const p = processors[dir];
    slices.push({ ...base, kind: 'automation', consumes: p.consumes, dispatches: p.dispatches, sources: [p.file] });
    continue;
  }
  if (projections[dir]) {
    const readBy = queries.filter(q => q.reads.includes(dir)).map(readers);
    // A view directory's specs cover several queries, each with its own describe;
    // the slice is named after the read model itself.
    const title = dir.split('-').map(w => w[0].toUpperCase() + w.slice(1)).join(' ');
    slices.push({ ...base, title, kind: 'view', consumes: projections[dir].consumes, readBy, sources: [projections[dir].file] });
    continue;
  }
  if (/store\.newEvents\(\)/.test(src)) {
    const command = pascal(dir);
    // What the specs assert the command appended: every event type named inside an
    // expectation on store.newEvents(), written out or built by a suite helper
    // (`...orderPlaced()`). Setup done through other commands lands there too, so
    // the slice's own events are resolved below, once every command slice has
    // declared what it asserts.
    const asserted = new Set();
    for (const m of src.matchAll(/newEvents\(\)\)([\s\S]*?);/g)) {
      for (const t of m[1].matchAll(/type:\s*'(\w+)'/g)) if (eventAggregate[t[1]]) asserted.add(t[1]);
      for (const [h, e] of builders) if (callsHelper(m[1], h)) asserted.add(e);
    }
    // The stream: a literal id, or the suite helper that builds it.
    const sm = /streamId[\s\S]{0,200}?[`'"]([\w-]+\/[^`'"]+)[`'"]/.exec(src);
    const hm = /streamId:\s*(\w+)\(/.exec(src);
    const streamTemplate = sm ? sm[1] : hm ? helperStream[ctx.id][hm[1]] : null;
    const stream = streamTemplate ? streamTemplate.replace(/\$\{[^}]+\}/g, '<' + '…>') : null;
    const commandsIn = (text) => [...new Set([
      ...Object.keys(helperCommand).filter(h => callsHelper(text, h)).map(h => helperCommand[h]),
      ...[...text.matchAll(/\bnew (\w+)Handler\(/g)].map(m => m[1]),
      ...[...text.matchAll(/\bTest([A-Z]\w+)\.(?:valid|with)\b/g)].map(m => m[1]),
    ])].filter(c => c !== command);
    const givenCommands = commandsIn(src);
    const actors = actorList(command);
    slices.push({ ...base, kind: 'command', command, actors, emits: [], given: [], givenCommands, stream, src, asserted, mentioned,
      storyMentioned: mentionedIn(story), storyCommands: commandsIn(story) });
    if (!actors.length) warn(`command ${command}: no actor found in the api's controllers or processors`);
    continue;
  }
  const own = queries.filter(q => q.dir === dir);
  if (own.length && specFiles.every(f => f.startsWith('find-'))) {
    // A read computed at query time from other views: no projection of its own, so
    // its Given is whatever feeds the views it reads.
    const derivedFrom = [...new Set(own.flatMap(q => q.reads))].filter(v => projections[v]);
    const consumes = [...new Set(derivedFrom.flatMap(v => projections[v].consumes))];
    const title = dir.split('-').map(w => w[0].toUpperCase() + w.slice(1)).join(' ');
    slices.push({ ...base, title, kind: 'view', derivedFrom, consumes,
      readBy: own.map(readers), sources: own.map(q => q.file) });
    continue;
  }
  skipped.push(`${ctx.id}/${dir} (unclassified — not a command, view or automation spec)`);
}

// The events each command emits. The name pairing settles most (ADR 0009); the
// rest are the one asserted type no other command claims, resolved until nothing
// moves. Last, a command deciding between outcomes — PlaceOrder's OrderPlaced or
// OrderRefused — also emits every unclaimed type that only it asserts.
{
  const commands = slices.filter(s => s.kind === 'command');
  const claimed = new Set();
  for (const s of commands) {
    const stemmed = commandEmits(s.command, EVENT_TYPES);
    if (stemmed.length === 1 && (!s.asserted.size || s.asserted.has(stemmed[0]))) { s.emits = [stemmed[0]]; claimed.add(stemmed[0]); }
  }
  for (let moved = true; moved;) {
    moved = false;
    for (const s of commands) {
      if (s.emits.length) continue;
      const left = [...s.asserted].filter(e => !claimed.has(e));
      if (left.length === 1) { s.emits = left; claimed.add(left[0]); moved = true; }
    }
  }
  const asserters = {};
  for (const s of commands) for (const e of s.asserted) (asserters[e] ??= []).push(s);
  for (const s of commands) {
    const outcomes = [...s.asserted].filter(e => !claimed.has(e) && asserters[e].length === 1);
    s.emits.push(...outcomes.sort());
  }
  for (const s of commands) {
    const own = s.emits[0] ?? null;
    if (!own) warn(`command ${s.command}: cannot tell which event it emits (asserted [${[...s.asserted]}])`);
    // Example payload: the first asserted payload of the slice's own event, in
    // the spec or in the suite helper that builds it.
    s.payload = null;
    if (own) {
      const at = s.src.indexOf(`type: '${own}'`);
      const after = at >= 0 ? s.src.slice(at, at + 2000) : helperEventSrc[s.context][own] ?? '';
      const pm = /payload:\s*(?:expect\.objectContaining\()?\s*\{/.exec(after);
      if (pm) {
        s.payload = balancedBraces(after, pm.index + pm[0].length - 1);
        s.payloadFrom = at >= 0 ? 'spec' : 'helper';
      }
    }
    s.given = s.mentioned.filter(e => !s.emits.includes(e));
    s.storyGiven = s.storyMentioned.filter(e => !s.emits.includes(e));
    delete s.src; delete s.asserted; delete s.mentioned; delete s.storyMentioned;
  }
}

// Each spec's Given and Then, once every command's events are known. A command
// run through a harness helper is given as the event it records. A command's
// spec that checks its outcome through a helper of its own asserts nothing the
// reading above can see: it records the command's own event, unless its title
// says nothing is recorded.
{
  const emitsOf = Object.fromEntries(slices.filter(s => s.kind === 'command').map(s => [s.command, s.emits]));
  for (const s of slices) for (const t of s.specs) {
    const own = s.kind === 'command' ? s.emits : [];
    t.given = [...new Set([...t.given, ...t.givenCommands.filter(c => c !== s.command).flatMap(c => emitsOf[c] ?? [])])]
      .filter(e => !t.then.events.includes(e));
    delete t.givenCommands;
    if (s.kind === 'command' && t.kind === 'happy' && !t.then.events.length && !t.then.nothing) {
      if (/\bnothing\b/i.test(t.name)) t.then.nothing = true; else t.then.events = own.slice(0, 1);
    }
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
    for (const e of s.storyGiven) if (producerOf[e]) deps.add(producerOf[e]);
    for (const c of s.storyCommands) if (commandSlice[c]) deps.add(commandSlice[c]);
  } else {
    for (const e of s.consumes) if (producerOf[e]) deps.add(producerOf[e]);
    for (const v of s.derivedFrom ?? []) deps.add(v);
  }
  if (s.kind === 'automation') {
    // the automation precedes the commands it dispatches
    for (const c of s.dispatches) if (commandSlice[c]) deps.delete(commandSlice[c]);
  }
  deps.delete(s.id);
  s.deps = [...deps];
  delete s.storyGiven; delete s.storyCommands;
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
  const dispatched = s.kind === 'automation' ? s.dispatches.map(c => byId.get(commandSlice[c])?.emits?.[0]).filter(Boolean) : [];
  const evs = s.kind === 'command' ? s.emits
    : s.kind === 'view' ? s.consumes
    : dispatched.length ? dispatched : s.consumes;
  const tally = {};
  for (const e of evs) tally[eventAggregate[e]] = (tally[eventAggregate[e]] ?? 0) + 1;
  s.chapter = Object.entries(tally).sort((a, b) => b[1] - a[1])[0]?.[0] ?? 'other';
}

// Timeline order: a topological pass over chapters (a chapter waits for every
// chapter its slices presuppose), then over the slices within each chapter.
// The tiebreak also sees the id placed last, so a chain can stay together.
function topo(ids, depsOf, tiebreak) {
  const order = [];
  const pending = new Set(ids);
  let last = null;
  while (pending.size) {
    const ready = [...pending].filter(id => depsOf(id).every(d => d === id || !pending.has(d))).sort((a, b) => tiebreak(a, b, last));
    if (!ready.length) { warn(`dependency cycle among: ${[...pending]}`); ready.push([...pending][0]); }
    last = ready[0];
    order.push(last);
    pending.delete(last);
  }
  return order;
}
// Each context in turn, so the two never interleave on the timeline.
const chapterDeps = (ctx, c) => [...new Set(
  slices.filter(s => s.context === ctx.id && s.chapter === c)
    .flatMap(s => s.deps.map(d => byId.get(d))).filter(d => d.context === ctx.id && d.chapter !== c).map(d => d.chapter),
)];
const sliceOrder = CONTEXTS.flatMap(ctx => {
  const mine = slices.filter(s => s.context === ctx.id);
  const storyRank = (c) => { const i = ctx.story.indexOf(c); return i < 0 ? ctx.story.length : i; };
  const chapterOrder = topo([...new Set(mine.map(s => s.chapter))], (c) => chapterDeps(ctx, c),
    (a, b) => (storyRank(a) - storyRank(b)) || a.localeCompare(b));
  return chapterOrder.flatMap(c => topo(
    mine.filter(s => s.chapter === c).map(s => s.id),
    (id) => byId.get(id).deps,
    (a, b, last) => {
      const sa = byId.get(a), sb = byId.get(b);
      const k = (s) => (s.kind === 'view' ? 1 : 0);      // views after the writes they read
      // Keep a chain together: an automation's commands right after it, in the
      // order it sends them, then anything else that needs what was just placed.
      const follows = (s) => {
        const prev = byId.get(last);
        const sent = prev?.kind === 'automation' ? prev.dispatches.indexOf(s.command) : -1;
        return sent >= 0 ? sent : s.deps.includes(last) ? 100 : 200;
      };
      return (k(sa) - k(sb)) || (follows(sa) - follows(sb)) || (sa.deps.length - sb.deps.length) || a.localeCompare(b);
    },
  ));
});
slices.sort((a, b) => sliceOrder.indexOf(a.id) - sliceOrder.indexOf(b.id));

// Aggregate lanes, ordered by first appearance on the timeline.
const lanes = [];
for (const s of slices) for (const e of [...(s.emits ?? []), ...(s.consumes ?? [])]) {
  const a = eventAggregate[e];
  if (a && !lanes.includes(a)) lanes.push(a);
}

/* ---------- the board's columns, in the order of the vendor's lifecycle (story.mjs) ---------- */
// One column per command, read model or command-less automation. An automation
// that sends commands has no column of its own: its gear sits over each command
// it sends. A command placed twice keeps only the sender named for each place.
const automationSending = {};   // command class -> automation slice
for (const s of slices) if (s.kind === 'automation') for (const c of s.dispatches) automationSending[c] = s;
const spaced = (camel) => camel.replace(/([a-z0-9])([A-Z])/g, '$1 $2');
const queryLabel = (q) => spaced(q.replace(/^Find/, ''));

function column(s, stage, by) {
  const col = { stage, context: s.context, slice: s.id, kind: s.kind, title: s.title, ui: [], specs: [] };
  if (s.kind === 'command') {
    col.command = s.command;
    col.events = s.emits;
    for (const a of by ? [by] : s.actors) {
      if (a === 'automation') {
        const gear = automationSending[s.command];
        if (gear) { col.gear = gear.id; col.ui.push({ lane: 'automation', kind: 'gear', label: gear.title, consumes: gear.consumes }); }
      } else if (a === 'stripe') col.ui.push({ lane: 'stripe', kind: 'external', label: 'Stripe notice' });
      else col.ui.push({ lane: a, kind: 'screen', label: s.title });
    }
  } else if (s.kind === 'view') {
    col.consumes = s.consumes;
    col.derivedFrom = s.derivedFrom ?? [];
    const byActor = {};
    for (const r of s.readBy ?? []) for (const a of r.actors) (byActor[a] ??= []).push(r.query);
    for (const [a, qs] of Object.entries(byActor)) {
      col.ui.push({ lane: a, kind: 'screen', label: queryLabel(qs[0]) + (qs.length > 1 ? ` +${qs.length - 1}` : ''), queries: qs });
    }
  } else {
    col.consumes = s.consumes;
    col.ui.push({ lane: 'automation', kind: 'gear', label: s.title, consumes: s.consumes });
  }
  return col;
}

const columns = [];
const placed = new Set();
for (const { stage, slices: entries } of STORY) for (const entry of entries) {
  const { slice: id, by } = typeof entry === 'string' ? { slice: entry } : entry;
  const s = byId.get(id);
  if (!s) { warn(`story.mjs names ${id}, which is no slice on the model`); continue; }
  if (s.kind === 'automation' && s.dispatches.length) { warn(`story.mjs names ${id}, an automation that sends commands: its gear sits over them`); continue; }
  columns.push(column(s, stage, by));
  placed.add(id);
}
for (const s of slices) {
  if (placed.has(s.id) || (s.kind === 'automation' && s.dispatches.length)) continue;
  warn(`slice ${s.id} is not in story.mjs: shown under Unsorted`);
  columns.push(column(s, 'Unsorted'));
}

// The story's order against what each slice presupposes: some place of a slice
// must come after the first place of everything it presupposes.
{
  const at = {};
  columns.forEach((c, i) => (at[c.slice] ??= []).push(i));
  for (const s of slices) {
    if (!at[s.id]) continue;
    for (const d of s.deps) {
      if (!at[d]) continue;
      if (Math.min(...at[d]) > Math.max(...at[s.id])) warn(`story.mjs places ${s.id} before ${d}, which it presupposes`);
    }
  }
}

// Which specs hang under which column. A slice's specs go under its column; a
// slice placed twice files each spec wherever everything it is given has
// happened by then, the last place if nowhere. An automation's specs go under
// the gear over the command whose event they assert, else the command they
// assert it sends, else under every one of its gears.
{
  const occurrences = {};
  columns.forEach((c, i) => (occurrences[c.slice] ??= []).push(i));
  const producedBefore = (i) => new Set(columns.slice(0, i).flatMap(c => c.events ?? []));
  columns.forEach((c, i) => {
    const s = byId.get(c.slice);
    const mine = occurrences[c.slice];
    s.specs.forEach((t, n) => {
      if (mine.length === 1) { c.specs.push([s.id, n]); return; }
      const before = (j) => t.given.every(e => producedBefore(j).has(e));
      const reachable = mine.filter(before);
      if ((reachable.length ? reachable : [mine[mine.length - 1]]).includes(i)) c.specs.push([s.id, n]);
    });
    if (!c.gear) return;
    const gear = byId.get(c.gear);
    const gearColumns = columns.filter(x => x.gear === c.gear);
    gear.specs.forEach((t, n) => {
      const byEvent = gearColumns.filter(x => x.events.some(e => t.then.events.includes(e)));
      const byCommand = gearColumns.filter(x => t.then.sent.includes(x.command));
      const targets = byEvent.length ? byEvent : byCommand.length ? byCommand : gearColumns;
      if (targets.includes(c)) c.specs.push([gear.id, n]);
    });
  });
}
const stages = [...new Set(columns.map(c => c.stage))];

const counts = {
  slices: slices.length,
  commands: slices.filter(s => s.kind === 'command').length,
  events: EVENT_TYPES.length,
  views: slices.filter(s => s.kind === 'view').length,
  automations: slices.filter(s => s.kind === 'automation').length,
  specs: slices.reduce((n, s) => n + s.specs.length, 0),
};
const orphans = EVENT_TYPES.filter(e => !slices.some(s => (s.emits ?? []).includes(e)));
if (orphans.length) warn(`events with no producing slice on the model: ${orphans}`);

const contexts = CONTEXTS.filter(c => slices.some(s => s.context === c.id)).map(({ id, name }) => ({ id, name }));
const data = { contexts, slices, columns, stages, lanes, eventAggregate, eventContext, counts, skipped, unproduced: orphans };
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
