// The icons the apps actually use, found in their templates (inline in the components'
// .ts files, or beside them as .html). A showcase list kept by hand would drift from them.
const sources = import.meta.glob<string>(['../../../*-frontend/src/**/*.{ts,html}', '!**/*.spec.ts'], {
  query: '?raw',
  import: 'default',
  eager: true,
});

export const iconsInUse: string[] = [
  ...new Set(Object.values(sources).flatMap((source) => [...source.matchAll(/fa-solid fa-([a-z0-9-]+)/g)].map((match) => match[1]))),
].sort();
