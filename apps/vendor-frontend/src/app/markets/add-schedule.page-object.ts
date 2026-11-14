import { fireEvent, render, RenderResult, screen } from '@testing-library/angular';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { PageObject } from '../core/page-object';
import { AddSchedule } from './add-schedule';
import { MarketScheduleFacade } from './market-schedule.facade';
import { FakeMarketScheduleFacade } from './fake.market-schedule.facade';

// The market form as the vendor meets it: the controls they reach for, found by the labels
// they read, and what they do with them (ADR 0062).
export class AddSchedulePageObject extends PageObject<AddSchedule> {
  private constructor(view: RenderResult<AddSchedule>) {
    super(view);
  }

  // Adds a market without a scheduleId, edits that schedule with one.
  static async render({ markets = new FakeMarketScheduleFacade(), scheduleId }: { markets?: MarketScheduleFacade; scheduleId?: string } = {}) {
    const route = scheduleId
      ? [{ provide: ActivatedRoute, useValue: { snapshot: { paramMap: convertToParamMap({ scheduleId }) } } }]
      : [];
    const view = await render(AddSchedule, {
      providers: [provideRouter([]), { provide: MarketScheduleFacade, useValue: markets }, ...route],
    });
    return new AddSchedulePageObject(view);
  }

  // The market

  nameField(): HTMLInputElement {
    return screen.getByLabelText(/nom du marché/i) as HTMLInputElement;
  }

  queryNameField(): HTMLElement | null {
    return screen.queryByLabelText(/nom du marché/i);
  }

  private addressField(): HTMLInputElement {
    return screen.getByLabelText(/adresse/i) as HTMLInputElement;
  }

  private postalCodeField(): HTMLInputElement {
    return screen.getByLabelText(/code postal/i) as HTMLInputElement;
  }

  townField(): HTMLInputElement {
    return screen.getByLabelText(/ville/i) as HTMLInputElement;
  }

  private pitchField(): HTMLInputElement {
    return screen.getByLabelText(/emplacement/i) as HTMLInputElement;
  }

  enterName(name: string): this {
    return this.type(this.nameField(), name);
  }

  enterAddress(address: string): this {
    return this.type(this.addressField(), address);
  }

  enterPostalCode(postalCode: string): this {
    return this.type(this.postalCodeField(), postalCode);
  }

  enterTown(town: string): this {
    return this.type(this.townField(), town);
  }

  enterPitch(pitch: string): this {
    return this.type(this.pitchField(), pitch);
  }

  leavePostalCode(): this {
    fireEvent.blur(this.postalCodeField());
    return this;
  }

  // The frequency

  oneOffButton(): HTMLElement {
    return screen.getByRole('button', { name: /une seule fois/i });
  }

  // The days and their hours. A day is named as the vendor reads it on its button, 'mardi',
  // and its two time fields carry that name after "Début" and "Fin".

  dayButton(day: string): HTMLElement {
    return screen.getByRole('button', { name: new RegExp(`^${day}$`, 'i') });
  }

  startTimeField(day: string): HTMLInputElement {
    return screen.getByLabelText(new RegExp(`début ${day}`, 'i')) as HTMLInputElement;
  }

  queryStartTimeField(day: string): HTMLElement | null {
    return screen.queryByLabelText(new RegExp(`début ${day}`, 'i'));
  }

  endTimeField(day: string): HTMLInputElement {
    return screen.getByLabelText(new RegExp(`fin ${day}`, 'i')) as HTMLInputElement;
  }

  pickDay(day: string): this {
    return this.press(this.dayButton(day));
  }

  unpickDay(day: string): this {
    return this.press(this.dayButton(day));
  }

  enterEndTime(day: string, time: string): this {
    return this.type(this.endTimeField(day), time);
  }

  clearStartTime(day: string): this {
    return this.type(this.startTimeField(day), '');
  }

  clearEndTime(day: string): this {
    return this.type(this.endTimeField(day), '');
  }

  // Adding, saving and leaving

  addButton(): HTMLElement {
    return screen.getByRole('button', { name: /ajouter le marché/i });
  }

  private saveButton(): HTMLElement {
    return screen.getByRole('button', { name: /enregistrer/i });
  }

  querySaveButton(): HTMLElement | null {
    return screen.queryByRole('button', { name: /enregistrer/i });
  }

  cancelLink(): HTMLElement {
    return screen.getByRole('link', { name: /annuler/i });
  }

  marketsLink(): HTMLElement {
    return screen.getByRole('link', { name: /marchés/i });
  }

  loadingStatus(): HTMLElement {
    return screen.getByRole('status', { name: /chargement/i });
  }

  add(): this {
    return this.press(this.addButton());
  }

  save(): this {
    return this.press(this.saveButton());
  }
}
