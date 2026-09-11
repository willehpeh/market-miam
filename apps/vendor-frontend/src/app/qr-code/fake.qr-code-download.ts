import { Injectable } from '@angular/core';
import { QrCodeDownload, QrCodeImage } from './qr-code-download';

@Injectable()
export class FakeQrCodeDownload extends QrCodeDownload {
  saved: QrCodeImage[] = [];
  outcome: 'saved' | 'failed' = 'saved';
  /** When set, `save` stays pending until `finish()` — for what the screen shows meanwhile. */
  holding = false;
  private release: (() => void) | undefined;

  save(image: QrCodeImage): Promise<void> {
    this.saved.push(image);
    if (this.outcome === 'failed') {
      return Promise.reject(new Error('download failed'));
    }
    if (!this.holding) {
      return Promise.resolve();
    }
    return new Promise((resolve) => {
      this.release = resolve;
    });
  }

  finish(): void {
    this.release?.();
  }
}
