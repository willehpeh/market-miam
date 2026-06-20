export abstract class VendorStorefrontViewStore {
  abstract setCoverPhoto(vendorId: string, imageReference: string): Promise<void>;
  abstract editInformation(vendorId: string, information: { name: string; description: string }): Promise<void>;
}
