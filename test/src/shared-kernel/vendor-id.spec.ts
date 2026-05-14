import { VendorId } from '@market-monster/shared-kernel';
import { EmptyValueError } from '@market-monster/common';

describe('VendorId', () => {
  it('should accept a valid vendor ID', () => {
    const vendorId = new VendorId('vendor-123');
    expect(vendorId.value()).toBe('vendor-123');
  });

  it.each([
    '',
    '   ',
  ])('should reject an empty vendor ID: "%s"', (value) => {
    expect(() => new VendorId(value)).toThrow(EmptyValueError);
  });

  it('should trim whitespace', () => {
    const vendorId = new VendorId('  vendor-123  ');
    expect(vendorId.value()).toBe('vendor-123');
  });
});
