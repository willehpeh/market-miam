import { Signal } from '@angular/core';

export abstract class ErasureFacade {
  abstract readonly erasing: Signal<string | null>;

  abstract erase(vendorId: string): void;
}
