import { render, RenderResult, screen } from '@testing-library/angular';
import { provideRouter } from '@angular/router';
import { PageObject } from '../core/page-object';
import { QrCodeScreen } from './qr-code-screen';
import { StorefrontFacade } from '../storefront/storefront.facade';
import { FakeStorefrontFacade } from '../storefront/fake.storefront.facade';
import { QrCodeExport } from './qr-code-export';
import { FakeQrCodeExport } from './fake.qr-code-export';

// The QR code screen as the vendor meets it: the code, and the two ways to take it off the
// phone (ADR 0062).
export class QrCodeScreenPageObject extends PageObject<QrCodeScreen> {
  private constructor(view: RenderResult<QrCodeScreen>) {
    super(view);
  }

  static async render({
    storefront = new FakeStorefrontFacade(),
    exports = new FakeQrCodeExport(),
  }: { storefront?: StorefrontFacade; exports?: QrCodeExport } = {}) {
    const view = await render(QrCodeScreen, {
      providers: [
        provideRouter([]),
        { provide: StorefrontFacade, useValue: storefront },
        { provide: QrCodeExport, useValue: exports },
      ],
    });
    return new QrCodeScreenPageObject(view);
  }

  loadingStatus(): HTMLElement {
    return screen.getByRole('status', { name: /chargement/i });
  }

  code(): HTMLElement {
    return screen.getByRole('img', { name: /qr code/i });
  }

  // Any image at all.
  queryCode(): HTMLElement | null {
    return screen.queryByRole('img');
  }

  // Taking the code off the phone. While a file is being prepared, the button that asked for
  // it is named for that instead.

  shareButton(): HTMLElement {
    return screen.getByRole('button', { name: 'Partager' });
  }

  queryShareButton(): HTMLElement | null {
    return screen.queryByRole('button', { name: 'Partager' });
  }

  downloadButton(): HTMLElement {
    return screen.getByRole('button', { name: /télécharger/i });
  }

  queryDownloadButton(): HTMLElement | null {
    return screen.queryByRole('button', { name: /télécharger/i });
  }

  preparingButton(): HTMLElement {
    return screen.getByRole('button', { name: 'Préparation…' });
  }

  alert(): HTMLElement {
    return screen.getByRole('alert');
  }

  queryAlert(): HTMLElement | null {
    return screen.queryByRole('alert');
  }

  backLink(): HTMLElement {
    return screen.getByRole('link', { name: /retour/i });
  }

  share(): this {
    return this.press(this.shareButton());
  }

  download(): this {
    return this.press(this.downloadButton());
  }
}
