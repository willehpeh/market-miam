import { Email, InvalidEmailError } from '@market-monster/common';

describe('Email', () => {
  it('should create with a valid email', () => {
    const validEmail = 'person@domain.com';
    const email = new Email(validEmail);

    expect(email.value()).toBe(validEmail);
  });

  it.each([
    ['an empty string', ''],
    ['no @ symbol', 'person.domain.com'],
    ['no local part', '@domain.com'],
    ['no domain', 'person@'],
    ['no top-level domain', 'person@domain'],
    ['a trailing dot in the domain', 'person@domain.'],
    ['a leading dot in the domain', 'person@.domain.com'],
    ['multiple @ symbols', 'person@@domain.com'],
    ['an internal space', 'per son@domain.com'],
    ['a leading space', ' person@domain.com'],
    ['a trailing space', 'person@domain.com '],
    ['a one-character top-level domain', 'person@domain.c'],
  ])('should fail with an email with %s', (_, invalidEmail) => {
    expect(() => new Email(invalidEmail)).toThrow(InvalidEmailError);
  });
});