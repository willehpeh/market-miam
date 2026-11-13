import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideState, provideStore } from '@ngrx/store';
import { provideEffects } from '@ngrx/effects';
import { Invitations } from './invitations';
import { HttpInvitations } from './http.invitations';
import { invitationFeature } from './invitation.state';
import { InvitationEffects } from './invitation.effects';
import { InvitationFacade } from './invitation.facade';
import { StoreInvitationFacade } from './store.invitation.facade';

const VENDORS = (url: string) => url.endsWith('/api/ops/vendors');

// The invitation feature from its facade to the operator API (ADR 0061).
describe('Invitations', () => {
  let facade: InvitationFacade;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        { provide: Invitations, useClass: HttpInvitations },
        provideStore(),
        provideState(invitationFeature),
        provideEffects(InvitationEffects),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: InvitationFacade, useClass: StoreInvitationFacade },
      ],
    });
    facade = TestBed.inject(InvitationFacade);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('sends the address to the operator API, and reports whom the invitation went to once accepted', () => {
    facade.invite('marie@example.com');

    const request = http.expectOne((req) => VENDORS(req.url));
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({ email: 'marie@example.com' });
    request.flush({ vendorId: 'new-vendor' }, { status: 202, statusText: 'Accepted' });

    expect(facade.sentTo()).toBe('marie@example.com');
  });

  it('reports sending while the invitation is in flight, and only then', () => {
    expect(facade.sending()).toBe(false);

    facade.invite('marie@example.com');
    const request = http.expectOne((req) => VENDORS(req.url));
    expect(facade.sending()).toBe(true);

    request.flush({ vendorId: 'new-vendor' }, { status: 202, statusText: 'Accepted' });
    expect(facade.sending()).toBe(false);
  });

  it('reports an address an account already holds, and stops sending', () => {
    facade.invite('owner@acme.test');
    http.expectOne((req) => VENDORS(req.url)).flush({ statusCode: 409 }, { status: 409, statusText: 'Conflict' });

    expect(facade.refusal()).toBe('email-in-use');
    expect(facade.sending()).toBe(false);
    expect(facade.sentTo()).toBeNull();
  });

  it('reports an address the API finds malformed, and stops sending', () => {
    facade.invite('marie@example');
    http.expectOne((req) => VENDORS(req.url)).flush({ statusCode: 400 }, { status: 400, statusText: 'Bad Request' });

    expect(facade.refusal()).toBe('invalid-email');
    expect(facade.sending()).toBe(false);
  });
});
