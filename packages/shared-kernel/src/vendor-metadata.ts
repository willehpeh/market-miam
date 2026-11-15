// An event about a vendor carries that vendor's id in its metadata, under this key (ADR 0009).
// VendorScopedEvents stamps it and vendorIdFrom reads it back; the api names it as the subject
// shredding seals personal data under, and lifts it onto spans as `vendor.id`.
export const VENDOR_ID_METADATA_KEY = 'vendorId';
