import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Auth } from '../core/auth/auth';
import { FakeAuth } from '../core/auth/fake.auth';
import { OperatorPage } from './operator-page';

const WHOAMI = (url: string) => url.endsWith('/api/ops/whoami');
const ACCOUNTS = (url: string) => url.endsWith('/api/ops/accounts');

describe('OperatorPage', () => {
  let auth: FakeAuth;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [OperatorPage],
      providers: [
        { provide: Auth, useClass: FakeAuth },
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    });
    auth = TestBed.inject(Auth) as FakeAuth;
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    // The account list is AccountList's to test; here it only has to be answered.
    http.match((req) => ACCOUNTS(req.url)).forEach((req) => req.flush([]));
    http.verify();
  });

  async function render(): Promise<HTMLElement> {
    const fixture = TestBed.createComponent(OperatorPage);
    await fixture.whenStable();
    return fixture.nativeElement;
  }

  it('offers to sign in when no one is, without calling the API', async () => {
    const page = await render();

    expect(page.querySelector('button')?.textContent).toContain('Sign in with GitHub');
    http.expectNone((req) => WHOAMI(req.url));
  });

  it('starts the sign-in when asked', async () => {
    const page = await render();

    page.querySelector('button')?.click();

    expect(auth.loginStarted).toBe(true);
    // The fake signs in at once, so the page goes on to ask the API.
    http.expectOne((req) => WHOAMI(req.url)).flush({ operatorId: 'github|1234567' });
  });

  it('shows who the API says is signed in', async () => {
    auth.login();
    const fixture = TestBed.createComponent(OperatorPage);

    http.expectOne((req) => WHOAMI(req.url)).flush({ operatorId: 'github|1234567' });
    await fixture.whenStable();

    expect(fixture.nativeElement.textContent).toContain('github|1234567');
  });

  it('lists the accounts once the API has confirmed the operator', async () => {
    auth.login();
    const fixture = TestBed.createComponent(OperatorPage);
    http.expectNone((req) => ACCOUNTS(req.url));

    http.expectOne((req) => WHOAMI(req.url)).flush({ operatorId: 'github|1234567' });
    await fixture.whenStable();
    http.expectOne((req) => ACCOUNTS(req.url)).flush([
      { email: 'owner@acme.test', vendorId: 'acme-bakery', subdomain: 'acme' },
    ]);
    await fixture.whenStable();

    expect(fixture.nativeElement.textContent).toContain('owner@acme.test');
  });

  it('says so when the API refuses the sign-in, and asks it for nothing more', async () => {
    auth.login();
    const fixture = TestBed.createComponent(OperatorPage);

    http.expectOne((req) => WHOAMI(req.url)).flush(null, { status: 403, statusText: 'Forbidden' });
    await fixture.whenStable();

    expect(fixture.nativeElement.textContent).toContain('The API refused this sign-in');
    http.expectNone((req) => ACCOUNTS(req.url));
  });

  it('signs out', async () => {
    auth.login();
    const fixture = TestBed.createComponent(OperatorPage);
    http.expectOne((req) => WHOAMI(req.url)).flush({ operatorId: 'github|1234567' });
    await fixture.whenStable();

    const signOut = Array.from<HTMLButtonElement>(fixture.nativeElement.querySelectorAll('button')).find((button) =>
      button.textContent?.includes('Sign out'),
    );
    signOut?.click();

    expect(auth.loggedOut).toBe(true);
  });
});
