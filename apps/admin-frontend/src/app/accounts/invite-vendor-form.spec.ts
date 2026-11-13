import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { InviteVendorForm } from './invite-vendor-form';

const VENDORS = (url: string) => url.endsWith('/api/ops/vendors');

describe('InviteVendorForm', () => {
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [InviteVendorForm],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  // What a browser does as someone types: the value changes, then an input event fires.
  function type(input: HTMLInputElement, text: string): void {
    input.value = text;
    input.dispatchEvent(new Event('input'));
  }

  it('invites the address typed, and says the invitation is sent', async () => {
    const fixture = TestBed.createComponent(InviteVendorForm);
    const form: HTMLElement = fixture.nativeElement;
    type(form.querySelector('input')!, 'marie@example.com');

    form.querySelector('button')!.click();
    const request = http.expectOne((req) => VENDORS(req.url));
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({ email: 'marie@example.com' });
    request.flush({ vendorId: 'new-vendor' }, { status: 202, statusText: 'Accepted' });
    await fixture.whenStable();

    expect(form.textContent).toContain('Invitation sent');
  });
});
