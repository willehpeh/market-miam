# design-system

The brand, in three files, consumed by every app that has a face.

| File | What it is | Who imports it |
|------|------------|----------------|
| `tokens.css` | brand values as `--mm-*` custom properties | everyone — Tailwind apps via `theme.css`, the Astro site directly |
| `theme.css` | maps the tokens into Tailwind v4's `@theme` so utilities generate, plus a base layer and a few component shortcuts | `vendor-frontend`, `customer-frontend` |
| `fonts.css` | `@font-face` for the two typefaces, self-hosted | every app that renders text in them |

## Fonts

`fonts/` holds the two typefaces as `woff2`. They are **self-hosted, not linked from
Google**: a `<link>` to `fonts.googleapis.com` sends every visitor's IP to a third party
before the page has asked for anything, which LG München 2022 found unlawful — and a
storefront is a page the *vendor* publishes and answers for.

| Family | Files | Notes |
|--------|-------|-------|
| Hanken Grotesk | `hanken-grotesk-{latin,latin-ext}.woff2` | Variable, `wght 100 900` — one file per subset covers every weight |
| Space Mono | `space-mono-{400,700}-{latin,latin-ext}.woff2` | Static; only the two weights the design uses |

Import `fonts.css` and the files come with it — the `url()`s are relative to that
stylesheet and the bundler rewrites them, emitting hashed copies into the app's own
output (`media/` for the Angular apps, `_astro/` for the site). Nothing to copy by hand,
nothing to keep in a `public/` directory.

**One trap.** In an Astro `<style>` block, a `url()` inside an `@import`ed sheet is *not*
rebased — the build warns `didn't resolve at build time` and leaves `./fonts/…` to be
looked for next to the page. So the site imports `fonts.css` from component frontmatter
instead, where Vite's normal CSS pipeline handles it. `tokens.css` has no `url()` and is
unaffected, which is why it can stay an `@import`.

Cyrillic and Vietnamese subsets are deliberately skipped. `→` (U+2192, used by the site's
`.next li::before`) is outside both kept subsets and renders in the fallback monospace —
that was already true when the fonts came from Google.

### Refreshing them

Fetched from Google Fonts v12 (Hanken) / v17 (Space Mono). Request the CSS with a browser
`User-Agent` — without one Google serves legacy `ttf` instead of `woff2` — then download
the URLs for the `latin` and `latin-ext` subsets only:

```sh
curl -A "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36" \
  "https://fonts.googleapis.com/css2?family=Hanken+Grotesk:wght@100..900&family=Space+Mono:wght@400;700&display=swap"
```

The `unicode-range` values in `fonts.css` are Google's own, copied from that response.
Keep them in step with the files.
