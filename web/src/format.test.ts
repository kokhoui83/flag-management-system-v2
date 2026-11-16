import { describe, it, expect } from 'vitest';
import { validateFlagKey } from '@fms/shared';
import {
  formatRelative,
  formatTimestamp,
  initialsOf,
  orderEnvironments,
  suggestFlagKey,
} from './format';

describe('formatRelative', () => {
  const now = new Date('2026-11-16T12:00:00.000Z');

  it.each([
    ['2026-11-16T11:59:30.000Z', 'just now'],
    ['2026-11-16T11:58:00.000Z', '2 min ago'],
    ['2026-11-16T09:00:00.000Z', '3 h ago'],
    ['2026-11-14T12:00:00.000Z', '2 d ago'],
    ['2026-10-01T08:00:00.000Z', '2026-10-01'],
  ])('renders %s as "%s"', (iso, expected) => {
    expect(formatRelative(iso, now)).toBe(expected);
  });

  it('returns the input when it is not a timestamp', () => {
    expect(formatRelative('never', now)).toBe('never');
  });
});

describe('formatTimestamp', () => {
  it('renders an unambiguous UTC timestamp', () => {
    expect(formatTimestamp('2026-11-16T09:05:42.123Z')).toBe(
      '2026-11-16 09:05 UTC',
    );
  });
});

describe('suggestFlagKey', () => {
  it.each([
    ['New payment flow', 'new-payment-flow'],
    ['  Dark   Mode!  ', 'dark-mode'],
    ['2026 pricing (beta)', 'pricing-beta'],
    ['Café crème', 'cafe-creme'],
    ['', ''],
  ])('suggests "%s" → "%s"', (name, expected) => {
    expect(suggestFlagKey(name)).toBe(expected);
  });

  it('suggests keys the shared validator accepts', () => {
    expect(validateFlagKey(suggestFlagKey('New payment flow'))).toEqual([]);
    expect(validateFlagKey(suggestFlagKey('x'.repeat(300)))).toEqual([]);
  });
});

describe('initialsOf', () => {
  it.each([
    ['admin', 'AD'],
    ['jane.doe', 'JD'],
    ['po-uf6', 'PU'],
    ['', '?'],
  ])('derives initials of "%s"', (name, expected) => {
    expect(initialsOf(name)).toBe(expected);
  });
});

describe('orderEnvironments', () => {
  it('lists the default environments in promotion order, then custom ones by name', () => {
    expect(
      orderEnvironments(['prod', 'qa', 'dev', 'canary', 'staging']),
    ).toEqual(['dev', 'staging', 'prod', 'canary', 'qa']);
  });

  it('does not modify its input', () => {
    const input = ['prod', 'dev'];
    orderEnvironments(input);
    expect(input).toEqual(['prod', 'dev']);
  });
});
