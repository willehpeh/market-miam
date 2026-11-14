import { render, RenderResult, screen } from '@testing-library/angular';
import { provideRouter } from '@angular/router';
import { PageObject } from '../core/page-object';
import { Dashboard } from './dashboard';
import { StorefrontFacade } from '../storefront/storefront.facade';
import { FakeStorefrontFacade } from '../storefront/fake.storefront.facade';
import { CatalogueFacade } from '../catalogue/catalogue.facade';
import { FakeCatalogueFacade } from '../catalogue/fake.catalogue.facade';
import { MarketScheduleFacade } from '../markets/market-schedule.facade';
import { FakeMarketScheduleFacade } from '../markets/fake.market-schedule.facade';
import { MarketDayFacade } from '../market-days/market-day.facade';
import { FakeMarketDayFacade } from '../market-days/fake.market-day.facade';
import { LegalIdentityFacade } from '../legal-identity/legal-identity.facade';
import { FakeLegalIdentityFacade } from '../legal-identity/fake.legal-identity.facade';
import { COPIED_NOTICE_DELAY, Share } from '../core/share';
import { FakeShare } from '../core/fake.share';

// The vendor's home as they meet it: the setup steps until the vitrine is published, the
// published home after it, the controls found by the labels they read, and what they do with
// them (ADR 0062).
export class DashboardPageObject extends PageObject<Dashboard> {
  private constructor(view: RenderResult<Dashboard>) {
    super(view);
  }

  // "Lien copié" gives way to Partager at once unless a copiedNoticeDelay says otherwise.
  static async render({
    storefront = new FakeStorefrontFacade(),
    catalogue = new FakeCatalogueFacade(),
    markets = new FakeMarketScheduleFacade(),
    marketDays = new FakeMarketDayFacade(),
    legalIdentity = new FakeLegalIdentityFacade(),
    sharing = new FakeShare(),
    copiedNoticeDelay = 0,
  }: {
    storefront?: StorefrontFacade;
    catalogue?: CatalogueFacade;
    markets?: MarketScheduleFacade;
    marketDays?: MarketDayFacade;
    legalIdentity?: LegalIdentityFacade;
    sharing?: Share;
    copiedNoticeDelay?: number;
  } = {}) {
    const view = await render(Dashboard, {
      providers: [
        provideRouter([]),
        { provide: StorefrontFacade, useValue: storefront },
        { provide: CatalogueFacade, useValue: catalogue },
        { provide: MarketScheduleFacade, useValue: markets },
        { provide: MarketDayFacade, useValue: marketDays },
        { provide: Share, useValue: sharing },
        { provide: LegalIdentityFacade, useValue: legalIdentity },
        { provide: COPIED_NOTICE_DELAY, useValue: copiedNoticeDelay },
      ],
    });
    return new DashboardPageObject(view);
  }

  // The page

  loadingStatus(): HTMLElement {
    return screen.getByRole('status', { name: /chargement/i });
  }

  // Any link at all: while the page waits there is nowhere to go.
  queryAnyLink(): HTMLElement | null {
    return screen.queryByRole('link');
  }

  topLevelHeadings(): HTMLElement[] {
    return screen.getAllByRole('heading', { level: 1 });
  }

  // The card that asks a published vendor for the mentions légales.
  completeLegalIdentityLink(): HTMLElement {
    return screen.getByRole('link', { name: /complétez vos mentions légales/i });
  }

  queryCompleteLegalIdentityLink(): HTMLElement | null {
    return screen.queryByRole('link', { name: /complétez vos mentions légales/i });
  }

  // The vitrine's web address, on either home.
  storefrontLink(address: string): HTMLElement {
    return screen.getByRole('link', { name: address });
  }

  // The setup steps, each a link to the screen that does it

  progressBar(): HTMLElement {
    return screen.getByRole('progressbar');
  }

  queryProgressBar(): HTMLElement | null {
    return screen.queryByRole('progressbar');
  }

  storefrontStep(): HTMLElement {
    return screen.getByRole('link', { name: /informations de la vitrine/i });
  }

  catalogueStep(): HTMLElement {
    return screen.getByRole('link', { name: /composez votre catalogue/i });
  }

  marketsStep(): HTMLElement {
    return screen.getByRole('link', { name: /indiquez vos marchés/i });
  }

  legalIdentityStep(): HTMLElement {
    return screen.getByRole('link', { name: /vos mentions légales/i });
  }

  publishButton(): HTMLElement {
    return screen.getByRole('button', { name: 'Publier' });
  }

  // The same button while the publication is under way.
  publishingButton(): HTMLElement {
    return screen.getByRole('button', { name: 'Publication…' });
  }

  // Whichever it would read, Publier or Publication….
  queryPublishButton(): HTMLElement | null {
    return screen.queryByRole('button', { name: /publier|publication/i });
  }

  publish(): this {
    return this.press(this.publishButton());
  }

  // The published home

  nextMarketHeading(): HTMLElement {
    return screen.getByRole('heading', { name: /prochain marché/i });
  }

  queryNextMarketHeading(): HTMLElement | null {
    return screen.queryByRole('heading', { name: /prochain marché/i });
  }

  catalogueLink(): HTMLElement {
    return screen.getByRole('link', { name: 'Votre catalogue' });
  }

  marketsLink(): HTMLElement {
    return screen.getByRole('link', { name: 'Vos marchés' });
  }

  legalIdentityLink(): HTMLElement {
    return screen.getByRole('link', { name: 'Mentions légales' });
  }

  editStorefrontLink(): HTMLElement {
    return screen.getByRole('link', { name: /modifier/i });
  }

  qrCodeLink(): HTMLElement {
    return screen.getByRole('link', { name: /qr code/i });
  }

  queryQrCodeLink(): HTMLElement | null {
    return screen.queryByRole('link', { name: /qr code/i });
  }

  shareButton(): HTMLElement {
    return screen.getByRole('button', { name: /partager/i });
  }

  // The same button while it confirms a copy.
  private linkCopiedButton(): HTMLElement {
    return screen.getByRole('button', { name: /lien copié/i });
  }

  share(): this {
    return this.press(this.shareButton());
  }

  // Tapping the button again while it still says the link was copied.
  shareAgain(): this {
    return this.press(this.linkCopiedButton());
  }
}
