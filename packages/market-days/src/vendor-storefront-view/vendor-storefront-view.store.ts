export abstract class VendorStorefrontViewStore {
  abstract open(vendorId: string): Promise<void>;
  abstract setCoverPhoto(vendorId: string, imageReference: string): Promise<void>;
  abstract editInformation(vendorId: string, information: { name: string; description: string; phone: string }): Promise<void>;
  abstract publish(vendorId: string): Promise<void>;
  abstract clear(): Promise<void>;
}
