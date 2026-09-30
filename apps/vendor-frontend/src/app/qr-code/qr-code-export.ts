export interface QrCodeImage {
  /** The code as `brandedQrCode` renders it. */
  svg: string;
  /** Set under the code in the file — the address, so the print says where it leads. */
  caption: string;
  fileName: string;
}

/**
 * Turns the code into a file the vendor can print, and hands it to the device: saved as a
 * download, or offered to the share sheet where the device has one that takes files — a
 * phone's way to a printer, a WhatsApp group or the photo roll. Backing out of the sheet
 * comes back as nothing happening, as it does for links (`Share`); not managing to make
 * the file rejects, so the screen can say so rather than leave the vendor waiting.
 */
export abstract class QrCodeExport {
  abstract canShare(): boolean;
  abstract save(image: QrCodeImage): Promise<void>;
  abstract share(image: QrCodeImage): Promise<'shared' | null>;
}
