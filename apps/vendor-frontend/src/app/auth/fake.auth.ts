import { Injectable, Signal, signal, WritableSignal } from '@angular/core';

@Injectable()
export class FakeAuth {

  private _isAuthenticated: WritableSignal<boolean> = signal(false);
  loginStarted = false;

  isAuthenticated(): Signal<boolean> {
    return this._isAuthenticated.asReadonly();
  }

  login(): void {
    this.loginStarted = true;
    this._isAuthenticated.set(true);
  }
}
