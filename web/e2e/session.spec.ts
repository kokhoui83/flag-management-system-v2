import { expect, test } from '@playwright/test';
import { ADMIN, createProject, projectCard, signIn } from './support';

// docs/05-testing.md §2.6 — login gate, session lifecycle and project creation (FR-40/FR-53/FR-55).

test.describe('session', () => {
  test('an unauthenticated visitor is sent to the login view', async ({
    page,
  }) => {
    await page.goto('/#/projects');

    await expect(page).toHaveURL(/#\/login/);
    await expect(page.getByTestId('login-username')).toBeVisible();
    await expect(page.getByTestId('logout')).toHaveCount(0);
  });

  test('wrong credentials are rejected with a message', async ({ page }) => {
    await page.goto('/#/login');
    await page.getByTestId('login-username').locator('input').fill('admin');
    await page.getByTestId('login-password').locator('input').fill('nope');
    await page.getByTestId('login-submit').click();

    await expect(page.getByText('Invalid username or password')).toBeVisible();
    await expect(page).toHaveURL(/#\/login/);
  });

  test('the session survives a page reload and ends on sign-out', async ({
    page,
  }) => {
    await signIn(page, ADMIN.username, ADMIN.password);
    await expect(page.getByTestId('session-user')).toContainText('admin');

    await page.reload();
    await expect(page).toHaveURL(/#\/projects$/);
    await expect(page.getByTestId('session-user')).toContainText('admin');

    await page.getByTestId('logout').click();
    await expect(page).toHaveURL(/#\/login/);

    // The server-side session cookie is gone too: a reload does not sign back in.
    await page.goto('/#/audit');
    await page.reload();
    await expect(page).toHaveURL(/#\/login/);
    await expect(page.getByTestId('login-username')).toBeVisible();
  });

  test('the shell navigates between every admin surface', async ({ page }) => {
    await signIn(page, ADMIN.username, ADMIN.password);
    const nav = page.locator('#app-rail');

    for (const [link, heading] of [
      ['Playground', 'Evaluate playground'],
      ['API keys', 'API keys'],
      ['Audit log', 'Audit log'],
      ['Members', 'Members'],
      ['Roles & permissions', 'Roles & permissions'],
      ['User guide', 'User guide'],
      ['Projects', 'Projects'],
    ] as const) {
      await nav.getByRole('link', { name: link }).click();
      await expect(
        page.getByRole('heading', { level: 1, name: heading }),
      ).toBeVisible();
    }
  });
});

test.describe('projects', () => {
  test('a new project is seeded with the default environments (FR-55)', async ({
    page,
  }) => {
    await signIn(page, ADMIN.username, ADMIN.password);

    const project = await createProject(page, 'seed');

    const card = projectCard(page, project);
    for (const env of ['dev', 'staging', 'prod']) {
      await expect(card.getByText(env, { exact: true })).toBeVisible();
    }
  });

  test('a duplicate project name is rejected (409, FR-55)', async ({
    page,
  }) => {
    await signIn(page, ADMIN.username, ADMIN.password);
    const project = await createProject(page, 'dup');

    await page.getByRole('button', { name: 'New project' }).click();
    await page
      .getByPlaceholder('billing', { exact: true })
      .fill(`${project.key}-b`);
    await page.getByPlaceholder('Billing service').fill(project.name);
    await page.getByRole('button', { name: 'Create', exact: true }).click();

    await expect(page.getByText(/already exists/i)).toBeVisible();
  });
});
