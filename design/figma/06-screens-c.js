// design/figma/06-screens-c.js — API Keys, Audit, Members frames on page 01 · Screens
const C = (hex) => { const h = hex.replace('#',''); return { r: parseInt(h.slice(0,2),16)/255, g: parseInt(h.slice(2,4),16)/255, b: parseInt(h.slice(4,6),16)/255 }; };
const F = (hex) => ({ type: 'SOLID', color: C(hex) });
const FONTS = {
  h1: { family: 'Inter', style: 'Semi Bold', size: 20, lh: 28 },
  h2: { family: 'Inter', style: 'Semi Bold', size: 16, lh: 24 },
  h3: { family: 'Inter', style: 'Semi Bold', size: 14, lh: 20 },
  body: { family: 'Inter', style: 'Regular', size: 14, lh: 20 },
  bsm: { family: 'Inter', style: 'Regular', size: 13, lh: 18 },
  cap: { family: 'Inter', style: 'Regular', size: 12, lh: 16 },
  caps: { family: 'Inter', style: 'Semi Bold', size: 12, lh: 16 },
  ovl: { family: 'Inter', style: 'Semi Bold', size: 11, lh: 14 },
  mono: { family: 'JetBrains Mono', style: 'Regular', size: 13, lh: 20 },
  monosm: { family: 'JetBrains Mono', style: 'Regular', size: 12, lh: 16 },
};
for (const f of Object.values(FONTS)) await figma.loadFontAsync({ family: f.family, style: f.style });
function T(str, fKey, color, w) {
  const f = FONTS[fKey];
  const t = figma.createText();
  t.fontName = { family: f.family, style: f.style };
  t.fontSize = f.size; t.lineHeight = { value: f.lh, unit: 'PIXELS' };
  t.fills = [F(color || '#101828')];
  t.characters = str;
  if (w) { t.textAutoResize = 'HEIGHT'; t.width = w; }
  return t;
}
const page = figma.root.children.find(p => p.name === '01 · Screens');
await figma.setCurrentPageAsync(page);
const out = { frames: [] };
const ds = figma.root.children.find(p => p.name === '00 · Design System');
function getComp(name) { return ds.children.find(n => n.name === name && n.type === 'COMPONENT'); }
function newScreen(name) {
  let fr = page.children.find(n => n.name === name);
  if (fr) fr.remove();
  fr = figma.createFrame(); fr.name = name; fr.resize(1440, 900); fr.fills = [F('#F6F7F9')];
  fr.x = (page.children.length - 1) * 1600; fr.y = 0;
  page.appendChild(fr);
  out.frames.push(name + ':' + fr.id);
  return fr;
}
function withShell(frame, breadcrumb) {
  const inst = getComp('AppShell').createInstance();
  inst.x = 0; inst.y = 0;
  frame.appendChild(inst);
  const bc = inst.findChild(n => n.name === 'Breadcrumb');
  if (bc && 'characters' in bc) bc.characters = breadcrumb;
  return inst.findChild(n => n.name === 'Content');
}
function card(parent, w) {
  const c = figma.createAutoLayout('VERTICAL', { itemSpacing: 16, paddingLeft: 20, paddingRight: 20, paddingTop: 18, paddingBottom: 18 });
  c.fills = [F('#FFFFFF')]; c.strokes = [F('#E4E7EC')]; c.strokeWeight = 1; c.cornerRadius = 12;
  c.layoutSizingHorizontal = w === 'fill' ? 'FILL' : 'FIXED';
  if (w !== 'fill') c.resize(w, 100);
  parent.appendChild(c);
  return c;
}
function override(inst, oldText, newText) {
  const t = inst.findChild(n => n.type === 'TEXT' && n.characters === oldText);
  if (t && 'characters' in t) t.characters = newText;
}
function headRow(parent, title, actionLabel, caption) {
  const head = figma.createAutoLayout('HORIZONTAL', { primaryAxisAlignItems: 'CENTER', itemSpacing: 16 });
  head.layoutSizingHorizontal = 'FILL';
  const left = figma.createAutoLayout('VERTICAL', { itemSpacing: 2 });
  left.appendChild(T(title, 'h1', '#101828'));
  if (caption) left.appendChild(T(caption, 'cap', '#667085'));
  head.appendChild(left);
  const grow = figma.createAutoLayout({ itemSpacing: 8 }); grow.fills = []; grow.layoutSizingHorizontal = 'FILL';
  if (actionLabel) {
    const b = getComp('Button/Primary').createInstance();
    override(b, 'Button', actionLabel);
    grow.appendChild(b);
  }
  head.appendChild(grow);
  parent.appendChild(head);
}
function makeTable(parent, cols) {
  const tbl = card(parent, 'fill');
  const rowW = 1128;
  function row(cells, isHead) {
    const r = figma.createAutoLayout('HORIZONTAL', { itemSpacing: 12, paddingTop: 12, paddingBottom: 12 });
    r.layoutSizingHorizontal = 'FILL';
    r.fills = [F(isHead ? '#F2F4F7' : 'transparent')]; r.cornerRadius = 6;
    cols.forEach(([label, wfrac], i) => {
      const cell = figma.createAutoLayout('HORIZONTAL', { itemSpacing: 8, counterAxisAlignItems: 'CENTER' });
      cell.layoutSizingHorizontal = 'FIXED';
      cell.resize(Math.round(rowW * wfrac), 24);
      for (const t of cells(label, i)) cell.appendChild(t);
      r.appendChild(cell);
    });
    return r;
  }
  tbl.appendChild(row((label) => [T(label, 'ovl', '#98A2B3')], true));
  return { tbl, row };
}

// ============ Screen 6: API Keys ============
{
  const fr = newScreen('Screen/API Keys');
  const content = withShell(fr, 'API Keys');
  headRow(content, 'API keys', 'Create key', 'Keys authenticate the sync and evaluate endpoints for flagd and SDK clients.');
  const { tbl, row } = makeTable(content, [
    ['Name', 0.26], ['Scope', 0.2], ['Created', 0.16], ['Last used', 0.14], ['Status', 0.12], ['', 0.12],
  ]);
  const keys = [
    ['sync-prod-checkout', ['sync'], '2026-09-14', '2 min ago', 'Badge/Active', 'Active'],
    ['evaluate-mobile-api', ['evaluate'], '2026-10-02', '1 h ago', 'Badge/Active', 'Active'],
    ['ci-deploy-keys', ['evaluate'], '2026-08-11', '12 d ago', 'Badge/Revoked', 'Revoked'],
  ];
  for (const [name, scopes, created, last, badge, status] of keys) {
    tbl.appendChild(row((label, i) => {
      if (label === 'Name') return [T(name, 'mono', '#101828')];
      if (label === 'Scope') { const c = []; for (const s of scopes) { const b = getComp('Badge/Live').createInstance(); override(b, 'Live', s); c.push(b); } return c; }
      if (label === 'Created' || label === 'Last used') return [T(label === 'Created' ? created : last, 'cap', '#667085')];
      if (label === 'Status') return [getComp(badge).createInstance()];
      const b = getComp('Button/Ghost').createInstance();
      override(b, 'Button', 'Revoke');
      return [b];
    }, false));
  }
  // one-time plaintext card
  const once = card(content, 'fill');
  once.itemSpacing = 8;
  const warnRow = figma.createAutoLayout('HORIZONTAL', { itemSpacing: 8, primaryAxisAlignItems: 'CENTER' });
  const wicon = getComp('Icon/Warning'); if (wicon) warnRow.appendChild(wicon.createInstance());
  warnRow.appendChild(T('Plaintext key — shown once, only its hash is stored (FR-45)', 'bsm', '#B42318'));
  once.appendChild(warnRow);
  const keyRow = figma.createAutoLayout('HORIZONTAL', { itemSpacing: 12, primaryAxisAlignItems: 'CENTER', paddingLeft: 12, paddingRight: 12, paddingTop: 10, paddingBottom: 10 });
  keyRow.fills = [F('#F2F4F7')]; keyRow.cornerRadius = 8;
  keyRow.layoutSizingHorizontal = 'FILL';
  keyRow.appendChild(T('fms_sk_9f2c41ab77e0d3a85512bb04', 'mono', '#101828'));
  const sp = figma.createAutoLayout({}); sp.fills = []; sp.layoutSizingHorizontal = 'FILL'; sp.resize(1, 8);
  keyRow.appendChild(sp);
  const cpb = getComp('Button/Secondary-SM').createInstance();
  override(cpb, 'Button', 'Copy');
  keyRow.appendChild(cpb);
  once.appendChild(keyRow);
}

// ============ Screen 7: Audit ============
{
  const fr = newScreen('Screen/Audit');
  const content = withShell(fr, 'Audit log');
  headRow(content, 'Audit log', null, 'Append-only record of every mutation. Expand a row for the before/after diff.');
  const filterRow = figma.createAutoLayout('HORIZONTAL', { itemSpacing: 8 });
  for (const f of ['Actor: all', 'Action: all', 'Entity: all', 'Env: all', 'Last 24 h']) {
    const s = getComp('Input/Select').createInstance();
    override(s, 'Select…', f);
    s.resize(160, 36);
    filterRow.appendChild(s);
  }
  content.appendChild(filterRow);
  const { tbl, row } = makeTable(content, [
    ['Time', 0.14], ['Actor', 0.2], ['Action', 0.24], ['Entity', 0.18], ['Env', 0.1], ['', 0.14],
  ]);
  const rows = [
    ['12:41:07', 'alex@acme.com', 'flag.definition.update', 'new-payment-flow', 'staging', true],
    ['12:38:55', 'maya@acme.com', 'flag.toggle', 'express-checkout', 'prod', false],
    ['12:02:19', 'flagd (sync)', 'sync.observed.stale', 'fraud-check-v2', 'staging', false],
    ['11:52:10', 'dana@acme.com', 'flag.create', 'wallet-paypal', '—', false],
    ['10:12:44', 'admin@acme.com', 'user.invite', 'sam@acme.com', '—', false],
    ['09:05:12', 'alex@acme.com', 'apikey.create', 'sync-prod-checkout', '—', false],
  ];
  const envColor = { dev: 'EnvChip/Dev', staging: 'EnvChip/Staging', prod: 'EnvChip/Prod' };
  for (const [time, actor, action, entity, env, expanded] of rows) {
    tbl.appendChild(row((label, i) => {
      if (label === 'Time') return [T(time, 'monosm', '#667085')];
      if (label === 'Actor') { const c = []; const av = getComp('Avatar'); if (av) { const a = av.createInstance(); override(a, 'AL', actor.slice(0, 2).toUpperCase()); c.push(a); } c.push(T(actor, 'bsm', '#101828')); return c; }
      if (label === 'Action') { const b = getComp('Badge/Disabled').createInstance(); override(b, 'Disabled', action); return [b]; }
      if (label === 'Entity') return [T(entity, 'mono', '#475467')];
      if (label === 'Env') return env === '—' ? [T('—', 'cap', '#98A2B3')] : [getComp(envColor[env]).createInstance()];
      const ch = getComp(expanded ? 'Icon/ChevronDown' : 'Icon/ChevronRight');
      return ch ? [ch.createInstance()] : [];
    }, false));
    if (expanded) {
      const diff = figma.createAutoLayout('VERTICAL', { itemSpacing: 4, paddingLeft: 16, paddingRight: 16, paddingTop: 12, paddingBottom: 12 });
      diff.fills = [F('#FFFFFF')]; diff.strokes = [F('#EAECF0')]; diff.strokeWeight = 1; diff.cornerRadius = 8;
      diff.layoutSizingHorizontal = 'FILL';
      diff.appendChild(getComp('DiffRow/-').createInstance());
      diff.appendChild(getComp('DiffRow/+').createInstance());
      diff.appendChild(T('rule 2: {country is one of [DE, FR]} → {country is one of [DE, FR, ES]}', 'monosm', '#667085'));
      tbl.appendChild(diff);
    }
  }
  const pager = figma.createAutoLayout('HORIZONTAL', { itemSpacing: 12, primaryAxisAlignItems: 'CENTER' });
  pager.layoutSizingHorizontal = 'FILL';
  pager.appendChild(T('1–20 of 214', 'cap', '#667085'));
  const sp = figma.createAutoLayout({}); sp.fills = []; sp.layoutSizingHorizontal = 'FILL'; sp.resize(1, 8);
  pager.appendChild(sp);
  const prev = getComp('Button/Secondary-SM').createInstance(); override(prev, 'Button', 'Prev'); pager.appendChild(prev);
  const next = getComp('Button/Secondary-SM').createInstance(); override(next, 'Button', 'Next'); pager.appendChild(next);
  content.appendChild(pager);
}

// ============ Screen 8: Members ============
{
  const fr = newScreen('Screen/Members');
  const content = withShell(fr, 'Members');
  headRow(content, 'Members', 'Invite user', 'Global role + independent per-project roles; effective permission is the union (FR-54).');
  const { tbl, row } = makeTable(content, [
    ['User', 0.28], ['Global role', 0.16], ['Project roles', 0.36], ['Last active', 0.12], ['', 0.08],
  ]);
  const members = [
    ['admin@acme.com', 'RoleTag/Admin', ['checkout-web: admin', 'mobile-api: admin'], 'now'],
    ['alex@acme.com', 'RoleTag/Developer', ['checkout-web: developer', 'mobile-api: developer'], '12:41'],
    ['maya@acme.com', 'RoleTag/Developer', ['checkout-web: developer'], '12:38'],
    ['dana@acme.com', 'RoleTag/Product Owner', ['marketing-site: product-owner', 'checkout-web: product-owner'], '11:52'],
    ['sam@acme.com', 'RoleTag/Product Owner', ['mobile-api: product-owner'], '— (invited)'],
  ];
  for (const [user, role, proles, last] of members) {
    tbl.appendChild(row((label, i) => {
      if (label === 'User') { const c = []; const av = getComp('Avatar'); if (av) { const a = av.createInstance(); override(a, 'AL', user.slice(0, 2).toUpperCase()); c.push(a); } c.push(T(user, 'bsm', '#101828')); return c; }
      if (label === 'Global role') return [getComp(role).createInstance()];
      if (label === 'Project roles') { const c = []; for (const p of proles) { const chip = getComp('Badge/Disabled').createInstance(); override(chip, 'Disabled', p); c.push(chip); } return c; }
      if (label === 'Last active') return [T(last, 'cap', '#667085')];
      const b = getComp('Button/Ghost').createInstance();
      override(b, 'Button', 'Re-invite');
      return [b];
    }, false));
  }
  // invite success card
  const inv = card(content, 'fill');
  inv.itemSpacing = 8;
  inv.appendChild(T('Invite sent — sam@acme.com', 'h3', '#101828'));
  const warnRow = figma.createAutoLayout('HORIZONTAL', { itemSpacing: 8, primaryAxisAlignItems: 'CENTER' });
  const wicon = getComp('Icon/Warning'); if (wicon) warnRow.appendChild(wicon.createInstance());
  warnRow.appendChild(T('Temporary password — shown once, only its hash is stored (FR-57)', 'bsm', '#B54708'));
  inv.appendChild(warnRow);
  const pwRow = figma.createAutoLayout('HORIZONTAL', { itemSpacing: 12, primaryAxisAlignItems: 'CENTER', paddingLeft: 12, paddingRight: 12, paddingTop: 10, paddingBottom: 10 });
  pwRow.fills = [F('#F2F4F7')]; pwRow.cornerRadius = 8;
  pwRow.layoutSizingHorizontal = 'FILL';
  pwRow.appendChild(T('Tq8-m4x-vw2-9kP7', 'mono', '#101828'));
  const sp = figma.createAutoLayout({}); sp.fills = []; sp.layoutSizingHorizontal = 'FILL'; sp.resize(1, 8);
  pwRow.appendChild(sp);
  const cpb = getComp('Button/Secondary-SM').createInstance();
  override(cpb, 'Button', 'Copy');
  pwRow.appendChild(cpb);
  inv.appendChild(pwRow);
}
return out;
