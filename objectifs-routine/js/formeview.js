// Feuilles et vues « forme » : check-in du matin, journal du soir, bilan de
// la semaine. Trimé pour l'app "Objectifs & Routine" le 2026-09-24 : plus
// de charge d'entraînement (charge.js/sport.js), de manques diète
// (nutrition.js) ni de poids/composition (corps.js) — ces modules vivent
// dans "Diète & Sport". Le bilan ne porte plus que sur les habitudes de
// cette app, la forme et le journal.

import { esc, escLines, openSheet, toast } from "./ui.js";
import { state, save, dayKey, weekDayKeys } from "./state.js";
import {
  CHECKIN, checkinFor, formeScore, formeAdvice, sleepOption, saveCheckin, saveSleepHours, checkinStreak,
  saveJournal, journalFor, topStreaks, averageOf, dayData
} from "./forme.js";
import { weekWorkouts, fmtDuration } from "./routines.js";
import {
  weekStartAt, weekDates, computeTotalRate, sectionRates, trackedItems, formatPercent, rateClass
} from "./objectives.js";

const MONTHS = ["janv.", "févr.", "mars", "avr.", "mai", "juin", "juil.", "août", "sept.", "oct.", "nov.", "déc."];

// --------------------------------------------------------- check-in matin

export function openCheckin() {
  const today = dayData();
  const values = {};
  for (const q of CHECKIN) if (today[q.key]) values[q.key] = today[q.key];
  // Sommeil importé (Sleep Cycle / Apple Santé) : réponse proposée d'office.
  if (!values.sommeil_q && sleepOption(today.sommeil)) values.sommeil_q = sleepOption(today.sommeil);
  const done = () => CHECKIN.every((q) => values[q.key]);

  openSheet("☀️ Check-in du matin", function (body, close) {
    function render() {
      const complete = done();
      const score = complete ? formeScore(values) : null;
      const adv = score ? formeAdvice(score) : null;
      const hours = dayData().sommeil;
      body.innerHTML =
        // Le chiffre exact, lu sur Sleep Cycle au réveil. Facultatif : les
        // pastilles suffisent, mais il aligne la réponse et affine la moyenne.
        '<label class="ck-hours"><span>Heures de sommeil <small>facultatif</small></span>' +
          '<input type="text" inputmode="decimal" autocomplete="off" id="ck-hours" ' +
            'value="' + (hours === undefined ? "" : hours) + '" placeholder="7,2"></label>' +
        CHECKIN.map(function (q) {
          return '<div class="ck-row"><span class="ck-label">' + esc(q.label) + "</span>" +
            '<div class="ck-opts">' + q.opts.map(function (o, i) {
              const v = i + 1;
              return '<button type="button" class="ck-chip' + (values[q.key] === v ? " is-active" : "") +
                '" data-q="' + q.key + '" data-v="' + v + '">' +
                '<span class="ck-emoji">' + o[0] + '</span><span class="ck-text">' + esc(o[1]) + "</span></button>";
            }).join("") + "</div></div>";
        }).join("") +
        (complete
          ? '<div class="forme-result is-' + adv.level + '">' +
              '<span class="forme-face">' + adv.face + "</span>" +
              '<span class="forme-score">' + score + "<small>/10</small></span>" +
              '<span class="forme-label">' + esc(adv.label) + "</span>" +
              '<span class="forme-hint">' + esc(adv.hint) + "</span>" +
            "</div>" +
            '<button type="button" class="btn btn-primary btn-block" data-act="ok">C\'est noté</button>'
          : '<p class="hint">Quatre taps, c\'est tout. Le score s\'affiche tout seul.</p>');

      // `change` et pas `input` : un rendu à chaque frappe volerait le focus.
      body.querySelector("#ck-hours").addEventListener("change", function (e) {
        const res = saveSleepHours(e.target.value);
        if (res === false) { toast("Heures de sommeil : valeur impossible", "error"); return; }
        if (res !== null && sleepOption(res)) values.sommeil_q = sleepOption(res);
        if (done()) saveCheckin(values);
        render();
      });

      body.querySelectorAll(".ck-chip").forEach((b) => b.addEventListener("click", function () {
        values[b.dataset.q] = parseInt(b.dataset.v, 10);
        if (done()) {
          const s = saveCheckin(values);
          try { if (navigator.vibrate) navigator.vibrate(s >= 8 ? [40, 40, 40] : 40); } catch (e) { /* rien */ }
        }
        render();
      }));
      const ok = body.querySelector('[data-act="ok"]');
      if (ok) ok.addEventListener("click", function () {
        close();
        const st = checkinStreak();
        toast(st.current >= 2 ? "🔥 " + st.current + " jours de check-in d'affilée" : "Forme du jour notée");
      });
    }
    render();
  });
}

// --------------------------------------------------------- journal du soir

export function openJournal(key) {
  const k = key || dayKey();
  const j = journalFor(k) || { note: null, reussites: "", bloque: "" };
  openSheet("🌙 Journal du soir", function (body, close) {
    body.innerHTML =
      '<div class="field"><span>Ma journée, sur 10</span><div class="chips note-chips" id="jn-note">' +
        [1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((v) =>
          '<button type="button" class="chip' + (j.note === v ? " is-active" : "") + '" data-v="' + v + '">' + v + "</button>").join("") +
      "</div></div>" +
      '<label class="field"><span>Mes réussites du jour</span>' +
        '<textarea id="jn-ok" class="input" rows="4" maxlength="600" placeholder="Ce que j\'ai réussi, même petit : respiration du retour, routine faite…">' + esc(j.reussites) + "</textarea></label>" +
      '<label class="field"><span>Ce qui a bloqué (optionnel)</span>' +
        '<input type="text" id="jn-ko" class="input" maxlength="400" placeholder="Fatigue, temps, douleur…" value="' + esc(j.bloque) + '"></label>' +
      '<div class="sheet-actions"><button type="button" class="btn btn-ghost" data-act="c">Annuler</button>' +
      '<button type="button" class="btn btn-primary" data-act="ok">Enregistrer</button></div>';
    let note = j.note;
    const box = body.querySelector("#jn-note");
    box.addEventListener("click", function (e) {
      const c = e.target.closest(".chip");
      if (!c) return;
      note = parseInt(c.dataset.v, 10);
      box.querySelectorAll(".chip").forEach((x) => x.classList.toggle("is-active", x === c));
    });
    body.querySelector('[data-act="c"]').addEventListener("click", close);
    body.querySelector('[data-act="ok"]').addEventListener("click", function () {
      saveJournal({ note: note, reussites: body.querySelector("#jn-ok").value, bloque: body.querySelector("#jn-ko").value }, k);
      close();
      toast("Journal enregistré");
    });
    body.querySelector("#jn-ok").focus();
  });
}

// -------------------------------------------------------------- cartes

// Accueil : forme du matin, journal du soir, lien vers le bilan.
export function homeForme() {
  const ck = checkinFor();
  const st = checkinStreak();
  let html = "";
  if (ck) {
    const adv = formeAdvice(ck.forme);
    html += '<button type="button" class="forme-card is-' + adv.level + '" data-act="open-checkin">' +
      '<span class="forme-face">' + adv.face + "</span>" +
      '<span class="forme-main"><strong>Forme ' + ck.forme + "/10 · " + esc(adv.label) + "</strong>" +
        "<span>" + esc(adv.hint) + "</span></span>" +
      (st.current >= 2 ? '<span class="forme-streak">🔥 ' + st.current + " j</span>" : "") +
      "</button>";
  } else {
    html += '<button type="button" class="forme-card is-todo" data-act="open-checkin">' +
      '<span class="forme-face">☀️</span>' +
      '<span class="forme-main"><strong>Check-in du matin</strong><span>Quatre taps, dix secondes : ta forme et la consigne du jour.</span></span>' +
      (st.current >= 2 ? '<span class="forme-streak">🔥 ' + st.current + " j</span>" : "") +
      "</button>";
  }
  const j = journalFor();
  html += '<button type="button" class="forme-card is-night" data-act="open-journal">' +
    '<span class="forme-face">🌙</span>' +
    '<span class="forme-main"><strong>' + (j ? "Journée " + (j.note ? j.note + "/10" : "notée") : "Journal du soir") + "</strong>" +
      "<span>" + esc(j && j.reussites ? j.reussites.split("\n")[0].slice(0, 90) : "Mes réussites du jour, en deux lignes.") + "</span></span>" +
    "</button>";
  html += '<a class="row-link" href="#/bilan">📋 Bilan de la semaine</a>';
  return html;
}

// ------------------------------------------------------------- bilan

function weekLabel(start) {
  const end = new Date(start.getTime()); end.setDate(end.getDate() + 6);
  return start.getDate() + " " + MONTHS[start.getMonth()] + " → " + end.getDate() + " " + MONTHS[end.getMonth()];
}

export function weeklyReview(offset) {
  const off = parseInt(offset, 10) || 0;
  const start = weekStartAt(off);
  const dates = weekDates(start);
  const keys = weekDayKeys(start);
  const items = trackedItems();
  const ws = weekWorkouts(start);
  const sections = sectionRates(dates).sort((a, b) => (a.rate === null ? 2 : a.rate) - (b.rate === null ? 2 : b.rate));
  const journal = keys.map((k) => ({ key: k, j: journalFor(k) })).filter((x) => x.j);
  // Les rubriques les plus basses d'abord — sans charge d'entraînement ni
  // manque diète ici, ce sont elles qui portent tout le signal.
  const fixes = [];
  for (const s of sections) {
    if (fixes.length >= 3) break;
    if (s.rate !== null && s.rate < 0.7) fixes.push({ kind: "rubrique", text: s.section.icon + " " + (s.section.short || s.section.label) + " à " + formatPercent(s.rate) });
  }
  return {
    offset: off, start: start, label: weekLabel(start),
    total: computeTotalRate(items, dates), sections: sections,
    sessions: { total: ws.length, minutes: Math.round(ws.reduce((a, w) => a + (w.duration || 0), 0) / 60) },
    forme: averageOf("forme", keys), sommeil: averageOf("sommeil", keys), journee: averageOf("journee", keys),
    journal: journal, streaks: topStreaks(3), fixes: fixes.slice(0, 3)
  };
}

export function viewBilan(offset) {
  const r = weeklyReview(offset);
  let html = '<div class="view">';
  html += '<header class="view-head"><h1>Bilan de la semaine</h1></header>';
  html += '<nav class="week-nav">' +
    '<a class="btn btn-small" href="#/bilan?w=' + (r.offset - 1) + '" aria-label="Semaine précédente">←</a>' +
    '<span class="week-label">' + esc(r.label) + "</span>" +
    '<a class="btn btn-small" href="#/bilan?w=' + (r.offset + 1) + '" aria-label="Semaine suivante">→</a>' +
    (r.offset !== 0 ? '<a class="btn btn-small btn-ghost" href="#/bilan?w=0">Cette semaine</a>' : "") +
  "</nav>";

  html += '<section class="rate-hero">' +
    '<div class="rate-tile ' + rateClass(r.total) + '"><span class="rate-label">Réussite</span><span class="rate-value">' + formatPercent(r.total) + "</span></div>" +
    '<div class="rate-tile rate-none"><span class="rate-label">Routines</span><span class="rate-value">' + r.sessions.total + " · " + fmtDuration(r.sessions.minutes * 60) + "</span></div>" +
  "</section>";
  html += '<p class="hint">' + r.sessions.total + " routine" + (r.sessions.total > 1 ? "s" : "") + " · " + r.sessions.minutes + " min" +
    (r.forme ? " · forme " + r.forme + "/10" : "") + (r.sommeil ? " · sommeil " + r.sommeil + " h" : "") + (r.journee ? " · journées " + r.journee + "/10" : "") + "</p>";

  if (r.fixes.length) {
    html += '<div class="block-head"><h2>À corriger en priorité</h2></div><ol class="bilan-list is-fix">' +
      r.fixes.map((f) => "<li>" + esc(f.text) + "</li>").join("") + "</ol>";
  } else {
    html += '<p class="callout callout-static">Rien qui décroche : tout est au-dessus de 70 %.</p>';
  }

  if (r.sections.length) {
    html += '<div class="block-head"><h2>Par rubrique</h2></div><ul class="bilan-rates">' +
      r.sections.map((s) => '<li><span>' + esc(s.section.icon + " " + (s.section.short || s.section.label)) + '</span><strong class="' + rateClass(s.rate) + '">' + formatPercent(s.rate) + "</strong></li>").join("") + "</ul>";
  }

  if (r.streaks.length) {
    html += '<div class="block-head"><h2>Séries en cours</h2></div><ul class="bilan-list">' +
      r.streaks.map((x) => "<li>🔥 " + x.s.current + " " + x.s.unit + (x.s.current > 1 ? "s" : "") + " · " + esc(x.item.title) + "</li>").join("") + "</ul>";
  }

  html += '<div class="block-head"><h2>Mes réussites</h2></div>';
  if (r.journal.length) {
    html += '<ul class="bilan-journal">' + r.journal.map(function (x) {
      const d = new Date(x.key + "T12:00:00");
      return "<li><strong>" + esc(d.toLocaleDateString("fr-FR", { weekday: "short", day: "numeric" })) + (x.j.note ? " · " + x.j.note + "/10" : "") + "</strong>" +
        (x.j.reussites ? "<span>" + escLines(x.j.reussites) + "</span>" : "") +
        (x.j.bloque ? '<span class="bilan-ko">Bloqué : ' + escLines(x.j.bloque) + "</span>" : "") + "</li>";
    }).join("") + "</ul>";
  } else {
    html += '<p class="empty">Aucun journal du soir cette semaine. Le soir, depuis l\'accueil : deux lignes suffisent.</p>';
  }

  html += '<div class="sheet-actions" style="margin-top:16px">' +
    '<button type="button" class="btn btn-primary btn-block" data-act="copy-bilan" data-w="' + r.offset + '">📋 Copier le bilan</button></div>';

  html += "</div>";
  return html;
}

export function bilanMarkdown(offset) {
  const r = weeklyReview(offset);
  const out = ["# Bilan de la semaine — " + r.label, ""];
  out.push("- Réussite globale : " + formatPercent(r.total));
  out.push("- Routines : " + r.sessions.total + ", " + r.sessions.minutes + " min");
  if (r.forme) out.push("- Forme moyenne : " + r.forme + "/10");
  if (r.sommeil) out.push("- Sommeil moyen : " + r.sommeil + " h");
  if (r.journee) out.push("- Journées notées : " + r.journee + "/10");
  out.push("", "## Par rubrique");
  for (const s of r.sections) out.push("- " + (s.section.short || s.section.label) + " : " + formatPercent(s.rate) + " (" + s.count + " suivis)");
  if (r.fixes.length) { out.push("", "## À corriger"); for (const f of r.fixes) out.push("- " + f.text); }
  if (r.streaks.length) { out.push("", "## Séries"); for (const x of r.streaks) out.push("- " + x.item.title + " : " + x.s.current + " " + x.s.unit + (x.s.current > 1 ? "s" : "")); }
  if (r.journal.length) {
    out.push("", "## Journal");
    for (const x of r.journal) out.push("- " + x.key + (x.j.note ? " (" + x.j.note + "/10)" : "") + " : " + x.j.reussites.replace(/\n/g, " / ") + (x.j.bloque ? " — bloqué : " + x.j.bloque : ""));
  }
  out.push("", "Propose-moi les ajustements pour la semaine prochaine, en bloc `suivi` importable.");
  return out.join("\n");
}
