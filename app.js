/* Forbidden Recruit — moteur. Les données de jeu viennent de fichiers JSON séparés (voir data/). */
'use strict';
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const el = (tag, attrs = {}, ...kids) => {
  const n = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v == null || v === false) continue;
    if (k === 'class') n.className = v;
    else if (k === 'html') n.innerHTML = v;
    else if (k.startsWith('on')) n.addEventListener(k.slice(2), v);
    else n.setAttribute(k, v === true ? '' : (LANG !== 'fr' && (k === 'title' || k === 'aria-label' || k === 'placeholder') ? trData(String(v)) : v));
  }
  for (const k of kids.flat()) if (k != null && k !== false) n.append(k.nodeType ? k : document.createTextNode(LANG !== 'fr' && typeof k === 'string' ? trData(k) : k));
  return n;
};
/* ---------- Langue : le français est la langue de base ; l'anglais vient de data/i18n-en.json ---------- */
let LANG = (() => { try { return JSON.parse(localStorage.getItem('fr.lang')) || 'fr'; } catch (e) { return 'fr'; } })();
let I18N = { ui: {}, terms: {} };
const uiKey = strs => strs.join('{}');
function L(strs, ...vals) {
  let parts = strs;
  if (LANG !== 'fr') { const en = I18N.ui[uiKey(strs)]; if (en != null) parts = en.split('{}'); vals = vals.map(v => typeof v === 'string' ? trData(v) : v); }
  let o = parts[0]; for (let i = 0; i < vals.length; i++) o += (vals[i] == null ? '' : vals[i]) + (parts[i + 1] == null ? '' : parts[i + 1]); return o;
}
const trCache = new Map();
function trData(s) {
  if (LANG === 'fr' || typeof s !== 'string' || !s) return s;
  if (trCache.has(s)) return trCache.get(s);
  const T = I18N.terms; let r = T[s];
  if (r == null && s.length > 600) return (I18N.texts && I18N.texts[s]) || s;
  if (r == null) { const t = s.trim(); if (t !== s && T[t] != null) r = s.replace(t, T[t]); }
  if (r == null && I18N.texts && I18N.texts[s] != null) r = I18N.texts[s];
  if (r == null && I18N.ui[s] != null) r = I18N.ui[s];
  if (r == null) { const m = s.match(/^([^:]+?) : (.+)$/); if (m) { const a = trData(m[1]), b = trData(m[2]); if (a !== m[1] || b !== m[2]) r = a + ': ' + b; } }
  if (r == null) { const m = s.match(/^([^(),]+?) \(([^()]+)\)$/); if (m) { const base = T[m[1] + ' (X)'] != null ? T[m[1] + ' (X)'].replace(/ \(X\)$/, '') : T[m[1]]; if (base != null) r = base + ' (' + m[2].split(/, ?/).map(p => T[p] != null ? T[p] : p).join(', ') + ')'; } }
  if (r == null && /, /.test(s) && !/[.;:!?]\s/.test(s)) { const ps = s.split(', '), tp = ps.map(trData); if (tp.some((x, i) => x !== ps[i])) r = tp.join(', '); }
  if (r == null) { const m = s.match(/^(.+?) - (.+)$/); if (m) { const a = trData(m[1]), b = trData(m[2]); if (a !== m[1] || b !== m[2]) r = a + ' - ' + b; } }
  if (r == null && / — /.test(s)) { const ps = s.split(' — '), tp = ps.map(trData); if (tp.some((x, i) => x !== ps[i])) r = tp.join(' — '); }
  if (r == null && / · /.test(s)) { const ps = s.split(' · '), tp = ps.map(trData); if (tp.some((x, i) => x !== ps[i])) r = tp.join(' · '); }
  if (r == null && s.endsWith(')')) { let i = -1; while ((i = s.indexOf(' (', i + 1)) > 0) { const inner = s.slice(i + 2, -1); if (T[inner] != null || /\bp\. ?\d/.test(inner)) { const a = trData(s.slice(0, i)), b = T[inner] != null ? T[inner] : trData(inner); if (a !== s.slice(0, i) || b !== inner) { r = a + ' (' + b + ')'; break; } } } }
  if (r == null) { const m = s.match(/^([\s\S]+?) \(([^()]*\bp\. ?\d[^()]*)\)$/); if (m) { const a = trData(m[1]), b = trData(m[2]); if (a !== m[1] || b !== m[2]) r = a + ' (' + b + ')'; } }
  if (r == null) { const m = s.match(/^([\s\S]+?)([.:]?)$/); if (m && m[2] && T[m[1]] != null) r = T[m[1]] + m[2]; }
  if (r == null) r = s;
  trCache.set(s, r); return r;
}
function setLang(l) { try { localStorage.setItem('fr.lang', JSON.stringify(l)); } catch (e) {} location.reload(); }
function translateStatic(root) {
  if (LANG === 'fr') return;
  const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, { acceptNode: n => n.parentNode && /^(SCRIPT|STYLE|NOSCRIPT)$/.test(n.parentNode.nodeName) ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT }); const ns = []; while (w.nextNode()) ns.push(w.currentNode);
  for (const n of ns) { const v = n.nodeValue, t = v.trim(); if (!t) continue; const e = trData(t); if (e !== t) n.nodeValue = v.replace(t, e); }
  for (const e of root.querySelectorAll('[title],[aria-label],[placeholder]')) for (const a of ['title', 'aria-label', 'placeholder']) { const v = e.getAttribute(a); if (v) e.setAttribute(a, trData(v)); }
}
const uid = () => Math.random().toString(36).slice(2, 10);
const LS = {
  get(k, d) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch (e) { return d; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch (e) { return false; } },
  del(k) { try { localStorage.removeItem(k); } catch (e) {} }
};

/* ---------- Données ---------- */
let DB = null;          // {core, books:[...]} fusionné
let UNITS = {};         // id -> unité
function mergeData(core, books) {
  DB = { core, books, lists: {}, rules: { ...(core.rules || {}) }, detachments: [...core.detachments], weapons: [...(core.weapons || [])] };
  UNITS = {};
  I18N = { ui: {}, terms: {} }; trCache.clear();
  for (const b of books) if (b.i18n && b.i18n[LANG]) { Object.assign(I18N.ui, b.i18n[LANG].ui || {}); Object.assign(I18N.terms, b.i18n[LANG].terms || {}); if (b.i18n[LANG].roles) I18N.roles = b.i18n[LANG].roles; if (b.i18n[LANG].heads) I18N.heads = b.i18n[LANG].heads; if (b.i18n[LANG].opts) I18N.opts = Object.assign(I18N.opts || {}, b.i18n[LANG].opts); if (b.i18n[LANG].texts) I18N.texts = Object.assign(I18N.texts || {}, b.i18n[LANG].texts); if (b.i18n[LANG].rtexts) I18N.rtexts = Object.assign(I18N.rtexts || {}, b.i18n[LANG].rtexts); }
  for (const b of books) {
    for (const [k, v] of Object.entries(b.equipmentLists || {})) DB.lists[k] = [...(DB.lists[k] || []), ...v.map(it => ({ ...it, lang: it.lang || b.lang }))];
    Object.assign(DB.rules, b.rules || {});
    DB.weapons.push(...(b.weapons || []));
    DB.detachments.push(...(b.detachments || []).map(d => ({ ...d, book: b.id, army: d.army !== undefined ? d.army : b.army, legacy: d.legacy || b.legacy })));
    for (const u of b.units || []) UNITS[u.id] = { ...u, book: b.id, bookName: b.name, army: u.army !== undefined ? u.army : b.army, lang: u.lang || b.lang, legacy: !!(u.legacy || b.legacy) };
    if (I18N.opts) for (const u of b.units || []) { const en = I18N.opts[u.id]; if (en) (u.options || []).forEach((o, i) => { if (en[i]) o.textEn = en[i]; }); }
  }
  if (I18N.rtexts) for (const [k, v] of Object.entries(I18N.rtexts)) if (DB.rules[k] && typeof DB.rules[k] === 'object') DB.rules[k].summaryEn = v;
  // ajouts aux listes (armureries Legacies, Serments, Provenances) : ajoutés en fin de liste pour garder les choix enregistrés
  const addItem = (ln, it) => (DB.lists[ln] = DB.lists[ln] || []).push(it);
  for (const b of books) for (const it of b.legacyListItems || []) addItem(it.list, { name: it.name, points: it.points, faction: it.faction, legacy: true, lang: 'en' });
  for (const o of (core.oaths || {}).list || []) for (const it of o.listItems || []) addItem(it.list, { name: it.name, points: it.points, oath: o.id, legacy: true, lang: 'en' });
  for (const p of (core.provenances || {}).list || []) for (const it of p.listItems || []) addItem(it.list, { name: it.name, points: it.points, prov: p.id, legacy: true, lang: 'en' });
  for (const b of books) {
    (b.legacyUnitOptions || []).forEach((o, n) => { const u = UNITS[o.unit]; if (u) u.options = [...(u.options || []), { ...o.option, legacy: true, lang: 'en', key: 'G' + n }]; });
    (b.legacyProseOptions || []).forEach((p, n) => { for (const u of Object.values(UNITS))
      if ((u.traits || []).includes(p.faction) && (u.wargear || []).some(w => w === p.ifWargear || w.split(' : ').pop() === p.ifWargear)) u.options = [...(u.options || []), { ...p.option, legacy: true, lang: 'en', key: 'R' + n }]; });
  }
  for (const u of Object.values(UNITS)) for (const [k, v] of Object.entries(core.countsAs || {})) if (u.name.includes(k)) u.countsAs = v;
  for (const p of (core.provenances || {}).list || []) (p.options || []).forEach((o, n) => { for (const u of Object.values(UNITS)) if (u.army === 'mil' && matchU(u, o.match)) u.options = [...(u.options || []), { ...o.opt, prov: p.id, lang: 'en', key: 'P' + p.id + n }]; });
  for (const lo of core.legionOptions || []) for (const u of Object.values(UNITS)) if (['la', undefined].includes(u.army) && u.army === 'la' && matchU(u, lo.match)) u.options = [...(u.options || []), { ...lo.option, faction: lo.faction, legacy: lo.legacy || lo.option.legacy || undefined, legionOpt: lo.id, ref: lo.ref, key: 'L' + lo.id }];
  for (const a of core.primeAdvantages || []) (a.grantsOptions || []).forEach((go, n) => { for (const u of Object.values(UNITS)) if ((a.needsUnitIds ? a.needsUnitIds.includes(u.id) : matchU(u, go.match)) && (!go.match || matchU(u, go.match))) u.options = [...(u.options || []), { ...(go.option || go), match: undefined, faction: a.faction, advOpt: a.id, key: 'A' + a.id + n }]; });
  const dsp = (core.oaths || {}).desperation;
  if (dsp) for (const u of Object.values(UNITS)) if (u.army === 'la' && (u.wargear || []).some(w => /^(Bolter|Pistolet bolter|Bolt pistol)$/i.test(w.split(' : ').pop()))) u.options = [...(u.options || []), { text: dsp.text, max: 'models', choices: dsp.choices, oath: 'desperation', key: 'D', legacy: true, lang: 'en' }];
}
async function loadData() {
  const custom = LS.get('30k.customData');
  let siteCore = null;
  if (!window.EMBEDDED_DATA) try { siteCore = await (await fetch('data/core.json', { cache: 'no-cache' })).json(); } catch (e) {}
  const shipped = window.EMBEDDED_DATA ? window.EMBEDDED_DATA.core.version : siteCore ? siteCore.version : null;
  if (custom && custom.core && custom.books && !(shipped && custom.core.version < shipped && custom.source === 'update')) {
    mergeData(custom.core, custom.books); DB.custom = custom.source === 'update' ? 'update' : true; return;
  }
  if (custom && custom.source === 'update') LS.del('30k.customData');
  if (window.EMBEDDED_DATA) { mergeData(window.EMBEDDED_DATA.core, window.EMBEDDED_DATA.books); return; }
  const core = siteCore || await (await fetch('data/core.json', { cache: 'no-cache' })).json();
  const books = [];
  for (const f of core.bookFiles) books.push(await (await fetch('data/' + f, { cache: 'no-cache' })).json());
  mergeData(core, books);
}
const role = c => { const r = DB.core.roles[c] || { name: c, short: c }; if (LANG === 'fr') return r; const e = (I18N.roles || {})[c]; return e ? { ...r, ...e } : { ...r, name: trData(r.name) }; };
const detDef = t => DB.detachments.find(d => d.id === t);
const armyOf = f => { const a = (DB.core.armies || []).find(a => a.factions.includes(f)); return a ? a.id : null; };
const armyName = id => { const a = (DB.core.armies || []).find(a => a.id === id); return a ? a.name : id; };
const modeDef = () => (DB.core.modes || []).find(m => m.id === (army.mode || 'croisade')) || { id: 'croisade', name: 'Bataille' };
const advDef = a => DB.core.primeAdvantages.find(x => x.id === a);
const ALLEG = { 'Loyaliste': ['Loyaliste', 'Loyalist'], 'Renégat': ['Renégat', 'Traitor'] };
const LEGIONS = () => ((DB.core.armies || []).find(a => a.id === 'la') || { factions: [] }).factions.slice(0, 18);
const legacyOn = () => !!(army && !army.noLegacies);
const factionInfo = f => (DB.core.factionInfo || {})[f] || {};
const unitFaction = u => (u.traits || []).find(t => DB.core.factions.includes(t));
const hasRule = (u, re) => (u.rules || []).some(r => re.test(r.split(' : ').pop()));
const hasTrait = (u, re) => (u.traits || []).some(t => re.test(t));
const isVeh = u => (u.types || []).some(t => /Véhicule|Vehicle/.test(t)) || (u.profiles || []).some(p => p.vehicle);
const oathDef = id => ((DB.core.oaths || {}).list || []).find(o => o.id === id);
const detOaths = det => { if (!det) return []; const root = det.parent ? army.dets.find(d => d.id === det.parent) : (detDef(det.type).kind === 'apex' ? mainDet() : det);
  const src = root && ['principal', 'allie'].includes(detDef(root.type).kind) && detFaction(root) === 'Blackshields' ? root : (['principal', 'allie'].includes(detDef(det.type).kind) ? det : null);
  return src ? (src.oaths || []).map(oathDef).filter(Boolean) : []; };
const kidOfOath = det => det && (det.parent || detDef(det.type).kind === 'apex') && !['principal', 'allie'].includes(detDef(det.type).kind);
const paradigm = () => (DB.core.paradigms || {})[army.faction] || null;
const provDef = id => ((DB.core.provenances || {}).list || []).find(p => p.id === id);
const ARCANA = ['Archimandrite', 'Cybernetica', 'Lacrymaerta', 'Myrmidax', 'Malagra', 'Macrotek', 'Reductor'];
const unitArcana = (u, us) => (u.traits || []).find(t => ARCANA.includes(t)) || ((u.traits || []).includes('[Mechanicum]') ? (us && us.arcana) || null : null);
const mainDef = () => detDef(mainDet().type);
const bulk = (u, model) => { for (const r of u.rules || []) { const q = r.split(' : '); if (q.length > 1 && q[0] !== model) continue; const m = q[q.length - 1].match(/^(?:Massif|Bulky) \((\d+)\)/); if (m) return +m[1]; } return 1; };
const capacity = (u, d, si) => { const p = (u.profiles || []).find(x => x.vehicle); const v = p && p.stats[6]; let n = v && /^\d+$/.test(v) ? +v : 0; if (n && d) { const sl = slotsOf(d).find(x => String(x.i) === String(si)); if (sl && sl.transportBonus) n += sl.transportBonus; } return n; };
function dynCount(det, def) {
  const d = def.dynSlots;
  if (d.count === 'nonVehicle') return army.dets.reduce((a, x) => a + Object.entries(x.units).filter(([i, us]) => +i < 300 && UNITS[us.u] && !isVeh(UNITS[us.u])).length, 0);
  return def.slots.filter((x, i) => d.count.includes(x.role) && det.units[i]).length;
}
function matchU(u, m) {
  if (!m) return true;
  const last = r => r.split(' : ').pop();
  if (m.rule && !(u.rules || []).some(r => new RegExp(m.rule).test(last(r)))) return false;
  if (m.notRule && (u.rules || []).some(r => new RegExp(m.notRule).test(last(r)))) return false;
  if (m.type && !(u.types || []).some(t => new RegExp(m.type).test(t))) return false;
  if (m.trait && !(u.traits || []).includes(m.trait)) return false;
  if (m.names && !m.names.includes(u.name)) return false;
  if (m.notNames && m.notNames.includes(u.name)) return false;
  if (m.subtype && !(u.types || []).some(t => new RegExp(m.subtype).test(t))) return false;
  if (m.role && ![].concat(m.role).includes(u.role)) return false;
  if (m.hasItem) { const re = new RegExp('^(' + [].concat(m.hasItem).join('|') + ')$', 'i'); if (!unitItems(u).some(x => re.test(x))) return false; }
  if (m.ids && !m.ids.includes(u.id)) return false;
  if (m.hasChoice && !(u.options || []).some(o => (o.choices || []).some(c => c.name === m.hasChoice))) return false;
  return true;
}
const SK = { M: 0, WS: 1, BS: 2, S: 3, T: 4, W: 5, I: 6, A: 7, LD: 8, CL: 9, WP: 10, IN: 11, SAV: 12, INV: 13 };
const detOf = us => army.dets.find(d => Object.values(d.units).includes(us));
/* Unité telle qu'elle joue : Provenances, Serments et améliorations choisies appliqués aux profils, règles et types */
function effUnit(u, us) {
  if (!u || !us) return u;
  const det = detOf(us), fx = [];
  if (u.army === 'mil' || (det && armyOf(detFaction(det)) === 'mil')) for (const p of (army.provenances || []).map(provDef).filter(Boolean)) for (const e of p.effects || []) if (matchU(u, e.match)) fx.push({ ...e, src: p.name });
  if (det && detFaction(det) === 'Blackshields') for (const o of detOaths(det)) for (const e of o.effects || []) if (matchU(u, e.match)) fx.push({ ...e, src: o.name, oath: o.id });
  if (det) { const i = Object.keys(det.units).find(k => det.units[k] === us), ad = i != null && det.adv[i] && advDef(det.adv[i]); if (ad) { for (const e of [].concat(ad.effects || [])) fx.push({ ...e, src: ad.name }); if (ad.grantsRules) fx.push({ addRules: ad.grantsRules, src: ad.name }); }
    const sl = i != null && slotsOf(det).find(x => String(x.i) === String(i));
    if (sl && sl.grantsSubtype) fx.push({ addTypes: sl.grantsSubtype, src: sl.src });
    if (sl && sl.becomesFaction) fx.push({ losesTrait: '^(' + LEGIONS().filter(x => x !== sl.becomesFaction).map(x => x.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|') + ')$', addTraits: [sl.becomesFaction], src: sl.src });
    const key = det.id + ':' + i; for (const d2 of army.dets) for (const [j, x] of Object.entries(d2.units)) if (d2.adv[j] === 'we-enchaines' && x.chainWith === key) fx.push({ addRules: (advDef('we-enchaines') || {}).grantsRules || [], src: (advDef('we-enchaines') || {}).name });
    if (detDef(det.type).vanguardToLine && us.vtl && (u.rules || []).some(r => /^(Avant-garde|Vanguard) \(/.test(r.split(' : ').pop()))) fx.push({ removeRules: '^(Avant-garde|Vanguard) \\(', addRules: ['Ligne (1)'], src: detDef(det.type).name }); }
  for (const [t, e] of Object.entries(DB.core.subfactionEffects || {})) if ((u.traits || []).includes(t) && !isVeh(u)) fx.push({ ...e, src: t });
  if (det && detDef(det.type).foreign && armyOf(detFaction(det)) === 'quest' && [detDef(det.type).foreign, ...(detDef(det.type).foreignAlt || [])].includes(u.army)) fx.push({ losesTrait: '^(Solar Auxilia|Imperialis Militia|Cybernetica)$', addTraits: ['[Questoris Familia]'], src: detDef(det.type).name });
  if (det && detDef(det.type).trait && !(u.traits || []).includes(detDef(det.type).trait)) fx.push({ addTraits: [detDef(det.type).trait], src: detDef(det.type).name });
  (u.options || []).forEach((o, oi) => { const ch = optChoices(o); for (const k of Object.keys(picksOf(us, oi))) if (ch[k] && ch[k].effect) fx.push({ ...ch[k].effect, src: ch[k].name }); });
  if (!fx.length) return u;
  const x = { ...u, profiles: u.profiles.map(p => ({ ...p, stats: [...p.stats] })), rules: [...(u.rules || [])], types: [...(u.types || [])], traits: [...(u.traits || [])], effects: fx.map(f => f.src) };
  const num = (v, d) => { const m = String(v).match(/^(\d+)(\+?)$/); return m ? (Math.max(0, +m[1] + d)) + m[2] : v; };
  const lastR = r => r.split(' : ').pop();
  for (const f of fx) {
    if (f.onlyTypes && !(x.types || []).some(t => new RegExp(f.onlyTypes).test(t))) continue;
    for (const p of x.profiles) if (!p.vehicle && p.stats.length === 14) {
      for (const [k, d] of Object.entries(f.stats || {})) p.stats[SK[k]] = num(p.stats[SK[k]], d);
      for (const [k, v] of Object.entries(f.setStats || {})) p.stats[SK[k]] = v;
      for (const [k, v] of Object.entries(f.maxStats || {})) { const n = parseInt(p.stats[SK[k]]); if (n > v) p.stats[SK[k]] = String(v); }
      if (f.svStep) { const n = parseInt(p.stats[12]); if (n > 3) p.stats[12] = (n - f.svStep) + '+'; }
      if (f.helix && !/Sergent|Sergeant|Champion|Spécialiste|Specialist|État-major|Command/.test((x.types.find(t => t.startsWith(p.name)) || x.types[0] || ''))) { for (const k of ['LD', 'WP', 'IN', 'CL']) p.stats[SK[k]] = num(p.stats[SK[k]], -1); if (det && det.helix === 'Aberrant') { p.stats[SK.S] = num(p.stats[SK.S], 1); p.stats[SK.A] = num(p.stats[SK.A], 1); } }
    }
    for (const [pn, st] of Object.entries(f.profStats || {})) { const hd = (x.profiles.find(q => q.heads) || {}).heads || []; for (const p of x.profiles) if (new RegExp(pn).test(p.name)) for (const [k, v] of Object.entries(st)) { const j = hd.indexOf(k); if (j >= 0) p.stats[j] = String(v); } }
    if (f.removeRules || f.lootDead || f.doomed) {
      const re = new RegExp(f.removeRules || '^(Ligne|Line|Avant-garde|Vanguard) \\(');
      const lost = x.rules.filter(r => re.test(lastR(r)) || (f.lootDead || f.doomed) && /^(Ligne|Line|Avant-garde|Vanguard) \(/.test(lastR(r)));
      x.rules = x.rules.filter(r => !lost.includes(r));
      if (f.lootDead) for (const r of lost) { const m = lastR(r).match(/\((\d+)\)/), v = /Avant|Vanguard/.test(r) ? Math.ceil(+m[1] / 2) : +m[1]; x.rules.push(`Loot the Dead (${v})`); }
      if (f.doomed) { if (lost.length) for (const r of lost) x.rules.push(`Doomed Heroics (${2 * +lastR(r).match(/\((\d+)\)/)[1]})`); else if (!x.rules.some(r => /Heedless|Négligence/.test(r))) x.rules.push('Doomed Heroics (3)'); }
    }
    if (f.helix) x.rules.push(det && det.helix === 'Aberrant' ? 'Aberrant' : 'Clone');
    for (const r of f.addRules || []) if (!x.rules.includes(r)) x.rules.push(r);
    for (const t of f.addTraits || []) if (!x.traits.includes(t)) x.traits.push(t);
    for (const t of [].concat(f.removeTraits || [])) x.traits = x.traits.filter(y => y !== t);
    if (f.losesTrait) x.traits = x.traits.filter(t => !new RegExp(f.losesTrait).test(t));
    for (const w of [].concat(f.addWargear || f.gainsWargear || [])) if (!(x.wargear || []).includes(w)) x.wargear = [...(x.wargear || []), w];
    if (f.addTypes) x.types = x.types.map(t => /\(/.test(t) ? t.replace(/\)$/, ', ' + f.addTypes + ')') : t + ' (' + f.addTypes + ')');
    if (f.lightOrUnheavy) x.types = x.types.map(t => /Heavy|Lourd/.test(t) ? t.replace(/,?\s*(Heavy|Lourd)/, '').replace('()', '') : (/\(/.test(t) ? t.replace(/\)$/, ', Light)') : t + ' (Light)'));
    if (f.typeReplace) x.types = x.types.map(t => t.replace(new RegExp(f.typeReplace[0]), f.typeReplace[1]));
  }
  return x;
}
const shatteredOk = (u, f) => army.faction === 'Shattered Legions' && (army.shattered || []).includes(f) && ((DB.core.shattered || {}).commanders || {})[u.id] === f;


/* ---------- État ---------- */
let army = null;
let sel = null; // {det, slot} sélection courante
function newArmy() {
  return { id: uid(), name: L`Nouvelle liste`, mode: 'croisade', allegiance: 'Loyaliste', faction: DB.core.factions[0], limit: 3000, noLegacies: false,
    dets: [{ id: uid(), type: 'principal', parent: null, units: {}, adv: {}, bonusRole: null }], updated: Date.now() };
}
function slotsOf(det) {
  const def = detDef(det.type);
  let s = def.slots.map((x, i) => ({ ...x, i }));
  if (def.slotSwaps) s = s.map(x => { const w = (det.swaps || {})[x.i] && def.slotSwaps.find(q => q.from === x.role && (!q.faction || q.faction === detFaction(det))); return w ? { ...x, role: w.to, onlyIds: w.onlyIds, swapped: w } : x; });
  const oaths = detOaths(det);
  for (const o of oaths) if (o.swap && !kidOfOath(det)) s = s.map(x => o.swap[x.role] ? { ...x, role: o.swap[x.role], oath: o.id } : x);
  if (oaths.some(o => o.allPrime) && !kidOfOath(det)) s = s.map(x => ({ ...x, prime: true }));
  if (def.kind === 'principal' && paradigm() && paradigm().anyRank) s = s.map(x => ({ ...x, prime: true }));
  if (det.bonusRole && Object.entries(det.adv || {}).some(([i, v]) => v === 'logistique' && det.units[i] && +i < 100)) s.push({ role: det.bonusRole, bonus: true, i: def.slots.length });
  for (const [src, v] of Object.entries(det.adv || {})) { const a = advDef(v); if (!a || !a.addSlot || !det.units[src]) continue;
    const ch = (det.advSlot || {})[src] || {}, r = a.addSlot.role || ch.role;
    if (r) for (let k = 0; k < (a.addSlot.count || 1); k++) s.push({ role: r, bonus: true, added: +src, army: a.addSlot.army, legion: a.addSlot.legionPick ? ch.legion : null, unitName: a.addSlot.unitName, notFaction: a.addSlot.notFaction, noUnique: a.addSlot.noUnique, becomesFaction: a.addSlot.becomesFaction, grantsSubtype: a.addSlot.grantsSubtype, transportBonus: a.addSlot.transportBonus, src: a.name, i: addedIdx(src, k) }); }
  for (const [src, us] of Object.entries(det.units)) { const u = us && UNITS[us.u]; if (u && u.addSlot && +src < 100) s.push({ role: u.addSlot.role, bonus: true, added: +src, army: u.addSlot.army, onlyIds: u.addSlot.only, i: 200 + +src }); }
  if (def.dynSlots) { const n = dynCount(det, def), add = [].concat(def.dynSlots.add); for (let k = 0; k < n; k++) s.push({ role: add[0], roles: add, dyn: true, i: 300 + k }); }
  if (det === mainDet() && det.wsReco && sireActive() && sireRule().name === 'Sire des White Scars') s = s.map(x => x.role === 'TP' && x.i < 100 ? { ...x, role: 'RE', onlyIds: ['land-raider-explorator'], ws: true } : x);
  if (det === army.dets[0] && sireActive() && !(sireRule() || {}).noPrimeSlots) s.forEach(x => { if (x.role === 'TR' && !x.prime && x.i < 100) { x.prime = true; x.sire = true; } });
  return s;
}
/* Règles « Sire de … » : les cases Troupes du Détachement Principal deviennent Principales */
function sireRule() {
  const S = DB.core.sires || {};
  for (const d of army.dets) for (const us of Object.values(d.units)) { const u = us && UNITS[us.u]; if (!u || u.faction !== army.faction) continue;
    const r = (u.rules || []).find(x => S[x]); if (r) return { name: r, ...S[r] }; }
  return null;
}
function sireActive() {
  const r = sireRule(); if (!r) return false;
  const m = army.dets[0], def = detDef(m.type);
  const ids = def.slots.map((x, i) => x.role === 'TR' && m.units[i] ? m.units[i].u : null).filter(Boolean);
  const pickOk = i => { if (!r.needPick) return true; const us = m.units[i], u = UNITS[us.u]; return (u.options || []).some((o, oi) => { const ch = optChoices(o); return Object.keys(picksOf(us, oi)).some(k => ch[k] && new RegExp(r.needPick).test(ch[k].name + ' ' + (ch[k].from || '') + ' ' + o.text)); }); };
  const ok = def.slots.map((x, i) => x.role === 'TR' && m.units[i] && pickOk(i) ? m.units[i].u : null).filter(Boolean).filter(id => !r.only || r.only.includes(id));
  if (ok.length < 4) return false;
  for (const [id, n] of Object.entries(r.min || {})) if (ids.filter(x => x === id).length < n) return false;
  return true;
}
const detFaction = det => {
  const def = detDef(det.type);
  if (def.kind === 'allie' || def.kind === 'sdb') return det.faction || '';
  if (det.parent) { const p = army.dets.find(d => d.id === det.parent); if (p) return detFaction(p); }
  return army.faction;
};
const detName = det => detDef(det.type).name;

/* ---------- Points ---------- */
function unitSize(us) { const u = UNITS[us.u]; let n = u.models.reduce((a, m) => a + m.count, 0) + (us.extra || 0) * (1 + (u.extra && u.extra.with ? u.extra.with.reduce((a, w) => a + (w.count || 1), 0) : 0));
  (u.options || []).forEach((o, oi) => { if (o.addsModels) n += optCount(us, oi); }); return n; }
function optChoices(o) {
  const c = [...(o.choices || [])];
  for (const ln of [].concat(o.list || [])) for (const it of DB.lists[ln] || []) c.push({ ...it, from: ln });
  for (const ln of [].concat(o.freeList || [])) for (const it of DB.lists[ln] || []) c.push({ ...it, points: 0, from: ln });
  return c;
}
/* Un choix de liste est-il proposé à cette unité ? (armureries de Légion, Serments, Provenances, Legacies) */
function itemState(it, u, det, us) {
  if (it.faction) { const f = unitFaction(u) || (det ? detFaction(det) : army.faction); if (f !== it.faction && !(det && (detOaths(det).find(o => o.id === 'panoply') && det.panoplyLegion === it.faction)) && !(army.faction === 'Shattered Legions' && (army.shattered || []).includes(it.faction))) return { show: false, why: L`réservé aux figurines ${it.faction}` }; }
  if (it.oath && !detOaths(det).some(o => o.id === it.oath)) return { show: false, why: L`réservé au Serment ${(oathDef(it.oath) || {}).name}` };
  if (it.prov && !(army.provenances || []).includes(it.prov)) return { show: false, why: L`réservé à la Provenance ${(provDef(it.prov) || {}).name}` };
  if (it.allegiance && army.allegiance !== it.allegiance) return { show: false, why: L`réservé aux armées ${it.allegiance}s` };
  if (it.onlyUnits && !it.onlyUnits.some(n => n === u.name || n === u.id)) return { show: false, why: L`réservé à : ${it.onlyUnits.join(', ')}` };
  if (it.trait && !(u.traits || []).includes(it.trait) && !(u.options || []).some(o => new RegExp(it.trait).test(o.text || ''))) return { show: false, why: L`réservé aux figurines ${it.trait}` };
  if (it.arcana && unitArcana(u, us) !== it.arcana && !(u.rules || []).some(r => /^Theurgika Maximus/.test(r.split(' : ').pop()))) return { show: false, why: L`réservé aux Cyberthéurges ${it.arcana}` };
  if (it.legacy && !legacyOn()) return { show: false, why: L`option Legacies (décochez « Exclure les unités Legacies »)` };
  return { show: true };
}
/* ---------- Équipement porté : qui tient quoi, après les échanges ---------- */
const itemOf = w => String(w).split(' : ').pop().replace(/\s*\(.*\)$/, '').trim();
const ikey = n => String(n).toLowerCase().replace(/’/g, "'").replace(/\s*\(.*\)$/, '').replace(/^(un |une |deux |two |paire de |pair of |a |an )/, '').trim();
function currentWargear(u, us) { if (!us) return u.wargear || []; const h = holders(u, us, -1); return (u.wargear || []).filter(w => (h[ikey(itemOf(w))] || 0) > 0); }
function unitItems(u) { const out = new Set((u.wargear || []).map(itemOf)); (u.options || []).forEach(o => { for (const c of optChoices(o)) out.add(c.name); }); return [...out]; }
function modelCount(u, us, name) { const m = u.models.find(m => m.name === name); return (m ? m.count : 0) + (u.extra && u.extra.model === name ? (us.extra || 0) : 0); }
/* holders[ikey(item)] = nombre de pièces portées dans l'unité, après les échanges ; skip = option ignorée.
   « Deux X » compte pour 2 pièces. Un élément de replaces/requires qui est un tableau = « l'un de ces objets ». */
const isPair = n => /^(deux|two) /i.test(String(n).trim());
function consume(h, r, n, partOf) {
  if (Array.isArray(r)) { let left = n; for (const x of r) { const k = ikey(x), have = Math.max(0, h[k] || 0), t = Math.min(have, left); h[k] = have - t; left -= t; if (!left) break; } if (left) { const k = ikey(r[0]); h[k] = (h[k] || 0) - left; } return; }
  const k = ikey(r); h[k] = (h[k] || 0) - n * (isPair(r) && !partOf ? 2 : 1);
}
function holders(u, us, skip) {
  const h = {}, size = unitSize(us), add = (k, n) => { h[k] = (h[k] || 0) + n; };
  for (const w of u.wargear || []) { const p = String(w).split(' : '), it = itemOf(w); add(ikey(it), (p.length > 1 ? (modelCount(u, us, p[0].trim()) || 1) : size) * (isPair(it) ? 2 : 1)); }
  (u.options || []).forEach((o, oi) => {
    if (oi === skip) return;
    const ch = optChoices(o), picked = picksOf(us, oi);
    for (const [k, q] of Object.entries(picked)) { const c = ch[k]; if (!c || !q) continue; const n = o.all ? size : q;
      for (const r of [].concat(c.replaces || o.replaces || [])) consume(h, r, n, o.partOf);
      for (const g of c.gives || [c.name]) add(ikey(g), n * (isPair(g) ? 2 : 1)); if (c.gives) add(ikey(c.name), n); }
  });
  return h;
}
const have = (h, it) => Array.isArray(it) ? it.reduce((a, x) => a + Math.max(0, h[ikey(x)] || 0), 0) : Math.max(0, h[ikey(it)] || 0);
const norm = x => String(x).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
const itName = it => Array.isArray(it) ? it.map(trData).join(LANG === 'fr' ? ' ou ' : ' or ') : trData(it);
/* Nombre maximal de choix pour une option, compte tenu de l'équipement réellement porté */
function optAvail(o, us, oi) {
  const u = UNITS[us.u]; let cap = optMax(o, us); const why = [];
  const lim = (n, w) => { n = Math.max(0, Math.floor(n)); if (n < cap) { cap = n; why.push(w); } };
  if (o.notIfArmyHas && army.dets.some(d => Object.values(d.units).some(x => [].concat(o.notIfArmyHas).includes(x.u)))) lim(0, L`impossible avec ${[].concat(o.notIfArmyHas).map(i => (UNITS[i] || {}).name || i).join(', ')} dans l'armée`);
  const needs = o.requiresAny ? [[].concat(o.requires || [])] : [].concat(o.requires || []), gives = [].concat(o.replaces || []);
  if (o.minModels && unitSize(us) < o.minModels) lim(0, L`à partir de ${o.minModels} figurines`);
  if (o.needsFromList) { const ln = o.needsFromList; let n = 0; (u.options || []).forEach((o2, j) => { if (j === oi) return; const ch = optChoices(o2); for (const [k, q] of Object.entries(picksOf(us, j))) if (ch[k] && ch[k].from === ln) n += q; }); lim(n, L`nécessite un objet de « ${ln} »`); }
  if (needs.length || gives.length || o.needsUpgrade || o.models || o.modelsSubtype) {
    const h = holders(u, us, oi);
    for (const it of needs) lim(have(h, it), L`${have(h, it)} figurine(s) avec ${itName(it)}`);
    if (o.all) for (const it of gives) if (have(h, it) < unitSize(us) * (!Array.isArray(it) && isPair(it) && !o.partOf ? 2 : 1)) lim(0, L`${itName(it)} déjà échangé(e) sur une partie de l'unité`);
    for (const it of gives) { const per = !Array.isArray(it) && isPair(it) && !o.partOf ? 2 : 1; lim(have(h, it) / per, L`${Math.floor(have(h, it) / per)} ${itName(it)} encore à échanger`); }
    if (o.modelsSubtype) lim(u.models.filter(m => (u.types || []).some(t => new RegExp('^\\s*' + m.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\s*:').test(t) && new RegExp(o.modelsSubtype).test(t)) || ((u.types || []).length === 1 && new RegExp(o.modelsSubtype).test(u.types[0]))).reduce((a, m) => a + modelCount(u, us, m.name), 0), L`réservé aux figurines État-major, Champion, Spécialiste ou Sergent`);
    if (o.models) { const mc = [].concat(o.models).reduce((a, m) => a + modelCount(u, us, m), 0); lim(mc && typeof o.max === 'number' && o.max > mc ? o.max : mc, L`réservé à : ${[].concat(o.models).map(trData).join(', ')}`); }
    if (o.needsUpgrade) {
      const nu = o.needsUpgrade;
      if (typeof nu === 'object') { const src = (u.options || [])[nu.opt], ch = src ? optChoices(src) : [], pk = picksOf(us, nu.opt);
        const n = Object.entries(pk).reduce((a, [k, q]) => a + (ch[k] && (!nu.list || [].concat(ch[k].from || []).includes(nu.list) || (src.list === nu.list && !ch[k].from)) ? q : 0), 0);
        lim(n, L`nécessite d'avoir pris une arme de « ${nu.list || L`l'option précédente`} »`); }
      else lim(have(h, nu), L`nécessite ${nu}`);
    }
  }
  if (o.needsArmyUnit && !army.dets.some(d => Object.values(d.units).some(x => x.u === o.needsArmyUnit))) lim(0, L`nécessite un(e) ${(UNITS[o.needsArmyUnit] || {}).name || o.needsArmyUnit} dans l'armée`);
  if (o.exclusive) (u.options || []).forEach((o2, j) => { if (j !== oi && o2.exclusive === o.exclusive && optCount(us, j)) lim(0, L`option alternative déjà choisie`); });
  const noPiv = x => !!x.noPintle;
  if (noPiv(o) && pivotPicked(u, us)) lim(0, L`aucune Arme sur Pivot ne doit être choisie`);
  if (!noPiv(o) && optChoices(o).some(isPivot) && (u.options || []).some((o2, j) => j !== oi && noPiv(o2) && optCount(us, j))) lim(0, L`Décurion choisi : aucune Arme sur Pivot`);
  if (o.upgrade && us.upgrade != null) lim(0, L`une seule amélioration par unité`);
  return { cap: Math.max(0, cap), why: why.join(' ; ') };
}
const isPivot = c => [c.name, c.from || '', ...(c.gives || [])].some(n => /sur Pivot|Pintle/i.test(n));
function pivotPicked(u, us) { return (u.options || []).some((o, j) => !o.noPintle && Object.keys(picksOf(us, j)).some(k => optChoices(o)[k] && isPivot(optChoices(o)[k]))); }
const addedIdx = (src, k) => 100 + +src + 20 * k;
const isExpanded = (u, us) => !!(u && us && !u.legacy && (u.options || []).some((o, oi) => o.legacy && optCount(us, oi)));
/* Amélioration (Décurion…) : conditions d'équipement */
function upgradeOk(u, us, g) {
  if ((u.options || []).some((o, j) => o.upgrade && optCount(us, j))) return { ok: false, why: L`une autre amélioration est déjà choisie (une seule par unité)` };
  if (/D[ée]curion/.test(g.name) && pivotPicked(u, us)) return { ok: false, why: L`aucune Arme sur Pivot ne doit être choisie` };
  if (!g.requires) return { ok: true };
  const h = holders(u, us, -1), miss = [].concat(g.requires).filter(it => !have(h, it));
  return miss.length ? { ok: false, why: L`nécessite ` + miss.map(itName).join(' et ') } : { ok: true };
}
function optMax(o, us) {
  const size = unitSize(us), u = UNITS[us.u];
  if (o.max === 'models') return size;
  if (o.max === 'others') return size - 1;
  if (o.max === 'all') return size;
  if (o.eachChoice && o.max === 'models') return size * Math.max(1, optChoices(o).length);
  if (typeof o.max === 'object' && o.max) {
    if (o.max.per) return Math.floor(size / o.max.per) * (o.max.n || 1);
    if (o.max.model) { const m = u.models.find(m => m.name === o.max.model); return (m ? m.count : 0) + (u.extra && u.extra.model === o.max.model ? (us.extra || 0) : 0); }
  }
  return o.max || 1;
}
function supersededBy(u, oi) { if (!legacyOn()) return false; const base = (u.options || [])[oi]; return (u.options || []).some((o, j) => j !== oi && o.supersedes && o.supersedes.index === oi && (!o.supersedes.textStartsWith || String(base.text).startsWith(o.supersedes.textStartsWith))); }
const okey = (u, oi) => { const o = (u.options || [])[oi]; return o && o.key ? o.key : oi; };
const picksOf = (us, oi) => (us.opts || {})[okey(UNITS[us.u] || {}, oi)] || {};
function optCount(us, oi) { return Object.values(picksOf(us, oi)).reduce((a, b) => a + b, 0); }
function unitPoints(us) {
  const u = UNITS[us.u]; if (!u) return 0;
  let p = u.points + (us.extra || 0) * (u.extra ? u.extra.points : 0);
  if (us.variant != null && u.variants) p += u.variants[us.variant].points;
  (u.options || []).forEach((o, oi) => {
    const ch = optChoices(o), picked = picksOf(us, oi);
    for (const [k, q] of Object.entries(picked)) { const c = ch[k]; if (c) p += c.points * q * (o.all ? unitSize(us) : 1); }
  });
  if (us.upgrade != null && u.upgrades) p += u.upgrades[us.upgrade].points;
  return p;
}
const detPoints = det => Object.values(det.units).reduce((a, us) => a + unitPoints(us), 0);
const armyPoints = () => army.dets.reduce((a, d) => a + detPoints(d), 0);

/* ---------- Règles de sélection ---------- */
const hasType = (u, re) => (u.types || []).some(t => re.test(t));
const ruleX = (u, name) => { for (const r of u.rules || []) { const m = r.split(' : ').pop().match(new RegExp('^' + name + ' \\((\\d+)\\)')); if (m) return +m[1]; } return 0; };

/* Une unité peut-elle occuper cette case ? -> {ok, why} */
function unitAllowed(det, slot, u) {
  const def = detDef(det.type), md = mainDef();
  const special = det.adv[slot.i] === 'affectation';
  const roles = slot.roles || [slot.role];
  const decur = md.decurionCommand && det === mainDet() && ['QG', 'EM'].includes(slot.role) && (u.upgrades || []).some(x => /D[ée]curion/.test(x.name));
  if (!roles.includes(u.role) && !(special && slot.role === 'EM' && u.role === 'QG') && !decur)
    return { ok: false, why: L`Rôle Tactique ${role(u.role).name} : cette case est une case ${roles.map(r => role(r).name).join(' ou ')}. Une unité ne peut occuper qu'une case de son Rôle Tactique (Livre de Règles p. 282).` };
  if (u.legacy && !legacyOn()) return { ok: false, why: L`Unité Legacies : décochez « Exclure les unités Legacies » à l'étape 1.` };
  if (def.kind === 'fort' || u.role === 'FO') return def.kind === 'fort' && u.role === 'FO' ? { ok: true } : { ok: false, why: L`Les Fortifications ne vont que dans un Battlefield Fortifications Detachment.` };
  if (slot.onlyIds && !slot.onlyIds.includes(u.id)) return { ok: false, why: L`Case réservée à : ${slot.onlyIds.map(i => UNITS[i] ? UNITS[i].name : i).join(', ')}.` };
  if (slot.notFaction && unitFaction(u) === slot.notFaction) return { ok: false, why: L`${slot.src} : unité sans le Trait de Faction ${slot.notFaction}.` };
  if (slot.noUnique && hasType(u, /Unique/)) return { ok: false, why: L`${slot.src} : aucune Figurine Unique.` };
  if (slot.unitName && !new RegExp(slot.unitName).test(u.name)) return { ok: false, why: L`Case réservée aux unités de la section Machina Malefica du Liber Mechanicum.` };
  const only = def.only && def.only[slot.role];
  if (only && !slot.added && !slot.dyn && !only.includes(u.name))
    return { ok: false, why: L`Dans un détachement ${def.name}, les cases ${role(slot.role).name} sont réservées à : ${only.join(', ')}${slot.bonus ? L` (y compris la case du Bénéfice Logistique, FAQ)` : ''}.` };
  const exc = def.except && def.except[slot.role];
  if (exc && exc.includes(u.name)) return { ok: false, why: L`Dans un détachement ${def.name}, les cases ${role(slot.role).name} ne peuvent pas recevoir : ${exc.join(', ')}.` };
  if (def.onlyType && !slot.added && !(u.types || []).every(t => new RegExp(def.onlyType).test(t))) return { ok: false, why: L`${def.name} : unités composées uniquement de Figurines de Type ${def.onlyType}.` };
  const ot = def.onlyTrait && def.onlyTrait[slot.role]; if (ot && !(u.traits || []).includes(ot)) return { ok: false, why: L`${def.name} : cases ${role(slot.role).name} réservées aux unités ${ot}.` };
  for (const o of detOaths(det)) {
    if (o.noRoles && !kidOfOath(det) && o.noRoles.includes(u.role) && !slot.oath) return { ok: false, why: L`Serment « ${o.name} » : aucun Choix ${o.noRoles.map(r => role(r).name).join(' / ')} dans ce Détachement.` };
    if (o.emOnly && slot.role === 'EM' && !o.emOnly.includes(u.id)) return { ok: false, why: L`Serment « ${o.name} » : les cases État-major ne peuvent recevoir que des Centurions ou des Centurions en Armure Terminator.` };
    if (o.onlyRole && !kidOfOath(det) && u.role !== o.onlyRole) return { ok: false, why: L`Serment « ${o.name} » : uniquement des Choix État-major.` };
    if (o.kidsNoRole && kidOfOath(det) && o.kidsNoRole.includes(u.role)) return { ok: false, why: L`Serment « ${o.name} » : aucun Choix Troupes dans les Détachements Auxiliaires ou d'Apex rattachés.` };
  }
  for (const a of ['Loyaliste', 'Renégat']) if (ALLEG[a].some(t => (u.traits || []).includes(t)) && army.allegiance !== a)
    return { ok: false, why: L`Unité d'Allégeance ${a} uniquement ; votre armée est ${army.allegiance}.` };
  const df = detFaction(det);
  const wantArmy = slot.army || def.foreign || armyOf(df);
  const prov = (army.provenances || []).map(provDef).filter(Boolean).flatMap(p => p.foreignUnits || []).find(f => f.ids.includes(u.id) && f.role === slot.role);
  if (u.army === 'assn' && slot.army !== 'assn') return { ok: false, why: L`Divisio Assassinorum : seulement par l'Avantage Principal Clade Operative (trois cases Appui ajoutées au Détachement Principal).` };
  { const ma = (DB.core.armies || []).find(a => a.id === armyOf(army.faction)); if (ma && ma.alliesOnlyTrait && def.kind === 'allie' && !(u.traits || []).includes(ma.alliesOnlyTrait)) return { ok: false, why: L`${ma.name} : les Détachements Alliés n'acceptent que les unités ${ma.alliesOnlyTrait}.` }; }
  if (u.army === 'cult' && slot.army !== 'cult') return { ok: false, why: L`Cults Abominatio : seulement par l'Avantage Principal Cult Operative (case Appui ajoutée).` };
  if (u.army && wantArmy && wantArmy !== u.army && !(def.foreignAlt || []).includes(u.army) && !(prov && armyOf(df) === 'mil')) return { ok: false, why: L`Ce détachement puise dans la liste ${armyName(wantArmy)} ; unité de la liste ${armyName(u.army)}.` };
  const f = unitFaction(u);
  if (slot.legion) {
    if (f !== slot.legion) return { ok: false, why: L`Case Exemplars of the Legion : unité ${slot.legion} uniquement.` };
    if (hasType(u, /Unique/)) return { ok: false, why: L`Exemplars of the Legion : aucune Figurine de Sous-type Unique.` };
  } else if (f && !def.foreign && !slot.army && !prov && f !== df && !shatteredOk(u, f))
    return { ok: false, why: L`Unité propre à la Faction ${f} ; ce détachement est ${df || L`sans faction`}${df === 'Shattered Legions' ? L` (Commanders of the Shattered Legions : seulement si leur Légion est choisie à l'étape 2)` : ''}.` };
  if (def.army === 'mil' && def.legacy && ['apex', 'aux'].includes(def.kind) && !def.foreign && !(u.traits || []).includes('Imperialis Militia')) return { ok: false, why: L`${def.name} : unités entièrement Imperialis Militia uniquement (Imperialis Militia – Legacies p. 10).` };
  if (def.unitRule && hasType(u, new RegExp(def.unitRule.match)) && !hasRule(u, new RegExp(def.unitRule.need))) return { ok: false, why: def.unitRule.why };
  if (md.armyRule && md.armyRule.level !== 'warn' && !hasType(u, new RegExp(md.armyRule.match)) && !(md.armyRule.need && hasRule(u, new RegExp(md.armyRule.need)))) return { ok: false, why: L`${md.name} : ${md.armyRule.why}` };
  if (md.noMove0 && (u.profiles || []).some(p => ['0', '-'].includes(String(p.stats[0])))) return { ok: false, why: L`${md.name} : les unités incluant une Figurine de Mouvement « 0 » ou « - » ne peuvent pas être choisies.` };
  if (def.kind === 'sdb' && md.sdbTransportOnly && !hasType(u, /Transport/)) return { ok: false, why: L`${md.name} : la case Seigneur des Batailles ne peut recevoir que des Figurines de Sous-type Transport.` };
  if (hasType(u, /Unique/) && army.dets.some(d => Object.entries(d.units).some(([i, x]) => x.u === u.id && !(d === det && +i === slot.i)))) return { ok: false, why: L`Unité Unique : un seul exemplaire par armée.` };
  if (u.limit) {
    const n = army.dets.reduce((a, d) => a + Object.entries(d.units).filter(([i, x]) => x.u === u.id && !(d === det && +i === slot.i)).length, 0);
    if (n >= u.limit) return { ok: false, why: L`Limité à ${u.limit} exemplaire(s) par armée (mention « 0-${u.limit} » du profil).` };
  }
  return { ok: true };
}

/* Droits à détachements ouverts par un groupe (principal + apex, ou un allié) */
function grants(parentDet) {
  const g = { aux: 0, flex: 0, by: {} };
  const group = detDef(parentDet.type).kind === 'principal'
    ? army.dets.filter(d => d === parentDet || detDef(d.type).kind === 'apex')
    : [parentDet];
  for (const d of group) for (const s of slotsOf(d)) {
    const us = d.units[s.i]; if (!us) continue;
    if (d.adv[s.i] === 'affectation' || detDef(d.type).noGrants || detDef(d.type).noUnlock || (advDef(d.adv[s.i]) || {}).noGrants) continue;
    const u = UNITS[us.u]; if (!u) continue;
    if (s.role === 'QG' && detDef(parentDet.type).kind === 'principal') g.flex += 1;
    if (s.role === 'EM' || d.adv[s.i] === 'petty') { const eu = (typeof effUnit === 'function' ? effUnit(u, us, d, s) : u) || u; const x = ruleX(eu, 'Officier de Ligne') || ruleX(eu, 'Officer of the Line') || 1; g.aux += x; g.by[u.name] = (g.by[u.name] || 0) + x; if (u.countsAs) g.by[u.countsAs] = (g.by[u.countsAs] || 0) + x; }
  }
  return g;
}
const vowDef = id => (DB.core.vows || []).find(v => v.id === id);
const vowsTaken = self => { const t = new Set(); army.dets.forEach(d => Object.values(d.units).forEach(x => { if (x && x !== self && x.vow) t.add(x.vow); })); return t; };
const countAdv = id => army.dets.reduce((a, d) => a + Object.entries(d.adv).filter(([i, v]) => v === id && d.units[i]).length, 0);
const doctrineDef = () => (DB.core.doctrines || []).find(d => d.id === army.doctrine && d.army === armyOf(army.faction));
const ritesFor = () => (DB.core.rites || []).filter(r => r.faction === army.faction);
const riteDef = () => { const rs = ritesFor(); return rs.find(r => r.id === army.rite) || rs.find(r => !r.allegiance || r.allegiance === army.allegiance) || null; };
const riteLabel = () => { const r = riteDef(); return r ? L`Rite : ` + r.name : ''; };
const isBonus = t => { const d = doctrineDef(); return !!(d && d.bonusDet === t); };
const auxUse = kids => { const n = {}; kids.forEach(k => n[k.type] = (n[k.type] || 0) + 1); return Object.entries(n).reduce((a, [t, c]) => a + (isBonus(t) ? Math.ceil(c / 2) : c), 0); };
const hasUnitNamed = names => army.dets.some(d => Object.values(d.units).some(us => UNITS[us.u] && names.includes(UNITS[us.u].name)));
const mainDet = () => army.dets.find(d => detDef(d.type) && detDef(d.type).kind === 'principal');
const armyDef = () => (DB.core.armies || []).find(a => a.factions.includes(army.faction)) || {};
function syncMain() { const want = armyDef().mainDet || 'principal', m = mainDet(), cur = m && detDef(m.type); if (m && m.type !== want && !(cur && cur.alt && cur.army === armyOf(army.faction))) { m.type = want; m.units = {}; m.adv = {}; m.bonusRole = null; army.dets = army.dets.filter(d => d === m || !(armyDef().forbid || []).includes(detDef(d.type).kind) && detDef(d.type).kind !== 'addl'); } }
const childrenOf = (p, kind) => army.dets.filter(d => detDef(d.type).kind === kind && (kind === 'apex' ? true : d.parent === p.id));

/* Peut-on ajouter un détachement de ce type ? -> {ok, why, parents} */
function canAddDet(def) {
  const main = mainDet(), lim = army.limit, md = mainDef();
  if (def.legacy && !legacyOn()) return { ok: false, why: L`Détachement Legacies : décochez « Exclure les unités Legacies » à l'étape 1.` };
  if (def.rite && !(riteDef() && [].concat(def.rite).includes(riteDef().id))) return { ok: false, why: L`Réservé au Rite de Guerre ${def.rite} (FAQ oct. 2026).` };
  if (def.needsHQTrait && !army.dets.some(d => slotsOf(d).some(x => { const us = d.units[x.i], u = us && UNITS[us.u]; return u && u.role === 'QG' && ((u.traits || []).includes(def.needsHQTrait) || (u.traits || []).includes('[' + def.needsHQTrait + ']') || us.arcana === def.needsHQTrait); }))) return { ok: false, why: L`${def.name} : l'armée doit inclure un Quartier Général ${def.needsHQTrait} (${def.ref || ''}).` };
  if (def.kind === 'fort') return army.dets.some(d => d.type === def.id) ? { ok: false, why: L`Un seul Battlefield Fortifications Detachment par armée.` } : { ok: true };
  if (md.onlyDets && !md.onlyDets.includes(def.id)) return { ok: false, why: L`${md.name} : seuls les Détachements supplémentaires suivants sont autorisés — ${md.onlyDets.map(i => (detDef(i) || {}).name || i).join(', ')}.` };
  if (md.maxDets && md.maxDets[def.id] && army.dets.filter(d => d.type === def.id).length >= md.maxDets[def.id]) return { ok: false, why: L`${md.name} : ${def.name} (maximum ${md.maxDets[def.id]}).` };
  if ((armyDef().forbid || []).includes(def.kind)) return { ok: false, why: L`Indisponible pour une armée ${armyDef().name} (Détachement Principal ${detName(mainDet())}).` };
  if (def.kind === 'addl') { const have = countAdv(def.unlockedBy) + (paradigm() && paradigm().freeDet === def.id ? 1 : 0), used = army.dets.filter(d => d.type === def.id).length; return used < have ? { ok: true, parents: [mainDet()] } : { ok: false, why: L`Ouvert par l'Avantage Principal « ${advDef(def.unlockedBy).name} » sur une Case Principale (${have} choisi(s), ${used} détachement(s) déjà pris).` }; }
  if (def.kind === 'principal') return { ok: false, why: L`Une armée comprend un seul Détachement Principal (Livre de Règles p. 280).` };
  if (def.allegiance && def.allegiance !== army.allegiance) return { ok: false, why: L`Réservé aux armées d'Allégeance ${def.allegiance}.` };
  if (def.faction && def.faction !== army.faction) return { ok: false, why: L`Réservé aux armées dont le Détachement Principal est de Faction ${def.faction}.` };
  if (def.needsUnit && !hasUnitNamed(def.needsUnit)) return { ok: false, why: L`Nécessite dans l'armée une unité : ${def.needsUnit.join(' ou ')}.` };
  if (def.doctrine && army.doctrine !== def.doctrine) { const dd = (DB.core.doctrines || []).find(d => d.id === def.doctrine); return { ok: false, why: L`Nécessite la doctrine ${dd ? dd.name : def.doctrine} (étape 2).` }; }
  if (def.kind === 'sdg') {
    if (army.dets.some(d => detDef(d.type).kind === 'sdg')) return { ok: false, why: L`Un seul Détachement de Seigneur de Guerre par armée (p. 281)` + (def.noUnlock ? ' : ' + def.name + L` le remplace.` : '.') };
    if (def.minPoints && lim < def.minPoints) return { ok: false, why: L`Limite de Points d'au moins ${def.minPoints}.` };
    if (lim < 3000) return { ok: false, why: L`Disponible à partir d'une Limite de Points de 3000 ; la vôtre est de ${lim} (p. 281).` };
    return { ok: true };
  }
  if (def.kind === 'sdb') return army.dets.some(d => d.type === def.id) ? { ok: false, why: L`Un seul Détachement de Seigneur des Batailles par armée (p. 281).` } : { ok: true };
  if (def.kind === 'allie') return { ok: true };
  const g = grants(main), apex = childrenOf(main, 'apex').length, aux = auxUse(childrenOf(main, 'aux'));
  if (def.kind === 'apex' && def.army && armyOf(army.faction) !== def.army) return { ok: false, why: L`Réservé à la liste ${armyName(def.army)}.` };
  if (def.kind === 'apex') {
    const free = g.flex - apex - Math.max(0, aux - g.aux);
    return free > 0 ? { ok: true, parents: [main] } : { ok: false, why: g.flex === 0
      ? L`Un Détachement d'Apex nécessite une case Quartier Général occupée dans le Détachement Principal (p. 280).`
      : L`Vos ${g.flex} case(s) Quartier Général occupée(s) sont déjà utilisées pour d'autres détachements (p. 280).` };
  }
  // auxiliaires : liés au principal ou à un allié
  const parents = [];
  const why = [];
  for (const p of [main, ...army.dets.filter(d => detDef(d.type).kind === 'allie')]) {
    if (def.army && armyOf(detFaction(p)) !== def.army) { why.push(L`${detName(p)} : détachement de la liste ${armyName(def.army)}`); continue; }
    const gp = grants(p), used = auxUse(childrenOf(p, 'aux')), after = auxUse([...childrenOf(p, 'aux'), { type: def.id }]);
    const cap = gp.aux + (p === main ? Math.max(0, gp.flex - apex) : 0);
    if (after > cap) { why.push(L`${detName(p)} : ${used}/${cap} détachement(s) auxiliaire(s) déjà utilisé(s)`); continue; }
    if (def.requires) {
      const have = gp.by[def.requires] || 0, n2 = childrenOf(p, 'aux').filter(d => d.type === def.id).length + 1, need2 = isBonus(def.id) ? Math.ceil(n2 / 2) : n2;
      if (need2 > have) { why.push(L`${detName(p)} : nécessite une unité « ${def.requires} » dans une case État-major${have ? L` (déjà utilisée)` : ''}`); continue; }
    }
    parents.push(p);
  }
  if (parents.length) return { ok: true, parents };
  return { ok: false, why: (why.join(' ; ') || L`Aucun droit disponible`) + L`. Chaque case État-major occupée ouvre 1 Détachement Auxiliaire (davantage avec Officier de Ligne), chaque case Quartier Général 1 Auxiliaire ou 1 Apex (p. 280).` };
}

/* Avantages Principaux disponibles pour une case -> [{def, ok, why}] */
function advOptions(det, slot) {
  const us = det.units[slot.i], u = us && UNITS[us.u];
  const ddef = detDef(det.type), da = ddef.foreign || armyOf(detFaction(det)), oaths = detOaths(det), onlyAdv = (oaths.find(o => o.onlyAdv) || {}).onlyAdv || ddef.onlyAdv;
  return DB.core.primeAdvantages.filter(a => (a.army ? a.army === da : !ddef.rankOnly) && (!a.onlyDetTypes || a.onlyDetTypes.includes(det.type)) && (!a.detFaction || a.detFaction === detFaction(det))
    && (!a.faction || a.faction === detFaction(det)) && (!a.oath || oaths.some(o => o.id === a.oath)) && (!a.legacy || legacyOn()) && (!onlyAdv || a.id === onlyAdv)).map(a => {
    let ok = true, why = '';
    const usedElsewhere = Object.entries(det.adv).some(([i, v]) => v === a.id && +i !== slot.i);
    const unlimited = paradigm() && paradigm().unlimitedAdv === a.id;
    if (u && (u.noPrime || hasRule(u, /^Inductii$/))) { ok = false; why = L`Inductii : aucun Avantage Principal ne peut être choisi pour cette unité.`; }
    else if (a.maxPerArmy && !unlimited && army.dets.reduce((n, d) => n + Object.entries(d.adv).filter(([i, v]) => v === a.id && !(d === det && +i === slot.i)).length, 0) >= a.maxPerArmy + (a.perArmyTrait ? army.dets.reduce((n, d) => n + Object.values(d.units).reduce((m, x) => m + (UNITS[x.u] && (UNITS[x.u].traits || []).includes(a.perArmyTrait) ? unitSize(x) : 0), 0), 0) : 0)) { ok = false; why = L`Limité à ${a.maxPerArmy} par armée${a.perArmyTrait ? L`, +1 par Figurine ` + a.perArmyTrait : ''}.`; }
    else if (a.oncePerDet && usedElsewhere) { ok = false; why = L`Déjà choisi dans ce détachement (une fois par détachement).`; }
    else if ((a.addsSlots || a.addSlot) && ddef.noSlotAdv && slot.role !== ddef.slotAdvRole) { ok = false; why = `${ddef.name} : ${L`Les Avantages Principaux qui ajoutent des cases de Rôle Tactique à un Détachement ne peuvent pas être choisis`}${ddef.slotAdvRole ? L`, sauf si ce Rôle Tactique est Engin de Guerre` : ''}.`; }
    else if (a.slotRole && slot.role !== a.slotRole) { ok = false; why = L`Réservé aux cases ${role(a.slotRole).name}.`; }
    else if (a.primaryOnly && det !== mainDet()) { ok = false; why = L`Seulement dans le Détachement Principal.`; }
    else if (a.allegiance && army.allegiance !== a.allegiance) { ok = false; why = L`Réservé aux armées ${a.allegiance}s.`; }
    else if (a.notWith && Object.values(det.adv).includes(a.notWith)) { ok = false; why = L`Incompatible avec ${advDef(a.notWith).name} dans le même détachement.`; }
    else if (u && a.needsSubtype && !hasType(u, new RegExp(a.needsSubtype))) { ok = false; why = L`L'unité doit inclure une figurine de Sous-type ${a.needsSubtype.split('|')[0]}.`; }
    else if (u && a.needsType && !hasType(u, new RegExp(a.needsType))) { ok = false; why = L`L'unité doit inclure une figurine de Type ${a.needsType.split('|')[0]}.`; }
    else if (u && a.notType && hasType(u, new RegExp(a.notType))) { ok = false; why = L`Impossible pour une unité de Type ou Sous-type ${a.notType.split('|')[0]}.`; }
    else if (u && a.needsTrait && !(hasTrait(u, new RegExp(a.needsTrait)) || detFaction(det) === a.needsTrait || (us && us.arcana === a.needsTrait))) { ok = false; why = L`Unité ${a.needsTrait} uniquement.`; }
    else if (u && a.id === 'exemplars' && (u.traits || []).some(t => LEGIONS().includes(t))) { ok = false; why = L`Exemplars of the Legion : l'unité État-major ne doit inclure que des Figurines ayant le Trait Shattered Legions.`; }
    else if (u && a.onlyType && !(u.types || []).every(t => new RegExp(a.onlyType).test(t))) { ok = false; why = L`Unité composée uniquement de Figurines de Type ${a.onlyType}.`; }
    else if (u && a.singleModel && unitSize(us) > 1) { ok = false; why = L`Unité d'une seule figurine.`; }
    else if (u && a.unitIds && !a.unitIds.includes(u.id)) { ok = false; why = L`Unité non concernée.`; }
    else if (u && a.needsUnitIds && !a.needsUnitIds.includes(u.id)) { ok = false; why = L`Réservé à : ${a.needsUnitIds.map(i => (UNITS[i] || {}).name || i).join(', ')}.`; }
    else if (u && us && a.needsModel && !new RegExp('^(' + a.needsModel + ')$').test(u.variants && us.variant != null ? u.variants[us.variant].name : u.models[0].name)) { ok = false; why = L`Réservé à : ${a.needsModel}.`; }
    else if (u && a.unitRole && ![].concat(a.unitRole).includes(u.role)) { ok = false; why = L`Réservé aux unités ${[].concat(a.unitRole).map(r => role(r).name).join(' ou ')}.`; }
    else if (a.allowsRole && u && u.role === a.allowsRole && slot.role !== a.allowsRole) { ok = true; }
    else if (u && hasType(u, /Unique/) && !a.uniqueOk) { ok = false; why = L`Unité Unique : seuls Affectation Spéciale et Bénéfice Logistique sont possibles (FAQ, Livre de Règles p. 283).`; }
    return { def: a, ok, why };
  });
}


const skitFree = d => { const r = DB.core.skitariiAlliesFree; return !!(r && armyOf(army.faction) === r.primary && armyOf(detFaction(d)) === r.allied); };
function validateApex(out, err) {
  for (const d of army.dets) { const def = detDef(d.type); if (!def) continue;
    const sl = slotsOf(d);
    if (def.mustFill && sl.some(x => x.i < 100 && !d.units[x.i])) err(L`${def.name} : toutes les cases doivent être occupées (${def.ref || ''}).`, d);
    if (def.forceAdv) for (const x of sl) { const want = def.forceAdv[x.role] || def.forceAdv['*']; if (want && d.units[x.i] && x.prime && d.adv[x.i] !== want) err(L`${def.name} : l'unité de la case ${role(x.role).name} doit recevoir l'Avantage Principal ${(advDef(want) || {}).name || want}.`, d, x.i); }
    if (def.needsOption) for (const x of sl) { const us = d.units[x.i], u = us && UNITS[us.u]; const need = u && def.needsOption[u.name]; if (need && !(u.options || []).some((o, oi) => { const ch = optChoices(o); return Object.keys(picksOf(us, oi)).some(k => ch[k] && new RegExp(need).test(ch[k].name)); })) err(L`${def.name} : ${u.name} doit inclure ${need}.`, d, x.i); }
  }
  for (const d of army.dets) { const k = detDef(d.type).kind; if (!['principal', 'allie'].includes(k)) continue;
    const fam = [d, ...army.dets.filter(x => x.parent === d.id)], all = fam.flatMap(x => Object.values(x.units).map(us => [us, UNITS[us.u]])).filter(([, u]) => u);
    if (all.some(([, u]) => u.machinaMalefica) && !all.some(([us, u]) => (u.traits || []).some(t => /H[ée]t[ée]rodoxe|Heterodox/.test(t)) || (u.options || []).some((o, oi) => /H[ée]t[ée]rodoxe/.test(o.text) && optCount(us, oi))))
      err(L`${detName(d)} : une unité Machina Malefica exige au moins une figurine Hétérodoxe dans le détachement ou ses détachements rattachés (Liber Mechanicum p. 63).`, d);
  }
}
function validateMore(out, err) {
  validateApex(out, err);
  const warn = (msg, det, slot) => out.push({ level: 'warn', msg, det: det && det.id, slot });
  const info = msg => out.push({ level: 'info', msg });
  const md = mainDef(), main = mainDet();
  const all = army.dets.flatMap(d => slotsOf(d).filter(s => d.units[s.i]).map(s => ({ d, s, us: d.units[s.i], u: UNITS[d.units[s.i].u] })).filter(x => x.u));
  for (const x of all) if (x.u.unverified) warn(L`${x.u.name} : profil issu de données communautaires non vérifiées (BSData). Vérifiez-le dans le Journal Tactica: Zone Mortalis.`, x.d, x.s.i);
  // Legacies
  const ad = armyDef();
  if (!legacyOn() && (ad.legacy || factionInfo(army.faction).legacy)) err(L`${army.faction} : liste Legacies, décochez « Exclure les unités Legacies » (étape 1).`);
  for (const d of army.dets) { const f = detFaction(d), a = (DB.core.armies || []).find(x => x.factions.includes(f)); if (!legacyOn() && d !== main && f && ((a && a.legacy) || factionInfo(f).legacy)) err(L`${detName(d)} : Faction ${f} issue des Legacies, décochez « Exclure les unités Legacies » (étape 1).`, d); }
  if (ad.incomplete) info(ad.incomplete);
  if (ad.allegiance && army.allegiance !== ad.allegiance) err(L`Une armée ${ad.name} est forcément ${ad.allegiance}.`);
  const fi = factionInfo(army.faction); if (fi.allegiance && fi.allegiance !== army.allegiance) err(L`${army.faction} : réservé aux armées d'Allégeance ${fi.allegiance}.`);
  // Détachement Principal alternatif
  if (md.needsTrait && !all.some(x => hasTrait(x.u, new RegExp(md.needsTrait)))) err(L`${md.name} : une armée utilisant ce Détachement Principal doit inclure au moins une Figurine ayant le Trait Maître de la Légion.`, main);
  if (md.armyRule && md.armyRule.level === 'warn') for (const x of all) if (!hasType(x.u, new RegExp(md.armyRule.match)) && !isVeh(x.u)) warn(L`${x.u.name} — ${md.name} : ${md.armyRule.why}`, x.d, x.s.i);
  if (md.decurionCommand) for (const x of all.filter(x => x.d === main && ['QG', 'EM'].includes(x.s.role) && x.u.role !== x.s.role)) {
    const up = x.us.upgrade != null && x.u.upgrades ? x.u.upgrades[x.us.upgrade].name : '';
    if (x.s.role === 'QG' ? !/Magna/.test(up) : !/D[ée]curion/.test(up)) err(L`${x.u.name} : ${x.s.role === 'QG' ? L`amélioration Decurion Magna obligatoire pour occuper une case Quartier Général` : L`une amélioration Decurion est obligatoire pour occuper une case État-major`} (${md.name}).`, x.d, x.s.i);
  }
  if (md.preArranged) info(L`${md.name} : recommandé seulement pour les parties convenues à l'avance (Orbital Drop Protocols).`);
  for (const d of army.dets) { const def = detDef(d.type); if (def.dynSlots) { const n = dynCount(d, def); for (const i of Object.keys(d.units).map(Number).filter(i => i >= 300 + n && i < 400)) err(L`${def.name} : case ajoutée en trop (${def.dynSlots.why})`, d, i); } }
  // Shattered Legions
  if (army.faction === 'Shattered Legions') { const n = (army.shattered || []).length, S = DB.core.shattered;
    if (n < S.min || n > S.max) err(L`Shattered Legions : choisissez deux ou trois Légions à l'étape 2 (${n} choisie(s)).`); }
  // Blackshields : Serments
  const O = DB.core.oaths || {};
  for (const d of army.dets) { const k = detDef(d.type).kind, ids = d.oaths || [];
    if (!ids.length) continue;
    if (detFaction(d) !== 'Blackshields' || !(O.perDet || {})[k]) { err(L`${detName(d)} : les Oaths of Moment sont réservés aux Détachements Principaux ou Alliés Blackshields.`, d); continue; }
    if (ids.length > O.perDet[k]) err(L`${detName(d)} : ${ids.length} Oaths of Moment pour ${O.perDet[k]} autorisé(s) (Détachement ${k === 'principal' ? L`Primary` : L`Allied`}).`, d);
    for (const id of ids) { const o = oathDef(id); for (const x of o.excl || []) if (ids.includes(x)) err(L`${detName(d)} : ${o.name} ne peut pas être choisi avec ${oathDef(x).name}.`, d); }
    if (ids.includes('panoply') && !d.panoplyLegion) warn(L`${detName(d)} : Panoply of Old, choisissez une Armurerie de Légion.`, d);
  }
  // Provenances
  if (armyOf(army.faction) === 'mil' || army.dets.some(d => armyOf(detFaction(d)) === 'mil')) { const P = DB.core.provenances, ps = army.provenances || [];
    const cap = P.base + (all.some(x => hasTrait(x.u, new RegExp(P.bonusTrait))) ? 1 : 0);
    if (ps.length > cap) err(L`Provenances of War : ${ps.length} choisie(s) pour ${cap} autorisée(s) (${P.note})`);
    for (const p of ps.map(provDef).filter(Boolean)) if (p.allegiance && p.allegiance !== army.allegiance) err(L`Provenance ${p.name} : Allégeance Renégate uniquement.`);
  }
  // Mechanicum : une seule variante de Faction par Auxiliaire / Apex ; pas de variante commune entre Allié et Principal (FAQ)
  const arc = d => new Set(Object.entries(d.units).filter(([i]) => !(d.bonusRole && +i === detDef(d.type).slots.length)).map(([, us]) => UNITS[us.u] && unitArcana(UNITS[us.u], us)).filter(Boolean));
  for (const d of army.dets) for (const [i, us] of Object.entries(d.units)) if (d.adv[i] === 'we-enchaines') { const [od, oi] = String(us.chainWith || '').split(':'), o = army.dets.find(x => x.id === od), ous = o && o.units[oi]; if (!ous) err(L`${UNITS[us.u].name} — Enchaînés : choisissez l'autre Unité État-major World Eaters (Frères de Chaîne).`, d, +i); }
  if (army.dets.filter(d => detDef(d.type).kind === 'sdg').length > 1) err(L`Un seul Détachement de Seigneur de Guerre par armée (p. 281).`);
  for (const d of army.dets) { const k = detDef(d.type).kind; if (['aux', 'apex'].includes(k) && armyOf(detFaction(d)) === 'mech' && arc(d).size > 1) err(L`${detName(d)} : une seule variante de Faction Mechanicum par Détachement Auxiliaire ou d'Apex (${[...arc(d)].join(', ')}).`, d); }
  if (armyOf(army.faction) === 'mech') { const pa = arc(main); for (const d of army.dets.filter(d => detDef(d.type).kind === 'allie' && armyOf(detFaction(d)) === 'mech')) { const both = [...arc(d)].filter(x => pa.has(x)); if (both.length) err(L`${detName(d)} : un Détachement Allié ne peut pas inclure d'unités ayant le même Trait de Faction Mechanicum que le Détachement Principal (${both.join(', ')}) (FAQ).`, d); } }
  for (const x of all) if ((x.u.traits || []).includes('[Mechanicum]') && !x.us.arcana) out.push({ level: 'warn', msg: L`${x.u.name} : choisissez sa variante de Faction Mechanicum (Techno-arcane).`, det: x.d.id, slot: x.s.i });
  // Transport
  const load = {};
  for (const x of all) if (x.us.embark) {
    const [did, si] = x.us.embark.split(':'), td = army.dets.find(d => d.id === did), tus = td && td.units[si], tu = tus && UNITS[tus.u];
    if (!tu) { err(L`${x.u.name} : son transport n'est plus dans la liste.`, x.d, x.s.i); continue; }
    if (isVeh(x.u)) err(L`${x.u.name} : un Véhicule ne peut pas embarquer.`, x.d, x.s.i);
    else if (!hasType(x.u, /Infanterie|Infantry/) && !hasRule(tu, /Baie de Transport|Transport Bay/)) err(L`${x.u.name} : seule l'Infanterie peut embarquer à bord de ${tu.name}.`, x.d, x.s.i);
    const w = x.u.models.reduce((a, m) => a + m.count * bulk(x.u, m.name), 0) + (x.us.extra || 0) * bulk(x.u, (x.u.extra || {}).model);
    const key = x.us.embark; load[key] = load[key] || { tu, tus, td, si, n: 0, who: [] }; load[key].n += w; load[key].who.push(x.u.name);
  }
  for (const Q of Object.values(load)) { const cap = capacity(Q.tu, Q.td, Q.si); if (!cap) err(L`${Q.tu.name} n'est pas un Transport : ${Q.who.join(', ')} ne peut pas y embarquer.`, Q.td, +Q.si); else if (Q.n > cap) err(L`${Q.tu.name} : ${Q.n} places occupées pour une Capacité de Transport de ${cap} (${Q.who.join(', ')} ; Massif (X) compte X places).`, Q.td, +Q.si); }
  // Options qui remplacent la même pièce d'équipement
  for (const x of all) { const groups = {};
    (x.u.options || []).forEach((o, oi) => { const m = o.text.match(/(?:[Rr]emplacer|échanger) (?:le |la |l'|les |son |sa |ses )?([^:,(]+?)$|exchange (?:its |their )?([^:,(]+?)$|have (?:its|their) ([^,]+?) (?:exchanged|replaced)/); if (!m) return;
      const w = (m[1] || m[2] || m[3]).trim().toLowerCase(); if (/ et | ou | and | or |\/|chaque|each/.test(w)) return; (groups[w] = groups[w] || []).push(oi); });
    for (const [w, ois] of Object.entries(groups)) if (ois.length > 1) { const n = ois.reduce((a, oi) => a + optCount(x.us, oi), 0), size = unitSize(x.us);
      if (n > size) err(L`${x.u.name} : ${n} remplacements du même équipement (« ${w} ») pour ${size} figurine${size > 1 ? 's' : ''} : ces options s'excluent.`, x.d, x.s.i); }
  }
  // Sires : conditions d'équipement non vérifiables automatiquement
  const sr = sireRule(); if (sr && sireActive() && sr.note) warn(L`${sr.name} : vérifiez que ${sr.note}.`, main);
  // Paradigme de Maisonnée
  const pg = paradigm(); if (pg) info(L`Paradigme de Maisonnée ${pg.name} : ${pg.summary}`);
}

/* Validation complète -> [{level:'err'|'warn', msg, det?, slot?}] */
function validate() {
  const out = [], lim = army.limit, total = armyPoints();
  const err = (msg, det, slot) => out.push({ level: 'err', msg, det: det && det.id, slot });
  if (total > lim) err(L`Total de ${total} pts : dépasse la Limite de Points de ${lim} de ${total - lim} pts (Livre de Règles p. 279).`);
  validateMore(out, err);
  // contrôles de cohérence (listes importées ou modifiées après coup)
  { const cnt = k => army.dets.filter(d => detDef(d.type).kind === k).length;
    if (cnt('principal') > 1) err(L`Une armée comprend un seul Détachement Principal (Livre de Règles p. 280).`);
    if (cnt('sdg') > 1) err(L`Un seul Détachement de Seigneur de Guerre par armée (p. 281).`);
    if (cnt('sdb') > 1) err(L`Un seul Détachement de Seigneur des Batailles par armée (p. 281).`);
    if (cnt('fort') > 1) err(L`Un seul Battlefield Fortifications Detachment par armée.`); }
  for (const det of army.dets) {
    const keys = new Set(slotsOf(det).map(x => String(x.i)));
    for (const [k, us] of Object.entries(det.units)) if (us && !keys.has(String(k))) err(L`${(UNITS[us.u] || {}).name || us.u} : unité sans case dans ${detName(det)} (case ajoutée supprimée) ; retirez-la.`, det);
    if (det.bonusRole && ['QG', 'EM', 'SG', 'SB', 'FO'].includes(det.bonusRole) && slotsOf(det).some(x => x.bonus && x.role === det.bonusRole && !x.added)) err(L`${detName(det)} : la case de Bénéfice Logistique ne peut pas être de Rôle ${role(det.bonusRole).name} (p. 283).`, det);
    for (const x of slotsOf(det)) if (x.legion && det.units[x.i] && !(army.shattered || []).includes(x.legion)) err(L`Case Exemplars of the Legion : la Légion ${x.legion} ne fait pas partie des Shattered Legions choisies (étape 2).`, det, x.i);
    for (const [k, us] of Object.entries(det.units)) { const v = us && us.vow && vowDef(us.vow); if (v && v.paradigm && v.paradigm !== army.faction) err(L`${(UNITS[us.u] || {}).name} : ${v.name} est réservé au Paradigme ${v.paradigm}.`, det, +k); }
  }
  const main = mainDet();
  let allied = 0, lords = 0;
  for (const det of army.dets) {
    const def = detDef(det.type), slots = slotsOf(det);
    if (!Object.keys(det.units).length) err(L`${def.name} : chaque détachement doit inclure au moins une unité (p. 279).`, det);
    if (def.kind === 'allie') {
      if (!skitFree(det)) allied += detPoints(det);
      if (!det.faction) err(L`${def.name} : choisissez sa Faction.`, det);
      else if (det.faction === army.faction) err(L`${def.name} : doit être d'une Faction différente de celle du Détachement Principal (${army.faction}) (p. 281).`, det);
    }
    if (det.parent) { const p = army.dets.find(d => d.id === det.parent); if (p && detDef(p.type).kind === 'allie' && !skitFree(p)) allied += detPoints(det); }
    if (def.faction && def.faction !== army.faction) err(L`${def.name} : réservé aux armées dont le Détachement Principal est ${def.faction}.`, det);
    if (def.doctrine && army.doctrine !== def.doctrine) err(L`${def.name} : nécessite la doctrine correspondante (étape 2).`, det);
    if (def.needsUnit && !hasUnitNamed(def.needsUnit)) err(L`${def.name} : nécessite dans l'armée une unité ${def.needsUnit.join(' ou ')}.`, det);
    if (def.kind === 'sdb' && !det.faction) err(L`${def.name} : choisissez sa Faction.`, det);
    if (def.kind === 'sdg') {
      if (lim < 3000) err(L`${def.name} : interdit sous 3000 points (p. 281).`, det);
      if (!Object.values(det.units).some(us => UNITS[us.u] && hasType(UNITS[us.u], /Parangon|Paragon/))) err(L`${def.name} : doit inclure au moins une figurine de Type Parangon (p. 281).`, det);
    }
    for (const s of slots) {
      const us = det.units[s.i]; if (!us) { if (det.adv[s.i] && det.adv[s.i] !== 'affectation') err(L`${def.name} : un Avantage Principal est choisi sur une case vide.`, det, s.i); continue; }
      const u = UNITS[us.u];
      if (!u) { err(L`${def.name} : unité inconnue de la base de données (« ${us.u} »).`, det, s.i); continue; }
      if (u.role === 'SB' || u.role === 'SG') lords += unitPoints(us);
      const a = unitAllowed(det, s, u); if (!a.ok) err(L`${u.name} (${def.name}) : ${a.why}`, det, s.i);
      if (det.adv[s.i]) {
        if (!s.prime) err(L`${u.name} : cette case n'est pas une Case Principale, aucun Avantage Principal possible.`, det, s.i);
        else { const o = advOptions(det, s).find(x => x.def.id === det.adv[s.i]); if (!o) err(L`${u.name} — Avantage Principal « ${(advDef(det.adv[s.i]) || {}).name || det.adv[s.i]} » : indisponible pour cette armée ou cette unité (Livre de Règles p. 283).`, det, s.i); else if (!o.ok) err(L`${u.name} — ${o.def.name} : ${o.why}`, det, s.i); }
      }
      if (u.extra && (us.extra || 0) > u.extra.max) err(L`${u.name} : ${u.extra.max} ${u.extra.model} supplémentaire(s) au maximum.`, det, s.i);
      (u.options || []).forEach((o, oi) => {
        const n = optCount(us, oi), m = optMax(o, us);
        if (n > m && !o.eachChoice) err(L`${u.name} — « ${optText(o)} » : ${n} sélection(s) pour ${m} autorisée(s).`, det, s.i);
        else if (n && !o.eachChoice) { const av = optAvail(o, us, oi); if (n > av.cap) err(L`${u.name} — « ${optText(o)} » : ${n} sélection(s) mais ${av.why || L`plus assez de figurines`}.`, det, s.i); }
        if (n && o.eachChoice) { const av = optAvail(o, us, oi), pc = o.max === 'models' || o.max === 'all' ? av.cap : Math.min(av.cap, 1); for (const [k, q] of Object.entries(picksOf(us, oi))) if (q > pc) err(L`${u.name} — « ${optText(o)} » : ${q} × ${trData((optChoices(o)[k] || {}).name || '')} pour ${pc} autorisé(s).`, det, s.i); }
        if (n && o.onlyVariant != null && us.variant !== o.onlyVariant) err(L`${u.name} — « ${optText(o)} » : réservé à ${trData(((u.variants || [])[o.onlyVariant] || {}).name || '')}.`, det, s.i);
        if (us.upgrade != null && u.upgrades && oi === 0) { const g = u.upgrades[us.upgrade], ok = g && upgradeOk(u, us, g); if (ok && !ok.ok) err(L`${u.name} — ${g.name} : ${ok.why}.`, det, s.i); }
        if (n && o.advOpt && det.adv[s.i] !== o.advOpt) err(L`${u.name} — « ${optText(o)} » : réservé à l'Avantage ${(advDef(o.advOpt) || {}).name}.`, det, s.i);
        if (!n && o.advOpt && o.required && det.adv[s.i] === o.advOpt) err(L`${u.name} — ${(advDef(o.advOpt) || {}).name} : « ${optText(o)} » est obligatoire.`, det, s.i);
        if (n && !o.advOpt && advDef(det.adv[s.i]) && advDef(det.adv[s.i]).noUnitOptions) err(L`${u.name} — ${advDef(det.adv[s.i]).name} : l'unité ne peut prendre aucune autre option.`, det, s.i);
        if (n && supersededBy(u, oi)) err(L`${u.name} — « ${optText(o)} » : remplacée par la version Legacies de cette option.`, det, s.i);
        if (n && o.allOrNothing && n !== m) err(L`${u.name} — « ${optText(o)} » : toutes les figurines ou aucune.`, det, s.i);
        if (n && ((o.allegiance && army.allegiance !== o.allegiance) || (o.arcana && us.arcana !== o.arcana) || (o.notArcana && us.arcana === o.notArcana) || (o.slotRole && s.role !== o.slotRole))) err(L`${u.name} — « ${optText(o)} » : non autorisé ici (${o.allegiance || o.arcana || o.notArcana || role(o.slotRole).name}).`, det, s.i);
        if (n && o.faction && !itemState(o, u, det).show) err(L`${u.name} — « ${optText(o)} » : réservé aux ${o.faction}.`, det, s.i);
        if (n && o.prov && !(army.provenances || []).includes(o.prov)) err(L`${u.name} — « ${optText(o)} » : Provenance non choisie (étape 2).`, det, s.i);
        if (n && o.oath && !detOaths(det).some(x => x.id === o.oath)) err(L`${u.name} — « ${optText(o)} » : Oath of Moment non choisi.`, det, s.i);
        if (o.oath && !n && detOaths(det).some(x => x.id === o.oath)) out.push({ level: 'warn', msg: L`${u.name} — The Weapons of Desperation : choisissez les armes de remplacement des bolters et pistolets bolters.`, det: det.id, slot: s.i });
        if (n && o.onePerDet && Object.entries(det.units).some(([j, x]) => +j !== s.i && x.u === us.u && optCount(x, oi))) err(L`${u.name} — « ${optText(o)} » : une seule unité par détachement.`, det, s.i);
        if (n && o.legacy && !legacyOn()) err(L`${u.name} — « ${optText(o)} » : option Legacies, décochez « Exclure les unités Legacies » (étape 1).`, det, s.i);
        const ch2 = optChoices(o); for (const k of Object.keys(picksOf(us, oi))) { const c = ch2[k]; if (c) { const st = itemState(c, u, det, us); if (!st.show) err(L`${u.name} — ${c.name} : ${st.why}.`, det, s.i); } }
        const offered = !(o.advOpt && det.adv[s.i] !== o.advOpt) && !(o.faction && !itemState(o, u, det, us).show) && !(o.legacy && !legacyOn()) && !(o.allegiance && army.allegiance !== o.allegiance) && !(o.prov && !(army.provenances || []).includes(o.prov)) && !(o.oath && !detOaths(det).some(x => x.id === o.oath)) && !(o.arcana && us.arcana !== o.arcana) && !(o.notArcana && us.arcana === o.notArcana) && !(o.slotRole && s.role !== o.slotRole) && optAvail(o, us, oi).cap > 0;
        const req = offered && (o.required || /obligatoire/i.test(o.text)) && !(o.onlyVariant != null && us.variant !== o.onlyVariant);
        { const need = typeof o.max === 'number' ? o.max : (o.max === 'models' || o.max === 'others' ? optMax(o, us) : 1); if (req && n < need && !(u.options || []).some((o2, j) => j !== oi && (/^Ou /.test(o2.text) || (o.exclusive && o2.exclusive === o.exclusive)) && optCount(us, j))) err(L`${u.name} — « ${optText(o)} » : choix obligatoire (${n}/${need}).`, det, s.i); }
        if (o.allSame && (n !== m || Object.keys(picksOf(us, oi)).length !== 1)) err(L`${u.name} — « ${optText(o)} » : choisissez une seule et même arme pour les ${m} figurines.`, det, s.i);
        if (o.notVariant != null && us.variant === o.notVariant && n) err(L`${u.name} — « ${optText(o)} » : option inaccessible à ${u.variants[us.variant].name}.`, det, s.i);
      });
    }
    if (det.bonusRole && !Object.values(det.adv).includes('logistique')) err(L`${def.name} : case supplémentaire sans Avantage Bénéfice Logistique.`, det);
  }
  // droits à détachements
  const apex = childrenOf(main, 'apex').length, gm = grants(main);
  if (apex > gm.flex) err(L`${apex} Détachement(s) d'Apex pour ${gm.flex} case(s) Quartier Général occupée(s) : chaque Apex requiert une case QG occupée (p. 280).`);
  for (const p of [main, ...army.dets.filter(d => detDef(d.type).kind === 'allie')]) {
    const g = grants(p), kids = childrenOf(p, 'aux'), cap = g.aux + (p === main ? Math.max(0, g.flex - apex) : 0);
    if (auxUse(kids) > cap) err(L`${detName(p)} : ${auxUse(kids)} Détachement(s) Auxiliaire(s) rattaché(s) pour ${cap} autorisé(s) par ses cases État-major${p === main ? L` et Quartier Général` : ''} (p. 280).`, kids[kids.length - 1]);
    const need = {};
    for (const k of kids) { const r = detDef(k.type).requires; if (r) need[r] = (need[r] || []).concat(k); }
    for (const [r, ks] of Object.entries(need)) if (auxUse(ks) > (g.by[r] || 0))
      err(L`${detName(ks[0])} : nécessite une unité « ${r} » dans une case État-major de ${detName(p)} (${g.by[r] || 0} droit(s) pour ${ks.length} détachement(s)).`, ks[ks.length - 1]);
  }
  const md = modeDef();
  if (md.limit && lim !== md.limit) err(L`${md.name} : la Limite de Points est fixée à ${md.limit} points (${md.ref || ''}).`);
  if (md.ban || md.warn) for (const det of army.dets) for (const [i, us] of Object.entries(det.units)) {
    const u = UNITS[us.u]; if (!u) continue;
    for (const b of md.ban || []) if (hasType(u, new RegExp(b.match))) err(L`${u.name} — ${md.name} : ${b.why}.`, det, +i);
    for (const w of md.warn || []) if ((w.match && hasType(u, new RegExp(w.match))) || (w.rule && (u.rules || []).some(r => { const q = r.split(' : '); const who = us.variant != null && u.variants ? u.variants[us.variant].name : u.models[0].name; return q[q.length - 1].startsWith(w.rule) && (q.length < 2 || !u.variants || q[0] === who); }))) out.push({ level: 'warn', msg: L`${u.name} — ${w.why}.`, det: det.id, slot: +i });
  }
  { const seen = {}; army.dets.forEach(d => Object.values(d.units).forEach(x => { if (x && x.vow) seen[x.vow] = (seen[x.vow] || 0) + 1; })); for (const [k, n] of Object.entries(seen)) if (n > 1) err(L`${(vowDef(k) || {}).name || k} : un même Vœu Questoris ne peut être déclaré que pour un seul Chevalier (ici ${n}).`); }
  for (const [a, b] of DB.core.exclusive || []) { const has = id => army.dets.some(d => Object.values(d.units).some(x => x && x.u === id)); if (has(a) && has(b)) err(L`${UNITS[a] ? UNITS[a].name : a} et ${UNITS[b] ? UNITS[b].name : b} ne peuvent pas figurer dans la même armée.`); }
  { const r = sireRule(); if (r && sireActive()) out.push({ level: 'info', msg: L`${r.name} : les cases Troupes du Détachement Principal sont Principales${r.note ? ' (' + r.note + ')' : ''}.` }); }
  { const r = riteDef(); if (r && r.allegiance && r.allegiance !== army.allegiance) err(L`Rite de Guerre ${r.name} : réservé aux armées d'Allégeance ${r.allegiance} (étape 2).`); }
  if (armyDef().needsMode && (army.mode || 'croisade') !== armyDef().needsMode) err(L`Une armée ${armyDef().name} n'est jouable qu'en mode ${(DB.core.modes.find(m => m.id === armyDef().needsMode) || {}).name} (étape 1).`);
  for (const det of army.dets) { const d2 = detDef(det.type);
    if ((armyDef().forbid || []).includes(d2.kind)) err(L`${d2.name} : indisponible pour une armée ${armyDef().name}.`, det);
    if (d2.kind === 'principal' && d2.id !== (armyDef().mainDet || 'principal') && !(d2.alt && d2.army === armyOf(army.faction))) err(L`Le Détachement Principal d'une armée ${armyDef().name} n'est pas « ${d2.name} » : revenez à l'étape 2.`, det);
  }
  for (const d2 of DB.detachments.filter(d => d.kind === 'addl')) { const n = army.dets.filter(d => d.type === d2.id).length, h = countAdv(d2.unlockedBy) + (paradigm() && paradigm().freeDet === d2.id ? 1 : 0); if (n > h) err(L`${d2.name} : ${n} détachement(s) pour ${h} Avantage(s) « ${advDef(d2.unlockedBy).name} ».`); }
  const half = Math.ceil(lim * 0.5), quarter = Math.ceil(lim * 0.25);
  if (allied > half && !armyDef().alliesUncapped) err(L`Détachements Alliés : ${allied} pts, au-delà des 50 % de la Limite de Points (${half} pts) (p. 281).`);
  if (lords > quarter && !armyDef().lordsUncapped) err(L`Seigneurs de Guerre et Seigneurs des Batailles : ${lords} pts, au-delà des 25 % de la Limite de Points (${quarter} pts) (p. 281).`);
  if (!md.limit && (lim < 2000 || lim > 4000)) out.push({ level: 'warn', msg: L`Les limites inférieures à 2000 ou supérieures à 4000 points sortent du cadre des Règles de Base et peuvent être déséquilibrées (p. 278).` });
  return out;
}

/* ---------- Persistance ---------- */
/* Signature de chaque option choisie : si la base change l'ordre des options, les choix suivent leur option. */
const optText = o => (LANG !== 'fr' && o && o.textEn) || (o && o.text);
const optSig = o => { let h = 5381; for (const ch of String(o && o.text || '')) h = (h * 33 ^ ch.charCodeAt(0)) >>> 0; return h.toString(36); };
const optIndex = (u, key) => (u.options || []).findIndex((o, oi) => String(okey(u, oi)) === String(key));
function stampArmy(a) { for (const d of a.dets || []) for (const us of Object.values(d.units || {})) { const u = UNITS[us.u]; if (!u) continue; us.sig = {}; for (const k of Object.keys(us.opts || {})) { const oi = optIndex(u, k); if (oi >= 0 && Object.keys(us.opts[k] || {}).length) us.sig[k] = optSig(u.options[oi]); } } return a; }
function migrateArmy(a) {
  const notes = [];
  if (!Array.isArray(a.dets)) a.dets = [];
  const nd = a.dets.length; a.dets = a.dets.filter(d => d && typeof d === 'object' && detDef(d.type)); if (a.dets.length < nd) notes.push(L`détachement inconnu de la base retiré`);
  for (const d of a.dets) { if (!d.units || typeof d.units !== 'object' || Array.isArray(d.units)) d.units = {}; if (!d.adv || typeof d.adv !== 'object') d.adv = {}; if (!d.id) d.id = uid(); }
  if (!a.dets.some(d => detDef(d.type).kind === 'principal')) { a.dets.unshift(newArmy().dets[0]); notes.push(L`Détachement Principal absent : ajouté vide`); }
  for (const d of a.dets || []) for (const us of Object.values(d.units || {})) {
    const u = UNITS[us.u]; if (!u) { notes.push(L`unité introuvable dans la base (${us.u}) : conservée telle quelle`); continue; }
    { const mx = u.extra ? u.extra.max : 0, e = Math.floor(+us.extra || 0); us.extra = Math.max(0, Math.min(mx, e)); if (!us.extra) delete us.extra;
      if (us.variant != null && !(u.variants && u.variants[us.variant])) delete us.variant;
      for (const k of Object.keys(us.opts || {})) { const pk = us.opts[k]; if (!pk || typeof pk !== 'object') { delete us.opts[k]; continue; } for (const c of Object.keys(pk)) { const q = Math.floor(+pk[c] || 0); if (q > 0) pk[c] = q; else delete pk[c]; } } }
    if (!us.sig) continue;
    const moved = {};
    for (const [k, sig] of Object.entries(us.sig)) {
      const oi = optIndex(u, k); if (oi >= 0 && optSig(u.options[oi]) === sig) { moved[k] = us.opts[k]; continue; }
      const j = (u.options || []).findIndex((o, jj) => optSig(o) === sig && !(String(okey(u, jj)) in moved));
      if (j >= 0) { moved[okey(u, j)] = us.opts[k]; notes.push(L`${u.name} : option déplacée par la mise à jour, choix conservé`); }
      else notes.push(L`${u.name} : une option choisie n'existe plus dans la base, à vérifier`);
    }
    for (const [k, v] of Object.entries(us.opts || {})) if (!(k in us.sig) && !(k in moved)) moved[k] = v;
    us.opts = moved; stampArmy({ dets: [{ units: { x: us } }] });
  }
  return notes;
}
const store = {
  raw() { try { return localStorage.getItem('30k.lists'); } catch (e) { return null; } },
  all() { const r = this.raw(); if (!r) return {}; try { return JSON.parse(r); } catch (e) { const b = LS.get('30k.lists.bak', null); return b || {}; } },
  safe() { const r = this.raw(); if (!r) return true; try { JSON.parse(r); return true; } catch (e) { return false; } },
  save(a) {
    if (!this.safe()) { if (!this.warned) { this.warned = 1; alert(L`Vos listes enregistrées semblent abîmées : rien n'a été écrasé. Ouvrez Réglages > Mes listes > Créer un fichier de sauvegarde.`); } return false; }
    const l = this.all(); a.updated = Date.now(); stampArmy(a); l[a.id] = JSON.parse(JSON.stringify(a));
    const ok = LS.set('30k.lists', l); LS.set('30k.last', a.id);
    if (!ok && !this.warned) { this.warned = 1; alert(L`Impossible d'enregistrer la liste : la mémoire de l'application est pleine ou bloquée (navigation privée ?). Créez un fichier de sauvegarde dans Réglages > Mes listes.`); }
    return ok;
  },
  backup() { const r = this.raw(); if (r && this.safe() && Date.now() - +LS.get('30k.bakTime', 0) > 864e5) { LS.set('30k.lists.bak', JSON.parse(r)); LS.set('30k.bakTime', Date.now()); } },
  remove(id) { const l = this.all(); delete l[id]; LS.set('30k.lists', l); }
};
let saveT = null;
const HIST = { back: [], fwd: [], last: null };
function snap() { const j = JSON.stringify(army); if (HIST.last && HIST.last !== j && JSON.parse(HIST.last).id === army.id) { HIST.back.push(HIST.last); if (HIST.back.length > 60) HIST.back.shift(); HIST.fwd = []; } HIST.last = j; }
function undo(dir) {
  const from = dir > 0 ? HIST.fwd : HIST.back, to = dir > 0 ? HIST.back : HIST.fwd; if (!from.length) return flash(dir > 0 ? L`Rien à rétablir.` : L`Rien à annuler.`);
  const nx = JSON.parse(from[from.length - 1]); if (nx.id !== army.id) { HIST.back = []; HIST.fwd = []; return flash(dir > 0 ? L`Rien à rétablir.` : L`Rien à annuler.`); }
  to.push(JSON.stringify(army)); army = JSON.parse(from.pop()); HIST.last = JSON.stringify(army); sel = null; document.body.classList.remove('editing'); store.save(army); render(); flash(dir > 0 ? L`Rétabli.` : L`Annulé.`);
}
function tidy() { for (const d of army.dets) for (const us of Object.values(d.units)) { const u = UNITS[us.u]; if (u) (u.options || []).forEach((o, oi) => { if (!o.allOrNothing) return; const pk = picksOf(us, oi), k = Object.keys(pk).find(x => pk[x] > 0), m = optMax(o, us); if (k != null && m > 1 && pk[k] !== m) pk[k] = m; }); }
  for (const d of army.dets) { const prime = new Set(slotsOf(d).filter(x => x.prime).map(x => String(x.i))); for (const i of Object.keys(d.adv || {})) if (!d.units[i] || !prime.has(String(i))) delete d.adv[i]; } }
function touch() { tidy(); snap(); clearTimeout(saveT); saveT = setTimeout(() => store.save(army), 250); render(); }

/* ---------- Rendu ---------- */
const ROLECAT = { SG: 'cmd', QG: 'cmd', EM: 'cmd', SU: 'cmd', TR: 'line', EL: 'elite', AR: 'fast', RE: 'fast', AP: 'heavy', AL: 'heavy', BL: 'heavy', EG: 'heavy', SB: 'lord', TP: 'trans', TL: 'trans', FO: 'fort' };
const unitLabel = (us, u) => (us && us.label && String(us.label).trim()) || (u ? u.name : us.u);
function slotGlyph(s, filled) {
  const r = role(s.role), t = String(r.short || s.role).toUpperCase();
  const crown = s.prime ? '<path class="crown" d="M-15-27 -9-35 -3-28 0-37 3-28 9-35 15-27z"/>' : '';
  return `<svg viewBox="-34 -40 68 74" class="glyph c-${ROLECAT[s.role] || 'other'}${filled ? ' on' : ''}${s.bonus ? ' bonus' : ''}${s.prime ? ' prime' : ''}" aria-hidden="true">${crown}<rect x="-27" y="-24" width="54" height="50" rx="9"/><text y="10" text-anchor="middle"${t.length > 2 ? ' textLength="42" lengthAdjust="spacingAndGlyphs"' : ''}>${t}</text></svg>`;
}
/* Résumé lisible des cases d'un détachement : « 1 QG · 2 EM · 4 TR » (Principales comprises) */
function slotSummary(slots) {
  const n = {}, p = {}; for (const x of slots) { const k = (x.roles || [x.role]).map(r => String(role(r).short || r).toUpperCase()).join('/'); n[k] = (n[k] || 0) + 1; if (x.prime) p[k] = (p[k] || 0) + 1; }
  return el('span', { class: 'rsum' }, Object.entries(n).map(([k, v]) => el('span', { class: 'rs', title: k }, el('b', {}, v + ' ' + k), p[k] ? el('i', {}, L` dont ${p[k]} principale${p[k] > 1 ? 's' : ''}`) : null)));
}
function ruleChip(name) {
  const has = lookupRule(name);
  return el('button', { class: 'chip' + (has ? '' : ' plain'), type: 'button', 'data-rule': name }, name);
}
/* Règles de l'unité selon la version choisie : « Version : règle » n'est gardé que pour la figurine présente. */
function unitRules(u, us) {
  const cur = us && us.variant != null && u.variants ? u.variants[us.variant].name : null;
  const names = new Set(cur ? [cur] : u.models.map(m => m.name).concat(u.profiles.map(p => p.name)));
  const single = u.models.length === 1 && (u.models[0].count || 1) === 1;
  const out = [];
  for (const r of u.rules || []) {
    const i = r.indexOf(' : '); if (i < 0) { out.push(r); continue; }
    const who = r.slice(0, i), what = r.slice(i + 3);
    const variantNames = u.variants ? [u.models[0].name].concat(u.variants.map(v => v.name)) : [];
    if (variantNames.includes(who) || single) { if (who === (cur || u.models[0].name) || !variantNames.length) out.push(what); }
    else if (names.has(who) || !u.profiles.some(p => p.name === who)) out.push(r);
  }
  return [...new Set(out)];
}
function lookupRule(name) {
  name = name.split(' : ').pop().replace(/\s*\((?:[^)]*seulement|[^)]* only)\)\s*$/, '');
  let base = name.replace(/\s*\([^)]*\)/, '').trim();
  const al = (DB.core.ruleAliases || {})[base];
  if (al) { name = name.replace(base, al); base = al; }
  const r = DB.rules[name] || DB.rules[base + ' (X)'] || DB.rules[base];
  return typeof r === 'string' ? { summary: r } : r;
}
function focusKey(e) { if (!e || e === document.body || !document.body.contains(e)) return null; const lab = x => x.tagName + '|' + (x.id || x.getAttribute('aria-label') || x.name || (x.textContent || '').trim().slice(0, 50) || x.value || ''); const k = lab(e), all = [...document.querySelectorAll(e.tagName)].filter(x => lab(x) === k); return { k, n: all.indexOf(e), tag: e.tagName, lab }; }
function restoreFocus(f) { if (!f) return; const all = [...document.querySelectorAll(f.tag)].filter(x => f.lab(x) === f.k), t = all[f.n] || all[0]; if (t && t !== document.activeElement && !t.disabled) { try { t.focus({ preventScroll: true }); } catch (e) {} } }
function render() { const fk = focusKey(document.activeElement); try { renderInner(); } finally { restoreFocus(fk); } }
function renderInner() {
  if (army && HIST.owner !== army.id) { HIST.back = []; HIST.fwd = []; HIST.last = JSON.stringify(army); HIST.owner = army.id; }
  const total = armyPoints(), issues = validate(), errs = issues.filter(i => i.level === 'err');
  $('#pts').textContent = total; $('#lim').textContent = army.limit;
  $('#meter').classList.toggle('over', total > army.limit);
  $('#bar').style.width = Math.min(100, total / army.limit * 100) + '%';
  $('#name').value = LANG !== 'fr' && army.name === 'Nouvelle liste' ? L`Nouvelle liste` : army.name;
  $('#verdict').className = errs.length ? 'bad' : 'good';
  $('#verdict').textContent = errs.length ? L`${errs.length} point${errs.length > 1 ? 's' : ''} à corriger` : L`Liste conforme`;
  const md0 = modeDef();
  $('#summary').textContent = trData(`${md0.name} · ${army.allegiance} · ${army.faction}`);
  renderWizard(issues);

  const host = $('#dets'); host.replaceChildren();
  const order = [];
  const main = mainDet(); order.push(main);
  const push = k => army.dets.filter(d => detDef(d.type).kind === k).forEach(d => { if (!order.includes(d)) order.push(d); });
  army.dets.filter(d => d.parent === main.id).forEach(d => order.push(d)); push('apex');
  army.dets.filter(d => detDef(d.type).kind === 'allie').forEach(a => { order.push(a); army.dets.filter(d => d.parent === a.id).forEach(d => order.push(d)); });
  push('addl'); push('sdg'); push('sdb'); army.dets.forEach(d => { if (!order.includes(d)) order.push(d); });
  const step = army.step || 1;
  if (step === 3) host.append(el('p', { class: 'lead' }, L`Remplissez le Détachement Principal : touchez une case pour y placer une unité. Une seule case occupée suffit.` + ((armyDef().forbid || []).includes('aux') ? '' : L` Chaque case État-major ouvrira un Détachement Auxiliaire, la case Quartier Général un Auxiliaire ou un Apex.`)));
  if (step === 4 && (armyDef().forbid || []).includes('aux')) host.append(el('p', { class: 'lead' }, L`Une armée ${armyDef().name} n'a ni Détachement Auxiliaire ni d'Apex : ajoutez des Détachements Alliés ou additionnels si votre liste y a droit.`));
  else if (step === 4) { const g = grants(main), ax = childrenOf(main, 'aux').length, ap = childrenOf(main, 'apex').length;
    host.append(el('p', { class: 'lead' }, L`Vos choix du Détachement Principal ouvrent ${g.aux} Détachement(s) Auxiliaire(s) par les cases État-major et ${g.flex} Auxiliaire ou Apex par la case Quartier Général. Utilisés : ${ax} Auxiliaire(s), ${ap} Apex. Alliés et Seigneur des Batailles restent possibles sans condition.`)); }
  if (step === 3) { const alts = DB.detachments.filter(d => d.kind === 'principal' && d.alt && d.army === armyOf(army.faction));
    if (alts.length) { const std = detDef(armyDef().mainDet || 'principal');
      const pick = id => { if (main.type === id) return; if (Object.keys(main.units).length && !confirm(L`Changer de Détachement Principal vide ses cases. Continuer ?`)) return; main.type = id; main.units = {}; main.adv = {}; main.bonusRole = null; main.advSlot = {}; touch(); };
      host.append(el('div', { class: 'altmain' }, el('h3', {}, L`Type de Détachement Principal`),
        el('div', { class: 'choices wide' }, [std, ...alts].map(d => { const b = el('button', { type: 'button', class: 'choice', 'aria-pressed': main.type === d.id ? 'true' : 'false', onclick: () => pick(d.id) },
          el('b', {}, d.name), el('i', {}, d.alt ? L`Legiones Astartes Primary Detachments (EN)` : L`Livre de Règles p. 284`), slotSummary(d.slots)); return b; })))); } }
  for (const det of order) { if (step === 3 && det !== main) continue; if (step === 4 && det === main) continue; host.append(renderDet(det, issues)); }
  if (step === 4 && order.length === 1) host.append(el('p', { class: 'note' }, L`Aucun détachement supplémentaire pour l'instant.`));

  const iss = $('#issues'); iss.replaceChildren();
  if (!issues.length) iss.append(el('p', { class: 'ok' }, L`Rien à signaler : la liste respecte les Règles de Sélection d'Armée de Croisade.`));
  for (const i of issues) iss.append(el('li', { class: i.level, onclick: () => { if (i.det) { const d = $(`[data-det="${i.det}"]`); d && d.scrollIntoView({ behavior: 'smooth', block: 'center' }); } } }, i.msg));
  renderEditor(issues);
  renderSheet(issues);
  $('#b-undo').disabled = !HIST.back.length; $('#b-redo').disabled = !HIST.fwd.length;
  $('#mini').replaceChildren(el('b', { class: total > army.limit ? 'over' : '' }, total), el('span', {}, L` / ${army.limit} pts`), el('span', { class: 'dot ' + (errs.length ? 'bad' : 'good'), title: errs.length ? errs.length + L` point(s) à corriger` : L`Liste conforme` }, errs.length ? '✕ ' + errs.length : '✓'));
}
const KIND = { fort: L`Détachement Additionnel (Legacies)`, addl: L`Détachement Additionnel`, principal: L`Détachement Principal`, aux: L`Détachement Auxiliaire`, apex: L`Détachement d'Apex`, allie: L`Détachement Allié`, sdg: L`Détachement de Seigneur de Guerre`, sdb: L`Détachement de Seigneur des Batailles` };
const STEPS = [[L`Limite de Points`, () => army.limit + L` pts`], [L`Allégeance et Faction`, () => army.allegiance + ' · ' + army.faction + (doctrineDef() ? ' · ' + doctrineDef().name : '') + (ritesFor().length > 1 && riteDef() ? ' · ' + riteDef().name : '')], [L`Détachement Principal`, () => Object.keys(mainDet().units).length + L` unité(s)`], [L`Autres détachements`, () => (army.dets.length - 1) + L` détachement(s)`]];
function goStep(n) { army.step = Math.max(1, Math.min(4, n)); sel = null; document.body.classList.remove('editing'); touch(); scrollTo({ top: 0 }); }
function renderWizard(issues) {
  const step = army.step || 1; document.body.dataset.step = step;
  const nav = $('#steps'); nav.replaceChildren();
  STEPS.forEach(([t, sum], i) => nav.append(el('button', { type: 'button', class: i + 1 === step ? 'cur' : i + 1 < step ? 'done' : '', 'aria-current': i + 1 === step ? 'step' : null, onclick: () => goStep(i + 1) }, el('b', {}, el('span', { class: 'rn' }, ['I', 'II', 'III', 'IV'][i]), el('span', { class: 't' }, t)), el('span', {}, sum()))));
  const w = $('#wiz'); w.replaceChildren();
  const choice = (label, sub, on, fn) => el('button', { type: 'button', class: 'choice', 'aria-pressed': on ? 'true' : 'false', onclick: fn }, el('b', {}, label), sub ? el('i', {}, sub) : null);
  if (step === 1) {
    const md = modeDef();
    w.append(el('h2', {}, L`Fixer la Limite de Points`), el('p', {}, L`La valeur totale des unités et de leurs options ne pourra pas la dépasser. Elle fixe aussi les plafonds : 50 % pour les alliés, 25 % pour les Seigneurs de Guerre et des Batailles.`),
      el('h3', {}, L`Type de bataille`), el('div', { class: 'choices wide' }, (DB.core.modes || []).map(m => choice(m.name, m.limit ? L`Limite imposée : ${m.limit} points` : m.note || L`Limite libre, 3000 points par défaut`, m.id === md.id, () => { army.mode = m.id; if (m.limit) army.limit = m.limit; else if (m.defaultLimit) army.limit = Math.max(army.limit, m.defaultLimit); else if (army.limit < 2000) army.limit = 3000; touch(); }))),
      el('h3', {}, L`Limite de Points`));
    w.append(el('label', { class: 'legacy-box' }, el('input', { type: 'checkbox', checked: !!army.noLegacies, onchange: e => { army.noLegacies = e.target.checked; touch(); } }),
      el('span', {}, el('b', {}, L`Exclure les unités Legacies (Héritages)`), el('i', {}, L`Unités, détachements, options et listes des PDF « Legacies of the Age of Darkness » : Legacies Astartes, Auxilia et Mechanicum, Inductii, Blackshields, Shattered Legions, Imperialis Militia, Legio Custodes, Daemons of the Ruinstorm, Fortifications. À convenir avec votre adversaire.`))));
    if (md.limit) w.append(el('div', { class: 'choices wide' }, choice(md.limit + L` points`, md.ref || '', true, () => {})));
    else {
      const std = [2000, 2500, 3000, 3500, 4000], custom = !std.includes(army.limit);
      const inp = el('input', { type: 'number', min: 500, max: 10000, step: 50, value: custom ? army.limit : '', placeholder: L`ex. 1750`, 'aria-label': L`Limite personnalisée`, onchange: e => { army.limit = Math.max(500, Math.min(10000, +e.target.value || 3000)); touch(); } });
      w.append(el('div', { class: 'choices' }, std.map(v => choice(v + L` points`, v === 3000 ? L`Limite par défaut` : v < 3000 ? L`Sans Seigneur de Guerre` : '', army.limit === v, () => { army.limit = v; touch(); })),
        el('div', { class: 'choice', 'aria-pressed': custom ? 'true' : 'false' }, el('b', {}, L`Autre limite`), inp)));
    }
  }
  if (step === 2) {
    w.append(el('h2', {}, L`Choisir l'Allégeance et la Faction`), el('p', {}, L`L'Allégeance vaut pour toute l'armée. La Faction est celle du Détachement Principal et des détachements qui lui sont rattachés.`),
      el('h3', {}, L`Allégeance`), el('div', { class: 'choices wide' }, [['Loyaliste', L`Fidèle à l'Empereur`], ['Renégat', L`Rallié au Maître de Guerre`]].map(([a, t]) => choice(a, t, army.allegiance === a, () => { army.allegiance = a; touch(); }))),
      ...(DB.core.armies || []).filter(a => !a.hidden && a.factions.length).flatMap(a => [el('h3', {}, L`Faction — ` + a.name + (a.legacy ? L` (Legacies)` : '')), el('div', { class: 'choices' }, a.factions.map(f => {
        const leg = a.legacy || factionInfo(f).legacy, al = factionInfo(f).allegiance || a.allegiance, off = (leg && !legacyOn());
        const b = choice(f, [leg ? L`Legacies` : '', al ? L`${al} uniquement` : ''].filter(Boolean).join(' · '), army.faction === f, () => { if (off) return flash(L`${f} : décochez « Exclure les unités Legacies » à l'étape 1.`); army.faction = f; syncMain(); if (!doctrineDef()) army.doctrine = null; touch(); });
        if (off) { b.classList.add('off'); b.title = L`Liste Legacies : cochez la case à l'étape 1`; } return b; }))]));
    if (army.faction === 'Shattered Legions') { const S = DB.core.shattered, cur = army.shattered || [];
      w.append(el('h3', {}, L`Shattered Legions : ${S.min} ou ${S.max} Légions (${cur.length} choisie(s))`), el('p', { class: 'note' }, L`Mutable Tactics — un bénéfice par Légion choisie. ` + S.boundInBlood),
        el('div', { class: 'choices wide' }, LEGIONS().map(Lg => { const b = S.benefits[Lg] || {}; return choice(Lg + (b.name ? ' — ' + b.name : ''), b.text || '', cur.includes(Lg), () => {
          const n = cur.includes(Lg) ? cur.filter(x => x !== Lg) : [...cur, Lg]; if (n.length > S.max) return flash(L`${S.max} Légions au maximum.`); army.shattered = n; touch(); }); }))); }
    if (armyOf(army.faction) === 'mil') { const P = DB.core.provenances, cur = army.provenances || [];
      w.append(el('h3', {}, L`Provenances of War (${cur.length})`), el('p', { class: 'note' }, P.note),
        el('div', { class: 'choices wide' }, P.list.map(p => { const bad = p.allegiance && p.allegiance !== army.allegiance;
          const b = choice(p.name, [p.allegiance ? L`Allégeance Renégate uniquement` : '', p.listItems.length ? L`Ajoute : ` + [...new Set(p.listItems.map(i => i.name))].join(', ') : '', p.foreignUnits.length ? L`Unités d'autres Listes d'Armée disponibles` : ''].filter(Boolean).join(' · '), cur.includes(p.id), () => {
            if (bad) return flash(L`${p.name} : Allégeance Renégate uniquement.`); army.provenances = cur.includes(p.id) ? cur.filter(x => x !== p.id) : [...cur, p.id]; touch(); });
          if (bad) b.classList.add('off'); return b; }))); }
    if (paradigm()) w.append(el('h3', {}, L`Paradigme de Maisonnée`), el('div', { class: 'choices wide' }, choice(paradigm().name, paradigm().summary, true, () => {})));
    if (armyOf(army.faction) === 'dmn') { const t = ((DB.books.find(b => b.id === 'daemons-ruinstorm') || {}).dominions || {})[army.faction]; if (t) w.append(el('p', { class: 'note' }, L`Ætheric Dominion — ${army.faction} : ${t}`)); }
    if (armyDef().incomplete) w.append(el('p', { class: 'note pending' }, armyDef().incomplete));
    const rites = ritesFor();
    if (rites.length) w.append(el('h3', {}, rites.length > 1 ? L`Rite de Guerre (un seul pour la Légion)` : L`Rite de Guerre de la Légion`),
      el('div', { class: 'choices wide' }, rites.map(r => { const bad = r.allegiance && r.allegiance !== army.allegiance;
        const b = choice(r.name + ' — ' + r.tactica, L`${r.tacticaText} Posture « ${r.posture} » : ${r.postureText}${r.allegiance ? L` Réservé aux armées ` + r.allegiance + 'es.' : ''}`, riteDef() === r, () => { if (bad) return flash(L`${r.name} : réservé aux armées d'Allégeance ${r.allegiance}.`); army.rite = r.id; touch(); });
        if (bad) { b.classList.add('off'); b.title = L`Réservé aux armées d'Allégeance ${r.allegiance}`; } return b; })));
    const docs = (DB.core.doctrines || []).filter(d => d.army === armyOf(army.faction));
    if (docs.length) w.append(el('h3', {}, L`Doctrine de Cohorte (une seule, facultative)`), el('div', { class: 'choices wide' }, choice(L`Aucune`, '', !army.doctrine, () => { army.doctrine = null; touch(); }), docs.map(d => choice(d.name, d.text, army.doctrine === d.id, () => { army.doctrine = d.id; touch(); }))));
  }
  const errs = issues.filter(i => i.level === 'err').length;
  $('#wiznav').replaceChildren(
    step > 1 ? el('button', { type: 'button', class: 'btn ghost', onclick: () => goStep(step - 1) }, L`Retour`) : el('span'),
    step < 4 ? el('button', { type: 'button', class: 'btn', onclick: () => goStep(step + 1) }, L`Étape suivante : ${STEPS[step][0]}`)
      : el('button', { type: 'button', class: 'btn', onclick: exportPDF }, errs ? L`Créer le PDF quand même (${errs} point${errs > 1 ? 's' : ''} à corriger)` : L`Terminer : créer le PDF de la liste`));
}

function renderDet(det, issues) {
  const def = detDef(det.type), slots = slotsOf(det), bad = issues.some(i => i.det === det.id && i.level === 'err');
  const box = el('section', { class: 'det k-' + def.kind + (bad ? ' bad' : ''), 'data-det': det.id });
  const head = el('header', {},
    el('div', {}, el('h2', {}, def.name), el('p', { class: 'kind' }, KIND[def.kind] + (det.parent && det.parent !== mainDet().id ? L` rattaché à l'Allié` : '') + ' · ' + (detFaction(det) || L`Faction à choisir`))),
    el('div', { class: 'dp' }, el('b', {}, detPoints(det)), L` pts`, el('button', { class: 'ib fold', type: 'button', 'aria-expanded': det.folded ? 'false' : 'true', title: det.folded ? L`Déplier` : L`Replier`, onclick: () => { det.folded = !det.folded; touch(); } }, det.folded ? '▸' : '▾')));
  box.append(head);
  if (det.folded) { box.classList.add('folded'); box.append(el('p', { class: 'kind' }, Object.values(det.units).map(x => (UNITS[x.u] || {}).name).filter(Boolean).join(' · ') || L`Aucune unité`)); return box; }
  if (def.kind === 'allie' || def.kind === 'sdb') {
    const s = el('select', { 'aria-label': L`Faction du détachement`, onchange: e => { det.faction = e.target.value; touch(); } }, el('option', { value: '' }, L`Choisir la Faction…`),
      (DB.core.armies || []).map(a => el('optgroup', { label: a.name }, a.factions.map(f => el('option', { value: f, selected: det.faction === f, disabled: def.kind === 'allie' && f === army.faction }, f + (def.kind === 'allie' && f === army.faction ? L` (faction principale)` : ''))))));
    box.append(el('label', { class: 'inl' }, L`Faction `, s));
  }
  if (def.note) box.append(el('p', { class: 'note' }, def.note));
  for (const n of def.notes || []) box.append(el('p', { class: 'note' }, n));
  if (def.dynSlots) box.append(el('p', { class: 'note' }, L`${def.dynSlots.why} — ${dynCount(det, def)} slot(s) added.`));
  const O = DB.core.oaths || {}, nOath = (O.perDet || {})[def.kind];
  if (nOath && detFaction(det) === 'Blackshields') { const cur = det.oaths || [];
    const f = el('details', { class: 'oaths', open: !cur.length }, el('summary', {}, L`Oaths of Moment : ${cur.length}/${nOath}` + (cur.length ? ' — ' + cur.map(id => oathDef(id).name).join(', ') : '')));
    for (const o of O.list) { const on = cur.includes(o.id), ex = (o.excl || []).find(x => cur.includes(x));
      f.append(el('label', { class: 'opt' + (ex && !on ? ' ko' : '') }, el('input', { type: 'checkbox', checked: on, disabled: !on && (cur.length >= nOath || !!ex), onchange: () => { det.oaths = on ? cur.filter(x => x !== o.id) : [...cur, o.id]; touch(); } }),
        el('span', {}, o.name, el('i', {}, ex && !on ? L`Pas avec ${oathDef(ex).name}.` : o.text)))); }
    if (cur.includes('helix')) f.append(el('label', { class: 'inl' }, L`The Broken Helix : `, el('select', { onchange: e => { det.helix = e.target.value; touch(); } }, ['Clone', 'Aberrant'].map(v => el('option', { value: v, selected: (det.helix || 'Clone') === v }, v)))));
    if (cur.includes('panoply')) f.append(el('label', { class: 'inl' }, L`Panoply of Old — Legion Armoury `, el('select', { onchange: e => { det.panoplyLegion = e.target.value; touch(); } }, el('option', { value: '' }, '…'), LEGIONS().map(Lg => el('option', { value: Lg, selected: det.panoplyLegion === Lg }, Lg)))));
    box.append(f); }
  if (det === mainDet() && sireRule() && sireRule().name === 'Sire des White Scars' && sireActive())
    box.append(el('label', { class: 'inl' }, el('input', { type: 'checkbox', checked: !!det.wsReco, onchange: e => { det.wsReco = e.target.checked; Object.keys(det.units).forEach(i => { if (detDef(det.type).slots[i] && detDef(det.type).slots[i].role === 'TP') delete det.units[i]; }); touch(); } }), L` Sire des White Scars : échanger les cases Transport contre des cases Reco. (Land Raider Explorator)`));
  const row = el('div', { class: 'slots' });
  for (const s of slots) {
    const us = det.units[s.i], u = us && UNITS[us.u];
    const isSel = sel && sel.det === det.id && sel.slot === s.i;
    const sbad = issues.some(i => i.det === det.id && i.slot === s.i && i.level === 'err');
    const b = el('button', { type: 'button', class: 'slot' + (us ? ' filled' : '') + (isSel ? ' sel' : '') + (sbad ? ' bad' : ''),
      title: role(s.role).name + (s.prime ? L` — Case Principale` : '') + (s.added != null ? L` — case ajoutée` + (s.legion ? ' (' + s.legion + ')' : s.army ? ' (' + armyName(s.army) + ')' : '') : s.bonus ? L` — case du Bénéfice Logistique` : '') + (s.dyn ? L` — case ajoutée par le Détachement Principal` : '') + (s.oath ? L` — Oath of Moment` : ''),
      onclick: () => { if (us) { sel = { det: det.id, slot: s.i }; render(); openEditor(); } else openPicker(det, s); } },
      el('span', { html: slotGlyph(s, !!us) }),
      el('span', { class: 'sl' }, us ? [el('b', {}, u ? unitLabel(us, u) : us.u, isExpanded(u, us) ? el('small', { class: 'tag' }, L`Expanded`) : null), el('i', {}, (u && us.label ? u.name + ' · ' : '') + L`${u ? unitSize(us) + L` fig. · ` : ''}${unitPoints(us)} pts` + (det.adv[s.i] ? ' · ' + advDef(det.adv[s.i]).name : ''))]
        : [el('em', {}, (s.roles || [s.role]).map(r => role(r).name).join(' / ')), el('i', {}, s.prime ? L`Case Principale — vide` : s.legion ? s.legion + L` — vide` : s.army ? armyName(s.army) + L` — vide` : s.bonus || s.dyn ? L`Case ajoutée — vide` : L`Vide`)]));
    row.append(b);
  }
  box.append(row);
  if (def.kind !== 'principal') box.append(el('button', { class: 'link danger', type: 'button', onclick: () => removeDet(det) }, L`Retirer ce détachement`));
  return box;
}
function removeDet(det) {
  const kids = army.dets.filter(d => d.parent === det.id);
  if (Object.keys(det.units).length || kids.length) { if (!confirm(L`Retirer « ${detName(det)} »${kids.length ? L` et ses détachements rattachés` : ''} avec ses unités ?`)) return; }
  army.dets = army.dets.filter(d => d !== det && d.parent !== det.id);
  sel = null; touch();
}

/* ---------- Sélecteur d'unité ---------- */
function openPicker(det, slot) {
  const dlg = $('#dlg'), body = $('#dlg-body'); body.replaceChildren();
  $('#dlg-title').textContent = `${role(slot.role).name} — ${trData(detName(det))}`;
  const okL = [], koL = [];
  const dfa = slot.army || detDef(det.type).foreign || armyOf(detFaction(det)); let hiddenLeg = 0;
  const canSA = slot.prime && !det.units[slot.i] && !det.adv[slot.i] && advOptions(det, slot).some(o => o.def.id === 'affectation' && o.ok);
  const saL = [];
  if (canSA) { det.adv[slot.i] = 'affectation'; for (const u of Object.values(UNITS)) if (u.role === 'QG' && !(u.legacy && !legacyOn())) { const a = unitAllowed(det, slot, u); if (a.ok) saL.push([u, a]); } delete det.adv[slot.i]; }
  for (const u of Object.values(UNITS)) { if (u.legacy && !legacyOn()) { if (u.army === dfa && (slot.roles || [slot.role]).includes(u.role)) hiddenLeg++; continue; } if (u.role === 'FO' && detDef(det.type).kind !== 'fort') continue; const a = unitAllowed(det, slot, u); if (!a.ok && ((u.army && dfa && u.army !== dfa && !(detDef(det.type).foreignAlt || []).includes(u.army)) || !u.army)) continue; (a.ok ? okL : koL).push([u, a]); }
  const left = army.limit - armyPoints();
  { const def = detDef(det.type), sw = (def.slotSwaps || []).find(q => (slot.swapped ? q === slot.swapped : q.from === slot.role) && (!q.faction || q.faction === detFaction(det)));
    if (sw && slot.i < 100) body.append(el('div', { class: 'swap' }, el('p', { class: 'note' }, sw.why), el('button', { class: 'btn ghost', type: 'button', onclick: () => { det.swaps = det.swaps || {}; if (det.swaps[slot.i]) delete det.swaps[slot.i]; else det.swaps[slot.i] = 1; delete det.units[slot.i]; delete det.adv[slot.i]; dlg.close(); touch(); openPicker(det, slotsOf(det).find(x => x.i === slot.i)); } }, slot.swapped ? L`Rétablir la case ${role(sw.from).name}` : L`Échanger contre une case ${role(sw.to).name} (${sw.onlyIds.map(i => (UNITS[i] || {}).name || i).join(', ')})`))); }
  const search = el('input', { type: 'search', placeholder: L`Chercher une unité…`, 'aria-label': L`Chercher une unité`, oninput: e => { const q = norm(e.target.value); $$('.pick', body).forEach(p => p.hidden = !p.dataset.n.includes(q)); $$('h4', body).forEach(h => { let n = h.nextElementSibling, any = false; while (n && n.tagName !== 'H4') { if (n.classList.contains('pick') && !n.hidden) any = true; n = n.nextElementSibling; } h.hidden = !any && !!q; }); } });
  body.append(search);
  if (!okL.length) body.append(el('p', { class: 'note' }, L`Aucune unité de la base de données ne peut occuper cette case pour l'instant.`));
  if (hiddenLeg) body.append(el('p', { class: 'note' }, L`${hiddenLeg} unité(s) Legacies masquée(s) : décochez « Exclure les unités Legacies » à l'étape 1 pour les voir.`));
  const mk = ([u, a]) => el('button', { type: 'button', class: 'pick' + (a.ok ? '' : ' ko'), 'data-n': norm(u.name + ' ' + trData(u.name)), disabled: !a.ok, onclick: () => {
    det.units[slot.i] = { u: u.id, extra: 0, opts: {} }; sel = { det: det.id, slot: slot.i }; dlg.close(); touch(); openEditor(); setTimeout(() => { const e = $('#editor'); if (e) e.focus({ preventScroll: true }); }, 0); } },
    el('span', {}, el('b', {}, u.name, u.legacy ? el('small', { class: 'tag' }, L`Legacies`) : null, u.lang === 'en' ? el('small', { class: 'tag' }, 'EN') : null, u.unverified ? el('small', { class: 'tag warn' }, L`Non vérifié`) : null), el('i', {}, a.ok ? u.models.map(m => `${m.count} ${trData(m.name)}`).join(', ') : a.why)),
    el('span', { class: 'pp' + (a.ok && u.points > left ? ' over' : '') }, u.points + L` pts`));
  if (saL.length) {
    body.append(el('h4', {}, L`Quartier Général dans cette case (${advDef('affectation').name})`), el('p', { class: 'note' }, advDef('affectation').text));
    saL.sort((a, b) => a[0].points - b[0].points).forEach(([u, a]) => { const b = mk([u, a]); b.onclick = () => { det.adv[slot.i] = 'affectation'; det.units[slot.i] = { u: u.id, extra: 0, opts: {} }; sel = { det: det.id, slot: slot.i }; $('#dlg').close(); touch(); openEditor(); }; body.append(b); });
  }
  if (saL.length) body.append(el('h4', {}, role(slot.role).name));
  okL.sort((a, b) => a[0].points - b[0].points).forEach(x => body.append(mk(x)));
  if (okL.some(([u]) => u.points > left)) body.append(el('p', { class: 'note' }, L`Il vous reste ${left} pts : les coûts en rouge feraient dépasser la limite.`));
  if (koL.length) {
    const d = el('details', {}, el('summary', {}, L`Unités indisponibles ici (${koL.length}) — voir pourquoi`));
    const byRole = {};
    koL.forEach(x => (byRole[x[0].role] = byRole[x[0].role] || []).push(x));
    for (const [r, xs] of Object.entries(byRole)) { d.append(el('h4', {}, role(r).name)); xs.forEach(x => d.append(mk(x))); }
    body.append(d);
  }
  dlg.showModal();
}
function openDetPicker() {
  const dlg = $('#dlg'), body = $('#dlg-body'); body.replaceChildren();
  $('#dlg-title').textContent = L`Ajouter un détachement`;
  const groups = { addl: L`Détachements Additionnels`, fort: L`Détachements additionnels`, aux: L`Détachements Auxiliaires`, apex: L`Détachements d'Apex`, allie: L`Détachements additionnels`, sdg: L`Détachements additionnels`, sdb: L`Détachements additionnels` };
  let last = '';
  const lists = new Set([armyOf(army.faction), ...army.dets.filter(d => detDef(d.type).kind === 'allie').map(d => armyOf(d.faction))]);
  for (const def of DB.detachments.filter(d => d.kind !== 'principal' && (!d.faction || d.faction === army.faction) && (!d.army || lists.has(d.army)) && !(armyDef().forbid || []).includes(d.kind)).sort((a, b) => Object.keys(groups).indexOf(a.kind) - Object.keys(groups).indexOf(b.kind))) {
    if (groups[def.kind] !== last) { last = groups[def.kind]; body.append(el('h4', {}, last)); }
    const c = canAddDet(def);
    const add = parent => { army.dets.push({ id: uid(), type: def.id, parent: parent ? parent.id : null, units: {}, adv: {}, bonusRole: null, faction: '' }); dlg.close(); touch(); };
    const b = el('div', { class: 'pick det-pick' + (c.ok ? '' : ' ko') },
      el('span', {}, el('b', {}, def.name), slotSummary(def.slots),
        el('i', {}, c.ok ? (def.requires ? L`Ouvert par votre ${def.requires}. ` : '') + (def.note || '') : c.why)),
      c.ok ? el('span', { class: 'acts' }, (c.parents || [null]).map(p => el('button', { type: 'button', class: 'btn', onclick: () => add(p) }, c.parents && c.parents.length > 1 ? L`Rattacher : ${detName(p)}` : L`Ajouter`))) : null);
    body.append(b);
  }
  dlg.showModal();
}

/* ---------- Éditeur d'unité ---------- */
function openEditor() { document.body.classList.add('editing'); const e = $('#editor'); e.scrollTop = 0; if (matchMedia(L`(max-width: 899px)`).matches) e.focus(); }
function closeEditor() { document.body.classList.remove('editing'); sel = null; render(); }
function statTable(u, us) {
  if (u.variants && us) { const cur = us.variant != null ? u.variants[us.variant].name : u.models[0].name, one = u.profiles.filter(p => p.name === cur); if (one.length) u = { ...u, profiles: one }; }
  const veh = u.profiles.filter(p => p.vehicle), kn = u.profiles.filter(p => p.heads), inf = u.profiles.filter(p => !p.vehicle && !p.heads), out = [];
  const tbl = (heads, rows) => el('div', { class: 'tblw' }, el('table', { class: 'stats' }, el('thead', {}, el('tr', {}, el('th', {}, ''), heads.map(h => el('th', { title: DB.core.statNames[h] || h }, h)))),
    el('tbody', {}, rows.map(p => el('tr', {}, el('th', {}, p.name), p.stats.map(v => el('td', {}, String(v))))))));
  const H = LANG !== 'fr' && I18N.heads ? I18N.heads : null;
  if (inf.length) out.push(tbl(H ? H.stat : DB.core.statHeads, inf));
  if (veh.length) out.push(tbl(H ? H.vehicle : DB.core.vehicleHeads, veh));
  const hg = {}; kn.forEach(p => (hg[p.heads.join('|')] = hg[p.heads.join('|')] || []).push(p)); Object.values(hg).forEach(ps => out.push(tbl(H ? ps[0].heads.map(h => H.weapon[h] || trData(h)) : ps[0].heads, ps)));
  return out;
}
let edKey = null;
function renderEditor(issues) {
  const host = $('#editor-body'), ed = $('#editor'), key = sel ? sel.det + ':' + sel.slot : null, keep = key && key === edKey ? ed.scrollTop : 0; edKey = key;
  host.replaceChildren(); requestAnimationFrame(() => { ed.scrollTop = keep; });
  $('#ed-top').replaceChildren();
  const det = sel && army.dets.find(d => d.id === sel.det), us = det && det.units[sel.slot];
  if (!us) { host.append(el('div', { class: 'empty' }, el('h3', {}, L`Aucune unité sélectionnée`), el('p', {}, L`Touchez une case vide de l'organigramme pour y placer une unité, ou une case occupée pour régler ses options.`))); return; }
  const u = UNITS[us.u], slot = slotsOf(det).find(s => s.i === sel.slot);
  if (!u) { host.append(el('p', { class: 'note' }, L`Unité absente de la base de données.`), el('button', { class: 'btn danger', onclick: () => removeUnit(det, sel.slot) }, L`Retirer`)); return; }
  $('#ed-top').append(el('div', { class: 'ed-id' }, el('b', {}, unitLabel(us, u)), el('span', {}, L`${unitPoints(us)} pts`)),
    el('div', { class: 'ed-acts' }, el('button', { class: 'ib', type: 'button', title: L`Dupliquer l'unité`, 'aria-label': L`Dupliquer l'unité`, onclick: () => duplicateUnit(det, sel.slot) }, '⧉'),
      el('button', { class: 'ib danger', type: 'button', title: L`Retirer l'unité`, 'aria-label': L`Retirer l'unité`, onclick: () => removeUnit(det, sel.slot) }, '🗑')));
  host.append(el('p', { class: 'kind' }, `${role(u.role).name} · ${detName(det)}`), el('h3', {}, unitLabel(us, u), us.label ? el('small', { class: 'uname' }, u.name) : null, isExpanded(u, us) ? el('small', { class: 'tag', title: L`Option Legacies choisie : unité Expanded (Legacies of the Age of Darkness)` }, L`Expanded`) : null),
    el('p', { class: 'cost' }, el('b', {}, unitPoints(us)), L` pts · ${unitSize(us)} figurine${unitSize(us) > 1 ? 's' : ''}`, unitPoints(us) !== u.points ? el('span', { class: 'ref' }, L` · base ${u.points} + options ${unitPoints(us) - u.points}`) : null, u.page ? el('span', { class: 'ref' }, L` · ${u.bookName} p. ${u.page}`) : null));
  host.append(el('label', { class: 'rename' }, el('span', {}, L`Nom de l'unité`), el('input', { class: 'field', type: 'text', maxlength: 60, value: us.label || '', placeholder: u.name, 'aria-label': L`Nom de l'unité`, onchange: e => { const v = e.target.value.trim(); if (v) us.label = v; else delete us.label; touch(); }, onkeydown: e => { if (e.key === 'Enter') e.target.blur(); } })));
  const mine = issues.filter(i => i.det === det.id && i.slot === sel.slot);
  if (mine.length) host.append(el('ul', { class: 'iss' }, mine.map(i => el('li', { class: i.level }, i.msg))));
  if (u.extra) {
    host.append(el('div', { class: 'row' }, el('span', {}, L`${u.extra.model} supplémentaires`, el('i', {}, L` +${u.extra.points} pts chacun · ${u.extra.max} max`)),
      stepper(us.extra || 0, 0, u.extra.max, v => { us.extra = v; touch(); })));
  }
  if (u.variants) {
    const f = el('fieldset', {}, el('legend', {}, L`Version de la figurine`));
    const opt = (label, v, pts) => el('label', { class: 'opt' }, el('input', { type: 'radio', name: 'var', checked: (us.variant ?? -1) === v, onchange: () => { us.variant = v < 0 ? null : v; touch(); } }), el('span', {}, label), el('b', {}, pts ? `+${pts}` : '—'));
    f.append(opt(u.models[0].name, -1, 0), ...u.variants.map((v, i) => opt(v.name, i, v.points)));
    host.append(f);
  }
  if (slot && slot.prime) {
    const f = el('fieldset', { class: 'prime' }, el('legend', {}, L`Case Principale : Avantage Principal`));
    const cur = det.adv[slot.i] || '';
    f.append(el('label', { class: 'opt' }, el('input', { type: 'radio', name: 'adv', checked: !cur, onchange: () => setAdv(det, slot, '') }), el('span', {}, L`Aucun`)));
    for (const o of advOptions(det, slot)) {
      if (o.def.id === 'affectation' && u.role !== 'QG') continue;
      if (cur === 'affectation' && u.role === 'QG' && o.def.id !== 'affectation') continue;
      f.append(el('label', { class: 'opt' + (o.ok ? '' : ' ko') }, el('input', { type: 'radio', name: 'adv', disabled: !o.ok && cur !== o.def.id, checked: cur === o.def.id, onchange: () => setAdv(det, slot, o.def.id) }),
        el('span', {}, o.def.name, o.def.faction ? el('small', { class: 'tag' }, o.def.faction) : null, el('i', {}, (o.ok ? o.def.text : o.why) + (o.def.ref ? ` (${o.def.ref})` : '')))));
    }
    const ad = advDef(cur);
    if (ad && ad.addSlot && (!ad.addSlot.role || ad.addSlot.legionPick)) { const ch = ((det.advSlot = det.advSlot || {})[slot.i] = det.advSlot[slot.i] || {});
      const clear = () => { delete det.units[100 + slot.i]; delete det.adv[100 + slot.i]; };
      if (!ad.addSlot.role) f.append(el('label', { class: 'inl' }, L`Case ajoutée : `, el('select', { onchange: e => { if (ch.role !== e.target.value) clear(); ch.role = e.target.value || null; touch(); } },
        el('option', { value: '' }, L`Choisir le rôle…`), Object.entries(DB.core.roles).filter(([k]) => !(ad.addSlot.exclude || []).includes(k) && k !== 'FO').map(([k, r]) => el('option', { value: k, selected: ch.role === k }, r.name)))));
      if (ad.addSlot.legionPick) f.append(el('label', { class: 'inl' }, L`Légion représentée : `, el('select', { onchange: e => { if (ch.legion !== e.target.value) clear(); ch.legion = e.target.value || null; touch(); } },
        el('option', { value: '' }, '…'), ((army.shattered || []).length ? army.shattered : LEGIONS()).map(Lg => el('option', { value: Lg, selected: ch.legion === Lg }, Lg))))); }
    if (cur === 'we-enchaines') { const cands = []; army.dets.forEach(d2 => slotsOf(d2).forEach(s2 => { const x = d2.units[s2.i], xu = x && UNITS[x.u]; if (x && x !== us && xu && xu.role === 'EM' && (unitFaction(xu) || detFaction(d2)) === 'World Eaters') cands.push([d2.id + ':' + s2.i, xu.name + ' (' + detName(d2) + ')']); }));
      f.append(el('label', { class: 'inl' }, L`Frères de Chaîne avec : `, el('select', { onchange: e => { us.chainWith = e.target.value || null; touch(); } }, el('option', { value: '' }, cands.length ? L`Choisir l'autre unité…` : L`Aucune autre unité État-major World Eaters`), cands.map(([k, n]) => el('option', { value: k, selected: us.chainWith === k }, n))))); }
    if (cur === 'logistique') {
      const s = el('select', { 'aria-label': L`Rôle de la case supplémentaire`, onchange: e => { const idx = detDef(det.type).slots.length; if (det.bonusRole !== e.target.value) { delete det.units[idx]; delete det.adv[idx]; } det.bonusRole = e.target.value || null; touch(); } },
        el('option', { value: '' }, L`Choisir le rôle de la case ajoutée…`), Object.entries(DB.core.roles).filter(([k]) => !(advDef('logistique').addSlotExclude || ['QG', 'EM', 'SG', 'SB', 'FO']).includes(k) && (!detDef(det.type).addSlotRoles || detDef(det.type).addSlotRoles.includes(k))).map(([k, r]) => el('option', { value: k, selected: det.bonusRole === k }, r.name)));
      f.append(el('label', { class: 'inl' }, L`Case ajoutée au détachement `, s));
    }
    host.append(f);
  }
  if (detDef(det.type).vanguardToLine && (u.rules || []).some(r => /^(Avant-garde|Vanguard) \(/.test(r.split(' : ').pop()))) host.append(el('label', { class: 'opt blk' }, el('input', { type: 'checkbox', checked: !!us.vtl, onchange: e => { us.vtl = e.target.checked; touch(); } }), el('span', {}, L`Échanger Avant-garde (X) contre Ligne (1)`, el('i', {}, ` ${detName(det)} : ${detDef(det.type).notes[0]}`))));
  if (slot && slot.becomesFaction) host.append(el('p', { class: 'note' }, L`${slot.src} : les Figurines de cette unité prennent le Trait de Faction ${slot.becomesFaction}.`));
  if (armyOf(army.faction) === 'quest' && hasType(u, /Chevalier|Knight/) && (DB.core.vows || []).length) {
    const f = el('fieldset', {}, el('legend', {}, L`Vœu Questoris (facultatif, déclaré au déploiement)`));
    const taken = vowsTaken(us);
    f.append(el('label', { class: 'opt' }, el('input', { type: 'radio', name: 'vow', checked: !us.vow, onchange: () => { us.vow = null; touch(); } }), el('span', {}, L`Aucun`)));
    for (const v of DB.core.vows.filter(v => !v.paradigm || v.paradigm === army.faction)) { const ko = taken.has(v.id);
      f.append(el('label', { class: 'opt' + (ko ? ' ko' : '') }, el('input', { type: 'radio', name: 'vow', disabled: ko && us.vow !== v.id, checked: us.vow === v.id, onchange: () => { us.vow = v.id; touch(); } }), el('span', {}, v.name, el('i', {}, ko ? L`Déjà déclaré pour un autre Chevalier : un même Vœu ne peut servir qu'une fois par armée.` : v.text)))); }
    host.append(f);
  }
  if ((u.traits || []).includes('[Mechanicum]')) host.append(el('label', { class: 'inl blk' }, L`Variante de Faction (Techno-arcane) : `, el('select', { onchange: e => { us.arcana = e.target.value || null; touch(); } }, el('option', { value: '' }, L`À choisir…`), ARCANA.map(a => el('option', { value: a, selected: us.arcana === a }, a)))));
  if (!isVeh(u)) { const trs = []; army.dets.forEach(d => slotsOf(d).forEach(s2 => { const t = d.units[s2.i], tu = t && UNITS[t.u]; if (tu && capacity(tu)) trs.push([`${d.id}:${s2.i}`, L`${tu.name} (${detName(d)}, capacité ${capacity(tu, d, s2.i)})`]); }));
    if (trs.length) host.append(el('label', { class: 'inl blk' }, L`Embarquée à bord de : `, el('select', { onchange: e => { us.embark = e.target.value || null; touch(); } }, el('option', { value: '' }, L`Aucun transport`), trs.map(([k, n]) => el('option', { value: k, selected: us.embark === k }, n))))); }
  (u.options || []).forEach((o, oi) => {
    const ch = optChoices(o), max = optMax(o, us), cnt = optCount(us, oi);
    if (o.legacy && !legacyOn() && !cnt) return;
    if (o.supersedes && !legacyOn() && !cnt) return;
    if (o.prov && !(army.provenances || []).includes(o.prov) && !cnt) return;
    if (o.oath && !detOaths(det).some(x => x.id === o.oath) && !cnt) return;
    if (o.faction && !itemState(o, u, det).show && !cnt) return;
    if ((o.allegiance && army.allegiance !== o.allegiance) || (o.arcana && us.arcana !== o.arcana) || (o.notArcana && us.arcana === o.notArcana) || (o.slotRole && slot && slot.role !== o.slotRole)) { if (!cnt) return; }
    if (o.advOpt && det.adv[sel.slot] !== o.advOpt && !cnt) return;
    if (o.supersedes && legacyOn()) {} ;
    if (!o.advOpt && advDef(det.adv[sel.slot]) && advDef(det.adv[sel.slot]).noUnitOptions && !cnt) return;
    if (supersededBy(u, oi) && !cnt) return;
    const av = optAvail(o, us, oi), cap = Math.min(max, av.cap);
    const ok_ = okey(u, oi), picked = ((us.opts = us.opts || {})[ok_] = us.opts[ok_] || {});
    const blocked = (o.notVariant != null && us.variant === o.notVariant) || (o.onlyVariant != null && us.variant !== o.onlyVariant);
    const f = el('fieldset', { class: blocked ? 'ko' : '' }, el('legend', {}, optText(o), o.legacy ? el('small', { class: 'tag' }, L`Legacies`) : null, o.lang === 'en' && !o.legacy && LANG === 'fr' ? el('small', { class: 'tag', title: L`Option de la version anglaise à jour (Wahapedia), absente du livre français` }, 'EN') : null, o.faction ? el('small', { class: 'tag' }, o.faction) : null, max > 1 ? el('i', {}, ` ${cnt}/${cap}`) : null));
    if (av.why && cap < max) f.append(el('p', { class: 'note lim' }, L`Limité à ${cap} : ${av.why}.`));
    if (o.ref) f.append(el('p', { class: 'note' }, o.ref));
    if (blocked) f.append(el('p', { class: 'note' }, o.onlyVariant != null ? L`Réservé à ${u.variants[o.onlyVariant].name}.` : L`Inaccessible à ${u.variants[us.variant].name}.`));
    if (max <= 0) f.append(el('p', { class: 'note' }, o.max && o.max.per ? L`Disponible à partir de ${o.max.per} figurines dans l'unité.` : L`Indisponible avec la composition actuelle.`));
    if (o.allOrNothing && max > 1) {
      const cur = Object.keys(picked).find(k => picked[k] > 0);
      f.append(el('p', { class: 'note' }, L`Toute l'unité ou aucune figurine.`));
      [[-1, L`Aucun`, '']].concat(ch.map((c, k) => [k, c.name, c.points ? L`+${c.points}/fig.` : L`gratuit`])).forEach(([k, n, cost]) => {
        if (k >= 0 && cur != k && !itemState(ch[k], u, det, us).show) return;
        f.append(el('label', { class: 'opt' }, el('input', { type: 'radio', name: 'o' + oi, checked: k < 0 ? cur == null : cur == k, disabled: blocked || (k >= 0 && cap < max && cur != k),
          onclick: () => { for (const kk of Object.keys(picked)) delete picked[kk]; if (k >= 0) picked[k] = max; touch(); } }), el('span', {}, n), el('b', {}, cost)));
      });
      if (o.note) f.append(el('p', { class: 'note' }, o.note));
      host.append(f); return;
    }
    ch.forEach((c, k) => {
      const q = picked[k] || 0, cost = c.points ? `+${c.points}` : L`gratuit`;
      if (!q && !itemState(c, u, det, us).show) return;
      if (max === 1 || o.unique) f.append(el('label', { class: 'opt' }, el('input', { type: (o.unique && max > 1) || ch.length === 1 ? 'checkbox' : 'radio', name: 'o' + oi, checked: q > 0, disabled: blocked || (max <= 0) || (!q && (o.unique && max > 1 ? cnt >= cap : cap <= 0)),
        onclick: e => { const was = q > 0; if (!(o.unique && max > 1) ) for (const kk of Object.keys(picked)) delete picked[kk]; if (was) delete picked[k]; else { if (o.unique && optCount(us, oi) >= max) { e.preventDefault(); flash(L`Maximum ${max} choix pour cette option.`); return; } picked[k] = 1; } touch(); } }),
        el('span', {}, c.name), el('b', {}, cost)));
      else f.append(el('div', { class: 'opt' }, el('span', {}, c.name), el('b', {}, cost + (c.points && (o.max === 'models' || typeof o.max === 'object') ? '/fig.' : '')),
        stepper(q, 0, o.eachChoice ? cap : q + Math.max(0, cap - cnt), v => { if (v) picked[k] = v; else delete picked[k]; touch(); })));
    });
    if (o.note) f.append(el('p', { class: 'note' }, o.note));
    host.append(f);
  });
  if (u.upgrades) {
    const f = el('fieldset', {}, el('legend', {}, L`Amélioration (une seule par unité)`));
    f.append(el('label', { class: 'opt' }, el('input', { type: 'radio', name: 'up', checked: us.upgrade == null, onchange: () => { us.upgrade = null; touch(); } }), el('span', {}, L`Aucune`)));
    u.upgrades.forEach((g, i) => { const ok = upgradeOk(u, us, g); f.append(el('label', { class: 'opt' + (ok.ok ? '' : ' ko') }, el('input', { type: 'radio', name: 'up', disabled: !ok.ok && us.upgrade !== i, checked: us.upgrade === i, onchange: () => { us.upgrade = i; touch(); } }), el('span', {}, g.name, el('i', {}, ok.ok ? (g.note || '') : ok.why)), el('b', {}, '+' + g.points))); });
    host.append(f);
  }
  if (u.sectionsPending) host.append(el('p', { class: 'note pending' }, L`Équipement, règles ou type de cette unité incomplets dans la base (page mal lisible) : à compléter d'après le livre.`));
  if (u.optionsPending) host.append(el('p', { class: 'note pending' }, L`Options d'équipement de cette unité pas encore saisies dans la base : seul le coût de base est compté.`));
  const eu = effUnit(u, us);
  if (u.unverified) host.append(el('p', { class: 'note warn' }, L`Profil non vérifié — source : ` + (u.source || L`données communautaires`) + L`. Comparez avec le Journal Tactica avant de jouer.` + (u.note ? ' ' + u.note : '')));
  if (eu.effects) host.append(el('p', { class: 'note' }, L`Appliqué : ` + [...new Set(eu.effects)].map(trData).join(', ') + '.'));
  host.append(el('h4', {}, L`Profil`), ...statTable(eu, us));
  { const ws = unitWeapons(u, us); if (ws.length) host.append(el('h4', {}, L`Profils d'armes`), weaponTables(ws)); }
  const sect = (t, arr, chip) => arr && arr.length ? host.append(el('h4', {}, t), el('div', { class: 'chips' }, arr.map(x => chip ? ruleChip(x) : el('span', { class: 'chip plain' }, x)))) : 0;
  sect(L`Équipement de base`, currentWargear(u, us), true); sect(L`Règles spéciales`, unitRules(eu, us), true); sect(L`Type`, eu.types, false); sect(L`Traits`, (eu.traits || []).map(t => /^\[All[ée]g[ei]ance\]$/.test(t) ? army.allegiance : /^\[(Legiones Astartes|Questoris Familia|Mechanicum|Skitarii|Ætheric Dominion)\]$/.test(t) ? (t === '[Mechanicum]' && us.arcana ? us.arcana : detFaction(det) || t) : t), false);
  if (u.notes) host.append(el('p', { class: 'note' }, u.notes));
  host.append(el('div', { class: 'acts' }, el('button', { class: 'btn ghost', type: 'button', onclick: () => duplicateUnit(det, sel.slot) }, L`Dupliquer`), el('button', { class: 'btn danger', type: 'button', onclick: () => removeUnit(det, sel.slot) }, L`Retirer l'unité`)));
}
function removeUnit(det, i) {
  const s = slotsOf(det).find(x => x.i === i) || { i };
  const adv = det.adv[i], ad = adv && advDef(adv);
  const extra = [];
  if (adv === 'logistique') { const idx = detDef(det.type).slots.length; if (det.units[idx]) extra.push(idx); }
  if (ad && ad.addSlot) for (let k = 0; k < (ad.addSlot.count || 1); k++) if (det.units[addedIdx(i, k)]) extra.push(addedIdx(i, k));
  const uu = det.units[i] && UNITS[det.units[i].u]; if (uu && uu.addSlot && det.units[200 + i]) extra.push(200 + i);
  if (extra.length && !confirm(L`La case ajoutée par « ${ad ? ad.name : uu.name} » disparaît avec cette unité, ainsi que ${extra.map(j => (UNITS[det.units[j].u] || {}).name || L`son unité`).join(', ')}. Continuer ?`)) return false;
  if (adv) setAdv(det, s, '');
  delete det.units[i]; delete det.adv[i]; if (uu && uu.addSlot) delete det.units[200 + i];
  if (sel && sel.det === det.id && sel.slot === i) sel = null;
  document.body.classList.remove('editing'); touch(); return true;
}
function duplicateUnit(det, i) {
  const us = det.units[i], u = UNITS[us.u];
  const free = slotsOf(det).filter(s => !det.units[s.i] && unitAllowed(det, s, u).ok);
  if (!free.length) return flash(L`Aucune case libre de ce détachement ne peut recevoir une copie de cette unité.`);
  const c = JSON.parse(JSON.stringify(us)); delete c.vow; det.units[free[0].i] = c; sel = { det: det.id, slot: free[0].i }; touch(); flash(L`${u.name} dupliquée.`);
}
function setAdv(det, slot, id) {
  const prev = det.adv[slot.i];
  if (prev && advDef(prev) && advDef(prev).addSlot && prev !== id) { for (let k = 0; k < (advDef(prev).addSlot.count || 1); k++) { delete det.units[addedIdx(slot.i, k)]; delete det.adv[addedIdx(slot.i, k)]; } if (det.advSlot) delete det.advSlot[slot.i]; }
  if (prev === 'logistique' && id !== 'logistique') { const idx = detDef(det.type).slots.length; delete det.units[idx]; delete det.adv[idx]; det.bonusRole = null; }
  if (id) det.adv[slot.i] = id; else delete det.adv[slot.i];
  touch();
}
function stepper(v, min, max, cb) {
  return el('span', { class: 'step' }, el('button', { type: 'button', 'aria-label': L`Moins`, disabled: v <= min, onclick: () => cb(v - 1) }, '−'), el('output', {}, String(v)), el('button', { type: 'button', 'aria-label': L`Plus`, disabled: v >= max, onclick: () => cb(v + 1) }, '+'));
}
let flashT; function flash(msg) { const f = $('#flash'); f.textContent = msg; f.classList.add('on'); clearTimeout(flashT); flashT = setTimeout(() => f.classList.remove('on'), 2600); }

/* ---------- Infobulles de règles ---------- */
function showTip(target) {
  const name = target.dataset.rule, r = lookupRule(name), tip = $('#tip');
  tip.replaceChildren(el('b', {}, name), el('p', {}, r ? (r.summaryEn || r.summary) : L`Résumé non encore saisi dans la base de données.`), r && r.ref ? el('i', {}, r.ref) : null);
  tip.hidden = false;
  const b = target.getBoundingClientRect(), w = Math.min(340, innerWidth - 16);
  tip.style.width = w + 'px';
  tip.style.left = Math.max(8, Math.min(innerWidth - w - 8, b.left)) + 'px';
  const th = tip.offsetHeight; tip.style.top = (b.bottom + th + 12 > innerHeight ? Math.max(8, b.top - th - 8) : b.bottom + 8) + 'px';
}
document.addEventListener('mouseover', e => { const t = e.target.closest('[data-rule]'); if (t) showTip(t); });
document.addEventListener('mouseout', e => { if (e.target.closest('[data-rule]')) $('#tip').hidden = true; });
document.addEventListener('focusin', e => { const t = e.target.closest('[data-rule]'); if (t) showTip(t); });
document.addEventListener('focusout', e => { if (e.target.closest('[data-rule]')) $('#tip').hidden = true; });
document.addEventListener('click', e => { const t = e.target.closest('[data-rule]'); if (t) { showTip(t); e.stopPropagation(); } else $('#tip').hidden = true; });

/* ---------- Feuille d'armée (impression / PDF) ---------- */
const wkey = n => String(n).toLowerCase().replace(/’/g, "'").replace(/^(two |deux |trois |quatre |six |paire de |pair of )/, '').replace(/^(turret|hull \(front\)|hull|sponson|pintle|co-axial|centreline|arm|boresight|carapace)( mounted)? /, '').replace(/ (de tourelle|de coque.*|latéra\w*|sur pivot|d'axe central|d'axe médian|de bras|de carapace|dorsale?|coaxiale?)$/, '').split(' ').map(x => x.replace(/s$/, '')).join(' ').trim();
function unitWeapons(u, us) {
  if (!DB.weapons.length) return [];
  const names = [...currentWargear(u, us).map(w => w.split(' : ').pop().replace(/\s*\(.*\)$/, ''))];
  (u.options || []).forEach((o, oi) => { const ch = optChoices(o); for (const k of Object.keys(us ? picksOf(us, oi) : {})) if (ch[k]) names.push(...(ch[k].gives || [ch[k].name])); });
  const parts = n => String(n).split(/ and (?:one |two |three |four |a |an )?| et (?:un |une |deux |trois )?/i).map(x => x.replace(/^(one|two|three|four|a|an) /i, '').replace(/\b(Turret|Hull|Sponson|Pintle|Centreline|Co-axial|Arm|Boresight|Carapace|Dorsal)( \([^)]*\))* Mounted /gi, '').replace(/ \([^)]*\)$/, '').trim());
  const keys = new Set(names.flatMap(n => [n, ...parts(n)]).map(wkey)), out = [], seen = new Set();
  const lg = w => (w.lang || 'fr') === (u.lang || 'fr') ? 0 : 1;
  for (const w of [...DB.weapons].sort((a, b) => lg(a) - lg(b))) { const k = wkey(w.name.replace(/\s*-\s.*$/, '')); if ((keys.has(k) || keys.has(wkey(w.name)) || (w.aliases || []).some(x => keys.has(wkey(x)))) && !seen.has(w.name + w.kind)) { seen.add(w.name + w.kind); out.push(w); } }
  return out;
}
function weaponTables(ws) {
  const byH = {}; ws.forEach(w => (byH[w.kind + '|' + w.heads.join('|')] = byH[w.kind + '|' + w.heads.join('|')] || []).push(w));
  return el('div', {}, Object.values(byH).map(g => el('div', { class: 'tblw' }, el('table', { class: 'stats weap' },
    el('thead', {}, el('tr', {}, el('th', {}, g[0].kind === 'melee' ? L`Mêlée` : L`Tir`), g[0].heads.map(h => el('th', {}, LANG !== 'fr' && I18N.heads && I18N.heads.weapon[h] || h)))),
    el('tbody', {}, g.map(w => el('tr', {}, el('th', {}, w.name), w.values.map(v => el('td', {}, v)))))))));
}
function renderSheet(issues) {
  const s = $('#sheet'); s.replaceChildren();
  const errs = issues.filter(i => i.level === 'err');
  s.append(el('header', { class: 'sh-head' }, el('div', {}, el('p', { class: 'sh-over' }, L`Feuille d'Armée — ` + modeDef().name), el('h1', {}, army.name), el('p', {}, `${army.faction}${doctrineDef() ? ' · ' + doctrineDef().name : ''}${riteDef() ? L` · Rite : ` + riteDef().name : ''} · ${trData(army.allegiance)}`)),
    el('div', { class: 'sh-pts' }, el('b', {}, armyPoints()), el('span', {}, L`sur ${army.limit} points`))));
  { const ex = []; if (!legacyOn()) ex.push(L`Sans Legacies`); if (mainDef().alt) ex.push(L`Détachement Principal : ` + mainDef().name); if ((army.shattered || []).length) ex.push(L`Shattered Legions : ` + army.shattered.join(', ')); if ((army.provenances || []).length && (armyOf(army.faction) === 'mil' || army.dets.some(d => armyOf(detFaction(d)) === 'mil'))) ex.push(L`Provenances : ` + army.provenances.map(p => provDef(p).name).join(', ')); if (paradigm()) ex.push(L`Paradigme : ` + paradigm().name);
    army.dets.forEach(d => { if ((d.oaths || []).length) ex.push(detName(d) + L` — Oaths of Moment : ` + d.oaths.map(i => oathDef(i).name).join(', ')); });
    if (ex.length) s.append(el('p', { class: 'sh-extra' }, ex.join(' · '))); }
  if (errs.length) s.append(el('p', { class: 'sh-warn' }, L`Liste non conforme : ${errs.length} point${errs.length > 1 ? 's' : ''} à corriger.`));
  { const r = riteDef(); if (r) s.append(el('section', { class: 'sh-rite' }, el('h2', {}, el('span', {}, L`Rite de Guerre — ` + r.name), el('i', {}, r.faction)),
      el('p', {}, el('b', {}, L`Tactica : ` + trData(r.tactica) + '. '), r.tacticaText), el('p', {}, el('b', {}, L`Posture : ` + trData(r.posture || '') + '. '), r.postureText))); }
  const usedRules = new Set();
  for (const det of army.dets) {
    const filled = slotsOf(det).filter(x => det.units[x.i]); if (!filled.length) continue;
    const d = el('section', { class: 'sh-det' }, el('h2', {}, el('span', {}, detName(det)), el('i', {}, L`${detFaction(det)} · ${detPoints(det)} pts`)));
    for (const sl of filled) {
      const us = det.units[sl.i], u = UNITS[us.u]; if (!u) continue;
      const picks = [];

      (u.options || []).forEach((o, oi) => { const ch = optChoices(o); for (const [k, q] of Object.entries(picksOf(us, oi))) if (ch[k]) picks.push((q > 1 ? q + L` × ` : '') + ch[k].name); });
      if (us.upgrade != null && u.upgrades) picks.push(u.upgrades[us.upgrade].name);
      if (us.vow && vowDef(us.vow)) picks.push(L`Vœu : ` + vowDef(us.vow).name);
      const comp = u.models.map((m, mi) => `${m.count + (u.extra && u.extra.model === m.name ? (us.extra || 0) : 0)} ${trData(mi === 0 && us.variant != null && u.variants ? u.variants[us.variant].name : m.name)}`).join(', ') + (u.extra && !u.models.some(m => m.name === u.extra.model) && us.extra ? `, +${us.extra} ${u.extra.model}` : '');
      const ur = unitRules(effUnit(u, us), us); ur.forEach(r => usedRules.add(r.split(' : ').pop()));
      d.append(el('article', { class: 'sh-unit' },
        el('h3', {}, el('span', { class: 'sh-role' }, role(u.role).short), el('span', {}, us.label ? `${us.label} — ${trData(u.name)}` : u.name), el('b', {}, unitPoints(us) + L` pts`)),
        el('p', { class: 'sh-comp' }, comp, det.adv[sl.i] ? el('em', {}, L` — Avantage Principal : ${advDef(det.adv[sl.i]).name}`) : null),
        statTable(effUnit(u, us) || u, us),
        el('p', {}, el('b', {}, L`Équipement : `), currentWargear(u, us).map(trData).join(', ') || '—'),
        picks.length ? el('p', {}, el('b', {}, L`Options : `), picks.map(trData).join(', ')) : null,
        ur.length ? el('p', {}, el('b', {}, L`Règles : `), ur.map(trData).join(', ')) : null));
    }
    s.append(d);
  }
  const seenR = new Set(), gl = [];
  for (const r of [...usedRules].sort((a, b) => a.localeCompare(b))) { const d = lookupRule(r); if (d && !seenR.has(d)) { seenR.add(d); gl.push([r.replace(/\s*\((?:[^)]*seulement|[^)]* only)\)$/, ''), d]); } }
  if (gl.length) s.append(el('section', { class: 'sh-gloss' }, el('h2', {}, el('span', {}, L`Aide-mémoire des règles`)), gl.map(([n, r]) => el('p', {}, el('b', {}, trData(n) + '. '), r.summaryEn || r.summary, r.ref ? el('i', {}, ' ' + r.ref) : null))));
  s.append(el('footer', {}, L`Base de données ${DB.core.version}${DB.custom ? L` (modifiée)` : ''} · Outil non officiel, à utiliser avec vos livres. Warhammer: The Horus Heresy est une marque de Games Workshop Ltd.`));
}

/* ---------- Listes & base de données ---------- */
/* Plateformes : navigateur, application de bureau (Electron) ou Android (Capacitor) */
const NATIVE = window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform() ? 'android' : /Electron/.test(navigator.userAgent) ? 'desktop' : null;
async function saveFile(name, blob) {
  if (NATIVE === 'android') {
    try {
      const data = await new Promise((ok, ko) => { const r = new FileReader(); r.onload = () => ok(String(r.result).split(',')[1]); r.onerror = ko; r.readAsDataURL(blob); });
      const C = window.Capacitor, w = await C.nativePromise('Filesystem', 'writeFile', { path: name, data, directory: 'CACHE', recursive: true });
      await C.nativePromise('Share', 'share', { title: name, files: [w.uri], dialogTitle: L`Enregistrer ou envoyer ` + name });
      return true;
    } catch (e) { if (!/cancel/i.test(String(e && e.message))) flash(L`Enregistrement impossible : ` + (e && e.message || e)); return false; }
  }
  const a = el('a', { href: URL.createObjectURL(blob), download: name }); document.body.append(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1500);
  return true;
}
function download(name, text) { saveFile(name, new Blob([text], { type: 'application/json' })); }
function pickFile(cb, accept = '.json,application/json', parse = JSON.parse) { const i = el('input', { type: 'file', accept }); i.onchange = () => { const f = i.files[0]; if (!f) return; const r = new FileReader(); r.onload = () => { try { cb(parse(r.result)); } catch (e) { alert(L`Fichier illisible.
` + e.message); } }; r.readAsText(f); }; i.click(); }
const importListFile = cb => pickFile(cb, '.txt,.json,text/plain,application/json', parseListFile);
function openLists() {
  const dlg = $('#dlg'), body = $('#dlg-body'); body.replaceChildren(); $('#dlg-title').textContent = L`Mes listes`;
  const all = Object.values(store.all()).sort((a, b) => b.updated - a.updated);
  body.append(el('div', { class: 'acts' }, el('button', { class: 'btn', onclick: () => { army = newArmy(); sel = null; dlg.close(); touch(); } }, L`Nouvelle liste`),
    el('button', { class: 'btn ghost', onclick: () => importListFile(j => { if (!j.dets) return alert(L`Ce fichier n'est pas une liste Forbidden Recruit.`); j.id = uid(); migrateArmy(j); army = j; army.step = 3; sel = null; dlg.close(); touch(); flash(L`Liste importée.`); }) }, L`Importer une liste (.txt)`)));
  if (!all.length) body.append(el('p', { class: 'note' }, L`Aucune liste enregistrée sur cet appareil.`));
  for (const a of all) {
    const pts = (() => { const keep = army; army = a; const p = armyPoints(); army = keep; return p; })();
    body.append(el('div', { class: 'pick' + (a.id === army.id ? ' cur' : '') }, el('span', {}, el('b', {}, a.name), el('i', {}, L`${a.faction} · ${pts}/${a.limit} pts · modifiée le ${new Date(a.updated).toLocaleDateString(LANG === 'fr' ? 'fr-FR' : 'en-GB')}`)),
      el('span', { class: 'acts' }, el('button', { class: 'btn', onclick: () => { army = a; sel = null; dlg.close(); LS.set('30k.last', a.id); if (!army.step) army.step = 3; render(); } }, L`Ouvrir`),
        el('button', { class: 'btn ghost', onclick: () => { const c = JSON.parse(JSON.stringify(a)); c.id = uid(); c.name += L` (copie)`; store.save(c); openLists(); } }, L`Dupliquer`),
        el('button', { class: 'btn ghost', onclick: () => { const k = army; army = a; exportPDF(); army = k; } }, 'PDF'),
        el('button', { class: 'btn ghost', onclick: () => { const k = army; army = a; exportText(); army = k; } }, L`Texte`),
        el('button', { class: 'btn ghost danger', onclick: () => { if (!confirm(L`Supprimer définitivement « ${a.name} » ?`)) return; store.remove(a.id); if (a.id === army.id) { army = newArmy(); render(); } openLists(); } }, L`Supprimer`))));
  }
  body.append(el('p', { class: 'note' }, L`Les listes sont enregistrées automatiquement dans l'application, sur cet appareil : rien à faire. « PDF » crée la feuille d'armée, « Texte » un fichier lisible que l'on peut aussi réimporter sur un autre appareil.`));
  dlg.showModal();
}
const APP_VERSION = '2026.11-o';
const UPDATE_DEFAULT = 'https://yaoz52.github.io/forbidden-recruit';
const updUrl = () => (LS.get('30k.updateUrl', null) || (location.protocol.startsWith('http') ? location.href.replace(/[^/]*$/, '') : UPDATE_DEFAULT) || '').trim().replace(/\/+$/, '');
async function checkUpdates(statusEl, install) {
  const base = updUrl();
  if (!base) { statusEl.textContent = L`Indiquez d'abord l'adresse de votre dépôt de mises à jour.`; return; }
  statusEl.textContent = L`Recherche des mises à jour…`;
  try {
    const man = await (await fetch(base + '/manifest.json?t=' + Date.now(), { cache: 'no-store' })).json();
    const parts = [];
    const newData = man.dataVersion && man.dataVersion > DB.core.version;
    const newApp = man.appVersion && man.appVersion > APP_VERSION;
    if (!newData && !newApp) { statusEl.textContent = L`Vous êtes à jour (application ${APP_VERSION}, données ${DB.core.version}).`; return; }
    if (newData) parts.push(L`Nouvelles données ${man.dataVersion}` + (man.notes ? ` : ${man.notes}` : ''));
    if (newApp) parts.push(L`Nouvelle version de l'application ${man.appVersion}`);
    statusEl.replaceChildren(el('span', {}, parts.join(' — ') + '. '));
    if (newData) statusEl.append(el('button', { class: 'btn', type: 'button', onclick: async () => {
      statusEl.textContent = L`Téléchargement…`;
      try {
        const core = await (await fetch(base + '/data/core.json?t=' + Date.now(), { cache: 'no-store' })).json();
        const books = []; for (const f of core.bookFiles) books.push(await (await fetch(base + '/data/' + f + '?t=' + Date.now(), { cache: 'no-store' })).json());
        const pb = checkData({ core, books }); if (pb.length) { statusEl.textContent = L`Mise à jour refusée (fichiers incohérents) : ` + pb.slice(0, 3).join(' ; '); return; }
        if (!LS.set('30k.customData', { core, books, source: 'update' })) { statusEl.textContent = L`Espace de stockage insuffisant sur cet appareil.`; return; }
        statusEl.textContent = L`Données installées. Redémarrage…`; setTimeout(() => location.reload(), 600);
      } catch (e) { statusEl.textContent = L`Échec du téléchargement : ` + e.message; }
    } }, L`Installer les nouvelles données`));
    if (newApp) statusEl.append(' ', NATIVE ? el('a', { class: 'btn ghost', href: base + '/telecharger.html', target: '_blank', rel: 'noopener' }, L`Télécharger la nouvelle version`) : el('a', { class: 'btn ghost', href: base + '/' + (man.appFile || 'forbidden-recruit.html'), download: man.appFile || 'forbidden-recruit.html' }, L`Télécharger la nouvelle application`));
  } catch (e) { statusEl.textContent = L`Impossible de joindre le dépôt de mises à jour (connexion ou adresse). ` + e.message; }
}
function openSettings() {
  const dlg = $('#dlg'), body = $('#dlg-body'); body.replaceChildren(); $('#dlg-title').textContent = L`Réglages`;
  const st = el('p', { class: 'note upd-status', role: 'status' });
  const url = el('input', { type: 'url', value: updUrl(), placeholder: 'https://votre-compte.github.io/forbidden-recruit-mises-a-jour', 'aria-label': L`Adresse du dépôt de mises à jour`, class: 'field' });
  body.append(
    el('h4', {}, L`Apparence`),
    el('p', { class: 'note' }, L`Mode`),
    el('div', { class: 'acts' }, [['auto', L`Comme l'appareil`], ['dark', L`Sombre`], ['light', L`Clair`]].map(([v, l]) => el('button', { type: 'button', class: 'btn' + (LS.get('fr.theme', 'auto') === v ? '' : ' ghost'), onclick: () => { LS.set('fr.theme', v); applyTheme(); openSettings(); } }, l))),
    el('p', { class: 'note' }, L`Skin`),
    el('div', { class: 'choices skins' }, SKINS().map(([v, n, d]) => el('button', { type: 'button', class: 'choice skin-' + v, 'aria-pressed': String(LS.get('fr.skin', 'forge') === v), onclick: () => { LS.set('fr.skin', v); applyTheme(); openSettings(); } }, el('span', { class: 'sw', 'aria-hidden': 'true' }), el('b', {}, n), el('i', {}, d)))),
    el('h4', {}, L`Installer sur un autre appareil`),
    el('p', { class: 'note' }, L`Android, Windows, Mac ou navigateur : `, el('a', { href: (updUrl() || UPDATE_DEFAULT) + '/telecharger.html', target: '_blank', rel: 'noopener' }, L`page de téléchargement`), '.'),
    el('h4', {}, L`Mise à jour`),
    el('p', {}, L`Application ${APP_VERSION} · données ${DB.core.version}${DB.custom === 'update' ? L` (mise à jour installée)` : DB.custom ? L` (base modifiée par vous)` : ''}.`),
    el('label', { class: 'inl' }, L`Adresse de votre dépôt de mises à jour`, url),
    el('div', { class: 'acts' }, el('button', { class: 'btn', type: 'button', onclick: () => { LS.set('30k.updateUrl', url.value.trim()); checkUpdates(st); } }, L`Vérifier les mises à jour`),
      el('button', { class: 'btn ghost', type: 'button', onclick: () => pickFile(j => { const d = j.core ? j : null; const pb = d ? checkData(d) : [L`Ce fichier n'est pas une base Forbidden Recruit.`]; if (pb.length) return alert(L`Fichier refusé, rien n'a été changé :

• ` + pb.slice(0, 12).join('\n• ')); LS.set('30k.customData', { ...d, source: 'update' }); location.reload(); }) }, L`Installer une mise à jour depuis un fichier`)),
    st,
    el('h4', {}, L`Mes listes`),
    el('p', { class: 'note' }, L`Vos listes sont enregistrées automatiquement dans l'application, sur cet appareil. Pour les copier sur un autre appareil ou en garder une sauvegarde, créez un fichier de sauvegarde.`),
    el('div', { class: 'acts' },
      el('button', { class: 'btn ghost', type: 'button', onclick: () => { const all = store.all(), n = Object.keys(all).length; const blob = new Blob([L`Forbidden Recruit — sauvegarde de ` + n + L` liste(s), ` + new Date().toLocaleString('fr-FR') + '\r\n#30K-SAUVEGARDE ' + btoa(unescape(encodeURIComponent(JSON.stringify(all))))], { type: 'text/plain;charset=utf-8' }); saveFile((LANG === 'fr' ? 'forbidden-recruit-sauvegarde.txt' : 'forbidden-recruit-backup.txt'), blob); flash(n + L` liste(s) sauvegardée(s).`); } }, L`Sauvegarder toutes les listes`),
      el('button', { class: 'btn ghost', type: 'button', onclick: () => pickFile(all => { const cur = store.all(); let n = 0; for (const a of Object.values(all)) if (a && a.dets) { cur[a.id] = a; n++; } LS.set('30k.lists', cur); flash(n + L` liste(s) restaurée(s).`); openSettings(); }, '.txt,text/plain', t => { const m = t.match(/#30K-SAUVEGARDE ([A-Za-z0-9+/=]+)/); if (!m) throw new Error(L`Ce fichier n'est pas une sauvegarde Forbidden Recruit.`); return JSON.parse(decodeURIComponent(escape(atob(m[1])))); }) }, L`Restaurer une sauvegarde`))
  );
  { const E = DB.core.errata || []; if (E.length) { const d = el('details', {}, el('summary', {}, L`FAQ et errata intégrés (${E.length})`));
    E.forEach(e => d.append(el('p', { class: 'note', lang: e.lang }, el('b', {}, e.ref + ' — '), e.text, el('i', {}, ` (${e.src})`)))); body.append(el('h4', {}, L`FAQ et errata`), d); } }
  dlg.showModal(); openDataInto(body, false);
}
function openDataInto(body, standalone) {
  body.append(el('h4', {}, L`Base de données`));
  body.append(el('p', {}, L`Version ${DB.core.version}${DB.custom === 'update' ? L` — mise à jour installée` : DB.custom ? L` — fichier importé par vous` : L` — fournie avec l'application`}. ${Object.keys(UNITS).length} unités, ${DB.detachments.length} détachements, ${Object.keys(DB.rules).length} règles résumées.`),
    el('ul', { class: 'plain' }, DB.books.filter(b => b.name).map(b => el('li', {}, L`${b.name} — ${(b.units || []).length} unités (${b.source || ''})`))),
    el('p', { class: 'note' }, L`Toutes les données de jeu (coûts, profils, options, détachements, résumés de règles) sont dans un fichier JSON lisible. Exportez-le, corrigez-le dans un éditeur de texte après une FAQ ou un errata, puis réimportez-le : l'application n'a pas besoin d'être modifiée.`),
    el('div', { class: 'acts' },
      el('button', { class: 'btn', onclick: () => download(`forbidden-recruit-donnees-${DB.core.version}.json`, JSON.stringify({ core: DB.core, books: DB.books }, null, 1)) }, L`Exporter la base`),
      el('button', { class: 'btn ghost', onclick: () => pickFile(j => { const p = checkData(j); if (p.length) return alert(L`Base refusée, rien n'a été changé :

• ` + p.slice(0, 12).join('\n• ')); LS.set('30k.customData', j); location.reload(); }) }, L`Importer une base modifiée`),
      DB.custom ? el('button', { class: 'btn ghost danger', onclick: () => { if (confirm(L`Revenir à la base fournie avec l'application ?`)) { LS.del('30k.customData'); location.reload(); } } }, L`Revenir à la base d'origine`) : null));
}
/* Contrôle d'une base importée : on refuse plutôt que de casser les listes. */
function checkData(j) {
  const p = [];
  if (!j || !j.core || !Array.isArray(j.books)) return [L`Structure attendue : { "core": {...}, "books": [...] }.`];
  const roles = j.core.roles || {}; const ids = new Set();
  for (const d of [...(j.core.detachments || []), ...j.books.flatMap(b => b.detachments || [])]) {
    if (!d.id || !d.name || !Array.isArray(d.slots)) p.push(L`Détachement incomplet : ${d.id || d.name || '?'}`);
    for (const s of d.slots || []) if (!roles[s.role]) p.push(L`Détachement ${d.name} : rôle inconnu « ${s.role} »`);
  }
  for (const b of j.books) for (const u of b.units || []) {
    const n = u.name || u.id || '?';
    if (!u.id || !u.name) p.push(L`Unité sans id ou sans nom (${n})`);
    if (ids.has(u.id)) p.push(L`Identifiant en double : ${u.id}`); ids.add(u.id);
    if (!roles[u.role]) p.push(L`${n} : rôle inconnu « ${u.role} »`);
    if (typeof u.points !== 'number') p.push(L`${n} : « points » doit être un nombre`);
    if (!Array.isArray(u.models) || !u.models.length) p.push(L`${n} : « models » manquant`);
    for (const o of u.options || []) { for (const l of [].concat(o.list || [])) if (!j.books.some(x => (x.equipmentLists || {})[l])) p.push(L`${n} : liste d'équipement inconnue « ${l} »`);
      for (const c of o.choices || []) if (typeof c.points !== 'number') p.push(L`${n} : coût manquant pour « ${c.name} »`); }
  }
  return p;
}

/* ---------- Thème ---------- */
const SKINS = () => [['forge', 'Forge', L`L'habillage d'origine : laiton, céramite et braises.`], ['glass', 'Glass', L`Verre dépoli, transparences et couleurs douces.`], ['cyber', 'Cyberpunk', L`Néons, coins coupés et contrastes forts.`], ['clean', 'Clean', L`Minimaliste : à plat, sobre et lisible.`]];
const SKIN_BAR = { forge: ['#121315', '#ece6d8'], glass: ['#0e1328', '#eef1fb'], cyber: ['#0a0811', '#fcee0a'], clean: ['#111214', '#ffffff'] };
function applyTheme(t) { t = t || LS.get('fr.theme', 'auto'); const dark = t === 'dark' || (t === 'auto' && !matchMedia('(prefers-color-scheme: light)').matches);
  const skin = SKINS().some(x => x[0] === LS.get('fr.skin', 'forge')) ? LS.get('fr.skin', 'forge') : 'forge'; document.documentElement.dataset.skin = skin;
  document.documentElement.dataset.theme = dark ? 'dark' : 'light'; const m = document.querySelector('meta[name=theme-color]'); if (m) m.content = (SKIN_BAR[skin] || SKIN_BAR.forge)[dark ? 0 : 1];
  const b = $('#b-theme'); if (b) { b.textContent = dark ? '☀' : '☾'; b.title = dark ? L`Passer en mode clair` : L`Passer en mode sombre`; } }
/* ---------- Partage par lien (hors ligne : la liste est dans l'adresse) ---------- */
function shareLink() {
  const raw = JSON.stringify(army), b64 = btoa(unescape(encodeURIComponent(raw))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  const base = location.protocol.startsWith('http') ? location.origin + location.pathname : (updUrl() || UPDATE_DEFAULT) + '/';
  const url = base + '#liste=' + b64;
  const done = () => flash(L`Lien de la liste copié : collez-le dans un message.`);
  if (navigator.share && matchMedia(L`(pointer: coarse)`).matches) navigator.share({ title: army.name, url }).catch(() => {});
  else if (navigator.clipboard) navigator.clipboard.writeText(url).then(done, () => prompt(L`Copiez ce lien :`, url)); else prompt(L`Copiez ce lien :`, url);
}
function importFromHash() {
  const m = location.hash.match(/#liste=([\w-]+)/); if (!m) return;
  try { const a = JSON.parse(decodeURIComponent(escape(atob(m[1].replace(/-/g, '+').replace(/_/g, '/'))))); if (!a.dets) throw 0;
    a.id = uid(); migrateArmy(a); a.name = (a.name || L`Liste`) + L` (reçue)`; store.save(a); army = a; history.replaceState(null, '', location.pathname); flash(L`Liste « ${a.name} » ajoutée à Mes listes.`);
  } catch (e) { flash(L`Lien de liste illisible.`); }
}

/* ---------- Démarrage ---------- */
async function start() {
  try { await loadData(); } catch (e) { document.body.innerHTML = '<p style="padding:2rem">Impossible de charger la base de données : ' + e.message + '</p>'; return; }
  document.documentElement.lang = LANG; { const b = $('#b-lang'); if (b) { b.textContent = LANG === 'fr' ? 'EN' : 'FR'; b.title = LANG === 'fr' ? 'English' : 'Français'; b.setAttribute('aria-label', LANG === 'fr' ? 'Language: English' : 'Langue : Français'); } }
  translateStatic(document.body);
  store.backup(); try { navigator.storage && navigator.storage.persist && navigator.storage.persist(); } catch (e) {}
  const lists = store.all(), last = LS.get('30k.last'); { const notes = []; for (const a of Object.values(lists)) notes.push(...migrateArmy(a)); if (notes.length) setTimeout(() => flash([...new Set(notes)].slice(0, 3).join(' · ')), 1200); }
  army = lists[last] || Object.values(lists)[0] || newArmy(); if (!mainDet()) army = newArmy(); if (!army.step) army.step = Object.keys(mainDet().units).length ? 3 : 1;
  $('#name').addEventListener('input', e => { army.name = e.target.value; clearTimeout(saveT); saveT = setTimeout(() => { store.save(army); renderSheet(validate()); }, 400); });
  addEventListener('pagehide', () => { clearTimeout(saveT); store.save(army); });
  document.addEventListener('visibilitychange', () => { if (document.hidden) { clearTimeout(saveT); store.save(army); } });
  $('#add-det').addEventListener('click', openDetPicker);
  $('#b-lists').addEventListener('click', openLists);
  $('#b-data').addEventListener('click', openSettings);
  $('#b-print').addEventListener('click', exportPDF);
  $('#b-txt').addEventListener('click', exportText);
  if (NATIVE === 'android') $('#b-printer').hidden = true;
  if (NATIVE === 'android') document.addEventListener('click', e => { const l = e.target.closest && e.target.closest('a[target=_blank]'); if (l && /^https?:/.test(l.href)) { e.preventDefault(); location.href = l.href; } });
  $('#b-printer').addEventListener('click', () => { renderSheet(validate()); try { window.print(); } catch (e) { exportPDF(); } });
  $('#b-close').addEventListener('click', closeEditor);
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && document.body.classList.contains('editing') && !$('#dlg').open) closeEditor(); });
  applyTheme(); matchMedia('(prefers-color-scheme: light)').addEventListener('change', () => applyTheme());
  $('#b-lang').addEventListener('click', () => setLang(LANG === 'fr' ? 'en' : 'fr'));
  $('#b-theme').addEventListener('click', () => { const cur = document.documentElement.dataset.theme; LS.set('fr.theme', cur === 'dark' ? 'light' : 'dark'); applyTheme(); });
  $('#b-undo').addEventListener('click', () => undo(-1)); $('#b-redo').addEventListener('click', () => undo(1));
  $('#b-share').addEventListener('click', shareLink);
  document.addEventListener('keydown', e => { if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z' && !/INPUT|TEXTAREA/.test(document.activeElement.tagName)) { e.preventDefault(); undo(e.shiftKey ? 1 : -1); } });
  importFromHash(); HIST.last = JSON.stringify(army);
  $('#dlg-x').addEventListener('click', () => $('#dlg').close());
  $('#dlg').addEventListener('click', e => { if (e.target === $('#dlg')) $('#dlg').close(); });
  $('#dbv').textContent = L`Données ` + DB.core.version;
  render();
  if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
    navigator.serviceWorker.register('sw.js').then(reg => {
      const ready = w => { const b = $('#update'); b.hidden = false; b.onclick = () => w.postMessage('skip'); };
      if (reg.waiting) ready(reg.waiting);
      reg.addEventListener('updatefound', () => { const w = reg.installing; w.addEventListener('statechange', () => { if (w.state === 'installed' && navigator.serviceWorker.controller) ready(w); }); });
    }).catch(() => {});
    navigator.serviceWorker.addEventListener('controllerchange', () => location.reload());
  }
  autoCheckUpdates();
}
/* Fichier unique (ou appareil hors du site) : vérification discrète, au plus deux fois par jour, sans rien installer seul */
async function autoCheckUpdates() {
  const base = updUrl();
  if (!base || !navigator.onLine) return;
  if (location.protocol.startsWith('http') && location.href.startsWith(base)) return; // version installée : le service worker s'en charge
  const last = +LS.get('30k.lastUpdateCheck', 0); if (Date.now() - last < 12 * 3600e3) return;
  LS.set('30k.lastUpdateCheck', Date.now());
  try {
    const man = await (await fetch(base + '/manifest.json?t=' + Date.now(), { cache: 'no-store' })).json();
    if ((man.dataVersion && man.dataVersion > DB.core.version) || (man.appVersion && man.appVersion > APP_VERSION)) {
      const b = $('#update'); b.textContent = L`Mise à jour disponible — voir`; b.hidden = false;
      b.onclick = () => { openSettings(); const st = document.querySelector('#dlg-body .upd-status'); if (st) checkUpdates(st); };
    }
  } catch (e) {}
}
start();

