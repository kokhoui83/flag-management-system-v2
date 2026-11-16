/** Presentation helpers shared by the dashboard views. */

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

/** Compact "time ago" for a timestamp; falls back to the date once it is over a week old. */
export function formatRelative(iso: string, now: Date = new Date()): string {
  const then = new Date(iso);
  if (Number.isNaN(then.getTime())) return iso;
  const elapsed = now.getTime() - then.getTime();
  if (elapsed < MINUTE) return 'just now';
  if (elapsed < HOUR) return `${Math.floor(elapsed / MINUTE)} min ago`;
  if (elapsed < DAY) return `${Math.floor(elapsed / HOUR)} h ago`;
  if (elapsed < 7 * DAY) return `${Math.floor(elapsed / DAY)} d ago`;
  return then.toISOString().slice(0, 10);
}

/** Unambiguous absolute timestamp (UTC, minute precision) for tables and tooltips. */
export function formatTimestamp(iso: string): string {
  const then = new Date(iso);
  if (Number.isNaN(then.getTime())) return iso;
  return `${then.toISOString().slice(0, 16).replace('T', ' ')} UTC`;
}

/**
 * Suggest a flag key for a human name: `New payment flow` → `new-payment-flow`. The result
 * is a suggestion only — `validateFlagKey` from `@fms/shared` decides whether a key is valid.
 */
export function suggestFlagKey(name: string): string {
  return name
    .normalize('NFKD')
    .replace(/[^\x20-\x7e]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^[^a-z]+/, '')
    .replace(/-+$/, '')
    .slice(0, 128);
}

/** Up to two initials for an avatar. */
export function initialsOf(name: string): string {
  const parts = name.split(/[^A-Za-z0-9]+/).filter((part) => part.length > 0);
  const letters =
    parts.length >= 2
      ? parts[0]![0]! + parts[1]![0]!
      : (parts[0] ?? '?').slice(0, 2);
  return letters.toUpperCase();
}

const DEFAULT_ENVIRONMENT_ORDER = ['dev', 'staging', 'prod'];

/** Promotion order for display: dev → staging → prod, then custom environments by name. */
export function orderEnvironments(environments: string[]): string[] {
  const rank = (env: string): number => {
    const index = DEFAULT_ENVIRONMENT_ORDER.indexOf(env);
    return index === -1 ? DEFAULT_ENVIRONMENT_ORDER.length : index;
  };
  return [...environments].sort(
    (a, b) => rank(a) - rank(b) || a.localeCompare(b),
  );
}
