import { Injectable } from '@angular/core';
import { Auth } from './auth';
import { BehaviorSubject, Observable } from 'rxjs';

@Injectable()
export class FakeAuth implements Auth {
  static USER_ID = 'fake|user';
  loginStarted = false;
  loggedOut = false;
  private readonly _isLoading = new BehaviorSubject<boolean>(false);
  private readonly _userId = new BehaviorSubject<string | null>(null);

  login(): void {
    this.loginStarted = true;
    this._userId.next(FakeAuth.USER_ID);
  }

  logout(): void {
    this.loggedOut = true;
    this._userId.next(null);
  }

  isLoading$(): Observable<boolean> {
    return this._isLoading.asObservable();
  }

  userId$(): Observable<string | null> {
    return this._userId.asObservable();
  }

  setLoading(status: boolean): void {
    this._isLoading.next(status);
  }
}
