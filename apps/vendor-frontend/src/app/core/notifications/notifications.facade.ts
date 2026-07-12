import { Signal } from '@angular/core';

export abstract class NotificationsFacade {
  abstract readonly message: Signal<string | undefined>;

  abstract dismiss(): void;
}
