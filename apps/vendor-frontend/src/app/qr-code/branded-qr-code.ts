import { encode } from 'uqr';
import { WORDMARK } from './market-miam-wordmark';

// tokens.css: --mm-brand and --mm-brand-deep. Spelt out because a pure function cannot
// read a custom property, and because the code carries Market Miam's terracotta whatever
// accent theme the page around it is in — it is our mark on the vendor's stall.
export const BRAND = '#c0562f';
export const BRAND_DEEP = '#7a3320';
export const PAPER = '#ffffff';

// Modules of white around the code. Four is the specification's minimum; readers use it to
// find the edges, and a vendor who crops the image tight is exactly who needs it kept in.
export const QUIET_ZONE = 4;

// Share of the code's width the wordmark window takes. The ratio is what decides whether
// the code still reads: at H the correction absorbs up to 30% of damaged codewords, and
// 0.4 keeps the window under a tenth of the modules at every version a storefront address
// can reach — enough for a stained flyer under a tarpaulin as well as the logo.
export const WINDOW_SHARE = 0.4;

const WINDOW_PADDING_ROWS = 2;
const WORDMARK_INSET = 0.6;
const FINDER = 7;

// Intrinsic size only: the SVG is drawn to whatever size it is given, but Firefox paints
// one that declares none onto a canvas at 0×0.
const PIXELS_PER_MODULE = 12;

export interface Window {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface BrandedQrCode {
  /** Modules per side, quiet zone excluded. */
  size: number;
  /** Dark modules, row-major, with the wordmark window already cleared. */
  modules: boolean[][];
  window: Window;
  svg: string;
}

/**
 * The storefront's address as a QR code in Market Miam's colours, the wordmark set in a
 * window cut out of the middle. Pure: the same address always gives the same code.
 */
export function brandedQrCode(url: string): BrandedQrCode {
  const code = encode(url, { ecc: 'H', border: 0 });
  const window = wordmarkWindow(code.size);
  const modules = code.data.map((row, y) => row.map((dark, x) => dark && !inside(window, x, y)));
  return { size: code.size, modules, window, svg: render(code.size, modules, window) };
}

function wordmarkWindow(size: number): Window {
  const width = Math.round(size * WINDOW_SHARE);
  const height = Math.round(width / (WORDMARK.width / WORDMARK.height)) + WINDOW_PADDING_ROWS;
  return { x: Math.floor((size - width) / 2), y: Math.floor((size - height) / 2), width, height };
}

function inside(window: Window, x: number, y: number): boolean {
  return x >= window.x && x < window.x + window.width && y >= window.y && y < window.y + window.height;
}

// The three finder squares, which the data path leaves out so they can be drawn rounded.
function inFinder(size: number, x: number, y: number): boolean {
  const left = x < FINDER;
  const top = y < FINDER;
  const right = x >= size - FINDER;
  const bottom = y >= size - FINDER;
  return (left && top) || (right && top) || (left && bottom);
}

function render(size: number, modules: boolean[][], window: Window): string {
  const side = size + 2 * QUIET_ZONE;
  const px = side * PIXELS_PER_MODULE;
  const corners = [
    [0, 0],
    [size - FINDER, 0],
    [0, size - FINDER],
  ];
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${ side } ${ side }" width="${ px }" height="${ px }">` +
    `<rect width="${ side }" height="${ side }" fill="${ PAPER }"/>` +
    `<path fill="${ BRAND_DEEP }" d="${ dataPath(size, modules) }"/>` +
    `<g fill="${ BRAND }">${ corners.map(([x, y]) => finder(x + QUIET_ZONE, y + QUIET_ZONE)).join('') }</g>` +
    wordmark(window) +
    `</svg>`
  );
}

// One path for every data module, a run of neighbours per subpath: a version-9 code has
// some 1,400 dark modules, and a rect element each would be most of the file.
function dataPath(size: number, modules: boolean[][]): string {
  const runs: string[] = [];
  modules.forEach((row, y) => {
    let x = 0;
    while (x < size) {
      if (!row[x] || inFinder(size, x, y)) {
        x++;
        continue;
      }
      const start = x;
      while (x < size && row[x] && !inFinder(size, x, y)) {
        x++;
      }
      runs.push(`M${ start + QUIET_ZONE } ${ y + QUIET_ZONE }h${ x - start }v1h-${ x - start }z`);
    }
  });
  return runs.join('');
}

// A rounded ring around a rounded square: the same 7-5-3 nesting a reader looks for, with
// corners it does not care about softened to match the wordmark's hand.
function finder(x: number, y: number): string {
  return (
    `<path fill-rule="evenodd" d="${ roundedRect(x, y, FINDER, FINDER, 1.75) }${ roundedRect(x + 1, y + 1, 5, 5, 1.25) }"/>` +
    `<rect x="${ x + 2 }" y="${ y + 2 }" width="3" height="3" rx="0.75"/>`
  );
}

function roundedRect(x: number, y: number, width: number, height: number, radius: number): string {
  const w = width - 2 * radius;
  const h = height - 2 * radius;
  const arc = (dx: number, dy: number) => `a${ radius } ${ radius } 0 0 1 ${ dx } ${ dy }`;
  return (
    `M${ x + radius } ${ y }h${ w }${ arc(radius, radius) }v${ h }${ arc(-radius, radius) }` +
    `h-${ w }${ arc(-radius, -radius) }v-${ h }${ arc(radius, -radius) }z`
  );
}

function wordmark(window: Window): string {
  const innerWidth = window.width - 2 * WORDMARK_INSET;
  const innerHeight = window.height - 2 * WORDMARK_INSET;
  const scale = Math.min(innerWidth / WORDMARK.width, innerHeight / WORDMARK.height);
  const width = WORDMARK.width * scale;
  const height = WORDMARK.height * scale;
  const tx = QUIET_ZONE + window.x + (window.width - width) / 2;
  const ty = QUIET_ZONE + window.y + (window.height - height) / 2;
  const paths = WORDMARK.paths.map((path) => `<path fill="${ path.fill }" d="${ path.d }"/>`).join('');
  return `<g transform="translate(${ fixed(tx) } ${ fixed(ty) }) scale(${ fixed(scale) })">${ paths }</g>`;
}

function fixed(value: number): string {
  return String(Number(value.toFixed(5)));
}
