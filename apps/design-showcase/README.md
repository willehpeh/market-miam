# design-showcase

The design system in [`packages/design-system`](../../packages/design-system/README.md),
rendered: colours, type, radii and shadows, the base elements, the component classes and
the icons the apps use. Built with [Astro](https://astro.build) as one static page, and
deployed as its own static service on its bare onrender.com URL (see `render.yaml`) — a
name under `marketmiam.fr` would fall inside the storefronts' `*.marketmiam.fr` wildcard.

```sh
npx nx serve design-showcase     # astro dev
npx nx build design-showcase     # astro build → dist/apps/design-showcase
```

## Read from the source, not restated

`src/lib/design-system.ts` imports `tokens.css` and `theme.css` as text and parses them
at build time, so the page follows the package without being edited:

- **Colours and fonts** are the declarations in `tokens.css`'s `:root`, grouped by its
  `/* ---- section ---- */` comments, with each trailing comment shown as the note.
- **Accents and densities** are the `[data-theme="…"]` and `[data-density="…"]` selectors;
  the controls set those same attributes on `<html>`.
- **Radii, shadows and tracking** are the `@theme` entries with those prefixes.
- **Component classes** are the rules in `@layer components`, noted with the comment
  written above each one.

The examples themselves are written by hand in `src/pages/index.astro`: markup has to be
chosen. A component class with no example is called out on the page, so a new one in
`theme.css` does not go missing quietly.

**Icons** are read from the frontends' templates (`src/lib/icons.ts`), which is why the
Render service also rebuilds on `apps/*-frontend/src/**`.

## Two things that look odd

- `styles.css` imports `theme.css` with `theme(static)`. Tailwind v4 otherwise drops
  every theme variable no utility uses, and the radius and shadow samples read theirs
  through `var()`, which it cannot see.
- `contrast.ts` accepts three-digit hex: the build minifies `#ffffff` to `#fff`, and that
  is what the browser returns for the live value after an accent switch.
