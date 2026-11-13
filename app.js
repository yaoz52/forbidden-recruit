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
    else n.setAttribute(k, v === true ? '' : v);
  }
  for (const k of kids.flat()) if (k != null && k !== false) n.append(k.nodeType ? k : document.createTextNode(k));
  return n;
};
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
  for (const b of books) {
    for (const [k, v] of Object.entries(b.equipmentLists || {})) DB.lists[k] = [...(DB.lists[k] || []), ...v.map(it => ({ ...it, lang: it.lang || b.lang }))];
    Object.assign(DB.rules, b.rules || {});
    DB.weapons.push(...(b.weapons || []));
    DB.detachments.push(...(b.detachments || []).map(d => ({ ...d, book: b.id, army: d.army !== undefined ? d.army : b.army, legacy: d.legacy || b.legacy })));
    for (const u of b.units || []) UNITS[u.id] = { ...u, book: b.id, bookName: b.name, army: u.army !== undefined ? u.army : b.army, lang: u.lang || b.lang, legacy: !!(u.legacy || b.legacy) };
  }
  // ajouts aux listes (armureries Legacies, Serments, Provenances) : ajoutés en fin de liste pour garder les choix enregistrés
  const addItem = (ln, it) => (DB.lists[ln] = DB.lists[ln] || []).push(it);
  for (const b of books) for (const it of b.legacyListItems || []) addItem(it.list, { name: it.name, points: it.points, faction: it.faction, legacy: true, lang: 'en' });
  for (const o of (core.oaths || {}).list || []) for (const it of o.listItems || []) addItem(it.list, { name: it.name, points: it.points, oath: o.id, legacy: true, lang: 'en' });
  for (const p of (core.provenances || {}).list || []) for (const it of p.listItems || []) addItem(it.list, { name: it.name, points: it.points, prov: p.id, legacy: true, lang: 'en' });
  for (const b of books) {
    for (const o of b.legacyUnitOptions || []) { const u = UNITS[o.unit]; if (u) u.options = [...(u.options || []), { ...o.option, legacy: true, lang: 'en' }]; }
    for (const p of b.legacyProseOptions || []) for (const u of Object.values(UNITS))
      if ((u.traits || []).includes(p.faction) && (u.wargear || []).some(w => w === p.ifWargear || w.split(' : ').pop() === p.ifWargear)) u.options = [...(u.options || []), { ...p.option, legacy: true, lang: 'en' }];
  }
  for (const u of Object.values(UNITS)) for (const [k, v] of Object.entries(core.countsAs || {})) if (u.name.includes(k)) u.countsAs = v;
  for (const p of (core.provenances || {}).list || []) for (const o of p.options || []) for (const u of Object.values(UNITS)) if (u.army === 'mil' && matchU(u, o.match)) u.options = [...(u.options || []), { ...o.opt, prov: p.id, lang: 'en' }];
  const dsp = (core.oaths || {}).desperation;
  if (dsp) for (const u of Object.values(UNITS)) if (u.army === 'la' && (u.wargear || []).some(w => /^(Bolter|Pistolet bolter|Bolt pistol)$/i.test(w.split(' : ').pop()))) u.options = [...(u.options || []), { text: dsp.text, max: 'models', choices: dsp.choices, oath: 'desperation', legacy: true, lang: 'en' }];
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
const role = c => DB.core.roles[c] || { name: c, short: c };
const detDef = t => DB.detachments.find(d => d.id === t);
const armyOf = f => { const a = (DB.core.armies || []).find(a => a.factions.includes(f)); return a ? a.id : null; };
const armyName = id => { const a = (DB.core.armies || []).find(a => a.id === id); return a ? a.name : id; };
const modeDef = () => (DB.core.modes || []).find(m => m.id === (army.mode || 'croisade')) || { id: 'croisade', name: 'Bataille' };
const advDef = a => DB.core.primeAdvantages.find(x => x.id === a);
const ALLEG = { 'Loyaliste': ['Loyaliste', 'Loyalist'], 'Renégat': ['Renégat', 'Traitor'] };
const LEGIONS = () => ((DB.core.armies || []).find(a => a.id === 'la') || { factions: [] }).factions.slice(0, 18);
const legacyOn = () => !!(army && army.legacies);
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
const capacity = u => { const p = (u.profiles || []).find(x => x.vehicle); const v = p && p.stats[6]; return v && /^\d+$/.test(v) ? +v : 0; };
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
  (u.options || []).forEach((o, oi) => { const ch = optChoices(o); for (const k of Object.keys((us.opts || {})[oi] || {})) if (ch[k] && ch[k].effect) fx.push({ ...ch[k].effect, src: ch[k].name }); });
  if (!fx.length) return u;
  const x = { ...u, profiles: u.profiles.map(p => ({ ...p, stats: [...p.stats] })), rules: [...(u.rules || [])], types: [...(u.types || [])], traits: [...(u.traits || [])], effects: fx.map(f => f.src) };
  const num = (v, d) => { const m = String(v).match(/^(\d+)(\+?)$/); return m ? (Math.max(0, +m[1] + d)) + m[2] : v; };
  const lastR = r => r.split(' : ').pop();
  for (const f of fx) {
    for (const p of x.profiles) if (!p.vehicle && p.stats.length === 14) {
      for (const [k, d] of Object.entries(f.stats || {})) p.stats[SK[k]] = num(p.stats[SK[k]], d);
      for (const [k, v] of Object.entries(f.setStats || {})) p.stats[SK[k]] = v;
      for (const [k, v] of Object.entries(f.maxStats || {})) { const n = parseInt(p.stats[SK[k]]); if (n > v) p.stats[SK[k]] = String(v); }
      if (f.svStep) { const n = parseInt(p.stats[12]); if (n > 3) p.stats[12] = (n - f.svStep) + '+'; }
      if (f.helix && !/Sergent|Sergeant|Champion|Spécialiste|Specialist|État-major|Command/.test((x.types.find(t => t.startsWith(p.name)) || x.types[0] || ''))) { for (const k of ['LD', 'WP', 'IN', 'CL']) p.stats[SK[k]] = num(p.stats[SK[k]], -1); if (det && det.helix === 'Aberrant') { p.stats[SK.S] = num(p.stats[SK.S], 1); p.stats[SK.A] = num(p.stats[SK.A], 1); } }
    }
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
  return { id: uid(), name: 'Nouvelle liste', mode: 'croisade', allegiance: 'Loyaliste', faction: DB.core.factions[0], limit: 3000, legacies: false,
    dets: [{ id: uid(), type: 'principal', parent: null, units: {}, adv: {}, bonusRole: null }], updated: Date.now() };
}
function slotsOf(det) {
  const def = detDef(det.type);
  let s = def.slots.map((x, i) => ({ ...x, i }));
  const oaths = detOaths(det);
  for (const o of oaths) if (o.swap && !kidOfOath(det)) s = s.map(x => o.swap[x.role] ? { ...x, role: o.swap[x.role], oath: o.id } : x);
  if (oaths.some(o => o.allPrime) && !kidOfOath(det)) s = s.map(x => ({ ...x, prime: true }));
  if (def.kind === 'principal' && paradigm() && paradigm().anyRank) s = s.map(x => ({ ...x, prime: true }));
  if (det.bonusRole) s.push({ role: det.bonusRole, bonus: true, i: def.slots.length });
  for (const [src, v] of Object.entries(det.adv || {})) { const a = advDef(v); if (!a || !a.addSlot || !det.units[src]) continue;
    const ch = (det.advSlot || {})[src] || {}, r = a.addSlot.role || ch.role;
    if (r) s.push({ role: r, bonus: true, added: +src, army: a.addSlot.army, legion: a.addSlot.legionPick ? ch.legion : null, unitName: a.addSlot.unitName, i: 100 + +src }); }
  for (const [src, us] of Object.entries(det.units)) { const u = us && UNITS[us.u]; if (u && u.addSlot && +src < 100) s.push({ role: u.addSlot.role, bonus: true, added: +src, army: u.addSlot.army, onlyIds: u.addSlot.only, i: 200 + +src }); }
  if (def.dynSlots) { const n = dynCount(det, def), add = [].concat(def.dynSlots.add); for (let k = 0; k < n; k++) s.push({ role: add[0], roles: add, dyn: true, i: 300 + k }); }
  if (det === mainDet() && det.wsReco && sireActive() && sireRule().name === 'Sire des White Scars') s = s.map(x => x.role === 'TP' && x.i < 100 ? { ...x, role: 'RE', onlyIds: ['land-raider-explorator'], ws: true } : x);
  if (det === army.dets[0] && sireActive()) s.forEach(x => { if (x.role === 'TR' && !x.prime && x.i < 100) { x.prime = true; x.sire = true; } });
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
  const pickOk = i => { if (!r.needPick) return true; const us = m.units[i], u = UNITS[us.u]; return (u.options || []).some((o, oi) => { const ch = optChoices(o); return Object.keys((us.opts || {})[oi] || {}).some(k => ch[k] && new RegExp(r.needPick).test(ch[k].name + ' ' + (ch[k].from || '') + ' ' + o.text)); }); };
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
function unitSize(us) { const u = UNITS[us.u]; return u.models.reduce((a, m) => a + m.count, 0) + (us.extra || 0); }
function optChoices(o) {
  const c = [...(o.choices || [])];
  for (const ln of [].concat(o.list || [])) for (const it of DB.lists[ln] || []) c.push({ ...it, from: ln });
  return c;
}
/* Un choix de liste est-il proposé à cette unité ? (armureries de Légion, Serments, Provenances, Legacies) */
function itemState(it, u, det) {
  if (it.faction) { const f = unitFaction(u) || (det ? detFaction(det) : army.faction); if (f !== it.faction && !(det && (detOaths(det).find(o => o.id === 'panoply') && det.panoplyLegion === it.faction))) return { show: false, why: `réservé aux figurines ${it.faction}` }; }
  if (it.oath && !detOaths(det).some(o => o.id === it.oath)) return { show: false, why: `réservé au Serment ${(oathDef(it.oath) || {}).name}` };
  if (it.prov && !(army.provenances || []).includes(it.prov)) return { show: false, why: `réservé à la Provenance ${(provDef(it.prov) || {}).name}` };
  if (it.legacy && !legacyOn()) return { show: false, why: 'option Legacies (cochez « Inclure les unités Legacies »)' };
  return { show: true };
}
function optMax(o, us) {
  const size = unitSize(us), u = UNITS[us.u];
  if (o.max === 'models') return size;
  if (o.max === 'others') return size - 1;
  if (typeof o.max === 'object' && o.max) {
    if (o.max.per) return Math.floor(size / o.max.per) * (o.max.n || 1);
    if (o.max.model) { const m = u.models.find(m => m.name === o.max.model); return (m ? m.count : 0) + (u.extra && u.extra.model === o.max.model ? (us.extra || 0) : 0); }
  }
  return o.max || 1;
}
function optCount(us, oi) { return Object.values((us.opts || {})[oi] || {}).reduce((a, b) => a + b, 0); }
function unitPoints(us) {
  const u = UNITS[us.u]; if (!u) return 0;
  let p = u.points + (us.extra || 0) * (u.extra ? u.extra.points : 0);
  if (us.variant != null && u.variants) p += u.variants[us.variant].points;
  (u.options || []).forEach((o, oi) => {
    const ch = optChoices(o), picked = (us.opts || {})[oi] || {};
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
    return { ok: false, why: `Rôle Tactique ${role(u.role).name} : cette case est une case ${roles.map(r => role(r).name).join(' ou ')}. Une unité ne peut occuper qu'une case de son Rôle Tactique (Livre de Règles p. 282).` };
  if (u.legacy && !legacyOn()) return { ok: false, why: 'Unité Legacies : cochez « Inclure les unités Legacies » à l\'étape 1.' };
  if (def.kind === 'fort' || u.role === 'FO') return def.kind === 'fort' && u.role === 'FO' ? { ok: true } : { ok: false, why: 'Les Fortifications ne vont que dans un Battlefield Fortifications Detachment.' };
  if (slot.onlyIds && !slot.onlyIds.includes(u.id)) return { ok: false, why: `Case réservée à : ${slot.onlyIds.map(i => UNITS[i] ? UNITS[i].name : i).join(', ')}.` };
  if (slot.unitName && !new RegExp(slot.unitName).test(u.name)) return { ok: false, why: 'Case réservée aux unités de la section Machina Malefica du Liber Mechanicum.' };
  const only = def.only && def.only[slot.role];
  if (only && !slot.added && !slot.dyn && !only.includes(u.name))
    return { ok: false, why: `Dans un détachement ${def.name}, les cases ${role(slot.role).name} sont réservées à : ${only.join(', ')}${slot.bonus ? ' (y compris la case du Bénéfice Logistique, FAQ)' : ''}.` };
  const exc = def.except && def.except[slot.role];
  if (exc && !slot.bonus && exc.includes(u.name)) return { ok: false, why: `Dans un détachement ${def.name}, les cases ${role(slot.role).name} ne peuvent pas recevoir : ${exc.join(', ')}.` };
  for (const o of detOaths(det)) {
    if (o.noRoles && !kidOfOath(det) && o.noRoles.includes(u.role) && !slot.oath) return { ok: false, why: `Serment « ${o.name} » : no ${o.noRoles.map(r => role(r).name).join(' / ')} Choices in this Detachment.` };
    if (o.emOnly && slot.role === 'EM' && !o.emOnly.includes(u.id)) return { ok: false, why: `Serment « ${o.name} » : Command Slots may only be filled with Centurions or Centurions in Terminator Armour.` };
    if (o.onlyRole && !kidOfOath(det) && u.role !== o.onlyRole) return { ok: false, why: `Serment « ${o.name} » : only Command Choices.` };
    if (o.kidsNoRole && kidOfOath(det) && o.kidsNoRole.includes(u.role)) return { ok: false, why: `Serment « ${o.name} » : no Troops Choices in attached Auxiliary or Apex Detachments.` };
  }
  for (const a of ['Loyaliste', 'Renégat']) if (ALLEG[a].some(t => (u.traits || []).includes(t)) && army.allegiance !== a)
    return { ok: false, why: `Unité d'Allégeance ${a} uniquement ; votre armée est ${army.allegiance}.` };
  const df = detFaction(det);
  const wantArmy = slot.army || def.foreign || armyOf(df);
  const prov = (army.provenances || []).map(provDef).filter(Boolean).flatMap(p => p.foreignUnits || []).find(f => f.ids.includes(u.id) && f.role === slot.role);
  if (u.army === 'cult' && slot.army !== 'cult') return { ok: false, why: 'Cults Abominatio : seulement par l\'Avantage Principal Cult Operative (case Appui ajoutée).' };
  if (u.army && wantArmy && wantArmy !== u.army && !(prov && armyOf(df) === 'mil')) return { ok: false, why: `Ce détachement puise dans la liste ${armyName(wantArmy)} ; unité de la liste ${armyName(u.army)}.` };
  const f = unitFaction(u);
  if (slot.legion) {
    if (f !== slot.legion) return { ok: false, why: `Case Exemplars of the Legion : unité ${slot.legion} uniquement.` };
    if (hasType(u, /Unique/)) return { ok: false, why: 'Exemplars of the Legion : no Models with the Unique Sub-Type.' };
  } else if (f && !def.foreign && !slot.army && !prov && f !== df && !shatteredOk(u, f))
    return { ok: false, why: `Unité propre à la Faction ${f} ; ce détachement est ${df || 'sans faction'}${df === 'Shattered Legions' ? ' (Commanders of the Shattered Legions : seulement si leur Légion est choisie à l\'étape 2)' : ''}.` };
  if (def.unitRule && hasType(u, new RegExp(def.unitRule.match)) && !hasRule(u, new RegExp(def.unitRule.need))) return { ok: false, why: def.unitRule.why };
  if (md.armyRule && md.armyRule.level !== 'warn' && !hasType(u, new RegExp(md.armyRule.match)) && !(md.armyRule.need && hasRule(u, new RegExp(md.armyRule.need)))) return { ok: false, why: `${md.name} : ${md.armyRule.why}` };
  if (md.noMove0 && (u.profiles || []).some(p => ['0', '-'].includes(String(p.stats[0])))) return { ok: false, why: `${md.name} : Units that include any Models with a Move Characteristic of ‘0’ or ‘-’ may not be selected.` };
  if (def.kind === 'sdb' && md.sdbTransportOnly && !hasType(u, /Transport/)) return { ok: false, why: `${md.name} : Lord of War may only be used to select Models with the Transport Sub-Type.` };
  if (hasType(u, /Unique/) && army.dets.some(d => Object.entries(d.units).some(([i, x]) => x.u === u.id && !(d === det && +i === slot.i)))) return { ok: false, why: 'Unité Unique : un seul exemplaire par armée.' };
  if (u.limit) {
    const n = army.dets.reduce((a, d) => a + Object.entries(d.units).filter(([i, x]) => x.u === u.id && !(d === det && +i === slot.i)).length, 0);
    if (n >= u.limit) return { ok: false, why: `Limité à ${u.limit} exemplaire(s) par armée (mention « 0-${u.limit} » du profil).` };
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
    if (d.adv[s.i] === 'affectation') continue;
    const u = UNITS[us.u]; if (!u) continue;
    if (s.role === 'QG' && detDef(parentDet.type).kind === 'principal') g.flex += 1;
    if (s.role === 'EM' || d.adv[s.i] === 'petty') { const x = ruleX(u, 'Officier de Ligne') || ruleX(u, 'Officer of the Line') || 1; g.aux += x; g.by[u.name] = (g.by[u.name] || 0) + x; if (u.countsAs) g.by[u.countsAs] = (g.by[u.countsAs] || 0) + x; }
  }
  return g;
}
const vowDef = id => (DB.core.vows || []).find(v => v.id === id);
const vowsTaken = self => { const t = new Set(); army.dets.forEach(d => Object.values(d.units).forEach(x => { if (x && x !== self && x.vow) t.add(x.vow); })); return t; };
const countAdv = id => army.dets.reduce((a, d) => a + Object.entries(d.adv).filter(([i, v]) => v === id && d.units[i]).length, 0);
const doctrineDef = () => (DB.core.doctrines || []).find(d => d.id === army.doctrine && d.army === armyOf(army.faction));
const ritesFor = () => (DB.core.rites || []).filter(r => r.faction === army.faction);
const riteDef = () => { const rs = ritesFor(); return rs.find(r => r.id === army.rite) || rs.find(r => !r.allegiance || r.allegiance === army.allegiance) || null; };
const riteLabel = () => { const r = riteDef(); return r ? 'Rite : ' + r.name : ''; };
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
  if (def.legacy && !legacyOn()) return { ok: false, why: 'Détachement Legacies : cochez « Inclure les unités Legacies » à l\'étape 1.' };
  if (def.kind === 'fort') return army.dets.some(d => d.type === def.id) ? { ok: false, why: 'Un seul Battlefield Fortifications Detachment par armée.' } : { ok: true };
  if (md.onlyDets && !md.onlyDets.includes(def.id)) return { ok: false, why: `${md.name} : only the following additional Detachments may be selected — ${md.onlyDets.map(i => (detDef(i) || {}).name || i).join(', ')}.` };
  if (md.maxDets && md.maxDets[def.id] && army.dets.filter(d => d.type === def.id).length >= md.maxDets[def.id]) return { ok: false, why: `${md.name} : ${def.name} (maximum of ${md.maxDets[def.id]}).` };
  if ((armyDef().forbid || []).includes(def.kind)) return { ok: false, why: `Indisponible pour une armée ${armyDef().name} (Détachement Principal ${detName(mainDet())}).` };
  if (def.kind === 'addl') { const have = countAdv(def.unlockedBy) + (paradigm() && paradigm().freeDet === def.id ? 1 : 0), used = army.dets.filter(d => d.type === def.id).length; return used < have ? { ok: true, parents: [mainDet()] } : { ok: false, why: `Ouvert par l'Avantage Principal « ${advDef(def.unlockedBy).name} » sur une Case Principale (${have} choisi(s), ${used} détachement(s) déjà pris).` }; }
  if (def.kind === 'principal') return { ok: false, why: 'Une armée comprend un seul Détachement Principal (Livre de Règles p. 280).' };
  if (def.allegiance && def.allegiance !== army.allegiance) return { ok: false, why: `Réservé aux armées d'Allégeance ${def.allegiance}.` };
  if (def.faction && def.faction !== army.faction) return { ok: false, why: `Réservé aux armées dont le Détachement Principal est de Faction ${def.faction}.` };
  if (def.needsUnit && !hasUnitNamed(def.needsUnit)) return { ok: false, why: `Nécessite dans l'armée une unité : ${def.needsUnit.join(' ou ')}.` };
  if (def.doctrine && army.doctrine !== def.doctrine) { const dd = (DB.core.doctrines || []).find(d => d.id === def.doctrine); return { ok: false, why: `Nécessite la doctrine ${dd ? dd.name : def.doctrine} (étape 2).` }; }
  if (def.kind === 'sdg') {
    if (army.dets.some(d => d.type === def.id)) return { ok: false, why: 'Un seul Détachement de Seigneur de Guerre par armée (p. 281).' };
    if (lim < 3000) return { ok: false, why: `Disponible à partir d'une Limite de Points de 3000 ; la vôtre est de ${lim} (p. 281).` };
    return { ok: true };
  }
  if (def.kind === 'sdb') return army.dets.some(d => d.type === def.id) ? { ok: false, why: 'Un seul Détachement de Seigneur des Batailles par armée (p. 281).' } : { ok: true };
  if (def.kind === 'allie') return { ok: true };
  const g = grants(main), apex = childrenOf(main, 'apex').length, aux = auxUse(childrenOf(main, 'aux'));
  if (def.kind === 'apex' && def.army && armyOf(army.faction) !== def.army) return { ok: false, why: `Réservé à la liste ${armyName(def.army)}.` };
  if (def.kind === 'apex') {
    const free = g.flex - apex - Math.max(0, aux - g.aux);
    return free > 0 ? { ok: true, parents: [main] } : { ok: false, why: g.flex === 0
      ? 'Un Détachement d\'Apex nécessite une case Quartier Général occupée dans le Détachement Principal (p. 280).'
      : `Vos ${g.flex} case(s) Quartier Général occupée(s) sont déjà utilisées pour d'autres détachements (p. 280).` };
  }
  // auxiliaires : liés au principal ou à un allié
  const parents = [];
  const why = [];
  for (const p of [main, ...army.dets.filter(d => detDef(d.type).kind === 'allie')]) {
    if (def.army && armyOf(detFaction(p)) !== def.army) { why.push(`${detName(p)} : détachement de la liste ${armyName(def.army)}`); continue; }
    const gp = grants(p), used = auxUse(childrenOf(p, 'aux')), after = auxUse([...childrenOf(p, 'aux'), { type: def.id }]);
    const cap = gp.aux + (p === main ? Math.max(0, gp.flex - apex) : 0);
    if (after > cap) { why.push(`${detName(p)} : ${used}/${cap} détachement(s) auxiliaire(s) déjà utilisé(s)`); continue; }
    if (def.requires) {
      const have = gp.by[def.requires] || 0, n2 = childrenOf(p, 'aux').filter(d => d.type === def.id).length + 1, need2 = isBonus(def.id) ? Math.ceil(n2 / 2) : n2;
      if (need2 > have) { why.push(`${detName(p)} : nécessite une unité « ${def.requires} » dans une case État-major${have ? ' (déjà utilisée)' : ''}`); continue; }
    }
    parents.push(p);
  }
  if (parents.length) return { ok: true, parents };
  return { ok: false, why: (why.join(' ; ') || 'Aucun droit disponible') + '. Chaque case État-major occupée ouvre 1 Détachement Auxiliaire (davantage avec Officier de Ligne), chaque case Quartier Général 1 Auxiliaire ou 1 Apex (p. 280).' };
}

/* Avantages Principaux disponibles pour une case -> [{def, ok, why}] */
function advOptions(det, slot) {
  const us = det.units[slot.i], u = us && UNITS[us.u];
  const ddef = detDef(det.type), da = ddef.foreign || armyOf(detFaction(det)), oaths = detOaths(det), onlyAdv = (oaths.find(o => o.onlyAdv) || {}).onlyAdv;
  return DB.core.primeAdvantages.filter(a => (a.army ? a.army === da : !ddef.rankOnly) && (!a.onlyDetTypes || a.onlyDetTypes.includes(det.type)) && (!a.detFaction || a.detFaction === detFaction(det))
    && (!a.oath || oaths.some(o => o.id === a.oath)) && (!a.legacy || legacyOn()) && (!onlyAdv || a.id === onlyAdv)).map(a => {
    let ok = true, why = '';
    const usedElsewhere = Object.entries(det.adv).some(([i, v]) => v === a.id && +i !== slot.i);
    const unlimited = paradigm() && paradigm().unlimitedAdv === a.id;
    if (u && (u.noPrime || hasRule(u, /^Inductii$/))) { ok = false; why = 'Inductii : no Prime Advantage may be selected for this Unit.'; }
    else if (a.maxPerArmy && !unlimited && army.dets.some(d => Object.entries(d.adv).some(([i, v]) => v === a.id && !(d === det && +i === slot.i)))) { ok = false; why = `Limité à ${a.maxPerArmy} par armée.`; }
    else if (a.oncePerDet && usedElsewhere) { ok = false; why = 'Déjà choisi dans ce détachement (une fois par détachement).'; }
    else if ((a.addsSlots || a.addSlot) && ddef.noSlotAdv && slot.role !== ddef.slotAdvRole) { ok = false; why = `${ddef.name} : ${'Prime Advantages which add additional Battlefield Role Slots to a Detachment may not be selected'}${ddef.slotAdvRole ? ', unless that Battlefield Role is War-engine' : ''}.`; }
    else if (a.slotRole && slot.role !== a.slotRole) { ok = false; why = `Réservé aux cases ${role(a.slotRole).name}.`; }
    else if (a.primaryOnly && det !== mainDet()) { ok = false; why = 'Seulement dans le Détachement Principal.'; }
    else if (a.allegiance && army.allegiance !== a.allegiance) { ok = false; why = `Réservé aux armées ${a.allegiance}s.`; }
    else if (a.notWith && Object.values(det.adv).includes(a.notWith)) { ok = false; why = `Incompatible avec ${advDef(a.notWith).name} dans le même détachement.`; }
    else if (u && a.needsSubtype && !hasType(u, new RegExp(a.needsSubtype))) { ok = false; why = `L'unité doit inclure une figurine de Sous-type ${a.needsSubtype.split('|')[0]}.`; }
    else if (u && a.needsType && !hasType(u, new RegExp(a.needsType))) { ok = false; why = `L'unité doit inclure une figurine de Type ${a.needsType.split('|')[0]}.`; }
    else if (u && a.notType && hasType(u, new RegExp(a.notType))) { ok = false; why = `Impossible pour une unité de Type ou Sous-type ${a.notType.split('|')[0]}.`; }
    else if (u && a.needsTrait && !(hasTrait(u, new RegExp(a.needsTrait)) || detFaction(det) === a.needsTrait)) { ok = false; why = `Unité ${a.needsTrait} uniquement.`; }
    else if (u && a.id === 'exemplars' && (u.traits || []).some(t => LEGIONS().includes(t))) { ok = false; why = 'Exemplars of the Legion : the Command Unit must only include Models with the Shattered Legions Trait.'; }
    else if (u && hasType(u, /Unique/) && !a.uniqueOk) { ok = false; why = 'Unité Unique : seuls Affectation Spéciale et Bénéfice Logistique sont possibles (FAQ, Livre de Règles p. 283).'; }
    return { def: a, ok, why };
  });
}


const skitFree = d => { const r = DB.core.skitariiAlliesFree; return !!(r && armyOf(army.faction) === r.primary && armyOf(detFaction(d)) === r.allied); };
function validateMore(out, err) {
  const warn = (msg, det, slot) => out.push({ level: 'warn', msg, det: det && det.id, slot });
  const info = msg => out.push({ level: 'info', msg });
  const md = mainDef(), main = mainDet();
  const all = army.dets.flatMap(d => slotsOf(d).filter(s => d.units[s.i]).map(s => ({ d, s, us: d.units[s.i], u: UNITS[d.units[s.i].u] })).filter(x => x.u));
  for (const x of all) if (x.u.unverified) warn(`${x.u.name} : profil issu de données communautaires non vérifiées (BSData). Vérifiez-le dans le Journal Tactica: Zone Mortalis.`, x.d, x.s.i);
  // Legacies
  const ad = armyDef();
  if (!legacyOn() && (ad.legacy || factionInfo(army.faction).legacy)) err(`${army.faction} : liste Legacies, cochez « Inclure les unités Legacies » (étape 1).`);
  for (const d of army.dets) { const f = detFaction(d), a = (DB.core.armies || []).find(x => x.factions.includes(f)); if (!legacyOn() && d !== main && f && ((a && a.legacy) || factionInfo(f).legacy)) err(`${detName(d)} : Faction ${f} issue des Legacies, cochez « Inclure les unités Legacies » (étape 1).`, d); }
  if (ad.incomplete) info(ad.incomplete);
  if (ad.allegiance && army.allegiance !== ad.allegiance) err(`Une armée ${ad.name} est forcément ${ad.allegiance}.`);
  const fi = factionInfo(army.faction); if (fi.allegiance && fi.allegiance !== army.allegiance) err(`${army.faction} : réservé aux armées d'Allégeance ${fi.allegiance}.`);
  // Détachement Principal alternatif
  if (md.needsTrait && !all.some(x => hasTrait(x.u, new RegExp(md.needsTrait)))) err(`${md.name} : an Army using this Primary Detachment must include at least one Model with the Master of the Legion Trait.`, main);
  if (md.armyRule && md.armyRule.level === 'warn') for (const x of all) if (!hasType(x.u, new RegExp(md.armyRule.match)) && !isVeh(x.u)) warn(`${x.u.name} — ${md.name} : ${md.armyRule.why}`, x.d, x.s.i);
  if (md.decurionCommand) for (const x of all.filter(x => x.d === main && ['QG', 'EM'].includes(x.s.role) && x.u.role !== x.s.role)) {
    const up = x.us.upgrade != null && x.u.upgrades ? x.u.upgrades[x.us.upgrade].name : '';
    if (x.s.role === 'QG' ? !/Magna/.test(up) : !/D[ée]curion/.test(up)) err(`${x.u.name} : ${x.s.role === 'QG' ? 'Decurion Magna upgrade required to fill a High Command Slot' : 'a Decurion upgrade is required to fill a Command Slot'} (${md.name}).`, x.d, x.s.i);
  }
  if (md.preArranged) info(`${md.name} : recommended only in pre-arranged games (Orbital Drop Protocols).`);
  for (const d of army.dets) { const def = detDef(d.type); if (def.dynSlots) { const n = dynCount(d, def); for (const i of Object.keys(d.units).map(Number).filter(i => i >= 300 + n && i < 400)) err(`${def.name} : case ajoutée en trop (${def.dynSlots.why})`, d, i); } }
  // Shattered Legions
  if (army.faction === 'Shattered Legions') { const n = (army.shattered || []).length, S = DB.core.shattered;
    if (n < S.min || n > S.max) err(`Shattered Legions : choose two or three Legions at step 2 (${n} selected).`); }
  // Blackshields : Serments
  const O = DB.core.oaths || {};
  for (const d of army.dets) { const k = detDef(d.type).kind, ids = d.oaths || [];
    if (!ids.length) continue;
    if (detFaction(d) !== 'Blackshields' || !(O.perDet || {})[k]) { err(`${detName(d)} : Oaths of Moment are only for Blackshields Primary or Allied Detachments.`, d); continue; }
    if (ids.length > O.perDet[k]) err(`${detName(d)} : ${ids.length} Oaths of Moment for ${O.perDet[k]} allowed (${k === 'principal' ? 'Primary' : 'Allied'} Detachment).`, d);
    for (const id of ids) { const o = oathDef(id); for (const x of o.excl || []) if (ids.includes(x)) err(`${detName(d)} : ${o.name} may not be selected with ${oathDef(x).name}.`, d); }
    if (ids.includes('panoply') && !d.panoplyLegion) warn(`${detName(d)} : Panoply of Old, choose a Legion Armoury.`, d);
  }
  // Provenances
  if (armyOf(army.faction) === 'mil' || army.dets.some(d => armyOf(detFaction(d)) === 'mil')) { const P = DB.core.provenances, ps = army.provenances || [];
    const cap = P.base + (all.some(x => hasTrait(x.u, new RegExp(P.bonusTrait))) ? 1 : 0);
    if (ps.length > cap) err(`Provenances of War : ${ps.length} selected for ${cap} allowed (${P.note})`);
    for (const p of ps.map(provDef).filter(Boolean)) if (p.allegiance && p.allegiance !== army.allegiance) err(`Provenance ${p.name} : Traitor Allegiance only.`);
  }
  // Mechanicum : une seule variante de Faction par Auxiliaire / Apex ; pas de variante commune entre Allié et Principal (FAQ)
  const arc = d => new Set(Object.values(d.units).map(us => UNITS[us.u] && unitArcana(UNITS[us.u], us)).filter(Boolean));
  for (const d of army.dets) { const k = detDef(d.type).kind; if (['aux', 'apex'].includes(k) && armyOf(detFaction(d)) === 'mech' && arc(d).size > 1) err(`${detName(d)} : une seule variante de Faction Mechanicum par Détachement Auxiliaire ou d'Apex (${[...arc(d)].join(', ')}).`, d); }
  if (armyOf(army.faction) === 'mech') { const pa = arc(main); for (const d of army.dets.filter(d => detDef(d.type).kind === 'allie' && armyOf(detFaction(d)) === 'mech')) { const both = [...arc(d)].filter(x => pa.has(x)); if (both.length) err(`${detName(d)} : an Allied Detachment may not include Units with the same Mechanicum Faction Trait as the Primary Detachment (${both.join(', ')}) (FAQ).`, d); } }
  for (const x of all) if ((x.u.traits || []).includes('[Mechanicum]') && !x.us.arcana) out.push({ level: 'warn', msg: `${x.u.name} : choisissez sa variante de Faction Mechanicum (Techno-arcane).`, det: x.d.id, slot: x.s.i });
  // Transport
  const load = {};
  for (const x of all) if (x.us.embark) {
    const [did, si] = x.us.embark.split(':'), td = army.dets.find(d => d.id === did), tus = td && td.units[si], tu = tus && UNITS[tus.u];
    if (!tu) { err(`${x.u.name} : son transport n'est plus dans la liste.`, x.d, x.s.i); continue; }
    if (isVeh(x.u)) err(`${x.u.name} : un Véhicule ne peut pas embarquer.`, x.d, x.s.i);
    else if (!hasType(x.u, /Infanterie|Infantry/) && !hasRule(tu, /Baie de Transport|Transport Bay/)) err(`${x.u.name} : seule l'Infanterie peut embarquer à bord de ${tu.name}.`, x.d, x.s.i);
    const w = x.u.models.reduce((a, m) => a + m.count * bulk(x.u, m.name), 0) + (x.us.extra || 0) * bulk(x.u, (x.u.extra || {}).model);
    const key = x.us.embark; load[key] = load[key] || { tu, tus, td, si, n: 0, who: [] }; load[key].n += w; load[key].who.push(x.u.name);
  }
  for (const L of Object.values(load)) { const cap = capacity(L.tu); if (cap && L.n > cap) err(`${L.tu.name} : ${L.n} places occupées pour une Capacité de Transport de ${cap} (${L.who.join(', ')} ; Massif (X) compte X places).`, L.td, +L.si); }
  // Options qui remplacent la même pièce d'équipement
  for (const x of all) { const groups = {};
    (x.u.options || []).forEach((o, oi) => { const m = o.text.match(/(?:[Rr]emplacer|échanger) (?:le |la |l'|les |son |sa |ses )?([^:,(]+?)$|exchange (?:its |their )?([^:,(]+?)$|have (?:its|their) ([^,]+?) (?:exchanged|replaced)/); if (!m) return;
      const w = (m[1] || m[2] || m[3]).trim().toLowerCase(); if (/ et | ou | and | or |\/|chaque|each/.test(w)) return; (groups[w] = groups[w] || []).push(oi); });
    for (const [w, ois] of Object.entries(groups)) if (ois.length > 1) { const n = ois.reduce((a, oi) => a + optCount(x.us, oi), 0), size = unitSize(x.us);
      if (n > size) err(`${x.u.name} : ${n} remplacements du même équipement (« ${w} ») pour ${size} figurine${size > 1 ? 's' : ''} : ces options s'excluent.`, x.d, x.s.i); }
  }
  // Sires : conditions d'équipement non vérifiables automatiquement
  const sr = sireRule(); if (sr && sireActive() && sr.note) warn(`${sr.name} : vérifiez que ${sr.note}.`, main);
  // Paradigme de Maisonnée
  const pg = paradigm(); if (pg) info(`Paradigme de Maisonnée ${pg.name} : ${pg.summary}`);
}

/* Validation complète -> [{level:'err'|'warn', msg, det?, slot?}] */
function validate() {
  const out = [], lim = army.limit, total = armyPoints();
  const err = (msg, det, slot) => out.push({ level: 'err', msg, det: det && det.id, slot });
  if (total > lim) err(`Total de ${total} pts : dépasse la Limite de Points de ${lim} de ${total - lim} pts (Livre de Règles p. 279).`);
  validateMore(out, err);
  const main = mainDet();
  let allied = 0, lords = 0;
  for (const det of army.dets) {
    const def = detDef(det.type), slots = slotsOf(det);
    if (!Object.keys(det.units).length) err(`${def.name} : chaque détachement doit inclure au moins une unité (p. 279).`, det);
    if (def.kind === 'allie') {
      if (!skitFree(det)) allied += detPoints(det);
      if (!det.faction) err(`${def.name} : choisissez sa Faction.`, det);
      else if (det.faction === army.faction) err(`${def.name} : doit être d'une Faction différente de celle du Détachement Principal (${army.faction}) (p. 281).`, det);
    }
    if (det.parent) { const p = army.dets.find(d => d.id === det.parent); if (p && detDef(p.type).kind === 'allie' && !skitFree(p)) allied += detPoints(det); }
    if (def.faction && def.faction !== army.faction) err(`${def.name} : réservé aux armées dont le Détachement Principal est ${def.faction}.`, det);
    if (def.doctrine && army.doctrine !== def.doctrine) err(`${def.name} : nécessite la doctrine correspondante (étape 2).`, det);
    if (def.needsUnit && !hasUnitNamed(def.needsUnit)) err(`${def.name} : nécessite dans l'armée une unité ${def.needsUnit.join(' ou ')}.`, det);
    if (def.kind === 'sdb' && !det.faction) err(`${def.name} : choisissez sa Faction.`, det);
    if (def.kind === 'sdg') {
      if (lim < 3000) err(`${def.name} : interdit sous 3000 points (p. 281).`, det);
      if (!Object.values(det.units).some(us => UNITS[us.u] && hasType(UNITS[us.u], /Parangon/))) err(`${def.name} : doit inclure au moins une figurine de Type Parangon (p. 281).`, det);
    }
    for (const s of slots) {
      const us = det.units[s.i]; if (!us) { if (det.adv[s.i] && det.adv[s.i] !== 'affectation') err(`${def.name} : un Avantage Principal est choisi sur une case vide.`, det, s.i); continue; }
      const u = UNITS[us.u];
      if (!u) { err(`${def.name} : unité inconnue de la base de données (« ${us.u} »).`, det, s.i); continue; }
      if (u.role === 'SB' || u.role === 'SG') lords += unitPoints(us);
      const a = unitAllowed(det, s, u); if (!a.ok) err(`${u.name} (${def.name}) : ${a.why}`, det, s.i);
      if (det.adv[s.i]) {
        if (!s.prime) err(`${u.name} : cette case n'est pas une Case Principale, aucun Avantage Principal possible.`, det, s.i);
        else { const o = advOptions(det, s).find(x => x.def.id === det.adv[s.i]); if (o && !o.ok) err(`${u.name} — ${o.def.name} : ${o.why}`, det, s.i); }
      }
      if (u.extra && (us.extra || 0) > u.extra.max) err(`${u.name} : ${u.extra.max} ${u.extra.model} supplémentaire(s) au maximum.`, det, s.i);
      (u.options || []).forEach((o, oi) => {
        const n = optCount(us, oi), m = optMax(o, us);
        if (n > m) err(`${u.name} — « ${o.text} » : ${n} sélection(s) pour ${m} autorisée(s).`, det, s.i);
        if (n && o.prov && !(army.provenances || []).includes(o.prov)) err(`${u.name} — « ${o.text} » : Provenance non choisie (étape 2).`, det, s.i);
        if (n && o.oath && !detOaths(det).some(x => x.id === o.oath)) err(`${u.name} — « ${o.text} » : Oath of Moment non choisi.`, det, s.i);
        if (o.oath && !n && detOaths(det).some(x => x.id === o.oath)) out.push({ level: 'warn', msg: `${u.name} — The Weapons of Desperation : choisissez les armes de remplacement des bolters et pistolets bolters.`, det: det.id, slot: s.i });
        if (n && o.onePerDet && Object.entries(det.units).some(([j, x]) => +j !== s.i && x.u === us.u && optCount(x, oi))) err(`${u.name} — « ${o.text} » : une seule unité par détachement.`, det, s.i);
        if (n && o.legacy && !legacyOn()) err(`${u.name} — « ${o.text} » : option Legacies, cochez « Inclure les unités Legacies » (étape 1).`, det, s.i);
        const ch2 = optChoices(o); for (const k of Object.keys((us.opts || {})[oi] || {})) { const c = ch2[k]; if (c) { const st = itemState(c, u, det); if (!st.show) err(`${u.name} — ${c.name} : ${st.why}.`, det, s.i); } }
        const req = (o.required || /obligatoire/i.test(o.text)) && !(o.onlyVariant != null && us.variant !== o.onlyVariant);
        { const need = typeof o.max === 'number' ? o.max : (o.max === 'models' || o.max === 'others' ? optMax(o, us) : 1); if (req && n < need && !(u.options || []).some((o2, j) => j !== oi && /^Ou /.test(o2.text) && optCount(us, j))) err(`${u.name} — « ${o.text} » : choix obligatoire (${n}/${need}).`, det, s.i); }
        if (o.allSame && (n !== m || Object.keys((us.opts || {})[oi] || {}).length !== 1)) err(`${u.name} — « ${o.text} » : choisissez une seule et même arme pour les ${m} figurines.`, det, s.i);
        if (o.notVariant != null && us.variant === o.notVariant && n) err(`${u.name} — « ${o.text} » : option inaccessible à ${u.variants[us.variant].name}.`, det, s.i);
      });
    }
    if (det.bonusRole && !Object.values(det.adv).includes('logistique')) err(`${def.name} : case supplémentaire sans Avantage Bénéfice Logistique.`, det);
  }
  // droits à détachements
  const apex = childrenOf(main, 'apex').length, gm = grants(main);
  if (apex > gm.flex) err(`${apex} Détachement(s) d'Apex pour ${gm.flex} case(s) Quartier Général occupée(s) : chaque Apex requiert une case QG occupée (p. 280).`);
  for (const p of [main, ...army.dets.filter(d => detDef(d.type).kind === 'allie')]) {
    const g = grants(p), kids = childrenOf(p, 'aux'), cap = g.aux + (p === main ? Math.max(0, g.flex - apex) : 0);
    if (auxUse(kids) > cap) err(`${detName(p)} : ${auxUse(kids)} Détachement(s) Auxiliaire(s) rattaché(s) pour ${cap} autorisé(s) par ses cases État-major${p === main ? ' et Quartier Général' : ''} (p. 280).`, kids[kids.length - 1]);
    const need = {};
    for (const k of kids) { const r = detDef(k.type).requires; if (r) need[r] = (need[r] || []).concat(k); }
    for (const [r, ks] of Object.entries(need)) if (auxUse(ks) > (g.by[r] || 0))
      err(`${detName(ks[0])} : nécessite une unité « ${r} » dans une case État-major de ${detName(p)} (${g.by[r] || 0} droit(s) pour ${ks.length} détachement(s)).`, ks[ks.length - 1]);
  }
  const md = modeDef();
  if (md.limit && lim !== md.limit) err(`${md.name} : la Limite de Points est fixée à ${md.limit} points (${md.ref || ''}).`);
  if (md.ban || md.warn) for (const det of army.dets) for (const [i, us] of Object.entries(det.units)) {
    const u = UNITS[us.u]; if (!u) continue;
    for (const b of md.ban || []) if (hasType(u, new RegExp(b.match))) err(`${u.name} — ${md.name} : ${b.why}.`, det, +i);
    for (const w of md.warn || []) if ((w.match && hasType(u, new RegExp(w.match))) || (w.rule && (u.rules || []).some(r => { const q = r.split(' : '); const who = us.variant != null && u.variants ? u.variants[us.variant].name : u.models[0].name; return q[q.length - 1].startsWith(w.rule) && (q.length < 2 || !u.variants || q[0] === who); }))) out.push({ level: 'warn', msg: `${u.name} — ${w.why}.`, det: det.id, slot: +i });
  }
  { const seen = {}; army.dets.forEach(d => Object.values(d.units).forEach(x => { if (x && x.vow) seen[x.vow] = (seen[x.vow] || 0) + 1; })); for (const [k, n] of Object.entries(seen)) if (n > 1) err(`${(vowDef(k) || {}).name || k} : un même Vœu Questoris ne peut être déclaré que pour un seul Chevalier (ici ${n}).`); }
  for (const [a, b] of DB.core.exclusive || []) { const has = id => army.dets.some(d => Object.values(d.units).some(x => x && x.u === id)); if (has(a) && has(b)) err(`${UNITS[a] ? UNITS[a].name : a} et ${UNITS[b] ? UNITS[b].name : b} ne peuvent pas figurer dans la même armée.`); }
  { const r = sireRule(); if (r && sireActive()) out.push({ level: 'info', msg: `${r.name} : les cases Troupes du Détachement Principal sont Principales${r.note ? ' (' + r.note + ')' : ''}.` }); }
  { const r = riteDef(); if (r && r.allegiance && r.allegiance !== army.allegiance) err(`Rite de Guerre ${r.name} : réservé aux armées d'Allégeance ${r.allegiance} (étape 2).`); }
  if (armyDef().needsMode && (army.mode || 'croisade') !== armyDef().needsMode) err(`Une armée ${armyDef().name} n'est jouable qu'en mode ${(DB.core.modes.find(m => m.id === armyDef().needsMode) || {}).name} (étape 1).`);
  for (const det of army.dets) { const d2 = detDef(det.type);
    if ((armyDef().forbid || []).includes(d2.kind)) err(`${d2.name} : indisponible pour une armée ${armyDef().name}.`, det);
    if (d2.kind === 'principal' && d2.id !== (armyDef().mainDet || 'principal') && !(d2.alt && d2.army === armyOf(army.faction))) err(`Le Détachement Principal d'une armée ${armyDef().name} n'est pas « ${d2.name} » : revenez à l'étape 2.`, det);
  }
  for (const d2 of DB.detachments.filter(d => d.kind === 'addl')) { const n = army.dets.filter(d => d.type === d2.id).length, h = countAdv(d2.unlockedBy) + (paradigm() && paradigm().freeDet === d2.id ? 1 : 0); if (n > h) err(`${d2.name} : ${n} détachement(s) pour ${h} Avantage(s) « ${advDef(d2.unlockedBy).name} ».`); }
  const half = Math.ceil(lim * 0.5), quarter = Math.ceil(lim * 0.25);
  if (allied > half && !armyDef().alliesUncapped) err(`Détachements Alliés : ${allied} pts, au-delà des 50 % de la Limite de Points (${half} pts) (p. 281).`);
  if (lords > quarter && !armyDef().lordsUncapped) err(`Seigneurs de Guerre et Seigneurs des Batailles : ${lords} pts, au-delà des 25 % de la Limite de Points (${quarter} pts) (p. 281).`);
  if (!md.limit && (lim < 2000 || lim > 4000)) out.push({ level: 'warn', msg: 'Les limites inférieures à 2000 ou supérieures à 4000 points sortent du cadre des Règles de Base et peuvent être déséquilibrées (p. 278).' });
  return out;
}

/* ---------- Persistance ---------- */
const store = {
  all() { return LS.get('30k.lists', {}); },
  save(a) { const l = this.all(); a.updated = Date.now(); l[a.id] = a; LS.set('30k.lists', l); LS.set('30k.last', a.id); },
  remove(id) { const l = this.all(); delete l[id]; LS.set('30k.lists', l); }
};
let saveT = null;
function touch() { clearTimeout(saveT); saveT = setTimeout(() => store.save(army), 250); render(); }

/* ---------- Rendu ---------- */
function slotGlyph(s, filled) {
  const r = role(s.role);
  const spikes = s.prime ? [...Array(8)].map((_, k) => `<path d="M0-31 3.2-25h-6.4z" transform="rotate(${k * 45})"/>`).join('') : '';
  return `<svg viewBox="-34 -34 68 68" class="glyph${filled ? ' on' : ''}${s.bonus ? ' bonus' : ''}" aria-hidden="true"><g class="spk">${spikes}</g><circle r="25"/><text y="6" text-anchor="middle">${r.short}</text></svg>`;
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
function render() {
  const total = armyPoints(), issues = validate(), errs = issues.filter(i => i.level === 'err');
  $('#pts').textContent = total; $('#lim').textContent = army.limit;
  $('#meter').classList.toggle('over', total > army.limit);
  $('#bar').style.width = Math.min(100, total / army.limit * 100) + '%';
  $('#name').value = army.name;
  $('#verdict').className = errs.length ? 'bad' : 'good';
  $('#verdict').textContent = errs.length ? `${errs.length} point${errs.length > 1 ? 's' : ''} à corriger` : 'Liste conforme';
  const md0 = modeDef();
  $('#summary').textContent = `${md0.name} · ${army.allegiance} · ${army.faction}`;
  renderWizard(issues);

  const host = $('#dets'); host.replaceChildren();
  const order = [];
  const main = mainDet(); order.push(main);
  const push = k => army.dets.filter(d => detDef(d.type).kind === k).forEach(d => { if (!order.includes(d)) order.push(d); });
  army.dets.filter(d => d.parent === main.id).forEach(d => order.push(d)); push('apex');
  army.dets.filter(d => detDef(d.type).kind === 'allie').forEach(a => { order.push(a); army.dets.filter(d => d.parent === a.id).forEach(d => order.push(d)); });
  push('addl'); push('sdg'); push('sdb'); army.dets.forEach(d => { if (!order.includes(d)) order.push(d); });
  const step = army.step || 1;
  if (step === 3) host.append(el('p', { class: 'lead' }, 'Remplissez le Détachement Principal : touchez une case pour y placer une unité. Une seule case occupée suffit.' + ((armyDef().forbid || []).includes('aux') ? '' : ' Chaque case État-major ouvrira un Détachement Auxiliaire, la case Quartier Général un Auxiliaire ou un Apex.')));
  if (step === 4 && (armyDef().forbid || []).includes('aux')) host.append(el('p', { class: 'lead' }, `Une armée ${armyDef().name} n'a ni Détachement Auxiliaire ni d'Apex : ajoutez des Détachements Alliés ou additionnels si votre liste y a droit.`));
  else if (step === 4) { const g = grants(main), ax = childrenOf(main, 'aux').length, ap = childrenOf(main, 'apex').length;
    host.append(el('p', { class: 'lead' }, `Vos choix du Détachement Principal ouvrent ${g.aux} Détachement(s) Auxiliaire(s) par les cases État-major et ${g.flex} Auxiliaire ou Apex par la case Quartier Général. Utilisés : ${ax} Auxiliaire(s), ${ap} Apex. Alliés et Seigneur des Batailles restent possibles sans condition.`)); }
  if (step === 3) { const alts = DB.detachments.filter(d => d.kind === 'principal' && d.alt && d.army === armyOf(army.faction));
    if (alts.length) { const std = detDef(armyDef().mainDet || 'principal');
      const pick = id => { if (main.type === id) return; if (Object.keys(main.units).length && !confirm('Changer de Détachement Principal vide ses cases. Continuer ?')) return; main.type = id; main.units = {}; main.adv = {}; main.bonusRole = null; main.advSlot = {}; touch(); };
      host.append(el('div', { class: 'altmain' }, el('h3', {}, 'Type de Détachement Principal'),
        el('div', { class: 'choices wide' }, [std, ...alts].map(d => { const b = el('button', { type: 'button', class: 'choice', 'aria-pressed': main.type === d.id ? 'true' : 'false', onclick: () => pick(d.id) },
          el('b', {}, d.name), el('i', {}, d.alt ? 'Legiones Astartes Primary Detachments (EN)' : 'Livre de Règles p. 284'), el('span', { class: 'mini', html: d.slots.map(x => slotGlyph(x, false)).join('') })); return b; })))); } }
  for (const det of order) { if (step === 3 && det !== main) continue; if (step === 4 && det === main) continue; host.append(renderDet(det, issues)); }
  if (step === 4 && order.length === 1) host.append(el('p', { class: 'note' }, 'Aucun détachement supplémentaire pour l\'instant.'));

  const iss = $('#issues'); iss.replaceChildren();
  if (!issues.length) iss.append(el('p', { class: 'ok' }, 'Rien à signaler : la liste respecte les Règles de Sélection d\'Armée de Croisade.'));
  for (const i of issues) iss.append(el('li', { class: i.level, onclick: () => { if (i.det) { const d = $(`[data-det="${i.det}"]`); d && d.scrollIntoView({ behavior: 'smooth', block: 'center' }); } } }, i.msg));
  renderEditor(issues);
  renderSheet(issues);
}
const KIND = { fort: 'Détachement Additionnel (Legacies)', addl: 'Détachement Additionnel', principal: 'Détachement Principal', aux: 'Détachement Auxiliaire', apex: 'Détachement d\'Apex', allie: 'Détachement Allié', sdg: 'Seigneur de Guerre', sdb: 'Seigneur des Batailles' };
const STEPS = [['Limite de Points', () => army.limit + ' pts'], ['Allégeance et Faction', () => army.allegiance + ' · ' + army.faction + (doctrineDef() ? ' · ' + doctrineDef().name : '') + (ritesFor().length > 1 && riteDef() ? ' · ' + riteDef().name : '')], ['Détachement Principal', () => Object.keys(mainDet().units).length + ' unité(s)'], ['Autres détachements', () => (army.dets.length - 1) + ' détachement(s)']];
function goStep(n) { army.step = Math.max(1, Math.min(4, n)); sel = null; document.body.classList.remove('editing'); touch(); scrollTo({ top: 0 }); }
function renderWizard(issues) {
  const step = army.step || 1; document.body.dataset.step = step;
  const nav = $('#steps'); nav.replaceChildren();
  STEPS.forEach(([t, sum], i) => nav.append(el('button', { type: 'button', class: i + 1 === step ? 'cur' : i + 1 < step ? 'done' : '', 'aria-current': i + 1 === step ? 'step' : null, onclick: () => goStep(i + 1) }, el('b', {}, `${i + 1}. ${t}`), el('span', {}, sum()))));
  const w = $('#wiz'); w.replaceChildren();
  const choice = (label, sub, on, fn) => el('button', { type: 'button', class: 'choice', 'aria-pressed': on ? 'true' : 'false', onclick: fn }, el('b', {}, label), sub ? el('i', {}, sub) : null);
  if (step === 1) {
    const md = modeDef();
    w.append(el('h2', {}, 'Fixer la Limite de Points'), el('p', {}, 'La valeur totale des unités et de leurs options ne pourra pas la dépasser. Elle fixe aussi les plafonds : 50 % pour les alliés, 25 % pour les Seigneurs de Guerre et des Batailles.'),
      el('h3', {}, 'Type de bataille'), el('div', { class: 'choices wide' }, (DB.core.modes || []).map(m => choice(m.name, m.limit ? `Limite imposée : ${m.limit} points` : m.note || 'Limite libre, 3000 points par défaut', m.id === md.id, () => { army.mode = m.id; if (m.limit) army.limit = m.limit; else if (m.defaultLimit) army.limit = Math.max(army.limit, m.defaultLimit); else if (army.limit < 2000) army.limit = 3000; touch(); }))),
      el('h3', {}, 'Limite de Points'));
    w.append(el('label', { class: 'legacy-box' }, el('input', { type: 'checkbox', checked: !!army.legacies, onchange: e => { army.legacies = e.target.checked; touch(); } }),
      el('span', {}, el('b', {}, 'Inclure les unités Legacies (Héritages)'), el('i', {}, 'Unités, détachements, options et listes des PDF « Legacies of the Age of Darkness » : Legacies Astartes, Auxilia et Mechanicum, Inductii, Blackshields, Shattered Legions, Imperialis Militia, Legio Custodes, Daemons of the Ruinstorm, Fortifications. À convenir avec votre adversaire.'))));
    if (md.limit) w.append(el('div', { class: 'choices wide' }, choice(md.limit + ' points', md.ref || '', true, () => {})));
    else {
      const std = [2000, 2500, 3000, 3500, 4000], custom = !std.includes(army.limit);
      const inp = el('input', { type: 'number', min: 500, max: 10000, step: 50, value: custom ? army.limit : '', placeholder: 'ex. 1750', 'aria-label': 'Limite personnalisée', onchange: e => { army.limit = Math.max(500, Math.min(10000, +e.target.value || 3000)); touch(); } });
      w.append(el('div', { class: 'choices' }, std.map(v => choice(v + ' points', v === 3000 ? 'Limite par défaut' : v < 3000 ? 'Sans Seigneur de Guerre' : '', army.limit === v, () => { army.limit = v; touch(); })),
        el('div', { class: 'choice', 'aria-pressed': custom ? 'true' : 'false' }, el('b', {}, 'Autre limite'), inp)));
    }
  }
  if (step === 2) {
    w.append(el('h2', {}, 'Choisir l\'Allégeance et la Faction'), el('p', {}, 'L\'Allégeance vaut pour toute l\'armée. La Faction est celle du Détachement Principal et des détachements qui lui sont rattachés.'),
      el('h3', {}, 'Allégeance'), el('div', { class: 'choices wide' }, [['Loyaliste', 'Fidèle à l\'Empereur'], ['Renégat', 'Rallié au Maître de Guerre']].map(([a, t]) => choice(a, t, army.allegiance === a, () => { army.allegiance = a; touch(); }))),
      ...(DB.core.armies || []).filter(a => !a.hidden && a.factions.length).flatMap(a => [el('h3', {}, 'Faction — ' + a.name + (a.legacy ? ' (Legacies)' : '')), el('div', { class: 'choices' }, a.factions.map(f => {
        const leg = a.legacy || factionInfo(f).legacy, al = factionInfo(f).allegiance || a.allegiance, off = (leg && !legacyOn());
        const b = choice(f, [leg ? 'Legacies' : '', al ? al + ' uniquement' : ''].filter(Boolean).join(' · '), army.faction === f, () => { if (off) return flash(`${f} : cochez « Inclure les unités Legacies » à l'étape 1.`); army.faction = f; syncMain(); if (!doctrineDef()) army.doctrine = null; touch(); });
        if (off) { b.classList.add('off'); b.title = 'Liste Legacies : cochez la case à l\'étape 1'; } return b; }))]));
    if (army.faction === 'Shattered Legions') { const S = DB.core.shattered, cur = army.shattered || [];
      w.append(el('h3', {}, `Shattered Legions : ${S.min} or ${S.max} Legions (${cur.length} selected)`), el('p', { class: 'note' }, 'Mutable Tactics — one benefit per Legion selected. ' + S.boundInBlood),
        el('div', { class: 'choices wide' }, LEGIONS().map(L => { const b = S.benefits[L] || {}; return choice(L + (b.name ? ' — ' + b.name : ''), b.text || '', cur.includes(L), () => {
          const n = cur.includes(L) ? cur.filter(x => x !== L) : [...cur, L]; if (n.length > S.max) return flash(`${S.max} Legions at most.`); army.shattered = n; touch(); }); }))); }
    if (armyOf(army.faction) === 'mil') { const P = DB.core.provenances, cur = army.provenances || [];
      w.append(el('h3', {}, `Provenances of War (${cur.length})`), el('p', { class: 'note' }, P.note),
        el('div', { class: 'choices wide' }, P.list.map(p => { const bad = p.allegiance && p.allegiance !== army.allegiance;
          const b = choice(p.name, [p.allegiance ? 'Traitor Allegiance only' : '', p.listItems.length ? 'Adds: ' + [...new Set(p.listItems.map(i => i.name))].join(', ') : '', p.foreignUnits.length ? 'Units from other Army Lists available' : ''].filter(Boolean).join(' · '), cur.includes(p.id), () => {
            if (bad) return flash(`${p.name} : Traitor Allegiance only.`); army.provenances = cur.includes(p.id) ? cur.filter(x => x !== p.id) : [...cur, p.id]; touch(); });
          if (bad) b.classList.add('off'); return b; }))); }
    if (paradigm()) w.append(el('h3', {}, 'Paradigme de Maisonnée'), el('div', { class: 'choices wide' }, choice(paradigm().name, paradigm().summary, true, () => {})));
    if (armyOf(army.faction) === 'dmn') { const t = ((DB.books.find(b => b.id === 'daemons-ruinstorm') || {}).dominions || {})[army.faction]; if (t) w.append(el('p', { class: 'note' }, `Ætheric Dominion — ${army.faction} : ${t}`)); }
    if (armyDef().incomplete) w.append(el('p', { class: 'note pending' }, armyDef().incomplete));
    const rites = ritesFor();
    if (rites.length) w.append(el('h3', {}, rites.length > 1 ? 'Rite de Guerre (un seul pour la Légion)' : 'Rite de Guerre de la Légion'),
      el('div', { class: 'choices wide' }, rites.map(r => { const bad = r.allegiance && r.allegiance !== army.allegiance;
        const b = choice(r.name + ' — ' + r.tactica, `${r.tacticaText} Posture « ${r.posture} » : ${r.postureText}${r.allegiance ? ' Réservé aux armées ' + r.allegiance + 'es.' : ''}`, riteDef() === r, () => { if (bad) return flash(`${r.name} : réservé aux armées d'Allégeance ${r.allegiance}.`); army.rite = r.id; touch(); });
        if (bad) { b.classList.add('off'); b.title = `Réservé aux armées d'Allégeance ${r.allegiance}`; } return b; })));
    const docs = (DB.core.doctrines || []).filter(d => d.army === armyOf(army.faction));
    if (docs.length) w.append(el('h3', {}, 'Doctrine de Cohorte (une seule, facultative)'), el('div', { class: 'choices wide' }, choice('Aucune', '', !army.doctrine, () => { army.doctrine = null; touch(); }), docs.map(d => choice(d.name, d.text, army.doctrine === d.id, () => { army.doctrine = d.id; touch(); }))));
  }
  const errs = issues.filter(i => i.level === 'err').length;
  $('#wiznav').replaceChildren(
    step > 1 ? el('button', { type: 'button', class: 'btn ghost', onclick: () => goStep(step - 1) }, 'Retour') : el('span'),
    step < 4 ? el('button', { type: 'button', class: 'btn', onclick: () => goStep(step + 1) }, `Étape suivante : ${STEPS[step][0]}`)
      : el('button', { type: 'button', class: 'btn', onclick: exportPDF }, errs ? `Créer le PDF quand même (${errs} point${errs > 1 ? 's' : ''} à corriger)` : 'Terminer : créer le PDF de la liste'));
}

function renderDet(det, issues) {
  const def = detDef(det.type), slots = slotsOf(det), bad = issues.some(i => i.det === det.id && i.level === 'err');
  const box = el('section', { class: 'det k-' + def.kind + (bad ? ' bad' : ''), 'data-det': det.id });
  const head = el('header', {},
    el('div', {}, el('h2', {}, def.name), el('p', { class: 'kind' }, KIND[def.kind] + (det.parent && det.parent !== mainDet().id ? ' rattaché à l\'Allié' : '') + ' · ' + (detFaction(det) || 'Faction à choisir'))),
    el('div', { class: 'dp' }, el('b', {}, detPoints(det)), ' pts'));
  box.append(head);
  if (def.kind === 'allie' || def.kind === 'sdb') {
    const s = el('select', { 'aria-label': 'Faction du détachement', onchange: e => { det.faction = e.target.value; touch(); } }, el('option', { value: '' }, 'Choisir la Faction…'),
      (DB.core.armies || []).map(a => el('optgroup', { label: a.name }, a.factions.map(f => el('option', { value: f, selected: det.faction === f, disabled: def.kind === 'allie' && f === army.faction }, f + (def.kind === 'allie' && f === army.faction ? ' (faction principale)' : ''))))));
    box.append(el('label', { class: 'inl' }, 'Faction ', s));
  }
  if (def.note) box.append(el('p', { class: 'note' }, def.note));
  for (const n of def.notes || []) box.append(el('p', { class: 'note' }, n));
  if (def.dynSlots) box.append(el('p', { class: 'note' }, `${def.dynSlots.why} — ${dynCount(det, def)} slot(s) added.`));
  const O = DB.core.oaths || {}, nOath = (O.perDet || {})[def.kind];
  if (nOath && detFaction(det) === 'Blackshields') { const cur = det.oaths || [];
    const f = el('details', { class: 'oaths', open: !cur.length }, el('summary', {}, `Oaths of Moment : ${cur.length}/${nOath}` + (cur.length ? ' — ' + cur.map(id => oathDef(id).name).join(', ') : '')));
    for (const o of O.list) { const on = cur.includes(o.id), ex = (o.excl || []).find(x => cur.includes(x));
      f.append(el('label', { class: 'opt' + (ex && !on ? ' ko' : '') }, el('input', { type: 'checkbox', checked: on, disabled: !on && (cur.length >= nOath || !!ex), onchange: () => { det.oaths = on ? cur.filter(x => x !== o.id) : [...cur, o.id]; touch(); } }),
        el('span', {}, o.name, el('i', {}, ex && !on ? `Not with ${oathDef(ex).name}.` : o.text)))); }
    if (cur.includes('helix')) f.append(el('label', { class: 'inl' }, 'The Broken Helix : ', el('select', { onchange: e => { det.helix = e.target.value; touch(); } }, ['Clone', 'Aberrant'].map(v => el('option', { value: v, selected: (det.helix || 'Clone') === v }, v)))));
    if (cur.includes('panoply')) f.append(el('label', { class: 'inl' }, 'Panoply of Old — Legion Armoury ', el('select', { onchange: e => { det.panoplyLegion = e.target.value; touch(); } }, el('option', { value: '' }, '…'), LEGIONS().map(L => el('option', { value: L, selected: det.panoplyLegion === L }, L)))));
    box.append(f); }
  if (det === mainDet() && sireRule() && sireRule().name === 'Sire des White Scars' && sireActive())
    box.append(el('label', { class: 'inl' }, el('input', { type: 'checkbox', checked: !!det.wsReco, onchange: e => { det.wsReco = e.target.checked; Object.keys(det.units).forEach(i => { if (detDef(det.type).slots[i] && detDef(det.type).slots[i].role === 'TP') delete det.units[i]; }); touch(); } }), ' Sire des White Scars : échanger les cases Transport contre des cases Reco. (Land Raider Explorator)'));
  const row = el('div', { class: 'slots' });
  for (const s of slots) {
    const us = det.units[s.i], u = us && UNITS[us.u];
    const isSel = sel && sel.det === det.id && sel.slot === s.i;
    const sbad = issues.some(i => i.det === det.id && i.slot === s.i && i.level === 'err');
    const b = el('button', { type: 'button', class: 'slot' + (us ? ' filled' : '') + (isSel ? ' sel' : '') + (sbad ? ' bad' : ''),
      title: role(s.role).name + (s.prime ? ' — Case Principale' : '') + (s.added != null ? ' — case ajoutée' + (s.legion ? ' (' + s.legion + ')' : s.army ? ' (' + armyName(s.army) + ')' : '') : s.bonus ? ' — case du Bénéfice Logistique' : '') + (s.dyn ? ' — case ajoutée par le Détachement Principal' : '') + (s.oath ? ' — Oath of Moment' : ''),
      onclick: () => { if (us) { sel = { det: det.id, slot: s.i }; render(); openEditor(); } else openPicker(det, s); } },
      el('span', { html: slotGlyph(s, !!us) }),
      el('span', { class: 'sl' }, us ? [el('b', {}, u ? u.name : us.u), el('i', {}, `${u ? unitSize(us) + ' fig. · ' : ''}${unitPoints(us)} pts` + (det.adv[s.i] ? ' · ' + advDef(det.adv[s.i]).name : ''))]
        : [el('em', {}, (s.roles || [s.role]).map(r => role(r).name).join(' / ')), el('i', {}, s.prime ? 'Case Principale — vide' : s.legion ? s.legion + ' — vide' : s.army ? armyName(s.army) + ' — vide' : s.bonus || s.dyn ? 'Case ajoutée — vide' : 'Vide')]));
    row.append(b);
  }
  box.append(row);
  if (def.kind !== 'principal') box.append(el('button', { class: 'link danger', type: 'button', onclick: () => removeDet(det) }, 'Retirer ce détachement'));
  return box;
}
function removeDet(det) {
  const kids = army.dets.filter(d => d.parent === det.id);
  if (Object.keys(det.units).length || kids.length) { if (!confirm(`Retirer « ${detName(det)} »${kids.length ? ' et ses détachements rattachés' : ''} avec ses unités ?`)) return; }
  army.dets = army.dets.filter(d => d !== det && d.parent !== det.id);
  sel = null; touch();
}

/* ---------- Sélecteur d'unité ---------- */
function openPicker(det, slot) {
  const dlg = $('#dlg'), body = $('#dlg-body'); body.replaceChildren();
  $('#dlg-title').textContent = `${role(slot.role).name} — ${detName(det)}`;
  const okL = [], koL = [];
  const dfa = slot.army || detDef(det.type).foreign || armyOf(detFaction(det)); let hiddenLeg = 0;
  for (const u of Object.values(UNITS)) { if (u.legacy && !legacyOn()) { if (u.army === dfa && (slot.roles || [slot.role]).includes(u.role)) hiddenLeg++; continue; } if (u.role === 'FO' && detDef(det.type).kind !== 'fort') continue; const a = unitAllowed(det, slot, u); if (!a.ok && ((u.army && dfa && u.army !== dfa) || !u.army)) continue; (a.ok ? okL : koL).push([u, a]); }
  const left = army.limit - armyPoints();
  const search = el('input', { type: 'search', placeholder: 'Chercher une unité…', 'aria-label': 'Chercher une unité', oninput: e => { const q = e.target.value.toLowerCase(); $$('.pick', body).forEach(p => p.hidden = !p.dataset.n.includes(q)); } });
  body.append(search);
  if (!okL.length) body.append(el('p', { class: 'note' }, 'Aucune unité de la base de données ne peut occuper cette case pour l\'instant.'));
  if (hiddenLeg) body.append(el('p', { class: 'note' }, `${hiddenLeg} unité(s) Legacies masquée(s) : cochez « Inclure les unités Legacies » à l'étape 1 pour les voir.`));
  const mk = ([u, a]) => el('button', { type: 'button', class: 'pick' + (a.ok ? '' : ' ko'), 'data-n': u.name.toLowerCase(), disabled: !a.ok, onclick: () => {
    det.units[slot.i] = { u: u.id, extra: 0, opts: {} }; sel = { det: det.id, slot: slot.i }; dlg.close(); touch(); openEditor(); } },
    el('span', {}, el('b', {}, u.name, u.legacy ? el('small', { class: 'tag' }, 'Legacies') : null, u.lang === 'en' ? el('small', { class: 'tag' }, 'EN') : null, u.unverified ? el('small', { class: 'tag warn' }, 'Non vérifié') : null), el('i', {}, a.ok ? u.models.map(m => `${m.count} ${m.name}`).join(', ') : a.why)),
    el('span', { class: 'pp' + (a.ok && u.points > left ? ' over' : '') }, u.points + ' pts'));
  okL.sort((a, b) => a[0].points - b[0].points).forEach(x => body.append(mk(x)));
  if (okL.some(([u]) => u.points > left)) body.append(el('p', { class: 'note' }, `Il vous reste ${left} pts : les coûts en rouge feraient dépasser la limite.`));
  if (koL.length) {
    const d = el('details', {}, el('summary', {}, `Unités indisponibles ici (${koL.length}) — voir pourquoi`));
    const byRole = {};
    koL.forEach(x => (byRole[x[0].role] = byRole[x[0].role] || []).push(x));
    for (const [r, xs] of Object.entries(byRole)) { d.append(el('h4', {}, role(r).name)); xs.forEach(x => d.append(mk(x))); }
    body.append(d);
  }
  dlg.showModal();
}
function openDetPicker() {
  const dlg = $('#dlg'), body = $('#dlg-body'); body.replaceChildren();
  $('#dlg-title').textContent = 'Ajouter un détachement';
  const groups = { addl: 'Détachements Additionnels', fort: 'Détachements additionnels', aux: 'Détachements Auxiliaires', apex: 'Détachements d\'Apex', allie: 'Détachements additionnels', sdg: 'Détachements additionnels', sdb: 'Détachements additionnels' };
  let last = '';
  const lists = new Set([armyOf(army.faction), ...army.dets.filter(d => detDef(d.type).kind === 'allie').map(d => armyOf(d.faction))]);
  for (const def of DB.detachments.filter(d => d.kind !== 'principal' && (!d.faction || d.faction === army.faction) && (!d.army || lists.has(d.army)) && !(armyDef().forbid || []).includes(d.kind)).sort((a, b) => Object.keys(groups).indexOf(a.kind) - Object.keys(groups).indexOf(b.kind))) {
    if (groups[def.kind] !== last) { last = groups[def.kind]; body.append(el('h4', {}, last)); }
    const c = canAddDet(def);
    const add = parent => { army.dets.push({ id: uid(), type: def.id, parent: parent ? parent.id : null, units: {}, adv: {}, bonusRole: null, faction: '' }); dlg.close(); touch(); };
    const b = el('div', { class: 'pick det-pick' + (c.ok ? '' : ' ko') },
      el('span', {}, el('b', {}, def.name), el('span', { class: 'mini', html: def.slots.map(s => slotGlyph(s, false)).join('') }),
        el('i', {}, c.ok ? (def.requires ? `Ouvert par votre ${def.requires}. ` : '') + (def.note || '') : c.why)),
      c.ok ? el('span', { class: 'acts' }, (c.parents || [null]).map(p => el('button', { type: 'button', class: 'btn', onclick: () => add(p) }, c.parents && c.parents.length > 1 ? `Rattacher : ${detName(p)}` : 'Ajouter'))) : null);
    body.append(b);
  }
  dlg.showModal();
}

/* ---------- Éditeur d'unité ---------- */
function openEditor() { document.body.classList.add('editing'); const e = $('#editor'); e.scrollTop = 0; if (matchMedia('(max-width: 899px)').matches) e.focus(); }
function closeEditor() { document.body.classList.remove('editing'); sel = null; render(); }
function statTable(u, us) {
  if (u.variants && us) { const cur = us.variant != null ? u.variants[us.variant].name : u.models[0].name, one = u.profiles.filter(p => p.name === cur); if (one.length) u = { ...u, profiles: one }; }
  const veh = u.profiles.filter(p => p.vehicle), kn = u.profiles.filter(p => p.heads), inf = u.profiles.filter(p => !p.vehicle && !p.heads), out = [];
  const tbl = (heads, rows) => el('div', { class: 'tblw' }, el('table', { class: 'stats' }, el('thead', {}, el('tr', {}, el('th', {}, ''), heads.map(h => el('th', { title: DB.core.statNames[h] || h }, h)))),
    el('tbody', {}, rows.map(p => el('tr', {}, el('th', {}, p.name), p.stats.map(v => el('td', {}, String(v))))))));
  if (inf.length) out.push(tbl(DB.core.statHeads, inf));
  if (veh.length) out.push(tbl(DB.core.vehicleHeads, veh));
  const hg = {}; kn.forEach(p => (hg[p.heads.join('|')] = hg[p.heads.join('|')] || []).push(p)); Object.values(hg).forEach(ps => out.push(tbl(ps[0].heads, ps)));
  return out;
}
function renderEditor(issues) {
  const host = $('#editor-body'); host.replaceChildren();
  const det = sel && army.dets.find(d => d.id === sel.det), us = det && det.units[sel.slot];
  if (!us) { host.append(el('div', { class: 'empty' }, el('h3', {}, 'Aucune unité sélectionnée'), el('p', {}, 'Touchez une case vide de l\'organigramme pour y placer une unité, ou une case occupée pour régler ses options.'))); return; }
  const u = UNITS[us.u], slot = slotsOf(det).find(s => s.i === sel.slot);
  if (!u) { host.append(el('p', { class: 'note' }, 'Unité absente de la base de données.'), el('button', { class: 'btn danger', onclick: () => { delete det.units[sel.slot]; sel = null; touch(); } }, 'Retirer')); return; }
  host.append(el('p', { class: 'kind' }, `${role(u.role).name} · ${detName(det)}`), el('h3', {}, u.name),
    el('p', { class: 'cost' }, el('b', {}, unitPoints(us)), ` pts · ${unitSize(us)} figurine${unitSize(us) > 1 ? 's' : ''}`, u.page ? el('span', { class: 'ref' }, ` · ${u.bookName} p. ${u.page}`) : null));
  const mine = issues.filter(i => i.det === det.id && i.slot === sel.slot);
  if (mine.length) host.append(el('ul', { class: 'iss' }, mine.map(i => el('li', { class: i.level }, i.msg))));
  if (u.extra) {
    host.append(el('div', { class: 'row' }, el('span', {}, `${u.extra.model} supplémentaires`, el('i', {}, ` +${u.extra.points} pts chacun · ${u.extra.max} max`)),
      stepper(us.extra || 0, 0, u.extra.max, v => { us.extra = v; touch(); })));
  }
  if (u.variants) {
    const f = el('fieldset', {}, el('legend', {}, 'Version de la figurine'));
    const opt = (label, v, pts) => el('label', { class: 'opt' }, el('input', { type: 'radio', name: 'var', checked: (us.variant ?? -1) === v, onchange: () => { us.variant = v < 0 ? null : v; touch(); } }), el('span', {}, label), el('b', {}, pts ? `+${pts}` : '—'));
    f.append(opt(u.models[0].name, -1, 0), ...u.variants.map((v, i) => opt(v.name, i, v.points)));
    host.append(f);
  }
  if (slot && slot.prime) {
    const f = el('fieldset', { class: 'prime' }, el('legend', {}, 'Case Principale : Avantage Principal'));
    const cur = det.adv[slot.i] || '';
    f.append(el('label', { class: 'opt' }, el('input', { type: 'radio', name: 'adv', checked: !cur, onchange: () => setAdv(det, slot, '') }), el('span', {}, 'Aucun')));
    for (const o of advOptions(det, slot)) {
      if (o.def.id === 'affectation') continue;
      f.append(el('label', { class: 'opt' + (o.ok ? '' : ' ko') }, el('input', { type: 'radio', name: 'adv', disabled: !o.ok && cur !== o.def.id, checked: cur === o.def.id, onchange: () => setAdv(det, slot, o.def.id) }),
        el('span', {}, o.def.name, el('i', {}, o.ok ? o.def.text : o.why))));
    }
    const ad = advDef(cur);
    if (ad && ad.addSlot && (!ad.addSlot.role || ad.addSlot.legionPick)) { const ch = ((det.advSlot = det.advSlot || {})[slot.i] = det.advSlot[slot.i] || {});
      const clear = () => { delete det.units[100 + slot.i]; delete det.adv[100 + slot.i]; };
      if (!ad.addSlot.role) f.append(el('label', { class: 'inl' }, 'Case ajoutée : ', el('select', { onchange: e => { if (ch.role !== e.target.value) clear(); ch.role = e.target.value || null; touch(); } },
        el('option', { value: '' }, 'Choisir le rôle…'), Object.entries(DB.core.roles).filter(([k]) => !(ad.addSlot.exclude || []).includes(k) && k !== 'FO').map(([k, r]) => el('option', { value: k, selected: ch.role === k }, r.name)))));
      if (ad.addSlot.legionPick) f.append(el('label', { class: 'inl' }, 'Legion represented : ', el('select', { onchange: e => { if (ch.legion !== e.target.value) clear(); ch.legion = e.target.value || null; touch(); } },
        el('option', { value: '' }, '…'), ((army.shattered || []).length ? army.shattered : LEGIONS()).map(L => el('option', { value: L, selected: ch.legion === L }, L))))); }
    if (cur === 'logistique') {
      const s = el('select', { 'aria-label': 'Rôle de la case supplémentaire', onchange: e => { const idx = detDef(det.type).slots.length; if (det.bonusRole !== e.target.value) { delete det.units[idx]; delete det.adv[idx]; } det.bonusRole = e.target.value || null; touch(); } },
        el('option', { value: '' }, 'Choisir le rôle de la case ajoutée…'), Object.entries(DB.core.roles).filter(([k]) => !['QG', 'EM', 'SG', 'SB'].includes(k)).map(([k, r]) => el('option', { value: k, selected: det.bonusRole === k }, r.name)));
      f.append(el('label', { class: 'inl' }, 'Case ajoutée au détachement ', s));
    }
    host.append(f);
  }
  if (armyOf(army.faction) === 'quest' && hasType(u, /Chevalier|Knight/) && (DB.core.vows || []).length) {
    const f = el('fieldset', {}, el('legend', {}, 'Vœu Questoris (facultatif, déclaré au déploiement)'));
    const taken = vowsTaken(us);
    f.append(el('label', { class: 'opt' }, el('input', { type: 'radio', name: 'vow', checked: !us.vow, onchange: () => { us.vow = null; touch(); } }), el('span', {}, 'Aucun')));
    for (const v of DB.core.vows.filter(v => !v.paradigm || v.paradigm === army.faction)) { const ko = taken.has(v.id);
      f.append(el('label', { class: 'opt' + (ko ? ' ko' : '') }, el('input', { type: 'radio', name: 'vow', disabled: ko && us.vow !== v.id, checked: us.vow === v.id, onchange: () => { us.vow = v.id; touch(); } }), el('span', {}, v.name, el('i', {}, ko ? 'Déjà déclaré pour un autre Chevalier : un même Vœu ne peut servir qu\'une fois par armée.' : v.text)))); }
    host.append(f);
  }
  if ((u.traits || []).includes('[Mechanicum]')) host.append(el('label', { class: 'inl blk' }, 'Variante de Faction (Techno-arcane) : ', el('select', { onchange: e => { us.arcana = e.target.value || null; touch(); } }, el('option', { value: '' }, 'À choisir…'), ARCANA.map(a => el('option', { value: a, selected: us.arcana === a }, a)))));
  if (!isVeh(u)) { const trs = []; army.dets.forEach(d => slotsOf(d).forEach(s2 => { const t = d.units[s2.i], tu = t && UNITS[t.u]; if (tu && capacity(tu)) trs.push([`${d.id}:${s2.i}`, `${tu.name} (${detName(d)}, capacité ${capacity(tu)})`]); }));
    if (trs.length) host.append(el('label', { class: 'inl blk' }, 'Embarquée à bord de : ', el('select', { onchange: e => { us.embark = e.target.value || null; touch(); } }, el('option', { value: '' }, 'Aucun transport'), trs.map(([k, n]) => el('option', { value: k, selected: us.embark === k }, n))))); }
  (u.options || []).forEach((o, oi) => {
    const ch = optChoices(o), max = optMax(o, us), cnt = optCount(us, oi);
    if (o.legacy && !legacyOn() && !cnt) return;
    if (o.prov && !(army.provenances || []).includes(o.prov) && !cnt) return;
    if (o.oath && !detOaths(det).some(x => x.id === o.oath) && !cnt) return;
    const picked = ((us.opts = us.opts || {})[oi] = us.opts[oi] || {});
    const blocked = (o.notVariant != null && us.variant === o.notVariant) || (o.onlyVariant != null && us.variant !== o.onlyVariant);
    const f = el('fieldset', { class: blocked ? 'ko' : '' }, el('legend', {}, o.text, o.legacy ? el('small', { class: 'tag' }, 'Legacies') : null, max > 1 ? el('i', {}, ` ${cnt}/${max}`) : null));
    if (blocked) f.append(el('p', { class: 'note' }, o.onlyVariant != null ? `Réservé à ${u.variants[o.onlyVariant].name}.` : `Inaccessible à ${u.variants[us.variant].name}.`));
    if (max <= 0) f.append(el('p', { class: 'note' }, o.max && o.max.per ? `Disponible à partir de ${o.max.per} figurines dans l'unité.` : 'Indisponible avec la composition actuelle.'));
    ch.forEach((c, k) => {
      const q = picked[k] || 0, cost = c.points ? `+${c.points}` : 'gratuit';
      if (!q && !itemState(c, u, det).show) return;
      if (max === 1 || o.unique) f.append(el('label', { class: 'opt' }, el('input', { type: (o.unique && max > 1) || ch.length === 1 ? 'checkbox' : 'radio', name: 'o' + oi, checked: q > 0, disabled: blocked || (max <= 0),
        onclick: e => { const was = q > 0; if (!(o.unique && max > 1) ) for (const kk of Object.keys(picked)) delete picked[kk]; if (was) delete picked[k]; else { if (o.unique && optCount(us, oi) >= max) { e.preventDefault(); flash(`Maximum ${max} choix pour cette option.`); return; } picked[k] = 1; } touch(); } }),
        el('span', {}, c.name), el('b', {}, cost)));
      else f.append(el('div', { class: 'opt' }, el('span', {}, c.name), el('b', {}, cost + (c.points && (o.max === 'models' || typeof o.max === 'object') ? '/fig.' : '')),
        stepper(q, 0, q + Math.max(0, max - cnt), v => { if (v) picked[k] = v; else delete picked[k]; touch(); })));
    });
    if (o.note) f.append(el('p', { class: 'note' }, o.note));
    host.append(f);
  });
  if (u.upgrades) {
    const f = el('fieldset', {}, el('legend', {}, 'Amélioration (une seule par unité)'));
    f.append(el('label', { class: 'opt' }, el('input', { type: 'radio', name: 'up', checked: us.upgrade == null, onchange: () => { us.upgrade = null; touch(); } }), el('span', {}, 'Aucune')));
    u.upgrades.forEach((g, i) => f.append(el('label', { class: 'opt' }, el('input', { type: 'radio', name: 'up', checked: us.upgrade === i, onchange: () => { us.upgrade = i; touch(); } }), el('span', {}, g.name, g.note ? el('i', {}, g.note) : null), el('b', {}, '+' + g.points))));
    host.append(f);
  }
  if (u.sectionsPending) host.append(el('p', { class: 'note pending' }, 'Équipement, règles ou type de cette unité incomplets dans la base (page mal lisible) : à compléter d\'après le livre.'));
  if (u.optionsPending) host.append(el('p', { class: 'note pending' }, 'Options d\'équipement de cette unité pas encore saisies dans la base : seul le coût de base est compté.'));
  const eu = effUnit(u, us);
  if (u.unverified) host.append(el('p', { class: 'note warn' }, 'Profil non vérifié — source : ' + (u.source || 'données communautaires') + '. Comparez avec le Journal Tactica avant de jouer.' + (u.note ? ' ' + u.note : '')));
  if (eu.effects) host.append(el('p', { class: 'note' }, 'Appliqué : ' + [...new Set(eu.effects)].join(', ') + '.'));
  host.append(el('h4', {}, 'Profil'), ...statTable(eu, us));
  { const ws = unitWeapons(u, us); if (ws.length) host.append(el('h4', {}, 'Profils d\'armes'), weaponTables(ws)); }
  const sect = (t, arr, chip) => arr && arr.length ? host.append(el('h4', {}, t), el('div', { class: 'chips' }, arr.map(x => chip ? ruleChip(x) : el('span', { class: 'chip plain' }, x)))) : 0;
  sect('Équipement de base', u.wargear, true); sect('Règles spéciales', unitRules(eu, us), true); sect('Type', eu.types, false); sect('Traits', (eu.traits || []).map(t => /^\[All[ée]g[ei]ance\]$/.test(t) ? army.allegiance : /^\[(Legiones Astartes|Questoris Familia|Mechanicum|Skitarii|Ætheric Dominion)\]$/.test(t) ? (t === '[Mechanicum]' && us.arcana ? us.arcana : detFaction(det) || t) : t), false);
  if (u.notes) host.append(el('p', { class: 'note' }, u.notes));
  host.append(el('div', { class: 'acts' }, el('button', { class: 'btn danger', type: 'button', onclick: () => { delete det.units[sel.slot]; delete det.adv[sel.slot]; if (slot.bonus) {} sel = null; document.body.classList.remove('editing'); touch(); } }, 'Retirer l\'unité')));
}
function setAdv(det, slot, id) {
  const prev = det.adv[slot.i];
  if (prev && advDef(prev) && advDef(prev).addSlot && prev !== id) { delete det.units[100 + slot.i]; delete det.adv[100 + slot.i]; if (det.advSlot) delete det.advSlot[slot.i]; }
  if (prev === 'logistique' && id !== 'logistique') { const idx = detDef(det.type).slots.length; delete det.units[idx]; delete det.adv[idx]; det.bonusRole = null; }
  if (id) det.adv[slot.i] = id; else delete det.adv[slot.i];
  touch();
}
function stepper(v, min, max, cb) {
  return el('span', { class: 'step' }, el('button', { type: 'button', 'aria-label': 'Moins', disabled: v <= min, onclick: () => cb(v - 1) }, '−'), el('output', {}, String(v)), el('button', { type: 'button', 'aria-label': 'Plus', disabled: v >= max, onclick: () => cb(v + 1) }, '+'));
}
let flashT; function flash(msg) { const f = $('#flash'); f.textContent = msg; f.classList.add('on'); clearTimeout(flashT); flashT = setTimeout(() => f.classList.remove('on'), 2600); }

/* ---------- Infobulles de règles ---------- */
function showTip(target) {
  const name = target.dataset.rule, r = lookupRule(name), tip = $('#tip');
  tip.replaceChildren(el('b', {}, name), el('p', {}, r ? r.summary : 'Résumé non encore saisi dans la base de données.'), r && r.ref ? el('i', {}, r.ref) : null);
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
const wkey = n => String(n).toLowerCase().replace(/’/g, "'").replace(/^(two |deux |trois |quatre |six |paire de |pair of )/, '').replace(/^(turret|hull \(front\)|hull|sponson|pintle|co-axial|centreline)( mounted)? /, '').replace(/ (de tourelle|de coque.*|latéra\w*|sur pivot|d'axe central|dorsale?|coaxial)$/, '').split(' ').map(x => x.replace(/s$/, '')).join(' ').trim();
function unitWeapons(u, us) {
  if (!DB.weapons.length) return [];
  const names = [...(u.wargear || []).map(w => w.split(' : ').pop().replace(/\s*\(.*\)$/, ''))];
  (u.options || []).forEach((o, oi) => { const ch = optChoices(o); for (const k of Object.keys(((us && us.opts) || {})[oi] || {})) if (ch[k]) names.push(ch[k].name); });
  const keys = new Set(names.map(wkey)), out = [], seen = new Set();
  for (const w of DB.weapons) { const k = wkey(w.name.replace(/\s*-\s.*$/, '')); if ((keys.has(k) || keys.has(wkey(w.name)) || (w.aliases || []).some(x => keys.has(wkey(x)))) && !seen.has(w.name + w.kind)) { seen.add(w.name + w.kind); out.push(w); } }
  return out;
}
function weaponTables(ws) {
  const byH = {}; ws.forEach(w => (byH[w.kind + '|' + w.heads.join('|')] = byH[w.kind + '|' + w.heads.join('|')] || []).push(w));
  return el('div', {}, Object.values(byH).map(g => el('div', { class: 'tblw' }, el('table', { class: 'stats weap' },
    el('thead', {}, el('tr', {}, el('th', {}, g[0].kind === 'melee' ? 'Mêlée' : 'Tir'), g[0].heads.map(h => el('th', {}, h)))),
    el('tbody', {}, g.map(w => el('tr', {}, el('th', {}, w.name), w.values.map(v => el('td', {}, v)))))))));
}
function renderSheet(issues) {
  const s = $('#sheet'); s.replaceChildren();
  const errs = issues.filter(i => i.level === 'err');
  s.append(el('header', { class: 'sh-head' }, el('div', {}, el('p', { class: 'sh-over' }, 'Feuille d\'Armée — ' + modeDef().name), el('h1', {}, army.name), el('p', {}, `${army.faction}${doctrineDef() ? ' · ' + doctrineDef().name : ''}${riteDef() ? ' · Rite : ' + riteDef().name : ''} · ${army.allegiance}${army.allegiance === 'Loyaliste' ? 's' : 's'}`)),
    el('div', { class: 'sh-pts' }, el('b', {}, armyPoints()), el('span', {}, `sur ${army.limit} points`))));
  { const ex = []; if (army.legacies) ex.push('Legacies autorisées'); if (mainDef().alt) ex.push('Détachement Principal : ' + mainDef().name); if ((army.shattered || []).length) ex.push('Shattered Legions : ' + army.shattered.join(', ')); if ((army.provenances || []).length && (armyOf(army.faction) === 'mil' || army.dets.some(d => armyOf(detFaction(d)) === 'mil'))) ex.push('Provenances : ' + army.provenances.map(p => provDef(p).name).join(', ')); if (paradigm()) ex.push('Paradigme : ' + paradigm().name);
    army.dets.forEach(d => { if ((d.oaths || []).length) ex.push(detName(d) + ' — Oaths of Moment : ' + d.oaths.map(i => oathDef(i).name).join(', ')); });
    if (ex.length) s.append(el('p', { class: 'sh-extra' }, ex.join(' · '))); }
  if (errs.length) s.append(el('p', { class: 'sh-warn' }, `Liste non conforme : ${errs.length} point${errs.length > 1 ? 's' : ''} à corriger.`));
  { const r = riteDef(); if (r) s.append(el('section', { class: 'sh-rite' }, el('h2', {}, el('span', {}, 'Rite de Guerre — ' + r.name), el('i', {}, r.faction)),
      el('p', {}, el('b', {}, 'Tactica : ' + r.tactica + '. '), r.tacticaText), el('p', {}, el('b', {}, 'Posture : ' + r.posture + '. '), r.postureText))); }
  const usedRules = new Set();
  for (const det of army.dets) {
    const filled = slotsOf(det).filter(x => det.units[x.i]); if (!filled.length) continue;
    const d = el('section', { class: 'sh-det' }, el('h2', {}, el('span', {}, detName(det)), el('i', {}, `${detFaction(det)} · ${detPoints(det)} pts`)));
    for (const sl of filled) {
      const us = det.units[sl.i], u = UNITS[us.u]; if (!u) continue;
      const picks = [];

      (u.options || []).forEach((o, oi) => { const ch = optChoices(o); for (const [k, q] of Object.entries((us.opts || {})[oi] || {})) if (ch[k]) picks.push((q > 1 ? q + ' × ' : '') + ch[k].name); });
      if (us.upgrade != null && u.upgrades) picks.push(u.upgrades[us.upgrade].name);
      if (us.vow && vowDef(us.vow)) picks.push('Vœu : ' + vowDef(us.vow).name);
      const comp = u.models.map((m, mi) => `${m.count + (u.extra && u.extra.model === m.name ? (us.extra || 0) : 0)} ${mi === 0 && us.variant != null && u.variants ? u.variants[us.variant].name : m.name}`).join(', ') + (u.extra && !u.models.some(m => m.name === u.extra.model) && us.extra ? `, +${us.extra} ${u.extra.model}` : '');
      const ur = unitRules(effUnit(u, us), us); ur.forEach(r => usedRules.add(r.split(' : ').pop()));
      d.append(el('article', { class: 'sh-unit' },
        el('h3', {}, el('span', { class: 'sh-role' }, role(u.role).short), el('span', {}, u.name), el('b', {}, unitPoints(us) + ' pts')),
        el('p', { class: 'sh-comp' }, comp, det.adv[sl.i] ? el('em', {}, ` — Avantage Principal : ${advDef(det.adv[sl.i]).name}`) : null),
        statTable(u, us),
        el('p', {}, el('b', {}, 'Équipement : '), (u.wargear || []).join(', ') || '—'),
        picks.length ? el('p', {}, el('b', {}, 'Options : '), picks.join(', ')) : null,
        ur.length ? el('p', {}, el('b', {}, 'Règles : '), ur.join(', ')) : null));
    }
    s.append(d);
  }
  const seenR = new Set(), gl = [];
  for (const r of [...usedRules].sort((a, b) => a.localeCompare(b))) { const d = lookupRule(r); if (d && !seenR.has(d)) { seenR.add(d); gl.push([r.replace(/\s*\((?:[^)]*seulement|[^)]* only)\)$/, ''), d]); } }
  if (gl.length) s.append(el('section', { class: 'sh-gloss' }, el('h2', {}, el('span', {}, 'Aide-mémoire des règles')), gl.map(([n, r]) => el('p', {}, el('b', {}, n + '. '), r.summary, r.ref ? el('i', {}, ' ' + r.ref) : null))));
  s.append(el('footer', {}, `Base de données ${DB.core.version}${DB.custom ? ' (modifiée)' : ''} · Outil non officiel, à utiliser avec vos livres. Warhammer: The Horus Heresy est une marque de Games Workshop Ltd.`));
}

/* ---------- Listes & base de données ---------- */
function download(name, text) { const a = el('a', { href: URL.createObjectURL(new Blob([text], { type: 'application/json' })), download: name }); document.body.append(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500); }
function pickFile(cb, accept = '.json,application/json', parse = JSON.parse) { const i = el('input', { type: 'file', accept }); i.onchange = () => { const f = i.files[0]; if (!f) return; const r = new FileReader(); r.onload = () => { try { cb(parse(r.result)); } catch (e) { alert('Fichier illisible.\n' + e.message); } }; r.readAsText(f); }; i.click(); }
const importListFile = cb => pickFile(cb, '.txt,.json,text/plain,application/json', parseListFile);
function openLists() {
  const dlg = $('#dlg'), body = $('#dlg-body'); body.replaceChildren(); $('#dlg-title').textContent = 'Mes listes';
  const all = Object.values(store.all()).sort((a, b) => b.updated - a.updated);
  body.append(el('div', { class: 'acts' }, el('button', { class: 'btn', onclick: () => { army = newArmy(); sel = null; dlg.close(); touch(); } }, 'Nouvelle liste'),
    el('button', { class: 'btn ghost', onclick: () => importListFile(j => { if (!j.dets) return alert('Ce fichier n\'est pas une liste Forbidden Recruit.'); j.id = uid(); army = j; army.step = 3; sel = null; dlg.close(); touch(); flash('Liste importée.'); }) }, 'Importer une liste (.txt)')));
  if (!all.length) body.append(el('p', { class: 'note' }, 'Aucune liste enregistrée sur cet appareil.'));
  for (const a of all) {
    const pts = (() => { const keep = army; army = a; const p = armyPoints(); army = keep; return p; })();
    body.append(el('div', { class: 'pick' + (a.id === army.id ? ' cur' : '') }, el('span', {}, el('b', {}, a.name), el('i', {}, `${a.faction} · ${pts}/${a.limit} pts · modifiée le ${new Date(a.updated).toLocaleDateString('fr-FR')}`)),
      el('span', { class: 'acts' }, el('button', { class: 'btn', onclick: () => { army = a; sel = null; dlg.close(); LS.set('30k.last', a.id); if (!army.step) army.step = 3; render(); } }, 'Ouvrir'),
        el('button', { class: 'btn ghost', onclick: () => { const c = JSON.parse(JSON.stringify(a)); c.id = uid(); c.name += ' (copie)'; store.save(c); openLists(); } }, 'Dupliquer'),
        el('button', { class: 'btn ghost', onclick: () => { const k = army; army = a; exportPDF(); army = k; } }, 'PDF'),
        el('button', { class: 'btn ghost', onclick: () => { const k = army; army = a; exportText(); army = k; } }, 'Texte'),
        el('button', { class: 'btn ghost danger', onclick: () => { if (!confirm(`Supprimer définitivement « ${a.name} » ?`)) return; store.remove(a.id); if (a.id === army.id) { army = newArmy(); render(); } openLists(); } }, 'Supprimer'))));
  }
  body.append(el('p', { class: 'note' }, 'Les listes sont enregistrées automatiquement dans l\'application, sur cet appareil : rien à faire. « PDF » crée la feuille d\'armée, « Texte » un fichier lisible que l\'on peut aussi réimporter sur un autre appareil.'));
  dlg.showModal();
}
const APP_VERSION = '2026.11-h';
const UPDATE_DEFAULT = 'https://yaoz52.github.io/forbidden-recruit';
const updUrl = () => (LS.get('30k.updateUrl', null) || (location.protocol.startsWith('http') ? location.href.replace(/[^/]*$/, '') : UPDATE_DEFAULT) || '').trim().replace(/\/+$/, '');
async function checkUpdates(statusEl, install) {
  const base = updUrl();
  if (!base) { statusEl.textContent = 'Indiquez d\'abord l\'adresse de votre dépôt de mises à jour.'; return; }
  statusEl.textContent = 'Recherche des mises à jour…';
  try {
    const man = await (await fetch(base + '/manifest.json?t=' + Date.now(), { cache: 'no-store' })).json();
    const parts = [];
    const newData = man.dataVersion && man.dataVersion > DB.core.version;
    const newApp = man.appVersion && man.appVersion > APP_VERSION;
    if (!newData && !newApp) { statusEl.textContent = `Vous êtes à jour (application ${APP_VERSION}, données ${DB.core.version}).`; return; }
    if (newData) parts.push(`Nouvelles données ${man.dataVersion}` + (man.notes ? ` : ${man.notes}` : ''));
    if (newApp) parts.push(`Nouvelle version de l'application ${man.appVersion}`);
    statusEl.replaceChildren(el('span', {}, parts.join(' — ') + '. '));
    if (newData) statusEl.append(el('button', { class: 'btn', type: 'button', onclick: async () => {
      statusEl.textContent = 'Téléchargement…';
      try {
        const core = await (await fetch(base + '/data/core.json?t=' + Date.now(), { cache: 'no-store' })).json();
        const books = []; for (const f of core.bookFiles) books.push(await (await fetch(base + '/data/' + f + '?t=' + Date.now(), { cache: 'no-store' })).json());
        const pb = checkData({ core, books }); if (pb.length) { statusEl.textContent = 'Mise à jour refusée (fichiers incohérents) : ' + pb.slice(0, 3).join(' ; '); return; }
        if (!LS.set('30k.customData', { core, books, source: 'update' })) { statusEl.textContent = 'Espace de stockage insuffisant sur cet appareil.'; return; }
        statusEl.textContent = 'Données installées. Redémarrage…'; setTimeout(() => location.reload(), 600);
      } catch (e) { statusEl.textContent = 'Échec du téléchargement : ' + e.message; }
    } }, 'Installer les nouvelles données'));
    if (newApp) statusEl.append(' ', el('a', { class: 'btn ghost', href: base + '/' + (man.appFile || 'forbidden-recruit.html'), download: man.appFile || 'forbidden-recruit.html' }, 'Télécharger la nouvelle application'));
  } catch (e) { statusEl.textContent = 'Impossible de joindre le dépôt de mises à jour (connexion ou adresse). ' + e.message; }
}
function openSettings() {
  const dlg = $('#dlg'), body = $('#dlg-body'); body.replaceChildren(); $('#dlg-title').textContent = 'Réglages';
  const st = el('p', { class: 'note upd-status', role: 'status' });
  const url = el('input', { type: 'url', value: updUrl(), placeholder: 'https://votre-compte.github.io/forbidden-recruit-mises-a-jour', 'aria-label': 'Adresse du dépôt de mises à jour', style: 'width:100%;padding:.5rem;border:1px solid var(--rule);background:#fff;border-radius:2px' });
  body.append(
    el('h4', {}, 'Mise à jour'),
    el('p', {}, `Application ${APP_VERSION} · données ${DB.core.version}${DB.custom === 'update' ? ' (mise à jour installée)' : DB.custom ? ' (base modifiée par vous)' : ''}.`),
    el('label', { class: 'inl' }, 'Adresse de votre dépôt de mises à jour', url),
    el('div', { class: 'acts' }, el('button', { class: 'btn', type: 'button', onclick: () => { LS.set('30k.updateUrl', url.value.trim()); checkUpdates(st); } }, 'Vérifier les mises à jour'),
      el('button', { class: 'btn ghost', type: 'button', onclick: () => pickFile(j => { const d = j.core ? j : null; const pb = d ? checkData(d) : ['Ce fichier n\'est pas une base Forbidden Recruit.']; if (pb.length) return alert('Fichier refusé, rien n\'a été changé :\n\n• ' + pb.slice(0, 12).join('\n• ')); LS.set('30k.customData', { ...d, source: 'update' }); location.reload(); }) }, 'Installer une mise à jour depuis un fichier')),
    st,
    el('h4', {}, 'Mes listes'),
    el('p', { class: 'note' }, 'Vos listes sont enregistrées automatiquement dans l\'application, sur cet appareil. Pour les copier sur un autre appareil ou en garder une sauvegarde, créez un fichier de sauvegarde.'),
    el('div', { class: 'acts' },
      el('button', { class: 'btn ghost', type: 'button', onclick: () => { const all = store.all(), n = Object.keys(all).length; const blob = new Blob(['Forbidden Recruit — sauvegarde de ' + n + ' liste(s), ' + new Date().toLocaleString('fr-FR') + '\r\n#30K-SAUVEGARDE ' + btoa(unescape(encodeURIComponent(JSON.stringify(all))))], { type: 'text/plain;charset=utf-8' }); const a = el('a', { href: URL.createObjectURL(blob), download: 'forbidden-recruit-sauvegarde.txt' }); document.body.append(a); a.click(); a.remove(); flash(n + ' liste(s) sauvegardée(s).'); } }, 'Sauvegarder toutes les listes'),
      el('button', { class: 'btn ghost', type: 'button', onclick: () => pickFile(all => { const cur = store.all(); let n = 0; for (const a of Object.values(all)) if (a && a.dets) { cur[a.id] = a; n++; } LS.set('30k.lists', cur); flash(n + ' liste(s) restaurée(s).'); openSettings(); }, '.txt,text/plain', t => { const m = t.match(/#30K-SAUVEGARDE ([A-Za-z0-9+/=]+)/); if (!m) throw new Error('Ce fichier n\'est pas une sauvegarde Forbidden Recruit.'); return JSON.parse(decodeURIComponent(escape(atob(m[1])))); }) }, 'Restaurer une sauvegarde'))
  );
  { const E = DB.core.errata || []; if (E.length) { const d = el('details', {}, el('summary', {}, `FAQ et errata intégrés (${E.length})`));
    E.forEach(e => d.append(el('p', { class: 'note', lang: e.lang }, el('b', {}, e.ref + ' — '), e.text, el('i', {}, ` (${e.src})`)))); body.append(el('h4', {}, 'FAQ et errata'), d); } }
  dlg.showModal(); openDataInto(body, false);
}
function openDataInto(body, standalone) {
  body.append(el('h4', {}, 'Base de données'));
  body.append(el('p', {}, `Version ${DB.core.version}${DB.custom === 'update' ? ' — mise à jour installée' : DB.custom ? ' — fichier importé par vous' : ' — fournie avec l\'application'}. ${Object.keys(UNITS).length} unités, ${DB.detachments.length} détachements, ${Object.keys(DB.rules).length} règles résumées.`),
    el('ul', { class: 'plain' }, DB.books.map(b => el('li', {}, `${b.name} — ${(b.units || []).length} unités (${b.source || ''})`))),
    el('p', { class: 'note' }, 'Toutes les données de jeu (coûts, profils, options, détachements, résumés de règles) sont dans un fichier JSON lisible. Exportez-le, corrigez-le dans un éditeur de texte après une FAQ ou un errata, puis réimportez-le : l\'application n\'a pas besoin d\'être modifiée.'),
    el('div', { class: 'acts' },
      el('button', { class: 'btn', onclick: () => download(`forbidden-recruit-donnees-${DB.core.version}.json`, JSON.stringify({ core: DB.core, books: DB.books }, null, 1)) }, 'Exporter la base'),
      el('button', { class: 'btn ghost', onclick: () => pickFile(j => { const p = checkData(j); if (p.length) return alert('Base refusée, rien n\'a été changé :\n\n• ' + p.slice(0, 12).join('\n• ')); LS.set('30k.customData', j); location.reload(); }) }, 'Importer une base modifiée'),
      DB.custom ? el('button', { class: 'btn ghost danger', onclick: () => { if (confirm('Revenir à la base fournie avec l\'application ?')) { LS.del('30k.customData'); location.reload(); } } }, 'Revenir à la base d\'origine') : null));
}
/* Contrôle d'une base importée : on refuse plutôt que de casser les listes. */
function checkData(j) {
  const p = [];
  if (!j || !j.core || !Array.isArray(j.books)) return ['Structure attendue : { "core": {...}, "books": [...] }.'];
  const roles = j.core.roles || {}; const ids = new Set();
  for (const d of [...(j.core.detachments || []), ...j.books.flatMap(b => b.detachments || [])]) {
    if (!d.id || !d.name || !Array.isArray(d.slots)) p.push(`Détachement incomplet : ${d.id || d.name || '?'}`);
    for (const s of d.slots || []) if (!roles[s.role]) p.push(`Détachement ${d.name} : rôle inconnu « ${s.role} »`);
  }
  for (const b of j.books) for (const u of b.units || []) {
    const n = u.name || u.id || '?';
    if (!u.id || !u.name) p.push(`Unité sans id ou sans nom (${n})`);
    if (ids.has(u.id)) p.push(`Identifiant en double : ${u.id}`); ids.add(u.id);
    if (!roles[u.role]) p.push(`${n} : rôle inconnu « ${u.role} »`);
    if (typeof u.points !== 'number') p.push(`${n} : « points » doit être un nombre`);
    if (!Array.isArray(u.models) || !u.models.length) p.push(`${n} : « models » manquant`);
    for (const o of u.options || []) { for (const l of [].concat(o.list || [])) if (!j.books.some(x => (x.equipmentLists || {})[l])) p.push(`${n} : liste d'équipement inconnue « ${l} »`);
      for (const c of o.choices || []) if (typeof c.points !== 'number') p.push(`${n} : coût manquant pour « ${c.name} »`); }
  }
  return p;
}

/* ---------- Démarrage ---------- */
async function start() {
  try { await loadData(); } catch (e) { document.body.innerHTML = '<p style="padding:2rem">Impossible de charger la base de données : ' + e.message + '</p>'; return; }
  const lists = store.all(), last = LS.get('30k.last');
  army = lists[last] || Object.values(lists)[0] || newArmy(); if (!mainDet()) army = newArmy(); if (!army.step) army.step = Object.keys(mainDet().units).length ? 3 : 1;
  $('#name').addEventListener('input', e => { army.name = e.target.value; clearTimeout(saveT); saveT = setTimeout(() => { store.save(army); renderSheet(validate()); }, 400); });
  addEventListener('pagehide', () => { clearTimeout(saveT); store.save(army); });
  document.addEventListener('visibilitychange', () => { if (document.hidden) { clearTimeout(saveT); store.save(army); } });
  $('#add-det').addEventListener('click', openDetPicker);
  $('#b-lists').addEventListener('click', openLists);
  $('#b-data').addEventListener('click', openSettings);
  $('#b-print').addEventListener('click', exportPDF);
  $('#b-txt').addEventListener('click', exportText);
  $('#b-printer').addEventListener('click', () => { renderSheet(validate()); try { window.print(); } catch (e) { exportPDF(); } });
  $('#b-close').addEventListener('click', closeEditor);
  $('#dlg-x').addEventListener('click', () => $('#dlg').close());
  $('#dlg').addEventListener('click', e => { if (e.target === $('#dlg')) $('#dlg').close(); });
  $('#dbv').textContent = 'Données ' + DB.core.version;
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
  try {
    const man = await (await fetch(base + '/manifest.json?t=' + Date.now(), { cache: 'no-store' })).json();
    LS.set('30k.lastUpdateCheck', Date.now());
    if ((man.dataVersion && man.dataVersion > DB.core.version) || (man.appVersion && man.appVersion > APP_VERSION)) {
      const b = $('#update'); b.textContent = 'Mise à jour disponible — voir'; b.hidden = false;
      b.onclick = () => { openSettings(); const st = document.querySelector('#dlg-body .upd-status'); if (st) checkUpdates(st); };
    }
  } catch (e) {}
}
start();
