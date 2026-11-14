import { Injectable, signal } from '@angular/core';
import { ErasureFacade } from './erasure.facade';

@Injectable()
export class FakeErasureFacade implements ErasureFacade {
  readonly erasing = signal<string | null>(null);
  readonly failed = signal<string | null>(null);
  readonly erased: string[] = [];

  erase(vendorId: string): void {
    this.erased.push(vendorId);
  }
}
