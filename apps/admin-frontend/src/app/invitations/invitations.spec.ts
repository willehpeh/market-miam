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

  it('sends the address to the operator API, and reports the invitation sent once accepted', () => {
    facade.invite('marie@example.com');

    const request = http.expectOne((req) => VENDORS(req.url));
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({ email: 'marie@example.com' });
    request.flush({ vendorId: 'new-vendor' }, { status: 202, statusText: 'Accepted' });

    expect(facade.status()).toBe('sent');
  });
});
