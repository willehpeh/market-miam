import { Injectable } from '@angular/core';
import { QrCodeDownload, QrCodeImage } from './qr-code-download';

// 2048 px across is 17 cm at 300 dpi: an A5 flyer or a stall sign prints sharp, and a
// phone screen shows it downscaled. The SVG carries its own quiet zone, so the margin
// here is only what the caption needs to breathe.
const WIDTH = 2048;
const MARGIN = 96;
const CAPTION_SIZE = 96;
const SMALLEST_CAPTION = 32;
const FONT_FAMILY = '"Hanken Grotesk", ui-sans-serif, system-ui, sans-serif';
const INK = '#2a241e';
const PAPER = '#ffffff';

// ponytail: no spec. Decode, draw and encode need a real canvas and the suite runs in
// jsdom, which has none. The code itself is pure and tested in branded-qr-code.spec.ts;
// what is left here is browser plumbing, and it rejects rather than fails quietly.
@Injectable()
export class CanvasQrCodeDownload extends QrCodeDownload {
  async save({ svg, caption, fileName }: QrCodeImage): Promise<void> {
    const image = await decode(svg);
    const codeSide = WIDTH - 2 * MARGIN;
    const captionTop = MARGIN + codeSide;
    const canvas = document.createElement('canvas');
    canvas.width = WIDTH;
    canvas.height = captionTop + CAPTION_SIZE + MARGIN;
    const context = canvas.getContext('2d');
    if (!context) {
      throw new Error('No 2d canvas context');
    }
    context.fillStyle = PAPER;
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(image, MARGIN, MARGIN, codeSide, codeSide);

    await loadFont();
    context.fillStyle = INK;
    context.textAlign = 'center';
    context.textBaseline = 'top';
    context.font = fitting(context, caption, WIDTH - 2 * MARGIN);
    context.fillText(caption, WIDTH / 2, captionTop);

    const blob = await toPng(canvas);
    if (!blob) {
      throw new Error('PNG encoding failed');
    }
    offer(blob, fileName);
  }
}

function decode(svg: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('SVG failed to decode'));
    image.src = `data:image/svg+xml;charset=utf-8,${ encodeURIComponent(svg) }`;
  });
}

// The page has the typeface (fonts.css), but a canvas draws with whatever is loaded at
// that instant. Asked for explicitly; the fallback stack still sets the address if the
// font never comes.
async function loadFont(): Promise<void> {
  try {
    await document.fonts.load(`bold ${ CAPTION_SIZE }px ${ FONT_FAMILY }`);
  } catch {
    return;
  }
}

// A 63-character label is a legal subdomain and would run off the paper at the size a
// short one deserves.
function fitting(context: CanvasRenderingContext2D, text: string, maxWidth: number): string {
  for (let size = CAPTION_SIZE; size > SMALLEST_CAPTION; size -= 4) {
    context.font = `bold ${ size }px ${ FONT_FAMILY }`;
    if (context.measureText(text).width <= maxWidth) {
      return context.font;
    }
  }
  return `bold ${ SMALLEST_CAPTION }px ${ FONT_FAMILY }`;
}

function toPng(canvas: HTMLCanvasElement): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
}

function offer(blob: Blob, fileName: string): void {
  const href = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = href;
  anchor.download = fileName;
  anchor.click();
  // Not revoked on the spot: the click is dispatched, but the fetch it starts is not
  // synchronous everywhere, and iOS opens the blob in a viewer that reads it later.
  setTimeout(() => URL.revokeObjectURL(href), 60_000);
}
