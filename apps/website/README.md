# website

The public marketing / landing site, built with [Astro](https://astro.build).
Static pages under `src/pages/`, shared layouts under `src/layouts/`.

```sh
npx nx serve website     # astro dev
npx nx build website     # astro build
```

## Images

`public/` holds generated assets, not originals. Regenerate with `sharp` (already a
transitive dep) if the sources change:

| File | Source |
|------|--------|
| `logo.webp` | `apps/vendor-frontend/src/assets/full-logo.png` — trimmed (the PNG is ~⅔ transparent padding), resized to 480px wide |
| `storefront-demo.webp` | Screenshot of `demo.marketmiam.fr`, content column only, 900px wide |
| `og.jpg` | 1200×630 share card, composed from the logo and the storefront screenshot |

`astro:assets` is deliberately unused: its optimised output collides with the
out-of-tree `outDir` in `astro.config.mjs` and the build fails.

## Fonts

`packages/design-system/fonts/` holds the two typefaces, self-hosted so that no visitor
IP reaches Google before consent — shared with the three Angular apps, which had been
loading them from Google's CDN until the faces moved into the design system.
`@font-face` lives in `packages/design-system/fonts.css`, imported by `Base.astro`; the
family names come from `tokens.css` beside it. `public/fonts` here is a symlink to that
directory, so Astro serves the same six files at the same `/fonts/…` URLs the Angular
builds copy them to.

| Family | Files | Notes |
|--------|-------|-------|
| Hanken Grotesk | `hanken-grotesk-{latin,latin-ext}.woff2` | Variable, `wght 100 900` — one file per subset covers every weight |
| Space Mono | `space-mono-{400,700}-{latin,latin-ext}.woff2` | Static; only the two weights the site uses |

Fetched from Google Fonts v12 (Hanken) / v17 (Space Mono). To refresh, request the CSS
with a browser `User-Agent` — without one Google serves legacy `ttf` instead of `woff2` —
then download the URLs for the `latin` and `latin-ext` subsets only:

```sh
curl -A "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36" \
  "https://fonts.googleapis.com/css2?family=Hanken+Grotesk:wght@100..900&family=Space+Mono:wght@400;700&display=swap"
```

Cyrillic and Vietnamese subsets are deliberately skipped. Note that `→` (U+2192, used by
`.next li::before`) is outside both subsets and renders in the fallback monospace — that
was already true when the fonts came from Google.
