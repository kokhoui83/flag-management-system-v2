// design/figma/07-screens-d.js — run after 06-screens-c.js (needs AppShell + atoms)
// Screen 8: Roles & permissions capability matrix.
// Screen 9: Project access (per-project membership / grants).

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
function headRow(parent, title, actionLabel, caption) {
  const head = figma.createAutoLayout('HORIZONTAL', { primaryAxisAlignItems: 'CENTER', itemSpacing: 16 });
  head.layoutSizingHorizontal = 'FILL';
  const left = figma.createAutoLayout('VERTICAL', { itemSpacing: 2 });
  left.appendChild(T(title, 'h1', '#0F172A'));
  if (caption) left.appendChild(T(caption, 'cap', '#64748B'));
  head.appendChild(left);
  const grow = figma.createAutoLayout({ itemSpacing: 8 }); grow.fills = []; grow.layoutSizingHorizontal = 'FILL';
  if (actionLabel) { const b = getComp('Button/Primary').createInstance(); override(b, 'Button', actionLabel); grow.appendChild(b); }
  head.appendChild(grow);
  parent.appendChild(head);
}
function makeTable(parent, cols) {
  const tbl = card(parent, 'fill');
  const rowW = 1056;
  function row(cells, isHead) {
    const r = figma.createAutoLayout('HORIZONTAL', { itemSpacing: 12, paddingTop: 12, paddingBottom: 12 });
    r.layoutSizingHorizontal = 'FILL';
    r.fills = [F(isHead ? '#F1F5F9' : 'transparent')];
    cols.forEach(([label, wfrac]) => {
      const cell = figma.createAutoLayout('HORIZONTAL', { itemSpacing: 8, counterAxisAlignItems: 'CENTER' });
      cell.layoutSizingHorizontal = 'FIXED';
      cell.resize(Math.round(rowW * wfrac), 24);
      for (const t of cells(label, 0)) cell.appendChild(t);
      r.appendChild(cell);
    });
    return r;
  }
  tbl.appendChild(row((label) => [T(label, 'ovl', '#94A3B8')], true));
  return { tbl, row };
}
function checkCell() {
  const c = figma.createAutoLayout('HORIZONTAL', { primaryAxisAlignItems: 'CENTER', counterAxisAlignItems: 'CENTER' });
  c.resize(24, 24);
  c.fills = [F('#D1FAE5')];
  const v = figma.createVector();
  v.vectorPaths = [{ windingRule: 'NONZERO', data: 'M6 12.5 L10 16.5 L17 8.5' }];
  v.strokes = [F('#047857')]; v.strokeWeight = 2; v.fills = [];
  c.appendChild(v);
  return c;
}

// ============ Screen 8: Roles & Permissions ============
{
  const fr = newScreen('Screen/Roles & Permissions');
  const content = withShell(fr, 'Roles & permissions');
  headRow(content, 'Roles & permissions', null, 'Capability matrix for the three global roles — effective permission = global role ∪ per-project grants (FR-54).');
  const matrixCols = [['Capability', 0.4], ['Scope', 0.1], ['Admin', 0.15], ['Developer', 0.17], ['Product owner', 0.18]];
  const tbl = card(content, 'fill');
  const headerRow = figma.createAutoLayout('HORIZONTAL', { itemSpacing: 12, paddingTop: 12, paddingBottom: 12 });
  headerRow.layoutSizingHorizontal = 'FILL';
  headerRow.fills = [F('#F1F5F9')];
  for (const [label, wfrac] of matrixCols) {
    const cell = figma.createAutoLayout('HORIZONTAL', { itemSpacing: 8, counterAxisAlignItems: 'CENTER' });
    cell.layoutSizingHorizontal = 'FIXED';
    cell.resize(Math.round(1056 * wfrac), 24);
    cell.appendChild(T(label, 'ovl', '#94A3B8'));
    headerRow.appendChild(cell);
  }
  tbl.appendChild(headerRow);
  const MATRIX = [
    ['Create projects', 'global', 1, 0, 0],
    ['Invite members / assign projects', 'global', 1, 0, 0],
    ['Manage API keys', 'global', 1, 0, 0],
    ['Read audit', 'global', 1, 0, 0],
    ['Create project environments', 'project', 1, 1, 0],
    ['Create flags, edit description', 'project', 1, 1, 0],
    ['Delete flags', 'project', 1, 0, 0],
    ['Create / edit / copy definitions (variants, rules, default)', 'project', 1, 1, 0],
    ["Toggle a flag's enabled state", 'project', 1, 1, 1],
    ['View flags and definitions', 'project', 1, 1, 1],
    ['Evaluate flags (playground/API)', 'project', 1, 1, 1],
  ];
  for (const [cap, scope, a, d, p] of MATRIX) {
    const row = figma.createAutoLayout('HORIZONTAL', { itemSpacing: 12, paddingTop: 12, paddingBottom: 12 });
    row.layoutSizingHorizontal = 'FILL';
    row.fills = [];
    const capCell = figma.createAutoLayout('HORIZONTAL', { itemSpacing: 8, counterAxisAlignItems: 'CENTER' });
    capCell.layoutSizingHorizontal = 'FIXED';
    capCell.resize(Math.round(1056 * 0.4), 24);
    capCell.appendChild(T(cap, 'bsm', '#0F172A', 406));
    const scopeCell = figma.createAutoLayout('HORIZONTAL', { itemSpacing: 8, counterAxisAlignItems: 'CENTER' });
    scopeCell.layoutSizingHorizontal = 'FIXED';
    scopeCell.resize(Math.round(1056 * 0.1), 24);
    scopeCell.appendChild(T(scope, 'caps', '#64748B'));
    const acell = checkCell();
    if (!a) { acell.remove(); }
    const dcell = checkCell();
    if (!d) { dcell.remove(); }
    const pcell = checkCell();
    if (!p) { pcell.remove(); }
    row.appendChild(capCell);
    row.appendChild(scopeCell);
    row.appendChild(acell);
    row.appendChild(dcell);
    row.appendChild(pcell);
    tbl.appendChild(row);
  }
  const foot = figma.createAutoLayout('VERTICAL', { itemSpacing: 6 });
  foot.appendChild(T('Source: FR-54 / FR-58 / FR-59 — 01-requirements.md §4.9.1. A project membership can elevate (e.g. project admin) but never reduce the global role. Product-owner toggles change enabled only.', 'cap', '#94A3B8', 1056));
  content.appendChild(foot);
}

// ============ Screen 9: Project access ============
{
  const fr = newScreen('Screen/Project Access');
  const content = withShell(fr, 'Projects / Checkout Web / Access');
  headRow(content, 'Project access', 'Add member', 'Per-project grants — independent of the global role (FR-57).');
  const pol = card(content, 'fill');
  pol.itemSpacing = 8;
  const polRow = figma.createAutoLayout('HORIZONTAL', { itemSpacing: 10, counterAxisAlignItems: 'CENTER' });
  polRow.layoutSizingHorizontal = 'FILL';
  const sh = getComp('Icon/Shield');
  if (sh) polRow.appendChild(sh.createInstance());
  polRow.appendChild(T('Restricted by default — only invited members with a role on this project can view or change it. Effective permission = global role ∪ this project’s role: a project role can elevate, never reduce (FR-54). A project admin role grants project-scoped admin for this project only.', 'bsm', '#475569', 1040));
  pol.appendChild(polRow);
  const mem = makeTable(content, [['User', 0.26], ['Status', 0.1], ['Global role', 0.16], ['Role on this project', 0.3], ['', 0.18]]);
  const members = [
    ['admin@acme.com', 'Active', 'admin', 'admin'],
    ['alex@acme.com', 'Active', 'developer', 'developer'],
    ['dana@acme.com', 'Active', 'product-owner', 'product-owner'],
    ['maya@acme.com', 'Active', 'developer', 'no access'],
    ['sam@acme.com', 'Pending', 'product-owner', 'product-owner'],
  ];
  for (const [user, st, gr, r] of members) {
    const r2 = mem.row((label) => {
      if (label === 'User') { const c = []; const av = getComp('Avatar'); if (av) { const a = av.createInstance(); override(a, 'AL', user.slice(0, 2).toUpperCase()); c.push(a); } c.push(T(user, 'bsm', '#0F172A')); return c; }
      if (label === 'Status') { return [getComp(st === 'Active' ? 'Badge/Active' : 'Badge/Pending').createInstance()]; }
      if (label === 'Global role') { const rc = getComp(gr); if (rc) { const inst = rc.createInstance(); return [inst]; } return [T(gr, 'caps', '#475569')]; }
      if (label === 'Role on this project') { const sel = getComp('Input/Select').createInstance(); override(sel, 'Select…', r); sel.resize(160, 36); return [sel]; }
      const b = getComp('Button/Ghost').createInstance();
      override(b, 'Button', 'Remove');
      return [b];
    }, false);
    mem.tbl.appendChild(r2);
  }
}

return out;
