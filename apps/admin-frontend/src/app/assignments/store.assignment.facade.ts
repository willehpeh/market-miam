import { inject, Injectable } from '@angular/core';
import { Store } from '@ngrx/store';
import { AssignmentFacade } from './assignment.facade';
import { AssignSubdomain, assignmentFeature } from './assignment.state';

@Injectable()
export class StoreAssignmentFacade implements AssignmentFacade {
  private readonly store = inject(Store);

  readonly assigning = this.store.selectSignal(assignmentFeature.selectAssigning);

  assign(vendorId: string, subdomain: string): void {
    this.store.dispatch(AssignSubdomain({ vendorId, subdomain }));
  }
}
