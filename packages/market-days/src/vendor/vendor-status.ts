type Status = 'registered' | 'unregistered';

export class VendorStatus {
  private readonly _status: Status;

  private constructor(status: Status) {
    this._status = status;
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
