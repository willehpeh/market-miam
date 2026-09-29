// WCAG 2.x relative luminance and contrast ratio, for the swatches. Hex only — all
// tokens.css holds — but in three digits as well as six: the build minifies #ffffff to
// #fff, and that is what the browser hands back for the live value.

function channel(value: number): number {
  const srgb = value / 255;
  return srgb <= 0.03928 ? srgb / 12.92 : ((srgb + 0.055) / 1.055) ** 2.4;
}

function luminance(hex: string): number {
  const rgb = parseInt(hex.slice(1), 16);
  return 0.2126 * channel((rgb >> 16) & 0xff) + 0.7152 * channel((rgb >> 8) & 0xff) + 0.0722 * channel(rgb & 0xff);
}

function expand(hex: string): string | undefined {
  if (/^#[0-9a-f]{6}$/i.test(hex)) return hex;
  if (/^#[0-9a-f]{3}$/i.test(hex)) return '#' + [...hex.slice(1)].map((digit) => digit + digit).join('');
  return undefined;
}

export function contrast(foreground: string, background: string): number | undefined {
  const [fg, bg] = [expand(foreground), expand(background)];
  if (!fg || !bg) return undefined;
  const [light, dark] = [luminance(fg), luminance(bg)].sort((a, b) => b - a);
  return (light + 0.05) / (dark + 0.05);
}

/** `4.9:1 AA`, `3.2:1 AA large`, or just the ratio when it clears neither. */
export function describeContrast(ratio: number | undefined): string {
  if (ratio === undefined) return '';
  const grade = ratio >= 4.5 ? ' AA' : ratio >= 3 ? ' AA large' : '';
  return `${ratio.toFixed(1)}:1${grade}`;
}
