type Status = 'registered' | 'unregistered' | 'erased';

export class VendorStatus {

  private constructor(private readonly _status: Status) {
  }

  static registered(): VendorStatus {
    return new VendorStatus('registered');
  }

  static unregistered(): VendorStatus {
    return new VendorStatus('unregistered');
  }

  static erased(): VendorStatus {
    return new VendorStatus('erased');
  }

  isRegistered(): boolean {
    return this._status === 'registered';
  }

  isErased(): boolean {
    return this._status === 'erased';
  }
}
