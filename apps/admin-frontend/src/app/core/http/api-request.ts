import { environment } from '../../../environments/environment';

// A credential has no business on a third-party call. Compared by origin rather than
// prefix because development leaves apiBaseUrl empty to keep requests relative.
export function isApiRequest(url: string): boolean {
  const base = document.baseURI;
  return new URL(url, base).origin === new URL(environment.apiBaseUrl || '/', base).origin;
}
