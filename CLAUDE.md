# CLAUDE.md

Conventions live in [CONTRIBUTING.md](CONTRIBUTING.md), the shape of the monorepo in
[README.md](README.md), and the reasoning behind nearly everything in
[`docs/adr/`](docs/adr/README.md) and the plan documents under [`docs/`](docs). Read those
first — this file is only for things about *running* the repo that those pages get to assume.

## `nx test api` is flaky on local macOS

`npx nx test api` fails intermittently on a Mac, and **the failures move**: a different
spec fails each run, sometimes none at all. A representative three runs on a clean tree:

```
Tests  195 passed (195)
Tests  195 passed (195)
Tests  4 failed | 191 passed (195)   # catalogue-rebuild, market-day-close,
                                     # market-schedule, request-shape
```

**This is not a real failure, and the spec that failed is not broken.** The API specs drive
HTTP through supertest against `app.getHttpServer()`, which binds an ephemeral port; macOS
allocates those in a way that collides under vitest's parallelism. Diagnosed previously —
CI runs the same suite on Linux and is green.

So: never "fix" an API spec because it failed once, and never conclude a change broke the
API suite from a single red run. Re-run it, and check a recent run on `main` before
believing it. The social suite (`npx nx test test`) binds no ports and is unaffected — use
it as the reliable local signal.

## Node in Claude Code web and mobile sessions

`npm ci` fails in a Claude Code on the web / mobile container:

```
npm error `npm ci` can only install packages when your package.json and
npm error package-lock.json ... are in sync.
npm error Missing: chokidar@4.0.3 from lock file
npm error Missing: readdirp@4.1.2 from lock file
```

**This is not lockfile drift.** Those containers ship Node 22 and npm 10, where
`CONTRIBUTING.md` asks for Node 24+ — and `package-lock.json` is written by npm 11, which
npm 10 cannot validate. CI runs the same `npm ci` on Node 24 and is green. Check a recent
run on `main` before believing the lockfile is broken, and do not "fix" it.

Use `npm install` to get a working `node_modules`. It takes about a minute and the test
suites run normally afterwards. It also **rewrites `package-lock.json`** into npm 10's
shape — some 300 changed lines unrelated to whatever you are working on — so restore it
when you are done:

```sh
npm install
npx nx test <project>
git checkout package-lock.json
```

Never commit a lockfile written from one of these sessions. The next `npm ci` on Node 24
is where that would land, and it would be real drift rather than this phantom.
