import { expect, test } from '@playwright/test';
import {
  ADMIN,
  choose,
  backToFlags,
  confirm,
  createBareFlag,
  createFlag,
  createProject,
  flagRow,
  openEnvTab,
  openFlag,
  openProject,
  saveDefinition,
  signIn,
} from './support';

// Flag editing through the real editor (FR-41–FR-43, FR-14, FR-5, FR-7/FR-8).

test.describe('flag editor', () => {
  test('an admin toggle in dev bumps the flag version and leaves sibling environments alone', async ({
    page,
  }) => {
    await signIn(page, ADMIN.username, ADMIN.password);
    const project = await createProject(page, 'toggle');
    await openProject(page, project);
    await createFlag(page, 'kill-switch');
    await expect(
      flagRow(page, 'kill-switch').getByTestId('flag-version'),
    ).toHaveText('v2');
    await openFlag(page, 'kill-switch');
    await openEnvTab(page, 'staging');
    await saveDefinition(page);

    await openEnvTab(page, 'dev');
    await page.getByTestId('definition-enabled').click();
    await saveDefinition(page);
    await expect(page.getByTestId('editor-saved')).toContainText('v3 → v4');

    // Saving the same definition again is idempotent: no version bump (FR-5).
    await saveDefinition(page);
    await expect(page.getByTestId('editor-saved')).toContainText('stays at v4');

    await backToFlags(page);
    const row = flagRow(page, 'kill-switch');
    await expect(row.getByTestId('flag-version')).toHaveText('v4');
    await expect(row.getByTestId('flag-env-dev')).toHaveText('OFF');
    await expect(row.getByTestId('flag-env-staging')).toHaveText('ON');
  });

  test('variants and ordered rules are authored in the editor and survive a reload (FR-42)', async ({
    page,
  }) => {
    await signIn(page, ADMIN.username, ADMIN.password);
    const project = await createProject(page, 'rules');
    await openProject(page, project);
    await createFlag(page, 'pricing');
    await openFlag(page, 'pricing');

    // String variants: control / treatment / holdout.
    await choose(page, 'variant-type', 'string');
    const names = page.getByTestId('variant-name').locator('input');
    const values = page.getByTestId('variant-value').locator('input');
    await names.nth(0).fill('control');
    await values.nth(0).fill('blue');
    await names.nth(1).fill('treatment');
    await values.nth(1).fill('green');
    await page.getByRole('button', { name: 'Add variant' }).click();
    await names.nth(2).fill('holdout');
    await values.nth(2).fill('grey');
    await choose(page, 'default-variant', 'control');

    // Rule 1: attribute rule → treatment; rule 2: terminal percentage split.
    await page.getByRole('button', { name: 'Add rule', exact: true }).click();
    await page.getByRole('button', { name: 'Add condition' }).click();
    await page
      .getByTestId('condition-attribute')
      .locator('input')
      .fill('email');
    await choose(page, 'condition-op', 'ends_with');
    await page
      .getByTestId('condition-value')
      .locator('input')
      .fill('@acme.com');
    await choose(page, 'rule-variant', 'treatment');
    await page.getByRole('button', { name: 'Add percentage rule' }).click();
    await saveDefinition(page);

    await page.reload();
    await expect(
      page.getByTestId('variant-name').locator('input').nth(2),
    ).toHaveValue('holdout');
    await expect(page.getByTestId('rule-item')).toHaveCount(2);
    await expect(
      page.getByTestId('condition-attribute').locator('input'),
    ).toHaveValue('email');
    await expect(
      page.getByTestId('condition-value').locator('input'),
    ).toHaveValue('@acme.com');
    await expect(page.getByTestId('split-weight')).toHaveCount(2);
  });

  test('an invalid definition lists every problem at once and is not saved (FR-14)', async ({
    page,
  }) => {
    await signIn(page, ADMIN.username, ADMIN.password);
    const project = await createProject(page, 'invalid');
    await openProject(page, project);
    await createFlag(page, 'broken');
    await openFlag(page, 'broken');

    // An attribute rule without conditions, plus a removed default variant.
    await page.getByRole('button', { name: 'Add rule', exact: true }).click();
    await page.getByTestId('variant-remove').nth(1).click();
    await page.getByTestId('definition-save').click();

    const problems = page.getByTestId('validation-problems').locator('li');
    await expect(problems).toHaveCount(2);
    await expect(page.getByTestId('validation-problems')).toContainText(
      '/defaultVariant',
    );
    await expect(page.getByTestId('validation-problems')).toContainText(
      '/rules/0',
    );
    await expect(page.getByTestId('flag-version')).toHaveText('v2');
  });

  test('copy-from replaces the target environment only (FR-43/FR-9)', async ({
    page,
  }) => {
    await signIn(page, ADMIN.username, ADMIN.password);
    const project = await createProject(page, 'copy');
    await openProject(page, project);
    await createFlag(page, 'promo');
    await openFlag(page, 'promo');
    await page.getByRole('button', { name: 'Add variant' }).click();
    await saveDefinition(page); // dev now has three variants

    await openEnvTab(page, 'prod');
    await expect(page.getByTestId('definition-missing')).toBeVisible();
    await choose(page, 'copy-source', 'dev');
    await page.getByTestId('copy-submit').click();
    await confirm(page, 'Replace definition');

    await expect(page.getByTestId('editor-saved')).toContainText(
      'Copied “dev” → “prod”',
    );
    await expect(page.getByTestId('variant-name')).toHaveCount(3);
    await expect(page.getByTestId('definition-missing')).toHaveCount(0);
    await openEnvTab(page, 'staging');
    await expect(page.getByTestId('definition-missing')).toBeVisible();
  });

  test('an admin edits the description and deletes the flag', async ({
    page,
  }) => {
    await signIn(page, ADMIN.username, ADMIN.password);
    const project = await createProject(page, 'delete');
    await openProject(page, project);
    await createFlag(page, 'short-lived');
    await openFlag(page, 'short-lived');

    await page
      .getByTestId('flag-description')
      .locator('textarea')
      .fill('remove after launch');
    await page.getByTestId('flag-description-save').click();
    await expect(page.getByTestId('editor-saved')).toHaveText(
      'Description saved',
    );

    await page.getByTestId('flag-delete').click();
    await page
      .locator('.n-popconfirm__action')
      .getByRole('button', { name: 'Delete flag' })
      .click();

    await expect(page).toHaveURL(/#\/projects\/[^/]+\/flags$/);
    await expect(flagRow(page, 'short-lived')).toHaveCount(0);
  });

  test('a new flag starts without definitions and is configured per environment (FR-7)', async ({
    page,
  }) => {
    await signIn(page, ADMIN.username, ADMIN.password);
    const project = await createProject(page, 'bare');
    await openProject(page, project);

    // The drawer suggests a key from the name.
    await page.getByTestId('flag-new').click();
    await page
      .getByTestId('flag-name-input')
      .locator('input')
      .fill('New payment flow');
    await expect(
      page.getByTestId('flag-key-input').locator('input'),
    ).toHaveValue('new-payment-flow');
    await page.getByTestId('flag-create').click();

    await expect(page.locator('main h1')).toHaveText(
      'Edit flag: new-payment-flow',
    );
    await expect(page.getByTestId('flag-version')).toHaveText('v1');
    await expect(page.getByTestId('definition-missing')).toBeVisible();
    await saveDefinition(page);
    await expect(page.getByTestId('editor-saved')).toContainText('v1 → v2');

    await backToFlags(page);
    const row = flagRow(page, 'new-payment-flow');
    await expect(row.getByTestId('flag-env-dev')).toHaveText('ON');
    await expect(row.getByTestId('flag-env-staging')).toHaveText(
      'Not configured',
    );

    // A second flag with the same key is a conflict; the drawer stays open.
    await page.getByTestId('flag-new').click();
    await page
      .getByTestId('flag-key-input')
      .locator('input')
      .fill('new-payment-flow');
    await page.getByTestId('flag-create').click();
    await expect(page.getByTestId('create-problems')).toContainText(
      'already exists',
    );
  });

  test('unsaved edits can be discarded', async ({ page }) => {
    await signIn(page, ADMIN.username, ADMIN.password);
    const project = await createProject(page, 'discard');
    await openProject(page, project);
    await createBareFlag(page, 'draft');
    await saveDefinition(page);

    await expect(page.getByTestId('definition-discard')).toBeDisabled();
    await page.getByRole('button', { name: 'Add variant' }).click();
    await expect(page.getByTestId('variant-name')).toHaveCount(3);

    await page.getByTestId('definition-discard').click();

    await expect(page.getByTestId('variant-name')).toHaveCount(2);
    await expect(page.getByTestId('flag-version')).toHaveText('v2');
  });
});
