import { TestBed } from '@angular/core/testing';
import { render, screen, fireEvent } from '@testing-library/angular';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { AddSchedule } from './add-schedule';
import { MarketScheduleFacade } from './market-schedule.facade';
import { FakeMarketScheduleFacade } from './fake.market-schedule.facade';
import { MarketScheduleView } from './market-schedules';

async function renderForm() {
  const view = await render(AddSchedule, {
    providers: [provideRouter([]), { provide: MarketScheduleFacade, useClass: FakeMarketScheduleFacade }],
  });
  const markets = TestBed.inject(MarketScheduleFacade) as FakeMarketScheduleFacade;
  return { view, markets };
}

function fill(label: RegExp, value: string) {
  fireEvent.input(screen.getByLabelText(label), { target: { value } });
}

function fillRequired() {
  fill(/nom du marché/i, 'Marché de Monplaisir');
  fill(/code postal/i, '69008');
  fill(/ville/i, 'Lyon');
}

const submitButton = () => screen.getByRole('button', { name: /ajouter le marché/i });

describe('AddSchedule', () => {
  it('offers a cancel route back to the calendar', async () => {
    await renderForm();
    expect(screen.getByRole('link', { name: /annuler/i })).toHaveAttribute('href', '/dashboard/markets');
  });

  it('disables the one-off frequency for now', async () => {
    await renderForm();
    expect(screen.getByRole('button', { name: /une seule fois/i })).toBeDisabled();
  });

  it('will not submit an empty form', async () => {
    await renderForm();
    expect(submitButton()).toBeDisabled();
  });

  it('adds a time row with default hours when a day is picked', async () => {
    const { view } = await renderForm();
    fireEvent.click(screen.getByRole('button', { name: /^mardi$/i }));
    view.detectChanges();

    expect(screen.getByLabelText(/début mardi/i)).toHaveValue('08:00');
    expect(screen.getByLabelText(/fin mardi/i)).toHaveValue('13:00');
  });

  it('removes the time row when the day is unpicked', async () => {
    const { view } = await renderForm();
    fireEvent.click(screen.getByRole('button', { name: /^mardi$/i }));
    view.detectChanges();
    fireEvent.click(screen.getByRole('button', { name: /^mardi$/i }));
    view.detectChanges();

    expect(screen.queryByLabelText(/début mardi/i)).toBeNull();
  });

  it('flags a postal code that is not five digits', async () => {
    const { view } = await renderForm();
    fill(/code postal/i, '69');
    fireEvent.blur(screen.getByLabelText(/code postal/i));
    view.detectChanges();

    expect(screen.getByText(/5 chiffres/i)).toBeVisible();
  });

  it('enables submit once name, town, a 5-digit postal and a day are set', async () => {
    const { view } = await renderForm();
    fillRequired();
    fireEvent.click(screen.getByRole('button', { name: /^mardi$/i }));
    view.detectChanges();

    expect(submitButton()).toBeEnabled();
  });

  it('registers the schedule, omitting empty optionals and defaulting weekly', async () => {
    const { view, markets } = await renderForm();
    fillRequired();
    fireEvent.click(screen.getByRole('button', { name: /^mardi$/i }));
    view.detectChanges();

    fireEvent.click(submitButton());

    expect(markets.registered).toEqual({
      market: { name: 'Marché de Monplaisir', codePostal: '69008', town: 'Lyon' },
      days: [{ day: 'TUE', startTime: '08:00', endTime: '13:00' }],
      frequency: { weeks: 1 },
    });
  });

  it('carries address, pitch and multiple days in weekday order', async () => {
    const { view, markets } = await renderForm();
    fillRequired();
    fill(/adresse/i, 'Place du Prado');
    fill(/emplacement/i, 'Allée centrale, stand 24');
    fireEvent.click(screen.getByRole('button', { name: /^jeudi$/i }));
    fireEvent.click(screen.getByRole('button', { name: /^mardi$/i }));
    view.detectChanges();

    fireEvent.click(submitButton());

    expect(markets.registered).toEqual({
      market: {
        name: 'Marché de Monplaisir',
        streetAddress: 'Place du Prado',
        codePostal: '69008',
        town: 'Lyon',
        pitch: 'Allée centrale, stand 24',
      },
      days: [
        { day: 'TUE', startTime: '08:00', endTime: '13:00' },
        { day: 'THU', startTime: '08:00', endTime: '13:00' },
      ],
      frequency: { weeks: 1 },
    });
  });

  it('will not submit when a day closes before it opens', async () => {
    const { view } = await renderForm();
    fillRequired();
    fireEvent.click(screen.getByRole('button', { name: /^mardi$/i }));
    view.detectChanges();
    fireEvent.input(screen.getByLabelText(/fin mardi/i), { target: { value: '07:00' } });
    view.detectChanges();

    expect(submitButton()).toBeDisabled();
  });

  // A day with no closing time never ends: it hides the next day from the vendor's menu
  // card until midnight, and lists a packed-up market to customers all evening.
  it('will not submit a day with no closing time', async () => {
    const { view } = await renderForm();
    fillRequired();
    fireEvent.click(screen.getByRole('button', { name: /^mardi$/i }));
    view.detectChanges();
    fireEvent.input(screen.getByLabelText(/fin mardi/i), { target: { value: '' } });
    view.detectChanges();

    expect(submitButton()).toBeDisabled();
  });

  it('will not submit a day with no opening time', async () => {
    const { view } = await renderForm();
    fillRequired();
    fireEvent.click(screen.getByRole('button', { name: /^mardi$/i }));
    view.detectChanges();
    fireEvent.input(screen.getByLabelText(/début mardi/i), { target: { value: '' } });
    view.detectChanges();

    expect(submitButton()).toBeDisabled();
  });

  describe('editing an existing schedule', () => {
    const existing: MarketScheduleView = {
      scheduleId: 'schedule-1',
      marketId: 'market-1',
      market: { name: 'Marché de Belleville', streetAddress: 'Bd de Belleville', codePostal: '75011', town: 'Paris', pitch: 'B12' },
      startDate: '2026-07-15',
      days: [{ day: 'TUE', startTime: '07:00', endTime: '14:30' }],
      frequency: { weeks: 1 },
    };

    async function renderEdit() {
      const markets = new FakeMarketScheduleFacade();
      markets.schedules.set([existing]);
      const view = await render(AddSchedule, {
        providers: [
          provideRouter([]),
          { provide: MarketScheduleFacade, useValue: markets },
          { provide: ActivatedRoute, useValue: { snapshot: { paramMap: convertToParamMap({ scheduleId: 'schedule-1' }) } } },
        ],
      });
      return { view, markets };
    }

    it('pre-fills the form from the schedule and labels it as an edit', async () => {
      await renderEdit();

      expect(screen.getByText(/modifier le marché/i)).toBeVisible();
      expect(screen.getByLabelText(/nom du marché/i)).toHaveValue('Marché de Belleville');
      expect(screen.getByLabelText(/ville/i)).toHaveValue('Paris');
      expect(screen.getByRole('button', { name: /^mardi$/i })).toHaveAttribute('aria-pressed', 'true');
      expect(screen.getByLabelText(/début mardi/i)).toHaveValue('07:00');
      expect(screen.getByLabelText(/fin mardi/i)).toHaveValue('14:30');
    });

    // The cold direct-nav the route guard used to cover: the screen waits for the market
    // it names rather than rendering an empty form a save would write back over it.
    async function renderCold() {
      const markets = new FakeMarketScheduleFacade();
      markets.loading.set(true);
      const view = await render(AddSchedule, {
        providers: [
          provideRouter([]),
          { provide: MarketScheduleFacade, useValue: markets },
          { provide: ActivatedRoute, useValue: { snapshot: { paramMap: convertToParamMap({ scheduleId: 'schedule-1' }) } } },
        ],
      });
      const deliver = (schedules: MarketScheduleView[]) => {
        markets.schedules.set(schedules);
        markets.loading.set(false);
        view.detectChanges();
      };
      return { view, markets, deliver };
    }

    it('asks for the schedules itself, now that no guard warms them', async () => {
      const { markets } = await renderCold();

      expect(markets.loaded).toBe(true);
    });

    it('waits rather than offering an empty form', async () => {
      await renderCold();

      expect(screen.getByRole('status', { name: /chargement/i })).toBeInTheDocument();
      expect(screen.queryByLabelText(/nom du marché/i)).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /enregistrer/i })).not.toBeInTheDocument();
    });

    it('prefills once the market arrives, days and hours included', async () => {
      const { deliver } = await renderCold();

      deliver([existing]);

      expect(screen.getByLabelText(/nom du marché/i)).toHaveValue('Marché de Belleville');
      expect(screen.getByRole('button', { name: /^mardi$/i })).toHaveAttribute('aria-pressed', 'true');
      expect(screen.getByLabelText(/début mardi/i)).toHaveValue('07:00');
    });

    it('amends the market that arrives rather than registering a second one', async () => {
      const { view, deliver, markets } = await renderCold();
      deliver([existing]);

      fireEvent.input(screen.getByLabelText(/nom du marché/i), { target: { value: 'Marché Renommé' } });
      view.detectChanges();
      fireEvent.click(screen.getByRole('button', { name: /enregistrer/i }));

      expect(markets.amended?.scheduleId).toBe('schedule-1');
      expect(markets.registered).toBeUndefined();
    });

    it('keeps what the vendor typed when the store updates underneath', async () => {
      const { view, deliver, markets } = await renderCold();
      deliver([existing]);
      fireEvent.input(screen.getByLabelText(/nom du marché/i), { target: { value: 'Marché Renommé' } });
      view.detectChanges();

      markets.schedules.set([{ ...existing, startDate: '2026-08-01' }]);
      view.detectChanges();

      expect(screen.getByLabelText(/nom du marché/i)).toHaveValue('Marché Renommé');
    });

    it('says so when the market is no longer in the calendar, offering no save', async () => {
      const { deliver } = await renderCold();

      deliver([]);

      expect(screen.getByText(/n'est plus dans votre calendrier/i)).toBeVisible();
      expect(screen.getByRole('link', { name: /marchés/i })).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /enregistrer/i })).not.toBeInTheDocument();
    });

    it('amends via the facade with the schedule id and edited values', async () => {
      const { view, markets } = await renderEdit();
      fireEvent.input(screen.getByLabelText(/nom du marché/i), { target: { value: 'Marché Renommé' } });
      view.detectChanges();

      fireEvent.click(screen.getByRole('button', { name: /enregistrer/i }));

      expect(markets.amended).toEqual({
        scheduleId: 'schedule-1',
        schedule: {
          market: { name: 'Marché Renommé', streetAddress: 'Bd de Belleville', codePostal: '75011', town: 'Paris', pitch: 'B12' },
          days: [{ day: 'TUE', startTime: '07:00', endTime: '14:30' }],
          frequency: { weeks: 1 },
        },
      });
    });
  });
});
