import { Injectable, Signal, signal, WritableSignal } from '@angular/core';
import { Auth } from './auth';

@Injectable()
export class FakeAuth implements Auth {
  loginStarted = false;
  loggedOut = false;
  private _isAuthenticated: WritableSignal<boolean> = signal(false);
  private _isAuthLoading: WritableSignal<boolean> = signal(false);

  logout(): void {
    this.loggedOut = true;
    this._isAuthenticated.set(false);
  }

  isAuthenticated(): Signal<boolean> {
    return this._isAuthenticated.asReadonly();
  }

  login(): void {
    this.loginStarted = true;
    this._isAuthenticated.set(true);
  }

  isLoading(): Signal<boolean> {
    return this._isAuthLoading.asReadonly();
  }

  setLoading(status: boolean): void {
    this._isAuthLoading.set(status);
  }
}
