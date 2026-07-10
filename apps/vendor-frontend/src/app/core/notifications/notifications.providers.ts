import { EnvironmentProviders, makeEnvironmentProviders } from '@angular/core';
import { provideState } from '@ngrx/store';
import { notificationsFeature } from './notifications.state';
import { NotificationsFacade } from './notifications.facade';
import { StoreNotificationsFacade } from './store.notifications.facade';

export function provideNotifications(): EnvironmentProviders {
  return makeEnvironmentProviders([
    provideState(notificationsFeature),
    { provide: NotificationsFacade, useClass: StoreNotificationsFacade },
  ]);
}
