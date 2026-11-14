import { render, RenderResult, screen } from '@testing-library/angular';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { PageObject } from '../core/page-object';
import { MenuEditor } from './menu-editor';
import { MarketDayFacade } from './market-day.facade';
import { FakeMarketDayFacade } from './fake.market-day.facade';
import { CatalogueFacade } from '../catalogue/catalogue.facade';
import { FakeCatalogueFacade } from '../catalogue/fake.catalogue.facade';
import { MarketPricesFacade } from '../market-prices/market-prices.facade';
import { FakeMarketPricesFacade } from '../market-prices/fake.market-prices.facade';
import { SellingRecordFacade } from '../selling-record/selling-record.facade';
import { FakeSellingRecordFacade } from '../selling-record/fake.selling-record.facade';

// A market day's menu as the vendor plans it: the dishes they tick, found by their names,
// and what they do with them (ADR 0062). It asserts nothing, and it never hands out a
// facade: a spec that arranges or checks one builds the fake and passes it in.
export class MenuEditorPageObject extends PageObject<MenuEditor> {
  private constructor(view: RenderResult<MenuEditor>) {
    super(view);
  }

  // Opens on the Saturday testMarketDayView stages unless given another day.
  static async render({
    marketDays = new FakeMarketDayFacade(),
    catalogue = new FakeCatalogueFacade(),
    prices = new FakeMarketPricesFacade(),
    record = new FakeSellingRecordFacade(),
    marketId = 'market-1',
    date = '2026-08-15',
  }: {
    marketDays?: MarketDayFacade;
    catalogue?: CatalogueFacade;
    prices?: MarketPricesFacade;
    record?: SellingRecordFacade;
    marketId?: string;
    date?: string;
  } = {}) {
    const view = await render(MenuEditor, {
      providers: [
        provideRouter([]),
        { provide: MarketDayFacade, useValue: marketDays },
        { provide: CatalogueFacade, useValue: catalogue },
        { provide: MarketPricesFacade, useValue: prices },
        { provide: SellingRecordFacade, useValue: record },
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap: convertToParamMap({ marketId, date }) } } },
      ],
    });
    return new MenuEditorPageObject(view);
  }

  loadingStatus(): HTMLElement {
    return screen.getByRole('status', { name: /chargement/i });
  }

  backLink(): HTMLElement {
    return screen.getByRole('link', { name: /retour/i });
  }

  marketPricesLink(): HTMLElement {
    return screen.getByRole('link', { name: /tarifs de ce marché/i });
  }

  // The menu. Each dish is a checkbox named after it.

  dish(name: RegExp): HTMLElement {
    return screen.getByRole('checkbox', { name });
  }

  queryDish(name: RegExp): HTMLElement | null {
    return screen.queryByRole('checkbox', { name });
  }

  saveButton(): HTMLElement {
    return screen.getByRole('button', { name: /enregistrer/i });
  }

  querySaveButton(): HTMLElement | null {
    return screen.queryByRole('button', { name: /enregistrer/i });
  }

  tickDish(name: RegExp): this {
    return this.press(this.dish(name));
  }

  untickDish(name: RegExp): this {
    return this.press(this.dish(name));
  }

  save(): this {
    return this.press(this.saveButton());
  }

  // A closed stand

  reopenStandButton(): HTMLElement {
    return screen.getByRole('button', { name: 'Rouvrir le stand' });
  }

  reopenStand(): this {
    return this.press(this.reopenStandButton());
  }
}
