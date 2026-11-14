import { render, RenderResult, screen } from '@testing-library/angular';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { PageObject } from '../core/page-object';
import { PriceEditor } from './price-editor';
import { MarketPricesFacade } from './market-prices.facade';
import { FakeMarketPricesFacade } from './fake.market-prices.facade';
import { CatalogueFacade } from '../catalogue/catalogue.facade';
import { FakeCatalogueFacade } from '../catalogue/fake.catalogue.facade';
import { MarketScheduleFacade } from '../markets/market-schedule.facade';
import { FakeMarketScheduleFacade } from '../markets/fake.market-schedule.facade';

// A market's prices as the vendor sets them: a field per dish, found by the dish's name, and
// what they do with them (ADR 0062).
export class PriceEditorPageObject extends PageObject<PriceEditor> {
  private constructor(view: RenderResult<PriceEditor>) {
    super(view);
  }

  // Opens on market-1.
  static async render({
    catalogue = new FakeCatalogueFacade(),
    prices = new FakeMarketPricesFacade(),
    schedules = new FakeMarketScheduleFacade(),
  }: {
    catalogue?: CatalogueFacade;
    prices?: MarketPricesFacade;
    schedules?: MarketScheduleFacade;
  } = {}) {
    const view = await render(PriceEditor, {
      providers: [
        provideRouter([]),
        { provide: CatalogueFacade, useValue: catalogue },
        { provide: MarketPricesFacade, useValue: prices },
        { provide: MarketScheduleFacade, useValue: schedules },
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap: convertToParamMap({ marketId: 'market-1' }) } } },
      ],
    });
    return new PriceEditorPageObject(view);
  }

  loadingStatus(): HTMLElement {
    return screen.getByRole('status', { name: /chargement/i });
  }

  // The fields. Each is labelled with its dish's name, or, for a dish sold by variant, with
  // the variant's.

  priceField(name: string): HTMLInputElement {
    return screen.getByLabelText(name) as HTMLInputElement;
  }

  queryPriceField(name: string): HTMLElement | null {
    return screen.queryByLabelText(name);
  }

  // The screen's one alert: a price it cannot read.
  priceAlert(): HTMLElement {
    return screen.getByRole('alert');
  }

  enterPrice(name: string, price: string): this {
    return this.type(this.priceField(name), price);
  }

  // Back to the carte price.
  clearPrice(name: string): this {
    return this.type(this.priceField(name), '');
  }

  // Saving

  saveButton(): HTMLElement {
    return screen.getByRole('button', { name: /enregistrer/i });
  }

  querySaveButton(): HTMLElement | null {
    return screen.queryByRole('button', { name: /enregistrer/i });
  }

  save(): this {
    return this.press(this.saveButton());
  }
}
