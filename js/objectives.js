// Objectifs hebdomadaires / mensuels et pourcentages de réussite.
//
// Repris du tracker d'habitudes d'origine : c'est le principe de base de
// l'app, la spécification de suivi est venue par-dessus, pas à la place.
// Le calcul de réussite est celui d'origine, porté au nouveau modèle :
// l'attendu est proratisé par la fréquence visée (une habitude 3×/semaine
// atteint 100 % à 3, pas à 7) et les jours futurs ne comptent pas, pour que
// les semaines et les mois en cours restent justes.

import { state, save, makeId, dayKey, weekStart, isRecurring } from "./state.js";
import { esc } from "./ui.js";
import { SECTION_MAP } from "./seed.js";

const MONTHS = [
  "janvier", "février", "mars", "avril", "mai", "juin",
  "juillet", "août", "septembre", "octobre", "novembre", "décembre"
];

// ------------------------------------------------------------- périodes

export function weekStartAt(offset) {
  const d = weekStart(new Date());
  d.setDate(d.getDate() + (offset || 0) * 7);
  return d;
}

export function weekDates(start) {
  const out = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(start.getTime());
    d.setDate(start.getDate() + i);
    out.push(d);
  }
  return out;
}

export function monthDates(anyDate) {
  const y = anyDate.getFullYear();
  const m = anyDate.getMonth();
  const last = new Date(y, m + 1, 0).getDate();
  const out = [];
  for (let i = 1; i <= last; i++) out.push(new Date(y, m, i));
  return out;
}

function isFuture(d) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const x = new Date(d.getTime());
  x.setHours(0, 0, 0, 0);
  return x > today;
}

export function weekKeyOf(start) { return dayKey(start); }
export function monthKeyOf(d) {
  return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0");
}

// ------------------------------------------------------------ objectifs

function bucket(scope, periodKey) {
  const root = scope === "weekly" ? state.objectives.weekly : state.objectives.monthly;
  if (!root[periodKey]) root[periodKey] = [];
  return root[periodKey];
}

export function readObjectives(scope, periodKey) {
  const root = scope === "weekly" ? state.objectives.weekly : state.objectives.monthly;
  return root[periodKey] || [];
}

export function addObjective(scope, periodKey, text) {
  text = String(text || "").trim();
  if (!text) return false;
  bucket(scope, periodKey).push({ id: makeId("o"), text: text.slice(0, 200), done: false });
  save();
  return true;
}

export function toggleObjective(scope, periodKey, id) {
  const obj = readObjectives(scope, periodKey).find((o) => o.id === id);
  if (!obj) return;
  obj.done = !obj.done;
  save();
}

export function removeObjective(scope, periodKey, id) {
  const root = scope === "weekly" ? state.objectives.weekly : state.objectives.monthly;
  if (!root[periodKey]) return;
  root[periodKey] = root[periodKey].filter((o) => o.id !== id);
  if (!root[periodKey].length) delete root[periodKey];
  save();
}

// ------------------------------------------------------------- réussite

export function frequencyOf(item) {
  if (!isRecurring(item)) return 0;
  return item.recurrence.type === "daily" ? 7 : item.recurrence.perWeek;
}

function doneOn(item, d) {
  const k = dayKey(d);
  return !!(state.checks[item.id] && state.checks[item.id][k]);
}

// Taux d'un item sur une liste de dates. null = rien à mesurer.
export function computeRate(item, dates) {
  const freq = frequencyOf(item);
  if (!freq) return null;
  const applicable = dates.filter((d) => !isFuture(d));
  if (!applicable.length) return null;
  const done = applicable.filter((d) => doneOn(item, d)).length;
  const expected = applicable.length * (freq / 7);
  if (expected <= 0) return null;
  return Math.min(done / expected, 1);
}

export function computeTotalRate(items, dates) {
  const applicable = dates.filter((d) => !isFuture(d));
  if (!applicable.length || !items.length) return null;
  let expected = 0, done = 0;
  for (const item of items) {
    const rate = frequencyOf(item) / 7;
    if (!rate) continue;
    for (const d of applicable) {
      expected += rate;
      if (doneOn(item, d)) done++;
    }
  }
  if (expected <= 0) return null;
  return Math.min(done / expected, 1);
}

export function trackedItems() {
  return state.items.filter(function (i) {
    return isRecurring(i) && i.status !== "rejected" && i.status !== "queue";
  });
}

export function formatPercent(ratio) {
  return ratio === null ? "—" : Math.round(ratio * 100) + " %";
}

// Réussite rubrique par rubrique : c'est là que « diète » et « compléments »
// deviennent lisibles, au lieu d'être noyés dans la liste des habitudes.
export function sectionRates(dates) {
  const bySection = new Map();
  for (const item of trackedItems()) {
    if (!bySection.has(item.section)) bySection.set(item.section, []);
    bySection.get(item.section).push(item);
  }
  const out = [];
  for (const [key, items] of bySection) {
    out.push({
      key: key,
      section: SECTION_MAP[key] || { icon: "•", label: key },
      count: items.length,
      rate: computeTotalRate(items, dates)
    });
  }
  return out;
}

export function rateClass(ratio) {
  if (ratio === null) return "rate-none";
  if (ratio >= 0.7) return "rate-good";
  if (ratio >= 0.4) return "rate-mid";
  return "rate-bad";
}

// Résumé compact pour l'accueil.
export function weekSuccess() {
  const items = trackedItems();
  return computeTotalRate(items, weekDates(weekStartAt(0)));
}

export function pendingObjectives() {
  const wk = readObjectives("weekly", weekKeyOf(weekStartAt(0)));
  const mo = readObjectives("monthly", monthKeyOf(new Date()));
  const all = wk.concat(mo);
  return { total: all.length, done: all.filter((o) => o.done).length };
}

// ----------------------------------------------------------- évolution

/**
 * Taux hebdomadaire d'une rubrique sur les N dernières semaines.
 * Une semaine sans aucun jour écoulé (le futur) rend null : on ne trace
 * pas un zéro pour une semaine qui n'a pas eu lieu.
 */
export function sectionTrend(sectionKey, weeks) {
  const n = weeks || 8;
  const out = [];
  for (let i = n - 1; i >= 0; i--) {
    const start = weekStartAt(-i);
    const dates = weekDates(start);
    const items = trackedItems().filter((it) => it.section === sectionKey);
    out.push({
      start: start,
      offset: -i,
      rate: items.length ? computeTotalRate(items, dates) : null
    });
  }
  return out;
}

export function allSectionTrends(weeks) {
  const keys = [];
  for (const item of trackedItems()) {
    if (keys.indexOf(item.section) < 0) keys.push(item.section);
  }
  return keys.map(function (key) {
    const trend = sectionTrend(key, weeks);
    const known = trend.filter((t) => t.rate !== null);
    const current = known.length ? known[known.length - 1].rate : null;
    const previous = known.length > 1 ? known[known.length - 2].rate : null;
    return {
      key: key,
      section: SECTION_MAP[key] || { icon: "•", label: key, short: key },
      trend: trend,
      current: current,
      previous: previous,
      delta: (current !== null && previous !== null) ? current - previous : null
    };
  });
}

// ------------------------------------------------------------------ vue

function objectiveList(scope, periodKey, emptyText) {
  const list = readObjectives(scope, periodKey);
  if (!list.length) return '<p class="empty">' + esc(emptyText) + "</p>";
  return '<ul class="objectives">' + list.map(function (o) {
    return '<li class="objective' + (o.done ? " is-done" : "") + '">' +
      '<button type="button" class="check" role="checkbox" aria-checked="' + (o.done ? "true" : "false") +
        '" data-act="obj-toggle" data-scope="' + scope + '" data-period="' + esc(periodKey) +
        '" data-obj="' + esc(o.id) + '" aria-label="' + esc(o.text) + '"></button>' +
      '<span class="objective-text">' + esc(o.text) + "</span>" +
      '<button type="button" class="obj-del" data-act="obj-del" data-scope="' + scope +
        '" data-period="' + esc(periodKey) + '" data-obj="' + esc(o.id) +
        '" aria-label="Supprimer">✕</button>' +
    "</li>";
  }).join("") + "</ul>";
}

// Texte en cours de saisie dans les formulaires d'ajout : cocher un objectif
// re-rend la vue, il ne doit pas effacer ce qui était à moitié tapé.
const addDrafts = {};

function objectiveCard(scope, periodKey, title, period, placeholder, emptyText) {
  const list = readObjectives(scope, periodKey);
  const done = list.filter((o) => o.done).length;
  return '<section class="panel objective-card">' +
    '<div class="block-head" style="margin-top:0">' +
      "<h2>" + esc(title) + "</h2>" +
      (list.length ? '<span class="counter">' + done + " / " + list.length + "</span>" : "") +
    "</div>" +
    '<p class="sub objective-period">' + esc(period) + "</p>" +
    '<form class="objective-add" data-scope="' + scope + '" data-period="' + esc(periodKey) + '">' +
      '<input type="text" placeholder="' + esc(placeholder) + '" maxlength="200" autocomplete="off" ' +
        'value="' + esc(addDrafts[scope + "|" + periodKey] || "") + '">' +
      '<button type="submit" class="btn btn-primary" aria-label="Ajouter">+</button>' +
    "</form>" +
    objectiveList(scope, periodKey, emptyText) +
  "</section>";
}

// Évolution : une colonne par semaine, une ligne par rubrique. Assez compact
// pour tenir sur un écran de téléphone, ce qu'un graphique par rubrique
// n'aurait pas permis.
function trendBlock() {
  const WEEKS = 8;
  const rows = allSectionTrends(WEEKS);
  if (!rows.length) return "";

  const anyData = rows.some((r) => r.trend.some((t) => t.rate !== null && t.rate > 0));
  if (!anyData) {
    return '<div class="block-head"><h2>Évolution</h2></div>' +
      '<p class="empty">Rien à comparer pour l\'instant. Les barres apparaîtront ' +
      "au fil des semaines cochées.</p>";
  }

  let html = '<div class="block-head"><h2>Évolution</h2>' +
    '<span class="counter">' + WEEKS + " semaines</span></div>";
  html += '<p class="hint">Chaque colonne est une semaine, la dernière à droite. ' +
    "Une colonne vide veut dire semaine sans rien de coché.</p>";

  html += '<div class="trends">';
  for (const r of rows) {
    const arrow = r.delta === null ? ""
      : r.delta > 0.02 ? '<span class="trend-up">▲ +' + Math.round(r.delta * 100) + "</span>"
      : r.delta < -0.02 ? '<span class="trend-down">▼ ' + Math.round(r.delta * 100) + "</span>"
      : '<span class="trend-flat">= stable</span>';

    html += '<div class="trend">' +
      '<div class="trend-head">' +
        '<span class="trend-label">' + esc(r.section.icon + " " + (r.section.short || r.section.label)) + "</span>" +
        '<span class="trend-now ' + rateClass(r.current) + '">' + formatPercent(r.current) + " " + arrow + "</span>" +
      "</div>" +
      '<div class="trend-bars">' + r.trend.map(function (t) {
        const h = t.rate === null ? 0 : Math.max(4, Math.round(t.rate * 100));
        const cls = t.rate === null ? "is-empty" : rateClass(t.rate);
        const title = t.start.toLocaleDateString("fr-FR", { day: "numeric", month: "short" }) +
          " — " + (t.rate === null ? "pas de données" : Math.round(t.rate * 100) + " %");
        return '<span class="trend-bar ' + cls + (t.offset === 0 ? " is-current" : "") +
          '" style="height:' + h + '%" title="' + esc(title) + '"></span>';
      }).join("") + "</div>" +
    "</div>";
  }
  html += "</div>";
  return html;
}

export function viewObjectives(offset) {
  const off = parseInt(offset, 10) || 0;
  const start = weekStartAt(off);
  const wDates = weekDates(start);
  const wKey = weekKeyOf(start);
  // Sur la semaine courante, le mois est celui d'AUJOURD'HUI — le lundi peut
  // appartenir au mois précédent (un 1er septembre tombant un mardi), et
  // l'accueil comme l'export comptent sur le mois du jour.
  const anchor = off === 0 ? new Date() : wDates[0];
  const mKey = monthKeyOf(anchor);
  const mDates = monthDates(anchor);
  const items = trackedItems();

  const end = wDates[6];
  const weekLabel = "Semaine du " + start.getDate() + " " + MONTHS[start.getMonth()] +
    " au " + end.getDate() + " " + MONTHS[end.getMonth()];
  const monthLabel = MONTHS[anchor.getMonth()].charAt(0).toUpperCase() +
    MONTHS[anchor.getMonth()].slice(1) + " " + anchor.getFullYear();

  let html = '<div class="view">';
  html += '<header class="view-head"><h1>Objectifs & réussite</h1></header>';

  // Navigation entre semaines, comme dans la version d'origine.
  html += '<nav class="week-nav">' +
    '<a class="btn btn-small" href="#/objectifs?w=' + (off - 1) + '" aria-label="Semaine précédente">←</a>' +
    '<span class="week-label">' + esc(weekLabel) + "</span>" +
    '<a class="btn btn-small" href="#/objectifs?w=' + (off + 1) + '" aria-label="Semaine suivante">→</a>' +
    (off !== 0 ? '<a class="btn btn-small btn-ghost" href="#/objectifs?w=0">Aujourd\'hui</a>' : "") +
  "</nav>";

  // Réussite — les pourcentages du tableau d'origine.
  const weekTotal = computeTotalRate(items, wDates);
  const monthTotal = computeTotalRate(items, mDates);

  html += '<section class="rate-hero">' +
    '<div class="rate-tile ' + rateClass(weekTotal) + '">' +
      '<span class="rate-label">Réussite de la semaine</span>' +
      '<span class="rate-value">' + formatPercent(weekTotal) + "</span>" +
    "</div>" +
    '<div class="rate-tile ' + rateClass(monthTotal) + '">' +
      '<span class="rate-label">Réussite du mois</span>' +
      '<span class="rate-value">' + formatPercent(monthTotal) + "</span>" +
    "</div>" +
  "</section>";

  // Réussite par rubrique — dont Diète et Compléments.
  const secW = sectionRates(wDates);
  const secM = sectionRates(mDates);
  if (secW.length) {
    html += '<div class="block-head"><h2>Par rubrique</h2></div>';
    html += '<div class="rate-table-wrap"><table class="rate-table">' +
      "<thead><tr><th>Rubrique</th><th>Suivis</th><th>Moy. sem.</th><th>Moy. mois</th></tr></thead><tbody>";
    for (const s of secW) {
      const m = secM.find((x) => x.key === s.key);
      html += "<tr>" +
        '<td class="rate-name">' + esc(s.section.icon + " " + (s.section.short || s.section.label)) + "</td>" +
        '<td class="rate-freq">' + s.count + "</td>" +
        '<td class="' + rateClass(s.rate) + '">' + formatPercent(s.rate) + "</td>" +
        '<td class="' + rateClass(m ? m.rate : null) + '">' + formatPercent(m ? m.rate : null) + "</td>" +
      "</tr>";
    }
    html += "</tbody></table></div>";
  }

  // Évolution semaine après semaine, rubrique par rubrique.
  html += trendBlock();

  if (items.length) {
    html += '<div class="block-head"><h2>Par habitude</h2></div>';
    html += '<div class="rate-table-wrap"><table class="rate-table">' +
      "<thead><tr><th>Habitude</th><th>Objectif</th><th>Moy. sem.</th><th>Moy. mois</th></tr></thead><tbody>";
    for (const item of items) {
      const w = computeRate(item, wDates);
      const m = computeRate(item, mDates);
      const freq = frequencyOf(item);
      html += "<tr>" +
        '<td class="rate-name">' + esc(item.title) + "</td>" +
        '<td class="rate-freq">' + (freq === 7 ? "tous les jours" : freq + "×/sem") + "</td>" +
        '<td class="' + rateClass(w) + '">' + formatPercent(w) + "</td>" +
        '<td class="' + rateClass(m) + '">' + formatPercent(m) + "</td>" +
      "</tr>";
    }
    html += '<tr class="rate-total"><td>Total</td><td></td>' +
      '<td class="' + rateClass(weekTotal) + '">' + formatPercent(weekTotal) + "</td>" +
      '<td class="' + rateClass(monthTotal) + '">' + formatPercent(monthTotal) + "</td></tr>";
    html += "</tbody></table></div>";
    html += '<p class="hint">Une habitude visée à 3×/semaine atteint 100 % à 3 — pas à 7. ' +
      "Les jours à venir ne sont pas comptés, la semaine en cours reste donc juste.</p>";
  }

  html += objectiveCard("weekly", wKey, "Objectifs de la semaine", weekLabel,
    "Ex : Terminer le rapport", "Aucun objectif pour cette semaine.");
  html += objectiveCard("monthly", mKey, "Objectifs du mois", monthLabel,
    "Ex : Lire 2 livres", "Aucun objectif pour ce mois.");

  html += "</div>";
  return html;
}

export function mountObjectives() {
  document.querySelectorAll(".objective-add").forEach(function (form) {
    const key = form.dataset.scope + "|" + form.dataset.period;
    const input = form.querySelector("input");
    input.addEventListener("input", function () { addDrafts[key] = input.value; });
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      if (addObjective(form.dataset.scope, form.dataset.period, input.value)) {
        input.value = "";
        delete addDrafts[key];
      } else {
        input.focus();
      }
    });
  });
}
