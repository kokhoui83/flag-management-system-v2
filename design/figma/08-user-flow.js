// design/figma/07-user-flow.js — role-based user-flow diagram on page 02 · User Flow
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
const page = figma.root.children.find(p => p.name === '02 · User Flow');
await figma.setCurrentPageAsync(page);
const out = {};
let fr = page.children.find(n => n.name === 'User Flow');
if (fr) fr.remove();
fr = figma.createFrame(); fr.name = 'User Flow'; fr.resize(1760, 1180); fr.fills = [F('#FFFFFF')];
fr.x = 0; fr.y = 0;
page.appendChild(fr);
out.frame = fr.id;

function box(x, y, w, h, title, sub, { bg = '#FFFFFF', border = '#CBD5E1', titleColor = '#0F172A', subColor = '#64748B' } = {}) {
  const b = figma.createAutoLayout('VERTICAL', { itemSpacing: 4, paddingLeft: 14, paddingRight: 14, paddingTop: 10, paddingBottom: 10, primaryAxisAlignItems: 'CENTER', counterAxisAlignItems: 'CENTER' });
  b.fills = [F(bg)]; b.strokes = [F(border)]; b.strokeWeight = 1.5; b.cornerRadius = 10;
  b.x = x; b.y = y; b.resize(w, h);
  b.primaryAxisSizingMode = 'FIXED'; b.counterAxisSizingMode = 'FIXED';
  b.appendChild(T(title, 'h3', titleColor));
  if (sub) b.appendChild(T(sub, 'cap', subColor, w - 28));
  fr.appendChild(b);
  return b;
}
function arrowR(x1, y, x2, color) {
  const line = figma.createLine();
  line.x = x1; line.y = y;
  line.points = [{ x: 0, y: 0 }, { x: x2 - x1 - 10, y: 0 }];
  line.strokes = [F(color)]; line.strokeWeight = 1.5; line.fills = [];
  fr.appendChild(line);
  const head = figma.createVector();
  head.vectorPaths = [{ windingRule: 'NONZERO', data: 'M0 0 L9 4.5 L0 9 Z' }];
  head.fills = [F(color)]; head.strokes = [];
  head.x = x2 - 9; head.y = y - 4.5;
  fr.appendChild(head);
}
function arrowD(x, y1, y2, color) {
  const line = figma.createLine();
  line.x = x; line.y = y1;
  line.points = [{ x: 0, y: 0 }, { x: 0, y: y2 - y1 - 10 }];
  line.strokes = [F(color)]; line.strokeWeight = 1.5; line.fills = [];
  fr.appendChild(line);
  const head = figma.createVector();
  head.vectorPaths = [{ windingRule: 'NONZERO', data: 'M0 0 L9 4.5 L0 9 Z' }];
  head.fills = [F(color)]; head.strokes = [];
  head.rotation = 90;
  head.x = x - 4.5; head.y = y2 - 9;
  fr.appendChild(head);
}

// title + legend
{
  const t = T('FMS — User flows', 'h1', '#0F172A'); t.x = 48; t.y = 36; fr.appendChild(t);
  const sub = T('Login → project → flag → environment. Role gates follow the FR-54 capability matrix; every mutation is auditable.', 'body', '#64748B', 760);
  sub.x = 48; sub.y = 72; fr.appendChild(sub);
  const legend = figma.createAutoLayout('HORIZONTAL', { itemSpacing: 16 });
  legend.x = 1120; legend.y = 44;
  for (const [label, color] of [['main loop', '#475569'], ['admin', '#4F46E5'], ['developer', '#2563EB'], ['product owner', '#7C3AED'], ['on-call', '#EF4444']]) {
    const item = figma.createAutoLayout('HORIZONTAL', { itemSpacing: 6, counterAxisAlignItems: 'CENTER' });
    const d = figma.createEllipse(); d.resize(8, 8); d.fills = [F(color)]; d.strokes = [];
    item.appendChild(d);
    item.appendChild(T(label, 'cap', '#475569'));
    legend.appendChild(item);
  }
  fr.appendChild(legend);
}

// main loop row
fr.appendChild(Object.assign(T('MAIN LOOP — all roles', 'ovl', '#94A3B8'), { x: 48, y: 116 }));
const mainY = 140, mainH = 88;
const main = [
  [48, 168, 'Login', '#/login · FR-40'],
  [244, 168, 'Role gate', 'FR-54 · union of global + project roles'],
  [440, 160, 'Projects', '#/projects · FR-53/55'],
  [628, 160, 'Flags list', 'FR-41 · per-env status'],
  [816, 160, 'Flag editor', 'FR-42 · defn per env'],
  [1004, 176, 'Save + validate', 'FR-14 all-at-once'],
  [1208, 176, 'Sync health', 'FR-47 · stale → synced'],
  [1412, 184, 'Verify', 'Playground / Audit'],
];
let prevX = 0;
for (const [x, w, title, sub] of main) {
  const isGate = title === 'Role gate';
  box(x, mainY, w, mainH, title, sub, isGate ? { bg: '#EEF2FF', border: '#4F46E5', titleColor: '#4338CA' } : {});
  if (prevX) arrowR(prevX, mainY + mainH / 2, x, '#94A3B8');
  prevX = x + w;
}
// loop-back note
{
  const note = T('next change loops back to the flags list (live SSE update, FR-52)', 'cap', '#94A3B8');
  note.x = 1180; note.y = 236; fr.appendChild(note);
}

// role branches under the gate
arrowD(328, mainY + mainH, 300, '#94A3B8');
const rolesY = 320;
const roles = [
  [104, 240, 'Admin', '#4F46E5', '#EEF2FF', ['full nav + admin section', 'projects, keys, audit, members', 'all definition edits']],
  [384, 240, 'Developer', '#2563EB', '#DBEAFE', ['create envs + flags (assigned)', 'edit definitions + toggle', 'no admin nav · 403 guard']],
  [664, 240, 'Product owner', '#7C3AED', '#F3E8FF', ['view flags + definitions', 'enabled toggle only (FR-59)', 'no admin nav · 403 guard']],
];
for (const [x, w, title, color, bg, lines] of roles) {
  const b = box(x, rolesY, w, 128, title, '', { bg, border: color, titleColor: color });
  lines.forEach((l, i) => {
    const lt = T('· ' + l, 'cap', '#475569', w - 28);
    lt.x = x + 14; lt.y = rolesY + 44 + i * 20;
    fr.appendChild(lt);
  });
}

// task flows
{
  const t = T('TASK FLOWS', 'ovl', '#94A3B8'); t.x = 48; t.y = 496; fr.appendChild(t);
}
const flowY = 520, flowH = 560, flowW = 308, gap = 16;
const flows = [
  ['Promotion', '#4F46E5', 'FR-43 / FR-9 — copy definition across envs', [
    'dev definition ready + verified',
    'Copy from… dev → staging (confirm: full replacement)',
    'verify staging (playground / observed)',
    'Copy from… staging → prod',
    'each copy = its own audited change',
  ]],
  ['Kill switch', '#EF4444', 'on-call — disable a prod flag fast', [
    'incident: open flag → prod tab',
    'Enabled toggle → off',
    'Save (PO may do this, FR-59)',
    'confirm sync: stale → synced',
    'audit row proves who / when',
  ]],
  ['Test as user', '#2563EB', 'FR-44 — evaluate before rollout', [
    'from flags list or editor → Playground',
    'pick project + flag + env',
    'set targeting key + context JSON',
    'Evaluate → value / variant / reason',
    'iterate rules until stable',
  ]],
  ['Invite', '#4F46E5', 'FR-57 — scoped user onboarding (admin)', [
    'Members → Invite user',
    'email + global role + per-project roles',
    'temp password shown once · status Pending',
    'user signs in · status Active (scoped session)',
    're-invite updates roles + reissues pw',
  ]],
  ['API keys', '#4F46E5', 'FR-45 — machine access (admin)', [
    'API keys → Create key',
    'name + scopes (sync / evaluate)',
    'plaintext shown once (hashed)',
    'flagd sync / SDK evaluate use it',
    'revoke on rotation',
  ]],
];
flows.forEach(([title, color, sub, steps], fi) => {
  const x = 48 + fi * (flowW + gap);
  const head = box(x, flowY, flowW, 64, title, '', { bg: '#F8FAFC', border: color, titleColor: color });
  const st = T(sub, 'cap', '#64748B', flowW - 24);
  st.x = x; st.y = flowY + 76; fr.appendChild(st);
  steps.forEach((s, si) => {
    const y = flowY + 108 + si * 88;
    const row = figma.createAutoLayout('VERTICAL', { itemSpacing: 4, paddingLeft: 14, paddingRight: 12, paddingTop: 10, paddingBottom: 10 });
    row.fills = [F('#FFFFFF')]; row.strokes = [F('#E2E8F0')]; row.strokeWeight = 1; row.cornerRadius = 8;
    row.x = x; row.y = y; row.resize(flowW, 72);
    row.primaryAxisSizingMode = 'FIXED'; row.counterAxisSizingMode = 'FIXED';
    const num = figma.createAutoLayout('HORIZONTAL', { itemSpacing: 8, counterAxisAlignItems: 'CENTER' });
    const d = figma.createEllipse(); d.resize(18, 18); d.fills = [F('#EEF2FF')]; d.strokes = [];
    num.appendChild(d);
    const nt = T(String(si + 1), 'caps', '#4338CA');
    d.appendChild(nt);
    row.appendChild(num);
    row.appendChild(T(s, 'cap', '#475569', flowW - 48));
    fr.appendChild(row);
    if (si < steps.length - 1) arrowD(x + flowW / 2, y + 72, y + 88, '#CBD5E1');
  });
});
return out;
