import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { Card } from '../core/card';
import { Spinner } from '../core/spinner';
import { StorefrontFacade } from '../storefront/storefront.facade';
import { storefrontUrl } from '../storefront/storefront-url';
import { brandedQrCode } from './branded-qr-code';
import { QrCodeDownload } from './qr-code-download';

@Component({
  selector: 'mm-qr-code-screen',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Card, Spinner],
  template: `
    <mm-card back="/dashboard">
      <h1 class="text-xl leading-tight">Le QR code de votre vitrine</h1>

      @if (!view()) {
        <div class="mx-auto grid h-32 place-items-center">
          <mm-spinner label="Chargement de votre stand…" />
        </div>
      } @else if (code(); as code) {
        <p class="mt-2 text-sm text-ink-soft">
          Vos clients le scannent avec leur téléphone et arrivent directement sur votre vitrine.
        </p>

        <img [src]="code.preview" [alt]="'QR code vers ' + code.label" class="mx-auto mt-6 w-full max-w-xs rounded-card shadow-frame" />
        <p class="mt-3 text-center font-bold text-brand-deep">{{ code.label }}</p>

        @if (!published()) {
          <p class="mt-4 text-center text-sm text-warn">
            Votre vitrine n'est pas encore publiée : le QR code y mènera dès qu'elle le sera.
          </p>
        }

        <p class="mt-6 text-sm text-muted">
          Imprimez-le pour votre stand ou vos menus : l'image est en haute définition, prête pour l'impression.
        </p>

        @if (downloadError()) {
          <p role="alert" class="mt-4 text-center text-sm text-danger">Le téléchargement a échoué. Réessayez.</p>
        }

        <button
          type="button"
          class="mt-4 flex w-full max-w-xs mx-auto justify-center"
          [disabled]="downloading()"
          (click)="download()"
        >
          <i class="fa-solid fa-download" aria-hidden="true"></i>
          {{ downloading() ? 'Préparation…' : "Télécharger l'image" }}
        </button>
      } @else {
        <p class="mt-4 text-sm text-muted">
          Votre adresse web est en cours d'attribution. Votre QR code sera prêt dès qu'elle le sera.
        </p>
      }
    </mm-card>
  `,
})
export class QrCodeScreen {
  private readonly storefront = inject(StorefrontFacade);
  private readonly downloads = inject(QrCodeDownload);
  readonly view = this.storefront.view;
  readonly published = computed(() => this.view()?.published === true);
  readonly downloading = signal(false);
  readonly downloadError = signal(false);

  // Built from the address alone, in the browser: the app knows the subdomain and the
  // base domain, and nothing else goes into the code (ADR 0055).
  readonly code = computed(() => {
    const subdomain = this.view()?.subdomain;
    const url = storefrontUrl(subdomain);
    if (!subdomain || !url) {
      return null;
    }
    const { svg } = brandedQrCode(url.href);
    return {
      svg,
      label: url.label,
      preview: `data:image/svg+xml;charset=utf-8,${ encodeURIComponent(svg) }`,
      fileName: `qr-code-${ subdomain }.png`,
    };
  });

  async download(): Promise<void> {
    const code = this.code();
    if (!code) {
      return;
    }
    this.downloadError.set(false);
    this.downloading.set(true);
    try {
      await this.downloads.save({ svg: code.svg, caption: code.label, fileName: code.fileName });
    } catch {
      this.downloadError.set(true);
    } finally {
      this.downloading.set(false);
    }
  }
}
