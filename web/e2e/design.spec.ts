import { mkdirSync } from 'node:fs';
import path from 'node:path';
import { expect, test, type Page } from '@playwright/test';
import {
  ADMIN,
  backToFlags,
  choose,
  confirm,
  createBareFlag,
  createFlag,
  createProject,
  flagRow,
  inviteMember,
  newSession,
  openFlag,
  openProject,
  projectIdOf,
  saveDefinition,
  signIn,
  uniqueSuffix,
} from './support';

// M4.5 — the designed dashboard (docs/07-dashboard-design.md): responsive layouts, keyboard
// operation, visible focus, labels, confirmation states and the screens added by the design.

const DESKTOP = { width: 1440, height: 900 };
const MOBILE = { width: 390, height: 844 };

/** Screenshots for the design comparison are written only when a directory is given. */
const captureDir = process.env.E2E_CAPTURE_DIR;

async function capture(
  page: Page,
  layout: string,
  name: string,
): Promise<void> {
  if (!captureDir) return;
  const dir = path.join(captureDir, layout);
  mkdirSync(dir, { recursive: true });
  await page.screenshot({
    path: path.join(dir, `${name}.png`),
    fullPage: true,
  });
}

/** The page itself never scrolls sideways; wide tables scroll inside their card. */
async function expectNoHorizontalOverflow(page: Page): Promise<void> {
  const overflow = await page.evaluate(
    () =>
      document.documentElement.scrollWidth -
      document.documentElement.clientWidth,
  );
  expect(overflow, `horizontal overflow on ${page.url()}`).toBeLessThanOrEqual(
    0,
  );
}

/** Every visible form control and button exposes an accessible name (all gaps are reported). */
async function expectControlsLabelled(page: Page): Promise<void> {
  for (const role of [
    'textbox',
    'combobox',
    'switch',
    'spinbutton',
    'button',
  ] as const) {
    const controls = page.getByRole(role);
    const count = await controls.count();
    for (let index = 0; index < count; index += 1) {
      const control = controls.nth(index);
      if (!(await control.isVisible())) continue;
      await expect
        .soft(control, `${role} #${index} on ${page.url()}`)
        .toHaveAccessibleName(/\S/, { timeout: 1000 });
    }
  }
}

interface Fixture {
  projectId: string;
  flagKey: string;
}

/** A project with one configured flag, used by the per-screen checks. */
async function provision(page: Page): Promise<Fixture> {
  await page.setViewportSize(DESKTOP);
  await signIn(page, ADMIN.username, ADMIN.password);
  const project = await createProject(page, 'design');
  await openProject(page, project);
  const projectId = projectIdOf(page);
  await createFlag(page, 'new-payment-flow');
  await inviteMember(page, {
    username: `dev-${uniqueSuffix()}`,
    globalRole: 'developer',
    project,
    projectRole: 'developer',
  });
  await page
    .getByRole('button', { name: 'I have copied the password' })
    .click();
  return { projectId, flagKey: 'new-payment-flow' };
}

function screens(fixture: Fixture): Array<[string, string, string]> {
  return [
    ['Projects', '/#/projects', 'Projects'],
    ['Flags', `/#/projects/${fixture.projectId}/flags`, 'Flags'],
    [
      'Flag editor',
      `/#/projects/${fixture.projectId}/flags/${fixture.flagKey}`,
      'Flag details',
    ],
    ['Playground', '/#/playground', 'Configure'],
    ['API keys', '/#/api-keys', 'API keys'],
    ['Audit log', '/#/audit', 'Audit log'],
    ['Members', '/#/members', 'Members'],
    ['Roles & permissions', '/#/roles', 'Roles & permissions'],
    [
      'Project access',
      `/#/projects/${fixture.projectId}/access`,
      'Restricted by default',
    ],
    ['User guide', '/#/guide', 'User guide'],
  ];
}

for (const [layout, viewport] of [
  ['desktop', DESKTOP],
  ['mobile', MOBILE],
] as const) {
  test(`every screen fits a ${layout} viewport and labels its controls`, async ({
    page,
  }) => {
    test.setTimeout(120_000);
    const fixture = await provision(page);
    await page.setViewportSize(viewport);

    await page
      .getByTestId('logout')
      .evaluate((button: HTMLElement) => button.click());
    await expect(page).toHaveURL(/#\/login/);
    await expectNoHorizontalOverflow(page);
    await expectControlsLabelled(page);
    await capture(page, layout, 'Login');
    await signIn(page, ADMIN.username, ADMIN.password);

    for (const [name, route, heading] of screens(fixture)) {
      await page.goto(route);
      await expect(
        page.getByRole('heading', { name: heading }).first(),
      ).toBeVisible();
      await expect(page.locator('.n-spin-body')).toHaveCount(0);
      await expectNoHorizontalOverflow(page);
      await expectControlsLabelled(page);
      await capture(page, layout, name);
    }

    // Dialog states.
    await page.goto(`/#/projects/${fixture.projectId}/flags`);
    await page.getByTestId('flag-new').click();
    await expect(page.getByTestId('flag-name-input')).toBeVisible();
    await expectControlsLabelled(page);
    await capture(page, layout, 'Create flag');
    await page.keyboard.press('Escape');

    await page.goto('/#/members');
    await page.getByTestId('member-invite-open').click();
    await expect(page.getByTestId('member-username')).toBeVisible();
    await expectControlsLabelled(page);
    await capture(page, layout, 'Invite user');
  });
}

test.describe('mobile navigation', () => {
  test.use({ viewport: MOBILE });

  test('the rail becomes a menu that opens, navigates and closes', async ({
    page,
  }) => {
    await signIn(page, ADMIN.username, ADMIN.password);
    const rail = page.locator('#app-rail');
    const toggle = page.getByTestId('rail-toggle');
    await expect(rail).toBeHidden();
    await expect(toggle).toHaveAttribute('aria-expanded', 'false');

    await toggle.click();
    await expect(toggle).toHaveAttribute('aria-expanded', 'true');
    await expect(rail).toBeVisible();
    await rail.getByRole('link', { name: 'Audit log' }).click();

    await expect(
      page.getByRole('heading', { level: 1, name: 'Audit log' }),
    ).toBeVisible();
    await expect(rail).toBeHidden();

    await toggle.click();
    await page.keyboard.press('Escape');
    await expect(rail).toBeHidden();
  });

  test('a flag can be created, configured and toggled on a phone', async ({
    page,
  }) => {
    await signIn(page, ADMIN.username, ADMIN.password);
    await page.setViewportSize(DESKTOP);
    const project = await createProject(page, 'phone');
    await page.setViewportSize(MOBILE);
    await openProject(page, project);

    await createBareFlag(page, 'mobile-flag');
    await saveDefinition(page);
    await expectNoHorizontalOverflow(page);
    await backToFlags(page);

    await flagRow(page, 'mobile-flag')
      .getByTestId('flag-toggle')
      .first()
      .click();
    await confirm(page, 'Turn off');
    await expect(
      flagRow(page, 'mobile-flag').getByTestId('flag-env-dev'),
    ).toHaveText('OFF');
  });
});

test.describe('keyboard operation', () => {
  test('sign in, skip to content and operate a dialog without a mouse', async ({
    page,
  }) => {
    await page.goto('/#/login');
    await page.getByTestId('login-username').locator('input').focus();
    await page.keyboard.type(ADMIN.username);
    await page.keyboard.press('Tab');
    await page.keyboard.type(ADMIN.password);
    await page.keyboard.press('Enter');
    await expect(page).toHaveURL(/#\/projects$/);

    // The first Tab stop is the skip link; it moves focus to the content.
    await page.keyboard.press('Tab');
    const skip = page.getByRole('link', { name: 'Skip to content' });
    await expect(skip).toBeFocused();
    await expect(skip).toBeInViewport();
    await page.keyboard.press('Enter');
    await expect(page.locator('#app-content')).toBeFocused();

    // Focus is visible on a keyboard-focused control.
    await page.keyboard.press('Tab');
    const focused = page.locator(':focus');
    await expect(focused).toBeVisible();
    const ring = await focused.evaluate((element) => {
      const style = getComputedStyle(element);
      return `${style.boxShadow} ${style.outlineStyle}`;
    });
    expect(ring).not.toBe('none none');

    // A dialog opens from the keyboard, keeps focus inside and closes on Escape.
    await page.getByTestId('project-new').focus();
    await page.keyboard.press('Enter');
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    for (let step = 0; step < 8; step += 1) {
      await page.keyboard.press('Tab');
      expect(
        await page.evaluate(
          () => document.activeElement?.closest('[role="dialog"]') !== null,
        ),
      ).toBe(true);
    }
    await page.keyboard.press('Escape');
    await expect(dialog).toHaveCount(0);
  });
});

test.describe('kill switch', () => {
  test('a flag is turned off from the list in three clicks, after confirmation', async ({
    page,
  }) => {
    await signIn(page, ADMIN.username, ADMIN.password);
    const project = await createProject(page, 'kill');
    await openProject(page, project);
    await createFlag(page, 'checkout-v2');
    const row = flagRow(page, 'checkout-v2');
    await expect(row.getByTestId('flag-version')).toHaveText('v2');

    await row.getByTestId('flag-toggle').click(); // 1: the state pill
    await expect(
      page.getByText('Turn “checkout-v2” off in dev?'),
    ).toBeVisible();
    await confirm(page, 'Turn off'); // 2: confirm

    await expect(row.getByTestId('flag-env-dev')).toHaveText('OFF');
    await expect(row.getByTestId('flag-version')).toHaveText('v3');
    await expect(
      page.locator('[data-env="dev"]').getByTestId('env-enabled-count'),
    ).toHaveText('0 of 1 enabled');

    // Cancelling the confirmation changes nothing.
    await row.getByTestId('flag-toggle').click();
    await confirm(page, 'Cancel');
    await expect(row.getByTestId('flag-env-dev')).toHaveText('OFF');
    await expect(row.getByTestId('flag-version')).toHaveText('v3');
  });

  test('a product owner can use the kill switch but nothing else on the list', async ({
    page,
    browser,
  }) => {
    await signIn(page, ADMIN.username, ADMIN.password);
    const project = await createProject(page, 'pokill');
    await openProject(page, project);
    await createFlag(page, 'banner');
    const username = `po-${uniqueSuffix()}`;
    const password = await inviteMember(page, {
      username,
      globalRole: 'product-owner',
      project,
      projectRole: 'product-owner',
    });

    const po = await newSession(browser, username, password);
    await openProject(po, project);
    await expect(
      po.getByText('Creating flags requires the admin or developer role.'),
    ).toBeVisible();
    await expect(po.getByTestId('project-access')).toHaveCount(0);

    await flagRow(po, 'banner').getByTestId('flag-toggle').click();
    await confirm(po, 'Turn off');
    await expect(flagRow(po, 'banner').getByTestId('flag-env-dev')).toHaveText(
      'OFF',
    );
  });
});

test.describe('administration screens', () => {
  test('roles & permissions shows the capability matrix', async ({ page }) => {
    await signIn(page, ADMIN.username, ADMIN.password);
    await page.goto('/#/roles');

    const matrix = page.getByTestId('capability-matrix');
    await expect(matrix.locator('tbody tr')).toHaveCount(11);
    const deleteFlags = matrix
      .locator('tbody tr')
      .filter({ hasText: 'Delete flags' });
    await expect(deleteFlags.locator('[data-allowed="true"]')).toHaveCount(1);
    const toggle = matrix
      .locator('tbody tr')
      .filter({ hasText: 'Toggle a flag' });
    await expect(toggle.locator('[data-allowed="true"]')).toHaveCount(3);
  });

  test('project access lists members and adds one with this project pre-selected', async ({
    page,
    browser,
  }) => {
    await signIn(page, ADMIN.username, ADMIN.password);
    const project = await createProject(page, 'access');
    await openProject(page, project);
    await page.getByTestId('project-access').click();
    await expect(page.getByTestId('access-empty')).toBeVisible();

    const username = `pa-${uniqueSuffix()}`;
    await page.getByTestId('access-add-member').click();
    await page.getByTestId('member-username').locator('input').fill(username);
    await choose(page, `member-project-role-${project.key}`, 'admin');
    await page.getByTestId('member-invite-submit').click();
    const password = (
      await page.getByTestId('member-password').innerText()
    ).trim();
    await page
      .getByRole('button', { name: 'I have copied the password' })
      .click();

    const row = page.getByTestId('access-row').filter({ hasText: username });
    await expect(row).toContainText('admin');

    // A project-scoped admin may delete flags there but gets no global admin surface.
    await backToFlags(page);
    await createFlag(page, 'scoped');
    const projectAdmin = await newSession(browser, username, password);
    await expect(
      projectAdmin.locator('#app-rail').getByRole('link', { name: 'Members' }),
    ).toHaveCount(0);
    await openProject(projectAdmin, project);
    await openFlag(projectAdmin, 'scoped');
    await projectAdmin.getByTestId('flag-delete').click();
    await confirm(projectAdmin, 'Delete flag');
    await expect(flagRow(projectAdmin, 'scoped')).toHaveCount(0);
  });
});
