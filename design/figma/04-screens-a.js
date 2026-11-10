// design/figma/04-screens-a.js — run after 03-shell.js (needs AppShell + atoms)
// Login, Projects (card grid), Flags (env summary cards + inline ON/OFF pills + create-flag drawer).
// Fill SHELL_ID from the 'AppShell:<id>' entry of 03-shell.js output.

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
  t.fills = [F(color || '#0F172A')];
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
  fr = figma.createFrame(); fr.name = name; fr.resize(1440, 900); fr.fills = [F('#F8FAFC')];
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
  c.fills = [F('#FFFFFF')]; c.strokes = [F('#E2E8F0')]; c.strokeWeight = 1; c.cornerRadius = 12;
  c.layoutSizingHorizontal = w === 'fill' ? 'FILL' : 'FIXED';
  if (w !== 'fill') c.resize(w, 100);
  parent.appendChild(c);
  return c;
}
function override(inst, oldText, newText) {
  const t = inst.findChild(n => n.type === 'TEXT' && n.characters === oldText);
  if (t && 'characters' in t) t.characters = newText;
}
function growH() { const sp = figma.createAutoLayout({}); sp.fills = []; sp.layoutSizingHorizontal = 'FILL'; sp.resize(1, 8); return sp; }
function field(parent, label, placeholder, w) {
  const col = figma.createAutoLayout('VERTICAL', { itemSpacing: 6 });
  col.appendChild(T(label, 'bsm', '#475569'));
  const inp = getComp('Input/Text');
  const i = inp.createInstance();
  i.resize(w, 36);
  const ph = i.findChild(n => n.type === 'TEXT' && n.characters === 'Placeholder');
  if (ph && 'characters' in ph) ph.characters = placeholder;
  col.appendChild(i);
  parent.appendChild(col);
  return col;
}

// ============ Screen 1: Login ============
{
  const fr = newScreen('Screen/Login');
  const wrap = figma.createAutoLayout('HORIZONTAL', { primaryAxisAlignItems: 'CENTER', counterAxisAlignItems: 'CENTER' });
  wrap.resize(1440, 900); wrap.layoutSizingHorizontal = 'FIXED'; wrap.layoutSizingVertical = 'FIXED'; wrap.fills = [];
  fr.appendChild(wrap);
  const cardL = card(wrap, 400);
  cardL.layoutSizingVertical = 'HUG';
  const logoRow = figma.createAutoLayout('HORIZONTAL', { itemSpacing: 10 });
  const mark = getComp('LogoMark');
  if (mark) logoRow.appendChild(mark.createInstance());
  logoRow.appendChild(T('FMS — Flag Management', 'h2', '#0F172A'));
  cardL.appendChild(logoRow);
  cardL.appendChild(T('Sign in', 'h1', '#0F172A'));
  cardL.appendChild(T('Use your FMS account for this instance.', 'body', '#64748B'));
  field(cardL, 'Email', 'admin@acme.com', 360);
  field(cardL, 'Password', '••••••••••••', 360);
  const err = figma.createAutoLayout('HORIZONTAL', { itemSpacing: 8, paddingLeft: 12, paddingRight: 12, paddingTop: 10, paddingBottom: 10 });
  err.fills = [F('#FEE2E2')]; err.cornerRadius = 8;
  const warn = getComp('Icon/Warning');
  if (warn) err.appendChild(warn.createInstance());
  err.appendChild(T('Invalid credentials. Check your email and password.', 'bsm', '#B91C1C'));
  cardL.appendChild(err);
  const signin = getComp('Button/Primary').createInstance();
  override(signin, 'Button', 'Sign in');
  signin.layoutSizingHorizontal = 'FILL';
  cardL.appendChild(signin);
  cardL.appendChild(T('Self-hosted instance · v1.0', 'cap', '#94A3B8'));
  cardL.appendChild(T('No self-signup — accounts are created by admin invite (FR-57).', 'cap', '#94A3B8'));
}

// ============ Screen 2: Projects (card grid) ============
const PROJECTS = [
  ['Checkout Web', 'checkout-web', ['dev','staging','prod'], '24', ['ok','warn','ok'], '12:41 · alex@acme.com'],
  ['Mobile App API', 'mobile-api', ['dev','staging','prod'], '17', ['ok','ok','ok'], '11:58 · maya@acme.com'],
  ['Marketing Site', 'marketing-site', ['dev','staging','prod'], '9', ['ok','ok','ok'], '10:12 · dana@acme.com'],
  ['Data Pipeline', 'data-pipeline', ['dev','staging','prod'], '5', ['ok','err','ok'], '09:47 · admin@acme.com'],
  ['Search Service', 'search-service', ['dev','staging','prod'], '12', ['ok','ok','warn'], '09:30 · alex@acme.com'],
  ['Docs Portal', 'docs-portal', ['dev','staging','prod'], '3', ['ok','ok','ok'], 'Yesterday · dana@acme.com'],
];
function projectCard(idx) {
  const [name, key, envs, flags, sync, last] = PROJECTS[idx];
  const c = figma.createAutoLayout('VERTICAL', { itemSpacing: 12, paddingLeft: 20, paddingRight: 20, paddingTop: 18, paddingBottom: 18 });
  c.fills = [F('#FFFFFF')]; c.strokes = [F('#E2E8F0')]; c.strokeWeight = 1; c.cornerRadius = 12;
  c.layoutSizingHorizontal = 'FILL';
  const nr = figma.createAutoLayout('HORIZONTAL', { itemSpacing: 8, counterAxisAlignItems: 'CENTER' });
  nr.layoutSizingHorizontal = 'FILL';
  nr.appendChild(T(name, 'h3', '#0F172A'));
  const cp = getComp('Icon/Copy');
  if (cp) nr.appendChild(cp.createInstance());
  nr.appendChild(T(key, 'mono', '#94A3B8'));
  c.appendChild(nr);
  const er = figma.createAutoLayout('HORIZONTAL', { itemSpacing: 6 });
  for (const e of envs) er.appendChild(getComp('EnvChip/' + e).createInstance());
  c.appendChild(er);
  const div = figma.createAutoLayout({}); div.fills = [F('#EEF2F6')]; div.layoutSizingHorizontal = 'FILL'; div.resize(10, 1);
  c.appendChild(div);
  const fo = figma.createAutoLayout('HORIZONTAL', { itemSpacing: 8, counterAxisAlignItems: 'CENTER' });
  fo.layoutSizingHorizontal = 'FILL';
  fo.appendChild(T(flags + ' flags', 'bsm', '#475569'));
  fo.appendChild(growH());
  for (const s of sync) { const d = figma.createEllipse(); d.resize(8, 8); d.fills = [F(s === 'err' ? '#EF4444' : s === 'warn' ? '#D97706' : '#10B981')]; d.strokes = []; fo.appendChild(d); }
  fo.appendChild(T(last, 'cap', '#94A3B8'));
  c.appendChild(fo);
  return c;
}
{
  const fr = newScreen('Screen/Projects');
  const content = withShell(fr, 'Projects');
  const head = figma.createAutoLayout('HORIZONTAL', { primaryAxisAlignItems: 'CENTER', itemSpacing: 16 });
  head.layoutSizingHorizontal = 'FILL';
  head.appendChild(T('Projects', 'h1', '#0F172A'));
  head.appendChild(T('6 projects', 'cap', '#94A3B8'));
  const grow = figma.createAutoLayout({ itemSpacing: 8 }); grow.fills = []; grow.layoutSizingHorizontal = 'FILL';
  const np = getComp('Button/Primary').createInstance();
  override(np, 'Button', 'New project');
  grow.appendChild(np);
  head.appendChild(grow);
  content.appendChild(head);
  const tb = figma.createAutoLayout('HORIZONTAL', { itemSpacing: 12, primaryAxisAlignItems: 'CENTER' });
  tb.layoutSizingHorizontal = 'FILL';
  tb.appendChild(getComp('SearchBox').createInstance());
  content.appendChild(tb);
  const grid = figma.createAutoLayout('VERTICAL', { itemSpacing: 16 });
  grid.layoutSizingHorizontal = 'FILL';
  for (let r = 0; r < 2; r++) {
    const row = figma.createAutoLayout('HORIZONTAL', { itemSpacing: 16 });
    row.layoutSizingHorizontal = 'FILL';
    for (let c = 0; c < 3; c++) row.appendChild(projectCard(r * 3 + c));
    grid.appendChild(row);
  }
  content.appendChild(grid);
}

// ============ Screen 3: Flags ============
{
  const fr = newScreen('Screen/Flags');
  const content = withShell(fr, 'Projects / Checkout Web');
  const head = figma.createAutoLayout('HORIZONTAL', { primaryAxisAlignItems: 'CENTER', itemSpacing: 16 });
  head.layoutSizingHorizontal = 'FILL';
  head.appendChild(T('Checkout Web', 'h1', '#0F172A'));
  head.appendChild(T('checkout-web', 'mono', '#94A3B8'));
  const grow = figma.createAutoLayout({ itemSpacing: 8 }); grow.fills = []; grow.layoutSizingHorizontal = 'FILL';
  grow.appendChild(getComp('Badge/Live').createInstance());
  const nf = getComp('Button/Primary').createInstance();
  override(nf, 'Button', 'New flag');
  grow.appendChild(nf);
  head.appendChild(grow);
  content.appendChild(head);
  const envRow = figma.createAutoLayout('HORIZONTAL', { itemSpacing: 16 });
  envRow.layoutSizingHorizontal = 'FILL';
  const envCards = [
    ['dev', '12', '24', 'Badge/Synced', 'flagd observed v12 = stored v12', '#047857'],
    ['staging', '9', '24', 'Badge/Stale', 'stale v8 ≠ v9 · flagd last observed 12:02', '#B45309'],
    ['prod', '11', '24', 'Badge/Synced', 'flagd observed v9 = stored v9', '#047857'],
  ];
  for (const [env, enabled, total, badge, detail, detailColor] of envCards) {
    const c = figma.createAutoLayout('VERTICAL', { itemSpacing: 8, paddingLeft: 20, paddingRight: 20, paddingTop: 16, paddingBottom: 16 });
    c.fills = [F('#FFFFFF')]; c.strokes = [F('#E2E8F0')]; c.strokeWeight = 1; c.cornerRadius = 12; c.layoutSizingHorizontal = 'FILL';
    const hr = figma.createAutoLayout('HORIZONTAL', { itemSpacing: 8, counterAxisAlignItems: 'CENTER' });
    hr.layoutSizingHorizontal = 'FILL';
    hr.appendChild(getComp('EnvChip/' + env).createInstance());
    const sp = figma.createAutoLayout({}); sp.fills = []; sp.layoutSizingHorizontal = 'FILL'; sp.resize(1, 8);
    hr.appendChild(sp);
    hr.appendChild(getComp(badge).createInstance());
    c.appendChild(hr);
    c.appendChild(T(enabled + ' of ' + total + ' enabled', 'bsm', '#475569'));
    c.appendChild(T(detail, 'cap', detailColor));
    envRow.appendChild(c);
  }
  content.appendChild(envRow);
  const tb = figma.createAutoLayout('HORIZONTAL', { itemSpacing: 12, primaryAxisAlignItems: 'CENTER' });
  tb.layoutSizingHorizontal = 'FILL';
  tb.appendChild(getComp('SearchBox').createInstance());
  const seg = figma.createAutoLayout('HORIZONTAL', { itemSpacing: 0 });
  seg.fills = [F('#FFFFFF')]; seg.strokes = [F('#CBD5E1')]; seg.strokeWeight = 1; seg.cornerRadius = 8;
  const segItems = [['All', true], ['Enabled in dev', false], ['Enabled in staging', false], ['Enabled in prod', false]];
  for (const [lbl, active] of segItems) {
    const s = figma.createAutoLayout('HORIZONTAL', { paddingLeft: 12, paddingRight: 12, paddingTop: 7, paddingBottom: 7 });
    s.fills = [F(active ? '#EEF2FF' : 'transparent')];
    s.appendChild(T(lbl, 'bsm', active ? '#4338CA' : '#475569'));
    seg.appendChild(s);
  }
  tb.appendChild(seg);
  content.appendChild(tb);
  const tblCard = card(content, 'fill');
  const flagCols = [['Flag key', 0.2], ['Description', 0.27], ['Dev', 0.09], ['Staging', 0.09], ['Prod', 0.09], ['Updated', 0.14], ['Actions', 0.12]];
  const ROWW = 1056;
  function frow(cells, isHead) {
    const row = figma.createAutoLayout('HORIZONTAL', { itemSpacing: 8, paddingTop: 12, paddingBottom: 12 });
    row.layoutSizingHorizontal = 'FILL';
    row.fills = [F(isHead ? '#F1F5F9' : 'transparent')];
    for (const [label, wfrac] of flagCols) {
      const cell = figma.createAutoLayout('HORIZONTAL', { itemSpacing: 8, counterAxisAlignItems: 'CENTER' });
      cell.layoutSizingHorizontal = 'FIXED';
      cell.resize(Math.round(ROWW * wfrac), 32);
      for (const t of cells(label, 0)) cell.appendChild(t);
      row.appendChild(cell);
    }
    return row;
  }
  tblCard.appendChild(frow((label) => [T(label, 'ovl', '#94A3B8')], true));
  const flagsData = [
    ['express-checkout', 'One-tap payment with saved card details', [[true,12],[true,9],[true,9]], -1, '12:38 · maya@acme.com'],
    ['new-payment-flow', 'Refactored payment step with 3DS challenge', [[true,14],[true,7],[false,5]], 1, '12:41 · alex@acme.com'],
    ['fraud-check-v2', 'Secondary fraud scoring at order creation', [[true,8],[false,8],[false,6]], -1, '12:02 · alex@acme.com'],
    ['wallet-paypal', 'PayPal wallet on checkout summary', [[false,3],[false,2],[false,1]], -1, '11:52 · dana@acme.com'],
    ['loyalty-points', 'Loyalty points accrual on completed orders', [[true,5],[true,4],[true,2]], -1, '09:15 · alex@acme.com'],
  ];
  for (const [key, desc, envs, staleIdx, upd] of flagsData) {
    const row = frow((label, i) => {
      if (label === 'Flag key') { const c = [T(key, 'mono', '#0F172A')]; const cp = getComp('Icon/Copy'); if (cp) c.push(cp.createInstance()); return c; }
      if (label === 'Description') return [T(desc, 'body', '#475569', Math.round(ROWW * 0.27 - 16))];
      if (label === 'Dev' || label === 'Staging' || label === 'Prod') {
        const idx = label === 'Dev' ? 0 : label === 'Staging' ? 1 : 2;
        const [on, v] = envs[idx];
        const col = figma.createAutoLayout('VERTICAL', { itemSpacing: 4 });
        col.layoutSizingHorizontal = 'FILL';
        const pillInst = getComp('Pill/' + (on ? 'ON' : 'OFF')).createInstance();
        if (idx === staleIdx) {
          const ring = figma.createAutoLayout('HORIZONTAL', { itemSpacing: 0 });
          ring.fills = []; ring.strokes = [F('#D97706')]; ring.strokeWeight = 1.5; ring.cornerRadius = 999;
          ring.appendChild(pillInst);
          col.appendChild(ring);
        } else {
          col.appendChild(pillInst);
        }
        col.appendChild(T('v' + v, 'monosm', on ? '#475569' : '#94A3B8'));
        return [col];
      }
      if (label === 'Updated') return [T(upd, 'cap', '#64748B')];
      const ch = getComp('Icon/ChevronRight');
      return ch ? [ch.createInstance()] : [];
    }, false);
    tblCard.appendChild(row);
  }
}

// ============ Create-flag drawer overlay ============
{
  const scrim = figma.createRectangle();
  scrim.x = 232; scrim.y = 0; scrim.resize(1208, 900);
  scrim.fills = [F('#0F172A')]; scrim.fills = [{ type: 'SOLID', color: C('#0F172A'), opacity: 0.18 }]; scrim.strokes = [];
  // note: fills re-assigned for clarity
  scrim.fills = [{ type: 'SOLID', color: C('#0F172A'), opacity: 0.18 }];
  scrim.strokes = [];
  // re-assign via property name to be safe
  scrim.fills = [{ type: 'SOLID', color: C('#0F172A'), opacity: 0.18 }];
  const drawer = figma.createAutoLayout('VERTICAL', { itemSpacing: 16, paddingLeft: 28, paddingRight: 28, paddingTop: 24, paddingBottom: 24 });
  drawer.resize(416, 900);
  drawer.fills = [F('#FFFFFF')]; drawer.strokes = [F('#E2E8F0')]; drawer.strokeWeight = 1;
  drawer.primaryAxisSizingMode = 'FIXED'; drawer.counterAxisSizingMode = 'FIXED';
  drawer.x = 1024; drawer.y = 0;
  // header
  const dh = figma.createAutoLayout('HORIZONTAL', { itemSpacing: 12, counterAxisAlignItems: 'CENTER' });
  dh.layoutSizingHorizontal = 'FILL';
  dh.appendChild(T('Create flag', 'h2', '#0F172A'));
  dh.appendChild(growH());
  const xic = getComp('Icon/X');
  if (xic) dh.appendChild(xic.createInstance());
  drawer.appendChild(dh);
  drawer.appendChild(T('Name', 'bsm', '#475569'));
  const ni = getComp('Input/Text').createInstance();
  ni.layoutSizingHorizontal = 'FILL';
  const ph2 = ni.findChild(n => n.type === 'TEXT' && n.characters === 'Placeholder');
  if (ph2 && 'characters' in ph2) ph2.characters = 'New payment flow';
  drawer.appendChild(ni);
  drawer.appendChild(T('Key', 'bsm', '#475569'));
  const kb = figma.createAutoLayout('HORIZONTAL', { paddingLeft: 12, paddingRight: 12, paddingTop: 8, paddingBottom: 8 });
  kb.fills = [F('#F1F5F9')]; kb.cornerRadius = 8;
  kb.layoutSizingHorizontal = 'FILL';
  kb.appendChild(T('new-payment-flow', 'mono', '#0F172A'));
  drawer.appendChild(kb);
  drawer.appendChild(T('Auto-generated from name (kebab-case) — editable, unique per project (409 on clash).', 'cap', '#94A3B8', 360));
  const gr = figma.createAutoLayout({}); gr.fills = []; gr.layoutSizingVertical = 'FILL'; gr.resize(1, 10); drawer.appendChild(gr);
  drawer.appendChild(T('Description', 'bsm', '#475569'));
  const di = getComp('Input/Text').createInstance();
  di.layoutSizingHorizontal = 'FILL';
  const ph3 = di.findChild(n => n.type === 'TEXT' && n.characters === 'Placeholder');
  if (ph3 && 'characters' in ph3) ph3.characters = 'Refactored payment step with 3DS challenge';
  drawer.appendChild(di);
  const foot = figma.createAutoLayout('HORIZONTAL', { itemSpacing: 8 });
  foot.layoutSizingHorizontal = 'FILL';
  const sp = figma.createAutoLayout({}); sp.fills = []; sp.layoutSizingHorizontal = 'FILL'; sp.resize(1, 8);
  foot.appendChild(sp);
  const cancel = getComp('Button/Ghost').createInstance();
  override(cancel, 'Button', 'Cancel');
  foot.appendChild(cancel);
  const create = getComp('Button/Primary').createInstance();
  override(create, 'Button', 'Create flag');
  foot.appendChild(create);
  drawer.appendChild(foot);
  content.appendChild(drawer);
  fr.appendChild(scrim);
}

return out;
