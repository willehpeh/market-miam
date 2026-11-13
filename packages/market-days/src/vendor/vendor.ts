import { Aggregate } from '@market-miam/event-sourcing';
import { VendorId } from '@market-miam/shared-kernel';
import { Email, Instant, SignInAddress } from '@market-miam/common';
import { VendorErased, VendorEvent, VendorInvited, VendorLegalIdentityProvided, VendorRegistered } from './events';
import { ErasedVendor, InvitedVendor, RegisteredVendor, UnknownVendor, VendorState } from './vendor-state';
import { LegalIdentity } from './legal-identity';
import { LegalIdentityOnRecord, NoLegalIdentity, ProvidedLegalIdentity } from './legal-identity-on-record';

export class Vendor extends Aggregate {

  private _state: VendorState = new UnknownVendor();
  private _legalIdentity: LegalIdentityOnRecord = new NoLegalIdentity();

  constructor(private readonly _id: VendorId) {
    super();
  }

  invite(invitedAt: Instant, address: SignInAddress) {
    this._state.invite(() => this.raise(this.invited(invitedAt, address)));
  }

  register(registeredAt: Instant, email: Email) {
    this._state.register(() => this.raise(this.registered(registeredAt, email)));
  }

  provideLegalIdentity(identity: LegalIdentity) {
    this._state.provideLegalIdentity(() => {
      const payload = identity.providedBy(this._id.value());
      if (!this._legalIdentity.equals(new ProvidedLegalIdentity(payload))) {
        this.raise(this.legalIdentityProvided(payload));
      }
    });
  }

  erase(erasedAt: Instant) {
    this._state.erase(() => this.raise(this.erased(erasedAt)));
  }

  isErased(): boolean {
    return this._state.isErased();
  }

  // Complete once provided: the value objects checked every field when it was recorded.
  hasCompleteLegalIdentity(): boolean {
    return this._legalIdentity.isProvided();
  }

  private invited(invitedAt: Instant, address: SignInAddress): VendorInvited {
    return {
      type: 'VendorInvited',
      payload: { vendorId: this._id.value(), invitedAt: invitedAt.value(), email: address.value() },
      version: 1,
    };
  }

  private registered(registeredAt: Instant, email: Email): VendorRegistered {
    return {
      type: 'VendorRegistered',
      payload: { vendorId: this._id.value(), registeredAt: registeredAt.value(), email: email.value() },
      version: 1,
    };
  }

  private legalIdentityProvided(payload: VendorLegalIdentityProvided['payload']): VendorLegalIdentityProvided {
    return { type: 'VendorLegalIdentityProvided', payload, version: 1 };
  }

  private erased(erasedAt: Instant): VendorErased {
    return {
      type: 'VendorErased',
      payload: { vendorId: this._id.value(), erasedAt: erasedAt.value() },
      version: 1,
    };
  }

  apply(event: VendorEvent): void {
    switch (event.type) {
      case 'VendorInvited':
        this._state = new InvitedVendor();
        break;
      case 'VendorRegistered':
        this._state = new RegisteredVendor();
        break;
      case 'VendorLegalIdentityProvided':
        this._legalIdentity = new ProvidedLegalIdentity(event.payload);
        break;
      case 'VendorErased':
        this._state = new ErasedVendor();
        break;
    }
  }
}
