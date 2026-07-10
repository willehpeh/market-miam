import { inject, Injectable } from '@angular/core';
import { Store } from '@ngrx/store';
import { NotificationsFacade } from './notifications.facade';
import { ErrorDismissed, notificationsFeature } from './notifications.state';

@Injectable()
export class StoreNotificationsFacade implements NotificationsFacade {
  private readonly store = inject(Store);

  readonly message = this.store.selectSignal(notificationsFeature.selectMessage);

  dismiss(): void {
    this.store.dispatch(ErrorDismissed());
  }
}
