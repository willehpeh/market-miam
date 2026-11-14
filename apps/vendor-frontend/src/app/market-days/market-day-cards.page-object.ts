import { render, RenderResult, screen } from '@testing-library/angular';
import { provideRouter } from '@angular/router';
import { PageObject } from '../core/page-object';
import { MarketDayCards } from './market-day-cards';
import { MarketDayFacade } from './market-day.facade';
import { FakeMarketDayFacade } from './fake.market-day.facade';

// The market-day cards as the vendor meets them at the top of the published home: today's
// market to run and the next one to plan, the controls found by the labels they read, and
// what they do with them (ADR 0062). It asserts nothing, and it never hands out the facade:
// a spec that arranges the days or wants to see a command builds the fake and passes it in.
export class MarketDayCardsPageObject extends PageObject<MarketDayCards> {
  private constructor(view: RenderResult<MarketDayCards>) {
    super(view);
  }

  static async render({ marketDays = new FakeMarketDayFacade() }: { marketDays?: MarketDayFacade } = {}) {
    const view = await render(MarketDayCards, {
      providers: [provideRouter([]), { provide: MarketDayFacade, useValue: marketDays }],
    });
    return new MarketDayCardsPageObject(view);
  }

  // The cards, one heading each

  headings(): HTMLElement[] {
    return screen.getAllByRole('heading');
  }

  nextMarketHeading(): HTMLElement {
    return screen.getByRole('heading', { name: /prochain marché/i });
  }

  // The way into a day

  // Whichever the day offers, to plan its menu or to change it.
  menuLink(): HTMLElement {
    return screen.getByRole('link', { name: /le menu/i });
  }

  queryMenuLink(): HTMLElement | null {
    return screen.queryByRole('link', { name: /le menu/i });
  }

  planMenuLink(): HTMLElement {
    return screen.getByRole('link', { name: /planifier le menu/i });
  }

  editMenuLink(): HTMLElement {
    return screen.getByRole('link', { name: /modifier le menu/i });
  }

  followMarketLink(): HTMLElement {
    return screen.getByRole('link', { name: /suivre le marché/i });
  }

  // Whichever an open today would offer, the planner or the live screen.
  queryPlanOrFollowLink(): HTMLElement | null {
    return screen.queryByRole('link', { name: /planifier le menu|suivre le marché/i });
  }

  // Calling off today, and taking it back

  callOffButton(): HTMLElement {
    return screen.getByRole('button', { name: "Je ne peux pas venir aujourd'hui" });
  }

  queryCallOffButton(): HTMLElement | null {
    return screen.queryByRole('button', { name: "Je ne peux pas venir aujourd'hui" });
  }

  reopenStandButton(): HTMLElement {
    return screen.getByRole('button', { name: 'Rouvrir le stand' });
  }

  callOff(): this {
    return this.press(this.callOffButton());
  }
}
