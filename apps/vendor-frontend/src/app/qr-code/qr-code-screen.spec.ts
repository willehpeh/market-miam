import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { fireEvent, render, screen, waitFor } from '@testing-library/angular';
import { QrCodeScreen } from './qr-code-screen';
import { StorefrontFacade } from '../storefront/storefront.facade';
import { FakeStorefrontFacade } from '../storefront/fake.storefront.facade';
import { StorefrontView } from '../storefront/storefront';
import { QrCodeExport } from './qr-code-export';
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

async function renderScreen(view?: StorefrontView, shareable = true) {
  const rendered = await render(QrCodeScreen, {
    providers: [
      { provide: FakeQrCodeExport, useFactory: () => Object.assign(new FakeQrCodeExport(), { shareable }) },
      provideRouter([]),
      { provide: StorefrontFacade, useClass: FakeStorefrontFacade },
      { provide: QrCodeExport, useExisting: FakeQrCodeExport },
    ],
  });
  const storefront = TestBed.inject(StorefrontFacade) as FakeStorefrontFacade;
  const exports = TestBed.inject(QrCodeExport) as FakeQrCodeExport;
  if (view) {
    storefront.view.set(view);
    rendered.detectChanges();
  }
  return { rendered, storefront, exports };
}

describe('QrCodeScreen', () => {
  it('waits for the storefront before showing a code', async () => {
    await renderScreen();

    expect(screen.getByRole('status', { name: /chargement/i })).toBeInTheDocument();
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
  });

  it('shows the code for the storefront address, named after it', async () => {
    await renderScreen(published);

    const image = screen.getByRole('img', { name: 'QR code vers chez-mohamed.marketmiam.fr' });
    expect(image).toHaveAttribute('src', expect.stringMatching(/^data:image\/svg\+xml/));
    expect(screen.getByText('chez-mohamed.marketmiam.fr')).toBeInTheDocument();
  });

  it('shows the very code that reads as the storefront address', async () => {
    await renderScreen(published);

    const src = screen.getByRole('img', { name: /qr code/i }).getAttribute('src') ?? '';
    const shown = decodeURIComponent(src.replace(/^data:image\/svg\+xml;charset=utf-8,/, ''));
    expect(shown).toBe(brandedQrCode('https://chez-mohamed.marketmiam.fr').svg);
  });

  it('hands the code, the address and a file named after the stall to the download', async () => {
    const { exports } = await renderScreen(published);

    fireEvent.click(screen.getByRole('button', { name: /télécharger/i }));

    await waitFor(() => expect(exports.saved).toHaveLength(1));
    expect(exports.saved[0]).toEqual({
      svg: brandedQrCode('https://chez-mohamed.marketmiam.fr').svg,
      caption: 'chez-mohamed.marketmiam.fr',
      fileName: 'qr-code-chez-mohamed.png',
    });
    await waitFor(() => expect(screen.getByRole('button', { name: /télécharger/i })).toBeEnabled());
  });

  it('holds the button while the file is being prepared', async () => {
    const { exports, rendered } = await renderScreen(published);
    exports.holding = true;

    fireEvent.click(screen.getByRole('button', { name: /télécharger/i }));

    await waitFor(() => expect(screen.getByRole('button', { name: 'Préparation…' })).toBeDisabled());
    exports.finish();
    await waitFor(() => expect(screen.getByRole('button', { name: /télécharger/i })).toBeEnabled());
    rendered.detectChanges();
  });

  it('says so when the file cannot be made, and lets the vendor try again', async () => {
    const { exports } = await renderScreen(published);
    exports.outcome = 'failed';

    fireEvent.click(screen.getByRole('button', { name: /télécharger/i }));

    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent(/n.a pas pu être préparée/i));
    expect(screen.getByRole('button', { name: /télécharger/i })).toBeEnabled();

    exports.outcome = 'done';
    fireEvent.click(screen.getByRole('button', { name: /télécharger/i }));

    await waitFor(() => expect(screen.queryByRole('alert')).not.toBeInTheDocument());
  });

  it('offers the image to the share sheet where the device has one that takes files', async () => {
    const { exports } = await renderScreen(published);

    fireEvent.click(screen.getByRole('button', { name: 'Partager' }));

    await waitFor(() => expect(exports.shared).toHaveLength(1));
    expect(exports.shared[0]).toEqual({
      svg: brandedQrCode('https://chez-mohamed.marketmiam.fr').svg,
      caption: 'chez-mohamed.marketmiam.fr',
      fileName: 'qr-code-chez-mohamed.png',
    });
    expect(exports.saved).toHaveLength(0);
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('keeps the sheet off a device that cannot share files, leaving the download', async () => {
    await renderScreen(published, false);

    expect(screen.queryByRole('button', { name: 'Partager' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /télécharger/i })).toBeInTheDocument();
  });

  it('says nothing when the vendor backs out of the sheet', async () => {
    const { exports } = await renderScreen(published);
    exports.outcome = 'backed-out';

    fireEvent.click(screen.getByRole('button', { name: 'Partager' }));

    await waitFor(() => expect(exports.shared).toHaveLength(1));
    await waitFor(() => expect(screen.getByRole('button', { name: 'Partager' })).toBeEnabled());
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('says so when the image for the sheet cannot be made', async () => {
    const { exports } = await renderScreen(published);
    exports.outcome = 'failed';

    fireEvent.click(screen.getByRole('button', { name: 'Partager' }));

    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent(/n.a pas pu être préparée/i));
  });

  it('holds both actions while the sheet is being prepared, naming the one in progress', async () => {
    const { exports } = await renderScreen(published);
    exports.holding = true;

    fireEvent.click(screen.getByRole('button', { name: 'Partager' }));

    await waitFor(() => expect(screen.getByRole('button', { name: 'Préparation…' })).toBeDisabled());
    expect(screen.getByRole('button', { name: /télécharger/i })).toBeDisabled();
    exports.finish();
    await waitFor(() => expect(screen.getByRole('button', { name: 'Partager' })).toBeEnabled());
  });

  it('warns that the code leads nowhere until the vitrine is published', async () => {
    await renderScreen({ ...published, published: false });

    expect(screen.getByText(/pas encore publiée/i)).toBeInTheDocument();
    expect(screen.getByRole('img', { name: /qr code/i })).toBeInTheDocument();
  });

  it('keeps the warning off a published vitrine', async () => {
    await renderScreen(published);

    expect(screen.queryByText(/pas encore publiée/i)).not.toBeInTheDocument();
  });

  it('explains the address is pending and offers nothing to download without a subdomain', async () => {
    await renderScreen({ ...published, subdomain: null });

    expect(screen.getByText(/en cours d.attribution/i)).toBeInTheDocument();
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /télécharger/i })).not.toBeInTheDocument();
  });

  it('leads back to the dashboard', async () => {
    await renderScreen(published);

    expect(screen.getByRole('link', { name: /retour/i })).toHaveAttribute('href', '/dashboard');
  });
});
