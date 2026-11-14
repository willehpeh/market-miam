import { Injectable, signal } from '@angular/core';
import { AssignmentFacade } from './assignment.facade';
import { RefusedAssignment } from './assignments';

@Injectable()
export class FakeAssignmentFacade implements AssignmentFacade {
  readonly assigning = signal<string | null>(null);
  readonly refused = signal<RefusedAssignment | null>(null);
  readonly assigned: { vendorId: string; subdomain: string }[] = [];

  assign(vendorId: string, subdomain: string): void {
    this.assigned.push({ vendorId, subdomain });
  }
}
