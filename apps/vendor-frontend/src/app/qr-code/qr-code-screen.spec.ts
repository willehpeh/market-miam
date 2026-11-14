import { screen, waitFor } from '@testing-library/angular';
import { QrCodeScreenPageObject } from './qr-code-screen.page-object';
import { FakeStorefrontFacade } from '../storefront/fake.storefront.facade';
import { StorefrontView } from '../storefront/storefront';
import { FakeQrCodeExport } from './fake.qr-code-export';
import { brandedQrCode } from './branded-qr-code';

const published: StorefrontView = {
  name: 'Chez Mohamed',
  description: 'Couscous du vendredi',
  phone: '',
  imageReference: 'v42/storefronts/mohamed/cover-photo',
  subdomain: 'chez-mohamed',
  published: true,
  cartePricesVisible: true,
};

describe('QrCodeScreen', () => {
  it('waits for the storefront before showing a code', async () => {
    const page = await QrCodeScreenPageObject.render();

    expect(page.loadingStatus()).toBeInTheDocument();
    expect(page.queryCode()).not.toBeInTheDocument();
  });

  it('shows the code for the storefront address, named after it', async () => {
    const storefront = new FakeStorefrontFacade();
    const page = await QrCodeScreenPageObject.render({ storefront });
    storefront.view.set(published);
    page.detectChanges();

    const image = screen.getByRole('img', { name: 'QR code vers chez-mohamed.marketmiam.fr' });
    expect(image).toHaveAttribute('src', expect.stringMatching(/^data:image\/svg\+xml/));
    expect(screen.getByText('chez-mohamed.marketmiam.fr')).toBeInTheDocument();
  });

  it('shows the very code that reads as the storefront address', async () => {
    const storefront = new FakeStorefrontFacade();
    const page = await QrCodeScreenPageObject.render({ storefront });
    storefront.view.set(published);
    page.detectChanges();

    const src = page.code().getAttribute('src') ?? '';
    const shown = decodeURIComponent(src.replace(/^data:image\/svg\+xml;charset=utf-8,/, ''));
    expect(shown).toBe(brandedQrCode('https://chez-mohamed.marketmiam.fr').svg);
  });

  it('hands the code, the address and a file named after the stall to the download', async () => {
    const storefront = new FakeStorefrontFacade();
    const exports = new FakeQrCodeExport();
    const page = await QrCodeScreenPageObject.render({ storefront, exports });
    storefront.view.set(published);
    page.detectChanges();

    page.download();

    await waitFor(() => expect(exports.saved).toHaveLength(1));
    expect(exports.saved[0]).toEqual({
      svg: brandedQrCode('https://chez-mohamed.marketmiam.fr').svg,
      caption: 'chez-mohamed.marketmiam.fr',
      fileName: 'qr-code-chez-mohamed.png',
    });
    await waitFor(() => expect(page.downloadButton()).toBeEnabled());
  });

  it('holds the button while the file is being prepared', async () => {
    const storefront = new FakeStorefrontFacade();
    const exports = new FakeQrCodeExport();
    const page = await QrCodeScreenPageObject.render({ storefront, exports });
    storefront.view.set(published);
    page.detectChanges();
    exports.holding = true;

    page.download();

    await waitFor(() => expect(page.preparingButton()).toBeDisabled());
    exports.finish();
    await waitFor(() => expect(page.downloadButton()).toBeEnabled());
    page.detectChanges();
  });

  it('says so when the file cannot be made, and lets the vendor try again', async () => {
    const storefront = new FakeStorefrontFacade();
    const exports = new FakeQrCodeExport();
    const page = await QrCodeScreenPageObject.render({ storefront, exports });
    storefront.view.set(published);
    page.detectChanges();
    exports.outcome = 'failed';

    page.download();

    await waitFor(() => expect(page.alert()).toHaveTextContent(/n.a pas pu être préparée/i));
    expect(page.downloadButton()).toBeEnabled();

    exports.outcome = 'done';
    page.download();

    await waitFor(() => expect(page.queryAlert()).not.toBeInTheDocument());
  });

  it('offers the image to the share sheet where the device has one that takes files', async () => {
    const storefront = new FakeStorefrontFacade();
    const exports = new FakeQrCodeExport();
    const page = await QrCodeScreenPageObject.render({ storefront, exports });
    storefront.view.set(published);
    page.detectChanges();

    page.share();

    await waitFor(() => expect(exports.shared).toHaveLength(1));
    expect(exports.shared[0]).toEqual({
      svg: brandedQrCode('https://chez-mohamed.marketmiam.fr').svg,
      caption: 'chez-mohamed.marketmiam.fr',
      fileName: 'qr-code-chez-mohamed.png',
    });
    expect(exports.saved).toHaveLength(0);
    expect(page.queryAlert()).not.toBeInTheDocument();
  });

  it('keeps the sheet off a device that cannot share files, leaving the download', async () => {
    const storefront = new FakeStorefrontFacade();
    const exports = Object.assign(new FakeQrCodeExport(), { shareable: false });
    const page = await QrCodeScreenPageObject.render({ storefront, exports });
    storefront.view.set(published);
    page.detectChanges();

    expect(page.queryShareButton()).not.toBeInTheDocument();
    expect(page.downloadButton()).toBeInTheDocument();
  });

  it('says nothing when the vendor backs out of the sheet', async () => {
    const storefront = new FakeStorefrontFacade();
    const exports = new FakeQrCodeExport();
    const page = await QrCodeScreenPageObject.render({ storefront, exports });
    storefront.view.set(published);
    page.detectChanges();
    exports.outcome = 'backed-out';

    page.share();

    await waitFor(() => expect(exports.shared).toHaveLength(1));
    await waitFor(() => expect(page.shareButton()).toBeEnabled());
    expect(page.queryAlert()).not.toBeInTheDocument();
  });

  it('says so when the image for the sheet cannot be made', async () => {
    const storefront = new FakeStorefrontFacade();
    const exports = new FakeQrCodeExport();
    const page = await QrCodeScreenPageObject.render({ storefront, exports });
    storefront.view.set(published);
    page.detectChanges();
    exports.outcome = 'failed';

    page.share();

    await waitFor(() => expect(page.alert()).toHaveTextContent(/n.a pas pu être préparée/i));
  });

  it('holds both actions while the sheet is being prepared, naming the one in progress', async () => {
    const storefront = new FakeStorefrontFacade();
    const exports = new FakeQrCodeExport();
    const page = await QrCodeScreenPageObject.render({ storefront, exports });
    storefront.view.set(published);
    page.detectChanges();
    exports.holding = true;

    page.share();

    await waitFor(() => expect(page.preparingButton()).toBeDisabled());
    expect(page.downloadButton()).toBeDisabled();
    exports.finish();
    await waitFor(() => expect(page.shareButton()).toBeEnabled());
  });

  it('warns that the code leads nowhere until the vitrine is published', async () => {
    const storefront = new FakeStorefrontFacade();
    const page = await QrCodeScreenPageObject.render({ storefront });
    storefront.view.set({ ...published, published: false });
    page.detectChanges();

    expect(screen.getByText(/pas encore publiée/i)).toBeInTheDocument();
    expect(page.code()).toBeInTheDocument();
  });

  it('keeps the warning off a published vitrine', async () => {
    const storefront = new FakeStorefrontFacade();
    const page = await QrCodeScreenPageObject.render({ storefront });
    storefront.view.set(published);
    page.detectChanges();

    expect(screen.queryByText(/pas encore publiée/i)).not.toBeInTheDocument();
  });

  it('explains the address is pending and offers nothing to download without a subdomain', async () => {
    const storefront = new FakeStorefrontFacade();
    const page = await QrCodeScreenPageObject.render({ storefront });
    storefront.view.set({ ...published, subdomain: null });
    page.detectChanges();

    expect(screen.getByText(/en cours d.attribution/i)).toBeInTheDocument();
    expect(page.queryCode()).not.toBeInTheDocument();
    expect(page.queryDownloadButton()).not.toBeInTheDocument();
  });

  it('leads back to the dashboard', async () => {
    const storefront = new FakeStorefrontFacade();
    const page = await QrCodeScreenPageObject.render({ storefront });
    storefront.view.set(published);
    page.detectChanges();

    expect(page.backLink()).toHaveAttribute('href', '/dashboard');
  });
});
