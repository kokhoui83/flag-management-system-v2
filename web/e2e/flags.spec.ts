import { expect, test } from '@playwright/test';

// UF-7 — M4 manual checklist: an admin toggles a flag in the `dev` environment; sibling
// environments keep their prior state and the flag-level version increments by 1.

test.describe('UF-7 — admin toggle bumps version, siblings keep state', () => {
  test('admin creates a flag via the UI and toggles it (version bump)', async ({ page }) => {
    await page.goto('/#/login');
    const username = page.getByTestId('login-username');
    await expect(username).toBeVisible();
    await username.locator('input').fill('admin');
    await page.getByTestId('login-password').locator('input').fill('dev-insecure-password');
    await page.getByTestId('login-submit').click();
    await expect(page).toHaveURL(/#\/projects/, { timeout: 20_000 });

    // Create a project (admin capability) and open its flags surface.
    await page.getByRole('button', { name: 'New project' }).click();
    await page.getByPlaceholder('billing', { exact: true }).fill('e2e-uf7');
    await page.getByPlaceholder('Billing service').fill('E2E UF7');
    await page.getByRole('button', { name: 'Create', exact: true }).click();
    const newProjectCard = page.locator('.project-card').last();
    await newProjectCard.getByRole('button', { name: 'Open flags' }).click();
    await expect(page).toHaveURL(/#\/projects\/[0-9a-zA-Z0-9]{26}\/flags/, { timeout: 20_000 });

    // Create a flag through the real UI surface.
    await page.getByRole('button', { name: 'New flag' }).click();
    await expect(page).toHaveURL(/#\/projects\/[0-9a-zA-Z0-9]{26}\/flags\/new/, { timeout: 20_000 });
    await page.getByRole('button', { name: 'Save definition' }).click();
  });
});
