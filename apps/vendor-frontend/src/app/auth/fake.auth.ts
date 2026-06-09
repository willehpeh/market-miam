import { Injectable, Signal, signal, WritableSignal } from '@angular/core';
import { Auth } from './auth';

@Injectable()
export class FakeAuth implements Auth {

  private _isAuthenticated: WritableSignal<boolean> = signal(false);
  private _isAuthLoading: WritableSignal<boolean> = signal(false);
  loginStarted = false;

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
