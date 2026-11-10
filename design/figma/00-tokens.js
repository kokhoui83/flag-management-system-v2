// design/figma/00-tokens.js — run FIRST (or any time, re-runnable):
// refreshes the token variables on canvas to the reference palette adopted 2026-11-09
// (sampled from the FlagOps PNG export — see docs/07-dashboard-design.md §3.1).
// Idempotent: finds collections by name, updates values in place, creates missing
// variables, removes deprecated ones (dark-rail side/*, info/*, ok/50-era names).
const C = (hex) => { const h = hex.replace('#',''); return { r: parseInt(h.slice(0,2),16)/255, g: parseInt(h.slice(2,4),16)/255, b: parseInt(h.slice(4,6),16)/255, a: 1 }; };
const FILL = ['FRAME_FILL','SHAPE_FILL','TEXT_FILL','STROKE_COLOR'];

const COLOR = {
  'bg/canvas':'#F8FAFC', 'bg/surface':'#FFFFFF', 'bg/sunken':'#F1F5F9',
  'border/default':'#E2E8F0', 'border/strong':'#CBD5E1', 'border/subtle':'#EEF2F6',
  'ink/1':'#0F172A', 'ink/2':'#475569', 'ink/3':'#64748B', 'ink/4':'#94A3B8', 'ink/5':'#CBD5E1',
  'brand/600':'#4F46E5', 'brand/700':'#4338CA', 'brand/50':'#EEF2FF', 'brand/100':'#E0E7FF',
  'ok/600':'#10B981', 'ok/100':'#D1FAE5', 'ok/700':'#047857',
  'warn/600':'#D97706', 'warn/100':'#FEF3C7', 'warn/700':'#B45309',
  'bad/600':'#EF4444', 'bad/100':'#FEE2E2', 'bad/700':'#B91C1C',
  'env/dev':'#2563EB', 'env/dev-soft':'#DBEAFE',
  'env/staging':'#D97706', 'env/staging-soft':'#FEF3C7',
  'env/prod':'#DC2626', 'env/prod-soft':'#FEE2E2',
  'role/admin':'#047857', 'role/admin-soft':'#D1FAE5',
  'role/developer':'#2563EB', 'role/developer-soft':'#DBEAFE',
  'role/product-owner':'#7C3AED', 'role/product-owner-soft':'#F3E8FF',
  'status/active':'#047857', 'status/active-soft':'#D1FAE5',
  'status/pending':'#B45309', 'status/pending-soft':'#FEF3C7',
  'side/active':'#F8FAFC',
  'code/bg':'#0F172A', 'code/ink':'#E2E8F0',
};
const SPACING = { xs:4, sm:8, md:12, lg:16, xl:24, '2xl':32, '3xl':48, '4xl':64 };
const RADIUS = { sm:4, md:8, lg:12, xl:16, full:999 };

const out = {};
async function sync(name, map, type, scopes) {
  let col = (await figma.variables.getLocalVariableCollectionsAsync()).find(c => c.name === name);
  if (!col) {
    col = figma.variables.createVariableCollection(name);
    col.renameMode(col.modes[0].modeId, 'Default');
  }
  const modeId = col.modes[0].modeId;
  const vars = {};
  for (const id of [...col.variableIds]) {
    const v = await figma.variables.getVariableByIdAsync(id);
    if (v) vars[v.name] = v;
  }
  const rep = { updated: 0, created: 0, removed: [] };
  const wanted = new Set(Object.keys(map));
  for (const [n, v] of Object.entries(vars)) {
    if (!wanted.has(n)) { v.remove(); rep.removed.push(n); }
  }
  for (const [n, raw] of Object.entries(map)) {
    const val = type === 'COLOR' ? C(raw) : raw;
    if (vars[n]) {
      vars[n].setValueForMode(modeId, val);
      rep.updated++;
    } else {
      const v = figma.variables.createVariable(n, col, type);
      v.setValueForMode(modeId, val);
      v.scopes = scopes;
      rep.created++;
    }
  }
  return rep;
}
out.color = await sync('FMS Color', COLOR, 'COLOR', FILL);
out.spacing = await sync('FMS Spacing', SPACING, 'FLOAT', ['GAP']);
out.radius = await sync('FMS Radius', RADIUS, 'FLOAT', ['CORNER_RADIUS']);
out.summary = {
  colorVars: Object.keys(COLOR).length,
  removed: out.color.removed,
};
return out;
