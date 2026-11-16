import { expect, test } from 'vitest';
import { buildDesign } from './build.mjs';

const screens = [
  'Login',
  'Projects',
  'Flags',
  'Flag editor',
  'Playground',
  'API keys',
  'Audit log',
  'Members',
  'Roles & permissions',
  'Project access',
  'Create flag',
  'Product owner editor',
  'API key created',
];

test('the design provides the planned screens and important safety states', () => {
  const steps = buildDesign();
  const frames = steps.filter(
    (step) => step.command === 'node.create' && step.params.type === 'frame',
  );
  for (const screen of screens) {
    expect(frames.some((step) => step.params.name === screen)).toBe(true);
  }
  const text = steps
    .filter((step) => step.params?.type === 'text')
    .map((step) => step.params.text)
    .join('\n');
  for (const requirement of [
    'No self-signup',
    'Observed v8',
    'Stored v9',
    'Copy from',
    'Product owner access',
    'only time the key is shown',
    'Create project environments',
    'Toggle a flag',
  ]) {
    expect(text).toContain(requirement);
  }
  expect(text).not.toContain('Create account');
});

test('the prototype connects its main user journey and admin navigation', () => {
  const steps = buildDesign();
  const interactions = steps.filter(
    (step) => step.command === 'proto.interaction.add',
  );
  const destinations = new Set(
    interactions.map((step) => step.params.dest?.$ref),
  );
  for (const destination of [
    'projects',
    'flags',
    'editor',
    'playground',
    'members',
    'roles',
    'access',
  ]) {
    expect(destinations.has(destination)).toBe(true);
  }
  expect(steps.some((step) => step.command === 'proto.flow.add')).toBe(true);
});

test('the product owner state does not present definition editing as available', () => {
  const steps = buildDesign();
  const poChildren = steps.filter((step) => step.params?.parent?.$ref === 'po');
  const labels = poChildren.map((step) => step.params.text || step.params.name);
  expect(labels).toContain('Only the enabled state can be changed.');
  expect(labels).not.toContain('+ Add rule');
  expect(labels).not.toContain('Copy from…');
  expect(labels).not.toContain('Delete flag · admin only');
});

test('the example definition agrees with the staging flag state', () => {
  const steps = buildDesign();
  const editorText = steps
    .filter(
      (step) =>
        step.params?.parent?.$ref === 'editor' && step.params?.type === 'text',
    )
    .map((step) => step.params.text);
  expect(editorText).toContain('Disabled');
  expect(
    editorText.some(
      (value) => value.startsWith('off ') && value.includes('false'),
    ),
  ).toBe(true);
});

test('the playground result uses the enabled development example', () => {
  const steps = buildDesign();
  const labels = steps
    .filter(
      (step) =>
        step.params?.parent?.$ref === 'playground' &&
        step.params?.type === 'text',
    )
    .map((step) => step.params.text);
  expect(labels).toContain('Development  ▾');
  expect(labels).toContain('dev · flag v12');
});

test('the project header does not claim everything is synced while staging is stale', () => {
  const steps = buildDesign();
  const labels = steps
    .filter(
      (step) =>
        step.params?.parent?.$ref === 'flags' && step.params?.type === 'text',
    )
    .map((step) => step.params.text);
  expect(labels).toContain('Stale · 1 flag');
  // Environment cards aggregate flags; the stored version belongs to a flag, not an environment.
  expect(labels.filter((value) => value === 'Synced')).toHaveLength(2);
});

test('only the project with a matching example detail screen opens that screen', () => {
  const steps = buildDesign();
  const cards = steps.filter(
    (step) =>
      step.params?.parent?.$ref === 'projects' &&
      ['Checkout Web', 'Mobile App', 'Internal Tools'].includes(
        step.params.name,
      ),
  );
  const linkedCards = cards.filter((card) =>
    steps.some(
      (step) =>
        step.command === 'proto.interaction.add' &&
        step.params.id?.$ref === card.as,
    ),
  );
  expect(linkedCards.map((card) => card.params.name)).toEqual(['Checkout Web']);
});

const allText = () =>
  buildDesign()
    .filter((step) => step.params?.type === 'text')
    .map((step) => step.params.text);

test('the baseline presents only what the API supports', () => {
  const text = allText().join('\n');
  for (const supported of [
    'Username',
    'Not configured',
    'Stored version',
    'Each environment starts without a definition until it is configured.',
    'ROLE ON THIS PROJECT',
  ]) {
    expect(text).toContain(supported);
  }
  for (const unsupported of [
    'Email',
    '@example.com',
    'Pending',
    'Last active',
    'starts disabled',
    'ON · v',
    'OFF · v',
    ' ms',
  ]) {
    expect(text).not.toContain(unsupported);
  }
});

test('environment tabs show state, not a per-environment stored version', () => {
  const editorText = buildDesign()
    .filter(
      (step) =>
        step.params?.parent?.$ref === 'editor' && step.params?.type === 'text',
    )
    .map((step) => step.params.text);
  expect(editorText).toContain('dev  ·  on');
  expect(editorText).toContain('staging  ·  off');
  expect(editorText).toContain('prod  ·  not configured');
  expect(editorText.some((value) => /·\s+v\d+$/.test(value))).toBe(false);
});

test('the design covers loading, empty, error and confirmation states', () => {
  const frames = buildDesign().filter(
    (step) => step.command === 'node.create' && step.params.type === 'frame',
  );
  for (const state of [
    'Flags · loading',
    'Flags · empty',
    'Flags · error',
    'Confirm · turn flag off',
    'Confirm · delete flag',
    'Validation · all problems',
    'Invite · temporary password',
  ]) {
    const frame = frames.find((step) => step.params.name === state);
    expect(frame).toBeTruthy();
    expect(frame.params.width).toBe(1440);
  }
});

test('the design covers the mobile layouts', () => {
  const frames = buildDesign().filter(
    (step) => step.command === 'node.create' && step.params.type === 'frame',
  );
  for (const screen of [
    'Mobile · Login',
    'Mobile · Navigation',
    'Mobile · Projects',
    'Mobile · Flags',
    'Mobile · Flag editor',
  ]) {
    const frame = frames.find((step) => step.params.name === screen);
    expect(frame).toBeTruthy();
    expect(frame.params.width).toBe(390);
  }
});
