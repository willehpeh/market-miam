import jsQR from 'jsqr';
import { BRAND, BRAND_DEEP, brandedQrCode, BrandedQrCode, QUIET_ZONE } from './branded-qr-code';

// The code as a phone would see it: white paper, the finders in brand and the data in
// brand-deep, so the decode proves the two colours read as dark and not only the geometry.
function rasterise(code: BrandedQrCode, scale = 6): { data: Uint8ClampedArray; side: number } {
  const side = (code.size + 2 * QUIET_ZONE) * scale;
  const data = new Uint8ClampedArray(side * side * 4).fill(255);
  code.modules.forEach((row, y) =>
    row.forEach((dark, x) => {
      if (!dark) {
        return;
      }
      const [r, g, b] = rgb(finder(code.size, x, y) ? BRAND : BRAND_DEEP);
      for (let dy = 0; dy < scale; dy++) {
        for (let dx = 0; dx < scale; dx++) {
          const offset = (((y + QUIET_ZONE) * scale + dy) * side + (x + QUIET_ZONE) * scale + dx) * 4;
          data[offset] = r;
          data[offset + 1] = g;
          data[offset + 2] = b;
        }
      }
    }),
  );
  return { data, side };
}

function finder(size: number, x: number, y: number): boolean {
  return (x < 7 || x >= size - 7) && y < 7 || (x < 7 && y >= size - 7);
}

function rgb(hex: string): [number, number, number] {
  return [1, 3, 5].map((at) => parseInt(hex.slice(at, at + 2), 16)) as [number, number, number];
}

function decode(code: BrandedQrCode): string | undefined {
  const { data, side } = rasterise(code);
  return jsQR(data, side, side)?.data;
}

const longestLabel = 'x'.repeat(63);

describe('brandedQrCode', () => {
  it('reads as the storefront address with the wordmark window cut out of it', () => {
    const url = 'https://chez-mohamed.marketmiam.fr';

    expect(decode(brandedQrCode(url))).toBe(url);
  });

  it('reads at the shortest address, where the window is the largest share of the code', () => {
    const url = 'https://a.marketmiam.fr';

    expect(decode(brandedQrCode(url))).toBe(url);
  });

  it('reads at the longest subdomain a host label allows', () => {
    const url = `https://${ longestLabel }.marketmiam.fr`;

    expect(decode(brandedQrCode(url))).toBe(url);
  });

  it('keeps the window under a tenth of the modules at every size an address reaches', () => {
    for (const label of ['a', 'demo', 'chez-mohamed', 'la-table-de-margaux-et-ses-amis', longestLabel]) {
      const code = brandedQrCode(`https://${ label }.marketmiam.fr`);
      const cleared = code.window.width * code.window.height;

      expect(cleared / (code.size * code.size)).toBeLessThan(0.1);
    }
  });

  it('sets the window in the middle of the code, clear of the finders', () => {
    const code = brandedQrCode('https://demo.marketmiam.fr');
    const { x, y, width, height } = code.window;

    expect(x).toBeGreaterThan(8);
    expect(y).toBeGreaterThan(8);
    expect(x + width).toBeLessThan(code.size - 8);
    expect(y + height).toBeLessThan(code.size - 8);
    expect(Math.abs(x + width / 2 - code.size / 2)).toBeLessThanOrEqual(1);
    expect(Math.abs(y + height / 2 - code.size / 2)).toBeLessThanOrEqual(1);
  });

  it('leaves no dark module inside the window', () => {
    const code = brandedQrCode('https://demo.marketmiam.fr');
    const { x, y, width, height } = code.window;

    for (let row = y; row < y + height; row++) {
      for (let column = x; column < x + width; column++) {
        expect(code.modules[row][column]).toBe(false);
      }
    }
  });

  it('surrounds the code with the quiet zone readers look for', () => {
    const code = brandedQrCode('https://demo.marketmiam.fr');
    const side = code.size + 2 * QUIET_ZONE;

    expect(code.svg).toContain(`viewBox="0 0 ${ side } ${ side }"`);
    expect(code.svg).toContain(`<rect width="${ side }" height="${ side }" fill="#ffffff"/>`);
  });

  it('paints the data in brand-deep and the finders in brand, with the wordmark in its window', () => {
    const code = brandedQrCode('https://demo.marketmiam.fr');

    expect(code.svg).toContain(`<path fill="${ BRAND_DEEP }" d="M`);
    expect(code.svg).toContain(`<g fill="${ BRAND }">`);
    expect(code.svg).toContain('<path fill="#c8532b" d="M');
    expect(code.svg).toContain('<path fill="#81331e" d="M');
  });

  it('declares an intrinsic size, so a canvas draws it at more than nothing', () => {
    const code = brandedQrCode('https://demo.marketmiam.fr');

    expect(code.svg).toMatch(/^<svg [^>]*width="\d+" height="\d+"/);
  });

  it('gives the same address the same code every time', () => {
    expect(brandedQrCode('https://demo.marketmiam.fr').svg).toBe(brandedQrCode('https://demo.marketmiam.fr').svg);
  });
});
