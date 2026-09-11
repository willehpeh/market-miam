import { Injectable } from '@angular/core';
import { QrCodeExport, QrCodeImage } from './qr-code-export';

@Injectable()
export class FakeQrCodeExport extends QrCodeExport {
  shareable = true;
  saved: QrCodeImage[] = [];
  shared: QrCodeImage[] = [];
  outcome: 'done' | 'failed' | 'backed-out' = 'done';
  /** When set, `save` and `share` stay pending until `finish()` — for what the screen shows meanwhile. */
  holding = false;
  private release: (() => void) | undefined;

  canShare(): boolean {
    return this.shareable;
  }

  save(image: QrCodeImage): Promise<void> {
    this.saved.push(image);
    return this.settle().then(() => undefined);
  }

  share(image: QrCodeImage): Promise<'shared' | null> {
    this.shared.push(image);
    return this.settle().then(() => (this.outcome === 'backed-out' ? null : 'shared'));
  }

  finish(): void {
    this.release?.();
  }

  private settle(): Promise<void> {
    if (this.outcome === 'failed') {
      return Promise.reject(new Error('export failed'));
    }
    if (!this.holding) {
      return Promise.resolve();
    }
    return new Promise((resolve) => {
      this.release = resolve;
    });
  }
}
