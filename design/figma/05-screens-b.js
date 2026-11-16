// design/figma/05-screens-b.js — Flag editor + Playground frames on page 01 · Screens
// Fill SHELL_ID from the 'AppShell:<id>' entry of 03-shell.js output.
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
  mono24: { family: 'JetBrains Mono', style: 'Regular', size: 24, lh: 32 },
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
function ghostBtn(label, color, bg) {
  const b = getComp('Button/Ghost').createInstance();
  override(b, 'Button', label);
  return b;
}

// ============ Screen 4: Flag editor ============
{
  const fr = newScreen('Screen/Flag Editor');
  const content = withShell(fr, 'Projects / Checkout Web / new-payment-flow');
  const twoCol = figma.createAutoLayout('HORIZONTAL', { itemSpacing: 20 });
  twoCol.layoutSizingHorizontal = 'FILL';
  // --- left rail ---
  const rail = card(twoCol, 280);
  rail.layoutSizingVertical = 'HUG';
  rail.appendChild(T('Flag', 'h2', '#0F172A'));
  const keyRow = figma.createAutoLayout('HORIZONTAL', { itemSpacing: 8, primaryAxisAlignItems: 'CENTER' });
  keyRow.appendChild(T('new-payment-flow', 'mono', '#0F172A'));
  const cp = getComp('Icon/Copy'); if (cp) keyRow.appendChild(cp.createInstance());
  rail.appendChild(keyRow);
  const descBox = figma.createAutoLayout('VERTICAL', { itemSpacing: 6, paddingLeft: 12, paddingRight: 12, paddingTop: 10, paddingBottom: 10 });
  descBox.fills = [F('#F1F5F9')]; descBox.cornerRadius = 8;
  descBox.appendChild(T('Refactored payment step with 3DS challenge', 'bsm', '#0F172A'));
  rail.appendChild(descBox);
  const meta = [
    ['Version', 'v9'],
    ['Project', 'checkout-web'],
    ['Created', '2026-09-14'],
  ];
  for (const [k, v] of meta) {
    const r = figma.createAutoLayout('HORIZONTAL', { itemSpacing: 8 });
    r.layoutSizingHorizontal = 'FILL';
    r.appendChild(T(k, 'cap', '#94A3B8'));
    const sp = figma.createAutoLayout({}); sp.fills = []; sp.layoutSizingHorizontal = 'FILL'; sp.resize(1, 8);
    r.appendChild(sp);
    r.appendChild(T(v, 'mono', '#475569'));
    rail.appendChild(r);
  }
  const div = figma.createAutoLayout({}); div.resize(240, 1); div.fills = [F('#EEF2F6')]; rail.appendChild(div);
  rail.appendChild(T('DANGER ZONE', 'ovl', '#B91C1C'));
  const del = getComp('Button/Danger').createInstance();
  override(del, 'Button', 'Delete flag');
  rail.appendChild(del);
  rail.appendChild(T('Removes the flag from all environments; flagd drops it on next sync (FR-4).', 'cap', '#94A3B8', 240));
  // --- main column ---
  const main = figma.createAutoLayout('VERTICAL', { itemSpacing: 16 });
  main.fills = [];
  main.layoutSizingHorizontal = 'FILL';
  twoCol.appendChild(main);
  // env tabs
  const tabs = figma.createAutoLayout('HORIZONTAL', { itemSpacing: 20 });
  const envDefs = [['dev', false, 'v14'], ['staging', true, 'v7'], ['prod', false, 'v5']];
  for (const [env, active, v] of envDefs) {
    const tab = getComp(active ? 'Tab/Active' : 'Tab/Inactive').createInstance();
    const col = figma.createAutoLayout('VERTICAL', { itemSpacing: 0 });
    const inner = figma.createAutoLayout('HORIZONTAL', { itemSpacing: 6, counterAxisAlignItems: 'CENTER' });
    inner.appendChild(tab);
    col.appendChild(inner);
    const label = col.findAll(n => n.type === 'TEXT' && n.characters === 'Tab label')[0];
    if (label && 'characters' in label) label.characters = env + '  ' + v;
    tabs.appendChild(col);
  }
  main.appendChild(tabs);
  // definition card
  const defn = card(main, 'fill');
  defn.layoutSizingVertical = 'HUG';
  const dhead = figma.createAutoLayout('HORIZONTAL', { itemSpacing: 12, primaryAxisAlignItems: 'CENTER' });
  dhead.layoutSizingHorizontal = 'FILL';
  dhead.appendChild(T('Definition · staging', 'h3', '#0F172A'));
  const sp = figma.createAutoLayout({}); sp.fills = []; sp.layoutSizingHorizontal = 'FILL'; sp.resize(1, 8);
  dhead.appendChild(sp);
  const en = getComp('Badge/Enabled').createInstance(); dhead.appendChild(en);
  const tog = getComp('Toggle/On').createInstance(); dhead.appendChild(tog);
  defn.appendChild(dhead);
  // variants
  defn.appendChild(T('VARIANTS', 'ovl', '#94A3B8'));
  const vhead = figma.createAutoLayout('HORIZONTAL', { itemSpacing: 12 });
  vhead.layoutSizingHorizontal = 'FILL';
  const vw = [0.3, 0.4, 0.2];
  ['Name', 'Value', 'Type'].forEach((h, i) => {
    const c = T(h, 'ovl', '#94A3B8');
    vhead.appendChild(c);
  });
  defn.appendChild(vhead);
  const variants = [['on', 'true', 'boolean'], ['off', 'false', 'boolean']];
  for (const [n, val, typ] of variants) {
    const vr = figma.createAutoLayout('HORIZONTAL', { itemSpacing: 12, paddingTop: 10, paddingBottom: 10 });
    vr.layoutSizingHorizontal = 'FILL';
    vr.appendChild(T(n, 'mono', '#0F172A'));
    vr.appendChild(T(val, 'mono', '#475569'));
    const t = getComp('Badge/Disabled').createInstance();
    override(t, 'Disabled', typ);
    vr.appendChild(t);
    defn.appendChild(vr);
  }
  defn.appendChild(ghostBtn('+ Add variant', '#475569'));
  // default variant
  defn.appendChild(T('DEFAULT VARIANT (FALLBACK)', 'ovl', '#94A3B8'));
  const dv = getComp('Input/Select').createInstance();
  override(dv, 'Select…', 'off');
  defn.appendChild(dv);
  // rules
  defn.appendChild(T('RULES — evaluated top to bottom', 'ovl', '#94A3B8'));
  const rules = [
    ['1 · Beta allowlist', ['email', 'ends-with', '@acme.com'], 'on'],
    ['2 · EU users', ['country', 'is one of', 'DE, FR, ES'], 'on'],
    ['3 · Percentage split', ['50%', 'key: user_id'], 'on'],
  ];
  for (const [name, chips, target] of rules) {
    const rr = figma.createAutoLayout('HORIZONTAL', { itemSpacing: 10, primaryAxisAlignItems: 'CENTER', paddingLeft: 12, paddingRight: 12, paddingTop: 10, paddingBottom: 10 });
    rr.fills = [F('#F8FAFC')]; rr.cornerRadius = 8;
    rr.layoutSizingHorizontal = 'FILL';
    const grip = getComp('Icon/Grip'); if (grip) rr.appendChild(grip.createInstance());
    rr.appendChild(T(name, 'bsm', '#0F172A'));
    const chipsRow = figma.createAutoLayout('HORIZONTAL', { itemSpacing: 6 });
    for (const chipText of chips) {
      const chip = figma.createAutoLayout('HORIZONTAL', { paddingLeft: 8, paddingRight: 8, paddingTop: 3, paddingBottom: 3 });
      chip.fills = [F('#EEF2FF')]; chip.cornerRadius = 999;
      chip.appendChild(T(chipText, 'monosm', '#4338CA'));
      chipsRow.appendChild(chip);
    }
    rr.appendChild(chipsRow);
    const sp2 = figma.createAutoLayout({}); sp2.fills = []; sp2.layoutSizingHorizontal = 'FILL'; sp2.resize(1, 8);
    rr.appendChild(sp2);
    rr.appendChild(T('→ ' + target, 'mono', '#475569'));
    const tr = getComp('Icon/Trash'); if (tr) rr.appendChild(tr.createInstance());
    defn.appendChild(rr);
  }
  defn.appendChild(ghostBtn('+ Add rule', '#4338CA'));
  // save bar with validation
  const saveBar = card(main, 'fill');
  saveBar.layoutSizingVertical = 'HUG';
  saveBar.itemSpacing = 12;
  const valBox = figma.createAutoLayout('VERTICAL', { itemSpacing: 6, paddingLeft: 12, paddingRight: 12, paddingTop: 10, paddingBottom: 10 });
  valBox.fills = [F('#FEE2E2')]; valBox.cornerRadius = 8;
  valBox.layoutSizingHorizontal = 'FILL';
  const wicon = getComp('Icon/Warning'); if (wicon) valBox.appendChild(wicon.createInstance());
  valBox.appendChild(T('2 issues found — fix all to save (validated all-at-once, FR-14)', 'bsm', '#B91C1C'));
  valBox.appendChild(T('1 · Rule 3: percentage splits require a targeting key attribute in context', 'cap', '#B91C1C'));
  valBox.appendChild(T('2 · Default variant “off” must remain defined while flag is enabled', 'cap', '#B91C1C'));
  saveBar.appendChild(valBox);
  const barRow = figma.createAutoLayout('HORIZONTAL', { itemSpacing: 8, primaryAxisAlignItems: 'CENTER' });
  barRow.layoutSizingHorizontal = 'FILL';
  const cf = getComp('Button/Secondary').createInstance();
  override(cf, 'Button', 'Copy from… dev ▾');
  barRow.appendChild(cf);
  const sp3 = figma.createAutoLayout({}); sp3.fills = []; sp3.layoutSizingHorizontal = 'FILL'; sp3.resize(1, 8);
  barRow.appendChild(sp3);
  const disc = ghostBtn('Discard', '#475569'); barRow.appendChild(disc);
  const save = getComp('Button/Primary').createInstance();
  override(save, 'Button', 'Save changes');
  barRow.appendChild(save);
  saveBar.appendChild(barRow);
  // PO note
  const poNote = figma.createAutoLayout('HORIZONTAL', { itemSpacing: 8, primaryAxisAlignItems: 'CENTER' });
  const sh = getComp('Icon/Shield'); if (sh) poNote.appendChild(sh.createInstance());
  poNote.appendChild(T('Product owner access: the enabled toggle is the only control available (FR-59); everything else is read-only for that role.', 'cap', '#64748B', 900));
  main.appendChild(poNote);
}

// ============ Screen 5: Playground ============
{
  const fr = newScreen('Screen/Playground');
  const content = withShell(fr, 'Playground');
  const twoCol = figma.createAutoLayout('HORIZONTAL', { itemSpacing: 20 });
  twoCol.layoutSizingHorizontal = 'FILL';
  // left: configure
  const conf = card(twoCol, 620);
  conf.layoutSizingVertical = 'HUG';
  conf.appendChild(T('Configure evaluation', 'h2', '#0F172A'));
  function sel(label, value) {
    conf.appendChild(T(label, 'bsm', '#475569'));
    const s = getComp('Input/Select').createInstance();
    override(s, 'Select…', value);
    conf.appendChild(s);
  }
  sel('Project', 'Checkout Web');
  sel('Flag', 'new-payment-flow');
  conf.appendChild(T('Environment', 'bsm', '#475569'));
  const envRow = figma.createAutoLayout('HORIZONTAL', { itemSpacing: 8 });
  for (const [env, active] of [['dev', false], ['staging', true], ['prod', false]]) {
    const chip = getComp('EnvChip/' + env).createInstance();
    if (active) {
      const wrap = figma.createAutoLayout('HORIZONTAL', { itemSpacing: 0, paddingLeft: 2, paddingRight: 2, paddingTop: 2, paddingBottom: 2 });
      wrap.fills = [F('#FFFFFF')]; wrap.strokes = [F('#4F46E5')]; wrap.strokeWeight = 2; wrap.cornerRadius = 999;
      wrap.appendChild(chip);
      envRow.appendChild(wrap);
    } else envRow.appendChild(chip);
  }
  conf.appendChild(envRow);
  conf.appendChild(T('Targeting key', 'bsm', '#475569'));
  const tk = getComp('Input/Text').createInstance();
  override(tk, 'Placeholder', 'user_84712');
  conf.appendChild(tk);
  conf.appendChild(T('Required for percentage-split rules — evaluation is sticky by this key.', 'cap', '#94A3B8'));
  conf.appendChild(T('Context (JSON)', 'bsm', '#475569'));
  const ctx = figma.createAutoLayout('VERTICAL', { paddingLeft: 12, paddingRight: 12, paddingTop: 10, paddingBottom: 10 });
  ctx.fills = [F('#0F172A')]; ctx.cornerRadius = 8;
  ctx.appendChild(T('{"country": "FR", "plan": "pro"}', 'mono', '#E2E8F0'));
  conf.appendChild(ctx);
  const ev = getComp('Button/Primary').createInstance();
  override(ev, 'Button', 'Evaluate');
  conf.appendChild(ev);
  // right: result
  const res = card(twoCol, 'fill');
  res.layoutSizingVertical = 'HUG';
  res.appendChild(T('Result', 'h2', '#0F172A'));
  const valRow = figma.createAutoLayout('HORIZONTAL', { itemSpacing: 12, primaryAxisAlignItems: 'CENTER' });
  valRow.appendChild(T('true', 'mono24', '#047857'));
  const vb = getComp('Badge/Enabled').createInstance();
  override(vb, 'Enabled', 'variant: on');
  valRow.appendChild(vb);
  res.appendChild(valRow);
  const reason = figma.createAutoLayout('VERTICAL', { itemSpacing: 4, paddingLeft: 12, paddingRight: 12, paddingTop: 10, paddingBottom: 10 });
  reason.fills = [F('#D1FAE5')]; reason.cornerRadius = 8;
  reason.layoutSizingHorizontal = 'FILL';
  reason.appendChild(T('MATCHED_RULE · rule 2 (EU users) → on', 'bsm', '#047857'));
  reason.appendChild(T('staging · v7 · 8 ms', 'cap', '#64748B'));
  res.appendChild(reason);
  const acts = figma.createAutoLayout('HORIZONTAL', { itemSpacing: 8 });
  acts.appendChild(ghostBtn('Copy OpenFeature snippet', '#4338CA'));
  acts.appendChild(ghostBtn('Retry', '#475569'));
  res.appendChild(acts);
  res.appendChild(T('Snippets use the standard OpenFeature SDK + official flagd provider — no custom client (goal 2).', 'cap', '#94A3B8'));
}
return out;
