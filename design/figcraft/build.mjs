import { pathToFileURL } from 'node:url';

const colors = {
  canvas: '#F8FAFC',
  white: '#FFFFFF',
  border: '#E2E8F0',
  ink: '#0F172A',
  secondary: '#475569',
  muted: '#64748B',
  faint: '#94A3B8',
  brand: '#4F46E5',
  brandSoft: '#EEF2FF',
  green: '#047857',
  greenSoft: '#D1FAE5',
  amber: '#B45309',
  amberSoft: '#FEF3C7',
  red: '#B91C1C',
  redSoft: '#FEE2E2',
  blue: '#2563EB',
  blueSoft: '#DBEAFE',
  purple: '#7C3AED',
  purpleSoft: '#F3E8FF',
  sunken: '#F1F5F9',
};

export function buildDesign() {
  const steps = [];
  let serial = 0;
  const ref = (name) => ({ $ref: name });
  const command = (name, params, as) =>
    steps.push({ command: name, params, ...(as ? { as } : {}) });
  const create = (type, parent, x, y, width, height, props, name, text, as) => {
    const key = as || `node${serial++}`;
    command(
      'node.create',
      {
        type,
        ...(parent ? { parent: ref(parent) } : {}),
        x,
        y,
        width,
        height,
        ...(name ? { name } : {}),
        ...(text !== undefined ? { text } : {}),
        props,
        select: false,
      },
      key,
    );
    return key;
  };
  const box = (
    p,
    x,
    y,
    w,
    h,
    fill = colors.white,
    stroke = colors.border,
    radius = 8,
    name,
  ) =>
    create(
      'rectangle',
      p,
      x,
      y,
      w,
      h,
      {
        fill,
        stroke: stroke || 'none',
        strokeWeight: 1,
        cornerRadius: radius,
      },
      name,
    );
  const frame = (p, x, y, w, h, name, as, fill = colors.canvas) =>
    create(
      'frame',
      p,
      x,
      y,
      w,
      h,
      { fill, stroke: 'none', clip: true },
      name,
      undefined,
      as,
    );
  const text = (
    p,
    x,
    y,
    value,
    size = 14,
    color = colors.ink,
    bold = false,
    width = 900,
  ) =>
    create(
      'text',
      p,
      x,
      y,
      width,
      Math.ceil(size * 1.5),
      {
        fill: color,
        fontFamily: 'DejaVu Sans',
        fontStyle: bold ? 'Bold' : 'Book',
        fontSize: size,
        textAutoResize: 'height',
      },
      value,
      value,
    );
  const line = (p, x, y, w) => box(p, x, y, w, 1, colors.border, null, 0);
  const badge = (
    p,
    x,
    y,
    label,
    bg,
    fg,
    w = Math.max(50, label.length * 7 + 20),
  ) => {
    box(p, x, y, w, 25, bg, null, 12);
    text(p, x + 10, y + 5, label, 11, fg, true, w - 12);
  };
  const button = (p, x, y, w, label, kind = 'primary') => {
    const key = frame(p, x, y, w, 38, label, undefined, 'none');
    box(
      key,
      0,
      0,
      w,
      38,
      kind === 'primary' ? colors.brand : colors.white,
      kind === 'primary' ? null : colors.border,
      8,
    );
    text(
      key,
      12,
      10,
      label,
      12,
      kind === 'primary' ? colors.white : colors.secondary,
      true,
      w - 20,
    );
    return key;
  };
  const field = (p, x, y, w, label, value, h = 38, readOnly = false) => {
    text(p, x, y, label, 12, colors.secondary, true, w);
    box(p, x, y + 22, w, h, readOnly ? colors.sunken : colors.white);
    text(
      p,
      x + 12,
      y + 32,
      value,
      12,
      readOnly ? colors.faint : colors.muted,
      false,
      w - 24,
    );
  };
  const link = (node, destination) =>
    command('proto.interaction.add', { id: ref(node), dest: ref(destination) });
  const links = [];
  const nav = (node, destination) => links.push([node, destination]);
  const screens = [
    ['login', 'Login'],
    ['projects', 'Projects'],
    ['flags', 'Flags'],
    ['editor', 'Flag editor'],
    ['playground', 'Playground'],
    ['keys', 'API keys'],
    ['audit', 'Audit log'],
    ['members', 'Members'],
    ['roles', 'Roles & permissions'],
    ['access', 'Project access'],
    ['create', 'Create flag'],
    ['po', 'Product owner editor'],
    ['keyCreated', 'API key created'],
  ];

  command('page.rename', { name: '01 · Screens' });
  for (const [i, [id, name]] of screens.entries()) {
    frame(null, (i % 3) * 1520, Math.floor(i / 3) * 1000, 1440, 900, name, id);
  }
  const shell = (p, title, breadcrumb, active, productOwner = false) => {
    box(p, 0, 0, 232, 900, colors.white, null, 0);
    box(p, 231, 0, 1, 900, colors.border, null, 0);
    box(p, 20, 20, 36, 36, colors.brand, null, 9);
    text(p, 30, 28, 'F', 16, colors.white, true, 20);
    text(p, 66, 22, 'FMS', 16, colors.ink, true, 130);
    text(p, 66, 43, 'FLAG MANAGEMENT', 9, colors.faint, true, 150);
    const navItems = [
      ['Projects', 'projects'],
      ['Playground', 'playground'],
      ['API keys', 'keys'],
      ['Audit log', 'audit'],
      ['Members', 'members'],
      ['Roles & permissions', 'roles'],
    ];
    navItems
      .filter((_, i) => !productOwner || i < 2)
      .forEach(([label, dest], i) => {
        const y = i < 2 ? 92 + i * 44 : 216 + (i - 2) * 44;
        if (i === 2) text(p, 24, 188, 'ADMIN', 10, colors.faint, true);
        const item = frame(
          p,
          16,
          y,
          200,
          36,
          `Navigate to ${label}`,
          undefined,
          active === dest ? colors.brandSoft : colors.white,
        );
        text(
          item,
          14,
          10,
          label,
          12,
          active === dest ? colors.brand : colors.secondary,
          true,
          175,
        );
        nav(item, dest);
      });
    text(p, 28, 762, 'User guide', 12, colors.secondary, true);
    box(p, 16, 798, 200, 64, colors.canvas, colors.border, 8);
    text(p, 29, 810, 'Alex Morgan', 12, colors.ink, true);
    text(
      p,
      29,
      832,
      `${productOwner ? 'product owner' : 'admin'} · Sign out`,
      11,
      colors.muted,
    );
    box(p, 232, 0, 1208, 56, colors.white, null, 0);
    line(p, 232, 55, 1208);
    text(p, 264, 19, breadcrumb, 12, colors.muted, false, 800);
    badge(p, 1205, 15, '● Live', colors.brandSoft, colors.brand, 76);
    if (
      [
        'flags',
        'create',
        'editor',
        'po',
        'access',
        'confirmToggle',
        'confirmDelete',
        'validation',
      ].includes(p)
    ) {
      badge(p, 1292, 15, 'Stale · 1 flag', colors.amberSoft, colors.amber, 116);
    }
    text(p, 264, 87, title, 23, colors.ink, true);
  };
  const heading = (p, title, subtitle) => {
    text(p, 264, 131, title, 13, colors.muted, false, 980);
    if (subtitle) text(p, 264, 152, subtitle, 12, colors.muted, false, 980);
  };
  const table = (p, x, y, widths, labels, rows, rowHeight = 58) => {
    const w = widths.reduce((a, b) => a + b, 0);
    box(
      p,
      x,
      y,
      w,
      42 + rows.length * rowHeight,
      colors.white,
      colors.border,
      10,
    );
    box(p, x + 1, y + 1, w - 2, 41, colors.canvas, null, 0);
    let offset = 0;
    labels.forEach((label, i) => {
      text(
        p,
        x + offset + 14,
        y + 14,
        label.toUpperCase(),
        10,
        colors.secondary,
        true,
        widths[i] - 18,
      );
      offset += widths[i];
    });
    rows.forEach((row, r) => {
      const yy = y + 42 + r * rowHeight;
      line(p, x, yy, w);
      let xx = 0;
      row.forEach((value, i) => {
        if (typeof value === 'object')
          badge(
            p,
            x + xx + 14,
            yy + 14,
            value.label,
            value.bg,
            value.fg,
            value.width,
          );
        else
          text(
            p,
            x + xx + 14,
            yy + 19,
            value,
            12,
            i === 0 ? colors.ink : colors.secondary,
            i === 0,
            widths[i] - 20,
          );
        xx += widths[i];
      });
    });
  };
  const status = (label, kind) => ({
    label,
    bg:
      kind === 'green'
        ? colors.greenSoft
        : kind === 'amber'
          ? colors.amberSoft
          : colors.redSoft,
    fg:
      kind === 'green'
        ? colors.green
        : kind === 'amber'
          ? colors.amber
          : colors.red,
  });

  // Login
  box('login', 500, 177, 440, 540, colors.white, colors.border, 14);
  box('login', 696, 212, 48, 48, colors.brand, null, 10);
  text('login', 712, 223, 'F', 20, colors.white, true, 20);
  text('login', 606, 281, 'FMS · Flag Management', 20, colors.ink, true, 280);
  text(
    'login',
    540,
    325,
    'Sign in to your self-hosted instance',
    13,
    colors.muted,
  );
  field('login', 540, 367, 360, 'Username', 'admin');
  field('login', 540, 443, 360, 'Password', '••••••••••••');
  const signIn = button('login', 540, 527, 360, 'Sign in');
  nav(signIn, 'projects');
  text(
    'login',
    540,
    587,
    'No self-signup — accounts are created by admin invite.',
    11,
    colors.muted,
    false,
    360,
  );
  text(
    'login',
    540,
    637,
    'Self-hosted instance  ·  Open the user guide',
    11,
    colors.muted,
    false,
    360,
  );

  // Projects
  shell('projects', 'Projects', 'Projects', 'projects');
  heading('projects', 'Browse projects and their environments.');
  field('projects', 264, 180, 328, 'Search projects', 'Search projects…');
  button('projects', 1242, 202, 166, '+ New project');
  const projects = [
    ['Checkout Web', 'checkout-web', '24 flags', 'Updated 2 min ago'],
    ['Mobile App', 'mobile-app', '12 flags', 'Updated 1 hour ago'],
    ['Internal Tools', 'internal-tools', '6 flags', 'Updated yesterday'],
  ];
  projects.forEach((values, i) => {
    const x = 264 + i * 380;
    const card = frame(
      'projects',
      x,
      280,
      356,
      214,
      values[0],
      undefined,
      colors.white,
    );
    box(card, 0, 0, 356, 214, colors.white, colors.border, 12);
    text(card, 20, 20, values[0], 16, colors.ink, true, 300);
    text(card, 20, 48, values[1], 12, colors.muted);
    badge(card, 20, 82, 'dev', colors.blueSoft, colors.blue);
    badge(card, 82, 82, 'staging', colors.amberSoft, colors.amber, 76);
    badge(card, 170, 82, 'prod', colors.redSoft, colors.red, 60);
    line(card, 20, 128, 316);
    text(card, 20, 144, values[2], 12, colors.ink, true);
    text(card, 20, 172, values[3], 11, colors.muted);
    if (i === 0) nav(card, 'flags');
  });

  const flagsScreen = (p) => {
    shell(p, 'Checkout Web', 'Projects  /  Checkout Web', 'projects');
    heading(p, 'Environment health and flag status');
    [
      [
        'Development',
        '18 of 24 enabled',
        'Synced',
        colors.greenSoft,
        colors.green,
      ],
      [
        'Staging',
        '12 of 24 enabled',
        'Stale · 1 flag',
        colors.amberSoft,
        colors.amber,
      ],
      [
        'Production',
        '8 of 24 enabled · 1 not configured',
        'Synced',
        colors.greenSoft,
        colors.green,
      ],
    ].forEach(([name, count, state, bg, fg], i) => {
      const x = 264 + i * 380;
      box(p, x, 182, 356, 132, colors.white, colors.border, 12);
      text(p, x + 20, 199, name, 14, colors.ink, true);
      text(p, x + 20, 228, count, 12, colors.muted);
      badge(p, x + 20, 263, state, bg, fg, 132);
      if (i === 1)
        text(
          p,
          x + 160,
          269,
          'Observed v8 · Stored v9',
          10,
          colors.amber,
          false,
          185,
        );
    });
    text(p, 264, 346, 'Flags', 18, colors.ink, true);
    box(p, 264, 382, 300, 38);
    text(p, 278, 393, 'Search flags…', 12, colors.faint);
    const createButton = button(p, 1252, 382, 156, '+ New flag');
    nav(createButton, 'create');
    table(
      p,
      264,
      446,
      [240, 160, 80, 95, 100, 140, 220, 109],
      [
        'Flag',
        'Description',
        'Version',
        'Dev',
        'Staging',
        'Prod',
        'Sync',
        'Actions',
      ],
      [
        [
          'new-payment-flow',
          'Checkout redesign',
          'v9',
          status('ON', 'green'),
          status('OFF', 'red'),
          'Not configured',
          status('Stale · staging v8 ≠ v9', 'amber'),
          'Open',
        ],
        [
          'dark-mode',
          'Theme selection',
          'v12',
          status('ON', 'green'),
          status('ON', 'green'),
          status('ON', 'green'),
          status('Synced v12', 'green'),
          'Open',
        ],
        [
          'beta-pricing',
          'Pricing rollout',
          'v4',
          status('ON', 'green'),
          status('OFF', 'red'),
          status('OFF', 'red'),
          status('Synced v4', 'green'),
          'Open',
        ],
      ],
      64,
    );
    const open = frame(
      p,
      270,
      491,
      275,
      60,
      'Open flag editor',
      undefined,
      'none',
    );
    nav(open, 'editor');
    const projectAccess = button(
      p,
      1222,
      748,
      186,
      'Project access',
      'secondary',
    );
    nav(projectAccess, 'access');
  };
  flagsScreen('flags');
  flagsScreen('create');
  box('create', 880, 0, 560, 900, colors.white, colors.border, 0);
  text('create', 912, 30, 'Create new flag', 19, colors.ink, true);
  text('create', 1366, 32, '×', 20, colors.muted);
  line('create', 880, 72, 560);
  field('create', 912, 105, 496, 'Name', 'New payment flow');
  field('create', 912, 185, 496, 'Flag key · editable', 'new-payment-flow');
  field(
    'create',
    912,
    265,
    496,
    'Description',
    'Controls the new checkout flow.',
    100,
  );
  text(
    'create',
    912,
    425,
    'Each environment starts without a definition until it is configured.',
    12,
    colors.secondary,
    false,
    490,
  );
  line('create', 880, 810, 560);
  const cancel = button('create', 1110, 836, 120, 'Cancel', 'secondary');
  nav(cancel, 'flags');
  const createSave = button('create', 1242, 836, 166, 'Create flag');
  nav(createSave, 'editor');

  const editorScreen = (p, productOwner = false) => {
    shell(
      p,
      'new-payment-flow',
      'Projects  /  Checkout Web  /  new-payment-flow',
      'projects',
      productOwner,
    );
    heading(p, 'Edit the flag definition for each environment.');
    box(p, 264, 185, 260, 396, colors.white, colors.border, 12);
    text(p, 284, 208, 'Flag details', 15, colors.ink, true);
    field(p, 284, 245, 220, 'Key', 'new-payment-flow', 38, productOwner);
    field(
      p,
      284,
      320,
      220,
      'Description',
      'Checkout redesign',
      68,
      productOwner,
    );
    text(p, 284, 430, 'Stored version', 11, colors.muted, true);
    text(p, 384, 430, 'v9', 12, colors.ink, false, 60);
    text(p, 284, 454, 'Project', 11, colors.muted, true);
    text(p, 284, 476, 'Checkout Web', 12, colors.ink);
    if (!productOwner)
      text(p, 284, 524, 'Delete flag · admin only', 11, colors.red, true);
    box(p, 548, 185, 860, 558, colors.white, colors.border, 12);
    text(p, 574, 208, 'dev  ·  on', 12, colors.muted, true);
    text(p, 708, 208, 'staging  ·  off', 12, colors.brand, true);
    text(p, 854, 208, 'prod  ·  not configured', 12, colors.muted, true);
    box(p, 707, 239, 110, 2, colors.brand, null, 0);
    line(p, 548, 241, 860);
    text(p, 574, 264, 'Definition · staging', 16, colors.ink, true);
    text(p, 1244, 269, 'Disabled', 11, colors.muted, true, 76);
    box(p, 1330, 262, 42, 22, colors.faint, null, 11);
    create('ellipse', p, 1333, 265, 16, 16, {
      fill: colors.white,
      stroke: 'none',
    });
    if (productOwner) {
      box(p, 574, 302, 810, 38, colors.amberSoft, null, 8);
      text(
        p,
        586,
        313,
        'Product owner access: you can change the enabled state only.',
        11,
        colors.amber,
        true,
      );
      text(
        p,
        284,
        524,
        'Only the enabled state can be changed.',
        10,
        colors.muted,
        false,
        220,
      );
    }
    const y = productOwner ? 352 : 318;
    text(p, 574, y, 'Variants', 13, colors.ink, true);
    box(p, 574, y + 30, 810, 100, colors.canvas, colors.border, 8);
    text(
      p,
      590,
      y + 42,
      'NAME                         VALUE                         TYPE',
      10,
      colors.muted,
      true,
    );
    text(
      p,
      590,
      y + 70,
      'on                                   true                              boolean',
      12,
      colors.secondary,
    );
    text(
      p,
      590,
      y + 94,
      'off                                  false                             boolean',
      12,
      colors.secondary,
    );
    text(p, 574, y + 150, 'Default variant', 12, colors.secondary, true);
    box(p, 574, y + 172, 300, 38, productOwner ? colors.sunken : colors.white);
    text(
      p,
      586,
      y + 183,
      'off  ▾',
      12,
      productOwner ? colors.faint : colors.muted,
    );
    text(p, 574, y + 230, 'Rules', 13, colors.ink, true);
    box(
      p,
      574,
      y + 258,
      810,
      54,
      productOwner ? colors.sunken : colors.white,
      colors.border,
      8,
    );
    text(
      p,
      590,
      y + 274,
      'EU users   ·   country equals FR   →   on',
      12,
      productOwner ? colors.faint : colors.secondary,
    );
    if (!productOwner) {
      text(p, 574, y + 338, '+ Add rule', 12, colors.brand, true);
      button(p, 1114, 766, 130, 'Copy from…', 'secondary');
    }
    button(
      p,
      productOwner ? 1210 : 1256,
      766,
      productOwner ? 198 : 152,
      productOwner ? 'Save enabled state' : 'Save changes',
    );
  };
  editorScreen('editor');
  editorScreen('po', true);
  const poPreview = button(
    'editor',
    264,
    610,
    206,
    'Product owner view',
    'secondary',
  );
  nav(poPreview, 'po');
  const editorBack = button(
    'po',
    264,
    610,
    206,
    'Return to editor',
    'secondary',
  );
  nav(editorBack, 'editor');

  // Playground
  shell('playground', 'Evaluate playground', 'Playground', 'playground');
  heading('playground', 'Test a flag against a sample user context.');
  box('playground', 264, 185, 616, 600, colors.white, colors.border, 12);
  box('playground', 900, 185, 508, 600, colors.white, colors.border, 12);
  text('playground', 288, 208, 'Configure evaluation', 16, colors.ink, true);
  field('playground', 288, 250, 568, 'Project', 'Checkout Web  ▾');
  field('playground', 288, 325, 568, 'Flag', 'new-payment-flow  ▾');
  field('playground', 288, 400, 568, 'Environment', 'Development  ▾');
  field('playground', 288, 475, 568, 'Targeting key', 'user-123');
  text(
    'playground',
    288,
    542,
    'Required for sticky percentage-split rules.',
    11,
    colors.muted,
  );
  field(
    'playground',
    288,
    574,
    568,
    'Context JSON',
    '{"country":"FR","plan":"pro"}',
    64,
  );
  button('playground', 288, 692, 140, 'Evaluate');
  text('playground', 924, 208, 'Result', 16, colors.ink, true);
  text('playground', 924, 265, 'true', 28, colors.green, true);
  badge('playground', 924, 315, 'on', colors.greenSoft, colors.green);
  text('playground', 924, 371, 'Reason', 11, colors.muted, true);
  text('playground', 924, 398, 'MATCHED_RULE · EU users', 13, colors.ink, true);
  text('playground', 924, 444, 'dev · flag v12', 12, colors.muted);
  button('playground', 924, 500, 218, 'Copy OpenFeature snippet', 'secondary');

  // API keys
  const keyScreen = (p) => {
    shell(p, 'API keys', 'Admin  /  API keys', 'keys');
    heading(
      p,
      'Keys authenticate sync and evaluate endpoints for flagd and SDK clients.',
    );
    button(p, 1242, 185, 166, '+ Create key');
    table(
      p,
      264,
      250,
      [240, 240, 180, 170, 140, 174],
      ['Name', 'Scope', 'Created', 'Last used', 'Status', 'Actions'],
      [
        [
          'Production sync',
          'sync',
          'Nov 01, 2026',
          '2 min ago',
          status('Active', 'green'),
          'Revoke',
        ],
        [
          'SDK evaluation',
          'evaluate',
          'Oct 20, 2026',
          '1 hour ago',
          status('Active', 'green'),
          'Revoke',
        ],
        [
          'Old integration',
          'sync',
          'Sep 12, 2026',
          '—',
          status('Revoked', 'red'),
          '—',
        ],
      ],
    );
    const show = button(p, 264, 530, 210, 'Preview key creation', 'secondary');
    nav(show, 'keyCreated');
  };
  keyScreen('keys');
  keyScreen('keyCreated');
  box('keyCreated', 490, 250, 680, 350, colors.white, colors.border, 12);
  text('keyCreated', 522, 280, 'API key created', 19, colors.ink, true);
  box('keyCreated', 522, 330, 616, 60, colors.amberSoft, null, 8);
  text(
    'keyCreated',
    538,
    349,
    'This is the only time the key is shown. Its hash is stored.',
    12,
    colors.amber,
    true,
    580,
  );
  field(
    'keyCreated',
    522,
    417,
    616,
    'API key',
    'fms_example_key_••••••••••••••••',
  );
  const done = button('keyCreated', 1018, 526, 120, 'Done');
  nav(done, 'keys');

  // Audit
  shell('audit', 'Audit log', 'Admin  /  Audit log', 'audit');
  heading('audit', 'Append-only history of changes across projects.');
  ['Actor', 'Action', 'Entity', 'Environment', 'Date range'].forEach(
    (label, i) => field('audit', 264 + i * 220, 184, 200, label, 'All  ▾'),
  );
  table(
    'audit',
    264,
    276,
    [170, 180, 245, 210, 135, 204],
    ['Time', 'Actor', 'Action', 'Entity', 'Env', 'Diff'],
    [
      [
        'Nov 14 14:02',
        'Alex Morgan',
        'flag.definition.update',
        'new-payment-flow',
        'staging',
        'View diff',
      ],
      [
        'Nov 14 13:42',
        'Sam Lee',
        'flag.enabled.update',
        'dark-mode',
        'prod',
        'View diff',
      ],
      [
        'Nov 13 17:20',
        'Alex Morgan',
        'member.invite',
        'jordan',
        '—',
        'View diff',
      ],
    ],
  );
  text(
    'audit',
    264,
    555,
    '1–3 of 214   ·   Previous     1   2   3     Next',
    12,
    colors.muted,
  );
  box('audit', 264, 605, 1144, 100, colors.white, colors.border, 8);
  text('audit', 284, 622, 'Before', 11, colors.red, true);
  text('audit', 284, 648, '− enabled: false', 12, colors.red);
  text('audit', 850, 622, 'After', 11, colors.green, true);
  text('audit', 850, 648, '+ enabled: true', 12, colors.green);

  // Members
  shell('members', 'Members & invites', 'Admin  /  Members', 'members');
  heading('members', 'Manage global roles and project memberships.');
  button('members', 1242, 185, 166, '+ Invite user');
  table(
    'members',
    264,
    250,
    [300, 620, 224],
    ['User', 'Project roles', 'Actions'],
    [
      ['alex', 'checkout-web: admin', 'Re-invite'],
      ['sam', 'checkout-web: developer · mobile-app: developer', 'Re-invite'],
      ['jordan', 'checkout-web: product owner', 'Re-invite'],
    ],
  );
  text(
    'members',
    264,
    510,
    'Invites provide a one-time temporary password; re-inviting updates roles and memberships.',
    12,
    colors.muted,
  );
  const toRoles = button(
    'members',
    264,
    560,
    210,
    'View permissions',
    'secondary',
  );
  nav(toRoles, 'roles');

  // Roles
  shell(
    'roles',
    'Roles & permissions',
    'Admin  /  Roles & permissions',
    'roles',
  );
  heading(
    'roles',
    'Effective permissions combine global roles with project grants.',
  );
  const matrix = [
    ['Create projects', 'Global', '✓', '—', '—'],
    ['Invite members / assign projects', 'Global', '✓', '—', '—'],
    ['Manage API keys', 'Global', '✓', '—', '—'],
    ['Read audit', 'Global', '✓', '—', '—'],
    ['Create project environments', 'Project', '✓', '✓', '—'],
    ['Create flags / edit description', 'Project', '✓', '✓', '—'],
    ['Delete flags', 'Project', '✓', '—', '—'],
    ['Edit / copy definitions', 'Project', '✓', '✓', '—'],
    ['Toggle a flag enabled state', 'Project', '✓', '✓', '✓'],
    ['View flags and definitions', 'Project', '✓', '✓', '✓'],
    ['Evaluate flags', 'Project', '✓', '✓', '✓'],
  ];
  table(
    'roles',
    264,
    192,
    [488, 150, 160, 170, 176],
    ['Capability', 'Scope', 'Admin', 'Developer', 'Product owner'],
    matrix,
    46,
  );
  text(
    'roles',
    264,
    760,
    'Project grants may elevate, never reduce, the global role.',
    12,
    colors.muted,
  );

  // Project access
  shell(
    'access',
    'Project access',
    'Projects  /  Checkout Web  /  Access',
    'projects',
  );
  heading('access', 'Manage membership for Checkout Web.');
  box('access', 264, 182, 1144, 118, colors.white, colors.border, 12);
  text('access', 284, 201, 'Restricted by default', 14, colors.ink, true);
  text(
    'access',
    284,
    230,
    'Only invited members with a role on this project can act on it.',
    12,
    colors.secondary,
  );
  text(
    'access',
    284,
    258,
    'Project roles can elevate, but never reduce, global permissions.',
    12,
    colors.muted,
  );
  text('access', 264, 338, 'Assigned members', 16, colors.ink, true);
  button('access', 1242, 326, 166, '+ Add member');
  table(
    'access',
    264,
    382,
    [520, 624],
    ['User', 'Role on this project'],
    [
      ['alex', status('admin', 'green')],
      ['sam', status('developer', 'amber')],
      ['jordan', status('product owner', 'amber')],
    ],
  );
  text(
    'access',
    264,
    612,
    'To change a role, add the member again with the new role. Removing a member is not available yet.',
    12,
    colors.muted,
  );

  // ---------------------------------------------------------------- states
  const stateFrames = [
    ['flagsLoading', 'Flags · loading'],
    ['flagsEmpty', 'Flags · empty'],
    ['flagsError', 'Flags · error'],
    ['confirmToggle', 'Confirm · turn flag off'],
    ['confirmDelete', 'Confirm · delete flag'],
    ['validation', 'Validation · all problems'],
    ['inviteSuccess', 'Invite · temporary password'],
  ];
  for (const [i, [id, name]] of stateFrames.entries()) {
    frame(
      null,
      (i % 3) * 1520,
      5000 + Math.floor(i / 3) * 1000,
      1440,
      900,
      name,
      id,
    );
  }
  const flagsHeader = (p) => {
    shell(p, 'Checkout Web', 'Projects  /  Checkout Web', 'projects');
    heading(p, 'Environment health and flag status');
    text(p, 264, 196, 'Flags', 18, colors.ink, true);
    box(p, 264, 232, 300, 38);
    text(p, 278, 243, 'Search flags…', 12, colors.faint);
    button(p, 1252, 232, 156, '+ New flag');
  };
  flagsHeader('flagsLoading');
  box('flagsLoading', 264, 296, 1144, 216, colors.white, colors.border, 10);
  [0, 1, 2].forEach((row) => {
    box('flagsLoading', 284, 322 + row * 60, 280, 14, colors.sunken, null, 7);
    box('flagsLoading', 620, 322 + row * 60, 420, 14, colors.sunken, null, 7);
    box('flagsLoading', 1120, 322 + row * 60, 120, 14, colors.sunken, null, 7);
  });
  text('flagsLoading', 264, 532, 'Loading flags…', 12, colors.muted);

  flagsHeader('flagsEmpty');
  box('flagsEmpty', 264, 296, 1144, 216, colors.white, colors.border, 12);
  text('flagsEmpty', 764, 356, 'No flags yet', 15, colors.ink, true, 300);
  text(
    'flagsEmpty',
    700,
    392,
    'Create one to start controlling rollout.',
    12,
    colors.muted,
    false,
    400,
  );

  flagsHeader('flagsError');
  box('flagsError', 264, 296, 1144, 76, colors.redSoft, null, 10);
  text('flagsError', 284, 312, 'Failed to load flags', 13, colors.red, true);
  text(
    'flagsError',
    284,
    338,
    'No access to this project. Nothing is shown as empty or synced.',
    12,
    colors.red,
    false,
    700,
  );
  button('flagsError', 1272, 315, 116, 'Retry', 'secondary');

  const confirmCard = (p, x, y, message, action, danger = false) => {
    box(p, x, y, 330, 124, colors.white, colors.border, 10);
    text(p, x + 18, y + 18, message, 12, colors.ink, false, 294);
    button(p, x + 116, y + 70, 86, 'Cancel', 'secondary');
    const confirm = button(p, x + 212, y + 70, 100, action);
    if (danger) box(confirm, 0, 0, 100, 38, colors.red, null, 8);
    if (danger) text(confirm, 12, 10, action, 12, colors.white, true, 80);
  };
  flagsScreen('confirmToggle');
  confirmCard(
    'confirmToggle',
    700,
    552,
    'Turn “new-payment-flow” off in dev?',
    'Turn off',
  );
  editorScreen('confirmDelete');
  confirmCard(
    'confirmDelete',
    284,
    552,
    'Delete “new-payment-flow” in every environment? This cannot be undone.',
    'Delete flag',
    true,
  );

  editorScreen('validation');
  box('validation', 548, 640, 860, 96, colors.redSoft, null, 10);
  text(
    'validation',
    568,
    652,
    '2 problems to fix before saving:',
    12,
    colors.red,
    true,
  );
  text(
    'validation',
    568,
    676,
    '1. /defaultVariant: default variant must be one of the defined variants',
    12,
    colors.red,
    false,
    820,
  );
  text(
    'validation',
    568,
    698,
    '2. /rules/0/conditions: attribute rule requires a non-empty conditions array',
    12,
    colors.red,
    false,
    820,
  );

  shell('inviteSuccess', 'Members', 'Admin  /  Members', 'members');
  box('inviteSuccess', 460, 240, 520, 330, colors.white, colors.border, 14);
  text('inviteSuccess', 492, 268, 'User invited', 17, colors.ink, true);
  text(
    'inviteSuccess',
    492,
    312,
    'jordan can now sign in with this temporary password.',
    12,
    colors.secondary,
    false,
    456,
  );
  box('inviteSuccess', 492, 344, 456, 44, colors.ink, null, 8);
  text('inviteSuccess', 508, 357, 'temp-Xk3vQ9mT2pLa', 13, colors.white, true);
  box('inviteSuccess', 492, 404, 456, 54, colors.amberSoft, null, 8);
  text(
    'inviteSuccess',
    508,
    414,
    'Shown once — only its hash is stored. Copy it now and pass it to the user.',
    12,
    colors.amber,
    false,
    424,
  );
  button('inviteSuccess', 492, 486, 230, 'I have copied the password');

  // ---------------------------------------------------------------- mobile (390 × 844)
  const mobileFrames = [
    ['mLogin', 'Mobile · Login'],
    ['mNav', 'Mobile · Navigation'],
    ['mProjects', 'Mobile · Projects'],
    ['mFlags', 'Mobile · Flags'],
    ['mEditor', 'Mobile · Flag editor'],
  ];
  for (const [i, [id, name]] of mobileFrames.entries()) {
    frame(null, i * 470, 8000, 390, 844, name, id);
  }
  const mobileTop = (p, crumb, title) => {
    box(p, 0, 0, 390, 56, colors.white, null, 0);
    line(p, 0, 55, 390);
    text(p, 16, 19, 'Menu', 12, colors.ink, true, 50);
    text(p, 78, 19, crumb, 12, colors.muted, false, 220);
    badge(p, 310, 15, '● Live', colors.brandSoft, colors.brand, 66);
    if (title) text(p, 16, 76, title, 19, colors.ink, true, 358);
  };

  box('mLogin', 16, 150, 358, 500, colors.white, colors.border, 14);
  box('mLogin', 40, 176, 36, 36, colors.brand, null, 9);
  text('mLogin', 51, 184, 'F', 16, colors.white, true, 20);
  text('mLogin', 40, 232, 'Sign in', 19, colors.ink, true, 300);
  text(
    'mLogin',
    40,
    262,
    'Use your FMS account for this instance',
    12,
    colors.muted,
    false,
    310,
  );
  field('mLogin', 40, 300, 310, 'Username', 'admin');
  field('mLogin', 40, 376, 310, 'Password', '••••••••••••');
  button('mLogin', 40, 460, 310, 'Sign in');
  text(
    'mLogin',
    40,
    520,
    'No self-signup — accounts are created by admin invite.',
    11,
    colors.muted,
    false,
    310,
  );

  mobileTop('mNav', 'Projects');
  box('mNav', 0, 0, 390, 844, colors.ink, null, 0);
  box('mNav', 0, 0, 232, 844, colors.white, null, 0);
  text('mNav', 20, 28, 'FMS', 16, colors.ink, true, 130);
  [
    'Projects',
    'Playground',
    'API keys',
    'Audit log',
    'Members',
    'Roles & permissions',
    'User guide',
  ].forEach((label, i) => {
    if (i === 0) box('mNav', 16, 80, 200, 36, colors.brandSoft, null, 8);
    text(
      'mNav',
      28,
      90 + i * 44,
      label,
      12,
      i === 0 ? colors.brand : colors.secondary,
      true,
      190,
    );
  });
  box('mNav', 16, 730, 200, 92, colors.white, colors.border, 8);
  text('mNav', 28, 744, 'alex', 12, colors.ink, true, 170);
  badge('mNav', 28, 766, 'admin', colors.greenSoft, colors.green, 60);
  text('mNav', 28, 798, 'Sign out', 11, colors.secondary, true, 170);

  mobileTop('mProjects', 'Projects', 'Projects');
  box('mProjects', 16, 120, 358, 38);
  text('mProjects', 30, 131, 'Search projects…', 12, colors.faint);
  button('mProjects', 16, 172, 150, '+ New project');
  [
    ['Checkout Web', 'checkout-web'],
    ['Mobile App', 'mobile-app'],
  ].forEach(([name, key], i) => {
    const y = 230 + i * 210;
    box('mProjects', 16, y, 358, 190, colors.white, colors.border, 12);
    text('mProjects', 36, y + 18, name, 15, colors.ink, true, 300);
    text('mProjects', 36, y + 44, key, 11, colors.muted, false, 300);
    badge('mProjects', 36, y + 72, 'dev', colors.blueSoft, colors.blue, 50);
    badge(
      'mProjects',
      94,
      y + 72,
      'staging',
      colors.amberSoft,
      colors.amber,
      76,
    );
    badge('mProjects', 178, y + 72, 'prod', colors.redSoft, colors.red, 60);
    line('mProjects', 36, y + 112, 318);
    button('mProjects', 36, y + 132, 120, 'Open flags', 'secondary');
  });

  mobileTop('mFlags', 'Projects  /  Checkout Web', 'Checkout Web');
  [
    ['dev', '18 of 24 enabled', 'Synced', colors.greenSoft, colors.green],
    [
      'staging',
      '12 of 24 enabled',
      'Stale · 1 flag',
      colors.amberSoft,
      colors.amber,
    ],
  ].forEach(([env, count, state, bg, fg], i) => {
    const y = 120 + i * 112;
    box('mFlags', 16, y, 358, 100, colors.white, colors.border, 12);
    text('mFlags', 36, y + 14, env, 12, colors.ink, true, 200);
    text('mFlags', 36, y + 38, count, 12, colors.muted, false, 300);
    badge('mFlags', 36, y + 64, state, bg, fg, 120);
  });
  box('mFlags', 16, 352, 230, 38);
  text('mFlags', 30, 363, 'Search flags…', 12, colors.faint);
  button('mFlags', 258, 352, 116, '+ New flag');
  box('mFlags', 16, 408, 358, 150, colors.white, colors.border, 10);
  text('mFlags', 30, 422, 'FLAG', 10, colors.secondary, true, 80);
  text('mFlags', 150, 422, 'VERSION', 10, colors.secondary, true, 70);
  text('mFlags', 230, 422, 'DEV', 10, colors.secondary, true, 50);
  text('mFlags', 300, 422, 'STAGING  ›', 10, colors.secondary, true, 80);
  line('mFlags', 16, 448, 358);
  text('mFlags', 30, 466, 'new-payment-flow', 11, colors.ink, true, 110);
  text('mFlags', 150, 466, 'v9', 11, colors.secondary, false, 40);
  badge('mFlags', 226, 462, 'ON', colors.greenSoft, colors.green, 46);
  badge('mFlags', 296, 462, 'OFF', colors.redSoft, colors.red, 50);
  text(
    'mFlags',
    16,
    572,
    'The table scrolls sideways inside its card; the page does not.',
    11,
    colors.muted,
    false,
    358,
  );

  mobileTop(
    'mEditor',
    'Projects  /  …  /  new-payment-flow',
    'new-payment-flow',
  );
  box('mEditor', 16, 120, 358, 150, colors.white, colors.border, 12);
  text('mEditor', 36, 136, 'Flag details', 14, colors.ink, true, 300);
  text('mEditor', 36, 168, 'Stored version', 11, colors.muted, true, 120);
  text('mEditor', 160, 168, 'v9', 12, colors.ink, false, 60);
  text('mEditor', 36, 196, 'Project', 11, colors.muted, true, 120);
  text('mEditor', 160, 196, 'Checkout Web', 12, colors.ink, false, 180);
  text('mEditor', 36, 232, 'Delete flag', 11, colors.red, true, 200);
  box('mEditor', 16, 286, 358, 420, colors.white, colors.border, 12);
  text('mEditor', 36, 304, 'dev · on', 11, colors.muted, true, 70);
  text('mEditor', 110, 304, 'staging · off', 11, colors.brand, true, 90);
  text(
    'mEditor',
    210,
    304,
    'prod · not configured',
    11,
    colors.muted,
    true,
    150,
  );
  line('mEditor', 16, 330, 358);
  text('mEditor', 36, 348, 'Definition · staging', 14, colors.ink, true, 200);
  text('mEditor', 262, 351, 'Disabled', 11, colors.muted, true, 60);
  box('mEditor', 322, 346, 36, 20, colors.faint, null, 10);
  text('mEditor', 36, 390, 'Variants', 12, colors.ink, true, 200);
  box('mEditor', 36, 414, 318, 78, colors.white, colors.border, 8);
  text(
    'mEditor',
    50,
    426,
    'on      true      boolean',
    11,
    colors.secondary,
    false,
    290,
  );
  text(
    'mEditor',
    50,
    456,
    'off     false     boolean',
    11,
    colors.secondary,
    false,
    290,
  );
  text('mEditor', 36, 512, 'Default variant', 12, colors.ink, true, 200);
  box('mEditor', 36, 536, 318, 36);
  text('mEditor', 50, 546, 'off  ▾', 12, colors.muted, false, 100);
  text('mEditor', 36, 596, 'Rules', 12, colors.ink, true, 200);
  text('mEditor', 36, 622, '+ Add rule', 12, colors.brand, true, 200);
  button('mEditor', 16, 724, 110, 'Discard', 'secondary');
  button('mEditor', 244, 724, 130, 'Save changes');

  links.forEach(([node, destination]) => link(node, destination));
  command('proto.flow.add', { start: ref('login'), name: 'FMS main flow' });

  // Design system and user flow are separate pages from the clickable screens.
  command('page.add', { name: '00 · Design System' });
  const system = frame(
    null,
    0,
    0,
    1440,
    900,
    'FMS design system',
    'system',
    colors.white,
  );
  text(system, 48, 45, 'FMS design system', 28, colors.ink, true);
  text(
    system,
    48,
    92,
    'Core palette, typography and reusable visual patterns',
    14,
    colors.muted,
  );
  text(system, 48, 152, 'Color tokens', 18, colors.ink, true);
  const swatches = [
    ['Canvas', colors.canvas],
    ['Surface', colors.white],
    ['Border', colors.border],
    ['Ink', colors.ink],
    ['Brand', colors.brand],
    ['Success', colors.green],
    ['Warning', colors.amber],
    ['Danger', colors.red],
  ];
  swatches.forEach(([label, color], i) => {
    const x = 48 + i * 166;
    box(system, x, 193, 142, 80, color, colors.border, 8);
    text(system, x, 285, label, 12, colors.ink, true, 140);
    text(system, x, 307, color, 11, colors.muted, false, 140);
  });
  text(system, 48, 379, 'Typography', 18, colors.ink, true);
  text(system, 48, 419, 'Page title · 23 bold', 23, colors.ink, true);
  text(system, 48, 463, 'Card heading · 16 bold', 16, colors.ink, true);
  text(
    system,
    48,
    500,
    'Body · 14 regular    Caption · 12 regular',
    14,
    colors.secondary,
  );
  text(system, 48, 575, 'Components', 18, colors.ink, true);
  button(system, 48, 619, 145, 'Primary action');
  button(system, 208, 619, 145, 'Secondary', 'secondary');
  badge(system, 378, 626, 'Synced v12', colors.greenSoft, colors.green, 110);
  badge(system, 504, 626, 'Stale v8 ≠ v9', colors.amberSoft, colors.amber, 140);
  badge(system, 660, 626, 'OFF', colors.redSoft, colors.red);
  field(system, 48, 704, 300, 'Input label', 'Placeholder text');
  command('variable.createCollection', { name: 'FMS Color' });
  const variables = {
    'bg/canvas': colors.canvas,
    'bg/surface': colors.white,
    'border/default': colors.border,
    'ink/1': colors.ink,
    'ink/2': colors.secondary,
    'ink/3': colors.muted,
    'brand/600': colors.brand,
    'brand/50': colors.brandSoft,
    'ok/700': colors.green,
    'ok/100': colors.greenSoft,
    'warn/700': colors.amber,
    'warn/100': colors.amberSoft,
    'bad/700': colors.red,
    'bad/100': colors.redSoft,
  };
  Object.entries(variables).forEach(([name, value]) =>
    command('variable.create', {
      collection: 'FMS Color',
      name,
      type: 'color',
      value,
    }),
  );
  command('page.add', { name: '02 · User Flow' });
  const flow = frame(
    null,
    0,
    0,
    1440,
    900,
    'FMS user flow',
    'flow',
    colors.canvas,
  );
  text(flow, 48, 50, 'FMS operator journey', 25, colors.ink, true);
  text(flow, 48, 96, 'Main flow and role-gated branches', 14, colors.muted);
  const nodes = [
    [60, 200, 'Sign in', 'Invite-only account'],
    [350, 200, 'Projects', 'Select project'],
    [640, 200, 'Flags', 'Check environment health'],
    [930, 200, 'Flag editor', 'Edit or toggle'],
    [640, 440, 'Playground', 'Evaluate with context'],
    [930, 440, 'Sync health', 'Observed vs stored'],
    [350, 610, 'Admin tools', 'Keys · audit · members'],
    [640, 610, 'Project access', 'Role grants'],
  ];
  nodes.forEach(([x, y, label, detail]) => {
    box(flow, x, y, 230, 105, colors.white, colors.border, 10);
    text(flow, x + 18, y + 20, label, 14, colors.ink, true);
    text(flow, x + 18, y + 53, detail, 11, colors.muted);
  });
  [
    [300, 238],
    [590, 238],
    [880, 238],
    [755, 340],
    [1045, 340],
    [590, 648],
  ].forEach(([x, y], i) =>
    text(
      flow,
      x,
      y,
      i === 3 || i === 4 ? '↓' : '→',
      22,
      colors.brand,
      true,
      30,
    ),
  );
  text(
    flow,
    60,
    795,
    'Product owners can toggle enabled state; admins and developers have additional capabilities.',
    12,
    colors.muted,
  );
  return steps;
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  process.stdout.write(JSON.stringify(buildDesign()));
}
