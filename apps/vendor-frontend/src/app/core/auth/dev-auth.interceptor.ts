import { HttpInterceptorFn } from '@angular/common/http';

const DEV_VENDOR_KEY = 'devVendorId';

// Dev-only: the API fakes auth in development but its guard still requires a
// bearer credential, so send a stub token. The real access-token interceptor
// (authHttpInterceptorFn) replaces this in production.
//
// `?vendor=<id>` picks which seeded vendor you sign in as — the id rides on the
// token and DevelopmentTokenVerifier trusts it. Remembered afterwards, since the
// router drops query params on the first navigation. Reset with ?vendor=dev-vendor.
function devVendorId(): string | null {
  const requested = new URLSearchParams(window.location.search).get('vendor');
  if (requested) {
    localStorage.setItem(DEV_VENDOR_KEY, requested);
  }
  return localStorage.getItem(DEV_VENDOR_KEY);
}

export const devAuthInterceptor: HttpInterceptorFn = (request, next) => {
  const vendorId = devVendorId();
  return next(
    request.clone({ setHeaders: { Authorization: vendorId ? `Bearer dev:${vendorId}` : 'Bearer dev' } }),
  );
};
