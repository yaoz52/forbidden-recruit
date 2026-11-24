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
  if (r == null && s.endsWith(')')) { let dp = 0, i = s.length - 1; for (; i >= 0; i--) { if (s[i] === ')') dp++; else if (s[i] === '(' && !--dp) break; } i--; const pre = s.slice(0, i), inner = s.slice(i + 2, -1); if (i > 0 && s[i] === ' ') { const h = T[pre] != null ? T[pre] : I18N.texts && I18N.texts[pre]; if (h != null) r = h + ' (' + trData(inner) + ')'; } }
  if (r == null) { const m = s.match(/^([^:]+?) : (.+)$/); if (m) { const a = trData(m[1]), b = trData(m[2]); if (a !== m[1] || b !== m[2]) r = a + ': ' + b; } }
  if (r == null) { const m = s.match(/^([^(),]+?) \(([^()]+)\)$/); if (m) { const base = T[m[1] + ' (X)'] != null ? T[m[1] + ' (X)'].replace(/ \(X\)$/, '') : T[m[1]]; if (base != null) r = base + ' (' + m[2].split(/, ?/).map(p => T[p] != null ? T[p] : p).join(', ') + ')'; } }
  if (r == null && /, /.test(s) && !/[.;:!?]\s/.test(s)) { const ps = s.split(', '), tp = ps.map(trData); if (tp.some((x, i) => x !== ps[i])) r = tp.join(', '); }
  if (r == null) { const m = s.match(/^(.+?) - (.+)$/); if (m) { const a = trData(m[1]), b = trData(m[2]); if (a !== m[1] || b !== m[2]) r = a + ' - ' + b; } }
  if (r == null && / — /.test(s)) { const ps = s.split(' — '), tp = ps.map(trData); if (tp.some((x, i) => x !== ps[i])) r = tp.join(' — '); }
  if (r == null && / · /.test(s)) { const ps = s.split(' · '), tp = ps.map(trData); if (tp.some((x, i) => x !== ps[i])) r = tp.join(' · '); }
  if (r == null && s.endsWith(')')) { let i = -1; while ((i = s.indexOf(' (', i + 1)) > 0) { const inner = s.slice(i + 2, -1); if (/[()]/.test(inner)) continue; if (T[inner] != null || /\bp\. ?\d/.test(inner)) { const a = trData(s.slice(0, i)), b = T[inner] != null ? T[inner] : trData(inner); if (a !== s.slice(0, i) || b !== inner) { r = a + ' (' + b + ')'; break; } } } }
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
  if (def.nameWord && def.nameWord.roles.includes(slot.role) && !slot.added) { const w = det.word || def.nameWord.words[0], en = (I18N.terms && I18N.terms[u.name]) || '';
    if (!(u.name + ' ' + en).includes(w)) return { ok: false, why: L`${def.name} (${w}) : cases ${def.nameWord.roles.map(r => role(r).name).join(' et ')} réservées aux unités dont le nom contient « ${w} ».` }; }
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
  if (def.oncePerArmy && army.dets.some(d => d.type === def.id)) return { ok: false, why: L`${def.name} : une seule fois par armée.` };
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
    host.append(el('p', { class: 'lead' }, L`Vos choix du Détachement Principal ouvrent ${g.aux} Détachement(s) Auxiliaire(s) par les cases État-major et ${g.flex} Auxiliaire ou Apex par la case Quartier Général. Utilisés : ${ax} Auxiliaire(s), ${ap} Apex. Alliés et Seigneur des Batailles restent possibles sans condition.`)); host.append(detTree()); }
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
  renderViews();
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
  if (def.nameWord) box.append(el('div', { class: 'seg', role: 'group', 'aria-label': L`Mot choisi` }, def.nameWord.words.map(w => el('button', { type: 'button', 'aria-pressed': (det.word || def.nameWord.words[0]) === w ? 'true' : 'false', onclick: () => { det.word = w; Object.keys(det.units).forEach(i => { const s = slotsOf(det).find(x => x.i === +i), u = UNITS[det.units[i].u]; if (s && u && unitAllowed(det, s, u).ok === false) delete det.units[i]; }); touch(); } }, w))));
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
    const ph = us && us.photo && photoURL(us.photo.id) ? ' hasph ph-' + (us.photo.mode || 's') : '';
    const b = el('button', { type: 'button', class: 'slot' + (us ? ' filled' : '') + (isSel ? ' sel' : '') + (sbad ? ' bad' : '') + ph, style: ph && us.photo.mode === 'l' ? photoStyle(us.photo) : null,
      title: role(s.role).name + (s.prime ? L` — Case Principale` : '') + (s.added != null ? L` — case ajoutée` + (s.legion ? ' (' + s.legion + ')' : s.army ? ' (' + armyName(s.army) + ')' : '') : s.bonus ? L` — case du Bénéfice Logistique` : '') + (s.dyn ? L` — case ajoutée par le Détachement Principal` : '') + (s.oath ? L` — Oath of Moment` : ''),
      onclick: () => { if (us) { sel = { det: det.id, slot: s.i }; render(); openEditor(); } else openPicker(det, s); } },
      el('span', { html: slotGlyph(s, !!us) }), slotPhoto(us),
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
function openDetPicker(kinds) {
  if (!Array.isArray(kinds)) kinds = null; // appelé depuis un bouton : l'événement n'est pas un filtre
  const dlg = $('#dlg'), body = $('#dlg-body'); body.replaceChildren();
  $('#dlg-title').textContent = L`Ajouter un détachement`;
  if (kinds) body.append(el('p', { class: 'hint' }, L`Détachements possibles pour cette place.`, ' ', el('button', { type: 'button', class: 'linkish', onclick: () => openDetPicker() }, L`Voir tous les détachements`)));
  const groups = { addl: L`Détachements Additionnels`, fort: L`Détachements additionnels`, aux: L`Détachements Auxiliaires`, apex: L`Détachements d'Apex`, allie: L`Détachements additionnels`, sdg: L`Détachements additionnels`, sdb: L`Détachements additionnels` };
  let last = '';
  const lists = new Set([armyOf(army.faction), ...army.dets.filter(d => detDef(d.type).kind === 'allie').map(d => armyOf(d.faction))]);
  for (const def of DB.detachments.filter(d => d.kind !== 'principal' && (!kinds || kinds.includes(d.kind)) && (!d.faction || d.faction === army.faction) && (!d.army || lists.has(d.army)) && !(armyDef().forbid || []).includes(d.kind)).sort((a, b) => Object.keys(groups).indexOf(a.kind) - Object.keys(groups).indexOf(b.kind))) {
    if (groups[def.kind] !== last) { last = groups[def.kind]; body.append(el('h4', {}, last)); }
    const c = canAddDet(def);
    const add = parent => { army.dets.push({ id: uid(), type: def.id, parent: parent ? parent.id : null, units: {}, adv: {}, bonusRole: null, faction: '' }); dlg.close(); touch(); };
    const b = el('div', { class: 'pick det-pick' + (c.ok ? '' : ' ko') },
      el('span', {}, el('b', {}, def.name), slotSummary(def.slots),
        el('i', {}, c.ok ? (def.requires ? L`Ouvert par votre ${def.requires}. ` : '') + (def.note || '') : c.why)),
      c.ok ? el('span', { class: 'acts' }, (c.parents || [null]).map(p => el('button', { type: 'button', class: 'btn', onclick: () => add(p) }, c.parents && c.parents.length > 1 ? L`Rattacher : ${detName(p)}` : L`Ajouter`))) : null);
    body.append(b);
  }
  if (!dlg.open) dlg.showModal();
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
  { const hero = editorPhoto(us, u); if (hero) host.append(hero); }
  host.append(el('p', { class: 'kind' }, `${role(u.role).name} · ${detName(det)}`), el('h3', {}, unitLabel(us, u), us.label ? el('small', { class: 'uname' }, u.name) : null, isExpanded(u, us) ? el('small', { class: 'tag', title: L`Option Legacies choisie : unité Expanded (Legacies of the Age of Darkness)` }, L`Expanded`) : null),
    el('p', { class: 'cost' }, el('b', {}, unitPoints(us)), L` pts · ${unitSize(us)} figurine${unitSize(us) > 1 ? 's' : ''}`, unitPoints(us) !== u.points ? el('span', { class: 'ref' }, L` · base ${u.points} + options ${unitPoints(us) - u.points}`) : null, u.page ? el('span', { class: 'ref' }, L` · ${u.bookName} p. ${u.page}`) : null));
  host.append(el('label', { class: 'rename' }, el('span', {}, L`Nom de l'unité`), el('input', { class: 'field', type: 'text', maxlength: 60, value: us.label || '', placeholder: u.name, 'aria-label': L`Nom de l'unité`, onchange: e => { const v = e.target.value.trim(); if (v) us.label = v; else delete us.label; touch(); }, onkeydown: e => { if (e.key === 'Enter') e.target.blur(); } })));
  host.append(el('details', { class: 'ph-box', open: !!(us.photo && photoURL(us.photo.id)) || !LS.get('fr.phSeen', false), ontoggle: () => LS.set('fr.phSeen', true) }, el('summary', {}, L`Photo de l'unité`), photoControls(us, u)));
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
        el('button', { class: 'btn ghost', onclick: () => { const k = army; army = a; exportPDF({}); army = k; } }, 'PDF'),
        el('button', { class: 'btn ghost', onclick: () => { const k = army; army = a; exportText(); army = k; } }, L`Texte`),
        el('button', { class: 'btn ghost danger', onclick: () => { if (!confirm(L`Supprimer définitivement « ${a.name} » ?`)) return; store.remove(a.id); if (a.id === army.id) { army = newArmy(); render(); } openLists(); } }, L`Supprimer`))));
  }
  body.append(el('p', { class: 'note' }, L`Les listes sont enregistrées automatiquement dans l'application, sur cet appareil : rien à faire. « PDF » crée la feuille d'armée, « Texte » un fichier lisible que l'on peut aussi réimporter sur un autre appareil.`));
  dlg.showModal();
}
const APP_VERSION = '2026.11-p';
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

/* ---------- Photos d'unité : stockées sur l'appareil (IndexedDB), compressées, jamais envoyées ---------- */
/* us.photo = { id, mode: 's' (petite) | 'l' (grande) | 'p' (profil), x, y (cadrage en %) } ; us.sil = id d'une image de silhouette perso */
const PH = {}, PH_DIM = {}; // id -> objectURL et rapport largeur/hauteur, remplis au démarrage
const PHDB = {
  db: null,
  open() { if (this.db) return Promise.resolve(this.db); return new Promise((ok, ko) => { try { const r = indexedDB.open('forbidden-recruit', 1); r.onupgradeneeded = () => { r.result.createObjectStore('photos', { keyPath: 'id' }); }; r.onsuccess = () => { this.db = r.result; ok(this.db); }; r.onerror = () => ko(r.error); } catch (e) { ko(e); } }); },
  async tx(mode, fn) { const db = await this.open(); return new Promise((ok, ko) => { const t = db.transaction('photos', mode), s = t.objectStore('photos'); const r = fn(s); t.oncomplete = () => ok(r && r.result); t.onerror = () => ko(t.error); }); },
  put(rec) { return this.tx('readwrite', s => s.put(rec)); },
  del(id) { return this.tx('readwrite', s => s.delete(id)); },
  all() { return this.tx('readonly', s => s.getAll()); }
};
async function loadPhotos() { try { for (const r of (await PHDB.all()) || []) if (r && r.blob) { PH[r.id] = URL.createObjectURL(r.blob); if (r.w && r.h) PH_DIM[r.id] = r.w / r.h; } } catch (e) {} }
const photoURL = id => id && PH[id];
/* Compression : grand côté 1100 px, JPEG 0,82 (≈ 100-200 ko) */
function compressImage(file, max = 1100, type = 'image/jpeg', q = 0.82) {
  return new Promise((ok, ko) => {
    const img = new Image(), url = URL.createObjectURL(file);
    img.onload = () => { const k = Math.min(1, max / Math.max(img.naturalWidth, img.naturalHeight)), w = Math.round(img.naturalWidth * k), h = Math.round(img.naturalHeight * k);
      const c = document.createElement('canvas'); c.width = w; c.height = h; const g = c.getContext('2d'); if (type === 'image/jpeg') { g.fillStyle = '#fff'; g.fillRect(0, 0, w, h); } g.drawImage(img, 0, 0, w, h); URL.revokeObjectURL(url);
      c.toBlob(b => b ? ok({ blob: b, w, h }) : ko(new Error('toBlob')), type, q); };
    img.onerror = () => { URL.revokeObjectURL(url); ko(new Error(L`Image illisible`)); }; img.src = url;
  });
}
async function storePhoto(blob, w, h, prefix = 'ph') { const id = prefix + '_' + uid() + uid(); await PHDB.put({ id, blob, w, h, t: Date.now() }); PH[id] = URL.createObjectURL(blob); if (w && h) PH_DIM[id] = w / h; return id; }
/* Photos encore utilisées par une liste enregistrée : les autres sont supprimées */
async function gcPhotos() {
  try { const used = new Set(); const all = { ...store.all(), [army.id]: army };
    for (const a of Object.values(all)) for (const d of a.dets || []) for (const us of Object.values(d.units || {})) { if (us.photo) used.add(us.photo.id); if (us.sil) used.add(us.sil); if (us.dia && us.dia.img) used.add(us.dia.img); }
    for (const id of Object.keys(PH)) if (!used.has(id)) { await PHDB.del(id); URL.revokeObjectURL(PH[id]); delete PH[id]; }
  } catch (e) {}
}
function pickImage(cb, camera) {
  const i = el('input', { type: 'file', accept: 'image/*', capture: camera ? 'environment' : null, style: 'display:none' });
  i.addEventListener('change', async () => { const f = i.files && i.files[0]; i.remove(); if (f) { try { await cb(f); } catch (e) { flash(L`Photo impossible à lire : ` + e.message); } } });
  document.body.append(i); i.click();
}
async function setUnitPhoto(us, file) {
  flash(L`Photo en cours de préparation…`);
  const { blob, w, h } = await compressImage(file); const id = await storePhoto(blob, w, h);
  const old = us.photo; us.photo = { id, mode: (old && old.mode) || LS.get('fr.photoMode', 's'), x: 50, y: 50 };
  touch(); const sok = await autoSilhouette(us); touch(); flash(sok ? L`Photo ajoutée et silhouette créée. Tout reste sur cet appareil.` : L`Photo ajoutée. Elle reste sur cet appareil.`); setTimeout(gcPhotos, 1500);
}
function photoStyle(p) { return `background-image:url("${photoURL(p.id)}");background-position:${p.x ?? 50}% ${p.y ?? 50}%`; }
/* Vignette dans une case de l'organigramme */
function slotPhoto(us) {
  const p = us && us.photo; if (!p || !photoURL(p.id)) return null;
  return el('span', { class: 'sph m-' + (p.mode || 's'), style: photoStyle(p), 'aria-hidden': 'true' });
}
/* En-tête photo de l'éditeur */
function editorPhoto(us, u) {
  const p = us.photo, url = p && photoURL(p.id);
  if (!url) return null;
  const pic = el('div', { class: 'ph-hero m-' + (p.mode || 's'), style: photoStyle(p), title: L`Faites glisser pour recadrer (ou flèches du clavier)`, tabindex: 0, role: 'img', 'aria-label': L`Photo de ` + unitLabel(us, u) });
  // recadrage au doigt / à la souris, sans recharger l'éditeur pendant le geste
  let drag = null;
  pic.addEventListener('pointerdown', e => { drag = { x: e.clientX, y: e.clientY, px: p.x ?? 50, py: p.y ?? 50, w: pic.clientWidth, h: pic.clientHeight }; pic.setPointerCapture(e.pointerId); pic.classList.add('drag'); });
  pic.addEventListener('pointermove', e => { if (!drag) return; p.x = Math.max(0, Math.min(100, drag.px - (e.clientX - drag.x) / drag.w * 100)); p.y = Math.max(0, Math.min(100, drag.py - (e.clientY - drag.y) / drag.h * 100)); pic.style.backgroundPosition = `${p.x}% ${p.y}%`; });
  const end = () => { if (!drag) return; drag = null; pic.classList.remove('drag'); p.x = Math.round(p.x); p.y = Math.round(p.y); touch(); };
  pic.addEventListener('pointerup', end); pic.addEventListener('pointercancel', end);
  // clavier : flèches pour déplacer le cadrage (Maj = grands pas)
  let kt; pic.addEventListener('keydown', e => { const d = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }[e.key]; if (!d) return; e.preventDefault(); const st = e.shiftKey ? 10 : 3;
    p.x = Math.max(0, Math.min(100, (p.x ?? 50) + d[0] * st)); p.y = Math.max(0, Math.min(100, (p.y ?? 50) + d[1] * st)); pic.style.backgroundPosition = `${p.x}% ${p.y}%`; clearTimeout(kt); kt = setTimeout(() => { touch(); requestAnimationFrame(() => { const h = $('.ph-hero'); h && h.focus({ preventScroll: true }); }); }, 400); });
  return pic;
}
function photoControls(us, u) {
  const p = us.photo, has = p && photoURL(p.id), box = el('div', { class: 'ph-ctl' });
  const camera = matchMedia('(pointer: coarse)').matches;
  if (!has) {
    box.append(el('div', { class: 'ph-drop', tabindex: '0', role: 'button', 'aria-label': L`Ajouter une photo de l'unité`, onclick: () => pickImage(f => setUnitPhoto(us, f)), onkeydown: e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); pickImage(f => setUnitPhoto(us, f)); } } },
      el('span', { class: 'ph-ic', html: '<svg viewBox="0 0 24 24"><path d="M4 8h3l2-3h6l2 3h3v11H4z"/><circle cx="12" cy="13" r="3.5"/></svg>' }),
      el('span', {}, el('b', {}, L`Importer depuis la galerie`), el('i', {}, L`Photo de votre figurine peinte, de préférence sur fond uni : l'appli en tire aussi une silhouette pour le schéma. Tout reste sur cet appareil.`))),
      el('button', { type: 'button', class: 'btn ghost sm', onclick: () => pickImage(f => setUnitPhoto(us, f), true) }, L`Prendre une photo`));
    // glisser-déposer
    box.firstChild.addEventListener('dragover', e => { e.preventDefault(); e.currentTarget.classList.add('over'); });
    box.firstChild.addEventListener('dragleave', e => e.currentTarget.classList.remove('over'));
    box.firstChild.addEventListener('drop', e => { e.preventDefault(); e.currentTarget.classList.remove('over'); const f = e.dataTransfer.files && e.dataTransfer.files[0]; if (f && /^image\//.test(f.type)) setUnitPhoto(us, f).catch(er => flash(er.message)); });
    return box;
  }
  box.append(el('div', { class: 'ph-row' }, el('span', { class: 'ph-lab' }, L`Affichage`),
    seg([['s', L`Petite`], ['l', L`Grande`], ['p', L`Profil`]], p.mode || 's', v => { p.mode = v; LS.set('fr.photoMode', v); touch(); }, L`Taille de la photo`)),
    el('div', { class: 'ph-row' }, el('button', { type: 'button', class: 'btn ghost sm', onclick: () => pickImage(f => setUnitPhoto(us, f)) }, L`Remplacer`),
      camera ? el('button', { type: 'button', class: 'btn ghost sm', onclick: () => pickImage(f => setUnitPhoto(us, f), true) }, L`Reprendre`) : null,
      el('button', { type: 'button', class: 'btn ghost sm', onclick: () => { p.x = 50; p.y = 50; touch(); } }, L`Recentrer`),
      el('button', { type: 'button', class: 'btn ghost sm danger', onclick: () => { delete us.photo; dropPhotoSil(us); touch(); flash(L`Photo retirée.`); setTimeout(gcPhotos, 1500); } }, L`Retirer`)),
    el('p', { class: 'hint' }, L`Faites glisser la photo pour la recadrer.`), silControls(us));
  return box;
}
function silControls(us) {
  const c = us.dia || {}, has = c.img && photoURL(c.img);
  let tmr; const box = el('div', { class: 'sil-ctl' },
    el('div', { class: 'sil-prev' + (has ? '' : ' none') }, has ? el('img', { src: photoURL(c.img), alt: L`Silhouette générée` }) : el('span', {}, L`Pas de silhouette`)),
    el('div', { class: 'sil-tx' }, el('b', {}, L`Silhouette pour le schéma`),
      el('label', { class: 'tol' }, L`Précision du détourage`, el('input', { type: 'range', min: 15, max: 140, value: c.tol || 60, 'aria-label': L`Précision du détourage`, oninput: e => { clearTimeout(tmr); const v = +e.target.value; tmr = setTimeout(async () => { await autoSilhouette(us, v); touch(); }, 350); } })),
      el('div', { class: 'row-btns' }, el('button', { type: 'button', class: 'btn ghost sm', onclick: async () => { const ok = await autoSilhouette(us); touch(); if (ok) flash(L`Silhouette recalculée.`); } }, has ? L`Recalculer` : L`Créer la silhouette`),
        has ? el('label', { class: 'chk' }, el('input', { type: 'checkbox', checked: c.src === 'sil', onchange: e => { us.dia = us.dia || {}; us.dia.src = e.target.checked ? 'sil' : 'auto'; touch(); } }), el('span', {}, L`Utiliser dans le schéma`)) : null)));
  return box;
}
/* Version recadrée pour le PDF : carré, rond ou bandeau, en data URL */
function photoCrop(p, shape) {
  return new Promise(ok => {
    const url = photoURL(p.id); if (!url) return ok(null);
    const img = new Image(); img.onload = () => {
      const [W, H] = shape === 'l' ? [1200, 420] : [360, 360], c = document.createElement('canvas'); c.width = W; c.height = H; const g = c.getContext('2d');
      const k = Math.max(W / img.naturalWidth, H / img.naturalHeight), dw = img.naturalWidth * k, dh = img.naturalHeight * k;
      const dx = (W - dw) * (p.x ?? 50) / 100, dy = (H - dh) * (p.y ?? 50) / 100;
      if (shape === 'p') { g.beginPath(); g.arc(W / 2, H / 2, W / 2, 0, Math.PI * 2); g.clip(); }
      else if (shape !== 'l') { g.fillStyle = '#fff'; g.fillRect(0, 0, W, H); }
      g.drawImage(img, dx, dy, dw, dh);
      ok({ data: c.toDataURL(shape === 'p' ? 'image/png' : 'image/jpeg', 0.85), fmt: shape === 'p' ? 'PNG' : 'JPEG' });
    }; img.onerror = () => ok(null); img.src = url;
  });
}
const armyHasPhotos = (a = army) => a.dets.some(d => Object.values(d.units).some(us => us.photo && photoURL(us.photo.id)));
/* ---------- Silhouette tirée d'une photo ---------- */
/* 1. fond estimé sur les bords (médiane) ; 2. remplissage depuis le cadre : tout ce qui ressemble au fond et touche le bord est retiré ;
   3. seule la plus grande forme est gardée (la figurine et son socle), ses trous sont bouchés ; 4. léger lissage du contour ; 5. aplat. */
function silhouetteFrom(url, tol = 60, color = [22, 17, 14], smooth = 2) {
  return new Promise((ok, ko) => {
    const img = new Image(); img.onload = () => {
      const k = Math.min(1, 640 / Math.max(img.naturalWidth, img.naturalHeight)), w = Math.max(8, Math.round(img.naturalWidth * k)), h = Math.max(8, Math.round(img.naturalHeight * k)), N = w * h;
      const c = document.createElement('canvas'); c.width = w; c.height = h; const g = c.getContext('2d', { willReadFrequently: true }); g.drawImage(img, 0, 0, w, h);
      const px = g.getImageData(0, 0, w, h).data;
      const bord = []; for (let x = 0; x < w; x += 2) bord.push(x, (h - 1) * w + x); for (let y = 0; y < h; y += 2) bord.push(y * w, y * w + w - 1);
      const med = ch => { const v = bord.map(p => px[p * 4 + ch]).sort((a, b) => a - b); return v[v.length >> 1]; }, bg = [med(0), med(1), med(2)];
      const dist = (p, q) => Math.abs(px[p * 4] - q[0]) + Math.abs(px[p * 4 + 1] - q[1]) + Math.abs(px[p * 4 + 2] - q[2]);
      const near = (p, from) => dist(p, bg) < tol * 1.6 || (from >= 0 && dist(p, [px[from * 4], px[from * 4 + 1], px[from * 4 + 2]]) < tol * 0.35 && dist(p, bg) < tol * 2.6);
      // 2. fond relié au cadre
      const isBg = new Uint8Array(N), st = [];
      for (const p of bord) if (near(p, -1)) { isBg[p] = 1; st.push(p); }
      while (st.length) { const p = st.pop(), x = p % w, y = (p / w) | 0;
        const nb = [x > 0 ? p - 1 : -1, x < w - 1 ? p + 1 : -1, y > 0 ? p - w : -1, y < h - 1 ? p + w : -1];
        for (const q of nb) if (q >= 0 && !isBg[q] && near(q, p)) { isBg[q] = 1; st.push(q); } }
      // 3. plus grande forme
      const lab = new Int32Array(N); let best = 0, bestN = 0, id = 0;
      for (let p = 0; p < N; p++) { if (isBg[p] || lab[p]) continue; id++; let n = 0; const q = [p]; lab[p] = id;
        while (q.length) { const a = q.pop(); n++; const x = a % w, y = (a / w) | 0; for (const b of [x > 0 ? a - 1 : -1, x < w - 1 ? a + 1 : -1, y > 0 ? a - w : -1, y < h - 1 ? a + w : -1]) if (b >= 0 && !isBg[b] && !lab[b]) { lab[b] = id; q.push(b); } }
        if (n > bestN) { bestN = n; best = id; } }
      if (bestN < N * 0.004) return ko(new Error(L`Aucune figurine détectée : essayez une photo sur fond uni, figurine bien centrée.`));
      let m = new Float32Array(N); for (let p = 0; p < N; p++) m[p] = lab[p] === best ? 1 : 0;
      // 4. lissage léger : flou en boîte (2 passes) puis seuil
      const r = Math.max(1, Math.round(smooth * w / 640 * 1.5));
      const blur = (src) => { const t = new Float32Array(N), o = new Float32Array(N);
        for (let y = 0; y < h; y++) { let acc = 0; for (let x = -r; x <= r; x++) acc += src[y * w + Math.min(w - 1, Math.max(0, x))]; for (let x = 0; x < w; x++) { t[y * w + x] = acc / (2 * r + 1); acc += src[y * w + Math.min(w - 1, x + r + 1)] - src[y * w + Math.max(0, x - r)]; } }
        for (let x = 0; x < w; x++) { let acc = 0; for (let y = -r; y <= r; y++) acc += t[Math.min(h - 1, Math.max(0, y)) * w + x]; for (let y = 0; y < h; y++) { o[y * w + x] = acc / (2 * r + 1); acc += t[Math.min(h - 1, y + r + 1) * w + x] - t[Math.max(0, y - r) * w + x]; } }
        return o; };
      m = blur(blur(m));
      // trous bouchés : tout ce qui n'est pas relié au cadre après lissage fait partie de la figurine
      const out = new Uint8Array(N); for (let p = 0; p < N; p++) out[p] = m[p] >= 0.5 ? 1 : 0;
      const ext = new Uint8Array(N), s2 = []; for (const p of [...Array(w).keys()].flatMap(x => [x, (h - 1) * w + x]).concat([...Array(h).keys()].flatMap(y => [y * w, y * w + w - 1]))) if (!out[p] && !ext[p]) { ext[p] = 1; s2.push(p); }
      while (s2.length) { const p = s2.pop(), x = p % w, y = (p / w) | 0; for (const q of [x > 0 ? p - 1 : -1, x < w - 1 ? p + 1 : -1, y > 0 ? p - w : -1, y < h - 1 ? p + w : -1]) if (q >= 0 && !out[q] && !ext[q]) { ext[q] = 1; s2.push(q); } }
      // 5. aplat avec bord légèrement adouci (anticrénelage) et recadrage
      const d = g.createImageData(w, h), o = d.data; let x0 = w, y0 = h, x1 = 0, y1 = 0;
      for (let p = 0; p < N; p++) { const inside = !ext[p]; const a = inside ? (out[p] ? 1 : 1) : Math.max(0, Math.min(1, (m[p] - 0.35) / 0.15));
        if (a > 0) { o[p * 4] = color[0]; o[p * 4 + 1] = color[1]; o[p * 4 + 2] = color[2]; o[p * 4 + 3] = Math.round(a * 255); if (a > 0.5) { const x = p % w, y = (p / w) | 0; if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; } } }
      if (x1 <= x0 || y1 <= y0) return ko(new Error(L`Aucune figurine détectée : essayez une photo sur fond uni, figurine bien centrée.`));
      g.putImageData(d, 0, 0);
      const pad = 2, oc = document.createElement('canvas'); oc.width = x1 - x0 + 1 + pad * 2; oc.height = y1 - y0 + 1 + pad * 2; oc.getContext('2d').drawImage(c, -x0 + pad, -y0 + pad);
      oc.toBlob(b => ok({ blob: b, w: oc.width, h: oc.height }), 'image/png');
    }; img.onerror = () => ko(new Error(L`Image illisible`)); img.src = url;
  });
}
/* Silhouette automatique d'une unité à partir de sa photo (au moment de la prise ou de l'import) */
async function autoSilhouette(us, tol) {
  if (!us.photo || !photoURL(us.photo.id)) return false;
  const c = us.dia = us.dia || {}; tol = tol || c.tol || 60;
  try { const r = await silhouetteFrom(photoURL(us.photo.id), tol); c.img = await storePhoto(r.blob, r.w, r.h, 'sil'); c.src = 'sil'; c.tol = tol; c.auto = true; return true; }
  catch (e) { c.src = c.src === 'sil' ? 'auto' : c.src; flash(e.message); return false; }
}

/* photo retirée : la silhouette tirée de cette photo part avec elle (une image importée à la main reste) */
function dropPhotoSil(us) {
  const c = us.dia; if (!c) return;
  if (c.auto) { delete c.img; delete c.auto; delete c.tol; }
  if (c.src === 'photo' || (c.src === 'sil' && !c.img)) delete c.src;
  if (!Object.keys(c).length) delete us.dia;
}
/* ---------- Silhouettes originales (dessins génériques par type d'unité, aucune copie de figurine) ---------- */
/* Chaque silhouette : w × h dans son propre repère (pieds posés sur y = h), et une hauteur réelle relative « s » pour les schémas. */
const SIL = {
  leg: { w: 100, h: 140, s: 1, d: `
    <path d="M31 24 Q31 16 38 16 L62 16 Q69 16 69 24 L69 52 L31 52 Z"/><rect x="34" y="8" width="8" height="14" rx="3"/><rect x="58" y="8" width="8" height="14" rx="3"/>
    <path d="M41 30 Q41 13 50 12 Q59 13 59 30 L56 38 L44 38 Z"/>
    <path d="M7 48 Q7 29 28 29 Q43 30 42 46 L40 57 L9 59 Z"/><path d="M93 48 Q93 29 72 29 Q57 30 58 46 L60 57 L91 59 Z"/>
    <path d="M35 38 L65 38 L68 70 L60 80 L40 80 L32 70 Z"/>
    <rect x="13" y="55" width="13" height="24" rx="5"/><rect x="73" y="55" width="13" height="20" rx="5"/>
    <path d="M13 77 L80 69 L80 65 L99 63 L99 70 L84 72 L84 76 L62 79 L60 91 L50 91 L51 80 L15 84 Z"/>
    <rect x="36" y="78" width="28" height="10" rx="3"/>
    <path d="M37 86 L49 86 L48 108 L35 108 Z"/><path d="M51 86 L63 86 L66 108 L53 108 Z"/>
    <ellipse cx="41" cy="108" rx="8" ry="6"/><ellipse cx="60" cy="108" rx="8" ry="6"/>
    <path d="M34 112 L48 112 L47 131 L28 136 L29 127 Z"/><path d="M53 112 L67 112 L71 127 L73 136 L55 131 Z"/>` },
  officer: { w: 110, h: 146, s: 1.04, top: -8, d: `
    <path d="M36 30 L74 30 L96 138 L60 132 L50 136 L14 138 Z" class="cape"/>
    <path d="M36 24 Q36 16 43 16 L67 16 Q74 16 74 24 L74 50 L36 50 Z"/>
    <path d="M46 30 Q46 12 55 11 Q64 12 64 30 L61 38 L49 38 Z"/><path d="M50 11 L55 0 L60 11 Z"/>
    <path d="M12 50 Q12 29 33 29 Q48 30 47 46 L45 57 L14 59 Z"/><path d="M98 50 Q98 29 77 29 Q62 30 63 46 L65 57 L96 59 Z"/>
    <path d="M40 38 L70 38 L73 72 L65 82 L45 82 L37 72 Z"/>
    <rect x="16" y="56" width="13" height="24" rx="5"/><path d="M80 56 L93 54 L96 34 L86 30 Z"/>
    <path d="M90 34 L104 -6 L108 -4 L96 36 Z"/><rect x="84" y="28" width="16" height="6" rx="2" transform="rotate(-20 92 31)"/>
    <rect x="12" y="76" width="18" height="12" rx="4"/>
    <path d="M42 86 L54 86 L53 110 L40 110 Z"/><path d="M56 86 L68 86 L71 110 L58 110 Z"/>
    <path d="M39 112 L53 112 L52 133 L33 140 L34 130 Z"/><path d="M58 112 L72 112 L76 130 L78 140 L60 133 Z"/>` },
  heavy: { w: 112, h: 140, s: 1, d: `
    <path d="M31 24 Q31 16 38 16 L62 16 Q69 16 69 24 L69 52 L31 52 Z"/>
    <path d="M41 30 Q41 13 50 12 Q59 13 59 30 L56 38 L44 38 Z"/>
    <path d="M7 48 Q7 29 28 29 Q43 30 42 46 L40 57 L9 59 Z"/><path d="M93 48 Q93 29 72 29 Q57 30 58 46 L60 57 L91 59 Z"/>
    <path d="M35 38 L65 38 L68 70 L60 80 L40 80 L32 70 Z"/>
    <rect x="13" y="55" width="13" height="22" rx="5"/>
    <rect x="44" y="52" width="66" height="15" rx="4"/><rect x="58" y="62" width="22" height="16" rx="3"/><rect x="100" y="48" width="12" height="23" rx="2"/><rect x="40" y="58" width="16" height="9" rx="2"/>
    <rect x="36" y="78" width="28" height="10" rx="3"/>
    <path d="M37 86 L49 86 L48 108 L35 108 Z"/><path d="M51 86 L63 86 L66 108 L53 108 Z"/>
    <ellipse cx="41" cy="108" rx="8" ry="6"/><ellipse cx="60" cy="108" rx="8" ry="6"/>
    <path d="M34 112 L48 112 L47 131 L28 136 L29 127 Z"/><path d="M53 112 L67 112 L71 127 L73 136 L55 131 Z"/>` },
  jump: { w: 112, h: 146, s: 1.02, d: `
    <path d="M14 22 Q14 12 24 12 L44 12 L44 64 L20 64 Q14 64 14 56 Z"/><path d="M16 64 L22 64 L28 96 L19 84 L13 96 Z" class="flame"/><path d="M30 64 L38 64 L42 92 L34 82 L28 94 Z" class="flame"/>
    <path d="M46 34 Q46 18 55 17 Q64 18 64 34 L61 42 L49 42 Z"/>
    <path d="M14 52 Q14 33 34 33 Q48 34 47 50 L45 61 L16 63 Z"/><path d="M96 52 Q96 33 76 33 Q62 34 63 50 L65 61 L94 63 Z"/>
    <path d="M40 42 L70 42 L73 74 L65 84 L45 84 L37 74 Z"/>
    <path d="M78 60 L92 56 L98 34 L88 30 Z"/><path d="M90 34 L106 4 L112 8 L96 38 Z"/><rect x="85" y="26" width="16" height="7" rx="2" transform="rotate(-28 93 30)"/>
    <rect x="18" y="58" width="13" height="22" rx="5"/><rect x="14" y="76" width="18" height="10" rx="3"/>
    <path d="M42 88 L54 88 L50 110 L38 108 Z"/><path d="M56 88 L68 88 L76 106 L64 112 Z"/>
    <path d="M37 110 L50 112 L45 132 L30 138 L32 128 Z"/><path d="M64 110 L77 106 L86 126 L90 136 L74 130 Z"/>` },
  term: { w: 124, h: 142, s: 1.08, d: `
    <path d="M36 14 Q36 6 44 6 L80 6 Q88 6 88 14 L88 40 L36 40 Z"/><rect x="42" y="0" width="8" height="10" rx="2"/><rect x="74" y="0" width="8" height="10" rx="2"/>
    <path d="M52 32 Q52 20 62 20 Q72 20 72 32 L70 42 L54 42 Z"/>
    <path d="M4 54 Q4 22 36 22 Q48 24 48 40 L48 66 L6 68 Q4 62 4 54 Z"/><path d="M120 54 Q120 22 88 22 Q76 24 76 40 L76 66 L118 68 Q120 62 120 54 Z"/>
    <path d="M40 36 L84 36 Q92 52 90 84 L80 98 L44 98 L34 84 Q32 52 40 36 Z"/>
    <path d="M2 80 Q2 72 9 72 L33 72 Q40 72 40 80 L40 102 Q40 110 32 110 L10 110 Q2 110 2 102 Z"/>
    <rect x="9" y="64" width="22" height="14" rx="3"/>
    <rect x="92" y="62" width="22" height="20" rx="4"/><rect x="90" y="76" width="22" height="16" rx="3"/>
    <rect x="94" y="52" width="8" height="48" rx="2"/><rect x="104" y="48" width="7" height="52" rx="2"/>
    <path d="M42 94 L62 94 L60 114 L54 138 L28 138 L32 124 L38 112 Z"/><path d="M62 94 L82 94 L86 112 L92 124 L96 138 L70 138 L66 114 Z"/>
    <ellipse cx="42" cy="114" rx="10" ry="8"/><ellipse cx="82" cy="114" rx="10" ry="8"/>` },
  bike: { w: 150, h: 120, s: 0.95, d: `
    <circle cx="28" cy="96" r="22"/><circle cx="122" cy="96" r="22"/>
    <path d="M10 82 L40 62 L112 60 L142 76 L146 92 L118 86 L36 90 Z"/><path d="M104 54 L140 58 L144 70 L108 68 Z"/><rect x="118" y="48" width="30" height="7" rx="2"/>
    <path d="M62 36 Q62 22 71 21 Q80 22 80 36 L78 44 L64 44 Z"/>
    <path d="M44 52 Q44 35 62 35 Q74 36 74 50 L72 60 L46 62 Z"/>
    <path d="M60 42 L84 42 L96 64 L78 70 L58 66 Z"/><path d="M84 46 L108 52 L106 60 L86 58 Z"/>
    <path d="M60 64 L82 66 L88 84 L76 86 L68 74 L56 72 Z"/>` },
  dread: { w: 160, h: 170, s: 1.35, d: `
    <rect x="52" y="4" width="9" height="22" rx="2"/><rect x="99" y="4" width="9" height="22" rx="2"/>
    <path d="M46 22 L114 22 L122 40 L120 98 L106 110 L54 110 L40 98 L38 40 Z"/>
    <rect x="16" y="32" width="34" height="36" rx="9"/><rect x="110" y="32" width="34" height="36" rx="9"/>
    <rect x="10" y="62" width="32" height="34" rx="5"/><rect x="12" y="92" width="11" height="46" rx="2"/><rect x="27" y="92" width="11" height="46" rx="2"/><rect x="8" y="134" width="34" height="7" rx="2"/>
    <rect x="118" y="62" width="32" height="32" rx="6"/><path d="M112 90 L156 90 L158 120 L150 128 L118 128 L110 118 Z"/>
    <path d="M114 126 L124 126 L122 148 L114 148 Z"/><path d="M128 126 L138 126 L137 150 L129 150 Z"/><path d="M142 124 L152 124 L154 146 L145 146 Z"/>
    <rect x="56" y="106" width="48" height="16" rx="4"/>
    <path d="M54 118 L74 118 L72 148 L60 152 L46 152 L50 134 Z"/><path d="M86 118 L106 118 L110 134 L114 152 L100 152 L88 148 Z"/>
    <path d="M34 150 L78 150 L78 164 L30 164 Z"/><path d="M82 150 L126 150 L130 164 L82 164 Z"/>` },
  automata: { w: 150, h: 158, s: 1.25, d: `
    <path d="M52 30 Q52 14 75 14 Q98 14 98 30 L96 44 L54 44 Z"/><rect x="66" y="20" width="18" height="8" rx="2" class="eye"/>
    <path d="M18 54 Q18 34 48 36 L102 36 Q132 34 132 54 L128 70 L22 70 Z"/>
    <path d="M40 66 L110 66 L104 108 L46 108 Z"/>
    <path d="M10 62 L36 62 L38 104 L28 112 L14 112 L8 102 Z"/><path d="M4 102 L42 102 L40 120 L6 120 Z"/>
    <path d="M114 62 L140 62 L146 96 L114 98 Z"/><rect x="118" y="94" width="10" height="34" rx="2"/><rect x="132" y="94" width="10" height="34" rx="2"/>
    <path d="M50 104 L72 104 L68 134 L52 140 L42 138 L46 124 Z"/><path d="M78 104 L100 104 L104 124 L108 138 L98 140 L82 134 Z"/>
    <path d="M30 136 L72 136 L72 152 L26 152 Z"/><path d="M78 136 L120 136 L124 152 L78 152 Z"/>` },
  custodian: { w: 110, h: 160, s: 1.18, top: -32, d: `
    <path d="M48 24 Q48 10 56 9 Q64 10 64 24 L62 32 L50 32 Z"/><path d="M50 10 Q56 -8 70 2 Q60 4 58 14 Z"/>
    <path d="M14 46 Q14 26 36 26 Q50 27 49 42 L47 54 L16 56 Z"/><path d="M98 46 Q98 26 76 26 Q62 27 63 42 L65 54 L96 56 Z"/>
    <path d="M40 32 L72 32 L76 68 L68 82 L44 82 L36 68 Z"/>
    <path d="M30 70 L84 70 L92 120 L22 120 Z" class="cape"/>
    <rect x="16" y="52" width="13" height="26" rx="5"/><rect x="84" y="52" width="13" height="22" rx="5"/>
    <rect x="94" y="-14" width="6" height="172" rx="2"/><path d="M92 -14 L97 -30 L102 -14 Z"/><rect x="86" y="62" width="20" height="10" rx="3"/>
    <path d="M40 112 L54 112 L52 140 L36 156 L38 142 Z"/><path d="M58 112 L72 112 L76 142 L80 156 L62 140 Z"/>` },
  auxilia: { w: 96, h: 128, s: 0.9, d: `
    <path d="M38 22 Q38 8 48 8 Q58 8 58 22 L64 26 L32 26 Z"/><rect x="42" y="22" width="12" height="10" rx="2"/>
    <path d="M28 32 Q48 26 68 32 L74 70 L64 112 L32 112 L22 70 Z" class="coat"/>
    <rect x="18" y="38" width="12" height="28" rx="5"/><rect x="66" y="38" width="12" height="24" rx="5"/>
    <path d="M14 66 L88 52 L90 58 L76 62 L76 66 L56 70 L54 80 L46 80 L47 72 L16 74 Z"/>
    <path d="M34 108 L46 108 L44 128 L30 128 Z"/><path d="M50 108 L62 108 L66 128 L52 128 Z"/>` },
  militia: { w: 96, h: 126, s: 0.88, d: `
    <path d="M32 18 Q48 4 64 18 L70 22 L26 22 Z"/><path d="M40 20 Q40 32 48 32 Q56 32 56 20 Z"/>
    <path d="M30 32 L66 32 L70 68 L64 110 L32 110 L26 68 Z"/>
    <rect x="20" y="36" width="11" height="28" rx="5"/><rect x="65" y="36" width="11" height="24" rx="5"/>
    <path d="M16 62 L84 50 L86 56 L72 60 L70 66 L52 68 L50 78 L44 78 L44 70 L18 70 Z"/>
    <path d="M34 106 L46 106 L44 126 L30 126 Z"/><path d="M50 106 L62 106 L66 126 L52 126 Z"/>` },
  skitarii: { w: 98, h: 128, s: 0.9, d: `
    <path d="M34 26 Q32 4 48 4 Q64 4 64 26 L60 34 L36 34 Z"/>
    <path d="M28 30 L68 30 L74 70 L70 116 L26 116 L22 70 Z" class="coat"/>
    <path d="M30 24 L66 24 L70 34 L26 34 Z"/>
    <rect x="16" y="36" width="12" height="30" rx="5"/><rect x="68" y="36" width="12" height="26" rx="5"/>
    <path d="M12 66 L92 54 L94 60 L78 64 L78 70 L58 72 L56 84 L48 84 L49 74 L14 76 Z"/><rect x="58" y="50" width="16" height="6" rx="2"/>
    <path d="M32 112 L46 112 L44 128 L28 128 Z"/><path d="M52 112 L66 112 L70 128 L54 128 Z"/>` },
  daemon: { w: 140, h: 160, s: 1.3, d: `
    <path d="M52 30 Q40 6 22 2 Q38 16 44 34 Z"/><path d="M88 30 Q100 6 118 2 Q102 16 96 34 Z"/>
    <path d="M54 24 Q70 14 86 24 L88 46 L70 56 L52 46 Z"/>
    <path d="M30 52 Q70 34 110 52 L118 96 L98 112 L42 112 L22 96 Z"/>
    <path d="M26 58 L8 92 L4 118 L12 112 L16 124 L22 108 L32 76 Z"/><path d="M114 58 L132 92 L136 118 L128 112 L124 124 L118 108 L108 76 Z"/>
    <path d="M44 108 L66 108 L60 138 L48 156 L32 156 L40 136 Z"/><path d="M74 108 L96 108 L100 136 L108 156 L92 156 L80 138 Z"/>` },
  primarch: { w: 130, h: 180, s: 1.45, top: -16, d: `
    <path d="M40 40 L90 40 L118 176 L72 168 L62 174 L12 176 Z" class="cape"/>
    <path d="M52 34 Q52 14 65 13 Q78 14 78 34 L74 44 L56 44 Z"/><path d="M58 14 L65 -2 L72 14 Z"/>
    <path d="M12 62 Q12 34 40 34 Q58 36 57 56 L55 70 L15 72 Z"/><path d="M118 62 Q118 34 90 34 Q72 36 73 56 L75 70 L115 72 Z"/>
    <path d="M46 44 L84 44 L88 88 L78 102 L52 102 L42 88 Z"/>
    <rect x="16" y="68" width="16" height="30" rx="6"/><path d="M96 68 L112 66 L118 40 L106 36 Z"/>
    <path d="M110 40 L126 -14 L131 -12 L116 42 Z"/><rect x="104" y="32" width="20" height="7" rx="2" transform="rotate(-18 114 35)"/>
    <path d="M48 104 L64 104 L62 136 L46 136 Z"/><path d="M66 104 L82 104 L86 136 L70 136 Z"/>
    <path d="M44 138 L62 138 L60 166 L38 176 L40 162 Z"/><path d="M70 138 L88 138 L92 162 L96 176 L72 166 Z"/>` },
  knight: { w: 170, h: 220, s: 2.3, d: `
    <path d="M60 30 L110 30 L120 56 L50 56 Z"/><path d="M70 30 Q70 12 85 10 Q100 12 100 30 Z"/><rect x="74" y="36" width="22" height="7" class="eye"/>
    <path d="M24 60 Q24 44 44 44 L126 44 Q146 44 146 60 L140 110 L30 110 Z"/>
    <path d="M10 56 Q10 40 30 40 L46 46 L44 84 L12 86 Z"/><path d="M160 56 Q160 40 140 40 L124 46 L126 84 L158 86 Z"/>
    <path d="M2 82 L38 82 L36 140 L28 146 L10 146 L4 136 Z"/><path d="M8 140 L30 140 L26 188 L12 188 Z"/>
    <path d="M132 82 L168 82 L166 120 L134 120 Z"/><rect x="136" y="116" width="12" height="52" rx="3"/><rect x="152" y="116" width="12" height="52" rx="3"/>
    <path d="M44 106 L126 106 L116 132 L54 132 Z"/>
    <path d="M56 128 L80 128 L76 172 L62 184 L46 184 L52 160 Z"/><path d="M90 128 L114 128 L118 160 L124 184 L108 184 L94 172 Z"/>
    <path d="M36 180 L82 180 L84 196 L30 196 Z"/><path d="M88 180 L134 180 L140 196 L86 196 Z"/>` },
  titan: { w: 200, h: 300, s: 3.4, d: `
    <path d="M78 30 L122 30 L130 60 L70 60 Z"/><path d="M84 30 Q84 8 100 6 Q116 8 116 30 Z"/><rect x="88" y="38" width="24" height="8" class="eye"/>
    <path d="M30 70 Q30 50 54 50 L146 50 Q170 50 170 70 L162 140 L38 140 Z"/><rect x="60" y="20" width="12" height="34" rx="2"/><rect x="128" y="20" width="12" height="34" rx="2"/>
    <path d="M6 62 L44 62 L46 120 L8 120 Z"/><rect x="12" y="116" width="26" height="84" rx="4"/><rect x="8" y="196" width="34" height="14" rx="3"/>
    <path d="M156 62 L194 62 L192 112 L158 112 Z"/><rect x="162" y="108" width="12" height="76" rx="2"/><rect x="178" y="108" width="12" height="76" rx="2"/>
    <path d="M58 136 L142 136 L132 170 L68 170 Z"/>
    <path d="M66 166 L96 166 L92 230 L76 250 L54 248 L62 220 Z"/><path d="M104 166 L134 166 L138 220 L146 248 L124 250 L108 230 Z"/>
    <path d="M50 244 L82 244 L84 280 L44 280 Z"/><path d="M118 244 L150 244 L156 280 L116 280 Z"/><path d="M34 276 L92 276 L92 296 L28 296 Z"/><path d="M108 276 L166 276 L172 296 L108 296 Z"/>` },
  apc: { w: 220, h: 110, s: 1.25, d: `
    <path d="M14 46 L40 22 L180 22 L206 46 L208 70 L12 70 Z"/><rect x="96" y="12" width="40" height="12" rx="3"/><rect x="104" y="2" width="6" height="12"/><rect x="104" y="2" width="24" height="5" rx="2"/>
    <path d="M4 64 L216 64 L210 92 Q206 100 196 100 L24 100 Q14 100 10 92 Z"/>
    <g class="hole"><circle cx="34" cy="86" r="5"/><circle cx="62" cy="88" r="5"/><circle cx="90" cy="88" r="5"/><circle cx="118" cy="88" r="5"/><circle cx="146" cy="88" r="5"/><circle cx="174" cy="88" r="5"/><circle cx="196" cy="84" r="5"/></g>` },
  hapc: { w: 250, h: 120, s: 1.4, d: `
    <path d="M10 50 L50 14 L196 14 L244 54 L246 82 L6 82 Z"/><rect x="100" y="4" width="46" height="12" rx="3"/>
    <rect x="18" y="58" width="44" height="22" rx="4"/><rect x="0" y="64" width="26" height="7" rx="2"/><rect x="186" y="58" width="44" height="22" rx="4"/><rect x="222" y="64" width="26" height="7" rx="2"/>
    <path d="M2 76 L248 76 L240 106 Q236 114 222 114 L28 114 Q14 114 10 106 Z"/>
    <g class="hole"><circle cx="34" cy="100" r="6"/><circle cx="66" cy="102" r="6"/><circle cx="98" cy="102" r="6"/><circle cx="130" cy="102" r="6"/><circle cx="162" cy="102" r="6"/><circle cx="194" cy="102" r="6"/><circle cx="222" cy="98" r="6"/></g>` },
  tank: { w: 260, h: 120, s: 1.3, d: `
    <rect x="150" y="26" width="104" height="9" rx="2"/><rect x="244" y="23" width="12" height="15" rx="2"/>
    <path d="M86 20 L148 18 L162 30 L160 46 L84 48 L78 34 Z"/><rect x="98" y="8" width="22" height="12" rx="3"/>
    <path d="M14 56 L40 42 L214 42 L240 56 L242 76 L12 76 Z"/>
    <path d="M2 72 L258 72 L250 104 Q246 112 234 112 L26 112 Q14 112 10 104 Z"/>
    <g class="hole"><circle cx="32" cy="98" r="6"/><circle cx="62" cy="100" r="6"/><circle cx="92" cy="100" r="6"/><circle cx="122" cy="100" r="6"/><circle cx="152" cy="100" r="6"/><circle cx="182" cy="100" r="6"/><circle cx="212" cy="100" r="6"/><circle cx="236" cy="96" r="6"/></g>` },
  superheavy: { w: 340, h: 150, s: 1.8, d: `
    <rect x="196" y="20" width="140" height="12" rx="3"/><rect x="324" y="16" width="16" height="20" rx="2"/><rect x="196" y="36" width="110" height="8" rx="2"/>
    <path d="M110 12 L196 10 L214 24 L212 50 L108 52 L100 30 Z"/><rect x="124" y="0" width="28" height="12" rx="3"/>
    <path d="M10 66 L50 46 L286 46 L330 66 L332 96 L8 96 Z"/>
    <rect x="40" y="70" width="48" height="24" rx="5"/><rect x="74" y="76" width="40" height="8" rx="2"/><rect x="236" y="70" width="48" height="24" rx="5"/><rect x="270" y="76" width="44" height="8" rx="2"/>
    <path d="M0 90 L340 90 L330 134 Q326 144 310 144 L30 144 Q14 144 10 134 Z"/>
    <g class="hole"><circle cx="36" cy="124" r="8"/><circle cx="76" cy="128" r="8"/><circle cx="116" cy="128" r="8"/><circle cx="156" cy="128" r="8"/><circle cx="196" cy="128" r="8"/><circle cx="236" cy="128" r="8"/><circle cx="276" cy="128" r="8"/><circle cx="310" cy="124" r="8"/></g>` },
  skimmer: { w: 220, h: 100, s: 1.1, d: `
    <path d="M6 54 L44 30 L170 26 L214 46 L212 64 L172 72 L30 72 Z"/><path d="M90 18 L150 16 L160 28 L88 30 Z"/><rect x="150" y="20" width="62" height="6" rx="2"/>
    <rect x="20" y="70" width="70" height="10" rx="4"/><rect x="130" y="70" width="70" height="10" rx="4"/>
    <path d="M30 82 L80 82 L72 92 L38 92 Z" class="flame"/><path d="M140 82 L190 82 L182 92 L148 92 Z" class="flame"/>` },
  flyer: { w: 300, h: 120, s: 1.9, d: `
    <path d="M4 60 L30 40 L60 6 L84 6 L76 40 L230 40 L276 56 L296 64 L276 72 L230 80 L60 80 L20 74 Z"/>
    <path d="M110 46 L180 46 L150 110 L120 110 Z"/><rect x="200" y="30" width="34" height="12" rx="3"/><rect x="226" y="34" width="46" height="5" rx="2"/>
    <rect x="96" y="94" width="10" height="20" rx="2"/><rect x="174" y="90" width="10" height="24" rx="2"/><rect x="86" y="112" width="30" height="5" rx="2"/><rect x="164" y="112" width="30" height="5" rx="2"/>` },
  pod: { w: 120, h: 150, s: 1.15, d: `
    <rect x="54" y="0" width="12" height="18" rx="2"/><path d="M40 16 L80 16 L86 30 L34 30 Z"/>
    <path d="M34 28 L86 28 L94 116 L26 116 Z"/><path d="M60 30 L60 114" stroke="#000" stroke-width="0"/>
    <path d="M26 104 L4 146 L22 146 L40 112 Z"/><path d="M94 104 L116 146 L98 146 L80 112 Z"/><path d="M48 112 L72 112 L70 146 L50 146 Z"/>
    <rect x="44" y="44" width="10" height="44" rx="2" class="hole"/><rect x="66" y="44" width="10" height="44" rx="2" class="hole"/>` },
  artillery: { w: 190, h: 100, s: 0.9, d: `
    <path d="M70 40 L176 6 L182 18 L78 54 Z"/><rect x="170" y="2" width="16" height="18" rx="3" transform="rotate(-18 178 11)"/>
    <path d="M36 34 L92 30 L104 58 L30 62 Z"/><rect x="44" y="22" width="30" height="10" rx="2"/>
    <path d="M22 56 L120 56 L124 70 L18 70 Z"/><circle cx="46" cy="80" r="19"/><circle cx="98" cy="80" r="19"/><circle cx="46" cy="80" r="7" class="hole"/><circle cx="98" cy="80" r="7" class="hole"/>
    <path d="M20 62 L0 96 L10 98 L30 68 Z"/>` },
  fort: { w: 240, h: 130, s: 1.4, d: `
    <path d="M10 46 L230 46 L236 128 L4 128 Z"/><path d="M30 16 L80 16 L86 46 L24 46 Z"/><path d="M160 16 L210 16 L216 46 L154 46 Z"/>
    <rect x="76" y="24" width="86" height="10" rx="3"/><rect x="60" y="70" width="40" height="10" class="hole"/><rect x="140" y="70" width="40" height="10" class="hole"/>` }
};
/* Type de silhouette d'après le type, les sous-types, le nom (FR + EN) et l'armée de l'unité. */
function silType(u, us) {
  if (!u) return 'leg';
  const vn = u.variants ? [u.models[0].name, ...u.variants.map(v => v.name)] : [], cur = us && us.variant != null && u.variants ? u.variants[us.variant].name : (u.models[0] || {}).name;
  const keep = l => { const i = l.indexOf(' : '); if (i < 0) return true; const who = l.slice(0, i); return !vn.includes(who) || who === cur; };
  const en = (I18N.terms && I18N.terms[u.name]) || '', name = (u.name + ' ' + (vn.length ? cur : '') + ' ' + en).toLowerCase(), types = (u.types || []).filter(keep).join(' ').toLowerCase(), wg = (u.wargear || []).filter(keep).join(' ').toLowerCase();
  const has = re => re.test(types), nm = re => re.test(name);
  if (u.role === 'FO' || has(/fortification|emplacement/)) return 'fort';
  if (has(/titan/)) return 'titan';
  if (has(/chevalier|knight/)) return 'knight';
  if (has(/primarque|primarch/)) return 'primarch';
  if (nm(/drop pod|module d.atterrissage|dreadclaw|kharybdis/)) return 'pod';
  if (has(/aéronef|flyer|aircraft/) || nm(/thunderhawk|storm eagle|stormbird|fire raptor|xiphon|primaris-lightning|avenger|lightning|caestus|kharybdis|stormbird/)) return 'flyer';
  if (has(/dreadnought|marcheur|walker/) || nm(/dreadnought|contemptor|leviathan|deredeo|mortis|castraferrum|cybernetica/)) return nm(/castellax|vorax|domitar|thanatar|cybernetica|automate|automata|battle-automata/) ? 'automata' : 'dread';
  if (has(/automate|automata/)) return 'automata';
  if (has(/véhicule|vehicle/)) {
    if (has(/super-lourd|super-heavy/) || nm(/fellblade|falchion|typhon|cerberus|glaive|mastodon|malcador|baneblade|shadowsword|stormblade/)) return 'superheavy';
    if (has(/antigrav|skimmer|flyer/) || nm(/land speeder|javelin|sky-?slayer|kyzagan|speeder|scimitar|jetbike/)) return 'skimmer';
    if (nm(/artillery|artillerie|battery|batterie|rapier|tarantula|mortar|mortier|basilisk|medusa|earthshaker|thunderfire|quad|araknae|carapace/)) return 'artillery';
    if (nm(/land raider|spartan|proteus|achilles|mastodon|termite|gorgon|transport lourd|heavy transport/)) return 'hapc';
    if (nm(/rhino|transport|arvus|aurox|dracosan|atlas|trojan|carrier|sabre/) || u.role === 'TP' || u.role === 'TL') return u.role === 'TL' ? 'hapc' : 'apc';
    return 'tank';
  }
  if (u.army === 'dmn' || has(/démon|daemon|malefic|maléfique/) && nm(/daemon|démon|brute|sovereign|souverain/)) return 'daemon';
  if (u.army === 'cust' || u.army === 'lc' || nm(/custodien|custodian|custodes|sentinel|sentinelle/)) return 'custodian';
  if (has(/cavalerie|cavalry/) || nm(/moto|bike|outrider|jetbike|chevauch|cavalier|scimitar/)) return 'bike';
  if (has(/antigrav/) || nm(/réacteurs|jump|assaut|assault|seraph|vulturax|ursarax|warhawk|sky-hunter|raptor/) && !nm(/vétéran tactique/)) return has(/antigrav/) || nm(/réacteurs|jump/) ? 'jump' : (nm(/assaut|assault/) ? 'jump' : 'leg');
  if (nm(/terminator|cataphractii|tartaros|saturnine|gorgon|indomitus|deathwing|justaerin|huscarl|phaetus|phaeretus|grave warden|reaver|mor deythan/)) return 'term';
  if (u.army === 'skit' || nm(/skitarii|vanguard|ranger|peregrin|pérégrin/)) return 'skitarii';
  if (u.army === 'mil' || u.army === 'cult') return 'militia';
  if (u.army === 'aux' || u.army === 'sa' || nm(/auxilia|veletari|lasrifle|lasfusil|tercio|cohort/)) return 'auxilia';
  if (has(/unique|état-major|command|quartier|warlord|seigneur de guerre/) || ['QG', 'SG', 'EM'].includes(u.role)) return 'officer';
  if (nm(/appui|support|heavy|lourde|devastator|destroyer|destructeur|missile|las|autocanon|autocannon/) || /canon laser|lascannon|missile launcher|lance-missiles|bolter lourd|heavy bolter|autocanon|autocannon|multi-fuseur|multi-melta|plasma lourd|heavy plasma/.test(wg)) return 'heavy';
  return 'leg';
}
const SIL_NAMES = () => ({ leg: L`Légionnaire`, officer: L`Officier`, heavy: L`Arme lourde`, jump: L`Réacteurs`, term: L`Terminator`, bike: L`Motard`, dread: L`Dreadnought`, automata: L`Automate`, custodian: L`Custodien`, auxilia: L`Auxiliaire`, militia: L`Milicien`, skitarii: L`Skitarii`, daemon: L`Démon`, primarch: L`Primarque`, knight: L`Chevalier`, titan: L`Titan`, apc: L`Transport`, hapc: L`Transport lourd`, tank: L`Char`, superheavy: L`Char super-lourd`, skimmer: L`Antigrav`, flyer: L`Aéronef`, pod: L`Module d'atterrissage`, artillery: L`Artillerie`, fort: L`Fortification` });
/* SVG autonome d'une silhouette : couleur, fond (pour les jours entre les pièces), hauteur en px */
function silInner(type, color, bg) {
  const s = SIL[type] || SIL.leg;
  return `<g fill="${color}">` + s.d.replace(/class="(hole|eye)"/g, `fill="${bg}"`).replace(/class="flame"/g, 'fill="#e8732c" opacity=".85"').replace(/class="(cape|coat)"/g, 'opacity=".9"') + '</g>';
}
function silBox(type) { const s = SIL[type] || SIL.leg, t = s.top || 0; return { x: 0, y: t, w: s.w, h: s.h - t }; }
function silSVG(type, color, h, bg) {
  const b = silBox(type), H = h || 60, W = H * b.w / b.h;
  return `<svg class="sil" viewBox="${b.x} ${b.y} ${b.w} ${b.h}" width="${W.toFixed(1)}" height="${H}" aria-hidden="true">${silInner(type, color || 'currentColor', bg || 'var(--sil-bg, #e9dcc0)')}</svg>`;
}
/* ---------- Schéma d'armée (bêta) : présentation visuelle de la liste, mise en page automatique ---------- */
/* Réglages par liste : army.dia = { layout: 'ranks'|'compact'|'orbat', style: 'parchment'|'dark'|'clean', pts, official, photos, title, sub, note } */
/* Réglage par unité : us.dia = { t: type de silhouette imposé, src: 'auto'|'photo'|'sil', img: id d'image perso } */
const DIA_STYLES = {
  parchment: { bg: '#e9dcc0', bg2: '#d8c49c', ink: '#17110d', sub: '#4d3f31', acc: '#8c3a22', frame: '#a8523a', ally: '#7a2e1c', paper: true },
  dark: { bg: '#141416', bg2: '#0c0c0e', ink: '#e6e0d2', sub: '#a7a091', acc: '#c9a24f', frame: '#8a6c2c', ally: '#e8732c' },
  clean: { bg: '#ffffff', bg2: '#f2f2f2', ink: '#111111', sub: '#5e5e5e', acc: '#c2382a', frame: '#c9c9c9', ally: '#c2382a' }
};
const DIA_DEF = { layout: 'ranks', style: 'parchment', pts: true, official: true, photos: true, title: '', sub: '', note: '' };
// toujours le même objet : les réglages modifiés sont bien ceux qu'on dessine
const diaCfg = () => { const d = army.dia || (army.dia = {}); for (const k in DIA_DEF) if (!(k in d)) d[k] = DIA_DEF[k]; return d; };
let DIA_EXPORT = false; // pendant l'export, pas de cadre de sélection
let DIA_ZOOM = false; // téléphone : schéma agrandi avec défilement
let DIA_SEL = null; // unité dont on règle l'image (det:slot)
/* mesure de texte (même police que l'export) */
const _mc = document.createElement('canvas').getContext('2d');
function tw(t, size, fam = 'Cinzel', wt = 700) { _mc.font = `${wt} ${size}px "${fam}"`; return _mc.measureText(t).width; }
function wrap(t, size, max, fam, wt) { const words = String(t).split(/\s+/), out = []; let cur = ''; for (const w of words) { const nx = cur ? cur + ' ' + w : w; if (tw(nx, size, fam, wt) > max && cur) { out.push(cur); cur = w; } else cur = nx; } if (cur) out.push(cur); return out; }
const trd = s => LANG !== 'fr' ? trData(String(s)) : String(s);
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
/* toutes les unités de la liste, dans l'ordre d'affichage */
function diaUnits() {
  const out = [], main = mainDet();
  const order = [main, ...army.dets.filter(d => d !== main && detDef(d.type).kind !== 'allie' && !army.dets.some(a => a.id === d.parent && detDef(a.type).kind === 'allie'))];
  army.dets.filter(d => detDef(d.type).kind === 'allie').forEach(a => { order.push(a); army.dets.filter(d => d.parent === a.id).forEach(d => order.push(d)); });
  army.dets.forEach(d => { if (!order.includes(d)) order.push(d); });
  for (const det of order) { const ally = detDef(det.type).kind === 'allie' || army.dets.some(a => a.id === det.parent && detDef(a.type).kind === 'allie');
    for (const s of slotsOf(det)) { const us = det.units[s.i], u = us && UNITS[us.u]; if (!u) continue;
      const cfg = us.dia || {}, t = cfg.t || silType(u, us);
      out.push({ det, s, us, u, key: det.id + ':' + s.i, t, n: Math.max(1, unitSize(us)), ally, name: us.label && String(us.label).trim() ? us.label : trd(u.name), off: us.label ? (LANG !== 'fr' ? trData(u.name) : u.name) : '', pts: unitPoints(us), cat: ROLECAT[u.role] || 'other' }); } }
  return out;
}
/* image à dessiner pour une unité : silhouette, photo ou image perso */
function diaImg(x) { const c = x.us.dia || {}, D = diaCfg();
  if (c.src === 'sil' && c.img && photoURL(c.img)) return { kind: 'img', url: photoURL(c.img), id: c.img };
  if ((c.src === 'photo' || (D.photos && c.src !== 'auto' && c.src !== 'sil')) && x.us.photo && photoURL(x.us.photo.id)) return { kind: 'photo', url: photoURL(x.us.photo.id), p: x.us.photo };
  return { kind: 'sil' };
}
/* dimensions d'une figurine à l'échelle du schéma (H0 = hauteur d'un légionnaire) */
function figSize(t, H0) { const s = SIL[t] || SIL.leg, b = silBox(t), h = H0 * (s.s || 1); return { w: h * b.w / b.h, h }; }
/* dessin d'une figurine (ou photo / image perso) posée sur sa ligne de base */
function drawFig(x, cx, base, H0, C, clipId) {
  const im = diaImg(x), f = figSize(x.t, H0);
  if (im.kind === 'photo') { const r = H0 * 0.62; const p = im.p, m = p.mode || 's';
    if (m === 'p') return `<clipPath id="${clipId}"><circle cx="${cx}" cy="${base - r}" r="${r}"/></clipPath><image href="${im.url}" x="${cx - r * 1.6}" y="${base - r * 2 - r * .6}" width="${r * 3.2}" height="${r * 3.2}" preserveAspectRatio="xMidYMid slice" clip-path="url(#${clipId})"/><circle cx="${cx}" cy="${base - r}" r="${r}" fill="none" stroke="${C.acc}" stroke-width="2"/>`;
    const w = m === 'l' ? r * 3.4 : r * 2, h = r * 2; return `<clipPath id="${clipId}"><rect x="${cx - w / 2}" y="${base - h}" width="${w}" height="${h}" rx="4"/></clipPath><image href="${im.url}" x="${cx - w / 2}" y="${base - h}" width="${w}" height="${h}" preserveAspectRatio="xMidYMid slice" clip-path="url(#${clipId})"/><rect x="${cx - w / 2}" y="${base - h}" width="${w}" height="${h}" rx="4" fill="none" stroke="${C.frame}" stroke-width="1.5"/>`; }
  if (im.kind === 'img') { const h = f.h, col = x.ally ? C.ally : C.ink; return `<mask id="${clipId}" style="mask-type:alpha" maskUnits="userSpaceOnUse" x="${cx - h}" y="${base - h}" width="${h * 2}" height="${h}"><image href="${im.url}" x="${cx - h}" y="${base - h}" width="${h * 2}" height="${h}" preserveAspectRatio="xMidYMax meet"/></mask><rect x="${cx - h}" y="${base - h}" width="${h * 2}" height="${h}" fill="${col}" mask="url(#${clipId})"/>`; }
  const b = silBox(x.t), k = f.h / b.h;
  return `<g transform="translate(${(cx - f.w / 2).toFixed(1)} ${(base - f.h).toFixed(1)}) scale(${k.toFixed(4)}) translate(${-b.x} ${-b.y})">${silInner(x.t, x.ally ? C.ally : C.ink, C.bg)}</g>`;
}
function figW(x, H0) { const im = diaImg(x); if (im.kind === 'photo') { const r = H0 * .62; return (im.p.mode === 'l' ? r * 3.4 : r * 2) + 4; } if (im.kind === 'img') { const r = PH_DIM[im.id]; return r ? Math.min(figSize(x.t, H0).h * 2, figSize(x.t, H0).h * r) + 2 : figSize(x.t, H0).h * 1.2; } return figSize(x.t, H0).w; }
function figH(x, H0) { const im = diaImg(x); if (im.kind === 'photo') return H0 * 1.24; return figSize(x.t, H0).h; }
const BIG = new Set(['superheavy', 'flyer', 'titan', 'knight']);
/* bloc d'une unité : figurines + étiquette */
function unitBlock(x, mode, H0, C, D, uidp) {
  const one = mode === 'compact' || mode === 'orbat' || diaImg(x).kind === 'photo';
  const n = one ? 1 : x.n, isVeh = /apc|hapc|tank|superheavy|skimmer|flyer|artillery|pod|knight|titan|fort|dread|automata/.test(x.t);
  const per = one ? 1 : Math.min(isVeh ? 3 : 5, n), rows = Math.ceil(n / per);
  const fw = figW(x, H0), fh = figH(x, H0), gap = isVeh ? 10 : 2, rowGap = isVeh ? 10 : 4;
  const figsW = per * fw + (per - 1) * gap, figsH = rows * fh + (rows - 1) * rowGap;
  const nameT = x.name + (one && x.n > 1 ? '  ×' + x.n : ''), maxW = Math.max(figsW, 130);
  const l1 = wrap(nameT, 15, maxW + 30, 'Cinzel', 700), l2 = D.official && x.off ? wrap(x.off, 11.5, maxW + 30, 'Barlow Condensed', 500) : [], l3 = D.pts ? [x.pts + ' pts'] : [];
  const tW = Math.max(...l1.map(t => tw(t, 15)), ...l2.map(t => tw(t, 11.5, 'Barlow Condensed', 500)), ...l3.map(t => tw(t, 11, 'Barlow Condensed', 600)), 0);
  const W = Math.max(figsW, tW) + 16, Hh = figsH + 10 + l1.length * 17 + l2.length * 14 + l3.length * 13 + 6;
  const draw = (ox, oy) => {
    let s = `<g class="du" data-k="${x.key}" tabindex="0" role="button" aria-label="${esc(x.name)}" style="cursor:pointer">`, k = 0;
    if (DIA_SEL === x.key && !DIA_EXPORT) s += `<rect x="${ox - 4}" y="${oy - 4}" width="${W + 8}" height="${Hh + 8}" rx="8" fill="none" stroke="${C.acc}" stroke-width="2" stroke-dasharray="6 4"/>`;
    s += `<rect x="${ox}" y="${oy}" width="${W}" height="${Hh}" fill="transparent"/>`;
    const fx0 = ox + (W - figsW) / 2;
    for (let r = 0; r < rows; r++) { const inRow = Math.min(per, n - r * per), rw = inRow * fw + (inRow - 1) * gap, rx0 = ox + (W - rw) / 2; for (let c = 0; c < inRow; c++) s += drawFig(x, rx0 + c * (fw + gap) + fw / 2, oy + (r + 1) * fh + r * rowGap, H0, C, uidp + '_' + (k++)); }
    let ty = oy + figsH + 10;
    for (const t of l1) { ty += 15; s += `<text x="${ox + W / 2}" y="${ty}" text-anchor="middle" font-family="Cinzel" font-weight="700" font-size="15" fill="${x.ally ? C.ally : C.ink}">${esc(t)}</text>`; ty += 2; }
    for (const t of l2) { ty += 13; s += `<text x="${ox + W / 2}" y="${ty}" text-anchor="middle" font-family="Barlow Condensed" font-weight="500" font-size="11.5" fill="${C.sub}" letter-spacing=".3">${esc(t)}</text>`; ty += 1; }
    for (const t of l3) { ty += 13; s += `<text x="${ox + W / 2}" y="${ty}" text-anchor="middle" font-family="Barlow Condensed" font-weight="600" font-size="11" fill="${C.acc}" letter-spacing=".8">${esc(t)}</text>`; }
    return s + '</g>';
  };
  return { W, H: Hh, draw, big: BIG.has(x.t) };
}
/* rangées : blocs placés de gauche à droite, retour à la ligne, centrés */
function flow(blocks, maxW, gapX = 26, gapY = 22) {
  const rows = []; let cur = [], w = 0;
  for (const b of blocks) { if (b.big) { if (cur.length) rows.push(cur); rows.push([b]); cur = []; w = 0; continue; } if (cur.length && w + gapX + b.W > maxW) { rows.push(cur); cur = []; w = 0; } cur.push(b); w += (cur.length > 1 ? gapX : 0) + b.W; }
  if (cur.length) rows.push(cur);
  let y = 0; const placed = [];
  for (const r of rows) { const rw = r.reduce((a, b) => a + b.W, 0) + gapX * (r.length - 1), h = Math.max(...r.map(b => b.H)); let x = (maxW - rw) / 2; for (const b of r) { placed.push({ b, x, y: y + h - b.H }); x += b.W + gapX; } y += h + gapY; }
  return { placed, h: Math.max(0, y - gapY) };
}
const CAT_NAMES = () => ({ cmd: L`Commandement`, line: L`Troupes`, elite: L`Élites`, fast: L`Attaque rapide et Reconnaissance`, heavy: L`Soutien et Assaut lourd`, trans: L`Transports`, lord: L`Seigneurs de Guerre`, fort: L`Fortifications`, other: L`Autres` });
function buildDiagram() {
  const D = diaCfg(), C = DIA_STYLES[D.style] || DIA_STYLES.parchment, W = 1000, PAD = 44, IW = W - PAD * 2;
  const units = diaUnits(), parts = []; let y = 0, gid = 0;
  const title = D.title || army.name || L`Mon armée`, rite = ritesFor().length > 1 ? riteDef() : null, sub = D.sub || [army.allegiance, army.faction, rite && rite.name, armyPoints() + ' pts'].filter(Boolean).map(t => LANG !== 'fr' ? trData(String(t)) : t).join('  ·  ');
  // titre
  y = 58; const tl = wrap(title.toUpperCase(), 38, IW - 120, 'Cinzel', 700);
  for (const t of tl) { parts.push(`<text x="${W / 2}" y="${y}" text-anchor="middle" font-family="Cinzel" font-weight="700" font-size="38" letter-spacing="2" fill="${C.ink}">${esc(t)}</text>`); y += 44; }
  const tW = Math.min(IW - 100, Math.max(...tl.map(t => tw(t, 38) + t.length * 2 + 8))); parts.push(`<path d="M${W / 2 - tW / 2 - 70} ${y - 58} h50 M${W / 2 + tW / 2 + 20} ${y - 58} h50" stroke="${C.acc}" stroke-width="2"/><path d="M${W / 2 - tW / 2 - 20} ${y - 64} l6 6 -6 6 -6 -6z M${W / 2 + tW / 2 + 20} ${y - 64} l6 6 -6 6 -6 -6z" fill="${C.acc}"/>`);
  // sous-titre coupé en lignes, espacement des lettres compris
  const sl = []; { let cur = ''; for (const w of String(sub).split(/\s+/)) { const nx = cur ? cur + ' ' + w : w; if (cur && tw(nx, 17, 'Barlow Condensed', 600) + nx.length * 1.5 > IW - 60) { sl.push(cur); cur = w; } else cur = nx; } if (cur) sl.push(cur); } sl.forEach((t, i) => parts.push(`<text x="${W / 2}" y="${y - 10 + i * 21}" text-anchor="middle" font-family="Barlow Condensed" font-weight="600" font-size="17" letter-spacing="1.5" fill="${C.sub}">${esc(t)}</text>`)); y += 22 + (sl.length - 1) * 21;
  const frame = (x0, y0, w, h, label, ally) => `<rect x="${x0}" y="${y0}" width="${w}" height="${h}" fill="${ally ? (D.style === 'dark' ? 'rgba(232,115,44,.06)' : 'rgba(140,58,34,.07)') : 'none'}" stroke="${ally ? C.ally : C.frame}" stroke-width="1.6" rx="3"/><rect x="${x0 + 4}" y="${y0 + 4}" width="${w - 8}" height="${h - 8}" fill="none" stroke="${ally ? C.ally : C.frame}" stroke-width=".6" rx="2"/>` + (label ? `<text x="${x0 + 16}" y="${y0 + 30}" font-family="Cinzel" font-weight="700" font-size="20" fill="${ally ? C.ally : C.ink}">${esc(label)}</text>` : '');
  const H0 = D.layout === 'ranks' ? 46 : 58;
  if (D.layout === 'ranks') {
    // un cadre par détachement, une silhouette par figurine
    const byDet = new Map(); for (const x of units) { if (!byDet.has(x.det)) byDet.set(x.det, []); byDet.get(x.det).push(x); }
    for (const [det, xs] of byDet) {
      const order = ['cmd', 'line', 'elite', 'fast', 'heavy', 'trans', 'lord', 'fort', 'other'];
      xs.sort((a, b) => (BIG.has(a.t) - BIG.has(b.t)) || order.indexOf(a.cat) - order.indexOf(b.cat));
      const blocks = xs.map(x => unitBlock(x, 'ranks', H0, C, D, 'c' + (gid++))), f = flow(blocks, IW - 40), h = f.h + 72, ally = xs[0].ally;
      parts.push(frame(PAD, y, IW, h, trd(detName(det)) + '  ·  ' + detPoints(det) + ' pts', ally));
      for (const p of f.placed) parts.push(p.b.draw(PAD + 20 + p.x, y + 50 + p.y));
      y += h + 22;
    }
  } else if (D.layout === 'compact') {
    // par catégorie de rôle, une silhouette par unité (×N) ; détachements alliés dans leur propre cadre
    const groups = [], cats = CAT_NAMES();
    const add = (label, xs, ally) => { if (xs.length) groups.push({ label, xs, ally }); };
    const mine = units.filter(x => !x.ally), allies = units.filter(x => x.ally);
    for (const c of ['cmd', 'line', 'elite', 'fast', 'heavy', 'trans', 'lord', 'fort', 'other']) add(cats[c], mine.filter(x => x.cat === c && !BIG.has(x.t)), false);
    add(L`Engins de guerre et appui aérien`, mine.filter(x => BIG.has(x.t)), false);
    const allyDets = [...new Set(allies.map(x => x.det))]; for (const d of allyDets) add(trd(detName(d)) + (detFaction(d) ? ' — ' + trd(detFaction(d)) : ''), allies.filter(x => x.det === d), true);
    for (const g of groups) {
      const blocks = g.xs.map(x => unitBlock(x, 'compact', H0, C, D, 'c' + (gid++))), framed = g.ally || g.label === L`Engins de guerre et appui aérien`;
      const f = flow(blocks, IW - (framed ? 40 : 0)), h = f.h + (framed ? 72 : 50);
      if (framed) parts.push(frame(PAD, y, IW, h, g.label, g.ally));
      else parts.push(`<text x="${PAD}" y="${y + 24}" font-family="Cinzel" font-weight="700" font-size="22" fill="${C.ink}">${esc(g.label)}</text><path d="M${PAD} ${y + 32} H${W - PAD}" stroke="${C.frame}" stroke-width="1"/>`);
      for (const p of f.placed) parts.push(p.b.draw(PAD + (framed ? 20 : 0) + p.x, y + (framed ? 50 : 46) + p.y));
      y += h + 20;
    }
  } else {
    // ordre de bataille : l'armée en haut, un tronc par détachement, ses unités en colonne
    const byDet = new Map(); for (const x of units) { if (!byDet.has(x.det)) byDet.set(x.det, []); byDet.get(x.det).push(x); }
    const dets = [...byDet.keys()], colW = Math.max(180, Math.min(300, (IW - 20 * (dets.length - 1)) / Math.max(1, Math.min(dets.length, 4))));
    const perRow = Math.max(1, Math.floor((IW + 20) / (colW + 20)));
    parts.push(`<circle cx="${W / 2}" cy="${y + 8}" r="7" fill="${C.acc}"/>`); y += 16;
    for (let r = 0; r < dets.length; r += perRow) {
      const row = dets.slice(r, r + perRow), rw = row.length * colW + (row.length - 1) * 20, x0 = (W - rw) / 2; let maxH = 0;
      const top = y + 26; parts.push(`<path d="M${W / 2} ${y - 8} V${y + 10} M${x0 + colW / 2} ${y + 10} H${x0 + rw - colW / 2}" stroke="${C.frame}" stroke-width="1.6" fill="none"/>`);
      row.forEach((det, i) => { const cx = x0 + i * (colW + 20), xs = byDet.get(det), ally = xs[0].ally;
        parts.push(`<path d="M${cx + colW / 2} ${y + 10} V${top}" stroke="${C.frame}" stroke-width="1.6"/>`);
        const head = wrap(trd(detName(det)), 16, colW - 20, 'Cinzel', 700); let hh = 16 + head.length * 19 + 18;
        let s = `<rect x="${cx}" y="${top}" width="${colW}" height="${hh}" rx="4" fill="${ally ? C.ally : C.ink}"/>`; head.forEach((t, k) => s += `<text x="${cx + colW / 2}" y="${top + 26 + k * 19}" text-anchor="middle" font-family="Cinzel" font-weight="700" font-size="16" fill="${C.bg}">${esc(t)}</text>`);
        s += `<text x="${cx + colW / 2}" y="${top + hh - 9}" text-anchor="middle" font-family="Barlow Condensed" font-weight="600" font-size="12" fill="${C.bg}" opacity=".8">${esc(detPoints(det) + ' pts')}</text>`;
        let yy = top + hh + 14;
        for (const x of xs) { const b = unitBlock(x, 'orbat', 40, C, D, 'c' + (gid++)), bx = cx + (colW - b.W) / 2, cy = yy + b.H / 2;
          // tronc à gauche + branche jusqu'à l'unité : chaque trait relie quelque chose
          s += `<path d="M${cx + 10} ${yy - 14} V${cy}${bx - 6 > cx + 14 ? ` H${bx - 6}` : ''}" stroke="${C.frame}" stroke-width="1" fill="none"/>`; s += b.draw(bx, yy); yy += b.H + 12; }
        parts.push(s); maxH = Math.max(maxH, yy - y);
      });
      y += maxH + 26;
    }
  }
  if (D.note.trim()) { const lines = D.note.split('\n').flatMap(l => wrap(l || ' ', 15, IW - 60, 'Barlow Condensed', 500)), h = 40 + lines.length * 20;
    parts.push(frame(PAD, y, IW, h, '', false)); lines.forEach((t, i) => parts.push(`<text x="${PAD + 24}" y="${y + 30 + i * 20}" font-family="Barlow Condensed" font-weight="500" font-size="15" fill="${C.ink}">${esc(t)}</text>`)); y += h + 20; }
  if (!units.length) { parts.push(`<text x="${W / 2}" y="${y + 60}" text-anchor="middle" font-family="Barlow Condensed" font-size="20" fill="${C.sub}">${esc(L`Ajoutez des unités à votre liste : elles apparaîtront ici.`)}</text>`); y += 110; }
  y += 10; parts.push(`<text x="${W / 2}" y="${y + 14}" text-anchor="middle" font-family="Barlow Condensed" font-size="11" letter-spacing="1" fill="${C.sub}" opacity=".75">${esc(L`Forbidden Recruit · schéma généré · silhouettes originales, outil non officiel`)}</text>`);
  const H = y + 34;
  const bg = C.paper ? `<defs><radialGradient id="pg" cx="50%" cy="40%" r="75%"><stop offset="0" stop-color="#f3e8cf"/><stop offset="1" stop-color="${C.bg2}"/></radialGradient></defs><rect width="${W}" height="${H}" fill="url(#pg)"/><rect x="12" y="12" width="${W - 24}" height="${H - 24}" fill="none" stroke="${C.frame}" stroke-width="2"/>`
    : `<rect width="${W}" height="${H}" fill="${C.bg}"/><rect x="12" y="12" width="${W - 24}" height="${H - 24}" fill="none" stroke="${C.frame}" stroke-width="1"/>`;
  return { svg: `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-label="${esc(L`Schéma de l'armée`)}">${bg}${parts.join('')}</svg>`, W, H };
}
function renderDiagram(host) {
  const D = diaCfg(), set = (k, v) => { D[k] = v; touch(); };
  host.append(viewHead(L`Schéma de l'armée`, L`Bêta · Votre liste en silhouettes, mise en page automatiquement. Touchez une unité pour changer son image.`,
    el('button', { type: 'button', class: 'btn', onclick: () => exportDiagram('png') }, L`Image PNG`), el('button', { type: 'button', class: 'btn ghost', onclick: () => exportDiagram('pdf') }, L`PDF`)));
  const opts = el('div', { class: 'dia-opts' },
    el('div', { class: 'grp' }, el('span', { class: 'lab' }, L`Disposition`), seg([['ranks', L`Rangs`, L`une silhouette par figurine`], ['compact', L`Compact`, L`une par unité, ×N`], ['orbat', L`Ordre de bataille`, L`arbre des détachements`]], D.layout, v => set('layout', v), L`Disposition`)),
    el('div', { class: 'grp' }, el('span', { class: 'lab' }, L`Style`), seg([['parchment', L`Parchemin`], ['dark', L`Sombre`], ['clean', L`Épuré`]], D.style, v => set('style', v), L`Style`)),
    el('div', { class: 'grp checks' }, [['pts', L`Points`], ['official', L`Nom officiel sous le nom donné`], ['photos', L`Photos à la place des silhouettes`]].map(([k, t]) => el('label', { class: 'chk' }, el('input', { type: 'checkbox', checked: !!D[k], onchange: e => set(k, e.target.checked) }), el('span', {}, t)))),
    el('details', { class: 'grp more' }, el('summary', {}, L`Titre, sous-titre et encart libre`),
      el('label', { class: 'fld' }, el('span', {}, L`Titre`), el('input', { class: 'field', type: 'text', value: D.title, placeholder: army.name, maxlength: 80, onchange: e => set('title', e.target.value) })),
      el('label', { class: 'fld' }, el('span', {}, L`Sous-titre`), el('input', { class: 'field', type: 'text', value: D.sub, placeholder: L`Allégeance · Faction · Rite · points`, maxlength: 140, onchange: e => set('sub', e.target.value) })),
      el('label', { class: 'fld' }, el('span', {}, L`Encart libre (réserves, historique, notes…)`), el('textarea', { class: 'field', rows: 4, maxlength: 1200, onchange: e => set('note', e.target.value) }, D.note))));
  const g = buildDiagram(), stage = el('div', { class: 'dia-stage' + (DIA_ZOOM ? ' zoom' : ''), html: g.svg });
  const zoomBtn = el('button', { type: 'button', class: 'btn ghost sm dia-zoom', 'aria-pressed': String(DIA_ZOOM), onclick: () => { DIA_ZOOM = !DIA_ZOOM; render(); } }, DIA_ZOOM ? L`Vue d'ensemble` : L`Agrandir le schéma`);
  const diaPick = e => { const t = e.target.closest && e.target.closest('.du'); if (!t) return; DIA_SEL = DIA_SEL === t.dataset.k ? null : t.dataset.k; render(); requestAnimationFrame(() => { const p = $('.dia-unit'); p && p.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); }); };
  stage.addEventListener('click', diaPick);
  stage.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); diaPick(e); } });
  host.append(el('div', { class: 'dia-wrap' }, opts, el('div', { class: 'dia-main' }, zoomBtn, el('div', { class: 'dia-scroll' }, stage), diaUnitPanel())));
}
/* panneau de l'unité touchée : type de silhouette, photo, silhouette tirée de la photo, image perso */
function diaUnitPanel() {
  if (!DIA_SEL) return el('p', { class: 'hint dia-hint' }, L`Astuce : touchez une unité du schéma pour choisir sa silhouette, utiliser sa photo ou importer votre propre image.`);
  const x = diaUnits().find(v => v.key === DIA_SEL); if (!x) { DIA_SEL = null; return null; }
  const us = x.us, c = us.dia = us.dia || {}, names = SIL_NAMES(), hasPh = us.photo && photoURL(us.photo.id), cur = c.src || 'auto';
  const sel = el('select', { class: 'field', 'aria-label': L`Type de silhouette`, onchange: e => { if (e.target.value === '') delete c.t; else c.t = e.target.value; touch(); } },
    el('option', { value: '' }, L`Automatique (${names[silType(x.u, us)]})`), Object.keys(SIL).map(k => el('option', { value: k, selected: c.t === k }, names[k])));
  // aperçu de l'image réellement utilisée dans le schéma
  const imgId = c.src === 'photo' && hasPh ? us.photo.id : c.src === 'sil' && c.img && photoURL(c.img) ? c.img : null;
  const prev = imgId === us.photo?.id && c.src === 'photo' ? el('div', { class: 'dia-prev' }, el('img', { src: photoURL(imgId), alt: '' }))
    : imgId ? el('div', { class: 'dia-prev' }, el('span', { class: 'dia-mask', style: `-webkit-mask-image:url(${photoURL(imgId)});mask-image:url(${photoURL(imgId)})` }))
    : el('div', { class: 'dia-prev', html: silSVG(x.t, 'currentColor', 90) });
  const mkSil = async (tol) => { flash(L`Détourage en cours…`); if (await autoSilhouette(us, tol)) flash(L`Silhouette créée à partir de la photo.`); touch(); };
  return el('section', { class: 'dia-unit panel' },
    el('header', {}, el('h3', {}, x.name), el('button', { type: 'button', class: 'ib', 'aria-label': L`Fermer`, onclick: () => { DIA_SEL = null; render(); } }, '×')),
    el('div', { class: 'dia-u-grid' }, prev,
      el('div', {},
        el('span', { class: 'lab' }, L`Image dans le schéma`),
        seg([['auto', L`Silhouette`], ['photo', L`Photo`], ['sil', L`Silhouette perso`]], cur, v => { if (v === 'photo' && !hasPh) return flash(L`Ajoutez d'abord une photo à cette unité (Liste › unité › Photo).`); if (v === 'sil' && !c.img) return flash(L`Créez la silhouette depuis la photo ou importez une image ci-dessous.`); c.src = v; touch(); }, L`Image dans le schéma`),
        el('label', { class: 'fld' }, el('span', {}, L`Type de silhouette`), sel),
        hasPh ? el('div', { class: 'fld' }, el('span', {}, L`Silhouette tirée de la photo (fond uni conseillé)`),
          el('div', { class: 'row-btns' }, el('button', { type: 'button', class: 'btn ghost sm', onclick: () => mkSil(c.tol || 60) }, L`Créer la silhouette`),
            el('label', { class: 'tol' }, L`Précision du détourage `, el('input', { type: 'range', min: 15, max: 140, value: c.tol || 60, onchange: e => mkSil(+e.target.value) })))) : null,
        el('div', { class: 'row-btns' }, el('button', { type: 'button', class: 'btn ghost sm', onclick: () => pickImage(async f => { const { blob, w, h } = await compressImage(f, 700, 'image/png'); c.img = await storePhoto(blob, w, h, 'sil'); c.src = 'sil'; touch(); }) }, L`Importer une image (PNG transparent)`),
          c.src || c.t ? el('button', { type: 'button', class: 'btn ghost sm', onclick: () => { delete us.dia; touch(); } }, L`Rétablir l'automatique`) : null))));
}
/* ---------- Export PNG / PDF : SVG autonome (polices et images incorporées) ---------- */
async function blobToData(url) { const b = await (await fetch(url)).blob(); return new Promise(ok => { const r = new FileReader(); r.onload = () => ok(r.result); r.readAsDataURL(b); }); }
async function diagramCanvas(scale = 2) {
  DIA_EXPORT = true; let b; try { b = buildDiagram(); } finally { DIA_EXPORT = false; }
  let { svg, W, H } = b;
  const urls = [...new Set([...svg.matchAll(/href="(blob:[^"]+)"/g)].map(m => m[1]))];
  for (const u of urls) { try { const d = await blobToData(u); svg = svg.split(u).join(d); } catch (e) {} }
  const fonts = []; for (const s of document.styleSheets) { try { for (const r of s.cssRules) if (r.type === 5 && /Cinzel|Barlow Condensed/.test(r.cssText)) fonts.push(r.cssText); } catch (e) {} }
  svg = svg.replace(/(<svg[^>]*>)/, `$1<style>${fonts.join('')}</style>`);
  const img = new Image(); const url = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' }));
  await new Promise((ok, ko) => { img.onload = ok; img.onerror = () => ko(new Error(L`Rendu du schéma impossible`)); img.src = url; });
  await new Promise(r => setTimeout(r, 60));
  const c = document.createElement('canvas'); c.width = W * scale; c.height = H * scale; const g = c.getContext('2d'); g.scale(scale, scale); g.drawImage(img, 0, 0, W, H); URL.revokeObjectURL(url);
  return { c, W, H };
}
async function exportDiagram(kind) {
  try {
    flash(L`Création du schéma…`);
    const { c, W, H } = await diagramCanvas(2), base = fileBase() + L` — schéma`;
    if (kind === 'png') { const b = await new Promise(ok => c.toBlob(ok, 'image/png')); const ok = await saveFile(base + '.png', b); if (ok && NATIVE !== 'android') flash(L`Image créée : ${base}.png`); return; }
    const JS = window.jspdf && window.jspdf.jsPDF; if (!JS) return flash(L`Le module PDF n'est pas chargé.`);
    const pw = 210, ph = 297, k = Math.min((pw - 16) / W, (ph - 16) / H), long = H / W > 1.9;
    const doc = long ? new JS({ unit: 'mm', format: [pw, Math.max(ph, H * (pw - 16) / W + 16)] }) : new JS({ unit: 'mm', format: 'a4' });
    const s = long ? (pw - 16) / W : k, w = W * s, h = H * s, pgH = long ? H * s + 16 : ph;
    doc.addImage(c.toDataURL('image/jpeg', 0.92), 'JPEG', (pw - w) / 2, (pgH - h) / 2, w, h);
    doc.setProperties({ title: base, creator: 'Forbidden Recruit' });
    const ok = await saveFile(base + '.pdf', doc.output('blob')); if (ok && NATIVE !== 'android') flash(L`PDF créé : ${base}.pdf`);
  } catch (e) { flash(e.message); }
}
/* ---------- Arbre des détachements : quelles cases ouvrent quels détachements ---------- */
function detTree() {
  const roots = [mainDet(), ...army.dets.filter(d => detDef(d.type).kind === 'allie')], box = el('section', { class: 'dtree', 'aria-label': L`Arbre des détachements` });
  box.append(el('h3', {}, L`Ce que vos choix ouvrent`), el('p', { class: 'hint' }, L`Chaque case État-major occupée ouvre un Détachement Auxiliaire, la case Quartier Général un Auxiliaire ou un Apex. Touchez une place libre pour ajouter un détachement.`));
  for (const root of roots) {
    const isMain = root === mainDet(), group = isMain ? army.dets.filter(d => d === root || detDef(d.type).kind === 'apex') : [root], src = [];
    for (const d of group) for (const s of slotsOf(d)) { const us = d.units[s.i], u = us && UNITS[us.u]; if (!u) continue;
      if (d.adv[s.i] === 'affectation' || detDef(d.type).noGrants || detDef(d.type).noUnlock || (advDef(d.adv[s.i]) || {}).noGrants) continue;
      if (s.role === 'QG' && isMain) src.push({ who: unitLabel(us, u), role: 'QG', kind: 'flex', n: 1 });
      if (s.role === 'EM' || d.adv[s.i] === 'petty') { const eu = effUnit(u, us) || u, x = ruleX(eu, 'Officier de Ligne') || ruleX(eu, 'Officer of the Line') || 1; src.push({ who: unitLabel(us, u), role: 'EM', kind: 'aux', n: x, unlock: u.name }); } }
    const apex = isMain ? childrenOf(root, 'apex') : [], aux = childrenOf(root, 'aux');
    // répartition : les Apex prennent les droits QG, les Auxiliaires d'abord les droits EM (avec leur unité requise), puis le reste
    const tokens = []; for (const s of src) for (let k = 0; k < s.n; k++) tokens.push({ s, det: null });
    const take = (det, pred) => { const t = tokens.find(t => !t.det && pred(t)); if (t) { t.det = det; return true; } return false; };
    for (const d of apex) take(d, t => t.s.kind === 'flex');
    for (const d of aux) { const req = detDef(d.type).requires; take(d, t => t.s.kind === 'aux' && (!req || t.s.unlock === req)) || take(d, t => t.s.kind === 'aux' && !req) || take(d, t => t.s.kind === 'flex' && !req) || take(d, t => !t.det); }
    const node = (d, cls) => el('button', { type: 'button', class: 'dt-node ' + cls, onclick: () => { const x = $(`[data-det="${d.id}"]`); if (x) x.scrollIntoView({ behavior: 'smooth', block: 'start' }); else if (d === mainDet()) { goStep(3); scrollTo({ top: 0, behavior: 'smooth' }); } } }, el('b', {}, detName(d)), el('i', {}, KIND[detDef(d.type).kind] + ' · ' + detPoints(d) + ' pts'));
    const free = t => el('button', { type: 'button', class: 'dt-node free', onclick: () => openDetPicker(t.s.kind === 'flex' ? ['aux', 'apex'] : ['aux']) }, el('b', {}, '＋ ' + (t.s.kind === 'flex' ? L`Auxiliaire ou Apex` : L`Détachement Auxiliaire`)), el('i', {}, L`Place libre — toucher pour choisir`));
    const rows = src.length ? src.map(s => el('li', {}, el('div', { class: 'dt-src' }, el('span', { class: 'dt-r r-' + s.role }, role(s.role).short), el('span', {}, s.who), s.n > 1 ? el('small', {}, L`Officier de Ligne (${s.n})`) : null),
      el('div', { class: 'dt-kids' }, tokens.filter(t => t.s === s).map(t => t.det ? node(t.det, t.s.kind === 'flex' && detDef(t.det.type).kind === 'apex' ? 'apex' : 'aux') : free(t)))))
      : [el('li', { class: 'dt-none' }, isMain ? L`Placez un Quartier Général ou un État-major dans le Détachement Principal pour ouvrir des détachements.` : L`Aucune case État-major occupée dans ce détachement allié.`)];
    const orphans = [...apex, ...aux].filter(d => !tokens.some(t => t.det === d));
    box.append(el('div', { class: 'dt-root' + (isMain ? '' : ' ally') }, node(root, 'root'), el('ul', {}, rows, orphans.length ? el('li', {}, el('div', { class: 'dt-src warn' }, L`Sans droit disponible`), el('div', { class: 'dt-kids' }, orphans.map(d => node(d, 'bad')))) : null)));
  }
  box.append(el('div', { class: 'dt-free' }, el('span', { class: 'lab' }, L`Sans condition :`), el('button', { type: 'button', class: 'btn ghost sm', onclick: () => openDetPicker() }, L`Allié, Seigneur de Guerre, Seigneur des Batailles…`)));
  return box;
}
/* ---------- Collection : figurines possédées, ce qu'il manque pour jouer la liste ---------- */
/* LS 'fr.collection' = { idUnité: nombre de figurines possédées } */
const COL = () => LS.get('fr.collection', {}) || {};
function setOwned(id, n) { const c = COL(); n = Math.max(0, Math.min(999, Math.floor(+n || 0))); if (n) c[id] = n; else delete c[id]; LS.set('fr.collection', c); }
let COL_Q = '';
function listNeeds(a = army) {
  const need = new Map();
  for (const d of a.dets) for (const us of Object.values(d.units)) { const u = UNITS[us.u]; if (!u) continue; const x = need.get(u.id) || { u, n: 0, names: [] }; x.n += Math.max(1, unitSize(us)); if (us.label && String(us.label).trim() && us.label.trim() !== u.name) x.names.push(us.label.trim()); need.set(u.id, x); }
  return [...need.values()];
}
function renderCollection(host) {
  const c = COL(), needs = listNeeds(), miss = needs.map(x => ({ ...x, own: c[x.u.id] || 0, miss: Math.max(0, x.n - (c[x.u.id] || 0)) })), totMiss = miss.reduce((a, x) => a + x.miss, 0);
  host.append(viewHead(L`Ma collection`, L`Notez les figurines que vous possédez : l'appli vous dit si la liste est jouable et ce qu'il vous manque. Votre collection reste sur cet appareil.`));
  const icon = u => el('span', { class: 'col-ic', html: silSVG(silType(u), 'currentColor', 34) });
  const row = (x, showNeed) => { const own = c[x.u.id] || 0;
    return el('li', { class: 'col-row' + (showNeed && own < x.n ? ' short' : '') }, icon(x.u),
      el('div', { class: 'col-t' }, el('b', {}, x.u.name), el('i', {}, showNeed ? (x.names.length ? [...new Set(x.names)].join(' · ') + ' — ' : '') + L`${x.n} figurine(s) dans la liste` : role(x.u.role).name)),
      showNeed ? el('span', { class: 'col-st ' + (own >= x.n ? 'ok' : 'ko') }, own >= x.n ? '✓' : L`−${x.n - own}`) : null,
      stepper(own, 0, 999, v => { setOwned(x.u.id, v); render(); })); };
  // pour cette liste
  const card = el('section', { class: 'panel col-list' }, el('header', { class: 'col-h' }, el('h3', {}, L`Pour la liste « ${army.name} »`),
    needs.length ? el('span', { class: 'pill ' + (totMiss ? 'bad' : 'good') }, totMiss ? L`Il manque ${totMiss} figurine(s)` : L`Liste jouable avec votre collection`) : null));
  if (!needs.length) card.append(el('p', { class: 'hint' }, L`La liste est vide : ajoutez des unités dans l'onglet Liste.`));
  else {
    card.append(el('ul', { class: 'col-ul' }, miss.map(x => row(x, true))));
    card.append(el('div', { class: 'row-btns' },
      el('button', { type: 'button', class: 'btn ghost sm', onclick: () => { for (const x of needs) if ((COL()[x.u.id] || 0) < x.n) setOwned(x.u.id, x.n); render(); flash(L`Collection mise à jour avec cette liste.`); } }, L`J'ai tout ce qu'il faut`),
      totMiss ? el('button', { type: 'button', class: 'btn ghost sm', onclick: () => { const t = L`À acquérir pour « ${army.name} » :\n` + miss.filter(x => x.miss).map(x => `- ${x.miss} × ${x.u.name}`).join('\n'); (navigator.clipboard ? navigator.clipboard.writeText(t) : Promise.reject()).then(() => flash(L`Liste des manques copiée.`), () => { download(fileBase() + L` — manques.txt`, t); }); } }, L`Copier ce qu'il manque`) : null));
  }
  host.append(card);
  // toute la collection
  const mine = Object.keys(c).filter(id => UNITS[id]).map(id => ({ u: UNITS[id], n: c[id] })).sort((a, b) => a.u.name.localeCompare(b.u.name));
  const total = mine.reduce((a, x) => a + x.n, 0);
  const all = el('section', { class: 'panel col-all' }, el('header', { class: 'col-h' }, el('h3', {}, L`Toute ma collection`), el('span', { class: 'pill' }, L`${total} figurine(s) · ${mine.length} entrée(s)`)));
  const q = el('input', { class: 'field', type: 'search', value: COL_Q, placeholder: L`Ajouter : chercher une unité…`, 'aria-label': L`Chercher une unité à ajouter` });
  const res = el('ul', { class: 'col-ul res' });
  const show = () => { COL_Q = q.value; const s = norm(q.value.trim()); res.replaceChildren(); if (s.length < 2) return;
    const hits = Object.values(UNITS).filter(u => (!u.legacy || legacyOn()) && norm(u.name + ' ' + trData(u.name)).includes(s)).slice(0, 12);
    if (!hits.length) res.append(el('li', { class: 'hint' }, L`Aucune unité trouvée.`));
    for (const u of hits) res.append(el('li', { class: 'col-row' }, icon(u), el('div', { class: 'col-t' }, el('b', {}, u.name), el('i', {}, (u.bookName || '') + ' · ' + role(u.role).name)), stepper(COL()[u.id] || 0, 0, 999, v => { setOwned(u.id, v); render(); }))); };
  q.addEventListener('input', show); show();
  all.append(q, res);
  if (mine.length) all.append(el('ul', { class: 'col-ul' }, mine.map(x => row(x, false))));
  else all.append(el('p', { class: 'hint' }, L`Votre collection est vide. Cherchez une unité ci-dessus, ou utilisez « J'ai tout ce qu'il faut » sur une liste.`));
  host.append(all);
}
/* ---------- Mode partie : tour, points de victoire, Réactions, état des unités ---------- */
/* LS 'fr.games' = { idListe: { turn, active: 'me'|'opp', vp: { me, opp }, rx: { max, used }, u: { clé: { dead, st: [] } }, log: [] } } */
const STATUSES = () => [['Pinned', L`Fixée`], ['Suppressed', L`Neutralisée`], ['Stunned', L`Sonnée`], ['Routed', L`En Déroute`]];
function gameState() { const all = LS.get('fr.games', {}) || {}; return all[army.id] || (all[army.id] = { turn: 1, active: 'me', vp: { me: 0, opp: 0 }, rx: { max: (DB.core.reactions || {}).allotment || 1, used: 0 }, u: {}, log: [] }); }
function saveGame(g, msg) { const all = LS.get('fr.games', {}) || {}; if (msg) { g.log.unshift({ t: g.turn, a: g.active, m: msg }); g.log = g.log.slice(0, 40); } all[army.id] = g; LS.set('fr.games', all); render(); }
function legionsOfArmy() { const out = new Set(); for (const d of army.dets) for (const us of Object.values(d.units)) { const u = UNITS[us.u]; if (!u) continue; for (const t of u.traits || []) if (LEGIONS().includes(t)) out.add(t); } const f = army.faction; if (LEGIONS().includes(f)) out.add(f); return [...out]; }
function renderGame(host) {
  const g = gameState(), R = DB.core.reactions || {};
  host.append(viewHead(L`Partie`, L`Suivi de partie pour « ${army.name} » : tours, Points de Victoire, Réactions et état des unités. Tout reste enregistré si vous fermez l'appli.`,
    el('button', { type: 'button', class: 'btn ghost', onclick: () => { if (!confirm(L`Recommencer une nouvelle partie ? Le suivi actuel sera effacé.`)) return; const all = LS.get('fr.games', {}) || {}; delete all[army.id]; LS.set('fr.games', all); render(); flash(L`Nouvelle partie.`); } }, L`Nouvelle partie`)));
  const num = (v, cb, label) => el('div', { class: 'gnum', role: 'group', 'aria-label': label }, el('button', { type: 'button', class: 'ib', 'aria-label': L`Moins`, onclick: () => cb(v - 1) }, '−'), el('b', { 'aria-live': 'polite' }, String(v)), el('button', { type: 'button', class: 'ib', 'aria-label': L`Plus`, onclick: () => cb(v + 1) }, '+'));
  const board = el('section', { class: 'panel gboard' },
    el('div', { class: 'gcell' }, el('span', { class: 'lab' }, L`Tour`), num(g.turn, v => { g.turn = Math.max(1, Math.min(9, v)); g.rx.used = 0; saveGame(g, L`Tour ${g.turn}`); }, L`Tour`)),
    el('div', { class: 'gcell' }, el('span', { class: 'lab' }, L`Joueur actif`), seg([['me', L`Moi`], ['opp', L`Adversaire`]], g.active, v => { g.active = v; g.rx.used = 0; saveGame(g, v === 'me' ? L`À moi de jouer` : L`À l'adversaire`); }, L`Joueur actif`)),
    el('div', { class: 'gcell vp' }, el('span', { class: 'lab' }, L`Points de Victoire — moi`), num(g.vp.me, v => { g.vp.me = Math.max(0, v); saveGame(g, L`PV moi : ${g.vp.me}`); }, L`Mes Points de Victoire`)),
    el('div', { class: 'gcell vp' }, el('span', { class: 'lab' }, L`Points de Victoire — adversaire`), num(g.vp.opp, v => { g.vp.opp = Math.max(0, v); saveGame(g, L`PV adversaire : ${g.vp.opp}`); }, L`Points de Victoire de l'adversaire`)));
  host.append(board);
  // Réactions : uniquement pendant le tour de l'adversaire
  const left = Math.max(0, g.rx.max - g.rx.used);
  const rx = el('section', { class: 'panel grx' }, el('header', { class: 'col-h' }, el('h3', {}, L`Réactions`), el('div', { class: 'gnum sm' }, el('span', { class: 'lab' }, L`Allocation`), num(g.rx.max, v => { g.rx.max = Math.max(0, Math.min(6, v)); saveGame(g); }, L`Allocation de Réactions`))));
  if (g.active === 'me') rx.append(el('p', { class: 'hint' }, L`C'est votre tour : c'est votre adversaire qui peut réagir. Vos Réactions reviennent à son tour.`));
  else rx.append(el('div', { class: 'tokens' }, Array.from({ length: g.rx.max }, (_, i) => el('button', { type: 'button', class: 'tok' + (i < g.rx.used ? ' spent' : ''), 'aria-pressed': i < g.rx.used ? 'true' : 'false', 'aria-label': i < g.rx.used ? L`Réaction dépensée — toucher pour annuler` : L`Dépenser une Réaction`, onclick: () => { g.rx.used = i < g.rx.used ? i : i + 1; saveGame(g, L`Réactions utilisées : ${g.rx.used}/${g.rx.max}`); } }, i < g.rx.used ? '✕' : '⚡'))), el('p', { class: 'hint' }, L`${left} Réaction(s) disponible(s) ce tour.`));
  rx.append(el('p', { class: 'note' }, R.note || ''));
  const legs = legionsOfArmy(), chips = [...(R.core || []).map(r => [r.name, (r.phase ? r.phase + ' — ' : '') + r.summary]), ...legs.map(Lg => R.legion && R.legion[Lg]).filter(Boolean).map(r => [r.name, r.summary]), ...memoData().adv.map(r => [r.name, r.summary])];
  rx.append(el('div', { class: 'rx-chips' }, chips.map(([n, t]) => el('details', { class: 'rx' }, el('summary', {}, n), el('p', {}, t)))));
  host.append(rx);
  // unités
  const list = el('section', { class: 'panel gunits' }, el('header', { class: 'col-h' }, el('h3', {}, L`Unités`), el('span', { class: 'pill' }, L`${Object.values(g.u).filter(x => x.dead).length} détruite(s)`)));
  const ul = el('ul', { class: 'gu' });
  for (const det of army.dets) for (const s of slotsOf(det)) { const us = det.units[s.i], u = us && UNITS[us.u]; if (!u) continue;
    const k = det.id + ':' + s.i, st = g.u[k] = g.u[k] || { dead: false, st: [] }, ph = us.photo && photoURL(us.photo.id);
    ul.append(el('li', { class: 'gu-row' + (st.dead ? ' dead' : '') },
      ph ? el('span', { class: 'gu-ph', style: photoStyle(us.photo) }) : el('span', { class: 'gu-ic', html: silSVG(silType(u, us), 'currentColor', 32) }),
      el('div', { class: 'gu-t' }, el('b', {}, unitLabel(us, u)), el('i', {}, `${String(role(u.role).short || u.role).toUpperCase()} · ${unitSize(us)} fig. · ${unitPoints(us)} pts`),
        el('div', { class: 'gst' }, STATUSES().map(([id, t]) => el('button', { type: 'button', class: 'st', 'aria-pressed': st.st.includes(id) ? 'true' : 'false', disabled: st.dead, onclick: () => { st.st = st.st.includes(id) ? st.st.filter(x => x !== id) : [...st.st, id]; saveGame(g, `${unitLabel(us, u)} : ${t}${st.st.includes(id) ? '' : L` retiré`}`); } }, t)))),
      el('button', { type: 'button', class: 'btn ghost sm' + (st.dead ? '' : ' danger'), onclick: () => { st.dead = !st.dead; if (st.dead) st.st = []; saveGame(g, unitLabel(us, u) + (st.dead ? L` détruite` : L` remise en jeu`)); } }, st.dead ? L`Remettre` : L`Détruite`))); }
  if (!ul.childElementCount) ul.append(el('li', { class: 'hint' }, L`La liste est vide.`));
  list.append(ul); host.append(list);
  if (g.log.length) host.append(el('details', { class: 'panel glog' }, el('summary', {}, L`Journal de la partie`), el('ol', {}, g.log.map(e => el('li', {}, el('small', {}, L`T${e.t} · ${e.a === 'me' ? L`moi` : L`adv.`}`), ' ', e.m)))));
}
/* ---------- Aide-mémoire : tout ce dont la liste a besoin en partie, généré depuis la liste ---------- */
let MEMO_Q = '';
function memoData() {
  const D = sheetData(), R = DB.core.reactions || {}, rite = riteDef();
  const types = new Set(), traits = new Set();
  for (const d of army.dets) for (const us of Object.values(d.units)) { const u = UNITS[us.u]; if (!u) continue; (u.types || []).forEach(t => types.add(t)); (u.traits || []).forEach(t => traits.add(t)); }
  const T = [...types].join(' '), Tr = [...traits].join(' ');
  const adv = (R.advanced || []).filter(r => r.when === 'always' || (r.when.startsWith('types:') && new RegExp(r.when.slice(6), 'i').test(T)) || (r.when.startsWith('traits:') && new RegExp(r.when.slice(7), 'i').test(Tr)));
  const legion = legionsOfArmy().map(Lg => R.legion && R.legion[Lg] && { ...R.legion[Lg], legion: Lg }).filter(Boolean);
  const weapons = new Map(); for (const d of D.dets) for (const u of d.units) for (const w of u.weapons || []) if (!weapons.has(w.name)) weapons.set(w.name, w);
  return { D, R, rite, adv, legion, weapons: [...weapons.values()].sort((a, b) => a.name.localeCompare(b.name)) };
}
function renderMemo(host) {
  const M = memoData(), q = norm(MEMO_Q.trim()), hit = (...s) => !q || norm(s.join(' ')).includes(q);
  host.append(viewHead(L`Aide-mémoire`, L`Généré depuis votre liste : Rite de Guerre, Réactions disponibles, règles spéciales et armes de vos unités.`,
    el('button', { type: 'button', class: 'btn', onclick: memoPDF }, L`PDF de l'aide-mémoire`)));
  const search = el('input', { class: 'field memo-q', type: 'search', value: MEMO_Q, placeholder: L`Filtrer : règle, arme, réaction…`, 'aria-label': L`Filtrer l'aide-mémoire` });
  let tmr; search.addEventListener('input', e => { MEMO_Q = e.target.value; clearTimeout(tmr); tmr = setTimeout(() => { const p = search.selectionStart; render(); const s = $('.memo-q'); if (s) { s.focus(); try { s.setSelectionRange(p, p); } catch (er) {} } }, 220); });
  host.append(search);
  const card = (title, kids, tag) => kids.length ? el('section', { class: 'panel memo' }, el('h3', {}, title, tag ? el('small', { class: 'tag' }, tag) : null), kids) : null;
  const item = (n, t, meta) => el('div', { class: 'mi' }, el('b', {}, n), meta ? el('small', {}, meta) : null, el('p', {}, t));
  if (M.rite && hit(M.rite.name, M.rite.tactica, M.rite.tacticaText, M.rite.posture, M.rite.postureText)) host.append(card(L`Rite de Guerre — ` + M.rite.name, [item(M.rite.tactica, M.rite.tacticaText, L`Tactica`), item(M.rite.posture, M.rite.postureText, L`Gambit`)]));
  const rx = [...(M.R.core || []).filter(r => hit(r.name, r.summary)).map(r => item(r.name, r.summary, L`Réaction de base · ${r.phase} · ${r.cost} point`)),
    ...M.legion.filter(r => hit(r.name, r.summary, r.trigger)).map(r => item(r.name, r.summary + (r.trigger ? ' — ' + r.trigger : ''), L`Réaction avancée · ${r.legion} · ${r.cost} point`)),
    ...M.adv.filter(r => hit(r.name, r.summary)).map(r => item(r.name, r.summary, L`Réaction avancée · ${r.cost} point`))];
  if (rx.length) host.append(card(L`Réactions`, [...rx, el('p', { class: 'note' }, M.R.note || '')], 'EN'));
  const st = STATUSES();
  const stq = st.filter(([id, t]) => hit(id, t, L`Statuts tactiques`));
  if (stq.length) host.append(card(L`Statuts tactiques`, [el('div', { class: 'gst' }, stq.map(([id, t]) => el('span', { class: 'st', 'aria-pressed': 'false' }, t, LANG === 'fr' ? el('small', {}, ' ' + id) : null)))]));
  const rules = M.D.gloss.filter(g => hit(g.name, g.text));
  { const c = card(L`Règles spéciales de vos unités (${rules.length})`, rules.map(g => item(g.name, g.text, g.ref))); if (c) host.append(c); }
  const ws = M.weapons.filter(w => hit(w.name, w.line));
  { const c = card(L`Armes de vos unités (${ws.length})`, ws.map(w => item(w.name, w.line, w.kind === 'melee' ? L`Mêlée` : L`Tir`))); if (c) host.append(c); }
  if (q && !host.querySelector('.memo')) host.append(el('p', { class: 'hint' }, L`Rien ne correspond à « ${MEMO_Q} ».`));
}
function memoPDF() {
  const JS = window.jspdf && window.jspdf.jsPDF; if (!JS) return flash(L`Le module PDF n'est pas chargé.`);
  const M = memoData(), doc = new JS({ unit: 'mm', format: 'a4' }), W = 210, H = 297, Mg = 12, CW = W - 2 * Mg;
  const tx = v => LANG !== 'fr' && v != null ? trData(String(v)) : v;
  const T = s => String(s == null ? '' : s).replace(/[   ]/g, ' ').replace(/[‐‑–—]/g, '-').replace(/…/g, '...').replace(/≥/g, '>=').replace(/≤/g, '<=').replace(/[•·]/g, '·').replace(/[“”«»]/g, '"').replace(/’/g, "'").replace(/[^\x00-\xff]/g, '');
  let y = 18, col = 0; const colW = (CW - 6) / 2, X = () => Mg + col * (colW + 6);
  const next = h => { if (y + h > H - 12) { if (col === 0) { col = 1; y = 30; } else { doc.addPage(); col = 0; y = 18; } } };
  doc.setFont('times', 'bold'); doc.setFontSize(16); doc.text(T(L`Aide-mémoire — ` + army.name), Mg, y); y += 5;
  doc.setFont('helvetica', 'normal'); doc.setFontSize(8); doc.setTextColor(90); doc.text(T([army.allegiance, army.faction, M.rite && M.rite.name, armyPoints() + ' pts'].filter(Boolean).map(tx).join(' · ')), Mg, y); doc.setTextColor(0); y += 7;
  const head = t => { next(10); doc.setFont('times', 'bold'); doc.setFontSize(11); doc.text(T(t.toUpperCase()), X(), y); doc.setDrawColor(150, 118, 47); doc.setLineWidth(0.4); doc.line(X(), y + 1.2, X() + colW, y + 1.2); y += 5.5; };
  const ent = (n, t, meta) => { doc.setFontSize(7.6); doc.setFont('times', 'normal'); const ls = doc.splitTextToSize(T(t), colW); next(ls.length * 3.1 + 5); doc.setFont('helvetica', 'bold'); doc.text(T(n) + (meta ? '' : ''), X(), y); if (meta) { doc.setFont('helvetica', 'normal'); doc.setTextColor(110); doc.text(T(meta), X() + colW, y, { align: 'right' }); doc.setTextColor(0); } y += 3.2; doc.setFont('times', 'normal'); ls.forEach((l, i) => doc.text(l, X(), y + i * 3.1)); y += ls.length * 3.1 + 1.8; };
  if (M.rite) { head(L`Rite de Guerre`); ent(tx(M.rite.tactica), tx(M.rite.tacticaText), 'Tactica'); ent(tx(M.rite.posture), tx(M.rite.postureText), 'Gambit'); }
  head(L`Réactions`); for (const r of M.R.core || []) ent(r.name, r.summary, r.phase); for (const r of M.legion) ent(r.name, r.summary + (r.trigger ? ' - ' + r.trigger : ''), r.legion); for (const r of M.adv) ent(r.name, r.summary, L`Réaction avancée`);
  head(L`Règles spéciales`); for (const g of M.D.gloss) ent(g.name, g.text, g.ref);
  head(L`Armes`); for (const w of M.weapons) ent(w.name, w.line, w.kind === 'melee' ? L`Mêlée` : L`Tir`);
  const name = fileBase() + L` — aide-mémoire.pdf`;
  saveFile(name, doc.output('blob')).then(ok => { if (ok && NATIVE !== 'android') flash(L`PDF créé : ${name}`); });
}
/* ---------- Vues : Liste · Schéma · Collection · Partie · Aide-mémoire ---------- */
let VIEW = LS.get('fr.view', 'build');
const VIEW_ICONS = {
  build: '<path d="M4 5h16M4 12h16M4 19h10" />',
  diagram: '<rect x="3" y="4" width="7" height="7" rx="1.5"/><rect x="14" y="4" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="18" height="6" rx="1.5"/>',
  collection: '<path d="M4 7l8-4 8 4-8 4z"/><path d="M4 12l8 4 8-4"/><path d="M4 17l8 4 8-4"/>',
  game: '<circle cx="12" cy="12" r="8"/><path d="M12 7v5l3 3"/>',
  ref: '<path d="M6 3h9l4 4v14H6z"/><path d="M9 11h7M9 15h7M9 7h4"/>'
};
const VIEWS = () => [['build', L`Liste`], ['diagram', L`Schéma`], ['collection', L`Collection`], ['game', L`Partie`], ['ref', L`Aide-mémoire`]];
function setView(v) {
  if (v === VIEW) { if (v !== 'build') scrollTo({ top: 0, behavior: 'smooth' }); return; }
  VIEW = v; LS.set('fr.view', v); sel = null; document.body.classList.remove('editing'); render(); scrollTo({ top: 0 });
}
function renderViews() {
  document.body.dataset.view = VIEW;
  const nav = $('#views'); if (nav && !nav.childElementCount) nav.append(...VIEWS().map(([id, t]) => el('button', { type: 'button', 'data-v': id, onclick: () => setView(id) },
    el('span', { class: 'vi', html: `<svg viewBox="0 0 24 24" aria-hidden="true">${VIEW_ICONS[id]}</svg>` }), el('span', { class: 'vt' }, t))));
  if (nav) for (const b of nav.children) { const on = b.dataset.v === VIEW; b.classList.toggle('on', on); b.setAttribute('aria-current', on ? 'page' : 'false'); }
  const host = $('#view'); if (!host) return;
  if (VIEW === 'build') { host.hidden = true; host.replaceChildren(); return; }
  host.hidden = false;
  const keep = host.dataset.v === VIEW ? scrollY : null; host.dataset.v = VIEW;
  const f = { diagram: renderDiagram, collection: renderCollection, game: renderGame, ref: renderMemo }[VIEW];
  host.replaceChildren(); try { f(host); } catch (e) { console.error(e); host.append(el('p', { class: 'note' }, L`Cette vue n'a pas pu s'afficher : ` + e.message)); }
  if (keep != null) requestAnimationFrame(() => scrollTo({ top: keep }));
}
/* petit contrôle segmenté réutilisable */
function seg(items, cur, cb, label) {
  return el('div', { class: 'seg', role: 'group', 'aria-label': label || null }, items.map(([v, t, sub]) => el('button', { type: 'button', 'aria-pressed': String(v) === String(cur) ? 'true' : 'false', onclick: () => cb(v) }, t, sub ? el('small', {}, sub) : null)));
}
function viewHead(title, sub, ...acts) {
  return el('header', { class: 'vhead' }, el('div', {}, el('h2', {}, title), sub ? el('p', {}, sub) : null), acts.length ? el('div', { class: 'vacts' }, acts) : null);
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
  await loadPhotos();
  render(); setTimeout(gcPhotos, 8000);
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

