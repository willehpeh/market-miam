import { render, screen } from '@testing-library/angular';
import { provideRouter } from '@angular/router';
import { BilanPrompt } from './bilan-prompt';
import { MarketDayFacade } from './market-day.facade';
import { FakeMarketDayFacade } from './fake.market-day.facade';
import { UnratedMarketDay } from './market-days';

const saturday: UnratedMarketDay = {
  marketId: 'market-1',
  date: '2026-08-15',
  day: 'SAT',
  marketName: 'Marché de la Croix-Rousse',
};

async function renderPrompt(setup: (marketDays: FakeMarketDayFacade) => void = () => void 0) {
  const marketDays = new FakeMarketDayFacade();
  setup(marketDays);
  await render(BilanPrompt, {
    providers: [provideRouter([]), { provide: MarketDayFacade, useValue: marketDays }],
  });
  return { marketDays };
}

describe('BilanPrompt', () => {
  it('asks for the unrated days on the way in', async () => {
    const { marketDays } = await renderPrompt();

    expect(marketDays.loadedUnrated).toBe(true);
  });

  // A nudge with nothing to nudge about is not a card — the dashboard is sparse enough
  // that an empty *rien à juger* tile would be the loudest thing on it.
  it('says nothing when every market has been judged', async () => {
    await renderPrompt();

    expect(screen.queryByRole('heading')).toBeNull();
  });

  // Decision 65: the upcoming list drops a day at endTime, so this is the only door back
  // to a market that finished — and it links at the bilan, not at the live screen.
  it('names the market to judge and links at its bilan', async () => {
    await renderPrompt((marketDays) => marketDays.unrated.set([saturday]));

    expect(screen.getByRole('heading', { name: /bilan/i })).toBeTruthy();
    expect(screen.getByText(/samedi 15 août/i)).toBeTruthy();
    expect(screen.getByText('Marché de la Croix-Rousse')).toBeTruthy();
    expect(screen.getByRole('link', { name: /faire le bilan/i }).getAttribute('href')).toBe(
      '/dashboard/bilan/market-1/2026-08-15',
    );
  });

  // One day, not a list (decision 65): a backlog turns a nudge into the cross-month
  // retrospective this slice defers. The query answers oldest first, so this is the one
  // about to fall out of the seven-day window.
  it('asks about one market at a time, the oldest first', async () => {
    await renderPrompt((marketDays) =>
      marketDays.unrated.set([saturday, { ...saturday, date: '2026-08-16', day: 'SUN' }]),
    );

    expect(screen.getAllByRole('link')).toHaveLength(1);
    expect(screen.getByText(/samedi 15 août/i)).toBeTruthy();
  });
});
