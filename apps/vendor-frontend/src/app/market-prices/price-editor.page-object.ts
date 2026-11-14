import { fireEvent, render, RenderResult, screen } from '@testing-library/angular';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { PriceEditor } from './price-editor';
import { MarketPricesFacade } from './market-prices.facade';
import { FakeMarketPricesFacade } from './fake.market-prices.facade';
import { CatalogueFacade } from '../catalogue/catalogue.facade';
import { FakeCatalogueFacade } from '../catalogue/fake.catalogue.facade';
import { MarketScheduleFacade } from '../markets/market-schedule.facade';
import { FakeMarketScheduleFacade } from '../markets/fake.market-schedule.facade';

// A market's prices as the vendor sets them: a field per dish, found by the dish's name, and
// what they do with them (ADR 0062). It asserts nothing, and it never hands out a facade: a
// spec that arranges or checks one builds the fake and passes it in.
export class PriceEditorPageObject {
  private constructor(private readonly view: RenderResult<PriceEditor>) {}

  // Opens on market-1 unless given another market.
  static async render({
    catalogue = new FakeCatalogueFacade(),
    prices = new FakeMarketPricesFacade(),
    schedules = new FakeMarketScheduleFacade(),
    marketId = 'market-1',
  }: {
    catalogue?: CatalogueFacade;
    prices?: MarketPricesFacade;
    schedules?: MarketScheduleFacade;
    marketId?: string;
  } = {}) {
    const view = await render(PriceEditor, {
      providers: [
        provideRouter([]),
        { provide: CatalogueFacade, useValue: catalogue },
        { provide: MarketPricesFacade, useValue: prices },
        { provide: MarketScheduleFacade, useValue: schedules },
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap: convertToParamMap({ marketId }) } } },
      ],
    });
    return new PriceEditorPageObject(view);
  }

  // For a change from outside the screen, such as a spec setting its fake's state.
  detectChanges(): this {
    this.view.detectChanges();
    return this;
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

  private press(element: HTMLElement): this {
    fireEvent.click(element);
    return this.detectChanges();
  }

  private type(field: HTMLElement, value: string): this {
    fireEvent.input(field, { target: { value } });
    return this.detectChanges();
  }
}
