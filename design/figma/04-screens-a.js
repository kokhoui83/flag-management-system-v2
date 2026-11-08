// design/figma/04-screens-a.js — Login, Projects, Flags frames on page 01 · Screens
// Fill SHELL_ID from the 'AppShell:<id>' entry of 03-shell.js output.
const SHELL_ID = '__APP_SHELL_ID__';
const C = (hex) => { const h = hex.replace('#',''); return { r: parseInt(h.slice(0,2),16)/255, g: parseInt(h.slice(2,4),16)/255, b: parseInt(h.slice(4,6),16)/255 }; };
const F = (hex) => ({ type: 'SOLID', color: C(hex) });
const FONTS = {
  h1: { family: 'Inter', style: 'Semi Bold', size: 20, lh: 28 },
  h2: { family: 'Inter', style: 'Semi Bold', size: 16, lh: 24 },
  h3: { family: 'Inter', style: 'Semi Bold', size: 14, lh: 20 },
  med: { family: 'Inter', style: 'Medium', size: 14, lh: 20 },
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
  const shell = getComp('AppShell');
  const inst = shell.createInstance();
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
function field(parent, label, placeholder, w) {
  const col = figma.createAutoLayout('VERTICAL', { itemSpacing: 6 });
  col.appendChild(T(label, 'bsm', '#475467'));
  const inp = getComp('Input/Text');
  const i = inp.createInstance();
  i.resize(w, 36);
  const ph = i.findChild(n => n.type === 'TEXT' && n.characters === 'Placeholder');
  if (ph && 'characters' in ph) ph.characters = placeholder;
  col.appendChild(i);
  parent.appendChild(col);
  return col;
}
function dot(parent, color, filled) {
  const d = figma.createEllipse(); d.resize(8, 8);
  d.fills = [F(filled ? color : 'transparent')];
  d.strokes = [F(filled ? 'transparent' : color)]; d.strokeWeight = 1.5;
  parent.appendChild(d);
  return d;
}
function envCell(parent, on, color, version) {
  const col = figma.createAutoLayout('VERTICAL', { itemSpacing: 4 });
  col.appendChild(dot(col, color, on));
  col.appendChild(T(version, 'monosm', on ? '#475467' : '#98A2B3'));
  parent.appendChild(col);
}

// ============ Screen 1: Login ============
{
  const fr = newScreen('Screen/Login');
  const wrap = figma.createAutoLayout('HORIZONTAL', { primaryAxisAlignItems: 'CENTER', counterAxisAlignItems: 'CENTER' });
  wrap.resize(1440, 900); wrap.layoutSizingHorizontal = 'FIXED'; wrap.layoutSizingVertical = 'FIXED';
  wrap.primaryAxisSizingMode = 'FIXED'; wrap.counterAxisSizingMode = 'FIXED';
  wrap.fills = [];
  fr.appendChild(wrap);
  const cardL = card(wrap, 400);
  cardL.layoutSizingVertical = 'HUG';
  const logoRow = figma.createAutoLayout('HORIZONTAL', { itemSpacing: 10 });
  const mark = getComp('LogoMark');
  if (mark) logoRow.appendChild(mark.createInstance());
  logoRow.appendChild(T('FMS — Flag Management', 'h2', '#101828'));
  cardL.appendChild(logoRow);
  cardL.appendChild(T('Sign in', 'h1', '#101828'));
  cardL.appendChild(T('Use your FMS account for this instance.', 'body', '#667085'));
  field(cardL, 'Email', 'admin@acme.com', 360);
  field(cardL, 'Password', '••••••••••••', 360);
  const err = figma.createAutoLayout('HORIZONTAL', { itemSpacing: 8, paddingLeft: 12, paddingRight: 12, paddingTop: 10, paddingBottom: 10 });
  err.fills = [F('#FEF2F2')]; err.cornerRadius = 8;
  const warn = getComp('Icon/Warning');
  if (warn) err.appendChild(warn.createInstance());
  err.appendChild(T('Invalid credentials. Check your email and password.', 'bsm', '#B42318'));
  cardL.appendChild(err);
  const signin = getComp('Button/Primary');
  const sb = signin.createInstance();
  const bt = sb.findChild(n => n.type === 'TEXT');
  if (bt && 'characters' in bt) bt.characters = 'Sign in';
  sb.layoutSizingHorizontal = 'FILL';
  cardL.appendChild(sb);
  cardL.appendChild(T('Self-hosted instance · v1.0', 'cap', '#98A2B3'));
}

// ============ Screen 2: Projects ============
{
  const fr = newScreen('Screen/Projects');
  const content = withShell(fr, 'Projects');
  const head = figma.createAutoLayout('HORIZONTAL', { primaryAxisAlignItems: 'CENTER', itemSpacing: 16 });
  head.layoutSizingHorizontal = 'FILL';
  head.appendChild(T('Projects', 'h1', '#101828'));
  const grow = figma.createAutoLayout({ itemSpacing: 8 }); grow.fills = []; grow.layoutSizingHorizontal = 'FILL';
  const np = getComp('Button/Primary').createInstance();
  const npt = np.findChild(n => n.type === 'TEXT');
  if (npt && 'characters' in npt) npt.characters = 'New project';
  grow.appendChild(np);
  head.appendChild(grow);
  content.appendChild(head);
  const tbl = card(content, 'fill');
  // header
  const cols = [['Project', 0.34], ['Environments', 0.26], ['Flags', 0.1], ['Sync', 0.18], ['Last change', 0.12]];
  function tableRow(cells, isHead) {
    const row = figma.createAutoLayout('HORIZONTAL', { itemSpacing: 12, paddingTop: 12, paddingBottom: 12 });
    row.layoutSizingHorizontal = 'FILL';
    row.fills = [F(isHead ? '#F2F4F7' : 'transparent')];
    row.cornerRadius = 6;
    const rowW = 1128;
    for (const [label, wfrac] of cols) {
      const cell = figma.createAutoLayout('HORIZONTAL', { itemSpacing: 8, counterAxisAlignItems: 'CENTER' });
      cell.layoutSizingHorizontal = 'FIXED';
      cell.resize(Math.round(rowW * wfrac), 24);
      const txt = cells(label);
      for (const t of txt) cell.appendChild(t);
      row.appendChild(cell);
    }
    return row;
  }
  tbl.appendChild(tableRow((label) => [T(label, 'ovl', '#98A2B3')], true));
  const projects = [
    ['Checkout Web', 'checkout-web', ['dev','staging','prod'], '24', ['ok','warn','ok'], '12:41 · alex@acme.com'],
    ['Mobile App API', 'mobile-api', ['dev','staging','prod'], '17', ['ok','ok','ok'], '11:58 · maya@acme.com'],
    ['Marketing Site', 'marketing-site', ['dev','staging','prod','qa'], '9', ['ok','ok','ok','ok'], '10:12 · dana@acme.com'],
    ['Data Pipeline', 'data-pipeline', ['dev','staging','prod'], '5', ['ok','err','ok'], '09:47 · admin@acme.com'],
  ];
  const envColor = { dev: '#2E6BFF', staging: '#F79009', prod: '#F04438', qa: '#6941C6' };
  const syncColor = { ok: '#12B76A', warn: '#F79009', err: '#F04438' };
  for (const [name, key, envs, flags, sync, last] of projects) {
    const row = tableRow((label) => {
      if (label === 'Project') return [T(name, 'h3', '#101828'), T(key, 'mono', '#98A2B3')];
      if (label === 'Environments') { const c = []; for (const e of envs) { const chip = getComp('EnvChip/' + e).createInstance(); c.push(chip); } return c; }
      if (label === 'Flags') return [T(flags, 'body', '#475467')];
      if (label === 'Sync') { const c = []; for (const s of sync) c.push(dot(c, syncColor[s], true)); return c; }
      return [T(last, 'cap', '#667085')];
    }, false);
    tbl.appendChild(row);
  }
}

// ============ Screen 3: Flags ============
{
  const fr = newScreen('Screen/Flags');
  const content = withShell(fr, 'Projects / Checkout Web');
  const head = figma.createAutoLayout('HORIZONTAL', { primaryAxisAlignItems: 'CENTER', itemSpacing: 16 });
  head.layoutSizingHorizontal = 'FILL';
  head.appendChild(T('Checkout Web', 'h1', '#101828'));
  head.appendChild(T('checkout-web', 'mono', '#98A2B3'));
  const grow = figma.createAutoLayout({ itemSpacing: 8 }); grow.fills = []; grow.layoutSizingHorizontal = 'FILL';
  const live = getComp('Badge/Live').createInstance(); grow.appendChild(live);
  const nf = getComp('Button/Primary').createInstance();
  const nft = nf.findChild(n => n.type === 'TEXT');
  if (nft && 'characters' in nft) nft.characters = 'New flag';
  grow.appendChild(nf);
  head.appendChild(grow);
  content.appendChild(head);
  const syncCard = card(content, 'fill');
  const scHead = figma.createAutoLayout('HORIZONTAL', { itemSpacing: 10, primaryAxisAlignItems: 'CENTER' });
  scHead.layoutSizingHorizontal = 'FILL';
  const ref = getComp('Icon/Refresh');
  if (ref) scHead.appendChild(ref.createInstance());
  scHead.appendChild(T('Sync health — flagd observed vs stored version', 'h3', '#101828'));
  syncCard.appendChild(scHead);
  const syncRow = figma.createAutoLayout('HORIZONTAL', { itemSpacing: 12 });
  syncRow.layoutSizingHorizontal = 'FILL';
  const syncs = [
    ['dev', 'Synced', 'flagd v12 = stored v12', 'Badge/Synced', '#027A48'],
    ['staging', 'Stale', 'flagd v8 ≠ stored v9 · since 12:02', 'Badge/Stale', '#B54708'],
    ['prod', 'Synced', 'flagd v9 = stored v9', 'Badge/Synced', '#027A48'],
  ];
  for (const [env, label, detail, badge, fg] of syncs) {
    const cell = figma.createAutoLayout('VERTICAL', { itemSpacing: 4 });
    cell.layoutSizingHorizontal = 'FILL';
    const row1 = figma.createAutoLayout('HORIZONTAL', { itemSpacing: 8 });
    const chip = getComp('EnvChip/' + env).createInstance(); row1.appendChild(chip);
    const b = getComp(badge).createInstance(); row1.appendChild(b);
    cell.appendChild(row1);
    cell.appendChild(T(detail, 'cap', fg));
    syncRow.appendChild(cell);
  }
  syncCard.appendChild(syncRow);
  const toolbar = figma.createAutoLayout('HORIZONTAL', { itemSpacing: 12, primaryAxisAlignItems: 'CENTER' });
  toolbar.layoutSizingHorizontal = 'FILL';
  const sb = getComp('SearchBox').createInstance();
  const spt = sb.findChild(n => n.type === 'TEXT');
  if (spt && 'characters' in spt) spt.characters = 'Search flags…';
  toolbar.appendChild(sb);
  const seg = figma.createAutoLayout('HORIZONTAL', { itemSpacing: 0 });
  seg.fills = [F('#FFFFFF')]; seg.strokes = [F('#D0D5DD')]; seg.strokeWeight = 1; seg.cornerRadius = 8;
  for (const [lbl, active] of [['All', true], ['Enabled in dev', false], ['Enabled in staging', false], ['Enabled in prod', false]]) {
    const s = figma.createAutoLayout('HORIZONTAL', { paddingLeft: 12, paddingRight: 12, paddingTop: 7, paddingBottom: 7 });
    s.fills = [F(active ? '#EEF2FF' : 'transparent')];
    s.appendChild(T(lbl, 'bsm', active ? '#4338CA' : '#475467'));
    seg.appendChild(s);
  }
  toolbar.appendChild(seg);
  content.appendChild(toolbar);
  const tbl = card(content, 'fill');
  const flagCols = [['Flag key', 0.2], ['Description', 0.3], ['Dev', 0.08], ['Staging', 0.08], ['Prod', 0.08], ['Updated', 0.14], ['', 0.12]];
  const rowW = 1128;
  function frow(cells, isHead) {
    const row = figma.createAutoLayout('HORIZONTAL', { itemSpacing: 8, paddingTop: 12, paddingBottom: 12 });
    row.layoutSizingHorizontal = 'FILL';
    row.fills = [F(isHead ? '#F2F4F7' : 'transparent')]; row.cornerRadius = 6;
    flagCols.forEach(([label, wfrac], i) => {
      const cell = figma.createAutoLayout('HORIZONTAL', { itemSpacing: 8, counterAxisAlignItems: 'CENTER' });
      cell.layoutSizingHorizontal = 'FIXED';
      cell.resize(Math.round(rowW * wfrac), 32);
      const txts = cells(label, i);
      for (const t of txts) cell.appendChild(t);
      row.appendChild(cell);
    });
    return row;
  }
  tbl.appendChild(frow((label) => [T(label, 'ovl', '#98A2B3')], true));
  const flags = [
    ['express-checkout', 'One-tap payment with saved card details', [true, 12], [true, 9], [true, 9], '12:38 · maya'],
    ['new-payment-flow', 'Refactored payment step with 3DS challenge', [true, 14], [true, 7], [false, 5], '12:41 · alex'],
    ['fraud-check-v2', 'Secondary fraud scoring at order creation', [true, 8], [false, 8], [false, 6], '12:02 · alex'],
    ['wallet-paypal', 'PayPal wallet on checkout summary', [false, 3], [false, 2], [false, 1], '11:52 · dana'],
    ['loyalty-points', 'Loyalty points accrual on completed orders', [true, 5], [true, 4], [true, 2], '09:15 · alex'],
  ];
  const envCols = [1, 2, 3];
  for (const [key, desc, dev, stg, prod, upd] of flags) {
    const cells = [dev, stg, prod];
    tbl.appendChild(frow((label, i) => {
      if (label === 'Flag key') { const c = [T(key, 'mono', '#101828')]; const cp = getComp('Icon/Copy'); if (cp) c.push(cp.createInstance()); return c; }
      if (label === 'Description') return [Twrap(desc, 'body', '#475467', Math.round(rowW * 0.3) - 16)];
      if (i >= 2 && i <= 4) { const col = figma.createAutoLayout('VERTICAL', { itemSpacing: 2 }); const [on, v] = cells[i - 2]; col.appendChild(dot(col, envColor[flagCols[i][0].toLowerCase()], on)); col.appendChild(T('v' + v, 'monosm', on ? '#475467' : '#98A2B3')); return [col]; }
      if (label === 'Updated') return [T(upd, 'cap', '#667085')];
      const m = getComp('Icon/ChevronRight'); return m ? [m.createInstance()] : [];
    }, false));
  }
}
function Twrap(str, fKey, color, w) { return T(str, fKey, color, w); }
return out;
