// design/figma/02-atoms.js — run after 01-icons.js (needs icon components)
// Builds button/badge/chip/tag/toggle/input/tab/card/avatar/badge-pill/empty/diff atoms
// into an "Atoms" section on page 00 · Design System.
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
function T(str, fKey, color) {
  const f = FONTS[fKey];
  const t = figma.createText();
  t.fontName = { family: f.family, style: f.style };
  t.fontSize = f.size; t.lineHeight = { value: f.lh, unit: 'PIXELS' };
  t.fills = [F(color || '#101828')];
  t.characters = str;
  return t;
}
const page = figma.currentPage;
const out = { created: [], skipped: [] };
function getIcon(name) { return page.children.find(n => n.name === name && n.type === 'COMPONENT'); }
function existing(name) { return page.children.find(n => n.name === name && (n.type === 'COMPONENT' || n.type === 'COMPONENT_SET')); }
function mk(name) {
  if (existing(name)) { out.skipped.push(name); return null; }
  const c = figma.createComponent(); c.name = name;
  return c;
}
let sec = page.children.find(n => n.name === 'Atoms' && n.type === 'SECTION');
if (!sec) {
  sec = figma.createSection(); sec.name = 'Atoms'; sec.x = 0; sec.y = 640;
  sec.resize(1240, 760); sec.fills = [F('#F6F7F9')]; page.appendChild(sec);
}
function place(c, x, y) { if (!c) return null; c.x = x; c.y = y; sec.appendChild(c); out.created.push(c.name + ':' + c.id); return c; }

// --- LogoMark ---
{
  const c = mk('LogoMark');
  if (c) {
    c.resize(24, 24); c.cornerRadius = 6; c.fills = [F('#4F46E5')];
    const f = figma.createVector();
    f.vectorPaths = [{ windingRule: 'NONZERO', data: 'M8 6.5 L8 18 M9 7.5 L16.5 7.5 L13.8 10.5 L16.5 13.5 L9 13.5 Z' }];
    f.strokes = [F('#FFFFFF')]; f.strokeWeight = 1.8; f.fills = [F('#FFFFFF')];
    c.appendChild(f);
    place(c, 24, 40);
  }
}
// --- Buttons ---
function button(name, bg, text, border, h, px) {
  const c = mk(name);
  if (!c) return;
  c.fills = [F(bg)];
  if (border) { c.strokes = [F(border)]; c.strokeWeight = 1; }
  c.cornerRadius = 8;
  c.layoutMode = 'HORIZONTAL'; c.primaryAxisSizingMode = 'AUTO'; c.counterAxisSizingMode = 'AUTO';
  c.itemSpacing = 8; c.paddingLeft = px; c.paddingRight = px; c.paddingTop = 0; c.paddingBottom = 0;
  c.resize(h ? c.width : c.width, h || 36);
  c.height = h || 36;
  const t = T('Button', 'med', text);
  c.appendChild(t);
  return c;
}
place(button('Button/Primary', '#4F46E5', '#FFFFFF', null, 36, 16), 24, 100);
place(button('Button/Primary-SM', '#4F46E5', '#FFFFFF', null, 30, 12), 160, 100);
place(button('Button/Secondary', '#FFFFFF', '#101828', '#D0D5DD', 36, 16), 320, 100);
place(button('Button/Secondary-SM', '#FFFFFF', '#101828', '#D0D5DD', 30, 12), 466, 100);
place(button('Button/Ghost', 'transparent', '#475467', null, 36, 12), 612, 100);
place(button('Button/Danger', '#F04438', '#FFFFFF', null, 36, 16), 738, 100);

// --- Badges / chips / tags / pills ---
function pill(name, bg, fg, dotHex, label, ovl) {
  const c = mk(name);
  if (!c) return;
  c.fills = [F(bg)]; c.cornerRadius = 999;
  c.layoutMode = 'HORIZONTAL'; c.primaryAxisSizingMode = 'AUTO'; c.counterAxisSizingMode = 'AUTO';
  c.itemSpacing = 6; c.paddingLeft = 8; c.paddingRight = 8; c.paddingTop = 3; c.paddingBottom = 3;
  if (dotHex) {
    const d = figma.createEllipse(); d.resize(6, 6); d.fills = [F(dotHex)]; d.strokes = [];
    c.appendChild(d);
  }
  c.appendChild(T(label, ovl || 'ovl', fg));
  return c;
}
place(pill('Badge/Enabled', '#ECFDF3', '#027A48', '#12B76A', 'Enabled'), 24, 160);
place(pill('Badge/Disabled', '#F2F4F7', '#667085', '#98A2B3', 'Disabled'), 128, 160);
place(pill('Badge/Synced', '#ECFDF3', '#027A48', '#12B76A', 'Synced'), 232, 160);
place(pill('Badge/Stale', '#FFFAEB', '#B54708', '#F79009', 'Stale'), 330, 160);
place(pill('Badge/Error', '#FEF2F2', '#B42318', '#F04438', 'Error'), 424, 160);
place(pill('Badge/Live', '#EEF2FF', '#4338CA', '#4F46E5', 'Live'), 512, 160);
place(pill('Badge/Active', '#ECFDF3', '#027A48', '#12B76A', 'Active'), 592, 160);
place(pill('Badge/Revoked', '#F2F4F7', '#667085', '#98A2B3', 'Revoked'), 672, 160);
place(pill('EnvChip/Dev', '#EEF4FF', '#175CD3', '#2E6BFF', 'dev'), 24, 200);
place(pill('EnvChip/Staging', '#FFFAEB', '#B54708', '#F79009', 'staging'), 108, 200);
place(pill('EnvChip/Prod', '#FEF2F2', '#B42318', '#F04438', 'prod'), 200, 200);
place(pill('RoleTag/Admin', '#EEF2FF', '#4338CA', null, 'Admin', 'caps'), 288, 200);
place(pill('RoleTag/Developer', '#EEF4FF', '#175CD3', null, 'developer', 'caps'), 366, 200);
place(pill('RoleTag/Product Owner', '#F4F3FF', '#6941C6', null, 'product-owner', 'caps'), 490, 200);

// --- Toggles ---
function toggle(name, on) {
  const c = mk(name);
  if (!c) return;
  c.resize(36, 20); c.fills = [F(on ? '#4F46E5' : '#D0D5DD')]; c.cornerRadius = 999;
  const k = figma.createEllipse(); k.resize(16, 16); k.fills = [F('#FFFFFF')]; k.strokes = [];
  k.x = on ? 18 : 2; k.y = 2;
  c.appendChild(k);
  return c;
}
place(toggle('Toggle/On', true), 622, 200);
place(toggle('Toggle/Off', false), 676, 200);

// --- Inputs ---
function input(name, w, placeholder, chevron) {
  const c = mk(name);
  if (!c) return;
  c.resize(w, 36); c.fills = [F('#FFFFFF')]; c.strokes = [F('#D0D5DD')]; c.strokeWeight = 1; c.cornerRadius = 8;
  c.layoutMode = 'HORIZONTAL'; c.primaryAxisSizingMode = 'FIXED'; c.counterAxisSizingMode = 'AUTO';
  c.itemSpacing = 8; c.paddingLeft = 12; c.paddingRight = 12; c.paddingTop = 8; c.paddingBottom = 8;
  c.primaryAxisAlignItems = 'SPACE_BETWEEN';
  c.appendChild(T(placeholder, 'body', '#98A2B3'));
  if (chevron) {
    const ic = getIcon('Icon/ChevronDown');
    if (ic) { const i = ic.createInstance(); c.appendChild(i); }
  }
  return c;
}
place(input('Input/Text', 280, 'Placeholder', false), 24, 248);
place(input('Input/Select', 280, 'Select…', true), 324, 248);
{
  const c = mk('SearchBox');
  if (c) {
    c.resize(240, 32); c.fills = [F('#FFFFFF')]; c.strokes = [F('#D0D5DD')]; c.strokeWeight = 1; c.cornerRadius = 8;
    c.layoutMode = 'HORIZONTAL'; c.itemSpacing = 8; c.paddingLeft = 10; c.paddingRight = 10; c.paddingTop = 7; c.paddingBottom = 7;
    const ic = getIcon('Icon/Search');
    if (ic) c.appendChild(ic.createInstance());
    c.appendChild(T('Search…', 'bsm', '#98A2B3'));
    place(c, 624, 248);
  }
}

// --- Tabs ---
function tab(name, active) {
  const c = mk(name);
  if (!c) return;
  c.resize(90, 34);
  c.layoutMode = 'VERTICAL'; c.primaryAxisSizingMode = 'AUTO'; c.counterAxisSizingMode = 'AUTO';
  c.itemSpacing = 0; c.paddingLeft = 0; c.paddingRight = 0;
  c.appendChild(T('Tab label', active ? 'h3' : 'body', active ? '#101828' : '#667085'));
  const bar = figma.createRectangle(); bar.resize(90, 2); bar.fills = [F(active ? '#4F46E5' : 'transparent')]; bar.strokes = [];
  c.appendChild(bar);
  return c;
}
place(tab('Tab/Active', true), 24, 308);
place(tab('Tab/Inactive', false), 124, 308);

// --- Cards ---
{
  const c = mk('Card');
  if (c) { c.resize(400, 200); c.fills = [F('#FFFFFF')]; c.strokes = [F('#E4E7EC')]; c.strokeWeight = 1; c.cornerRadius = 12; place(c, 24, 360); }
  const s = mk('StatCard');
  if (s) {
    s.resize(220, 108); s.fills = [F('#FFFFFF')]; s.strokes = [F('#E4E7EC')]; s.strokeWeight = 1; s.cornerRadius = 12;
    s.layoutMode = 'VERTICAL'; s.itemSpacing = 4; s.paddingLeft = 16; s.paddingRight = 16; s.paddingTop = 14; s.paddingBottom = 14;
    s.appendChild(T('FLAGS', 'ovl', '#98A2B3'));
    s.appendChild(T('42', 'h1', '#101828'));
    s.appendChild(T('12 enabled in prod', 'cap', '#667085'));
    place(s, 444, 360);
  }
}

// --- Avatar ---
{
  const c = mk('Avatar');
  if (c) {
    c.resize(24, 24); c.fills = [F('#E4E7EC')]; c.cornerRadius = 999;
    c.layoutMode = 'HORIZONTAL'; c.primaryAxisAlignItems = 'CENTER'; c.counterAxisAlignItems = 'CENTER';
    c.appendChild(T('AL', 'caps', '#475467'));
    place(c, 684, 360);
  }
}

// --- EmptyState ---
{
  const c = mk('EmptyState');
  if (c) {
    c.resize(280, 150); c.fills = []; 
    c.layoutMode = 'VERTICAL'; c.primaryAxisSizingMode = 'AUTO'; c.counterAxisSizingMode = 'AUTO';
    c.itemSpacing = 8; c.primaryAxisAlignItems = 'CENTER';
    const ic = getIcon('Icon/Inbox');
    if (ic) c.appendChild(ic.createInstance());
    c.appendChild(T('Nothing here yet', 'h3', '#101828'));
    c.appendChild(T('Create your first flag to get started.', 'cap', '#667085'));
    place(c, 24, 580);
  }
}

// --- DiffRow ---
function diff(name, bg, fg, text) {
  const c = mk(name);
  if (!c) return;
  c.resize(420, 28); c.fills = [F(bg)]; c.cornerRadius = 6;
  c.layoutMode = 'HORIZONTAL'; c.itemSpacing = 8; c.paddingLeft = 10; c.paddingRight = 10; c.paddingTop = 4; c.paddingBottom = 4;
  c.appendChild(T(text, 'monosm', fg));
  return c;
}
place(diff('DiffRow/-', '#FEF2F2', '#B42318', 'enabled: true'), 324, 580);
place(diff('DiffRow/+', '#ECFDF3', '#027A48', 'enabled: false'), 324, 616);

return out;
