import { TestBed } from '@angular/core/testing';
import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { devAuthInterceptor } from './dev-auth.interceptor';

function authorizationSentTo(url: string): string | null {
  TestBed.inject(HttpClient).get(url).subscribe();
  const req = TestBed.inject(HttpTestingController).expectOne(url);
  req.flush(null);
  return req.request.headers.get('Authorization');
}

describe('Dev auth interceptor', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(withInterceptors([devAuthInterceptor])), provideHttpClientTesting()],
    });
  });

  afterEach(() => TestBed.inject(HttpTestingController).verify());

  it('sends the stub token the API accepts in development', () => {
    expect(authorizationSentTo('/api/ops/whoami')).toBe('Bearer dev');
  });

  it('sends nothing to another origin', () => {
    expect(authorizationSentTo('https://elsewhere.example/api/ops/whoami')).toBeNull();
  });
});
