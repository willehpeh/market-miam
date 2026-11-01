import { EnvironmentProviders, isDevMode, makeEnvironmentProviders } from '@angular/core';
import { provideHttpClient, withFetch, withInterceptors } from '@angular/common/http';
import { authHttpInterceptorFn } from '@auth0/auth0-angular';
import { devAuthInterceptor } from '../auth/dev-auth.interceptor';

export function provideEnvHttp(): EnvironmentProviders {
  return makeEnvironmentProviders([
    provideHttpClient(withFetch(), withInterceptors([isDevMode() ? devAuthInterceptor : authHttpInterceptorFn])),
  ]);
}
