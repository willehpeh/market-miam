import { TestBed } from '@angular/core/testing';
import { render, screen, fireEvent } from '@testing-library/angular';
import { provideRouter } from '@angular/router';
import { AddSchedule } from './add-schedule';
import { MarketScheduleFacade } from './market-schedule.facade';
import { FakeMarketScheduleFacade } from './fake.market-schedule.facade';

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
    fireEvent.click(screen.getByRole('button', { name: /retirer mardi/i }));
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

  it('accepts a day with its hours cleared', async () => {
    const { view, markets } = await renderForm();
    fillRequired();
    fireEvent.click(screen.getByRole('button', { name: /^mardi$/i }));
    view.detectChanges();
    fireEvent.input(screen.getByLabelText(/début mardi/i), { target: { value: '' } });
    fireEvent.input(screen.getByLabelText(/fin mardi/i), { target: { value: '' } });
    view.detectChanges();

    fireEvent.click(submitButton());

    expect(markets.registered?.days).toEqual([{ day: 'TUE' }]);
  });
});
