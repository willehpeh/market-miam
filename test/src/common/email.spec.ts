import { Email, InvalidEmailError } from '@market-monster/common';

describe('Email', () => {
  it.each([
    ['a simple address', 'person@domain.com'],
    ['plus-addressing', 'person+tag@domain.com'],
    ['a dotted local part', 'p.lastname@domain.com'],
    ['a subdomain', 'person@mail.domain.com'],
    ['a multi-level top-level domain', 'person@mail.domain.co.uk'],
  ])('should create with a valid email with %s', (_, validEmail) => {
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