import { expect, test } from '@playwright/test';
import {
  ADMIN,
  choose,
  confirm,
  createFlag,
  createProject,
  openFlag,
  openProject,
  saveDefinition,
  signIn,
  uniqueSuffix,
} from './support';

// Admin-only surfaces: API keys (FR-45) and the audit log (FR-46).

test.describe('API keys', () => {
  test('a created key is shown once, stays visible, and can be revoked', async ({
    page,
  }) => {
    await signIn(page, ADMIN.username, ADMIN.password);
    const name = `e2e-key-${uniqueSuffix()}`;
    await page.goto('/#/api-keys');

    await page.getByTestId('api-key-new').click();
    await page.getByTestId('api-key-name').locator('input').fill(name);
    await choose(page, 'api-key-scope', 'sync');
    await page.getByTestId('api-key-create').click();

    const plaintext = page.getByTestId('api-key-plaintext');
    await expect(plaintext).toHaveText(/^fms_[A-Za-z0-9]+$/);
    const row = page.locator(`tr[data-key-name="${name}"]`);
    await expect(row).toContainText('sync');
    await expect(row.getByTestId('api-key-status')).toHaveText('Active');
    // The list has reloaded and the one-time plaintext is still on screen.
    await expect(plaintext).toBeVisible();

    await page.getByRole('button', { name: 'I have copied the key' }).click();
    await expect(plaintext).toHaveCount(0);
    await page.reload();
    await expect(row).toBeVisible();
    await expect(page.getByTestId('api-key-plaintext')).toHaveCount(0);

    await row.getByRole('button', { name: `Revoke ${name}` }).click();
    await confirm(page, 'Revoke key');
    await expect(row.getByTestId('api-key-status')).toHaveText('Revoked');
    await expect(row.getByRole('button')).toHaveCount(0);
  });
});

test.describe('audit log', () => {
  test('a definition change is listed with an expandable before/after diff', async ({
    page,
  }) => {
    await signIn(page, ADMIN.username, ADMIN.password);
    const project = await createProject(page, 'audit');
    await openProject(page, project);
    await createFlag(page, 'audited');
    await openFlag(page, 'audited');
    await page.getByTestId('definition-enabled').click();
    await saveDefinition(page);

    await page.goto('/#/audit');
    await page
      .getByTestId('audit-action-filter')
      .locator('input')
      .fill('definition.update');
    await page.getByTestId('audit-search').click();

    const newest = page.getByTestId('audit-row').first();
    await expect(newest).toContainText('definition.update');
    await expect(newest).toContainText('admin');
    await expect(newest).toContainText('audited');
    await expect(newest).toContainText('dev');
    await newest.getByTestId('audit-diff-toggle').click();
    const diff = page.getByTestId('audit-diff').first();
    await expect(diff).toContainText('enabled');
    await expect(diff).toContainText('before: true');
    await expect(diff).toContainText('after: false');
  });

  test('older pages keep the applied filter', async ({ page }) => {
    await signIn(page, ADMIN.username, ADMIN.password);
    // 51 audited logins guarantee a second page of `auth.login` entries.
    for (let i = 0; i < 51; i += 1) {
      await page.request.post('/api/v1/auth/login', { data: ADMIN });
    }

    await page.goto('/#/audit');
    await page
      .getByTestId('audit-action-filter')
      .locator('input')
      .fill('auth.login');
    await page.getByTestId('audit-search').click();
    await expect(page.getByTestId('audit-row')).toHaveCount(50);

    await page.getByTestId('audit-older').click();
    const rows = page.getByTestId('audit-row');
    await expect(rows.nth(50)).toBeVisible();
    const actions = await rows.locator('code.action').allInnerTexts();
    expect(actions.every((action) => action === 'auth.login')).toBe(true);
  });
});
