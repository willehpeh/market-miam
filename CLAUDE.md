# CLAUDE.md

Conventions live in [CONTRIBUTING.md](CONTRIBUTING.md), the shape of the monorepo in
[README.md](README.md), and the reasoning behind nearly everything in
[`docs/adr/`](docs/adr/README.md) and the plan documents under [`docs/`](docs). Read those
first — this file is only for things about *running* the repo, and how agent sessions work with its owner, that those
pages get to assume.

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
believing it. The social suite (`npx nx test test`) is mostly port-free and the more
reliable local signal, but not immune: `test/src/auth/auth.integration.spec.ts` drives
supertest too and flakes the same way. Re-run before believing it.

## Container specs need a Docker socket testcontainers can find

`npx nx run test:test:container` (CI runs it) fails locally with *Could not find a working
container runtime strategy* when Docker runs under OrbStack or Colima: testcontainers ignores
the docker CLI's context. Start the runtime, then point it at the socket:

```sh
DOCKER_HOST=unix://$HOME/.orbstack/run/docker.sock \
TESTCONTAINERS_DOCKER_SOCKET_OVERRIDE=/var/run/docker.sock \
npx nx run test:test:container
```

With no Docker at all, as in a Claude Code web or mobile container, which has the Postgres 16
server installed, run a throwaway cluster as the `postgres` user and hand the harness a database
whose name ends in `_test`:

```sh
su postgres -s /bin/bash -c "/usr/lib/postgresql/16/bin/initdb -D ~/lifecycle/data -U postgres --auth=trust \
  && /usr/lib/postgresql/16/bin/pg_ctl -D ~/lifecycle/data -o '-p 5433 -c listen_addresses=localhost' -l ~/lifecycle/server.log start"
psql postgres://postgres@localhost:5433/postgres -c 'CREATE DATABASE lifecycle_test'
TEST_POSTGRES_URL=postgres://postgres@localhost:5433/lifecycle_test npx nx scenario api
```

## Pushing to `main` deploys

`render.yaml` sets `autoDeployTrigger: checksPass` on every service: a push to `main` that
passes CI goes to production. A plan that gates deploys (e.g. `MENTIONS-LEGALES-PLAN.md`
slice 8) gates *pushes*.

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

## A push rejected with *missing necessary objects*

Seen on 22 November 2026 in a Claude Code web session: after a GitHub server error on one push, every later
push sent an empty pack (`Total 0`) and was refused with *missing necessary objects*. The session's git config
sets `push.negotiate`; pushing with it off sent the objects and went through:

```sh
git -c push.negotiate=false push -u origin <branch>
```

## Working with the owner in agent sessions

The owner builds test-first with an agent, one step at a time, and reviews each step:

- **Red, green, refactor, one cycle at a time.** Show each red, its failing output included, and wait for the
  owner before going green unless they asked for several cycles at once.
- **A red fails only its new test, on its assertion.** When the test needs scaffolding first, a preparation
  commit under a green bar touches only fakes and spec setup; production code arrives only in a green. A pin on
  code that already exists is shown red by breaking that code, then restoring it.
- **Specs assert behaviour**, such as recorded events, never which commands were sent.
- **Start every behaviour with a use-case test in the `test` project, outside in, wherever possible.** The api
  spec comes last, as the one check that the wiring holds, through its api objects (ADR 0064); it is not the
  outer loop, and behaviour it would imply, such as a controller calling a port, belongs in a use case first.
- **Object design and clear names over helpers**, no comments in new code, and no get or set accessors (ADR 0008,
  enforced by lint). The owner questions names: offer alternatives with a recommendation.
- **Polymorphism only when it is clean.** No `instanceof`, or anything equivalent, to choose behaviour: callers send
  a message without knowing which kind of object receives it, and the kind is chosen once, where the object is
  built. Prefer composition over inheritance; a contract that is not a DI token is an interface, which its kinds
  implement.
- **Decisions are grilled in chat, one question at a time**, never through the question dialog: options, their
  costs, a recommendation. Check Stripe facts against Stripe's docs or the sandbox and say when something is
  unverified. The sandbox key is a network secret for `api.stripe.com` on the cloud environment, never in GitHub;
  tag sandbox objects with a `purpose` in their metadata.
- **The ordering board says what was decided and why, never how.** A decided row is a default: when building shows
  something new, put it back to the owner rather than ruling it out. ADRs record only what is hard to reverse or
  crosses contexts, written when the code lands.
- **Push failing specs to the branch only.** Before pushing to `main`, run CI's steps on the affected projects
  (`lint`, `typecheck`, `test`, `test:container`, `build`) and `nx scenario api`, both against the throwaway
  Postgres above.

