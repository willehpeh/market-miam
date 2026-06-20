import { inject, Injectable } from '@angular/core';
import { Auth } from './auth';
import { AuthService } from '@auth0/auth0-angular';
import { map, Observable } from 'rxjs';

@Injectable()
export class Auth0Auth implements Auth {

  private readonly _auth = inject(AuthService);

  login(): void {
    this._auth.loginWithRedirect();
  }

  logout(): void {
    this._auth.logout();
  }

  isLoading$(): Observable<boolean> {
    return this._auth.isLoading$;
  }

  userId$(): Observable<string | null> {
    return this._auth.user$.pipe(map(user => user?.sub ?? null));
  }
}
