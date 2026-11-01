import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { AccountList } from './account-list';

const ACCOUNTS = (url: string) => url.endsWith('/api/ops/accounts');

describe('AccountList', () => {
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [AccountList],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  async function renderWith(respond: (url: string) => void): Promise<HTMLElement> {
    const fixture = TestBed.createComponent(AccountList);
    respond('');
    await fixture.whenStable();
    return fixture.nativeElement;
  }

  it('lists each account with its subdomain and vendor id', async () => {
    const page = await renderWith(() =>
      http.expectOne((req) => ACCOUNTS(req.url)).flush([
        { email: 'owner@acme.test', vendorId: 'acme-bakery', subdomain: 'acme' },
        { email: 'owner@brioche.test', vendorId: 'brioche-co', subdomain: null },
      ]),
    );

    const rows = page.querySelectorAll('li');
    expect(rows).toHaveLength(2);
    expect(rows[0].textContent).toContain('owner@acme.test');
    expect(rows[0].querySelector('a')?.getAttribute('href')).toBe('https://acme.marketmiam.fr');
    expect(rows[0].textContent).toContain('acme.marketmiam.fr');
    expect(rows[0].textContent).toContain('acme-bakery');
    expect(rows[1].textContent).toContain('no subdomain');
  });

  it('marks an account that is not a vendor, and one without an email', async () => {
    const page = await renderWith(() =>
      http.expectOne((req) => ACCOUNTS(req.url)).flush([
        { email: 'operator@marketmiam.test', vendorId: null, subdomain: null },
        { email: null, vendorId: 'no-email-vendor', subdomain: null },
      ]),
    );

    const rows = page.querySelectorAll('li');
    expect(rows[0].textContent).toContain('not a vendor');
    expect(rows[1].textContent).toContain('no email');
  });

  it('says when there are no accounts', async () => {
    const page = await renderWith(() => http.expectOne((req) => ACCOUNTS(req.url)).flush([]));

    expect(page.textContent).toContain('No accounts');
  });

  it('says so when the accounts cannot be loaded', async () => {
    const page = await renderWith(() =>
      http.expectOne((req) => ACCOUNTS(req.url)).flush(null, { status: 500, statusText: 'Server Error' }),
    );

    expect(page.textContent).toContain('The accounts could not be loaded');
  });
});
