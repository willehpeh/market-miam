// The showcase reads the design system's own source rather than restating it: a token,
// theme or component class added to packages/design-system shows up here on the next
// build, and the notes beside each one are the comments already written in the CSS.
import tokensCss from '../../../../packages/design-system/tokens.css?raw';
import themeCss from '../../../../packages/design-system/theme.css?raw';

export interface Token {
  name: string;
  value: string;
  note?: string;
}

export interface TokenGroup {
  title: string;
  tokens: Token[];
}

const SECTION = /\/\*\s*-{2,}\s*(.+?)\s*-+\s*\*\//;
const DECLARATION = /(--[\w-]+)\s*:\s*([^;]+);(?:\s*\/\*\s*(.+?)\s*\*\/)?/;

function block(css: string, opening: RegExp): string {
  const match = css.match(new RegExp(opening.source + String.raw`\s*\{([^}]*)\}`));
  if (!match) throw new Error(`design-showcase: no ${opening.source} block in the design system`);
  return match[1];
}

function groupsOf(css: string): TokenGroup[] {
  const groups: TokenGroup[] = [];
  for (const line of css.split('\n')) {
    const section = line.match(SECTION);
    if (section) {
      groups.push({ title: section[1], tokens: [] });
      continue;
    }
    const declaration = line.match(DECLARATION);
    if (declaration) {
      const [, name, value, note] = declaration;
      groups.at(-1)?.tokens.push({ name, value: value.trim(), note });
    }
  }
  return groups.filter((group) => group.tokens.length > 0);
}

const rootGroups = groupsOf(block(tokensCss, /:root/));
const themeTokens = groupsOf(block(themeCss, /@theme/)).flatMap((group) => group.tokens);

const isColour = (token: Token) => token.value.startsWith('#');

export const colourGroups: TokenGroup[] = rootGroups
  .map((group) => ({ ...group, tokens: group.tokens.filter(isColour) }))
  .filter((group) => group.tokens.length > 0);

export const fontTokens: Token[] = rootGroups.flatMap((group) => group.tokens).filter((token) => !isColour(token));

export const accents: string[] = [...tokensCss.matchAll(/\[data-theme="([\w-]+)"\]/g)].map((match) => match[1]);

export const densities: string[] = [...themeCss.matchAll(/\[data-density="([\w-]+)"\]/g)].map((match) => match[1]);

/** `--mm-brand` → `brand`, the suffix theme.css gives it for bg-/text-/border- utilities. */
export function utilityFor(tokenName: string): string | undefined {
  const mapped = themeTokens.find((token) => token.value === `var(${tokenName})`);
  return mapped?.name.replace(/^--(color|font)-/, '');
}

const themeTokensPrefixed = (prefix: string) =>
  themeTokens
    .filter((token) => token.name.startsWith(prefix))
    .map((token) => ({ ...token, utility: token.name.slice(2) }));

export const radii = themeTokensPrefixed('--radius-');
export const shadows = themeTokensPrefixed('--shadow-');
export const trackings = themeTokensPrefixed('--tracking-');

const componentsLayer = themeCss.slice(themeCss.indexOf('@layer components'));

/** Every class the components layer defines, in source order. */
export const componentClasses: string[] = [
  ...new Set([...componentsLayer.matchAll(/^\s*\.([\w-]+)[\s:{]/gm)].map((match) => match[1])),
];

/** The comment written directly above a class's rule, as the note to show beside it. */
export function noteFor(className: string): string | undefined {
  const match = componentsLayer.match(
    new RegExp(String.raw`/\*((?:(?!\*/)[\s\S])*)\*/\s*\.${className}\s*\{`),
  );
  return match?.[1].replace(/\s+/g, ' ').trim();
}
