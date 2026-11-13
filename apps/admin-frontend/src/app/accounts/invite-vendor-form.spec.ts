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

  async function render() {
    const fixture = TestBed.createComponent(InviteVendorForm);
    await fixture.whenStable();
    return { fixture, form: fixture.nativeElement as HTMLElement };
  }

  // What a browser does as someone types: the value changes, then an input event fires.
  function type(input: HTMLInputElement, text: string): void {
    input.value = text;
    input.dispatchEvent(new Event('input'));
  }

  // The submission is asynchronous: a tick for it to reach the API, or to finish once answered.
  const tick = () => new Promise((resolve) => setTimeout(resolve));

  async function invite(form: HTMLElement) {
    form.querySelector('button')!.click();
    await tick();
    return http.expectOne((req) => VENDORS(req.url));
  }

  async function settle(fixture: { whenStable(): Promise<unknown> }) {
    await tick();
    await fixture.whenStable();
  }

  it('invites the address typed, and says the invitation is sent', async () => {
    const { fixture, form } = await render();
    type(form.querySelector('input')!, 'marie@example.com');

    const request = await invite(form);
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({ email: 'marie@example.com' });
    request.flush({ vendorId: 'new-vendor' }, { status: 202, statusText: 'Accepted' });
    await settle(fixture);

    expect(form.textContent).toContain('Invitation sent');
  });

  it('says when an account already holds the address, keeping it in the field', async () => {
    const { fixture, form } = await render();
    type(form.querySelector('input')!, 'owner@acme.test');

    (await invite(form)).flush({ statusCode: 409 }, { status: 409, statusText: 'Conflict' });
    await settle(fixture);

    expect(form.textContent).toContain('An account already holds this address');
    expect(form.textContent).not.toContain('Invitation sent');
    expect(form.querySelector('input')!.value).toBe('owner@acme.test');
  });

  it('says when the API finds the address malformed, keeping it in the field', async () => {
    const { fixture, form } = await render();
    type(form.querySelector('input')!, 'marie@example');

    (await invite(form)).flush({ statusCode: 400 }, { status: 400, statusText: 'Bad Request' });
    await settle(fixture);

    expect(form.textContent).toContain("That isn't a valid email address");
    expect(form.querySelector('input')!.value).toBe('marie@example');
  });
});
