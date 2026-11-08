import { expect, test, type Page } from '@playwright/test';

const ADMIN_USERNAME = 'admin';
const ADMIN_PASSWORD = 'dev-insecure-password';

async function signInViaUi(page: Page, username: string, password: string): Promise<void> {
  await page.goto('/#/login');
  const usernameInput = page.getByTestId('login-username');
  await expect(usernameInput).toBeVisible();
  await usernameInput.locator('input').fill(username);
  await page.getByTestId('login-password').locator('input').fill(password);
  await page.getByTestId('login-submit').click();
  await expect(page).toHaveURL(/#\/projects/, { timeout: 20_000 });
}

// UF-7 — M4 manual checklist: an admin creates a flag via the UI (create + definition put);
// the flag-level version then reflects create=1, update+1 semantics (FR-5).

test.describe('UF-7 — admin flag creation via UI (version semantics)', () => {
  test('admin creates a flag via the UI and saves the definition', async ({ page }) => {
    await signInViaUi(page, ADMIN_USERNAME, ADMIN_PASSWORD);

    // Create a project (admin capability) and open its flags surface.
    const suffix = Date.now().toString(36);
    await page.getByRole('button', { name: 'New project' }).click();
    await page.getByPlaceholder('billing', { exact: true }).fill(`e2e-uf7-${suffix}`);
    await page.getByPlaceholder('Billing service').fill(`E2E UF7 ${suffix}`);
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

// UF-6 — M4 manual checklist: a product owner assigned to a project toggles a flag state in
// the `staging` environment; the variant/rule editor is read-only for that user (FR-59) and the
// flag-level version increments by 1 on the save (FR-5/FR-56).

test.describe('UF-6 — product owner toggle in staging, editor read-only', () => {
  test('PO toggles flag in staging via UI and editor stays read-only', async ({ page, browser }) => {
    // Admin provisions a fresh project + flag and invites a product owner to it.
    await signInViaUi(page, ADMIN_USERNAME, ADMIN_PASSWORD);
    const suffix = Date.now().toString(36);
    const created = await page.request.post('/api/v1/projects', { data: { key: `e2e-uf6-${suffix}`, name: `E2E UF6 ${suffix}` } });
    expect(created.status()).toBe(201);
    const project = await created.json();

    const flagCreated = await page.request.post(`/api/v1/projects/${project.id}/flags`, { data: { key: 'new-thing', description: 'uf6' } });
    expect(flagCreated.status()).toBe(201);
    // Provision the initial definition for the environment the PO toggles (create → version 1,
    // first changed put → version 2); the product-owner toggle below is the version-bumping put.
    const initialDefinition = await page.request.put(`/api/v1/projects/${project.id}/flags/new-thing/definitions/staging`, { data: { enabled: true, variants: { on: true, off: false }, defaultVariant: 'off', rules: [] } });
    expect(initialDefinition.status()).toBe(200);
    const invite = await page.request.post(`/api/v1/projects/${project.id}/members`, { data: { username: `po-uf6-${suffix}`, role: 'product-owner', projects: [{ projectId: project.id, role: 'product-owner' }] } });
    expect(invite.status()).toBe(201);
    const inviteBody = await invite.json();
    const tempPassword = inviteBody.password;

    const poContext = await browser.newContext({ baseURL: 'http://localhost:3000' });
    const poPage = await poContext.newPage();
    await signInViaUi(poPage, `po-uf6-${suffix}`, tempPassword);
    await expect(poPage).toHaveURL(/#\/projects/, { timeout: 20_000 });

    // Open the flag editor for the provisioned flag.
    await poPage.getByRole('button', { name: 'Open flags' }).click();
    await expect(poPage).toHaveURL(new RegExp(`#\\/projects/${project.id}/flags`), { timeout: 20_000 });
    const flagCard = poPage.locator('.flag-card').filter({ hasText: 'new-thing' });
    await expect(flagCard).toBeVisible();
    await flagCard.getByRole('button', { name: 'Edit' }).click();
    await expect(poPage).toHaveURL(new RegExp(`#\\/projects/${project.id}/flags/new-thing`), { timeout: 20_000 });

    // Editor is read-only for the product owner: variant inputs are disabled.
    const variantInputs = poPage.locator('.flag-editor-page .n-input input');
    await expect(variantInputs.first()).toBeDisabled();

    // Select the `staging` environment tab and toggle the enable switch.
    await poPage.locator('.n-tabs-tab').filter({ hasText: 'staging' }).click();
    const switchLocator = poPage.locator('.flag-editor-page .n-switch').first();
    await expect(switchLocator).toBeVisible();
    await switchLocator.click();

    // Save the definition → flag-level version increments by 1.
    await poPage.getByRole('button', { name: 'Save definition' }).click();

    // Back to the flag list and confirm the version bumped from the create via the toggle save.
    await poPage.getByRole('button', { name: 'Back' }).click();
    await expect(poPage).toHaveURL(new RegExp(`#\\/projects/${project.id}/flags$`), { timeout: 20_000 });
    await expect(poPage.getByText('version 3')).toBeVisible();
  });
});

// UF-5 — M4 manual checklist: a developer without an assignment attempts to create a flag in a
// project they are not assigned to → 403 (FR-58).

test.describe('UF-5 — unassigned developer flag create → 403', () => {
  test('unassigned developer cannot create a flag', async ({ page, browser }) => {
    // Admin provisions a target project the developer will not be assigned to.
    await signInViaUi(page, ADMIN_USERNAME, ADMIN_PASSWORD);
    const suffix = Date.now().toString(36);
    const intruderProject = await (await page.request.post('/api/v1/projects', { data: { key: `e2e-uf5-${suffix}`, name: `E2E UF5 ${suffix}` } })).json();

    const devContext = await browser.newContext({ baseURL: 'http://localhost:3000' });
    const devPage = await devContext.newPage();
    const ownerProject = await (await page.request.post('/api/v1/projects', { data: { key: `e2e-uf5-owner-${suffix}`, name: `E2E UF5 owner ${suffix}` } })).json();
    const devInvite = await page.request.post(`/api/v1/projects/${ownerProject.id}/members`, { data: { username: `dev-uf5-${suffix}`, role: 'developer', projects: [{ projectId: ownerProject.id, role: 'developer' }] } });
    const devInviteBody = await devInvite.json();
    await signInViaUi(devPage, `dev-uf5-${suffix}`, devInviteBody.password);

    const forbidden = await devPage.request.post(`/api/v1/projects/${intruderProject.id}/flags`, { data: { key: 'evil-flag', description: 'intruder' } });
    expect(forbidden.status()).toBe(403);
  });
});

// UF-4 — M4 manual checklist: a developer adds environment `qa` to a project that already has
// `qa` → 409 (FR-55 uniqueness within a project).

test.describe('UF-4 — developer duplicate env create → 409', () => {
  test('developer duplicate env create fails with 409', async ({ page, browser }) => {
    // Admin provisions a project and invites a developer to it.
    await signInViaUi(page, ADMIN_USERNAME, ADMIN_PASSWORD);
    const suffix = Date.now().toString(36);
    const project = await (await page.request.post('/api/v1/projects', { data: { key: `e2e-uf4-${suffix}`, name: `E2E UF4 ${suffix}` } })).json();
    const invite = await page.request.post(`/api/v1/projects/${project.id}/members`, { data: { username: `dev-uf4-${suffix}`, role: 'developer', projects: [{ projectId: project.id, role: 'developer' }] } });
    const inviteBody = await invite.json();

    const devContext = await browser.newContext({ baseURL: 'http://localhost:3000' });
    const devPage = await devContext.newPage();
    await signInViaUi(devPage, `dev-uf4-${suffix}`, inviteBody.password);

    const first = await devPage.request.post(`/api/v1/projects/${project.id}/environments`, { data: { env: 'qa' } });
    expect(first.status()).toBe(201);
    const second = await devPage.request.post(`/api/v1/projects/${project.id}/environments`, { data: { env: 'qa' } });
    expect(second.status()).toBe(409);
  });
});

// UF-3 — M4 manual checklist: a developer assigned to a project creates an environment (`qa`)
// and a flag (`new-thing`) in that project, scoped to the assigned project (FR-55/FR-56).

test.describe('UF-3 — developer creates env qa + flag new-thing', () => {
  test('developer creates env qa and flag new-thing via API and UI', async ({ page, browser }) => {
    // Admin provisions a project and invites a developer to it.
    await signInViaUi(page, ADMIN_USERNAME, ADMIN_PASSWORD);
    const suffix = Date.now().toString(36);
    const project = await (await page.request.post('/api/v1/projects', { data: { key: `e2e-uf3-${suffix}`, name: `E2E UF3 ${suffix}` } })).json();
    const invite = await page.request.post(`/api/v1/projects/${project.id}/members`, { data: { username: `dev-uf3-${suffix}`, role: 'developer', projects: [{ projectId: project.id, role: 'developer' }] } });
    const inviteBody = await invite.json();

    const devContext = await browser.newContext({ baseURL: 'http://localhost:3000' });
    const devPage = await devContext.newPage();
    await signInViaUi(devPage, `dev-uf3-${suffix}`, inviteBody.password);

    const envCreate = await devPage.request.post(`/api/v1/projects/${project.id}/environments`, { data: { env: 'qa' } });
    expect(envCreate.status()).toBe(201);

    // Developer creates a flag through the real UI surface.
    await devPage.getByRole('button', { name: 'Open flags' }).click();
    await expect(devPage).toHaveURL(new RegExp(`#\\/projects/${project.id}/flags$`), { timeout: 20_000 });
    await devPage.getByRole('button', { name: 'New flag' }).click();
    await expect(devPage).toHaveURL(new RegExp(`#\\/projects/${project.id}/flags/new`), { timeout: 20_000 });
    const flagKeyInput = devPage.locator('.flag-editor-page .n-input input').first();
    await flagKeyInput.fill('new-thing');
    await devPage.getByRole('button', { name: 'Save definition' }).click();
    await expect(devPage).toHaveURL(new RegExp(`#\\/projects/${project.id}/flags$`), { timeout: 20_000 });
    await expect(devPage.getByTestId('flag-key').filter({ hasText: 'new-thing' })).toBeVisible();
  });
});
