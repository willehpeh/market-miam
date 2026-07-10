import { Injectable, signal } from '@angular/core';
import { NotificationsFacade } from './notifications.facade';

@Injectable()
export class FakeNotificationsFacade implements NotificationsFacade {
  readonly message = signal<string | undefined>(undefined);
  dismissed = false;

  dismiss(): void {
    this.dismissed = true;
    this.message.set(undefined);
  }
}
