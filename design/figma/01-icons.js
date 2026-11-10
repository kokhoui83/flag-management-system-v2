// design/figma/01-icons.js — run via Figma MCP use_figma (page: 00 · Design System)
// Creates 30 icon components x 2 tones inside two sections. Idempotent: skips existing sections.
const C = (hex) => { const h = hex.replace('#',''); return { r: parseInt(h.slice(0,2),16)/255, g: parseInt(h.slice(2,4),16)/255, b: parseInt(h.slice(4,6),16)/255 }; };
const F = (hex) => ({ type: 'SOLID', color: C(hex) });
function vec(parent, d, tone, fill, w) {
  const v = figma.createVector();
  v.vectorPaths = [{ windingRule: 'NONZERO', data: d }];
  if (fill) { v.fills = [F(tone)]; v.strokes = []; }
  else { v.fills = []; v.strokes = [F(tone)]; v.strokeWeight = w || 1.5; }
  parent.appendChild(v);
  return v;
}
function ell(parent, x, y, w, h, tone, fill, sw) {
  const e = figma.createEllipse();
  e.resize(w, h); e.x = x; e.y = y;
  if (fill) { e.fills = [F(tone)]; e.strokes = []; }
  else { e.fills = []; e.strokes = [F(tone)]; e.strokeWeight = sw || 1.5; }
  parent.appendChild(e);
  return e;
}
function rect(parent, x, y, w, h, tone, fill, r, sw) {
  const e = figma.createRectangle();
  e.resize(w, h); e.x = x; e.y = y;
  if (fill) { e.fills = [F(tone)]; e.strokes = []; }
  else { e.fills = []; e.strokes = [F(tone)]; e.strokeWeight = sw || 1.5; }
  if (r) e.cornerRadius = r;
  parent.appendChild(e);
  return e;
}
function iconComp(name, tone, draw) {
  const c = figma.createComponent();
  c.name = name; c.resize(16, 16); c.fills = [];
  draw(c, tone);
  return c;
}
const ICONS = [
  ['Icon/Flag', (c,t) => { vec(c,'M4 1.5 L4 14.5',t,false,1.5); vec(c,'M5 2.5 L13 2.5 L10.8 5.5 L13 8.5 L5 8.5 Z',t,true); }],
  ['Icon/Grid', (c,t) => { rect(c,1.5,1.5,5.5,5.5,t,true,1); rect(c,9.5,1.5,5.5,5.5,t,true,1); rect(c,1.5,9.5,5.5,5.5,t,true,1); rect(c,9.5,9.5,5.5,5.5,t,true,1); }],
  ['Icon/Play', (c,t) => { vec(c,'M5.5 3.5 L13 8 L5.5 12.5 Z',t,true); }],
  ['Icon/Key', (c,t) => { ell(c,2,5,6,6,t,false,1.5); vec(c,'M8.5 8 L14 8',t,false,1.5); vec(c,'M12.5 8 L12.5 10.5',t,false,1.5); }],
  ['Icon/History', (c,t) => { ell(c,2,2,12,12,t,false,1.5); vec(c,'M8 4.5 L8 8 L10.5 9.5',t,false,1.5); }],
  ['Icon/Users', (c,t) => { ell(c,2.5,3,5,5,t,false,1.5); vec(c,'M1.5 13.5 C1.5 10.8 3.5 9.8 5 9.8 C6.5 9.8 8.5 10.8 8.5 13.5',t,false,1.5); ell(c,9.5,4,4,4,t,false,1.5); vec(c,'M9.8 9.6 C12.2 9.6 14.5 10.9 14.5 13.6',t,false,1.5); }],
  ['Icon/Book', (c,t) => { rect(c,3,2.5,10.5,11,t,false,1.5,1.5); vec(c,'M6.5 2.5 L6.5 13.5',t,false,1.5); }],
  ['Icon/Search', (c,t) => { ell(c,2.5,2.5,8,8,t,false,1.5); vec(c,'M9.5 9.5 L14 14',t,false,1.5); }],
  ['Icon/Plus', (c,t) => { vec(c,'M8 3 L8 13',t,false,1.5); vec(c,'M3 8 L13 8',t,false,1.5); }],
  ['Icon/ChevronDown', (c,t) => { vec(c,'M4.5 6 L8 9.5 L11.5 6',t,false,1.5); }],
  ['Icon/ChevronRight', (c,t) => { vec(c,'M6 4.5 L9.5 8 L6 11.5',t,false,1.5); }],
  ['Icon/Copy', (c,t) => { rect(c,5.5,5.5,8,8,t,false,1.5,1.5); vec(c,'M10 2.5 L4.2 2.5 C3.2 2.5 2.5 3.2 2.5 4.2 L2.5 10',t,false,1.5); }],
  ['Icon/Trash', (c,t) => { vec(c,'M2.5 4 L13.5 4',t,false,1.5); vec(c,'M6.5 4 L6.5 2.5 L9.5 2.5 L9.5 4',t,false,1.5); vec(c,'M4.2 4 L4.9 13.5 L11.1 13.5 L11.8 4',t,false,1.5); vec(c,'M6.8 7 L6.8 11',t,false,1.5); vec(c,'M9.2 7 L9.2 11',t,false,1.5); }],
  ['Icon/Check', (c,t) => { vec(c,'M3 8.5 L6.5 12 L13 4.5',t,false,1.8); }],
  ['Icon/X', (c,t) => { vec(c,'M4 4 L12 12',t,false,1.5); vec(c,'M12 4 L4 12',t,false,1.5); }],
  ['Icon/Warning', (c,t) => { vec(c,'M8 2.5 L14.5 13.5 L1.5 13.5 Z',t,false,1.5); vec(c,'M8 6.5 L8 9.8',t,false,1.5); rect(c,7.4,11,1.2,1.2,t,true,0.6); }],
  ['Icon/ArrowRight', (c,t) => { vec(c,'M2.5 8 L13 8',t,false,1.5); vec(c,'M9.5 4.5 L13 8 L9.5 11.5',t,false,1.5); }],
  ['Icon/Filter', (c,t) => { vec(c,'M2.5 3 L13.5 3 L9 8.5 L9 13 L7 11.5 L7 8.5 Z',t,false,1.5); }],
  ['Icon/Grip', (c,t) => { for (const [x,y] of [[5.5,4],[10.5,4],[5.5,8],[10.5,8],[5.5,12],[10.5,12]]) ell(c,x-0.9,y-0.9,1.8,1.8,t,true); }],
  ['Icon/Eye', (c,t) => { vec(c,'M1.5 8 C3.2 4.6 5.4 3 8 3 C10.6 3 12.8 4.6 14.5 8 C12.8 11.4 10.6 13 8 13 C5.4 13 3.2 11.4 1.5 8 Z',t,false,1.5); ell(c,6.2,6.2,3.6,3.6,t,true); }],
  ['Icon/Bolt', (c,t) => { vec(c,'M9.5 2 L4 9.5 L7.5 9.5 L6.5 14 L12 6.5 L8.5 6.5 Z',t,true); }],
  ['Icon/Logout', (c,t) => { vec(c,'M6.5 2.5 L4.2 2.5 C3.3 2.5 2.5 3.3 2.5 4.2 L2.5 11.8 C2.5 12.7 3.3 13.5 4.2 13.5 L6.5 13.5',t,false,1.5); vec(c,'M10.5 11 L13.5 8 L10.5 5',t,false,1.5); vec(c,'M13.5 8 L6.5 8',t,false,1.5); }],
  ['Icon/Shield', (c,t) => { vec(c,'M8 2 L13.5 4 L13.5 8 C13.5 11.5 11 13.6 8 14.5 C5 13.6 2.5 11.5 2.5 8 L2.5 4 Z',t,false,1.5); vec(c,'M5.5 8 L7.5 10 L11 6.5',t,false,1.5); }],
  ['Icon/Pencil', (c,t) => { vec(c,'M10.5 3 L13 5.5 L6.5 12 L4 12 L4 9.5 Z',t,false,1.5); vec(c,'M9 4.5 L11.5 7',t,false,1.5); }],
  ['Icon/External', (c,t) => { vec(c,'M9.5 3 L13 3 L13 6.5',t,false,1.5); vec(c,'M13 3 L7 9',t,false,1.5); vec(c,'M11 13 L4.2 13 C3.3 13 3 12.7 3 11.8 L3 4.2 C3 3.3 3.3 3 4.2 3 L5 3',t,false,1.5); }],
  ['Icon/Refresh', (c,t) => { vec(c,'M2 8 C2 4.7 4.7 2 8 2 C11.3 2 14 4.7 14 8',t,false,1.5); vec(c,'M14 5 L14 8 L11 8',t,false,1.5); vec(c,'M14 8 C14 11.3 11.3 14 8 14 C4.7 14 2 11.3 2 8',t,false,1.5); vec(c,'M2 11 L2 8 L5 8',t,false,1.5); }],
  ['Icon/Clock', (c,t) => { ell(c,2.5,2.5,11,11,t,false,1.5); vec(c,'M8 4.5 L8 8 L10.2 9.2',t,false,1.5); }],
  ['Icon/Inbox', (c,t) => { vec(c,'M2.5 9 L2.5 12 C2.5 12.8 3.2 13.5 4 13.5 L12 13.5 C12.8 13.5 13.5 12.8 13.5 12 L13.5 9',t,false,1.5); vec(c,'M2.5 9 L5 9 L6.5 11 L9.5 11 L11 9 L13.5 9',t,false,1.5); vec(c,'M13.5 9 L13.5 6 C13.5 5.2 12.8 4.5 12 4.5 L4 4.5 C3.2 4.5 2.5 5.2 2.5 6 Z',t,false,1.5); }],
  ['Icon/Dot', (c,t) => { ell(c,4,4,8,8,t,true); }],
  ['Icon/Promote', (c,t) => { rect(c,2,4.5,12,9,t,false,1.5,2); vec(c,'M8 1 L8 10',t,false,1.5); vec(c,'M5.5 3.5 L8 1 L10.5 3.5',t,false,1.5); }],
];
const page = figma.currentPage;
const out = { sections: [], skipped: [], created: 0 };
function buildSet(tone, secName, y) {
  if (page.children.some(n => n.name === secName)) { out.skipped.push(secName); return; }
  const sec = figma.createSection();
  sec.name = secName;
  sec.x = 0; sec.y = y;
  sec.resize(10 * 52 + 40, 4 * 52 + 60);
  sec.fills = [F('#F8FAFC')];
  page.appendChild(sec);
  out.sections.push(secName + ':' + sec.id);
  ICONS.forEach(([name, draw], i) => {
    const c = iconComp(name, tone, draw);
    c.x = 24 + (i % 10) * 52;
    c.y = 36 + Math.floor(i / 10) * 52;
    sec.appendChild(c);
    out.created++;
  });
}
buildSet('#475569', 'Icons · on light', 0);
buildSet('#9AA5B8', 'Icons · on dark', 320);
return out;
