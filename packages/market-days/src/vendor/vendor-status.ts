type Status = 'unknown' | 'invited' | 'registered' | 'erased';

export class VendorStatus {

  private constructor(private readonly _status: Status) {
  }

  static unknown(): VendorStatus {
    return new VendorStatus('unknown');
  }

  static invited(): VendorStatus {
    return new VendorStatus('invited');
  }

  static registered(): VendorStatus {
    return new VendorStatus('registered');
  }

  static erased(): VendorStatus {
    return new VendorStatus('erased');
  }

  isUnknown(): boolean {
    return this._status === 'unknown';
  }

  isRegistered(): boolean {
    return this._status === 'registered';
  }

  isErased(): boolean {
    return this._status === 'erased';
  }
}
