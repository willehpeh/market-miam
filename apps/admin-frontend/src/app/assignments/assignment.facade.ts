import { Signal } from '@angular/core';
import { RefusedAssignment } from './assignments';

export abstract class AssignmentFacade {
  abstract readonly assigning: Signal<string | null>;
  abstract readonly refused: Signal<RefusedAssignment | null>;

  abstract assign(vendorId: string, subdomain: string): void;
}
