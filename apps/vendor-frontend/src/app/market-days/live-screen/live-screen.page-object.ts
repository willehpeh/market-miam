import { fireEvent, render, RenderResult, screen, within } from '@testing-library/angular';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { LiveScreen } from './live-screen';
import { MarketDayFacade } from '../market-day.facade';
import { FakeMarketDayFacade } from '../fake.market-day.facade';
import { CatalogueFacade } from '../../catalogue/catalogue.facade';
import { FakeCatalogueFacade } from '../../catalogue/fake.catalogue.facade';

// The live screen as the vendor runs it on the morning: the rows they tap, the épuisé group
// the rows move into, and the doors at the foot (ADR 0062). It asserts nothing, and it never
// hands out a facade: a spec that arranges or checks one builds the fake and passes it in.
export class LiveScreenPageObject {
  private constructor(private readonly view: RenderResult<LiveScreen>) {}

  // Stands on the Saturday the market-day builder stages, unless told otherwise.
  static async render({
    marketDays = new FakeMarketDayFacade(),
    catalogue = new FakeCatalogueFacade(),
    marketId = 'market-1',
    date = '2026-08-15',
  }: { marketDays?: MarketDayFacade; catalogue?: CatalogueFacade; marketId?: string; date?: string } = {}) {
    const view = await render(LiveScreen, {
      providers: [
        provideRouter([]),
        { provide: MarketDayFacade, useValue: marketDays },
        { provide: CatalogueFacade, useValue: catalogue },
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap: convertToParamMap({ marketId, date }) } } },
      ],
    });
    return new LiveScreenPageObject(view);
  }

  // For a change from outside the screen, such as a spec setting its fake's state.
  detectChanges(): this {
    this.view.detectChanges();
    return this;
  }

  loadingStatus(): HTMLElement {
    return screen.getByRole('status', { name: /chargement/i });
  }

  // The rows, found by the dish they name. `dish` finds the row in either group.

  dish(name: string): HTMLElement {
    return screen.getByRole('button', { name });
  }

  soldOutGroup(): HTMLElement {
    return screen.getByRole('region', { name: /épuisé/i });
  }

  querySoldOutGroup(): HTMLElement | null {
    return screen.queryByRole('region', { name: /épuisé/i });
  }

  soldOutDish(name: string): HTMLElement {
    return within(this.soldOutGroup()).getByRole('button', { name });
  }

  querySoldOutDish(name: string): HTMLElement | null {
    return within(this.soldOutGroup()).queryByRole('button', { name });
  }

  markSoldOut(dish: string): this {
    return this.press(this.dish(dish));
  }

  restore(dish: string): this {
    return this.press(this.soldOutDish(dish));
  }

  // The links

  editMenuLink(): HTMLElement {
    return screen.getByRole('link', { name: 'Modifier le menu' });
  }

  queryEditMenuLink(): HTMLElement | null {
    return screen.queryByRole('link', { name: 'Modifier le menu' });
  }

  bilanLink(): HTMLElement {
    return screen.getByRole('link', { name: 'Faire le bilan' });
  }

  queryBilanLink(): HTMLElement | null {
    return screen.queryByRole('link', { name: 'Faire le bilan' });
  }

  // The door at the foot: one verb before the market starts, another once it runs, Rouvrir
  // in their place once the stand is shut.

  callOffButton(): HTMLElement {
    return screen.getByRole('button', { name: "Je ne peux pas venir aujourd'hui" });
  }

  queryCallOffButton(): HTMLElement | null {
    return screen.queryByRole('button', { name: /je ne peux pas venir/i });
  }

  closeStandButton(): HTMLElement {
    return screen.getByRole('button', { name: 'Fermer le stand' });
  }

  queryCloseStandButton(): HTMLElement | null {
    return screen.queryByRole('button', { name: 'Fermer le stand' });
  }

  reopenStandButton(): HTMLElement {
    return screen.getByRole('button', { name: 'Rouvrir le stand' });
  }

  queryReopenStandButton(): HTMLElement | null {
    return screen.queryByRole('button', { name: 'Rouvrir le stand' });
  }

  callOff(): this {
    return this.press(this.callOffButton());
  }

  closeStand(): this {
    return this.press(this.closeStandButton());
  }

  reopenStand(): this {
    return this.press(this.reopenStandButton());
  }

  // The phone coming out of the apron: the tab is shown again.
  comeBackToTab(): this {
    document.dispatchEvent(new Event('visibilitychange'));
    return this.detectChanges();
  }

  private press(element: HTMLElement): this {
    fireEvent.click(element);
    return this.detectChanges();
  }
}
