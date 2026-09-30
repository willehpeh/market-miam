type Status = 'registered' | 'unregistered';

export class VendorStatus {

  private constructor(private readonly _status: Status) {
  }

  static registered(): VendorStatus {
    return new VendorStatus('registered');
  }

  static unregistered(): VendorStatus {
    return new VendorStatus('unregistered');
  }

  isRegistered(): boolean {
    return this._status === 'registered';
  }
}
