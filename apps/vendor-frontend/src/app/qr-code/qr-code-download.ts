export interface QrCodeImage {
  /** The code as `brandedQrCode` renders it. */
  svg: string;
  /** Set under the code in the file — the address, so the print says where it leads. */
  caption: string;
  fileName: string;
}

/**
 * Turns the code into a file the vendor can print and hands it to the device. Rejects
 * when it could not: the screen tells the vendor, rather than leaving them waiting for
 * a download that never starts.
 */
export abstract class QrCodeDownload {
  abstract save(image: QrCodeImage): Promise<void>;
}
