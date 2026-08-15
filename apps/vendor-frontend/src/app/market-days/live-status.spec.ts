import { awaitingStart, broadcasting } from './live-status';
import { marketDayView as day } from './market-day-view.builder';

describe('awaitingStart — the waiting poll\'s gate (decision 32b)', () => {
  it('holds for a planned today before its market starts', () => {
    expect(awaitingStart(day({ today: true, itemIds: ['item-1'] }))).toBe(true);
  });

  it('stops the moment the server says the market is running', () => {
    expect(awaitingStart(day({ today: true, itemIds: ['item-1'], inProgress: true }))).toBe(false);
  });

  it('never holds for a day that is not today', () => {
    expect(awaitingStart(day({ itemIds: ['item-1'] }))).toBe(false);
  });

  it('never holds while the menu is empty — there is nothing to broadcast', () => {
    expect(awaitingStart(day({ today: true }))).toBe(false);
  });

  it('stops when the day leaves the upcoming window', () => {
    expect(awaitingStart(undefined)).toBe(false);
  });
});

describe('broadcasting — the En direct receipt\'s claim (decisions 26, 37)', () => {
  it('holds for a running market with a menu', () => {
    expect(broadcasting(day({ today: true, itemIds: ['item-1'], inProgress: true }))).toBe(true);
  });

  it('is not just being at the market — an empty menu broadcasts nothing', () => {
    expect(broadcasting(day({ today: true, inProgress: true }))).toBe(false);
  });

  it('is not merely the day having come', () => {
    expect(broadcasting(day({ today: true, itemIds: ['item-1'] }))).toBe(false);
  });
});
