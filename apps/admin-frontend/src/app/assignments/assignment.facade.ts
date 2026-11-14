import { Signal } from '@angular/core';

export abstract class AssignmentFacade {
  abstract readonly assigning: Signal<string | null>;

  abstract assign(vendorId: string, subdomain: string): void;
}
