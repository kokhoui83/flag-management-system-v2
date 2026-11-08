// design/figma/03-shell.js — run after 01/02 (needs icons + atoms)
// Builds Rail, Topbar, and AppShell components (1440x900) on page 00 · Design System.
// Returns ids; screen scripts read the AppShell id cross-page via getNodeByIdAsync.
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
const page = figma.currentPage; // 00 · Design System
const out = { created: [] };
function existing(name) { return page.children.find(n => n.name === name && n.type === 'COMPONENT'); }
function getComp(name) { return page.children.find(n => n.name === name && n.type === 'COMPONENT'); }

// --- Rail (232 x 900, dark) ---
{
  const c = existing('Rail') || (() => { const x = figma.createComponent(); x.name = 'Rail'; return x; })();
  c.fills = [F('#0B1220')]; c.strokes = [];
  c.resize(232, 900);
  c.layoutMode = 'VERTICAL'; c.primaryAxisSizingMode = 'FIXED'; c.counterAxisSizingMode = 'FIXED';
  c.itemSpacing = 4; c.paddingLeft = 12; c.paddingRight = 12; c.paddingTop = 16; c.paddingBottom = 16;
  // rebuild children fresh (idempotent)
  while (c.children.length) c.children[0].remove();
  const logo = c.appendChild ? null : null;
  const logoRow = figma.createAutoLayout('HORIZONTAL', { itemSpacing: 10 });
  const mark = getComp('LogoMark');
  if (mark) logoRow.appendChild(mark.createInstance());
  logoRow.appendChild(T('FMS', 'h2', '#F2F4F7'));
  const lt = T('Flag Management', 'ovl', '#8A94A6');
  logoRow.appendChild(lt);
  logoRow.layoutSizingHorizontal = 'FILL';
  c.appendChild(logoRow);
  const sp1 = figma.createAutoLayout({ itemSpacing: 0 }); sp1.resize(208, 12); sp1.fills = []; c.appendChild(sp1);
  function navItem(iconName, label, active) {
    const row = figma.createAutoLayout('HORIZONTAL', { itemSpacing: 10, paddingLeft: 10, paddingRight: 10, paddingTop: 8, paddingBottom: 8 });
    row.fills = [F(active ? '#1D2A44' : 'transparent')]; row.cornerRadius = 8;
    const ic = getComp(iconName);
    if (ic) row.appendChild(ic.createInstance());
    row.appendChild(T(label, active ? 'h3' : 'body', active ? '#F2F4F7' : '#8A94A6'));
    row.layoutSizingHorizontal = 'FILL';
    c.appendChild(row);
    return row;
  }
  navItem('Icon/Grid', 'Projects', true);
  navItem('Icon/Play', 'Playground', false);
  const sp2 = figma.createAutoLayout({ itemSpacing: 0 }); sp2.resize(208, 12); sp2.fills = []; c.appendChild(sp2);
  const admin = T('ADMIN', 'ovl', '#5C6779'); admin.layoutSizingHorizontal = 'FILL';
  const adminPad = figma.createAutoLayout('VERTICAL', { paddingLeft: 10, paddingTop: 0, paddingBottom: 4, itemSpacing: 0 });
  adminPad.appendChild(admin); adminPad.layoutSizingHorizontal = 'FILL';
  c.appendChild(adminPad);
  navItem('Icon/Key', 'API Keys', false);
  navItem('Icon/History', 'Audit Log', false);
  navItem('Icon/Users', 'Members', false);
  const grow = figma.createAutoLayout({ itemSpacing: 0 }); grow.fills = [];
  grow.layoutSizingVertical = 'FILL'; grow.resize(208, 10);
  c.appendChild(grow);
  navItem('Icon/Book', 'User guide', false);
  const user = figma.createAutoLayout('HORIZONTAL', { itemSpacing: 8, paddingLeft: 10, paddingRight: 10, paddingTop: 8, paddingBottom: 8 });
  user.fills = [F('#131C2E')]; user.cornerRadius = 8;
  const av = getComp('Avatar');
  if (av) user.appendChild(av.createInstance());
  const un = T('alex@acme.com', 'bsm', '#F2F4F7'); un.layoutSizingHorizontal = 'FILL';
  user.appendChild(un);
  user.appendChild(T('admin', 'ovl', '#8A94A6'));
  user.layoutSizingHorizontal = 'FILL';
  c.appendChild(user);
  c.x = 0; c.y = 1520; page.appendChild(c);
  out.created.push('Rail:' + c.id);
}

// --- Topbar (1208 x 56) ---
{
  const c = existing('Topbar') || (() => { const x = figma.createComponent(); x.name = 'Topbar'; return x; })();
  c.fills = [F('#FFFFFF')]; c.strokes = [F('#E4E7EC')]; c.strokeWeight = 1;
  c.resize(1208, 56);
  c.layoutMode = 'HORIZONTAL'; c.primaryAxisSizingMode = 'FIXED'; c.counterAxisSizingMode = 'AUTO';
  c.itemSpacing = 12; c.paddingLeft = 32; c.paddingRight = 24; c.paddingTop = 0; c.paddingBottom = 0;
  c.counterAxisAlignItems = 'CENTER';
  while (c.children.length) c.children[0].remove();
  const bc = T('Projects / Checkout Web / new-payment-flow', 'body', '#475467');
  bc.name = 'Breadcrumb';
  c.appendChild(bc);
  const grow = figma.createAutoLayout({ itemSpacing: 12 }); grow.fills = [];
  grow.layoutSizingHorizontal = 'FILL'; grow.primaryAxisAlignItems = 'MIN';
  c.appendChild(grow);
  const live = getComp('Badge/Live');
  if (live) grow.appendChild(live.createInstance());
  const stale = getComp('Badge/Stale');
  if (stale) grow.appendChild(stale.createInstance());
  const av = getComp('Avatar');
  if (av) { const a = av.createInstance(); grow.appendChild(a); }
  c.x = 256; c.y = 1520; page.appendChild(c);
  out.created.push('Topbar:' + c.id);
}

// --- AppShell (1440 x 900) ---
{
  const c = existing('AppShell') || (() => { const x = figma.createComponent(); x.name = 'AppShell'; return x; })();
  c.fills = [F('#F6F7F9')]; c.strokes = [];
  c.resize(1440, 900);
  c.layoutMode = 'NONE';
  while (c.children.length) c.children[0].remove();
  const rail = getComp('Rail');
  if (rail) { const r = rail.createInstance(); r.x = 0; r.y = 0; c.appendChild(r); }
  const tb = getComp('Topbar');
  if (tb) { const t = tb.createInstance(); t.x = 232; t.y = 0; c.appendChild(t); }
  const content = figma.createAutoLayout('VERTICAL', { name: 'Content', itemSpacing: 20, paddingLeft: 32, paddingRight: 32, paddingTop: 24, paddingBottom: 24 });
  content.fills = [];
  content.x = 232; content.y = 56;
  content.resize(1208, 844);
  content.primaryAxisSizingMode = 'FIXED'; content.counterAxisSizingMode = 'FIXED';
  c.appendChild(content);
  c.x = 488; c.y = 1520; page.appendChild(c);
  out.created.push('AppShell:' + c.id);
}

return out;
