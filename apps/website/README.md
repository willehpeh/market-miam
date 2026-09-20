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

Self-hosted, and shared with the vendor apps: the files and the `@font-face` live in
[`packages/design-system`](../../packages/design-system/README.md), which also holds the
provenance and the refresh recipe. `Base.astro` imports `fonts.css` from its frontmatter
and preloads the one file every page needs.

The frontmatter import is deliberate — inside a `<style>` block Astro does not rebase the
`url()`s and the woff2 would be looked for next to the page. See the design-system README.
