/* Forbidden Recruit — exports : PDF mis en page (jsPDF, hors ligne) et fichier texte lisible et réimportable. */
'use strict';

/* Données de la feuille d'armée, partagées par le PDF et le texte. */
function sheetData() {
  const issues = validate(), errs = issues.filter(i => i.level === 'err');
  const dets = [], used = new Set();
  for (const det of army.dets) {
    const filled = slotsOf(det).filter(x => det.units[x.i]); if (!filled.length) continue;
    const units = [];
    for (const sl of filled) {
      const us = det.units[sl.i], u = UNITS[us.u]; if (!u) continue;
      const picks = [];
      (u.options || []).forEach((o, oi) => { const ch = optChoices(o); for (const [k, q] of Object.entries(picksOf(us, oi))) if (ch[k]) picks.push((q > 1 ? q + L` × ` : '') + trData(ch[k].name)); });
      if (us.upgrade != null && u.upgrades) picks.push(u.upgrades[us.upgrade].name);
      if (us.vow && vowDef(us.vow)) picks.push(L`Vœu Questoris : ` + vowDef(us.vow).name);
      const comp = u.models.map((m, mi) => `${m.count + (u.extra && u.extra.model === m.name ? (us.extra || 0) : 0)} ${mi === 0 && us.variant != null && u.variants ? trData(u.variants[us.variant].name) : trData(m.name)}`).join(', ') + (u.extra && !u.models.some(m => m.name === u.extra.model) && us.extra ? `, +${us.extra} ${trData(u.extra.model)}` : '');
      const eu = effUnit(u, us) || u, rules = unitRules(eu, us); rules.forEach(r => used.add(r.split(' : ').pop()));
      let profiles = eu.profiles || u.profiles;
      if (u.variants) { const cur = us.variant != null ? u.variants[us.variant].name : u.models[0].name, one = profiles.filter(p => p.name === cur); if (one.length) profiles = one; }
      const tables = [], groups = {};
      for (const p of profiles) { const h = p.heads || (p.vehicle ? DB.core.vehicleHeads : DB.core.statHeads); (groups[h.join('|')] = groups[h.join('|')] || { heads: h, rows: [] }).rows.push(p); }
      Object.values(groups).forEach(g => tables.push(g));
      const weapons = (typeof unitWeapons === 'function' ? unitWeapons(u, us) : []).map(w => ({ name: w.name, kind: w.kind, line: w.heads.map((h, i) => w.values[i] && w.values[i] !== '-' ? `${trData(h)} ${trData(w.values[i])}` : '').filter(Boolean).join(' · ') }));
      if (us.embark) { const [did, si] = us.embark.split(':'), td = army.dets.find(d => d.id === did), t = td && td.units[si]; if (t && UNITS[t.u]) picks.push(L`Embarquée : ` + UNITS[t.u].name); }
      if (us.arcana) picks.push(L`Techno-arcane : ` + us.arcana);
      units.push({ photo: us.photo && typeof photoURL === 'function' && photoURL(us.photo.id) ? us.photo : null, weapons, legacy: !!u.legacy, name: (us.label ? us.label + ' — ' + trData(u.name) : u.name) + (isExpanded(u, us) ? L` (Expanded)` : ''), role: role(u.role).short, roleName: role(u.role).name, points: unitPoints(us), comp, adv: det.adv[sl.i] ? advDef(det.adv[sl.i]).name : '', tables, wargear: currentWargear(u, us), picks, rules });
    }
    dets.push({ name: detName(det), kind: KIND[detDef(det.type).kind], faction: detFaction(det), points: detPoints(det), units, oaths: (det.oaths || []).map(id => oathDef(id).name).concat(det.panoplyLegion ? [L`Panoply: ` + det.panoplyLegion] : []) });
  }
  const seen = new Set(), gloss = [];
  for (const r of [...used].sort((a, b) => a.localeCompare(b))) { const d = lookupRule(r); if (d && !seen.has(d)) { seen.add(d); gloss.push({ name: r.replace(/\s*\((?:[^)]*seulement|[^)]* only)\)$/, ''), text: d.summaryEn || d.summary, ref: d.ref || '' }); } }
  const extras = [];
  if (army.legacies) extras.push([L`Legacies`, L`unités Legacies autorisées`]);
  if (mainDef().alt) extras.push([L`Détachement Principal`, mainDef().name + ' (' + mainDef().source + ')']);
  if (army.faction === 'Shattered Legions' && (army.shattered || []).length) extras.push([L`Shattered Legions`, army.shattered.map(Lg => Lg + ' — ' + ((DB.core.shattered.benefits[Lg] || {}).name || '')).join(' ; ') + (army.shattered.length === 2 ? L` ; Bound in Blood` : '')]);
  if ((army.provenances || []).length && (armyOf(army.faction) === 'mil' || army.dets.some(d => armyOf(detFaction(d)) === 'mil'))) extras.push([L`Provenances of War`, army.provenances.map(p => provDef(p).name).join(', ')]);
  if (paradigm()) extras.push([L`Paradigme de Maisonnée`, paradigm().name + ' — ' + paradigm().summary]);
  const out = { extras, title: army.name, mode: modeDef().name, faction: army.faction, doctrine: doctrineDef() ? doctrineDef().name : '', rite: riteDef(), allegiance: army.allegiance, points: armyPoints(), limit: army.limit, errors: errs.map(e => e.msg), dets, gloss, version: DB.core.version + (DB.custom ? L` (modifiée)` : '') };
  if (LANG === 'fr') return out;
  const tr = (x, k) => k === 'title' || k === 'photo' ? x : typeof x === 'string' ? trData(x) : Array.isArray(x) ? x.map(y => tr(y)) : x && typeof x === 'object' ? Object.fromEntries(Object.entries(x).map(([a, b]) => [a, tr(b, a)])) : x;
  return tr(out);
}
const fileBase = () => (army.name || 'liste').replace(/[\\/:*?"<>|]+/g, '').replace(/\s+/g, ' ').trim() || 'liste';

/* ---------- PDF ---------- */
/* Avec ou sans les photos : la question n'est posée que si la liste a des photos */
function exportPDF(opts) {
  if (!opts || opts instanceof Event) {
    if (typeof armyHasPhotos === 'function' && armyHasPhotos()) return askPdfPhotos();
    opts = {};
  }
  buildPDF(opts);
}
function askPdfPhotos() {
  const d = $('#dlg'), b = $('#dlg-body'); $('#dlg-title').textContent = L`Créer le PDF`;
  const go = ph => { d.close(); buildPDF({ photos: ph }); };
  b.replaceChildren(el('p', {}, L`Votre liste contient des photos d'unités. Les inclure dans le PDF ?`),
    el('div', { class: 'choices wide pdfask' },
      el('button', { type: 'button', class: 'choice', onclick: () => go(true) }, el('b', {}, L`Avec les photos`), el('i', {}, L`Chaque unité avec sa photo, à la taille choisie (petite, grande ou profil).`)),
      el('button', { type: 'button', class: 'choice', onclick: () => go(false) }, el('b', {}, L`Sans les photos`), el('i', {}, L`Feuille plus légère, idéale à imprimer.`))));
  d.showModal(); const f = b.querySelector('button'); f && f.focus();
}
async function buildPDF(opts = {}) {
  const JS = window.jspdf && window.jspdf.jsPDF;
  if (!JS) { flash(L`Le module PDF n'est pas chargé.`); return; }
  const D = sheetData();
  const PIC = new Map();
  if (opts.photos) { flash(L`Préparation des photos…`); for (const d of D.dets) for (const u of d.units) if (u.photo) { const c = await photoCrop(u.photo, u.photo.mode || 's'); if (c) PIC.set(u, c); } }
  const doc = new JS({ unit: 'mm', format: 'a4', compress: true });
  const W = 210, H = 297, M = 14, CW = W - 2 * M;
  const C = { ink: [37, 35, 30], dark: [32, 36, 42], brass: [150, 118, 47], brassL: [201, 168, 90], paper: [250, 248, 241], rule: [189, 183, 166], grey: [93, 90, 81], red: [126, 31, 27] };
  const col = (c, t = 'text') => t === 'fill' ? doc.setFillColor(...c) : t === 'draw' ? doc.setDrawColor(...c) : doc.setTextColor(...c);
  // jsPDF standard fonts are WinAnsi : replace the few characters outside it
  const T = s => String(s == null ? '' : s).replace(/[   ]/g, ' ').replace(/[‐‑–]/g, '-').replace(/[“”«»]/g, '"').replace(/’/g, "'");
  let y = 0, page = 0;
  const footer = () => {
    doc.setFont('helvetica', 'normal'); doc.setFontSize(7); col(C.grey);
    doc.text(T(L`${D.title} · ${D.points} / ${D.limit} pts`), M, H - 8);
    doc.text(T(L`Forbidden Recruit · données ${D.version} · outil non officiel`), W / 2 + 20, H - 8, { align: 'center' });
    doc.text(String(page), W - M, H - 8, { align: 'right' });
    col(C.rule, 'draw'); doc.setLineWidth(0.2); doc.line(M, H - 11, W - M, H - 11);
  };
  const newPage = first => {
    if (!first) { footer(); doc.addPage(); }
    page++;
    col(C.paper, 'fill'); doc.rect(0, 0, W, H, 'F');
    if (first) {
      col(C.dark, 'fill'); doc.rect(0, 0, W, 46, 'F');
      col(C.brass, 'fill'); doc.rect(0, 46, W, 1.2, 'F');
      let X = M; if (window.APP_LOGO) { try { doc.addImage(window.APP_LOGO, 'JPEG', M, 8, 30, 30); X = M + 35; } catch (e) {} }
      doc.setFont('helvetica', 'normal'); doc.setFontSize(7.5); col(C.brassL); doc.setCharSpace(0.9);
      doc.text(T(L`FEUILLE D'ARMÉE — ` + D.mode.toUpperCase()), X, 13); doc.setCharSpace(0);
      doc.setFont('times', 'bold'); doc.setFontSize(24); col([246, 242, 230]);
      const tl = doc.splitTextToSize(T(D.title), CW - 52 - (X - M)); doc.text(tl[0], X, 25);
      doc.setFont('helvetica', 'normal'); doc.setFontSize(9.5); col([201, 196, 181]);
      doc.text(T([D.faction, D.doctrine, D.rite && D.rite.name, D.allegiance].filter(Boolean).join('  ·  ')), X, 35);
      doc.setFont('times', 'bold'); doc.setFontSize(30); col(D.points > D.limit ? [233, 134, 124] : [246, 242, 230]);
      doc.text(String(D.points), W - M, 27, { align: 'right' });
      doc.setFont('helvetica', 'normal'); doc.setFontSize(8.5); col([169, 164, 152]);
      doc.text(T(L`sur ${D.limit} points`), W - M, 34, { align: 'right' });
      y = 56;
    } else {
      col(C.dark, 'fill'); doc.rect(0, 0, W, 9, 'F');
      doc.setFont('helvetica', 'normal'); doc.setFontSize(7.5); col(C.brassL);
      doc.text(T(D.title), M, 6); doc.text(T(L`${D.points} / ${D.limit} pts`), W - M, 6, { align: 'right' });
      y = 18;
    }
  };
  const need = h => { if (y + h > H - 16) newPage(false); };
  const para = (label, text, size = 8.6) => {
    doc.setFontSize(size);
    doc.setFont('helvetica', 'bold'); const lw = label ? doc.getTextWidth(T(label)) + 1.2 : 0;
    doc.setFont('times', 'normal');
    const lines = doc.splitTextToSize(T(text), CW - 4 - lw);
    const lh = size * 0.42;
    need(lines.length * lh + 1); doc.setFontSize(size);
    if (label) { doc.setFont('helvetica', 'bold'); col(C.ink); doc.text(T(label), M + 2, y); }
    doc.setFont('times', 'normal'); col(C.ink);
    lines.forEach((l, i) => doc.text(l, M + 2 + lw, y + i * lh));
    y += lines.length * lh + 1.2;
  };
  const measureUnit = u => {
    let h = 12;
    u.tables.forEach(t => h += 5 + t.rows.length * 4.6 + 2);
    doc.setFontSize(8.6); doc.setFont('times', 'normal');
    [[L`Équipement : `, u.wargear.join(', ') || '—'], [L`Options : `, u.picks.join(', ')], [L`Règles : `, u.rules.join(', ')]].forEach(([l, t]) => { if (t) h += doc.splitTextToSize(T(t), CW - 30).length * 3.7 + 1.2; });
    return h + 4;
  };
  const table = t => {
    const nameW = 44, cw = Math.min(11, (CW - 4 - nameW) / t.heads.length), x0 = M + 2;
    need(5 + t.rows.length * 4.6 + 2);
    doc.setFont('helvetica', 'bold'); doc.setFontSize(6.8); col(C.grey);
    t.heads.forEach((h, i) => doc.text(T(h), x0 + nameW + i * cw + cw / 2, y, { align: 'center' }));
    y += 1.3; col(C.ink, 'draw'); doc.setLineWidth(0.35); doc.line(x0, y, x0 + nameW + t.heads.length * cw, y);
    y += 3.6;
    t.rows.forEach((r, ri) => {
      if (ri % 2 === 0) { col([241, 237, 226], 'fill'); doc.rect(x0, y - 3.2, nameW + t.heads.length * cw, 4.6, 'F'); }
      doc.setFont('times', 'normal'); doc.setFontSize(8.4); col(C.ink);
      doc.text(doc.splitTextToSize(T(r.name), nameW - 2)[0], x0 + 1, y);
      r.stats.forEach((v, i) => doc.text(T(v), x0 + nameW + i * cw + cw / 2, y, { align: 'center' }));
      y += 4.6;
    });
    y += 1.5;
  };
  newPage(true);
  if (D.errors.length) {
    const lines = doc.splitTextToSize(T(L`Liste non conforme : ` + D.errors.join(' — ')), CW - 6);
    doc.setFontSize(8); const h = lines.slice(0, 6).length * 3.5 + 4;
    col(C.red, 'draw'); doc.setLineWidth(0.4); doc.rect(M, y - 4, CW, h);
    doc.setFont('helvetica', 'normal'); col(C.red); lines.slice(0, 6).forEach((l, i) => doc.text(l, M + 3, y + i * 3.5));
    y += h + 2;
  }
  if (D.rite) {
    const r = D.rite; doc.setFontSize(8.6); doc.setFont('times', 'normal');
    const l1 = doc.splitTextToSize(T(r.tacticaText), CW - 34), l2 = doc.splitTextToSize(T(r.postureText), CW - 34);
    const h = 14 + (l1.length + l2.length) * 3.7 + 3;
    col([238, 232, 214], 'fill'); doc.rect(M, y - 4, CW, h, 'F'); col(C.brass, 'fill'); doc.rect(M, y - 4, 1.2, h, 'F');
    doc.setFont('helvetica', 'normal'); doc.setFontSize(7); col(C.brass); doc.setCharSpace(0.6); doc.text(T(L`RITE DE GUERRE`), M + 4, y); doc.setCharSpace(0);
    doc.setFont('times', 'bold'); doc.setFontSize(12); col(C.ink); doc.text(T(r.name), M + 4, y + 5.5);
    let yy = y + 11;
    [[r.tactica, l1], [r.posture, l2]].forEach(([n, ls]) => { doc.setFont('helvetica', 'bold'); doc.setFontSize(7.4); col(C.ink); doc.text(doc.splitTextToSize(T(n), 25), M + 4, yy);
      doc.setFont('times', 'normal'); doc.setFontSize(8.6); ls.forEach((l, k) => doc.text(l, M + 31, yy + k * 3.7)); yy += ls.length * 3.7 + 1.5; });
    y += h + 6;
  }
  if (D.extras.length) {
    doc.setFontSize(8.4); doc.setFont('times', 'normal');
    const ls = D.extras.map(([k, v]) => [k, doc.splitTextToSize(T(v), CW - 40)]); const h = 4 + ls.reduce((a, [, l]) => a + l.length * 3.6 + 1.2, 0);
    need(h + 4); col(C.rule, 'draw'); doc.setLineWidth(0.3); doc.rect(M, y - 4, CW, h);
    let yy = y; for (const [k, l] of ls) { doc.setFont('helvetica', 'bold'); doc.setFontSize(7.2); col(C.ink); doc.text(T(k), M + 3, yy); doc.setFont('times', 'normal'); doc.setFontSize(8.4); l.forEach((x, i) => doc.text(x, M + 38, yy + i * 3.6)); yy += l.length * 3.6 + 1.2; }
    y += h + 4;
  }
  for (const d of D.dets) {
    need(16 + (d.units[0] ? Math.min(measureUnit(d.units[0]), 60) : 0));
    doc.setFont('times', 'bold'); doc.setFontSize(13.5); col(C.ink);
    doc.text(T(d.name.toUpperCase()), M, y);
    doc.setFont('helvetica', 'normal'); doc.setFontSize(7.6); col(C.grey);
    doc.text(T(L`${d.kind} · ${d.faction} · ${d.points} pts`), W - M, y, { align: 'right' });
    if (d.oaths && d.oaths.length) { doc.setFontSize(7.2); doc.text(T(L`Oaths of Moment : ` + d.oaths.join(', ')), W - M, y + 4.5, { align: 'right' }); }
    y += 2; col(C.ink, 'draw'); doc.setLineWidth(0.6); doc.line(M, y, W - M, y); doc.setLineWidth(0.2); doc.line(M, y + 0.9, W - M, y + 0.9);
    y += 7;
    for (const u of d.units) {
      need(Math.min(measureUnit(u), 120));
      const pic = PIC.get(u), pm = u.photo && (u.photo.mode || 's');
      if (pic && pm === 'l') { const bw = CW - 10, bh = bw * 420 / 1200; need(bh + 34); try { doc.addImage(pic.data, pic.fmt, M + 10, y + 2, bw, bh); } catch (e) {} y += bh + 8; }
      // badge de rôle
      col(C.ink, 'fill'); doc.circle(M + 3.4, y - 1.4, 3.4, 'F'); col(C.brass, 'draw'); doc.setLineWidth(0.5); doc.circle(M + 3.4, y - 1.4, 3.9);
      doc.setFont('helvetica', 'bold'); doc.setFontSize(5.8); col([246, 242, 230]); doc.text(T(u.role), M + 3.4, y - 0.4, { align: 'center' });
      const nx = M + 10 + (pic && pm !== 'l' ? 19 : 0), y0 = y;
      if (pic && pm !== 'l') { try { doc.addImage(pic.data, pic.fmt, M + 10, y - 4.2, 16, 16); } catch (e) {} if (pm === 's') { col(C.rule, 'draw'); doc.setLineWidth(0.3); doc.rect(M + 10, y - 4.2, 16, 16); } else { col(C.brass, 'draw'); doc.setLineWidth(0.5); doc.circle(M + 18, y + 3.8, 8); } }
      doc.setFont('times', 'bold'); doc.setFontSize(11.5); col(C.ink); doc.text(T(u.name), nx, y);
      doc.setFont('times', 'bold'); doc.setFontSize(11); doc.text(T(u.points + L` pts`), W - M, y, { align: 'right' });
      y += 4.6;
      doc.setFont('times', 'italic'); doc.setFontSize(8.6); col(C.grey);
      const cl = doc.splitTextToSize(T(u.comp + (u.adv ? L`  —  Avantage Principal : ` + u.adv : '')), CW - 12 - (nx - M - 10)); cl.forEach((l, i) => doc.text(l, nx, y + i * 3.6)); y += cl.length * 3.6 + 2;
      if (pic && pm !== 'l') y = Math.max(y, y0 + 14);
      u.tables.forEach(table);
      para(L`Équipement : `, u.wargear.join(', ') || '—');
      if (u.picks.length) para(L`Options : `, u.picks.join(', '));
      if (u.rules.length) para(L`Règles : `, u.rules.join(', '));
      for (const w of u.weapons || []) para((w.kind === 'melee' ? L`Mêlée — ` : L`Tir — `) + w.name + ' : ', w.line, 7.8);
      y += 1; col(C.rule, 'draw'); doc.setLineWidth(0.15); doc.line(M + 10, y, W - M, y); y += 5;
    }
    y += 2;
  }
  if (D.gloss.length) {
    need(20);
    doc.setFont('times', 'bold'); doc.setFontSize(13.5); col(C.ink); doc.text(T(L`AIDE-MÉMOIRE DES RÈGLES`), M, y);
    y += 2; col(C.brass, 'draw'); doc.setLineWidth(0.6); doc.line(M, y, W - M, y); y += 6;
    for (const g of D.gloss) {
      doc.setFontSize(8.2); doc.setFont('helvetica', 'bold'); const lw = doc.getTextWidth(T(g.name + '. '));
      doc.setFont('times', 'normal'); const lines = doc.splitTextToSize(T(g.text + (g.ref ? '  (' + g.ref + ')' : '')), CW - lw - 2);
      need(lines.length * 3.5 + 1.5); doc.setFontSize(8.2);
      doc.setFont('helvetica', 'bold'); col(C.ink); doc.text(T(g.name + '. '), M, y);
      doc.setFont('times', 'normal'); lines.forEach((l, i) => doc.text(l, M + lw, y + i * 3.5));
      y += lines.length * 3.5 + 1.6;
    }
  }
  need(10); doc.setFont('helvetica', 'normal'); doc.setFontSize(6.8); col(C.grey);
  doc.text(T(L`Warhammer: The Horus Heresy est une marque de Games Workshop Ltd. Outil non officiel, à utiliser avec vos livres.`), M, y + 4);
  footer();
  doc.setProperties({ title: D.title, subject: L`Feuille d'armée Warhammer: The Horus Heresy`, creator: L`Forbidden Recruit` });
  const name = fileBase() + '.pdf';
  try { saveFile(name, doc.output('blob')).then(ok => { if (ok && NATIVE !== 'android') flash(L`PDF créé : ${name} (dossier Téléchargements).`); }); }
  catch (e) { window.open(doc.output('bloburl'), '_blank'); }
}

/* ---------- Texte ---------- */
function exportText() {
  const D = sheetData(), OUT = [];
  const line = (c = '=') => OUT.push(c.repeat(64));
  line(); OUT.push(D.title.toUpperCase()); OUT.push(`${D.mode} · ${[D.faction, D.doctrine, D.rite && D.rite.name, D.allegiance].filter(Boolean).join(' · ')}`); OUT.push(L`${D.points} / ${D.limit} points`); line();
  if (D.rite) OUT.push('', L`RITE DE GUERRE : ${D.rite.name}`, L`  Tactica — ${D.rite.tactica} : ${D.rite.tacticaText}`, L`  Posture — ${D.rite.posture} : ${D.rite.postureText}`);
  for (const [k, v] of D.extras) OUT.push(`${k} : ${v}`);
  if (D.errors.length) { OUT.push('', L`LISTE NON CONFORME :`); D.errors.forEach(e => OUT.push('  ! ' + e)); }
  for (const d of D.dets) {
    OUT.push('', L`${d.name.toUpperCase()}  (${d.faction}, ${d.points} pts)`); line('-');
    for (const u of d.units) {
      OUT.push(L`[${u.role}] ${u.name} .... ${u.points} pts`);
      OUT.push(`     ${u.comp}${u.adv ? L` — Avantage Principal : ` + u.adv : ''}`);
      if (u.picks.length) OUT.push(L`     Options : ${u.picks.join(', ')}`);
      if (u.rules.length) OUT.push(L`     Règles : ${u.rules.join(', ')}`);
      for (const w of u.weapons || []) OUT.push(`     ${w.kind === 'melee' ? L`Mêlée` : L`Tir`} — ${w.name} : ${w.line}`);
    }
  }
  OUT.push('', L`Base de données ${D.version} — Forbidden Recruit (outil non officiel)`, '');
  OUT.push(L`Ne pas modifier la ligne ci-dessous : elle permet de réimporter la liste dans Forbidden Recruit.`);
  OUT.push('#30K-LISTE ' + btoa(unescape(encodeURIComponent(JSON.stringify(army)))));
  const blob = new Blob([OUT.join('\r\n')], { type: 'text/plain;charset=utf-8' });
  saveFile(fileBase() + '.txt', blob);
  if (NATIVE !== 'android') flash(L`Liste exportée : ${fileBase()}.txt (dossier Téléchargements).`);
}
/* Lit une liste depuis un fichier .txt exporté (ou un ancien .json). */
function parseListFile(text) {
  const m = text.match(/#30K-LISTE ([A-Za-z0-9+/=]+)/);
  if (m) return JSON.parse(decodeURIComponent(escape(atob(m[1]))));
  return JSON.parse(text);
}
