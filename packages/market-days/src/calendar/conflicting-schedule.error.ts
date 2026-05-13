export class ConflictingScheduleError extends Error {
  constructor() {
    super('Market schedule contains overlapping days');
    this.name = 'ConflictingScheduleError';
  }
}
