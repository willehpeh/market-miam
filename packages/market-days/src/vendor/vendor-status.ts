export class VendorStatus {
  private readonly _status: 'reg' | 'unreg';

  private constructor(status: 'reg' | 'unreg') {
    this._status = status;
  }

  static registered(): VendorStatus {
    return new VendorStatus('reg');
  }

  static unregistered(): VendorStatus {
    return new VendorStatus('unreg');
  }

  isRegistered(): boolean {
    return this._status === 'reg';
  }
}
