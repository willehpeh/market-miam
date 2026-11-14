import { inject, Injectable } from '@angular/core';
import { Store } from '@ngrx/store';
import { AssignmentFacade } from './assignment.facade';
import { AssignSubdomain } from './assignment.state';

@Injectable()
export class StoreAssignmentFacade implements AssignmentFacade {
  private readonly store = inject(Store);

  assign(vendorId: string, subdomain: string): void {
    this.store.dispatch(AssignSubdomain({ vendorId, subdomain }));
  }
}
