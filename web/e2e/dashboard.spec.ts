import { expect, test } from '@playwright/test';

// UF-1 — M4 manual checklist (docs/06-roadmap.md M4, adopted as the Playwright browser E2E).
// Unauthenticated visitor hitting a protected dashboard route → login gate.

test.describe('UF-1 — dashboard login gate', () => {
  test('unauthenticated visitor is shown the login view', async ({ page }) => {
    await page.goto('/#/projects');

    await expect(page.getByTestId('login-username')).toBeVisible();
    await expect(page.getByTestId('login-password')).toBeVisible();
    await expect(page.getByTestId('login-submit')).toBeVisible();
  });
});

// UF-2 — M4 manual checklist: an authenticated admin logs in and reaches the project list.

test.describe('UF-2 — admin login lands on the project list', () => {
  test('admin login → /projects renders', async ({ page }) => {
    await page.goto('/#/login');

    await expect(page.getByTestId('login-username')).toBeVisible();
    await page.getByTestId('login-username').locator('input').fill('admin');
    await page
      .getByTestId('login-password')
      .locator('input')
      .fill('dev-insecure-password');
    await page.getByTestId('login-submit').click();

    await expect(page).toHaveURL(/#\/projects/, { timeout: 20_000 });
    await expect(page.getByText('Projects')).toBeVisible();
  });
});

// UF-8 — M4 manual checklist: an admin creates a project whose name is already taken by
// another project → the duplicate create fails with 409 (FR-55).

test.describe('UF-8 — admin duplicate project name rejected', () => {
  test('admin create project with duplicate name fails with 409', async ({ page }) => {
    await page.goto('/#/login');

    await expect(page.getByTestId('login-username')).toBeVisible();
    await page.getByTestId('login-username').locator('input').fill('admin');
    await page
      .getByTestId('login-password')
      .locator('input')
      .fill('dev-insecure-password');
    await page.getByTestId('login-submit').click();

    await expect(page).toHaveURL(/#\/projects/, { timeout: 20_000 });
    await expect(page.getByText('Projects')).toBeVisible();

    // First create succeeds (fresh name) and returns to the project list.
    const suffix = Date.now().toString(36);
    const duplicateName = `E2E Dup ${suffix}`;
    await page.getByRole('button', { name: 'New project' }).click();
    await page.getByPlaceholder('billing', { exact: true }).fill(`e2e-uf8a-${suffix}`);
    await page.getByPlaceholder('Billing service').fill(duplicateName);
    await page.getByRole('button', { name: 'Create', exact: true }).click();
    await expect(page).toHaveURL(/#\/projects/, { timeout: 20_000 });

    // Second create with the same name (different key) → 409 conflict.
    await page.getByRole('button', { name: 'New project' }).click();
    await page.getByPlaceholder('billing', { exact: true }).fill(`e2e-uf8b-${suffix}`);
    await page.getByPlaceholder('Billing service').fill(duplicateName);
    await page.getByRole('button', { name: 'Create', exact: true }).click();

    await expect(page.getByText(/already exists/i)).toBeVisible();
  });
});
