import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { Card } from '../core/card';
import { Spinner } from '../core/spinner';
import { StorefrontFacade } from '../storefront/storefront.facade';
import { storefrontUrl } from '../storefront/storefront-url';
import { brandedQrCode } from './branded-qr-code';
import { QrCodeExport, QrCodeImage } from './qr-code-export';

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

        @if (exportError()) {
          <p role="alert" class="mt-4 text-center text-sm text-danger">L'image n'a pas pu être préparée. Réessayez.</p>
        }

        <!-- The sheet leads: on a phone it is the way to a printer, a WhatsApp group or the
             photo roll, and the download is what is left where there is no sheet. -->
        <div class="mx-auto mt-4 flex w-full max-w-xs flex-col gap-3">
          @if (shareable) {
            <button type="button" class="flex justify-center" [disabled]="busy()" (click)="share()">
              <i class="fa-solid fa-share-nodes" aria-hidden="true"></i>
              {{ busy() === 'share' ? 'Préparation…' : 'Partager' }}
            </button>
          }
          <button
            type="button"
            class="flex justify-center"
            [class.quiet]="shareable"
            [disabled]="busy()"
            (click)="download()"
          >
            <i class="fa-solid fa-download" aria-hidden="true"></i>
            {{ busy() === 'save' ? 'Préparation…' : "Télécharger l'image" }}
          </button>
        </div>
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
  private readonly exports = inject(QrCodeExport);
  readonly view = this.storefront.view;
  readonly published = computed(() => this.view()?.published === true);
  readonly shareable = this.exports.canShare();
  readonly busy = signal<'save' | 'share' | null>(null);
  readonly exportError = signal(false);

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

  download(): Promise<void> {
    return this.export('save', (image) => this.exports.save(image));
  }

  share(): Promise<void> {
    return this.export('share', (image) => this.exports.share(image));
  }

  private async export(action: 'save' | 'share', through: (image: QrCodeImage) => Promise<unknown>): Promise<void> {
    const code = this.code();
    if (!code) {
      return;
    }
    this.exportError.set(false);
    this.busy.set(action);
    try {
      await through({ svg: code.svg, caption: code.label, fileName: code.fileName });
    } catch {
      this.exportError.set(true);
    } finally {
      this.busy.set(null);
    }
  }
}
