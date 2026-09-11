import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { fireEvent, render, screen, waitFor } from '@testing-library/angular';
import { QrCodeScreen } from './qr-code-screen';
import { StorefrontFacade } from '../storefront/storefront.facade';
import { FakeStorefrontFacade } from '../storefront/fake.storefront.facade';
import { StorefrontView } from '../storefront/storefront';
import { QrCodeDownload } from './qr-code-download';
import { FakeQrCodeDownload } from './fake.qr-code-download';
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

async function renderScreen(view?: StorefrontView) {
  const rendered = await render(QrCodeScreen, {
    providers: [
      provideRouter([]),
      { provide: StorefrontFacade, useClass: FakeStorefrontFacade },
      { provide: QrCodeDownload, useClass: FakeQrCodeDownload },
    ],
  });
  const storefront = TestBed.inject(StorefrontFacade) as FakeStorefrontFacade;
  const downloads = TestBed.inject(QrCodeDownload) as FakeQrCodeDownload;
  if (view) {
    storefront.view.set(view);
    rendered.detectChanges();
  }
  return { rendered, storefront, downloads };
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
    const { downloads } = await renderScreen(published);

    fireEvent.click(screen.getByRole('button', { name: /télécharger/i }));

    await waitFor(() => expect(downloads.saved).toHaveLength(1));
    expect(downloads.saved[0]).toEqual({
      svg: brandedQrCode('https://chez-mohamed.marketmiam.fr').svg,
      caption: 'chez-mohamed.marketmiam.fr',
      fileName: 'qr-code-chez-mohamed.png',
    });
    expect(screen.getByRole('button', { name: /télécharger/i })).toBeEnabled();
  });

  it('holds the button while the file is being prepared', async () => {
    const { downloads, rendered } = await renderScreen(published);
    downloads.holding = true;

    fireEvent.click(screen.getByRole('button', { name: /télécharger/i }));

    await waitFor(() => expect(screen.getByRole('button', { name: 'Préparation…' })).toBeDisabled());
    downloads.finish();
    await waitFor(() => expect(screen.getByRole('button', { name: /télécharger/i })).toBeEnabled());
    rendered.detectChanges();
  });

  it('says so when the download fails, and lets the vendor try again', async () => {
    const { downloads } = await renderScreen(published);
    downloads.outcome = 'failed';

    fireEvent.click(screen.getByRole('button', { name: /télécharger/i }));

    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent(/le téléchargement a échoué/i));
    expect(screen.getByRole('button', { name: /télécharger/i })).toBeEnabled();

    downloads.outcome = 'saved';
    fireEvent.click(screen.getByRole('button', { name: /télécharger/i }));

    await waitFor(() => expect(screen.queryByRole('alert')).not.toBeInTheDocument());
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
