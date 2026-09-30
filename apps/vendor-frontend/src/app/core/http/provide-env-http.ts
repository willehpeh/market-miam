import { EnvironmentProviders, isDevMode, makeEnvironmentProviders } from '@angular/core';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { devAuthInterceptor } from '../auth/dev-auth.interceptor';
import { errorInterceptor } from '../notifications/error.interceptor';
import { authHttpInterceptorFn } from '@auth0/auth0-angular';

const DEV_INTERCEPTORS = [devAuthInterceptor, errorInterceptor];
const PROD_INTERCEPTORS = [authHttpInterceptorFn, errorInterceptor];

export function provideEnvHttp(): EnvironmentProviders {
  return makeEnvironmentProviders([
    provideHttpClient(
      withInterceptors(isDevMode()
        ? DEV_INTERCEPTORS
        : PROD_INTERCEPTORS
    ))
  ])
}
