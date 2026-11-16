import { expect, test } from '@playwright/test';
import {
  ADMIN,
  createFlag,
  createProject,
  flagRow,
  inviteMember,
  newSession,
  openEnvTab,
  openFlag,
  openProject,
  projectCard,
  projectIdOf,
  backToFlags,
  saveDefinition,
  signIn,
  uniqueSuffix,
} from './support';

// docs/05-testing.md §2.6 — invites, assigned-project visibility and the capability matrix
// (FR-53–FR-59), exercised through the real UI.

test.describe('developer', () => {
  test('an invited developer signs in and sees only the assigned project (FR-53/FR-57)', async ({
    page,
    browser,
  }) => {
    await signIn(page, ADMIN.username, ADMIN.password);
    const assigned = await createProject(page, 'assigned');
    const other = await createProject(page, 'other');
    const username = `dev-${uniqueSuffix()}`;

    const password = await inviteMember(page, {
      username,
      globalRole: 'developer',
      project: assigned,
      projectRole: 'developer',
    });
    // The one-time password stays on screen while the member list refreshes behind it.
    await expect(
      page.getByTestId('member-row').filter({ hasText: username }),
    ).toContainText(`${assigned.key}:developer`);
    await expect(page.getByTestId('member-password')).toHaveText(password);

    const dev = await newSession(browser, username, password);
    await expect(projectCard(dev, assigned)).toBeVisible();
    await expect(projectCard(dev, other)).toHaveCount(0);
    await expect(dev.getByTestId('session-user')).toContainText(username);
    await expect(dev.getByTestId('session-user')).toContainText('developer');
  });

  test('admin-only surfaces are unavailable to a developer and rejected by the API (FR-54)', async ({
    page,
    browser,
  }) => {
    await signIn(page, ADMIN.username, ADMIN.password);
    const project = await createProject(page, 'gate');
    const username = `dev-${uniqueSuffix()}`;
    const password = await inviteMember(page, {
      username,
      globalRole: 'developer',
      project,
      projectRole: 'developer',
    });

    const dev = await newSession(browser, username, password);
    const nav = dev.getByRole('navigation', { name: 'Main' });
    for (const link of [
      'API keys',
      'Audit log',
      'Members',
      'Roles & permissions',
    ]) {
      await expect(nav.getByRole('link', { name: link })).toHaveCount(0);
    }
    await expect(dev.getByRole('button', { name: 'New project' })).toHaveCount(
      0,
    );
    for (const route of ['/#/api-keys', '/#/audit', '/#/members', '/#/roles']) {
      await dev.goto(route);
      await expect(dev).toHaveURL(/#\/projects$/);
    }
    for (const path of ['/api/v1/audit', '/api/v1/api-keys']) {
      expect((await dev.request.get(path)).status()).toBe(403);
    }
    const created = await dev.request.post('/api/v1/projects', {
      data: { key: `nope-${uniqueSuffix()}`, name: 'Nope' },
    });
    expect(created.status()).toBe(403);
  });

  test('a developer adds an environment and a flag to the assigned project (FR-55/FR-58)', async ({
    page,
    browser,
  }) => {
    await signIn(page, ADMIN.username, ADMIN.password);
    const project = await createProject(page, 'devenv');
    const unassigned = await createProject(page, 'unassigned');
    const username = `dev-${uniqueSuffix()}`;
    const password = await inviteMember(page, {
      username,
      globalRole: 'developer',
      project,
      projectRole: 'developer',
    });
    const dev = await newSession(browser, username, password);
    await openProject(dev, project);

    await dev.getByTestId('environment-name').locator('input').fill('qa');
    await dev.getByTestId('environment-add').click();
    await expect(dev.getByTestId('project-environments')).toContainText('qa');

    // A second `qa` is a conflict: environment names are unique within a project (409).
    await dev.getByTestId('environment-name').locator('input').fill('qa');
    await dev.getByTestId('environment-add').click();
    await expect(dev.getByTestId('environment-error')).toContainText(
      'already exists',
    );

    await createFlag(dev, 'new-thing');
    await expect(
      flagRow(dev, 'new-thing').getByTestId('flag-env-qa'),
    ).toHaveText('Not configured');

    // The flag is scoped to the assigned project; an unassigned project is forbidden (403).
    await openProject(page, unassigned);
    const unassignedId = projectIdOf(page);
    const forbidden = await dev.request.post(
      `/api/v1/projects/${unassignedId}/flags`,
      {
        data: { key: 'evil-flag', description: 'intruder' },
      },
    );
    expect(forbidden.status()).toBe(403);
  });
});

test.describe('product owner', () => {
  test('toggles a flag in staging only; everything else is read-only (FR-56/FR-59)', async ({
    page,
    browser,
  }) => {
    await signIn(page, ADMIN.username, ADMIN.password);
    const project = await createProject(page, 'po');
    await openProject(page, project);
    await createFlag(page, 'new-thing'); // v1 create + v2 dev definition (enabled)
    await openFlag(page, 'new-thing');
    await openEnvTab(page, 'staging');
    await saveDefinition(page); // v3: staging definition (enabled)
    const username = `po-${uniqueSuffix()}`;
    const password = await inviteMember(page, {
      username,
      globalRole: 'product-owner',
      project,
      projectRole: 'product-owner',
    });

    const po = await newSession(browser, username, password);
    await openProject(po, project);
    await expect(po.getByTestId('flag-new')).toHaveCount(0);
    await expect(po.getByTestId('environment-add')).toHaveCount(0);
    await openFlag(po, 'new-thing');

    await expect(po.getByTestId('read-only-note')).toBeVisible();
    await expect(
      po.getByTestId('variant-name').first().locator('input'),
    ).toBeDisabled();
    await expect(
      po.getByRole('button', { name: 'Add variant' }),
    ).toBeDisabled();
    await expect(po.getByRole('button', { name: 'Add rule' })).toBeDisabled();
    await expect(po.getByTestId('copy-submit')).toHaveCount(0);
    await expect(po.getByTestId('flag-delete')).toHaveCount(0);

    await openEnvTab(po, 'staging');
    await po.getByTestId('definition-enabled').click();
    await saveDefinition(po);
    await expect(po.getByTestId('editor-saved')).toContainText('v3 → v4');

    // An environment without a definition cannot be configured by a product owner.
    await openEnvTab(po, 'prod');
    await expect(po.getByTestId('definition-missing')).toContainText(
      'an admin or developer must create it',
    );
    await expect(po.getByTestId('definition-save')).toBeDisabled();

    await backToFlags(po);
    const row = flagRow(po, 'new-thing');
    await expect(row.getByTestId('flag-version')).toHaveText('v4');
    await expect(row.getByTestId('flag-env-staging')).toHaveText('OFF');
    await expect(row.getByTestId('flag-env-dev')).toHaveText('ON');
    await expect(row.getByTestId('flag-env-prod')).toHaveText('Not configured');

    // The API enforces the same boundary: a product owner may change `enabled` only.
    const projectId = projectIdOf(po);
    const edit = await po.request.put(
      `/api/v1/projects/${projectId}/flags/new-thing/definitions/staging`,
      {
        data: {
          enabled: false,
          variants: { on: true, off: false, extra: true },
          defaultVariant: 'off',
          rules: [],
        },
      },
    );
    expect(edit.status()).toBe(403);
  });
});
