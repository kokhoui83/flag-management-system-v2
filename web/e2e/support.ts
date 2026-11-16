import { expect, type Browser, type Page } from '@playwright/test';

export const ADMIN = { username: 'admin', password: 'dev-insecure-password' };

/** Unique, key-safe suffix so every scenario provisions its own projects and users. */
export function uniqueSuffix(): string {
  return `${Date.now().toString(36)}${Math.floor(Math.random() * 1296).toString(36)}`;
}

export async function signIn(
  page: Page,
  username: string,
  password: string,
): Promise<void> {
  await page.goto('/#/login');
  await page.getByTestId('login-username').locator('input').fill(username);
  await page.getByTestId('login-password').locator('input').fill(password);
  await page.getByTestId('login-submit').click();
  await expect(page).toHaveURL(/#\/projects$/, { timeout: 20_000 });
}

/** A second signed-in browser session (its own cookies), e.g. an invited member. */
export async function newSession(
  browser: Browser,
  username: string,
  password: string,
): Promise<Page> {
  const context = await browser.newContext();
  const page = await context.newPage();
  await signIn(page, username, password);
  return page;
}

/** Pick an option of a Naive UI select identified by its `data-testid`. */
export async function choose(
  page: Page,
  testId: string,
  option: string,
): Promise<void> {
  await page.getByTestId(testId).click();
  await page
    .locator('.n-base-select-menu:visible')
    .last()
    .locator('.n-base-select-option')
    .filter({ hasText: new RegExp(`^${option}$`) })
    .click();
  // Wait out the closing transition so the next select does not see this menu's options.
  await expect(page.locator('.n-base-select-menu:visible')).toHaveCount(0);
}

export interface Project {
  key: string;
  name: string;
}

export async function createProject(
  page: Page,
  prefix: string,
): Promise<Project> {
  const suffix = uniqueSuffix();
  const project = {
    key: `${prefix}-${suffix}`,
    name: `E2E ${prefix} ${suffix}`,
  };
  await page.goto('/#/projects');
  await page.getByTestId('project-new').click();
  await page.getByTestId('project-name').locator('input').fill(project.name);
  await page.getByTestId('project-key').locator('input').fill(project.key);
  await page.getByTestId('project-create').click();
  await expect(projectCard(page, project)).toBeVisible();
  return project;
}

export function projectCard(page: Page, project: Project) {
  return page.locator(`[data-project="${project.key}"]`);
}

export async function openProject(page: Page, project: Project): Promise<void> {
  await page.goto('/#/projects');
  await projectCard(page, project)
    .getByRole('button', { name: 'Open flags' })
    .click();
  await expect(page).toHaveURL(/#\/projects\/[^/]+\/flags$/);
  await expect(
    page.getByRole('heading', { level: 1, name: project.name }),
  ).toBeVisible();
}

/** Invite through the Members screen; returns the one-time temporary password (FR-57). */
export async function inviteMember(
  adminPage: Page,
  invite: {
    username: string;
    globalRole: string;
    project: Project;
    projectRole: string;
  },
): Promise<string> {
  await adminPage.goto('/#/members');
  await adminPage.getByTestId('member-invite-open').click();
  await adminPage
    .getByTestId('member-username')
    .locator('input')
    .fill(invite.username);
  await choose(adminPage, 'member-global-role', invite.globalRole);
  await choose(
    adminPage,
    `member-project-role-${invite.project.key}`,
    invite.projectRole,
  );
  await adminPage.getByTestId('member-invite-submit').click();
  const password = adminPage.getByTestId('member-password');
  await expect(password).toBeVisible();
  return (await password.innerText()).trim();
}

/** Create a flag through the drawer; lands in the editor of the new flag (no definitions yet). */
export async function createBareFlag(page: Page, key: string): Promise<void> {
  await page.getByTestId('flag-new').click();
  await page.getByTestId('flag-key-input').locator('input').fill(key);
  await page.getByTestId('flag-create').click();
  await expect(page.locator('main h1')).toHaveText(`Edit flag: ${key}`);
}

/**
 * Create a flag and save its first definition in `dev` (enabled, boolean on/off): flag version
 * 1 on create, 2 after the definition. Lands back on the flag list.
 */
export async function createFlag(page: Page, key: string): Promise<void> {
  await createBareFlag(page, key);
  await saveDefinition(page);
  await backToFlags(page);
  await expect(flagRow(page, key)).toBeVisible();
}

export async function backToFlags(page: Page): Promise<void> {
  await page.getByRole('button', { name: 'Back to flags' }).click();
  await expect(page).toHaveURL(/#\/projects\/[^/]+\/flags$/);
}

export function flagRow(page: Page, key: string) {
  return page.locator(`tr[data-flag="${key}"]`);
}

export async function openFlag(page: Page, key: string): Promise<void> {
  await flagRow(page, key)
    .getByRole('button', { name: `Open ${key}` })
    .click();
  await expect(page.locator('main h1')).toHaveText(`Edit flag: ${key}`);
}

export async function openEnvTab(page: Page, env: string): Promise<void> {
  await page
    .locator('.n-tabs-tab')
    .filter({ hasText: new RegExp(`^${env}\\b`) })
    .click();
}

/** Save the open definition and wait for the editor's confirmation. */
export async function saveDefinition(page: Page): Promise<void> {
  await page.getByTestId('definition-save').click();
  await expect(page.getByTestId('editor-saved')).toBeVisible();
}

/** Confirm the action of the popconfirm that is currently open. */
export async function confirm(page: Page, action: string): Promise<void> {
  await page
    .locator('.n-popconfirm__action:visible')
    .getByRole('button', { name: action })
    .click();
}

/** The id of the project whose flag list or editor is open. */
export function projectIdOf(page: Page): string {
  const match = page.url().match(/projects\/([^/]+)\//);
  if (!match) throw new Error(`No project in ${page.url()}`);
  return match[1]!;
}
