import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { UsersPage } from './users';

describe('UsersPage', () => {
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [UsersPage],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('renders a row per user with its email and vendorId, blank when unattributed', async () => {
    const fixture = TestBed.createComponent(UsersPage);
    http.expectOne('/api/users').flush([
      { email: 'a@x.com', vendorId: 'uuid-1', subdomain: 'acme' },
      { email: 'b@x.com', vendorId: '', subdomain: '' },
    ]);
    await fixture.whenStable();

    const items = fixture.nativeElement.querySelectorAll('ul li');
    expect(items.length).toBe(2);
    expect(items[0].textContent).toContain('a@x.com');
    expect(items[0].textContent).toContain('uuid-1');
    expect(items[0].textContent).toContain('acme');
    expect(items[1].textContent).toContain('b@x.com');
    expect(items[1].textContent).not.toContain('uuid');
  });
});
