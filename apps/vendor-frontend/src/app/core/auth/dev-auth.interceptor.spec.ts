import { TestBed } from '@angular/core/testing';
import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { devAuthInterceptor } from './dev-auth.interceptor';

function get(): string {
  TestBed.inject(HttpClient).get('/api/storefront').subscribe();
  const req = TestBed.inject(HttpTestingController).expectOne('/api/storefront');
  req.flush(null);
  return req.request.headers.get('Authorization') ?? '';
}

function visit(query: string): void {
  history.replaceState({}, '', `/${query}`);
}

describe('Dev auth interceptor', () => {
  beforeEach(() => {
    localStorage.clear();
    visit('');
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([devAuthInterceptor])),
        provideHttpClientTesting(),
      ],
    });
  });

  afterEach(() => {
    TestBed.inject(HttpTestingController).verify();
    localStorage.clear();
    visit('');
  });

  it('sends the stub token the API accepts', () => {
    expect(get()).toBe('Bearer dev');
  });

  it('names the vendor asked for in the query string', () => {
    visit('?vendor=demo-vendor');

    expect(get()).toBe('Bearer dev:demo-vendor');
  });

  it('keeps signing in as that vendor once the query string is gone', () => {
    visit('?vendor=demo-vendor');
    get();

    visit('');

    expect(get()).toBe('Bearer dev:demo-vendor');
  });

  it('switches back when another vendor is asked for', () => {
    visit('?vendor=demo-vendor');
    get();

    visit('?vendor=dev-vendor');

    expect(get()).toBe('Bearer dev:dev-vendor');
  });
});
