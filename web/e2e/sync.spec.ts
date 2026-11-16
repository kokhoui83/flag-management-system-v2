import { expect, test } from '@playwright/test';
import {
  ADMIN,
  choose,
  createBareFlag,
  createFlag,
  flagRow,
  openFlag,
  saveDefinition,
  signIn,
  uniqueSuffix,
  type Project,
} from './support';

// Live evaluation and sync health against a running flagd (FR-44/FR-47/FR-52). The stack
// script provisions project `checkout`, the only project flagd syncs.

const CHECKOUT: Project = { key: 'checkout', name: 'Checkout' };

async function openCheckout(
  page: import('@playwright/test').Page,
): Promise<void> {
  await page.goto('/#/projects');
  await page
    .locator('[data-project="checkout"]')
    .getByRole('button', { name: 'Open flags' })
    .click();
  await expect(
    page.getByRole('heading', { level: 1, name: CHECKOUT.name }),
  ).toBeVisible();
}

test.describe('live sync', () => {
  test('a change by another operator reaches the open flag list without a reload (FR-47/FR-52)', async ({
    page,
    browser,
  }) => {
    const flagKey = `sync-${uniqueSuffix()}`;
    await signIn(page, ADMIN.username, ADMIN.password);
    await openCheckout(page);
    await expect(page.getByTestId('live-pill')).toHaveAttribute(
      'data-live-state',
      'live',
    );

    // A second operator creates and changes the flag; this page only listens.
    const other = await (await browser.newContext()).newPage();
    await signIn(other, ADMIN.username, ADMIN.password);
    await openCheckout(other);
    await createFlag(other, flagKey);

    // The creating operator sees flagd pick the new flag up (stale/unknown → synced).
    await expect(other.getByTestId(`sync-badge-${flagKey}`)).toHaveAttribute(
      'data-sync-state',
      'synced',
      { timeout: 20_000 },
    );

    // A modification is announced by flagd: once it serves the new version, the listening
    // page shows the flag, its new state and a synced badge — without polling or reloading.
    await openFlag(other, flagKey);
    await other.getByTestId('definition-enabled').click();
    await other.getByTestId('definition-save').click();
    await expect(other.getByTestId('editor-saved')).toContainText('v2 → v3');

    const row = flagRow(page, flagKey);
    await expect(row).toBeVisible({ timeout: 20_000 });
    await expect(row.getByTestId('flag-env-dev')).toHaveText('OFF');
    await expect(row.getByTestId('flag-version')).toHaveText('v3');
    await expect(page.getByTestId(`sync-badge-${flagKey}`)).toHaveAttribute(
      'data-sync-state',
      'synced',
      { timeout: 20_000 },
    );
    await expect(other.getByTestId(`sync-badge-${flagKey}`)).toHaveAttribute(
      'data-sync-state',
      'synced',
      { timeout: 20_000 },
    );
  });
});

test.describe('playground', () => {
  test('evaluates a flag straight after a page load, without visiting other views (FR-44)', async ({
    page,
  }) => {
    const flagKey = `play-${uniqueSuffix()}`;
    await signIn(page, ADMIN.username, ADMIN.password);
    await openCheckout(page);
    await createBareFlag(page, flagKey);
    await page.getByRole('button', { name: 'Add percentage rule' }).click();
    await saveDefinition(page);
    await expect(page.getByTestId(`sync-badge-${flagKey}`)).toHaveAttribute(
      'data-sync-state',
      'synced',
      { timeout: 20_000 },
    );

    // Fresh page load directly on the playground: nothing was loaded by other views.
    await page.goto('/#/playground');
    await page.reload();
    await choose(page, 'playground-project', CHECKOUT.name);
    await choose(page, 'playground-flag', flagKey);
    await choose(page, 'playground-env', 'dev');

    // Percentage rule → a targeting key is required before anything is sent.
    await page.getByTestId('playground-evaluate').click();
    await expect(page.getByTestId('playground-error')).toContainText(
      'targeting key is required',
    );

    await page
      .getByTestId('playground-targeting-key')
      .locator('input')
      .fill('user-42');
    await page
      .getByTestId('playground-context')
      .locator('textarea')
      .fill('{"plan":"pro"}');
    await page.getByTestId('playground-evaluate').click();

    await expect(page.getByTestId('result-value')).toHaveText(/^(true|false)$/);
    await expect(page.getByTestId('result-variant')).toHaveText(/^(on|off)$/);
    await expect(page.getByTestId('result-reason')).toHaveText(/\w+/);
    await expect(page.getByTestId('result-version')).toHaveText('2');
  });
});

// Sync-health states against the real engine (M4.5): stale → synced after a change, and the
// state shown while flagd is down. These tests stop and start the stack's flagd container.
test.describe('sync health states', () => {
  test.describe.configure({ mode: 'serial' });

  /** Record every state the badge passes through, so a short-lived "stale" is not missed. */
  async function recordBadgeStates(
    page: import('@playwright/test').Page,
    flagKey: string,
  ): Promise<void> {
    await page.evaluate((key) => {
      const states: string[] = [];
      (window as unknown as { syncStates: string[] }).syncStates = states;
      const read = (): void => {
        const state = document
          .querySelector(`[data-testid="sync-badge-${key}"]`)
          ?.getAttribute('data-sync-state');
        if (state && states[states.length - 1] !== state) states.push(state);
      };
      read();
      new MutationObserver(read).observe(document.body, {
        subtree: true,
        childList: true,
        attributes: true,
        attributeFilter: ['data-sync-state'],
      });
    }, flagKey);
  }

  async function badgeStates(
    page: import('@playwright/test').Page,
  ): Promise<string[]> {
    return page.evaluate(
      () => (window as unknown as { syncStates: string[] }).syncStates,
    );
  }

  test('a saved change is shown as stale until flagd serves it, then synced', async ({
    page,
  }) => {
    const flagKey = `stale-${uniqueSuffix()}`;
    await signIn(page, ADMIN.username, ADMIN.password);
    await openCheckout(page);
    await createBareFlag(page, flagKey);
    await saveDefinition(page);
    const badge = page.getByTestId(`sync-badge-${flagKey}`);
    await expect(badge).toHaveAttribute('data-sync-state', 'synced', {
      timeout: 20_000,
    });
    await recordBadgeStates(page, flagKey);

    // flagd polls every second, so a save is normally probed before flagd has the new
    // version; repeat the change if a poll happened to land in between.
    await expect(async () => {
      await page.getByTestId('definition-enabled').click();
      await page.getByTestId('definition-save').click();
      await expect(badge).toHaveAttribute('data-sync-state', 'synced', {
        timeout: 15_000,
      });
      const states = await badgeStates(page);
      expect(states.join(' → ')).toMatch(/stale → synced$/);
    }).toPass({ timeout: 90_000 });

    await expect(badge).toContainText('Synced v');
  });

  test('flagd going down is shown as unavailable and recovers to synced', async ({
    page,
  }) => {
    test.setTimeout(180_000);
    const { execFileSync } = await import('node:child_process');
    const flagd = (action: 'stop' | 'start'): void => {
      execFileSync('docker', [action, 'fms-e2e-flagd'], { stdio: 'ignore' });
    };
    const flagKey = `down-${uniqueSuffix()}`;
    await signIn(page, ADMIN.username, ADMIN.password);
    await openCheckout(page);
    await createFlag(page, flagKey);
    const badge = page.getByTestId(`sync-badge-${flagKey}`);
    await expect(badge).toHaveAttribute('data-sync-state', 'synced', {
      timeout: 20_000,
    });

    flagd('stop');
    try {
      // Management keeps working while flagd is down (NFR-3); the change cannot be observed.
      await flagRow(page, flagKey).getByTestId('flag-toggle').first().click();
      await page
        .locator('.n-popconfirm__action:visible')
        .getByRole('button', { name: 'Turn off' })
        .click();
      await expect(
        flagRow(page, flagKey).getByTestId('flag-env-dev'),
      ).toHaveText('OFF', {
        timeout: 30_000,
      });
      await expect(badge).toHaveAttribute('data-sync-state', 'unavailable', {
        timeout: 60_000,
      });
      await expect(badge).toHaveText('Sync unavailable');
      await expect(
        page.locator('[data-env="dev"]').getByTestId('env-health'),
      ).toHaveText('Sync unavailable');
    } finally {
      flagd('start');
    }

    // Once flagd is back and has synced, the badge recovers — on a reload at the latest.
    await expect(async () => {
      await page.reload();
      await expect(page.getByTestId(`sync-badge-${flagKey}`)).toHaveAttribute(
        'data-sync-state',
        'synced',
        { timeout: 10_000 },
      );
    }).toPass({ timeout: 120_000 });
  });
});
