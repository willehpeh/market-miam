import { screen } from '@testing-library/angular';
import { AddSchedulePageObject } from './add-schedule.page-object';
import { FakeMarketScheduleFacade, schedulesOf } from './fake.market-schedule.facade';
import { MarketScheduleView } from './market-schedules';

describe('AddSchedule', () => {
  it('offers a cancel route back to the calendar', async () => {
    const page = await AddSchedulePageObject.render();

    expect(page.cancelLink()).toHaveAttribute('href', '/dashboard/markets');
  });

  it('disables the one-off frequency for now', async () => {
    const page = await AddSchedulePageObject.render();

    expect(page.oneOffButton()).toBeDisabled();
  });

  it('will not submit an empty form', async () => {
    const page = await AddSchedulePageObject.render();

    expect(page.addButton()).toBeDisabled();
  });

  it('adds a time row with default hours when a day is picked', async () => {
    const page = await AddSchedulePageObject.render();

    page.pickDay('mardi');

    expect(page.startTimeField('mardi')).toHaveValue('08:00');
    expect(page.endTimeField('mardi')).toHaveValue('13:00');
  });

  it('removes the time row when the day is unpicked', async () => {
    const page = await AddSchedulePageObject.render();

    page.pickDay('mardi').unpickDay('mardi');

    expect(page.queryStartTimeField('mardi')).toBeNull();
  });

  it('flags a postal code that is not five digits', async () => {
    const page = await AddSchedulePageObject.render();

    page.enterPostalCode('69').leavePostalCode();

    expect(screen.getByText(/5 chiffres/i)).toBeVisible();
  });

  it('enables submit once name, town, a 5-digit postal and a day are set', async () => {
    const page = await AddSchedulePageObject.render();

    page.enterName('Marché de Monplaisir').enterPostalCode('69008').enterTown('Lyon').pickDay('mardi');

    expect(page.addButton()).toBeEnabled();
  });

  it('registers the schedule, omitting empty optionals and defaulting weekly', async () => {
    const markets = new FakeMarketScheduleFacade();
    const page = await AddSchedulePageObject.render({ markets });
    page.enterName('Marché de Monplaisir').enterPostalCode('69008').enterTown('Lyon').pickDay('mardi');

    page.add();

    expect(markets.registered).toEqual({
      market: { name: 'Marché de Monplaisir', codePostal: '69008', town: 'Lyon' },
      days: [{ day: 'TUE', startTime: '08:00', endTime: '13:00' }],
      frequency: { weeks: 1 },
    });
  });

  it('carries address, pitch and multiple days in weekday order', async () => {
    const markets = new FakeMarketScheduleFacade();
    const page = await AddSchedulePageObject.render({ markets });
    page
      .enterName('Marché de Monplaisir')
      .enterPostalCode('69008')
      .enterTown('Lyon')
      .enterAddress('Place du Prado')
      .enterPitch('Allée centrale, stand 24')
      .pickDay('jeudi')
      .pickDay('mardi');

    page.add();

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
    const page = await AddSchedulePageObject.render();
    page.enterName('Marché de Monplaisir').enterPostalCode('69008').enterTown('Lyon').pickDay('mardi');

    page.enterEndTime('mardi', '07:00');

    expect(page.addButton()).toBeDisabled();
  });

  // A day with no closing time never ends: it hides the next day from the vendor's menu
  // card until midnight, and lists a packed-up market to customers all evening.
  it('will not submit a day with no closing time', async () => {
    const page = await AddSchedulePageObject.render();
    page.enterName('Marché de Monplaisir').enterPostalCode('69008').enterTown('Lyon').pickDay('mardi');

    page.clearEndTime('mardi');

    expect(page.addButton()).toBeDisabled();
  });

  it('will not submit a day with no opening time', async () => {
    const page = await AddSchedulePageObject.render();
    page.enterName('Marché de Monplaisir').enterPostalCode('69008').enterTown('Lyon').pickDay('mardi');

    page.clearStartTime('mardi');

    expect(page.addButton()).toBeDisabled();
  });

  // The day rules live outside the form — `days` is a set of custom toggles, not a field —
  // so nothing in the template could carry their errors. An impossible closing time used
  // to disable the button and say nothing at all.
  describe('saying why the market cannot be added yet', () => {
    it('names what a blank form is still missing', async () => {
      await AddSchedulePageObject.render();

      expect(screen.getByText('Indiquez le nom du marché.')).toBeVisible();
      expect(screen.getByText('Indiquez la ville.')).toBeVisible();
      expect(screen.getByText('Complétez le code postal.')).toBeVisible();
      expect(screen.getByText('Choisissez au moins un jour.')).toBeVisible();
    });

    it('describes the disabled button with those reasons', async () => {
      const page = await AddSchedulePageObject.render();

      const describedBy = page.addButton().getAttribute('aria-describedby');
      expect(describedBy).toBeTruthy();
      expect(page.addButton()).toHaveAccessibleDescription(expect.stringContaining('Indiquez le nom du marché.'));
    });

    it('says when a day has no closing time', async () => {
      const page = await AddSchedulePageObject.render();
      page.enterName('Marché de Monplaisir').enterPostalCode('69008').enterTown('Lyon').pickDay('mardi');

      page.clearEndTime('mardi');

      expect(screen.getByText('Complétez les horaires de chaque jour.')).toBeVisible();
    });

    it('says when a day closes before it opens', async () => {
      const page = await AddSchedulePageObject.render();
      page.enterName('Marché de Monplaisir').enterPostalCode('69008').enterTown('Lyon').pickDay('mardi');

      page.enterEndTime('mardi', '07:00');

      expect(screen.getByText('Une fermeture ne peut pas précéder son ouverture.')).toBeVisible();
    });

    it('says nothing once the market can be added', async () => {
      const page = await AddSchedulePageObject.render();

      page.enterName('Marché de Monplaisir').enterPostalCode('69008').enterTown('Lyon').pickDay('mardi');

      expect(page.addButton()).toBeEnabled();
      expect(screen.queryByText('Choisissez au moins un jour.')).not.toBeInTheDocument();
      expect(page.addButton()).not.toHaveAttribute('aria-describedby');
    });
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

    it('pre-fills the form from the schedule and labels it as an edit', async () => {
      const page = await AddSchedulePageObject.render({ markets: schedulesOf(existing), scheduleId: 'schedule-1' });

      expect(screen.getByText(/modifier le marché/i)).toBeVisible();
      expect(page.nameField()).toHaveValue('Marché de Belleville');
      expect(page.townField()).toHaveValue('Paris');
      expect(page.dayButton('mardi')).toHaveAttribute('aria-pressed', 'true');
      expect(page.startTimeField('mardi')).toHaveValue('07:00');
      expect(page.endTimeField('mardi')).toHaveValue('14:30');
    });

    // The cold direct-nav the route guard used to cover: the screen waits for the market
    // it names rather than rendering an empty form a save would write back over it.
    function stillLoading(): FakeMarketScheduleFacade {
      const markets = new FakeMarketScheduleFacade();
      markets.loading.set(true);
      return markets;
    }

    function deliver(markets: FakeMarketScheduleFacade, schedules: MarketScheduleView[]) {
      markets.schedules.set(schedules);
      markets.loading.set(false);
    }

    it('asks for the schedules itself, now that no guard warms them', async () => {
      const markets = stillLoading();
      await AddSchedulePageObject.render({ markets, scheduleId: 'schedule-1' });

      expect(markets.loaded).toBe(true);
    });

    it('waits rather than offering an empty form', async () => {
      const page = await AddSchedulePageObject.render({ markets: stillLoading(), scheduleId: 'schedule-1' });

      expect(page.loadingStatus()).toBeInTheDocument();
      expect(page.queryNameField()).not.toBeInTheDocument();
      expect(page.querySaveButton()).not.toBeInTheDocument();
    });

    it('prefills once the market arrives, days and hours included', async () => {
      const markets = stillLoading();
      const page = await AddSchedulePageObject.render({ markets, scheduleId: 'schedule-1' });

      deliver(markets, [existing]);
      page.detectChanges();

      expect(page.nameField()).toHaveValue('Marché de Belleville');
      expect(page.dayButton('mardi')).toHaveAttribute('aria-pressed', 'true');
      expect(page.startTimeField('mardi')).toHaveValue('07:00');
    });

    it('amends the market that arrives rather than registering a second one', async () => {
      const markets = stillLoading();
      const page = await AddSchedulePageObject.render({ markets, scheduleId: 'schedule-1' });
      deliver(markets, [existing]);
      page.detectChanges();

      page.enterName('Marché Renommé').save();

      expect(markets.amended?.scheduleId).toBe('schedule-1');
      expect(markets.registered).toBeUndefined();
    });

    it('keeps what the vendor typed when the store updates underneath', async () => {
      const markets = stillLoading();
      const page = await AddSchedulePageObject.render({ markets, scheduleId: 'schedule-1' });
      deliver(markets, [existing]);
      page.detectChanges().enterName('Marché Renommé');

      markets.schedules.set([{ ...existing, startDate: '2026-08-01' }]);
      page.detectChanges();

      expect(page.nameField()).toHaveValue('Marché Renommé');
    });

    it('says so when the market is no longer in the calendar, offering no save', async () => {
      const markets = stillLoading();
      const page = await AddSchedulePageObject.render({ markets, scheduleId: 'schedule-1' });

      deliver(markets, []);
      page.detectChanges();

      expect(screen.getByText(/n'est plus dans votre calendrier/i)).toBeVisible();
      expect(page.marketsLink()).toBeInTheDocument();
      expect(page.querySaveButton()).not.toBeInTheDocument();
    });

    it('amends via the facade with the schedule id and edited values', async () => {
      const markets = schedulesOf(existing);
      const page = await AddSchedulePageObject.render({ markets, scheduleId: 'schedule-1' });
      page.enterName('Marché Renommé');

      page.save();

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
